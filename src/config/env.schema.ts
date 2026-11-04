import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),

  POSTGRES_USER: z.string().min(2),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DATABASE: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(15432),

  DATABASE_URL: z.string().url(),
});

export type EnvSchema = z.infer<typeof envSchema>;
