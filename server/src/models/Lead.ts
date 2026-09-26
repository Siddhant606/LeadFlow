import mongoose, { Schema, Document } from 'mongoose';
import { LeadStage } from '../types';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  brokerageId: mongoose.Types.ObjectId;
  externalId?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: LeadStage;
  assignedAdvisorId?: mongoose.Types.ObjectId | null;
  clientId?: mongoose.Types.ObjectId | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      default: 'MANUAL',
    },
    stage: {
      type: String,
      required: true,
      default: 'NEW',
      index: true,
    },
    assignedAdvisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Idempotency: Unique compound index on brokerageId + externalId when externalId is provided
LeadSchema.index(
  { brokerageId: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: 'string', $gt: '' } },
  }
);

// Fast lookups and duplicate detection
LeadSchema.index({ brokerageId: 1, email: 1 });
LeadSchema.index({ brokerageId: 1, phone: 1 });
LeadSchema.index({ brokerageId: 1, stage: 1 });
LeadSchema.index({ brokerageId: 1, createdAt: -1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
