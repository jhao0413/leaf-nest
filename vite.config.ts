import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite-plus';
import { reactRefreshWrapperPlugin } from 'vite/internal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getOrigin(name: string, value: string | undefined, fallback: string) {
  if (!value) return new URL(fallback).origin;
  try {
    return new URL(value).origin;
  } catch {
    console.warn(
      `[vite.config] ${name}="${value}" is not a valid URL, falling back to ${fallback}`
    );
    return new URL(fallback).origin;
  }
}

function getPort(name: string, value: string | undefined, fallback: number) {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.port ? Number(url.port) : fallback;
  } catch {
    console.warn(
      `[vite.config] ${name}="${value}" is not a valid URL, falling back to port ${fallback}`
    );
    return fallback;
  }
}

const reactRefreshPlugin = Object.assign(
  reactRefreshWrapperPlugin({
    cwd: process.cwd(),
    jsxImportSource: 'react',
    reactRefreshHost: ''
  }),
  { apply: 'serve' as const }
);

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const appPort = getPort('APP_URL', env.APP_URL, 5173);
const apiOrigin = getOrigin('BETTER_AUTH_URL', env.BETTER_AUTH_URL, 'http://localhost:8787');

export default defineConfig({
  plugins: [reactRefreshPlugin],
  oxc: {
    jsxRefreshInclude: /\.[jt]sx$/
  },
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**'],
    env: {
      browser: true,
      node: true
    },
    plugins: ['typescript', 'react', 'react-perf', 'jsx-a11y', 'vitest', 'node'],
    overrides: [
      {
        files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'vitest.setup.ts'],
        globals: {
          describe: 'readonly',
          it: 'readonly',
          expect: 'readonly',
          vi: 'readonly',
          beforeEach: 'readonly',
          afterEach: 'readonly'
        }
      }
    ]
  },
  fmt: {
    singleQuote: true,
    semi: true,
    trailingComma: 'none'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: appPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiOrigin,
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['server/**', 'dist/**', 'dist-server/**']
  }
});
