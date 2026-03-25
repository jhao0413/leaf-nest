import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { reactRefreshWrapperPlugin } from 'vite/internal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reactRefreshPlugin = reactRefreshWrapperPlugin({
  cwd: process.cwd(),
  jsxImportSource: 'react',
  reactRefreshHost: ''
});

reactRefreshPlugin.apply = 'serve';

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
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts']
  }
});
