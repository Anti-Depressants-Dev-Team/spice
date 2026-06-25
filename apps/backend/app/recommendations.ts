export interface RecommendationArtist {
  id?: string;
  name: string;
  artworkUrl?: string;
}

export interface RecommendationAlbum {
  id?: string;
  title: string;
  artists?: RecommendationArtist[];
  artworkUrl?: string;
  year?: number;
}

export interface RecommendationTrack {
  id: string;
  title: string;
  artists: RecommendationArtist[];
  album?: RecommendationAlbum;
  durationMs?: number;
  artworkUrl?: string;
  sourceId?: string;
  previewOnly?: boolean;
}

export interface RecommendationPlaylist<TTrack extends RecommendationTrack = RecommendationTrack> {
  tracks: TTrack[];
}

export interface TasteSignal {
  id: string;
  label: string;
  score: number;
  count: number;
}

export interface TasteProfile {
  artists: TasteSignal[];
  languages: TasteSignal[];
  trackIds: Set<string>;
  totalSignals: number;
}

export interface RecommendationSeed {
  id: string;
  label: string;
  query: string;
  reason: string;
  weight: number;
  kind: 'artist' | 'language';
}

export interface SeededRecommendationResult<TTrack extends RecommendationTrack = RecommendationTrack> {
  seed: RecommendationSeed;
  tracks: TTrack[];
}

interface ScoreBucket {
  label: string;
  score: number;
  count: number;
}

const MAX_ARTIST_SEEDS = 3;
const MAX_LANGUAGE_SEEDS = 2;

const LANGUAGE_HINTS = [
  {
    id: 'italian',
    label: 'Italian',
    query: 'italian songs',
    tokens: [
      'amore',
      'bella',
      'ciao',
      'cuore',
      'notte',
      'sole',
      'mare',
      'vita',
      'volare',
      'ragazza',
      'ragazzo',
      'italiano',
      'italiana',
      'sempre',
      'perche',
      'canzone',
      'musica',
      'senza',
      'dove',
      'sono',
      'sei',
      'del',
      'della',
    ],
  },
  {
    id: 'spanish',
    label: 'Spanish',
    query: 'spanish songs',
    tokens: [
      'amor',
      'corazon',
      'noche',
      'vida',
      'baila',
      'bailando',
      'contigo',
      'quiero',
      'donde',
      'para',
      'porque',
      'cancion',
      'musica',
      'eres',
      'soy',
    ],
  },
  {
    id: 'romanian',
    label: 'Romanian',
    query: 'romanian songs',
    tokens: [
      'iubire',
      'inima',
      'noapte',
      'viata',
      'dor',
      'fata',
      'baiat',
      'roman',
      'romania',
      'acasa',
      'lume',
      'unde',
      'sunt',
      'esti',
    ],
  },
  {
    id: 'french',
    label: 'French',
    query: 'french songs',
    tokens: [
      'amour',
      'coeur',
      'nuit',
      'vie',
      'bonjour',
      'danse',
      'avec',
      'pourquoi',
      'toujours',
      'chanson',
      'musique',
      'sans',
      'mon',
      'ma',
      'tes',
    ],
  },
  {
    id: 'korean',
    label: 'Korean',
    query: 'korean songs',
    tokens: ['kpop', 'k-pop', 'korean', 'hangul'],
  },
  {
    id: 'japanese',
    label: 'Japanese',
    query: 'japanese songs',
    tokens: ['jpop', 'j-pop', 'japanese', 'anime'],
  },
];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeKey = (value: string) =>
  normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();

const trackKey = (track: RecommendationTrack) =>
  `${track.sourceId ?? 'youtube_music'}:${track.id}`;

const trackTitleArtistKey = (track: RecommendationTrack) =>
  normalizeKey(`${track.title} ${track.artists.map((artist) => artist.name).join(' ')}`);

const addScore = (
  buckets: Map<string, ScoreBucket>,
  id: string,
  label: string,
  score: number,
) => {
  const existing = buckets.get(id);
  if (existing) {
    existing.score += score;
    existing.count += 1;
    return;
  }

  buckets.set(id, { label, score, count: 1 });
};

const sortedSignals = (buckets: Map<string, ScoreBucket>) =>
  Array.from(buckets.entries())
    .map(([id, bucket]) => ({ id, ...bucket }))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));


const trackLanguageTokens = (track: RecommendationTrack) => {
  const normalized = normalizeText([
    track.title,
    track.album?.title,
    ...track.artists.map((artist) => artist.name),
  ].filter(Boolean).join(' '));
  return new Set(normalized.split(/[^a-z0-9-]+/).filter(Boolean));
};

