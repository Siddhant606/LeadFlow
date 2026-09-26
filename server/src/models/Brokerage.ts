import mongoose, { Schema, Document } from 'mongoose';
import { BrokerageStatus } from '../types';

export interface IBrokerage extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  apiKey: string;
  status: BrokerageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BrokerageSchema = new Schema<IBrokerage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Brokerage = mongoose.model<IBrokerage>('Brokerage', BrokerageSchema);
