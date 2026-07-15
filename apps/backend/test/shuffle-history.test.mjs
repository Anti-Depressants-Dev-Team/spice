import assert from 'node:assert/strict';
import test from 'node:test';

import {
  alignShuffleHistory,
  nextShuffleTrack,
  previousShuffleTrack,
  resetShuffleHistory,
} from '../app/shuffle-history.ts';

const queue = ['track:a', 'track:b', 'track:c', 'track:d'];

test('shuffle previous and next traverse the songs already heard in order', () => {
  let state = resetShuffleHistory(queue, 0);

  const firstNext = nextShuffleTrack(state, queue, 0, { random: () => 0 });
  assert.equal(firstNext.index, 1);
  state = firstNext.state;

  const secondNext = nextShuffleTrack(state, queue, 1, { random: () => 0 });
  assert.equal(secondNext.index, 2);
  state = secondNext.state;

  const previous = previousShuffleTrack(state, queue, 2);
  assert.equal(previous.index, 1);
  state = previous.state;

  const forwardAgain = nextShuffleTrack(state, queue, 1, { random: () => 0.99 });
  assert.equal(forwardAgain.index, 2);
  assert.equal(forwardAgain.fromHistory, true);

  const firstUnheardAfterHistory = nextShuffleTrack(forwardAgain.state, queue, 2, { random: () => 0 });
  assert.equal(firstUnheardAfterHistory.index, 3);
  assert.equal(firstUnheardAfterHistory.fromHistory, false);
});

test('shuffle does not repeat a queue entry before the cycle is exhausted', () => {
  let state = resetShuffleHistory(queue, 0);
  const played = [0];

  for (let step = 0; step < queue.length - 1; step += 1) {
    const next = nextShuffleTrack(state, queue, played.at(-1), { random: () => 0 });
    assert.notEqual(next.index, null);
    played.push(next.index);
    state = next.state;
  }

  assert.deepEqual(played, [0, 1, 2, 3]);
  assert.equal(nextShuffleTrack(state, queue, 3, { random: () => 0 }).index, null);

  const wrapped = nextShuffleTrack(state, queue, 3, { random: () => 0, wrap: true });
  assert.equal(wrapped.index, 0);
});

test('appending tracks keeps shuffle history while replacing a queue resets it', () => {
  const firstNext = nextShuffleTrack(resetShuffleHistory(queue, 0), queue, 0, { random: () => 0 });
  const extendedQueue = [...queue, 'track:e'];
  const alignedExtension = alignShuffleHistory(firstNext.state, extendedQueue, 1);

  assert.deepEqual(alignedExtension.sequence, [0, 1]);
  assert.deepEqual(alignedExtension.queueKeys, extendedQueue);

  const replacement = ['track:x', 'track:y'];
  const reset = alignShuffleHistory(alignedExtension, replacement, 1);
  assert.deepEqual(reset.sequence, [1]);
  assert.deepEqual(reset.cycleVisited, [1]);
});
