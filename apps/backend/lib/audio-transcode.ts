import { spawn } from 'node:child_process';
import { PassThrough, Readable } from 'node:stream';

import ffmpegStaticPath from 'ffmpeg-static';

import { audioContentDisposition } from './audio-download.ts';

const MAX_FFMPEG_ERROR_LENGTH = 16_384;

type Mp3DownloadOptions = {
  sourceUrl: string;
  title?: string | null;
  userAgent: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export function mp3TranscodeArgs(sourceUrl: string, userAgent: string) {
  const source = new URL(sourceUrl);
  if (source.protocol !== 'http:' && source.protocol !== 'https:') {
    throw new Error('Only HTTP(S) audio sources can be converted.');
  }

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-user_agent',
    userAgent,
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_delay_max',
    '5',
    '-protocol_whitelist',
    'http,https,tcp,tls,crypto',
    '-i',
    source.toString(),
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
  ];
}

export async function createMp3DownloadResponse({
  sourceUrl,
  title,
  userAgent,
  headers,
  signal,
}: Mp3DownloadOptions) {
  const ffmpegPath = process.env.SPICE_FFMPEG_PATH?.trim() || ffmpegStaticPath;
  if (!ffmpegPath) {
    throw new Error('MP3 conversion is not available in this runtime.');
  }
  if (signal?.aborted) {
    throw new Error('The MP3 conversion request was cancelled.');
  }

  const output = new PassThrough();
  const child = spawn(ffmpegPath, mp3TranscodeArgs(sourceUrl, userAgent), {
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stderr = '';

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    if (stderr.length < MAX_FFMPEG_ERROR_LENGTH) {
      stderr += chunk.slice(0, MAX_FFMPEG_ERROR_LENGTH - stderr.length);
    }
  });

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });

  const stopConversion = () => {
    if (!child.killed) child.kill('SIGKILL');
  };
  signal?.addEventListener('abort', stopConversion, { once: true });
  output.once('close', stopConversion);

  child.stdout.pipe(output, { end: false });
  child.once('error', (error) => output.destroy(error));
  child.once('close', (code, closeSignal) => {
    signal?.removeEventListener('abort', stopConversion);
    if (code === 0) {
      output.end();
      return;
    }

    const detail = stderr.trim();
    output.destroy(new Error(
      detail || `FFmpeg exited with ${closeSignal ? `signal ${closeSignal}` : `code ${code ?? 'unknown'}`}.`,
    ));
  });

  return new Response(Readable.toWeb(output) as ReadableStream<Uint8Array>, {
    headers: {
      ...headers,
      'Cache-Control': 'no-store',
      'Content-Disposition': audioContentDisposition(title, 'mp3'),
      'Content-Type': 'audio/mpeg',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
