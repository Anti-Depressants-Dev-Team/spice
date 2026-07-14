export type ProfileListenType = 'playing_now' | 'scrobble';
export type ProfileListenProvider = 'lastfm' | 'listenbrainz';

export interface ProfileProviderDeliveryState {
  attempts: number;
  pending: boolean;
  retryAt: number;
  sent: boolean;
}

export interface ProfileListenDeliveryState {
  trackKey: string;
  startedAt: number;
  playing_now: Record<ProfileListenProvider, ProfileProviderDeliveryState>;
  scrobble: Record<ProfileListenProvider, ProfileProviderDeliveryState>;
}

const MAX_PROFILE_DELIVERY_ATTEMPTS = 3;
const PROFILE_DELIVERY_RETRY_DELAYS_MS = [5_000, 15_000] as const;

export function createProfileListenDeliveryState(
  trackKey: string,
  startedAt: number,
): ProfileListenDeliveryState {
  return {
    trackKey,
    startedAt,
    playing_now: createProviderStates(),
    scrobble: createProviderStates(),
  };
}

export function beginProfileListenDelivery(
  state: ProfileListenDeliveryState,
  type: ProfileListenType,
  providers: ProfileListenProvider[],
  now = Date.now(),
) {
  const started: ProfileListenProvider[] = [];

  for (const provider of providers) {
    const delivery = state[type][provider];
    if (
      delivery.sent
      || delivery.pending
      || delivery.attempts >= MAX_PROFILE_DELIVERY_ATTEMPTS
      || now < delivery.retryAt
    ) {
      continue;
    }

    delivery.attempts += 1;
    delivery.pending = true;
    started.push(provider);
  }

  return started;
}

export function finishProfileListenDelivery(
  state: ProfileListenDeliveryState,
  type: ProfileListenType,
  results: Partial<Record<ProfileListenProvider, boolean>>,
  now = Date.now(),
) {
  for (const provider of Object.keys(results) as ProfileListenProvider[]) {
    const delivery = state[type][provider];
    delivery.pending = false;

    if (results[provider] === true) {
      delivery.sent = true;
      delivery.retryAt = 0;
      continue;
    }

    const retryDelay = PROFILE_DELIVERY_RETRY_DELAYS_MS[delivery.attempts - 1];
    delivery.retryAt = retryDelay === undefined
      ? Number.POSITIVE_INFINITY
      : now + retryDelay;
  }
}

export function profileListenRetryDelayMs(
  state: ProfileListenDeliveryState,
  type: ProfileListenType,
  providers: ProfileListenProvider[],
  now = Date.now(),
) {
  const retryTimes = providers
    .map((provider) => state[type][provider])
    .filter((delivery) => !delivery.sent && !delivery.pending && Number.isFinite(delivery.retryAt))
    .map((delivery) => delivery.retryAt);

  if (retryTimes.length === 0) return null;
  return Math.max(0, Math.min(...retryTimes) - now);
}

function createProviderStates(): Record<ProfileListenProvider, ProfileProviderDeliveryState> {
  return {
    lastfm: createProviderState(),
    listenbrainz: createProviderState(),
  };
}

function createProviderState(): ProfileProviderDeliveryState {
  return {
    attempts: 0,
    pending: false,
    retryAt: 0,
    sent: false,
  };
}
