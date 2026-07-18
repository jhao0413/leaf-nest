import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDirectory, '..');
const envExamplePath = path.join(repoRoot, '.env.example');
const envPath = path.join(repoRoot, '.env');
const composeFiles = ['-f', 'docker-compose.yml', '-f', 'docker-compose.dev.yml'];

function ensureDevelopmentEnv() {
  const envExisted = fs.existsSync(envPath);
  const source = envExisted
    ? fs.readFileSync(envPath, 'utf8')
    : fs.readFileSync(envExamplePath, 'utf8');
  const secretPattern = /^BETTER_AUTH_SECRET=(.*)$/m;
  const currentSecret = source.match(secretPattern)?.[1].trim();

  if (currentSecret) {
    fs.chmodSync(envPath, 0o600);
    console.log('✓ Preserved the existing BETTER_AUTH_SECRET in .env');
    return;
  }

  const generatedSecret = randomBytes(32).toString('hex');
  const updatedSource = secretPattern.test(source)
    ? source.replace(secretPattern, `BETTER_AUTH_SECRET=${generatedSecret}`)
    : `${source.trimEnd()}\nBETTER_AUTH_SECRET=${generatedSecret}\n`;

  fs.writeFileSync(envPath, updatedSource, { mode: 0o600 });
  fs.chmodSync(envPath, 0o600);
  console.log(
    envExisted
      ? '✓ Added BETTER_AUTH_SECRET to the existing .env'
      : '✓ Created .env with a generated BETTER_AUTH_SECRET'
  );
}

function run(command, args, failureMessage) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.error || result.status !== 0) {
    if (result.error?.code === 'ENOENT') {
      console.error(`${failureMessage}: command not found (${command})`);
    } else {
      console.error(failureMessage);
    }
    process.exit(result.status ?? 1);
  }
}

ensureDevelopmentEnv();

console.log('→ Starting PostgreSQL and RustFS...');
run(
  'docker',
  ['compose', ...composeFiles, 'up', '-d', 'postgres', 'rustfs', 'storage-init'],
  'Could not start the local Docker infrastructure. Make sure Docker is installed and running.'
);

console.log('→ Applying database migrations...');
run(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['db:migrate'],
  'Could not apply database migrations.'
);

console.log('\n✓ Leaf Nest development infrastructure is ready.');
console.log('  Run: pnpm dev');
