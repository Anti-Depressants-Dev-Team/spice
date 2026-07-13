import assert from 'node:assert/strict';
import test from 'node:test';

import * as localDrizzle from '../lib/drizzle-local-stub.ts';

test('local Drizzle stub exports comparison operators used by cloud-only routes', () => {
  for (const operator of ['gt', 'gte', 'lt', 'lte']) {
    assert.equal(typeof localDrizzle[operator], 'function', `missing local Drizzle export: ${operator}`);
  }
});
