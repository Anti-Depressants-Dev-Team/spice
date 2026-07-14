import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { tsImport } from 'tsx/esm/api';

const tsconfig = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
const feedbackRoute = await tsImport('../app/api/admin/feedback/route.ts', {
  parentURL: import.meta.url,
  tsconfig,
});

test('admin feedback inbox rejects requests without an authenticated account', async () => {
  const response = await feedbackRoute.GET(new Request('https://music.spice-app.xyz/api/admin/feedback'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: 'A bearer token is required to load feedback.',
  });
});
