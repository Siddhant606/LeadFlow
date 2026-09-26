import { z } from 'zod';

export const documentParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
});
