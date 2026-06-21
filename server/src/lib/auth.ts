import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins/bearer';
import { getEnv } from '../env.js';
import { getDb } from './db.js';
import * as schema from '../db/schema/index.js';

type TrustedOriginEnv = Pick<
  ReturnType<typeof getEnv>,
  'APP_URL' | 'BETTER_AUTH_URL' | 'TRUSTED_CLIENT_ORIGINS'
>;

export function buildTrustedOrigins(env: TrustedOriginEnv) {
  return Array.from(
    new Set([
      ...[env.APP_URL, env.BETTER_AUTH_URL].map((value) => new URL(value).origin),
      ...env.TRUSTED_CLIENT_ORIGINS
    ])
  );
}

export function buildAdapterSchema() {
  return {
    user: schema.users,
    session: schema.sessions,
    account: schema.accounts,
    verification: schema.verifications
  };
}

function shouldUseCrossSiteAuthCookies(env: TrustedOriginEnv) {
  return (
    env.TRUSTED_CLIENT_ORIGINS.length > 0 && new URL(env.BETTER_AUTH_URL).protocol === 'https:'
  );
}

function createAuth() {
  const env = getEnv();
  const db = getDb();
  const useCrossSiteCookies = shouldUseCrossSiteAuthCookies(env);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: buildTrustedOrigins(env),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: buildAdapterSchema()
    }),
    emailAndPassword: {
      enabled: true
    },
    plugins: [bearer()],
    advanced: useCrossSiteCookies
      ? {
          defaultCookieAttributes: {
            sameSite: 'none',
            secure: true
          }
        }
      : undefined
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
}
