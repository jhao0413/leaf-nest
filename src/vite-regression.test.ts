// @vitest-environment node
import config from '../vite.config.ts';

describe('vite sqlite wasm integration', () => {
  it('excludes sqlite wasm from optimizeDeps prebundling', () => {
    expect(config.optimizeDeps?.exclude).toContain('@sqlite.org/sqlite-wasm');
  });
});
