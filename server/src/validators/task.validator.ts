import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    leadId: z.string().min(1, 'Lead ID is required'),
    title: z.string().min(2, 'Title is required').trim(),
    description: z.string().optional(),
    assignedTo: z.string().optional(),
    dueAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  }),
});

export const updateTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Task ID is required'),
  }),
  body: z.object({
    status: z.enum(['PENDING', 'COMPLETED']),
  }),
});
