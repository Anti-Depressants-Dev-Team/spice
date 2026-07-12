import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));

test('run-next resolves a hoisted npm workspace Next.js CLI', () => {
  const result = spawnSync(process.execPath, ['scripts/run-next.mjs', '--version'], {
    cwd: backendRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^Next\.js v16\.2\.10\s*$/m);
});
