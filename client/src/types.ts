export type UserRole = 'PLATFORM_ADMIN' | 'BROKERAGE_ADMIN' | 'ADVISOR' | 'CLIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  brokerageId: string | null;
}

export interface Brokerage {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
}

export interface Lead {
  _id: string;
  brokerageId: string;
  externalId?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  assignedAdvisorId?: { _id: string; name: string; email: string } | null;
  clientId?: { _id: string; caseStatus: string } | string | null;
  metadata?: {
    loanAmount?: number;
    city?: string;
    duplicatePersonDetected?: boolean;
    existingLeadId?: string | null;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  _id: string;
  brokerageId: string;
  userId: { _id: string; name: string; email: string; role: string };
  leadId: Lead;
  caseStatus: 'ACTIVE' | 'PENDING_DOCUMENTS' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  _id: string;
  brokerageId: string;
  clientId: string | { _id: string };
  uploadedBy: { _id: string; name: string; email: string; role: string };
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: 'UPLOADED' | 'PROCESSING' | 'PASSED' | 'FAILED';
  failureReason?: string;
  verificationDetails?: {
    ocrPassed?: boolean;
    confidenceScore?: number;
    verifiedFields?: string[];
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  _id: string;
  brokerageId: string;
  leadId: { _id: string; name: string; email: string; stage: string };
  assignedTo?: { _id: string; name: string; email: string } | null;
  title: string;
  description?: string;
  dueAt: string;
  status: 'PENDING' | 'COMPLETED';
  isOverdue?: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface EmailTemplateItem {
  _id: string;
  brokerageId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface PipelineStageItem {
  _id: string;
  brokerageId: string;
  name: string;
  order: number;
  emailTemplateId?: EmailTemplateItem | null;
  taskTemplates: Array<{
    title: string;
    dueDays: number;
    description?: string;
  }>;
}

export interface DashboardStats {
  brokerageId: string;
  totalLeads: number;
  totalClients: number;
  leadsByStage: Record<string, number>;
  pendingTasks: number;
  overdueTasks: number;
  documentsProcessing: number;
  documentsFailed: number;
  documentsPassed: number;
  recentLeads: Lead[];
  recentTasks: TaskItem[];
}
