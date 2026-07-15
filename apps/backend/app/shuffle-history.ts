export interface ShuffleHistoryState {
  queueKeys: string[];
  sequence: number[];
  cursor: number;
  cycleVisited: number[];
}

export interface ShuffleHistoryStep {
  state: ShuffleHistoryState;
  index: number | null;
  fromHistory: boolean;
}

interface ShuffleNextOptions {
  random?: () => number;
  wrap?: boolean;
}

const validIndex = (index: number, queueLength: number) => (
  Number.isInteger(index) && index >= 0 && index < queueLength
);

const sameQueueOrPrefixExtension = (previous: string[], next: string[]) => (
  previous.length <= next.length
  && previous.every((key, index) => key === next[index])
);

export function resetShuffleHistory(
  queueKeys: string[],
  currentIndex: number,
): ShuffleHistoryState {
  const safeIndex = validIndex(currentIndex, queueKeys.length) ? currentIndex : 0;
  const hasTrack = queueKeys.length > 0;
  return {
    queueKeys: [...queueKeys],
    sequence: hasTrack ? [safeIndex] : [],
    cursor: hasTrack ? 0 : -1,
    cycleVisited: hasTrack ? [safeIndex] : [],
  };
}

export function alignShuffleHistory(
  state: ShuffleHistoryState | null,
  queueKeys: string[],
  currentIndex: number,
): ShuffleHistoryState {
  if (
    !state
    || !sameQueueOrPrefixExtension(state.queueKeys, queueKeys)
    || !validIndex(currentIndex, queueKeys.length)
    || state.sequence[state.cursor] !== currentIndex
  ) {
    return resetShuffleHistory(queueKeys, currentIndex);
  }

  return {
    ...state,
    queueKeys: [...queueKeys],
    sequence: state.sequence.filter((index) => validIndex(index, queueKeys.length)),
    cycleVisited: state.cycleVisited.filter((index) => validIndex(index, queueKeys.length)),
  };
}

export function previousShuffleTrack(
  state: ShuffleHistoryState | null,
  queueKeys: string[],
  currentIndex: number,
): ShuffleHistoryStep {
  const aligned = alignShuffleHistory(state, queueKeys, currentIndex);
  if (aligned.cursor <= 0) {
    return { state: aligned, index: null, fromHistory: false };
  }

  const cursor = aligned.cursor - 1;
  return {
    state: { ...aligned, cursor },
    index: aligned.sequence[cursor] ?? null,
    fromHistory: true,
  };
}

export function nextShuffleTrack(
  state: ShuffleHistoryState | null,
  queueKeys: string[],
  currentIndex: number,
  options: ShuffleNextOptions = {},
): ShuffleHistoryStep {
  const aligned = alignShuffleHistory(state, queueKeys, currentIndex);
  if (aligned.cursor >= 0 && aligned.cursor < aligned.sequence.length - 1) {
    const cursor = aligned.cursor + 1;
    return {
      state: { ...aligned, cursor },
      index: aligned.sequence[cursor] ?? null,
      fromHistory: true,
    };
  }

  if (queueKeys.length === 0) {
    return { state: aligned, index: null, fromHistory: false };
  }

  let cycleVisited = [...aligned.cycleVisited];
  let visited = new Set(cycleVisited);
  let candidates = queueKeys
    .map((_, index) => index)
    .filter((index) => !visited.has(index));

  if (candidates.length === 0) {
    if (!options.wrap) {
      return { state: aligned, index: null, fromHistory: false };
    }
    cycleVisited = validIndex(currentIndex, queueKeys.length) ? [currentIndex] : [];
    visited = new Set(cycleVisited);
    candidates = queueKeys
      .map((_, index) => index)
      .filter((index) => !visited.has(index));
    if (candidates.length === 0) {
      return {
        state: { ...aligned, cycleVisited },
        index: validIndex(currentIndex, queueKeys.length) ? currentIndex : null,
        fromHistory: false,
      };
    }
  }

  const random = options.random ?? Math.random;
  const sample = Math.min(0.999999999, Math.max(0, random()));
  const nextIndex = candidates[Math.floor(sample * candidates.length)];
  const sequence = [...aligned.sequence.slice(0, aligned.cursor + 1), nextIndex];
  const cursor = sequence.length - 1;

  return {
    state: {
      queueKeys: [...queueKeys],
      sequence,
      cursor,
      cycleVisited: [...cycleVisited, nextIndex],
    },
    index: nextIndex,
    fromHistory: false,
  };
}
