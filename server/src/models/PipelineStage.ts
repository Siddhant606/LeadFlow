import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskTemplate {
  title: string;
  dueDays: number;
  description?: string;
}

export interface IPipelineStage extends Document {
  _id: mongoose.Types.ObjectId;
  brokerageId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  emailTemplateId?: mongoose.Types.ObjectId | null;
  taskTemplates: ITaskTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskTemplateSchema = new Schema<ITaskTemplate>(
  {
    title: { type: String, required: true, trim: true },
    dueDays: { type: Number, required: true, default: 2 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const PipelineStageSchema = new Schema<IPipelineStage>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    emailTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null,
    },
    taskTemplates: {
      type: [TaskTemplateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

PipelineStageSchema.index({ brokerageId: 1, order: 1 });
PipelineStageSchema.index({ brokerageId: 1, name: 1 }, { unique: true });

export const PipelineStage = mongoose.model<IPipelineStage>('PipelineStage', PipelineStageSchema);
