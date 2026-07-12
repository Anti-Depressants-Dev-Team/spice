const AUDIO_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'video/mp4': 'm4a',
  'video/webm': 'webm',
};

const AUDIO_EXTENSION_BY_CONTAINER: Record<string, string> = {
  aac: 'aac',
  m4a: 'm4a',
  mp3: 'mp3',
  mp4: 'm4a',
  mpeg: 'mp3',
  ogg: 'ogg',
  opus: 'opus',
  webm: 'webm',
};

export function audioDownloadExtension(contentType?: string | null, fallbackContainer?: string | null) {
  const normalizedContentType = normalizeMimeType(contentType);
  if (normalizedContentType && AUDIO_EXTENSION_BY_CONTENT_TYPE[normalizedContentType]) {
    return AUDIO_EXTENSION_BY_CONTENT_TYPE[normalizedContentType];
  }

  const normalizedContainer = normalizeContainer(fallbackContainer);
  if (normalizedContainer && AUDIO_EXTENSION_BY_CONTAINER[normalizedContainer]) {
    return AUDIO_EXTENSION_BY_CONTAINER[normalizedContainer];
  }

  return 'm4a';
}

export function audioContentDisposition(title: string | null | undefined, extension: string) {
  const safeExtension = normalizeContainer(extension) || 'm4a';
  const safeTitle = title?.trim() || 'audio';
  const asciiTitle = safeTitle.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'audio';
  return `attachment; filename="${asciiTitle}.${safeExtension}"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.${safeExtension}`;
}

function normalizeMimeType(value?: string | null) {
  return value?.split(';')[0]?.trim().toLowerCase() || '';
}

function normalizeContainer(value?: string | null) {
  return value?.trim().toLowerCase().replace(/^\./, '').replace(/[^a-z0-9]/g, '') || '';
}
