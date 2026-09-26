import mongoose from 'mongoose';
import { PipelineStage, IPipelineStage } from '../models/PipelineStage';
import { EmailTemplate } from '../models/EmailTemplate';

export const DEFAULT_PIPELINE_STAGES = [
  {
    name: 'NEW',
    order: 0,
    taskTemplates: [{ title: 'Initial phone call to lead', dueDays: 1, description: 'Attempt contact within 24h' }],
  },
  {
    name: 'CONTACTED',
    order: 1,
    taskTemplates: [{ title: 'Send mortgage inquiry questionnaire', dueDays: 2, description: 'Collect income and loan needs' }],
  },
  {
    name: 'QUALIFIED',
    order: 2,
    taskTemplates: [{ title: 'Schedule consultation appointment', dueDays: 3, description: 'Deep-dive into financing options' }],
  },
  {
    name: 'APPLICATION',
    order: 3,
    taskTemplates: [{ title: 'Request SCHUFA and salary slips', dueDays: 3, description: 'Required for bank submission' }],
  },
  {
    name: 'WON',
    order: 4,
    taskTemplates: [{ title: 'Confirm notary date and mortgage contract sign-off', dueDays: 7, description: 'Bank approval finalized' }],
  },
  {
    name: 'LOST',
    order: 5,
    taskTemplates: [{ title: 'Log reason for lost lead and archive', dueDays: 5, description: 'Reason for rejection/dropout' }],
  },
];

export class PipelineService {
  /**
   * Initializes default stages and email templates for a new brokerage
   */
  static async seedBrokerageDefaults(brokerageId: mongoose.Types.ObjectId): Promise<void> {
    // Seed standard welcome email template
    const welcomeTemplate = await EmailTemplate.findOneAndUpdate(
      { brokerageId, name: 'Welcome & Next Steps' },
      {
        brokerageId,
        name: 'Welcome & Next Steps',
        subject: 'Welcome to {{brokerageName}} - Next steps for your mortgage',
        body: '<p>Dear {{clientName}},</p><p>Thank you for reaching out to {{brokerageName}}. Your dedicated mortgage advisor {{advisorName}} is reviewing your profile and will contact you shortly.</p><p>Best regards,<br>{{brokerageName}} Team</p>',
      },
      { upsert: true, new: true }
    );

    // Seed stages
    for (const stageData of DEFAULT_PIPELINE_STAGES) {
      const existing = await PipelineStage.findOne({ brokerageId, name: stageData.name });
      if (!existing) {
        await PipelineStage.create({
          brokerageId,
          name: stageData.name,
          order: stageData.order,
          emailTemplateId: stageData.name === 'CONTACTED' ? welcomeTemplate._id : null,
          taskTemplates: stageData.taskTemplates,
        });
      }
    }
  }

  static async getStages(brokerageId: mongoose.Types.ObjectId): Promise<IPipelineStage[]> {
    let stages = await PipelineStage.find({ brokerageId })
      .populate('emailTemplateId')
      .sort({ order: 1 });

    if (stages.length === 0) {
      await this.seedBrokerageDefaults(brokerageId);
      stages = await PipelineStage.find({ brokerageId })
        .populate('emailTemplateId')
        .sort({ order: 1 });
    }

    return stages;
  }

  static async updateStage(
    brokerageId: mongoose.Types.ObjectId,
    stageId: string,
    data: Partial<IPipelineStage>
  ): Promise<IPipelineStage | null> {
    return PipelineStage.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(stageId), brokerageId },
      data,
      { new: true }
    ).populate('emailTemplateId');
  }
}
