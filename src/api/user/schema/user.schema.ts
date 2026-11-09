// src/api/user/schema/profile.schema.ts
import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type ProfileInput = z.infer<typeof profileSchema>;
