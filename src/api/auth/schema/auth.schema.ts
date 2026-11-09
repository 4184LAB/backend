import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
  name: z.string().min(1).max(100),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
});

export const reissueSchema = z.object({
  userId: z.uuid(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReissueInput = z.infer<typeof reissueSchema>;
