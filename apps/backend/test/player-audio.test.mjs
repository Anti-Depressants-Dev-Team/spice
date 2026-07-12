import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePlayerVolume,
  playerVolumeGain,
  shouldUsePlayerGainPath,
  shouldUseProxyForBoost,
} from '../lib/player-audio.ts';

test('boosted player volume reaches a real ten-times gain', () => {
  assert.equal(normalizePlayerVolume(1000, true), 1000);
  assert.equal(playerVolumeGain(1000), 10);
  assert.equal(shouldUsePlayerGainPath(1000, true), true);
});

test('standard volume remains bounded and does not require the gain path', () => {
  assert.equal(normalizePlayerVolume(1000, false), 200);
  assert.equal(playerVolumeGain(-10), 0);
  assert.equal(shouldUsePlayerGainPath(100, false), false);
});

test('boosted embed playback is routed to the proxy audio path', () => {
  assert.equal(shouldUseProxyForBoost(1000, 'embed'), true);
  assert.equal(shouldUseProxyForBoost(100, 'embed'), false);
  assert.equal(shouldUseProxyForBoost(1000, 'proxy'), false);
});
