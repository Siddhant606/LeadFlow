import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  brokerageId: mongoose.Types.ObjectId;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
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
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

EmailTemplateSchema.index({ brokerageId: 1, name: 1 }, { unique: true });

export const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
