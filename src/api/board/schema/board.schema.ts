import { z } from 'zod';

export const boardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1),
});

export type BoardSchema = z.infer<typeof boardSchema>;
