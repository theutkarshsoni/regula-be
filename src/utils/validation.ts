import { z } from "zod";

export const RuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100, 'Rule name can be max 100 characters'),
  type: z.enum(['concentration', 'exposure', 'large-trade']),
  threshold: z.number().positive('Threshold must be > 0'),
  asset_class: z.string().optional(), // only used for type: exposure
  active: z.boolean().optional(),
});
