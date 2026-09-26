import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  brokerageId?: mongoose.Types.ObjectId | null;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      default: null,
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
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['PLATFORM_ADMIN', 'BROKERAGE_ADMIN', 'ADVISOR', 'CLIENT'],
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique email per brokerage for tenant users, unique global for PLATFORM_ADMIN
UserSchema.index(
  { email: 1, brokerageId: 1 },
  { unique: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
