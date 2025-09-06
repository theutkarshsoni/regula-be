import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['analyst','admin']).default('analyst')
});

export const LoginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const RuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100, 'Rule name can be max 100 characters'),
  type: z.enum(['concentration', 'exposure', 'large-trade']),
  threshold: z.coerce.number().positive('Threshold must be > 0'),
  asset_class: z.string().optional(), // only used for type: exposure
  active: z.boolean().optional(),
});


export const BreachUpdateSchema = z.object({
  status: z.enum(['open','in-progress','in_progress','resolved']).optional(),
  assignee: z.string().min(1).optional(),
  notes: z.string().max(2000).optional()
});