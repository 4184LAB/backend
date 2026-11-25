import { z } from 'zod';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

export const searchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  type: z.enum(['posts', 'comments', 'users']).catch('posts'),
  sort: z.enum(['latest', 'oldest']).catch('latest'),
  from: date,
  to: date,
});

export type SearchInput = z.infer<typeof searchSchema>;
