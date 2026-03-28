import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true')
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const missingKeys = parsed.error.issues.map((issue) => issue.path.join('.')).filter(Boolean);
    throw new Error(`Invalid environment configuration: ${missingKeys.join(', ')}`);
  }

  return parsed.data;
}

export function getEnv(): Env {
  return parseEnv(process.env);
}
