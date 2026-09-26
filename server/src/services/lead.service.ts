import mongoose from 'mongoose';
import { Lead, ILead } from '../models/Lead';
import { Brokerage } from '../models/Brokerage';
import { PipelineStage } from '../models/PipelineStage';
import { User } from '../models/User';
import { normalizeEmail, normalizePhone } from '../utils/normalization';
import { emitToTenant } from '../sockets';
import { EmailService } from './email.service';
import { TaskService } from './task.service';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface WebhookLeadInput {
  externalId: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  brokerageSlug?: string;
  brokerageId?: string;
  metadata?: Record<string, any>;
}

export class LeadService {
  /**
   * Processes incoming webhook lead with normalization, idempotency, and duplicate person detection.
   */
  static async processWebhookLead(
    brokerageId: mongoose.Types.ObjectId,
    data: WebhookLeadInput
  ): Promise<{ lead: ILead; isDuplicateWebhook: boolean; duplicatePersonDetected: boolean }> {
    const normalizedEmail = normalizeEmail(data.email);
    const normalizedPhone = normalizePhone(data.phone);

    // 1. Idempotency Check: (brokerageId + externalId)
    const existingByExternalId = await Lead.findOne({
      brokerageId,
      externalId: data.externalId,
    });

    if (existingByExternalId) {
      logger.info(
        `Duplicate webhook received for externalId "${data.externalId}" in brokerage ${brokerageId}. Returning existing lead.`
      );
      return {
        lead: existingByExternalId,
        isDuplicateWebhook: true,
        duplicatePersonDetected: false,
      };
    }

    // 2. Duplicate Person Detection: check for existing lead by normalized email or phone
    const existingPerson = await Lead.findOne({
      brokerageId,
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    const duplicatePersonDetected = !!existingPerson;
    if (duplicatePersonDetected) {
      logger.warn(
        `Duplicate person detected in brokerage ${brokerageId} (Matching email: ${normalizedEmail} or phone: ${normalizedPhone})`
      );
    }

    // 3. Create lead
    let lead: ILead;
    try {
      lead = await Lead.create({
        brokerageId,
        externalId: data.externalId,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        source: data.source || 'WEBHOOK',
        stage: 'NEW',
        metadata: {
          ...data.metadata,
          duplicatePersonDetected,
          existingLeadId: existingPerson ? existingPerson._id.toString() : null,
        },
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Double safety for concurrent webhook bursts with identical externalId
        const fallback = await Lead.findOne({ brokerageId, externalId: data.externalId });
        if (fallback) {
          return { lead: fallback, isDuplicateWebhook: true, duplicatePersonDetected };
        }
      }
      throw err;
    }

    // 4. Trigger automations for initial stage 'NEW'
    await this.triggerStageAutomations(brokerageId, lead, 'NEW');

    // 5. Emit real-time event to brokerage room
    emitToTenant(brokerageId, 'lead:created', lead);

    return { lead, isDuplicateWebhook: false, duplicatePersonDetected };
  }

  /**
   * Creates a lead manually from the advisor dashboard
   */
  static async createManualLead(
    brokerageId: mongoose.Types.ObjectId,
    data: {
      name: string;
      email: string;
      phone: string;
      source?: string;
      stage?: string;
      assignedAdvisorId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ lead: ILead; duplicatePersonDetected: boolean }> {
    const normalizedEmail = normalizeEmail(data.email);
    const normalizedPhone = normalizePhone(data.phone);

    const existingPerson = await Lead.findOne({
      brokerageId,
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    const duplicatePersonDetected = !!existingPerson;

    const stage = data.stage || 'NEW';

    const lead = await Lead.create({
      brokerageId,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      source: data.source || 'MANUAL',
      stage,
      assignedAdvisorId: data.assignedAdvisorId
        ? new mongoose.Types.ObjectId(data.assignedAdvisorId)
        : null,
      metadata: {
        ...data.metadata,
        duplicatePersonDetected,
        existingLeadId: existingPerson ? existingPerson._id.toString() : null,
      },
    });

    await this.triggerStageAutomations(brokerageId, lead, stage);
    emitToTenant(brokerageId, 'lead:created', lead);

    return { lead, duplicatePersonDetected };
  }

  /**
   * Transitions a lead to a new stage, triggering automations & real-time updates
   */
  static async updateLeadStage(
    brokerageId: mongoose.Types.ObjectId,
    leadId: string,
    newStage: string
  ): Promise<ILead> {
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw new BadRequestError('Invalid lead ID format');
    }

    const lead = await Lead.findOne({
      _id: new mongoose.Types.ObjectId(leadId),
      brokerageId, // Tenant scope enforced!
    });

    if (!lead) {
      throw new NotFoundError('Lead not found in this brokerage');
    }

    if (lead.stage === newStage) {
      return lead;
    }

    const previousStage = lead.stage;
    lead.stage = newStage;
    await lead.save();

    logger.info(`Lead ${leadId} moved from ${previousStage} -> ${newStage} in brokerage ${brokerageId}`);

    // Trigger stage automations (Tasks & Email)
    await this.triggerStageAutomations(brokerageId, lead, newStage);

    // Populate advisor and client details for frontend
    const populated = await Lead.findById(lead._id)
      .populate('assignedAdvisorId', 'name email')
      .populate('clientId', 'caseStatus');

    // Emit live update to all open screens in this brokerage
    emitToTenant(brokerageId, 'lead:stageChanged', {
      lead: populated,
      previousStage,
      newStage,
    });

    return populated!;
  }

  /**
   * Executes configured Email and Task automations for a given stage
   */
  private static async triggerStageAutomations(
    brokerageId: mongoose.Types.ObjectId,
    lead: ILead,
    stageName: string
  ): Promise<void> {
    try {
      const stageConfig = await PipelineStage.findOne({
        brokerageId,
        name: stageName,
      });

      if (!stageConfig) return;

      const [brokerage, advisor] = await Promise.all([
        Brokerage.findById(brokerageId),
        lead.assignedAdvisorId ? User.findById(lead.assignedAdvisorId) : null,
      ]);

      // 1. Task automations
      if (stageConfig.taskTemplates && stageConfig.taskTemplates.length > 0) {
        await TaskService.createTasksFromTemplates(
          brokerageId,
          lead._id,
          stageConfig.taskTemplates,
          lead.assignedAdvisorId
        );
      }

      // 2. Email automation (resilient; will not throw or break the transition)
      if (stageConfig.emailTemplateId) {
        await EmailService.sendTemplateEmail(lead.email, stageConfig.emailTemplateId.toString(), {
          clientName: lead.name,
          advisorName: advisor?.name || 'Your LeadFlow Advisor',
          brokerageName: brokerage?.name || 'German Mortgage Brokerage',
        });
      }
    } catch (err) {
      logger.error('Error in stage automation triggers', err);
    }
  }

  static async getLeads(
    brokerageId: mongoose.Types.ObjectId,
    filter: { stage?: string; advisorId?: string; search?: string }
  ): Promise<ILead[]> {
    const query: any = { brokerageId };

    if (filter.stage) {
      query.stage = filter.stage;
    }
    if (filter.advisorId) {
      query.assignedAdvisorId = new mongoose.Types.ObjectId(filter.advisorId);
    }
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { email: { $regex: filter.search, $options: 'i' } },
        { phone: { $regex: filter.search, $options: 'i' } },
      ];
    }

    return Lead.find(query)
      .populate('assignedAdvisorId', 'name email')
      .populate('clientId', 'caseStatus')
      .sort({ createdAt: -1 });
  }

  static async getLeadById(
    brokerageId: mongoose.Types.ObjectId,
    leadId: string
  ): Promise<ILead> {
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw new BadRequestError('Invalid lead ID format');
    }

    const lead = await Lead.findOne({
      _id: new mongoose.Types.ObjectId(leadId),
      brokerageId, // Protects against IDOR
    })
      .populate('assignedAdvisorId', 'name email')
      .populate('clientId');

    if (!lead) {
      throw new NotFoundError('Lead not found in this brokerage');
    }

    return lead;
  }

  static async updateLead(
    brokerageId: mongoose.Types.ObjectId,
    leadId: string,
    updateData: any
  ): Promise<ILead> {
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw new BadRequestError('Invalid lead ID format');
    }

    if (updateData.email) {
      updateData.email = normalizeEmail(updateData.email);
    }
    if (updateData.phone) {
      updateData.phone = normalizePhone(updateData.phone);
    }

    const updated = await Lead.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId), brokerageId },
      updateData,
      { new: true }
    )
      .populate('assignedAdvisorId', 'name email')
      .populate('clientId');

    if (!updated) {
      throw new NotFoundError('Lead not found in this brokerage');
    }

    emitToTenant(brokerageId, 'lead:updated', updated);
    return updated;
  }
}
