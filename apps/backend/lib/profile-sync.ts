export function mergeSongsPlayedCount(
  localCount: unknown,
  remoteCount: unknown,
  syncedHistoryCount: unknown = 0,
) {
  return Math.max(
    normalizeCount(localCount),
    normalizeCount(remoteCount),
    normalizeCount(syncedHistoryCount),
  );
}

function normalizeCount(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}
