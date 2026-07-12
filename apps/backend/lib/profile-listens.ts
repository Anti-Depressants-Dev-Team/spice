export interface LastFmProviderRequest {
  sessionKey?: string;
}

export interface ListenBrainzProviderRequest {
  token?: string;
}

export interface LastFmAccountConnection {
  sessionKey: string;
}

export interface ListenBrainzAccountConnection {
  token: string;
}

interface ResolveLastFmSessionKeyInput {
  provider?: LastFmProviderRequest;
  databaseConfigured: boolean;
  getSessionUserId: () => Promise<string | null>;
  getConnection: (userId: string) => Promise<LastFmAccountConnection | null>;
}

export async function resolveLastFmSessionKey({
  provider,
  databaseConfigured,
  getSessionUserId,
  getConnection,
}: ResolveLastFmSessionKeyInput) {
  const directSessionKey = provider?.sessionKey?.trim();
  if (directSessionKey) return directSessionKey;

  if (!provider || !databaseConfigured) return undefined;

  const userId = await getSessionUserId();
  if (!userId) return undefined;

  return (await getConnection(userId))?.sessionKey;
}

interface ResolveListenBrainzTokenInput {
  provider?: ListenBrainzProviderRequest;
  databaseConfigured: boolean;
  getSessionUserId: () => Promise<string | null>;
  getConnection: (userId: string) => Promise<ListenBrainzAccountConnection | null>;
}

export async function resolveListenBrainzToken({
  provider,
  databaseConfigured,
  getSessionUserId,
  getConnection,
}: ResolveListenBrainzTokenInput) {
  const directToken = provider?.token?.trim();
  if (directToken) return directToken;

  if (!provider || !databaseConfigured) return undefined;

  const userId = await getSessionUserId();
  if (!userId) return undefined;

  return (await getConnection(userId))?.token;
}
