import { z } from 'zod';

export const webhookLeadSchema = z.object({
  body: z.object({
    externalId: z.string().min(1, 'externalId is required').trim(),
    name: z.string().min(2, 'name is required').trim(),
    email: z.string().transform((v) => v.trim().toLowerCase()).pipe(z.string().email('valid email is required')),
    phone: z.string().min(5, 'phone is required').trim(),
    source: z.string().min(1, 'source is required').trim(),
    brokerageSlug: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const createLeadManualSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').trim(),
    email: z.string().transform((v) => v.trim().toLowerCase()).pipe(z.string().email('Valid email is required')),
    phone: z.string().min(5, 'Phone is required').trim(),
    source: z.string().default('MANUAL'),
    stage: z.string().default('NEW'),
    assignedAdvisorId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const updateLeadStageSchema = z.object({
  body: z.object({
    stage: z.string().min(1, 'Stage is required').trim(),
  }),
  params: z.object({
    id: z.string().min(1, 'Lead ID is required'),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    stage: z.string().optional(),
    assignedAdvisorId: z.string().nullable().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});
