import mongoose from 'mongoose';
import { Client, IClient } from '../models/Client';
import { Lead } from '../models/Lead';
import { User, IUser } from '../models/User';
import { hashPassword } from '../utils/password';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors';
import { emitToTenant } from '../sockets';
import { logger } from '../utils/logger';

export interface ConvertLeadResult {
  client: IClient;
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
    temporaryPassword?: string;
  };
}

export class ClientService {
  /**
   * Converts a lead into a client and provisions a CLIENT user account.
   * Guarantees strict duplicate conversion prevention.
   */
  static async convertLeadToClient(
    brokerageId: mongoose.Types.ObjectId,
    leadId: string,
    options?: { password?: string; notes?: string }
  ): Promise<ConvertLeadResult> {
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw new BadRequestError('Invalid lead ID');
    }

    const leadObjId = new mongoose.Types.ObjectId(leadId);

    // 1. Tenant-scoped Lead lookup
    const lead = await Lead.findOne({ _id: leadObjId, brokerageId });
    if (!lead) {
      throw new NotFoundError('Lead not found in this brokerage');
    }

    // 2. Prevent duplicate conversion
    if (lead.clientId) {
      throw new ConflictError('This lead has already been converted to a client');
    }

    const existingClient = await Client.findOne({ leadId: leadObjId, brokerageId });
    if (existingClient) {
      throw new ConflictError('Client profile already exists for this lead');
    }

    // 3. Create or provision the CLIENT user
    const temporaryPassword = options?.password || 'LeadFlow2025!';
    const passwordHash = await hashPassword(temporaryPassword);

    let user: any = await User.findOne({
      email: lead.email,
      brokerageId,
    });

    if (!user) {
      user = await User.create({
        brokerageId,
        name: lead.name,
        email: lead.email,
        passwordHash,
        role: 'CLIENT',
        isActive: true,
      });
      logger.info(`Created CLIENT user account: ${user.email}`);
    } else {
      // If user exists, update password and ensure CLIENT role
      user.role = 'CLIENT';
      user.passwordHash = passwordHash;
      await user.save();
      logger.info(`Updated existing user to CLIENT role: ${user.email}`);
    }

    // 4. Create Client record
    const client = await Client.create({
      brokerageId,
      userId: user._id,
      leadId: lead._id,
      caseStatus: 'PENDING_DOCUMENTS',
      notes: options?.notes || 'Converted from Lead',
    });

    // 5. Update Lead with clientId link
    lead.clientId = client._id;
    if (lead.stage === 'NEW' || lead.stage === 'CONTACTED') {
      lead.stage = 'QUALIFIED'; // Sensible default advance
    }
    await lead.save();

    logger.info(`Lead ${leadId} successfully converted to Client ${client._id}`);

    // Populate for presentation
    const populatedClient = await Client.findById(client._id)
      .populate('userId', 'name email role')
      .populate('leadId', 'name email phone source stage');

    emitToTenant(brokerageId, 'client:created', populatedClient);

    return {
      client: populatedClient!,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        temporaryPassword,
      },
    };
  }

  static async getClients(
    brokerageId: mongoose.Types.ObjectId,
    filter: { caseStatus?: string; search?: string }
  ): Promise<IClient[]> {
    const query: any = { brokerageId };

    if (filter.caseStatus) {
      query.caseStatus = filter.caseStatus;
    }

    return Client.find(query)
      .populate('userId', 'name email role')
      .populate('leadId', 'name email phone source stage')
      .sort({ createdAt: -1 });
  }

  static async getClientById(
    brokerageId: mongoose.Types.ObjectId,
    clientId: string
  ): Promise<IClient> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new BadRequestError('Invalid client ID');
    }

    const client = await Client.findOne({
      _id: new mongoose.Types.ObjectId(clientId),
      brokerageId, // Protects against IDOR
    })
      .populate('userId', 'name email role')
      .populate('leadId');

    if (!client) {
      throw new NotFoundError('Client not found in this brokerage');
    }

    return client;
  }

  static async getClientByUserId(userId: string): Promise<IClient | null> {
    return Client.findOne({ userId: new mongoose.Types.ObjectId(userId) })
      .populate('userId', 'name email role')
      .populate('leadId');
  }

  static async updateCaseStatus(
    brokerageId: mongoose.Types.ObjectId,
    clientId: string,
    caseStatus: string,
    notes?: string
  ): Promise<IClient> {
    const update: any = { caseStatus };
    if (notes !== undefined) {
      update.notes = notes;
    }

    const updated = await Client.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(clientId), brokerageId },
      update,
      { new: true }
    )
      .populate('userId', 'name email')
      .populate('leadId');

    if (!updated) {
      throw new NotFoundError('Client not found in this brokerage');
    }

    emitToTenant(brokerageId, 'client:updated', updated);
    return updated;
  }
}
