import mongoose, { Schema, Document } from 'mongoose';
import { TaskStatus } from '../types';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  brokerageId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId | null;
  title: string;
  description?: string;
  dueAt: Date;
  status: TaskStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ brokerageId: 1, status: 1, dueAt: 1 });
TaskSchema.index({ brokerageId: 1, leadId: 1 });
TaskSchema.index({ brokerageId: 1, assignedTo: 1, status: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
