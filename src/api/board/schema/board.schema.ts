import { z } from 'zod';

export const boardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

export type BoardSchema = z.infer<typeof boardSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
