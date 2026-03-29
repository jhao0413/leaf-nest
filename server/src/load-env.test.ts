import { describe, expect, it, vi } from 'vitest';

const { configMock } = vi.hoisted(() => ({
  configMock: vi.fn()
}));

vi.mock('dotenv', () => ({
  default: {
    config: configMock
  },
  config: configMock
}));

describe('load-env', () => {
  it('loads dotenv via the package main export', async () => {
    await import('./load-env.js');

    expect(configMock).toHaveBeenCalledTimes(1);
  });
});
