import { describe, expect, it } from 'vitest';
import { app } from '../app.js';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
