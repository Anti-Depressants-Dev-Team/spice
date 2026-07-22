export function mergePlaylistOccurrences<T>(
  preferred: T[],
  incoming: T[],
  keyOf: (item: T) => string,
  merge: (preferredItem: T, incomingItem: T) => T,
) {
  const merged = [...preferred];
  const preferredIndexes = new Map<string, number[]>();
  merged.forEach((item, index) => {
    const key = keyOf(item);
    preferredIndexes.set(key, [...(preferredIndexes.get(key) ?? []), index]);
  });

  const incomingOccurrences = new Map<string, number>();
  for (const item of incoming) {
    const key = keyOf(item);
    const occurrence = incomingOccurrences.get(key) ?? 0;
    incomingOccurrences.set(key, occurrence + 1);
    const preferredIndex = preferredIndexes.get(key)?.[occurrence];
    if (preferredIndex === undefined) {
      merged.push(item);
    } else {
      merged[preferredIndex] = merge(merged[preferredIndex], item);
    }
  }
  return merged;
}
