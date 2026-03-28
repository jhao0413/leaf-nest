import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

async function createFrontendDistFixture() {
  const distDir = await mkdtemp(path.join(tmpdir(), 'leaf-nest-dist-'));
  const assetsDir = path.join(distDir, 'assets');

  await mkdir(assetsDir, { recursive: true });
  await writeFile(path.join(distDir, 'index.html'), '<!doctype html><div id="app">Leaf Nest</div>');
  await writeFile(path.join(assetsDir, 'app.js'), 'console.log("leaf-nest");');

  return distDir;
}

describe('createApp frontend hosting', () => {
  it('serves built frontend assets and falls back to index.html for app routes', async () => {
    const frontendDistDir = await createFrontendDistFixture();
    const app = createApp(undefined, {}, { frontendDistDir });

    const assetResponse = await app.request('/assets/app.js');
    expect(assetResponse.status).toBe(200);
    await expect(assetResponse.text()).resolves.toContain('leaf-nest');

    const routeResponse = await app.request('/reader/book-123');
    expect(routeResponse.status).toBe(200);
    expect(routeResponse.headers.get('content-type')).toContain('text/html');
    await expect(routeResponse.text()).resolves.toContain('<div id="app">Leaf Nest</div>');
  });
});
