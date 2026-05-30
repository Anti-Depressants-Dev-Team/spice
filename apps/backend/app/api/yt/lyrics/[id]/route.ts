import type { NextRequest } from 'next/server';

import { jsonResponse, optionsResponse } from '@/lib/cors';
import { getTrackDetails, getYouTube } from '@/lib/youtube';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

function cleanTrackTitle(title: string): string {
  return title
    // Remove (Official Video), [Official Music Video], etc.
    .replace(/\s*[\(\[][^)]*official[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*video[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*audio[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*music video[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*visualizer[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*lyrics[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*lyric video[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*full audio[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*remastered[^)]*[\)\]]/gi, '')
    .trim();
}

interface LrcLibTrack {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

function generateThemedLyrics(title: string, artist: string, durationMs: number): { plainLyrics: string; syncedLyrics: string } {
  const durationSec = durationMs / 1000;
  const lines: { time: string; text: string }[] = [];

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}]`;
  };

  // Add intro
  lines.push({ time: formatTime(0), text: `🎵 [Instrumental Intro]` });
  lines.push({ time: formatTime(Math.min(8, durationSec * 0.04)), text: `✨ Playing: ${title}` });
  if (artist) {
    lines.push({ time: formatTime(Math.min(15, durationSec * 0.08)), text: `🎤 By: ${artist}` });
  }

  // Mid-song sections based on total duration
  const sections = [
    `🎹 Let the music take over...`,
    `💫 Feeling the vibrations`,
    `🌟 Beautiful soundscape drifting in`,
    `⚡ SPICE Media Player Karaoke Mode`,
    `🔥 Absolute masterpiece flow`,
    `🌈 Vibrant waves of sound`,
    `🌌 Drifting into the music...`,
    `✨ Enjoying the groove`,
    `💫 Keeping the energy high`,
  ];

  const count = Math.max(5, Math.floor(durationSec / 30));
  for (let i = 0; i < count; i++) {
    const progress = (i + 1) / (count + 1); // values between ~0.15 and ~0.85
    const sec = durationSec * (0.12 + progress * 0.75);
    const text = sections[i % sections.length];
    lines.push({ time: formatTime(sec), text });
  }

  // Outro
  lines.push({ time: formatTime(durationSec * 0.92), text: `🌊 Fading out smoothly...` });
  lines.push({ time: formatTime(durationSec * 0.96), text: `🎵 [Instrumental Outro]` });

  const syncedLyrics = lines.map((l) => `${l.time} ${l.text}`).join('\n');
  const plainLyrics = lines.map((l) => l.text).join('\n');

  return { plainLyrics, syncedLyrics };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log(`[LYRICS API] Received request for track ID: "${id}"`);

  try {
    // 1. Fetch details from YouTube (Lightweight metadata query first)
    let title = '';
    let primaryArtist = '';
    let durationMs = 180000;

    try {
      console.log(`[LYRICS API] Fetching lightweight basic info for ID: "${id}"`);
      const yt = await getYouTube();
      const info = await yt.getBasicInfo(id);
      title = info.basic_info.title || '';
      primaryArtist = info.basic_info.author || '';
      durationMs = info.basic_info.duration ? info.basic_info.duration * 1000 : 180000;
      console.log(`[LYRICS API] getBasicInfo successfully resolved: Title="${title}", Artist="${primaryArtist}", DurationMs=${durationMs}`);
    } catch (err) {
      console.log(`[LYRICS API] getBasicInfo failed, trying getTrackDetails fallback for ID: "${id}". Error:`, err);
      const details = await getTrackDetails(id);
      title = details.track.title;
      primaryArtist = details.track.artists?.[0]?.name || '';
      durationMs = details.track.durationMs || 180000;
      console.log(`[LYRICS API] getTrackDetails fallback resolved: Title="${title}", Artist="${primaryArtist}"`);
    }

    const durationSec = durationMs ? Math.round(durationMs / 1000) : 0;
    const cleanedTitle = cleanTrackTitle(title);

    console.log(`[LYRICS API] Target Query parameters: Cleaned Title="${cleanedTitle}", Artist="${primaryArtist}", Duration=${durationSec}s`);

    let plainLyrics = '';
    let syncedLyrics = '';
    let isFallback = false;

    // 2. Query LrcLib API
    if (cleanedTitle) {
      try {
        const queryParams = new URLSearchParams({
          track_name: cleanedTitle,
          artist_name: primaryArtist,
        });
        if (durationSec > 0) {
          queryParams.set('duration', String(durationSec));
        }

        // Attempt 1: Direct get endpoint
        const getUrl = `https://lrclib.net/api/get?${queryParams.toString()}`;
        console.log(`[LYRICS API] Querying LrcLib GET: ${getUrl}`);
        const res = await fetch(getUrl, {
          headers: { 'User-Agent': 'SPICE-Music-Player/1.0 (GitHub/razva)' },
          signal: AbortSignal.timeout(4000), // 4s timeout
        });

        if (res.ok) {
          console.log(`[LYRICS API] LrcLib GET status 200 OK. Parsing synced lyrics.`);
          const data = (await res.json()) as LrcLibTrack;
          if (data.syncedLyrics) {
            syncedLyrics = data.syncedLyrics;
            plainLyrics = data.plainLyrics || '';
          }
        } else {
          console.log(`[LYRICS API] LrcLib GET failed with status: ${res.status}`);
          if (res.status === 404) {
            // Attempt 2: Fallback search if direct get fails
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanedTitle} ${primaryArtist}`)}`;
            console.log(`[LYRICS API] LrcLib GET 404. Trying search query fallback: ${searchUrl}`);
            const searchRes = await fetch(searchUrl, {
              headers: { 'User-Agent': 'SPICE-Music-Player/1.0 (GitHub/razva)' },
              signal: AbortSignal.timeout(4000),
            });

            if (searchRes.ok) {
              const results = (await searchRes.json()) as LrcLibTrack[];
              console.log(`[LYRICS API] LrcLib Search status 200. Results count: ${results.length}`);
              // Try to find the first result that has synced lyrics
              const match = results.find((r) => r.syncedLyrics);
              if (match && match.syncedLyrics) {
                console.log(`[LYRICS API] Found synced lyrics match in search results: id=${match.id}`);
                syncedLyrics = match.syncedLyrics;
                plainLyrics = match.plainLyrics || '';
              } else {
                console.log(`[LYRICS API] No synced lyrics found in search result records.`);
              }
            } else {
              console.log(`[LYRICS API] LrcLib Search query failed with status: ${searchRes.status}`);
            }
          }
        }
      } catch (err) {
        console.error('[LYRICS API] Failed fetching from LrcLib:', err);
      }
    }

    // 3. Fallback Generation if no synced lyrics found
    if (!syncedLyrics) {
      console.log(`[LYRICS API] No synced lyrics located. Triggering dynamic, themed procedural lyric generation.`);
      isFallback = true;
      const fallback = generateThemedLyrics(title, primaryArtist, durationMs || 180000);
      plainLyrics = fallback.plainLyrics;
      syncedLyrics = fallback.syncedLyrics;
    }

    return jsonResponse({
      trackId: id,
      title,
      artist: primaryArtist,
      durationMs: durationMs || 180000,
      plainLyrics,
      syncedLyrics,
      isFallback,
    });
  } catch (error) {
    console.error('[LYRICS API] Fatal route processing error:', error);
    // If anything breaks, return a safe generated response so the app doesn't crash
    const fallback = generateThemedLyrics('Unknown Track', 'Unknown Artist', 180000);
    return jsonResponse({
      trackId: id,
      title: 'Unknown Track',
      artist: 'Unknown Artist',
      durationMs: 180000,
      plainLyrics: fallback.plainLyrics,
      syncedLyrics: fallback.syncedLyrics,
      isFallback: true,
      error: error instanceof Error ? error.message : 'Could not resolve track details',
    });
  }
}
