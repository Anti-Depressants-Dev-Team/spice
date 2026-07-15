const LISTEN_TOGETHER_SCHEMA_ERROR_CODES = new Set([
  '42P01', // undefined_table
  '42P10', // invalid_column_reference (including a missing ON CONFLICT index)
  '42703', // undefined_column
]);

export interface ListenTogetherSessionFailure {
  error: 'listen_together_schema_unavailable' | 'session_creation_failed';
  message: string;
  status: 500 | 503;
  databaseCode: string | null;
}

export function databaseErrorCode(error: unknown): string | null {
  const seen = new Set<object>();
  let current = error;

  for (let depth = 0; depth < 8; depth += 1) {
    if (!current || typeof current !== 'object' || seen.has(current)) return null;
    seen.add(current);

    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string' && candidate.code.trim()) {
      return candidate.code.trim().toUpperCase();
    }
    current = candidate.cause;
  }

  return null;
}

export function classifyListenTogetherSessionFailure(
  error: unknown,
): ListenTogetherSessionFailure {
  const databaseCode = databaseErrorCode(error);
  if (databaseCode && LISTEN_TOGETHER_SCHEMA_ERROR_CODES.has(databaseCode)) {
    return {
      error: 'listen_together_schema_unavailable',
      message: 'Listen Together is temporarily unavailable while its database update finishes. Please try again shortly.',
      status: 503,
      databaseCode,
    };
  }

  return {
    error: 'session_creation_failed',
    message: 'Listen Together could not start right now. Please try again.',
    status: 500,
    databaseCode,
  };
}
