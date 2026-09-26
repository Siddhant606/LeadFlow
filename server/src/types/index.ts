import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'PLATFORM_ADMIN' | 'BROKERAGE_ADMIN' | 'ADVISOR' | 'CLIENT';

export type BrokerageStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'APPLICATION' | 'WON' | 'LOST' | string;

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'PASSED' | 'FAILED';

export type TaskStatus = 'PENDING' | 'COMPLETED';

export type CaseStatus = 'ACTIVE' | 'PENDING_DOCUMENTS' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  brokerageId: string | null;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  brokerageId?: Types.ObjectId;
}

export interface WebhookLeadPayload {
  externalId: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  brokerageSlug?: string;
  brokerageId?: string;
  metadata?: Record<string, any>;
}
