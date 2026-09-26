import { z } from 'zod';

export const convertLeadToClientSchema = z.object({
  params: z.object({
    leadId: z.string().min(1, 'Lead ID is required'),
  }),
  body: z.object({
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    notes: z.string().optional(),
  }),
});

export const updateClientCaseStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Client ID is required'),
  }),
  body: z.object({
    caseStatus: z.enum(['ACTIVE', 'PENDING_DOCUMENTS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
    notes: z.string().optional(),
  }),
});