const languageScore = (tokens: Set<string>, language: typeof LANGUAGE_HINTS[number]) => {
  let score = 0;
  for (const token of language.tokens) {
    if (tokens.has(token)) score += 1;
  }

  return score;
};

export function buildPrivateTasteProfile<TTrack extends RecommendationTrack>({
  history,
  likedTracks,
  playlists,
}: {
  history: TTrack[];
  likedTracks: TTrack[];
  playlists: RecommendationPlaylist<TTrack>[];
}): TasteProfile {
  const artists = new Map<string, ScoreBucket>();
  const languages = new Map<string, ScoreBucket>();
  const trackIds = new Set<string>();
  let totalSignals = 0;

  const collect = (track: TTrack, baseWeight: number, recencyBonus = 0) => {
    if (!track?.id || track.id === 'placeholder') return;

    const weight = baseWeight + recencyBonus;
    trackIds.add(trackKey(track));
    totalSignals += weight;

    for (const artist of track.artists || []) {
      const label = artist.name?.trim();
      if (!label) continue;
      addScore(artists, normalizeKey(label), label, weight);
    }

    const tokens = trackLanguageTokens(track);
    for (const language of LANGUAGE_HINTS) {
      const score = languageScore(tokens, language);
      if (score >= 2) {
        addScore(languages, language.id, language.label, weight * score);
      }
    }
  };

  history.slice(0, 40).forEach((track, index) => {
    const recencyBonus = Math.max(0, 1.5 - index * 0.05);
    collect(track, 2.2, recencyBonus);
  });

  likedTracks.forEach((track) => collect(track, 3));

  playlists.forEach((playlist) => {
    playlist.tracks.forEach((track) => collect(track, 1.4));
  });

  return {
    artists: sortedSignals(artists),
    languages: sortedSignals(languages),
    trackIds,
    totalSignals,
  };
}

export function buildRecommendationSeeds(
  profile: TasteProfile,
  maxSeeds = 5,
): RecommendationSeed[] {
  const seeds: RecommendationSeed[] = [];

  for (const artist of profile.artists.slice(0, MAX_ARTIST_SEEDS)) {
    if (artist.count < 2 && artist.score < 6) continue;
    seeds.push({
      id: `artist:${artist.id}`,
      kind: 'artist',
      label: `More from ${artist.label}`,
      query: `${artist.label} songs`,
      reason: `You play ${artist.label} often.`,
      weight: artist.score,
    });
  }

  for (const language of profile.languages.slice(0, MAX_LANGUAGE_SEEDS)) {
    if (language.score < 5 || language.count < 2) continue;
    const hint = LANGUAGE_HINTS.find((entry) => entry.id === language.id);
    if (!hint) continue;
    seeds.push({
      id: `language:${language.id}`,
      kind: 'language',
      label: `${language.label} songs`,
      query: hint.query,
      reason: `Your recent profile leans toward ${language.label.toLowerCase()} tracks.`,
      weight: language.score * 0.8,
    });
  }

  const seenQueries = new Set<string>();
  return seeds
    .sort((a, b) => b.weight - a.weight)
    .filter((seed) => {
      const key = normalizeKey(seed.query);
      if (seenQueries.has(key)) return false;
      seenQueries.add(key);
      return true;
    })
    .slice(0, maxSeeds);
}

export function rankRecommendedTracks<TTrack extends RecommendationTrack>(
  batches: SeededRecommendationResult<TTrack>[],
  profile: TasteProfile,
  options: {
    exclude?: RecommendationTrack[];
    limit?: number;
  } = {},
): TTrack[] {
  const excludedIds = new Set(profile.trackIds);
  const excludedTitles = new Set<string>();
  for (const track of options.exclude || []) {
    excludedIds.add(trackKey(track));
    excludedTitles.add(trackTitleArtistKey(track));
  }

  const topArtistScores = new Map(profile.artists.map((artist) => [artist.id, artist.score]));
  const scored = new Map<string, { track: TTrack; score: number }>();

  for (const batch of batches) {
    for (const track of batch.tracks) {
      if (!track?.id || track.id === 'placeholder' || track.previewOnly) continue;

      const idKey = trackKey(track);
      const titleKey = trackTitleArtistKey(track);
      if (excludedIds.has(idKey) || excludedTitles.has(titleKey)) continue;

      let score = batch.seed.weight;
      for (const artist of track.artists || []) {
        score += (topArtistScores.get(normalizeKey(artist.name)) || 0) * 0.75;
      }
      if (track.artworkUrl) score += 0.3;
      if (track.durationMs) score += 0.2;

      const existing = scored.get(titleKey);
      if (!existing || score > existing.score) {
        scored.set(titleKey, { track, score });
      }
    }
  }

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.track)
    .slice(0, options.limit ?? 12);
}
