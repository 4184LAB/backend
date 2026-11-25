import { z } from 'zod';

export const roleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export type RoleInput = z.infer<typeof roleSchema>;
