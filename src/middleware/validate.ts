import { ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return res.status(400).json({ error: msg });
    }
    req.body = parsed.data; 
    next();
  };
}
