export const LISTEN_TOGETHER_MAX_QUEUE_ITEMS = 80;
export const LISTEN_TOGETHER_MAX_MEDIA_MS = 24 * 60 * 60 * 1000;
export const LISTEN_TOGETHER_ACTIVE_WINDOW_MS = 120_000;
export const LISTEN_TOGETHER_DRIFT_TOLERANCE_MS = 1_500;

export type ListenTogetherRepeatMode = 'none' | 'all' | 'one';

export interface ListenTogetherTrack {
  id: string;
  sourceId?: string;
  [key: string]: unknown;
}

export interface ListenTogetherHostState {
  currentTrack: ListenTogetherTrack | null;
  queue: ListenTogetherTrack[];
  queueIndex: number;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: ListenTogetherRepeatMode;
  progressMs: number;
  durationMs: number;
}

interface StoredQueueEnvelope {
  version: 2;
  queue: ListenTogetherTrack[];
  shuffleEnabled: boolean;
  repeatMode: ListenTogetherRepeatMode;
}

const boundedInteger = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
};

const serializableTrack = (value: unknown): ListenTogetherTrack | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = typeof (value as { id?: unknown }).id === 'string'
    ? (value as { id: string }).id.trim()
    : '';
  if (!id || id === 'placeholder' || id === 'spice-connect-placeholder') return null;

  try {
    const clone = JSON.parse(JSON.stringify(value)) as ListenTogetherTrack;
    return clone && typeof clone === 'object' && clone.id === id ? clone : null;
  } catch {
    return null;
  }
};

export function normalizeListenTogetherRepeatMode(value: unknown): ListenTogetherRepeatMode {
  return value === 'all' || value === 'one' ? value : 'none';
}

export function normalizeListenTogetherHostState(input: Record<string, unknown>): ListenTogetherHostState {
  const currentTrack = serializableTrack(input.currentTrack);
  const queue = (Array.isArray(input.queue) ? input.queue : [])
    .slice(0, LISTEN_TOGETHER_MAX_QUEUE_ITEMS)
    .map(serializableTrack)
    .filter((track): track is ListenTogetherTrack => track !== null);
  const normalizedQueue = currentTrack && !queue.some((track) => (
    listenTogetherTrackKey(track) === listenTogetherTrackKey(currentTrack)
  ))
    ? [currentTrack, ...queue].slice(0, LISTEN_TOGETHER_MAX_QUEUE_ITEMS)
    : queue;
  const matchingTrackIndex = currentTrack
    ? normalizedQueue.findIndex((track) => listenTogetherTrackKey(track) === listenTogetherTrackKey(currentTrack))
    : -1;
  const requestedQueueIndex = boundedInteger(
    input.queueIndex,
    matchingTrackIndex >= 0 ? matchingTrackIndex : 0,
    0,
    Math.max(0, normalizedQueue.length - 1),
  );
  const queueIndex = matchingTrackIndex >= 0 && (
    !normalizedQueue[requestedQueueIndex]
    || listenTogetherTrackKey(normalizedQueue[requestedQueueIndex]) !== listenTogetherTrackKey(currentTrack!)
  )
    ? matchingTrackIndex
    : requestedQueueIndex;
  const durationMs = boundedInteger(input.durationMs, 0, 0, LISTEN_TOGETHER_MAX_MEDIA_MS);
  const progressMs = boundedInteger(
    input.progressMs,
    0,
    0,
    durationMs || LISTEN_TOGETHER_MAX_MEDIA_MS,
  );

  return {
    currentTrack,
    queue: normalizedQueue,
    queueIndex,
    isPlaying: Boolean(input.isPlaying && currentTrack),
    shuffleEnabled: input.shuffleEnabled === true,
    repeatMode: normalizeListenTogetherRepeatMode(input.repeatMode),
    progressMs,
    durationMs,
  };
}

