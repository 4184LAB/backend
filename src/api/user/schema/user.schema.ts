// src/api/user/schema/user.schema.ts
import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});

export const withdrawSchema = z.object({
  password: z.string().min(1).max(128),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
