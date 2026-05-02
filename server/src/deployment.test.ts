import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..');

describe('self-host deployment configuration', () => {
  it('uses the published app image and RustFS-backed self-host defaults', () => {
    const composeSource = fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');

    expect(composeSource).toContain('image: jhao0413/leaf-nest:${LEAF_NEST_TAG:-latest}');
    expect(composeSource).not.toContain('dockerfile: Dockerfile');
    expect(composeSource).toContain("- '8787:8787'");
    expect(composeSource).not.toContain("- '3000:3000'");
    expect(composeSource).not.toContain('minio:');
    expect(composeSource).toContain('rustfs:');
    expect(composeSource).toContain('image: rustfs/rustfs:latest');
    expect(composeSource).toContain('APP_URL: ${SELF_HOST_APP_URL:-http://localhost:8787}');
    expect(composeSource).toContain(
      'DATABASE_URL: ${SELF_HOST_DATABASE_URL:-postgres://postgres:postgres@postgres:5432/leaf_nest}'
    );
    expect(composeSource).toContain(
      'BETTER_AUTH_URL: ${SELF_HOST_BETTER_AUTH_URL:-http://localhost:8787}'
    );
    expect(composeSource).toContain('S3_ENDPOINT: ${SELF_HOST_S3_ENDPOINT:-http://rustfs:9000}');
    expect(composeSource).toContain(
      'S3_PUBLIC_ENDPOINT: ${SELF_HOST_S3_PUBLIC_ENDPOINT:-http://localhost:9000}'
    );
    expect(composeSource).toContain('storage-init:');
    expect(composeSource).toContain("command: ['pnpm', 'db:migrate']");
  });

  it('publishes tagged Docker Hub images from GitHub Actions', () => {
    const workflowSource = fs.readFileSync(
      path.join(repoRoot, '.github', 'workflows', 'docker-publish.yml'),
      'utf8'
    );

    expect(workflowSource).toContain("tags:\n      - 'v*'");
    expect(workflowSource).toContain('uses: docker/login-action@v3');
    expect(workflowSource).toContain('images: jhao0413/leaf-nest');
    expect(workflowSource).toContain('uses: docker/build-push-action@v6');
    expect(workflowSource).toContain('push: true');
  });
});