export function serializeListenTogetherQueueState(state: Pick<
  ListenTogetherHostState,
  'queue' | 'shuffleEnabled' | 'repeatMode'
>) {
  const envelope: StoredQueueEnvelope = {
    version: 2,
    queue: state.queue,
    shuffleEnabled: state.shuffleEnabled,
    repeatMode: state.repeatMode,
  };
  return JSON.stringify(envelope);
}

export function parseListenTogetherTrack(value: string | null) {
  if (!value) return null;
  try {
    return serializableTrack(JSON.parse(value));
  } catch {
    return null;
  }
}

export function parseListenTogetherQueueState(value: string | null): Pick<
  ListenTogetherHostState,
  'queue' | 'shuffleEnabled' | 'repeatMode'
> {
  if (!value) return { queue: [], shuffleEnabled: false, repeatMode: 'none' };
  try {
    const parsed = JSON.parse(value) as unknown;
    const envelope = Array.isArray(parsed)
      ? { queue: parsed, shuffleEnabled: false, repeatMode: 'none' }
      : parsed as Partial<StoredQueueEnvelope>;
    const queue = (Array.isArray(envelope?.queue) ? envelope.queue : [])
      .slice(0, LISTEN_TOGETHER_MAX_QUEUE_ITEMS)
      .map(serializableTrack)
      .filter((track): track is ListenTogetherTrack => track !== null);
    return {
      queue,
      shuffleEnabled: envelope?.shuffleEnabled === true,
      repeatMode: normalizeListenTogetherRepeatMode(envelope?.repeatMode),
    };
  } catch {
    return { queue: [], shuffleEnabled: false, repeatMode: 'none' };
  }
}

export function projectListenTogetherProgressMs({
  progressMs,
  durationMs,
  isPlaying,
  updatedAt,
  now = Date.now(),
}: {
  progressMs: unknown;
  durationMs: unknown;
  isPlaying: boolean;
  updatedAt: Date | string | number;
  now?: Date | number;
}) {
  const duration = boundedInteger(durationMs, 0, 0, LISTEN_TOGETHER_MAX_MEDIA_MS);
  const progress = boundedInteger(progressMs, 0, 0, duration || LISTEN_TOGETHER_MAX_MEDIA_MS);
  if (!isPlaying) return progress;

  const updatedAtMs = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  const nowMs = now instanceof Date ? now.getTime() : now;
  const elapsed = Number.isFinite(updatedAtMs) && Number.isFinite(nowMs)
    ? Math.max(0, Math.min(LISTEN_TOGETHER_ACTIVE_WINDOW_MS, nowMs - updatedAtMs))
    : 0;
  return Math.min(duration || LISTEN_TOGETHER_MAX_MEDIA_MS, progress + Math.round(elapsed));
}

export function isListenTogetherSessionActive(
  updatedAt: Date | string | number,
  now: Date | number = Date.now(),
) {
  const updatedAtMs = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  const nowMs = now instanceof Date ? now.getTime() : now;
  const age = nowMs - updatedAtMs;
  return Number.isFinite(age) && age >= 0 && age <= LISTEN_TOGETHER_ACTIVE_WINDOW_MS;
}

export function listenTogetherTrackKey(track: { id?: unknown; sourceId?: unknown } | null | undefined) {
  if (!track || typeof track.id !== 'string') return '';
  const sourceId = typeof track.sourceId === 'string' && track.sourceId.trim()
    ? track.sourceId.trim()
    : 'youtube_music';
  return `${sourceId}:${track.id.trim()}`.toLocaleLowerCase();
}

export function listenTogetherNeedsSeek(localProgressSeconds: number, targetProgressMs: number) {
  if (!Number.isFinite(localProgressSeconds) || !Number.isFinite(targetProgressMs)) return false;
  return Math.abs(localProgressSeconds * 1000 - targetProgressMs) > LISTEN_TOGETHER_DRIFT_TOLERANCE_MS;
}

export function listenTogetherApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fallback;
  const message = (payload as { message?: unknown }).message;
  if (typeof message !== 'string') return fallback;
  const normalized = message.trim();
  return normalized ? normalized.slice(0, 240) : fallback;
}
