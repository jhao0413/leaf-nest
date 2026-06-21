import { z } from 'zod';

const envSchema = z.object({
  APP_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  TRUSTED_CLIENT_ORIGINS: z.string().optional(),
  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true')
});

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = Omit<ParsedEnv, 'S3_PUBLIC_ENDPOINT' | 'TRUSTED_CLIENT_ORIGINS'> & {
  S3_PUBLIC_ENDPOINT: string;
  TRUSTED_CLIENT_ORIGINS: string[];
};

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.origin !== 'null') {
      return url.origin;
    }

    if (url.protocol && url.host) {
      return `${url.protocol}//${url.host}`;
    }
  } catch {
    return null;
  }

  return null;
}

function parseTrustedClientOrigins(value: string | undefined) {
  if (!value?.trim()) {
    return [];
  }

  const origins = value
    .split(',')
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  if (origins.length !== value.split(',').filter((item) => item.trim()).length) {
    throw new Error('Invalid environment configuration: TRUSTED_CLIENT_ORIGINS');
  }

  return Array.from(new Set(origins));
}

export function parseEnv(rawEnv: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const missingKeys = parsed.error.issues.map((issue) => issue.path.join('.')).filter(Boolean);
    throw new Error(`Invalid environment configuration: ${missingKeys.join(', ')}`);
  }

  if (!parsed.data.S3_PUBLIC_ENDPOINT && rawEnv.NODE_ENV === 'production') {
    throw new Error('Invalid environment configuration: S3_PUBLIC_ENDPOINT');
  }

  const trustedClientOrigins = parseTrustedClientOrigins(parsed.data.TRUSTED_CLIENT_ORIGINS);

  return {
    ...parsed.data,
    S3_PUBLIC_ENDPOINT: parsed.data.S3_PUBLIC_ENDPOINT ?? parsed.data.S3_ENDPOINT,
    TRUSTED_CLIENT_ORIGINS: trustedClientOrigins
  };
}

export function getEnv(): Env {
  return parseEnv(process.env);
}
