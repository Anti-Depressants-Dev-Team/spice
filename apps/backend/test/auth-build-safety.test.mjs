import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));

test('auth imports without JWT_SECRET but requires it for runtime operations', () => {
  const script = `
    const auth = await import('./lib/auth.ts');
    const expected = 'Missing JWT_SECRET environment variable.';

    for (const operation of [
      () => auth.signSession({ userId: 'test', email: 'test@example.com', accountRole: 'user' }),
      () => auth.verifySession('invalid-token'),
    ]) {
      await assert.rejects(operation, { message: expected });
    }
  `;

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '--eval', `import assert from 'node:assert/strict';${script}`],
    {
      cwd: backendRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        JWT_SECRET: '',
        NODE_ENV: 'production',
        npm_lifecycle_event: '',
      },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
