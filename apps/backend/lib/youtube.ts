import {
  Innertube,
  Platform,
  UniversalCache,
  type Misc,
  type Types,
  type YTNodes,
} from 'youtubei.js';

const sourceId = 'youtube_music';
const cache = new UniversalCache(false);

// Stream URL resolution executes the transformation script extracted from
// YouTube's player, as required by YouTube.js v17.
Platform.shim.eval = async (data: Types.BuildScriptResult) =>
  new Function(data.output)() as Types.EvalResult;

let innertubePromise: Promise<Innertube> | undefined;

export interface SpiceArtist {
  id: string;
  name: string;
  artworkUrl?: string;
}

export interface SpiceAlbum {
  id: string;
  title: string;
  artists: SpiceArtist[];
  artworkUrl?: string;
  year?: number;
}

export interface SpiceTrack {
  sourceId: string;
  id: string;
  title: string;
  artists: SpiceArtist[];
  album?: SpiceAlbum;
  durationMs?: number;
  artworkUrl?: string;
}

export interface SpiceStreamVariant {
  url: string;
  codec: string;
  bitrate: number;
  container: string;
  itag: number;
  expiresAt?: string;
}

export interface SpiceTrackDetails {
  track: SpiceTrack;
  streams: SpiceStreamVariant[];
}

export async function getYouTube() {
  innertubePromise ??= Innertube.create({
    cache,
    lang: 'en',
    location: 'US',
    retrieve_player: true,
  });
  return innertubePromise;
}

export async function searchTracks(query: string, limit: number, kind: string) {
  const yt = await getYouTube();
  const searchType = toMusicSearchType(kind);
  const search = await yt.music.search(query, { type: searchType });
  const shelves = [search.songs, search.videos].filter(Boolean);

  const tracks: SpiceTrack[] = [];
  const seen = new Set<string>();
  for (const shelf of shelves) {
    if (!shelf) continue;
    for (const item of shelf.contents) {
      const track = musicItemToTrack(item);
      if (!track || seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track);
      if (tracks.length >= limit) return tracks;
    }
  }
  return tracks;
}

// ---------------------------------------------------------------------------
// Stream resolution — uses mobile / alternative InnerTube clients that serve
// pre-decoded URLs without requiring PO (Proof of Origin) tokens.
//
// Order matters:
//   1. ANDROID_VR    — pre-decoded URLs, supports unrestricted seeking and direct playback
//   2. IOS           — pre-decoded URLs, historically reliable but CDN enforces chunk limits
//   3. ANDROID       — broad compatibility fallback
//
// The WEB / WEB_REMIX clients require PO tokens and are NOT used for streams.
// ---------------------------------------------------------------------------
const STREAM_CLIENTS: Types.InnerTubeClient[] = [
  'ANDROID_VR',
  'IOS',
  'ANDROID',
];

export async function getTrackDetails(id: string): Promise<SpiceTrackDetails> {
  const yt = await getYouTube();

  // Try each mobile client until we get usable audio streams.
  let lastError: Error | undefined;
  for (const client of STREAM_CLIENTS) {
    try {
      const details = await resolveWithClient(yt, id, client);
      if (details.streams.length > 0) return details;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next client.
    }
  }

  throw lastError ?? new Error('No audio streams found for this track.');
}

async function resolveWithClient(
  yt: Innertube,
  id: string,
  client: Types.InnerTubeClient,
): Promise<SpiceTrackDetails> {
  // Use the top-level getInfo (not music.getInfo) so we can specify client.
  const info = await yt.getInfo(id, { client });
  const formats = info.streaming_data?.adaptive_formats ?? [];
  const streams = (
    await Promise.all(
      formats
        .filter((format) => format.has_audio && !format.has_video)
        .map((format) => formatToStream(format, yt.session.player)),
    )
  )
    .filter((stream): stream is SpiceStreamVariant => stream !== null)
    .sort((a, b) => {
      // Prefer AAC/m4a for broadest browser/device compatibility.
      const aIsAac = a.codec.includes('mp4a') || a.container === 'mp4';
      const bIsAac = b.codec.includes('mp4a') || b.container === 'mp4';
      if (aIsAac !== bIsAac) return aIsAac ? -1 : 1;
      return b.bitrate - a.bitrate;
    });

  return {
    track: {
      sourceId,
      id,
      title: info.basic_info.title ?? 'Unknown track',
      artists: artistNameToList(info.basic_info.author),
      durationMs:
        info.basic_info.duration === undefined
          ? undefined
          : info.basic_info.duration * 1000,
      artworkUrl: bestThumbnailUrl(info.basic_info.thumbnail),
    },
    streams,
  };
}

function toMusicSearchType(kind: string): Types.MusicSearchType {
  return kind === 'videos' ? 'video' : 'song';
}

function musicItemToTrack(item: YTNodes.MusicResponsiveListItem): SpiceTrack | null {
  if (item.item_type !== 'song' && item.item_type !== 'video') return null;
  if (!item.id || !item.title) return null;

  const artists =
    item.artists?.map((artist) => ({
      id: artist.channel_id ?? artist.name,
      name: artist.name,
    })) ??
    item.authors?.map((author) => ({
      id: author.channel_id ?? author.name,
      name: author.name,
    })) ??
    [];

  return {
    sourceId,
    id: item.id,
    title: item.title,
    artists,
    album: item.album
      ? {
          id: item.album.id ?? item.album.name,
          title: item.album.name,
          artists,
        }
      : undefined,
    durationMs:
      item.duration?.seconds === undefined
        ? undefined
        : item.duration.seconds * 1000,
    artworkUrl: bestThumbnailUrl(item.thumbnails),
  };
}

async function formatToStream(
  format: Misc.Format,
  player: Parameters<Misc.Format['decipher']>[0],
): Promise<SpiceStreamVariant | null> {
  const url = await format.decipher(player);
  if (!url) return null;

  const parsed = parseMimeType(format.mime_type);
  return {
    url,
    codec: parsed.codec,
    bitrate: format.average_bitrate ?? format.bitrate,
    container: parsed.container,
    itag: format.itag,
  };
}

function parseMimeType(mimeType: string) {
  const media = mimeType.match(/^[^/]+\/([^;]+)/);
  const codec = mimeType.match(/codecs="([^"]+)"/);
  return {
    container: media?.[1] ?? 'unknown',
    codec: codec?.[1] ?? 'unknown',
  };
}

function bestThumbnailUrl(
  thumbnails: { url: string; width?: number; height?: number }[] | undefined,
) {
  return thumbnails
    ?.slice()
    .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))
    .at(0)?.url;
}

function artistNameToList(name: string | undefined): SpiceArtist[] {
  if (!name) return [];
  return [{ id: name, name }];
}
