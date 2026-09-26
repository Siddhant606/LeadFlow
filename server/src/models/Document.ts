import mongoose, { Schema, Document as MongooseDoc } from 'mongoose';
import { DocumentStatus } from '../types';

export interface IDocument extends MongooseDoc {
  _id: mongoose.Types.ObjectId;
  brokerageId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  failureReason?: string;
  verificationDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'PASSED', 'FAILED'],
      default: 'UPLOADED',
      index: true,
    },
    failureReason: {
      type: String,
    },
    verificationDetails: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ brokerageId: 1, clientId: 1 });
DocumentSchema.index({ brokerageId: 1, status: 1 });
DocumentSchema.index({ brokerageId: 1, createdAt: -1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
