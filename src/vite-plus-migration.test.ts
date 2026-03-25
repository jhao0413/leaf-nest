// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(__dirname, '..');

describe('vite+ migration', () => {
  it('routes package scripts through vp commands', () => {
    const packageJsonPath = path.join(repoRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      type?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.type).toBe('module');
    expect(packageJson.scripts).toMatchObject({
      dev: 'vp dev',
      build: 'vp build',
      preview: 'vp preview',
      lint: 'vp lint',
      fmt: 'vp fmt',
      check: 'vp check',
      test: 'vp test'
    });

    expect(packageJson.devDependencies?.vite).toMatch(/^npm:@voidzero-dev\/vite-plus-core@/);
    expect(packageJson.devDependencies?.vitest).toMatch(/^npm:@voidzero-dev\/vite-plus-test@/);
    expect(packageJson.devDependencies?.eslint).toBeUndefined();
    expect(packageJson.devDependencies?.prettier).toBeUndefined();
    expect(packageJson.devDependencies?.['@vitejs/plugin-react']).toBeUndefined();
    expect(packageJson.dependencies?.next).toBeUndefined();
    expect(packageJson.dependencies?.['next-intl']).toBeUndefined();
    expect(packageJson.dependencies?.['next-themes']).toBeUndefined();
  });

  it('uses vite.config.ts with vite-plus defineConfig', () => {
    const vitePlusConfigPath = path.join(repoRoot, 'vite.config.ts');

    expect(fs.existsSync(vitePlusConfigPath)).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'vite.config.mts'))).toBe(false);

    const configSource = fs.readFileSync(vitePlusConfigPath, 'utf8');

    expect(configSource).toContain("from 'vite-plus'");
    expect(configSource).toContain("from 'vite/internal'");
    expect(configSource).toContain('reactRefreshWrapperPlugin');
    expect(configSource).toContain('oxc:');
    expect(configSource).toContain('lint:');
    expect(configSource).toContain('fmt:');
    expect(configSource).not.toContain('@vitejs/plugin-react');
  });

  it('switches test globals to vite-plus types', () => {
    const tsconfigPath = path.join(repoRoot, 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8')) as {
      compilerOptions?: {
        types?: string[];
      };
    };

    expect(tsconfig.compilerOptions?.types).toContain('vite-plus/test/globals');
    expect(tsconfig.compilerOptions?.types).not.toContain('vitest/globals');
  });

  it('removes standalone eslint and prettier config files', () => {
    expect(fs.existsSync(path.join(repoRoot, 'eslint.config.mjs'))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, '.prettierrc.json'))).toBe(false);
  });

  it('pins vercel deployment to vite with static output and spa rewrites', () => {
    const vercelConfigPath = path.join(repoRoot, 'vercel.json');

    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8')) as {
      framework?: string | null;
      buildCommand?: string | null;
      outputDirectory?: string;
      rewrites?: Array<{ source: string; destination: string }>;
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };

    expect(vercelConfig.framework).toBe('vite');
    expect(vercelConfig.buildCommand).toBe('pnpm build');
    expect(vercelConfig.outputDirectory).toBe('dist');
    expect(vercelConfig.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/index.html'
    });
    expect(vercelConfig.headers).toContainEqual({
      source: '/(.*)',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin'
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp'
        },
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'cross-origin'
        }
      ]
    });
  });

  it('removes next-specific runtime remnants from source and ignore rules', () => {
    const providersSource = fs.readFileSync(
      path.join(repoRoot, 'src', 'app', 'providers.tsx'),
      'utf8'
    );
    const gitignoreSource = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');

    expect(providersSource).not.toContain('next-themes');
    expect(gitignoreSource).not.toContain('.next/');
    expect(gitignoreSource).not.toContain('next-env.d.ts');
  });

  it('loads vite config as an esm module', async () => {
    const viteConfigUrl = `${
      pathToFileURL(path.join(repoRoot, 'vite.config.ts')).href
    }?test=${Date.now()}`;
    const imported = (await import(viteConfigUrl)) as {
      default:
        | ((env: { command: 'serve' | 'build'; mode: string }) => {
            resolve?: {
              alias?: Record<string, string>;
            };
          })
        | {
            resolve?: {
              alias?: Record<string, string>;
            };
          };
    };

    const resolved =
      typeof imported.default === 'function'
        ? imported.default({ command: 'serve', mode: 'development' })
        : imported.default;

    expect(resolved.resolve?.alias?.['@']).toBe(path.join(repoRoot, 'src'));
  });

  it('only enables react refresh wrapper during dev', async () => {
    const viteConfigUrl = `${
      pathToFileURL(path.join(repoRoot, 'vite.config.ts')).href
    }?env-test=${Date.now()}`;
    const imported = (await import(viteConfigUrl)) as {
      default: {
        plugins?: Array<{ name?: string; apply?: string | ((...args: unknown[]) => boolean) }>;
      };
    };

    const reactRefreshPlugin = imported.default.plugins?.find(
      (plugin) => plugin.name === 'builtin:vite-react-refresh-wrapper'
    );

    expect(reactRefreshPlugin).toBeDefined();
    expect(reactRefreshPlugin?.apply).toBe('serve');
  });
});
