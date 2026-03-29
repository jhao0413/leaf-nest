import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true')
});

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = Omit<ParsedEnv, 'S3_PUBLIC_ENDPOINT'> & {
  S3_PUBLIC_ENDPOINT: string;
};

export function parseEnv(rawEnv: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const missingKeys = parsed.error.issues.map((issue) => issue.path.join('.')).filter(Boolean);
    throw new Error(`Invalid environment configuration: ${missingKeys.join(', ')}`);
  }

  if (!parsed.data.S3_PUBLIC_ENDPOINT && rawEnv.NODE_ENV === 'production') {
    throw new Error('Invalid environment configuration: S3_PUBLIC_ENDPOINT');
  }

  return {
    ...parsed.data,
    S3_PUBLIC_ENDPOINT: parsed.data.S3_PUBLIC_ENDPOINT ?? parsed.data.S3_ENDPOINT
  };
}

export function getEnv(): Env {
  return parseEnv(process.env);
}
