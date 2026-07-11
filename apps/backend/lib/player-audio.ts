export const STANDARD_PLAYER_VOLUME_MAX = 200;
export const BOOSTED_PLAYER_VOLUME_MAX = 1000;

export function normalizePlayerVolume(value: unknown, boosterAccepted: boolean) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return null;
  const maxVolume = boosterAccepted ? BOOSTED_PLAYER_VOLUME_MAX : STANDARD_PLAYER_VOLUME_MAX;
  return Math.max(0, Math.min(maxVolume, Math.round(numericValue)));
}

export function playerVolumeGain(volume: number) {
  return Math.max(0, Math.min(BOOSTED_PLAYER_VOLUME_MAX, volume)) / 100;
}

export function shouldUsePlayerGainPath(volume: number, boosterAccepted: boolean) {
  return boosterAccepted || volume > 100;
}

export function shouldUseProxyForBoost(volume: number, streamProtocol: string) {
  return volume > 100 && streamProtocol === 'embed';
}
