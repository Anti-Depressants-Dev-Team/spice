import type { ProfileListenTrack } from './lastfm';

const LISTENBRAINZ_SUBMIT_LISTENS_URL = 'https://api.listenbrainz.org/1/submit-listens';
const DEFAULT_TIMEOUT_MS = 8000;

interface ListenBrainzSubmitInput {
  token: string;
  track: ProfileListenTrack;
  timestamp?: number;
}

export async function submitListenBrainzNowPlaying(input: ListenBrainzSubmitInput) {
  return submitListenBrainzListen({
    token: input.token,
    listenType: 'playing_now',
    track: input.track,
  });
}

export async function submitListenBrainzScrobble(input: ListenBrainzSubmitInput) {
  if (!input.timestamp) {
    throw new Error('ListenBrainz scrobble requires a playback start timestamp.');
  }

  return submitListenBrainzListen({
    token: input.token,
    listenType: 'single',
    track: input.track,
    timestamp: input.timestamp,
  });
}

async function submitListenBrainzListen({
  token,
  listenType,
  track,
  timestamp,
}: {
  token: string;
  listenType: 'playing_now' | 'single';
  track: ProfileListenTrack;
  timestamp?: number;
}) {
  const payloadEntry: Record<string, unknown> = {
    track_metadata: {
      artist_name: track.artist,
      track_name: track.title,
      ...(track.album ? { release_name: track.album } : {}),
      additional_info: {
        media_player: 'SPICE',
        submission_client: 'SPICE',
        music_service: musicServiceDomain(track),
        music_service_name: musicServiceName(track),
        ...(track.permalinkUrl ? { origin_url: track.permalinkUrl } : {}),
        ...(track.durationMs ? { duration_ms: track.durationMs } : {}),
      },
    },
  };

  if (listenType === 'single') {
    payloadEntry.listened_at = timestamp;
  }

  const response = await fetch(LISTENBRAINZ_SUBMIT_LISTENS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SPICE-Music-Player/1.0',
    },
    body: JSON.stringify({
      listen_type: listenType,
      payload: [payloadEntry],
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(data.error || data.message || `ListenBrainz profile update failed with status ${response.status}.`);
  }

  return response.json().catch(() => ({}));
}

function musicServiceDomain(track: ProfileListenTrack) {
  if (track.permalinkUrl) {
    try {
      const hostname = new URL(track.permalinkUrl).hostname.replace(/^www\./, '');
      if (hostname.includes('music.youtube.com')) return 'music.youtube.com';
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube.com';
      if (hostname.includes('soundcloud.com')) return 'soundcloud.com';
      return hostname;
    } catch {
      return undefined;
    }
  }

  if (track.sourceId === 'soundcloud') return 'soundcloud.com';
  if (track.sourceId === 'youtube_video') return 'youtube.com';
  return 'music.youtube.com';
}

function musicServiceName(track: ProfileListenTrack) {
  if (track.sourceId === 'soundcloud') return 'SoundCloud';
  if (track.sourceId === 'youtube_video') return 'YouTube';
  return 'YouTube Music';
}
