import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import ffmpegPath from 'ffmpeg-static';

import { createMp3DownloadResponse, mp3TranscodeArgs } from '../lib/audio-transcode.ts';

test('MP3 transcoding uses an audio-only LAME stream without invoking a shell', () => {
  const args = mp3TranscodeArgs(
    'https://media.example/audio.m4a?token=one%26two',
    'SPICE-Test/1.0',
  );

  assert.deepEqual(args.slice(-12), [
    '-map',
    '0:a:0',
    '-vn',
    '-map_metadata',
    '-1',
    '-codec:a',
    'libmp3lame',
    '-q:a',
    '2',
    '-f',
    'mp3',
    'pipe:1',
  ]);
  assert.equal(args[args.indexOf('-user_agent') + 1], 'SPICE-Test/1.0');
  assert.equal(args[args.indexOf('-protocol_whitelist') + 1], 'http,https,tcp,tls,crypto');
  assert.equal(args[args.indexOf('-i') + 1], 'https://media.example/audio.m4a?token=one%26two');
});

test('MP3 transcoding rejects non-HTTP source protocols', () => {
  assert.throws(
    () => mp3TranscodeArgs('file:///private/audio.m4a', 'SPICE-Test/1.0'),
    /Only HTTP\(S\) audio sources/u,
  );
});

test('MP3 download response converts an M4A source with the bundled FFmpeg', async (t) => {
  assert.ok(ffmpegPath, 'The bundled FFmpeg binary must be available for local-runtime tests.');
  const directory = await mkdtemp(path.join(tmpdir(), 'spice-mp3-test-'));
  const sourcePath = path.join(directory, 'source.m4a');

  await runFfmpeg([
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=0.2',
    '-codec:a',
    'aac',
    sourcePath,
  ]);

  const server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'audio/mp4');
    createReadStream(sourcePath).pipe(response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.close();
    await once(server, 'close');
    await rm(directory, { recursive: true, force: true });
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const response = await createMp3DownloadResponse({
    sourceUrl: `http://127.0.0.1:${address.port}/source.m4a`,
    title: 'Artist – Song',
    userAgent: 'SPICE-Test/1.0',
    headers: { 'X-SPICE-Test': 'transcoded' },
  });
  const bytes = new Uint8Array(await response.arrayBuffer());

  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.match(response.headers.get('content-disposition') || '', /\.mp3/u);
  assert.equal(response.headers.get('x-spice-test'), 'transcoded');
  assert.ok(bytes.length > 500, 'The MP3 response should contain encoded audio.');
  assert.ok(
    String.fromCharCode(...bytes.slice(0, 3)) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
    'The encoded response should start with an ID3 tag or MP3 frame sync.',
  );
});

async function runFfmpeg(args) {
  const child = spawn(ffmpegPath, args, { shell: false, windowsHide: true });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [code] = await once(child, 'close');
  assert.equal(code, 0, stderr || 'FFmpeg fixture generation failed.');
}
