import assert from 'node:assert/strict';
import test from 'node:test';

import { stripSoundCloudTrackPrefix } from '../lib/soundcloud.ts';

test('stripSoundCloudTrackPrefix correctly strips prefix', () => {
  assert.equal(stripSoundCloudTrackPrefix('soundcloud:12345'), '12345');
});

test('stripSoundCloudTrackPrefix returns original string if prefix is not present', () => {
  assert.equal(stripSoundCloudTrackPrefix('spotify:12345'), 'spotify:12345');
  assert.equal(stripSoundCloudTrackPrefix('12345'), '12345');
});

test('stripSoundCloudTrackPrefix handles empty strings', () => {
  assert.equal(stripSoundCloudTrackPrefix(''), '');
});
