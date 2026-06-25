import type { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import discordRpcClient, { type DiscordActivity } from '@/lib/discord-ipc';

export const runtime = 'nodejs';

interface PresenceTrack {
  id: string;
  title: string;
  artist: string;
  durationMs?: number;
  artworkUrl?: string;
  permalinkUrl?: string;
}

interface PresenceRequest {
  track: PresenceTrack | null;
  isPlaying: boolean;
  progressMs: number;
}

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: NextRequest) {
  let body: PresenceRequest;
  try {
    body = await request.json() as PresenceRequest;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, { status: 400 });
  }

  const { track, isPlaying, progressMs } = body;

  if (!track || track.id === 'placeholder') {
    // Clear presence
    try {
      await discordRpcClient.setActivity(null);
      return jsonResponse({ ok: true, cleared: true });
    } catch (err) {
      return jsonResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  try {
    const activity: DiscordActivity = {
      details: track.title,
      state: isPlaying ? `by ${track.artist}` : `by ${track.artist} (Paused)`,
      assets: {
        large_image: track.artworkUrl && track.artworkUrl.startsWith('http')
          ? track.artworkUrl
          : 'https://music.spice-app.xyz/icon.svg',
        large_text: 'SPICE Music Player',
      },
    };

    if (isPlaying) {
      const now = Date.now();
      activity.timestamps = {
        start: Math.round((now - progressMs) / 1000),
      };
      if (track.durationMs && track.durationMs > 0) {
        activity.timestamps.end = Math.round((now - progressMs + track.durationMs) / 1000);
      }
    }

    // Add external action buttons if a valid URL exists
    const rawLink = track.permalinkUrl || 'https://music.spice-app.xyz';
    if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
      activity.buttons = [
        {
          label: 'Listen on SPICE',
          url: rawLink,
        },
      ];
    }

    await discordRpcClient.setActivity(activity);
    return jsonResponse({ ok: true, activity });
  } catch (err) {
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
