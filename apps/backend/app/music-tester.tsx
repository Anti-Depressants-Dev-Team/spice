'use client';

/* eslint-disable @next/next/no-img-element -- Artwork URLs come from the source response. */

import { type FormEvent, useRef, useState } from 'react';

import styles from './page.module.css';

interface Artist {
  name: string;
}

interface StreamVariant {
  url: string;
  codec: string;
  bitrate: number;
  container: string;
  itag: number;
  expiresAt?: string;
}

interface Track {
  id: string;
  title: string;
  artists: Artist[];
  artworkUrl?: string;
  durationMs?: number;
}

interface ErrorPayload {
  error?: string;
  message?: string;
}

type PlaybackMode = 'direct' | 'embed';

export default function MusicTester() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [error, setError] = useState<string>();
  const [hasSearched, setHasSearched] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('direct');
  const [streamInfo, setStreamInfo] = useState<string>();
  const audioRef = useRef<HTMLAudioElement>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = String(
      new FormData(event.currentTarget).get('query') ?? '',
    ).trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(undefined);
    setTracks([]);

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        kind: 'tracks',
        limit: '12',
      });
      const response = await fetch(`/api/yt/search?${params}`);
      const payload = (await response.json()) as ErrorPayload & { tracks?: Track[] };
      if (!response.ok) throw new Error(apiError(payload, 'Search failed.'));
      setTracks(payload.tracks ?? []);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setIsSearching(false);
    }
  }

  async function loadTrack(track: Track) {
    setError(undefined);
    setPlaying(track);
    setStreamUrl(null);
    setStreamInfo(undefined);

    if (playbackMode === 'direct') {
      setIsLoadingStream(true);
      try {
        const response = await fetch(`/api/yt/track/${encodeURIComponent(track.id)}`);
        const payload = (await response.json()) as ErrorPayload & {
          track?: Track;
          streams?: StreamVariant[];
        };
        if (!response.ok) throw new Error(apiError(payload, 'Failed to resolve streams.'));

        const streams = payload.streams ?? [];
        if (streams.length === 0) {
          throw new Error('No audio streams available for this track.');
        }

        // Pick the first stream (already sorted by preference on the backend).
        const best = streams[0];
        setStreamUrl(best.url);
        setStreamInfo(`${best.codec} · ${Math.round(best.bitrate / 1000)}kbps · ${best.container}`);
      } catch (caught) {
        setError(messageFor(caught));
      } finally {
        setIsLoadingStream(false);
      }
    }
  }

  function handleAudioError() {
    setError(
      'Direct audio failed. The stream may have been blocked. Try the YouTube embed fallback.',
    );
  }

  return (
    <section className={styles.tester} aria-label="Music tester">
      <form className={styles.search} onSubmit={search}>
        <label className={styles.visuallyHidden} htmlFor="music-query">
          Search YouTube Music
        </label>
        <input
          autoComplete="off"
          id="music-query"
          name="query"
          placeholder="Search YouTube Music"
          type="search"
        />
        <button disabled={isSearching} type="submit">
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className={styles.modeToggle}>
        <label>
          <input
            checked={playbackMode === 'direct'}
            name="playback-mode"
            onChange={() => setPlaybackMode('direct')}
            type="radio"
          />{' '}
          Direct audio (proxy)
        </label>
        <label>
          <input
            checked={playbackMode === 'embed'}
            name="playback-mode"
            onChange={() => setPlaybackMode('embed')}
            type="radio"
          />{' '}
          YouTube embed (fallback)
        </label>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {playing && (
        <section className={styles.player} aria-label="Player">
          {playing.artworkUrl && (
            <img alt="" height={72} src={playing.artworkUrl} width={72} />
          )}
          <div className={styles.nowPlaying}>
            <strong>{playing.title}</strong>
            <span>{artistLabel(playing)}</span>

            {playbackMode === 'direct' ? (
              <>
                {isLoadingStream && <small>Resolving stream…</small>}
                {streamUrl && (
                  <>
                    <audio
                      autoPlay
                      controls
                      key={streamUrl}
                      onError={handleAudioError}
                      ref={audioRef}
                      src={streamUrl}
                    />
                    {streamInfo && (
                      <small className={styles.streamInfo}>
                        🎵 {streamInfo}
                      </small>
                    )}
                    <small>
                      Direct audio via mobile InnerTube client (no PO token needed).
                    </small>
                  </>
                )}
              </>
            ) : (
              <>
                <iframe
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  key={playing.id}
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={`https://www.youtube.com/embed/${encodeURIComponent(playing.id)}?autoplay=1&playsinline=1`}
                  title={`YouTube player: ${playing.title}`}
                />
                <small>Playback uses YouTube&apos;s player (embedded).</small>
              </>
            )}
          </div>
        </section>
      )}

      <div className={styles.status} aria-live="polite">
        {!isSearching && hasSearched && tracks.length === 0 && !error && (
          <p>No tracks found.</p>
        )}
        {tracks.length > 0 && <p>Select a result, then press play.</p>}
      </div>

      <ul className={styles.results}>
        {tracks.map((track) => (
          <li key={track.id}>
            <button
              aria-current={playing?.id === track.id}
              className={styles.result}
              onClick={() => loadTrack(track)}
              type="button"
            >
              {track.artworkUrl ? (
                <img alt="" height={52} src={track.artworkUrl} width={52} />
              ) : (
                <span className={styles.placeholder} aria-hidden="true" />
              )}
              <span className={styles.resultText}>
                <strong>{track.title}</strong>
                <span>{artistLabel(track)}</span>
              </span>
              <span className={styles.loadLabel}>
                Load
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function artistLabel(track: Track) {
  return track.artists.map((artist) => artist.name).join(', ') || 'Unknown artist';
}

function apiError(payload: ErrorPayload, fallback: string) {
  return payload.message ?? payload.error ?? fallback;
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.';
}
