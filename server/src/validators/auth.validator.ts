import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').trim().toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const registerBrokerageSchema = z.object({
  body: z.object({
    brokerageName: z.string().min(2, 'Brokerage name must be at least 2 characters').trim(),
    brokerageSlug: z
      .string()
      .min(2, 'Slug must be at least 2 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
      .trim(),
    adminName: z.string().min(2, 'Admin name must be at least 2 characters').trim(),
    adminEmail: z.string().email('Invalid email address').trim().toLowerCase(),
    adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).trim(),
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(6),
    role: z.enum(['BROKERAGE_ADMIN', 'ADVISOR', 'CLIENT']),
  }),
});
