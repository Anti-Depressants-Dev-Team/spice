export const DEFAULT_PROFILE_DISPLAY_NAME = 'Spice Listener';

export function mergeProfileDisplayName(
  localName: unknown,
  remoteName: unknown,
  accountUsername: unknown,
) {
  const local = readText(localName);
  const remote = readText(remoteName);
  const username = readText(accountUsername)?.replace(/^@+/, '');

  if (remote && !isDefaultProfileDisplayName(remote)) return remote;
  if (local && !isDefaultProfileDisplayName(local)) return local;
  return username || remote || local || DEFAULT_PROFILE_DISPLAY_NAME;
}

export function mergeProfileUsername(
  remoteUsername: unknown,
  localUsername: unknown,
  accountUsername: unknown,
  allowAccountFallback: boolean,
) {
  const remote = readUsername(remoteUsername);
  const local = readUsername(localUsername);
  if (remote) return remote;
  if (local) return local;
  return allowAccountFallback ? readUsername(accountUsername) : null;
}

export function mergeProfileAvatarUrl(
  localAvatarUrl: unknown,
  remoteAvatarUrl: unknown,
  remoteDisplayName: unknown,
) {
  const remote = readText(remoteAvatarUrl);
  if (remote) return remote;

  // A default cloud identity has never supplied meaningful profile data.
  // Preserve a local avatar so the bootstrap sync can upload it instead.
  if (isDefaultProfileDisplayName(remoteDisplayName)) {
    return readText(localAvatarUrl) || undefined;
  }

  return undefined;
}

export function isDefaultProfileDisplayName(value: unknown) {
  const name = readText(value);
  return !name || name.toLowerCase() === DEFAULT_PROFILE_DISPLAY_NAME.toLowerCase();
}

function readText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readUsername(value: unknown) {
  return readText(value)?.replace(/^@+/, '') || null;
}
