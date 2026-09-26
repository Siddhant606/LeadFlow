import mongoose, { Schema, Document } from 'mongoose';
import { CaseStatus } from '../types';

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  brokerageId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  caseStatus: CaseStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    caseStatus: {
      type: String,
      enum: ['ACTIVE', 'PENDING_DOCUMENTS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING_DOCUMENTS',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate conversion: only one Client per lead per brokerage
ClientSchema.index({ brokerageId: 1, leadId: 1 }, { unique: true });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
