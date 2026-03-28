import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('throws when required environment variables are missing', () => {
    expect(() =>
      parseEnv({
        API_PORT: '8787'
      })
    ).toThrow(/APP_URL/);
  });

  it('parses a complete environment configuration', () => {
    const env = parseEnv({
      APP_URL: 'http://localhost:3000',
      API_PORT: '8787',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/leaf_nest',
      BETTER_AUTH_SECRET: 'super-secret-key',
      BETTER_AUTH_URL: 'http://localhost:8787',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'leaf-nest',
      S3_ACCESS_KEY_ID: 'minioadmin',
      S3_SECRET_ACCESS_KEY: 'minioadmin',
      S3_FORCE_PATH_STYLE: 'true'
    });

    expect(env).toEqual({
      APP_URL: 'http://localhost:3000',
      API_PORT: 8787,
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/leaf_nest',
      BETTER_AUTH_SECRET: 'super-secret-key',
      BETTER_AUTH_URL: 'http://localhost:8787',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_PUBLIC_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'leaf-nest',
      S3_ACCESS_KEY_ID: 'minioadmin',
      S3_SECRET_ACCESS_KEY: 'minioadmin',
      S3_FORCE_PATH_STYLE: true
    });
  });
});
