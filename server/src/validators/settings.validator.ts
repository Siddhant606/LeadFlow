import { z } from 'zod';

export const emailTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').trim(),
    subject: z.string().min(2, 'Subject is required').trim(),
    body: z.string().min(2, 'Body is required'),
  }),
});

export const pipelineStageSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Stage name is required').trim(),
    order: z.number().int().min(0),
    emailTemplateId: z.string().nullable().optional(),
    taskTemplates: z
      .array(
        z.object({
          title: z.string().min(2),
          dueDays: z.number().int().min(0),
          description: z.string().optional(),
        })
      )
      .default([]),
  }),
});
