import { globalIgnores, defineConfig } from 'eslint/config';
import nextCoreVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextCoreVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'never']
    }
  }
]);
