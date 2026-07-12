import assert from 'node:assert/strict';
import test from 'node:test';

import { audioContentDisposition, audioDownloadExtension } from '../lib/audio-download.ts';

test('audioDownloadExtension preserves mp4 audio as m4a downloads', () => {
  assert.equal(audioDownloadExtension('audio/mp4; codecs="mp4a.40.2"', 'webm'), 'm4a');
});

test('audioDownloadExtension preserves webm audio as webm downloads', () => {
  assert.equal(audioDownloadExtension('audio/webm; codecs="opus"', 'mp4'), 'webm');
});

test('audioDownloadExtension falls back from stream containers', () => {
  assert.equal(audioDownloadExtension(null, 'mp4'), 'm4a');
  assert.equal(audioDownloadExtension(null, 'mpeg'), 'mp3');
});

test('audioContentDisposition writes matching ASCII and UTF-8 filenames', () => {
  const header = audioContentDisposition('Café Track', 'm4a');
  assert.equal(
    header,
    'attachment; filename="Caf Track.m4a"; filename*=UTF-8\'\'Caf%C3%A9%20Track.m4a',
  );
});
