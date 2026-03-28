import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..');

describe('self-host deployment configuration', () => {
  it('uses a single app port and overrides the app container storage endpoint', () => {
    const composeSource = fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');

    expect(composeSource).toContain("- '8787:8787'");
    expect(composeSource).not.toContain("- '3000:3000'");
    expect(composeSource).toContain('S3_ENDPOINT: http://minio:9000');
    expect(composeSource).toContain('APP_URL: http://localhost:8787');
    expect(composeSource).toContain('BETTER_AUTH_URL: http://localhost:8787');
  });
});
