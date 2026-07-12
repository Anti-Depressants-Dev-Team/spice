import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeSongsPlayedCount } from '../lib/profile-sync.ts';

test('profile sync preserves the highest monotonic songs-played count', () => {
  assert.equal(mergeSongsPlayedCount(149, 0, 50), 149);
  assert.equal(mergeSongsPlayedCount(10, 20, 5), 20);
});

test('profile sync recovers a missing counter from synced history', () => {
  assert.equal(mergeSongsPlayedCount(0, 0, 50), 50);
});

test('profile sync normalizes malformed or negative counters', () => {
  assert.equal(mergeSongsPlayedCount(-4, '12.9', Number.NaN), 12);
});
