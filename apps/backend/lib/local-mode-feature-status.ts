export const LOCAL_RUNTIME_URL = 'http://127.0.0.1:3939';
export const INSTALL_ORIGIN = 'https://install.spice-app.xyz';
export const CLOUD_ORIGIN = 'https://music.spice-app.xyz';

export const localModeLanes = [
  {
    name: 'Local PC runtime',
    owner: 'User device',
    status: 'Required',
    scope: 'Media search, scraping, stream extraction, lyrics, proxying, playback UI',
  },
  {
    name: 'Vercel cloud portal',
    owner: 'SPICE cloud',
    status: 'Thin control plane',
    scope: 'Auth, sync routing, metadata, feedback, install page, update manifest',
  },
  {
    name: 'Cloud database',
    owner: 'SPICE cloud',
    status: 'Cloud only',
    scope: 'Accounts, profiles, sync state, operator-only admin data',
  },
] as const;

export const localModeFeatureStatus = [
  {
    feature: 'Hosted web media scraping',
    status: 'Removed from Vercel',
    reason: 'Provider scraping and stream extraction are heavy, brittle serverless work.',
    replacement: 'Local runtime routes under /api/local/* on 127.0.0.1:3939.',
  },
  {
    feature: 'Direct hosted SPICE Music player',
    status: 'Replaced',
    reason: 'The hosted page is now the cloud control plane, not the heavy media runtime.',
    replacement: 'Install or open the local PC runtime; hosted builds use /api/* and local builds proxy cloud calls through /api/cloud/*.',
  },
  {
    feature: 'Home, Anime, Movie navigation inside the local app',
    status: 'Hidden and frozen',
    reason: 'The active product focus is local SPICE Music plus cloud account services.',
    replacement: 'Source history stays intact; shelved routes show frozen placeholders.',
  },
  {
    feature: 'Spice Anime and Spice Movie starter surfaces',
    status: 'Shelved',
    reason: 'Those services would add cloud and provider load while the local split stabilizes.',
    replacement: 'Kept in source, removed from active discovery and launch flows.',
  },
  {
    feature: 'Raw provider API strings in the client',
    status: 'Retired',
    reason: 'Runtime routing must be explicit so local-only work cannot drift back to Vercel.',
    replacement: 'A single client API helper chooses hosted /api/*, local media /api/local/*, or the local cloud proxy /api/cloud/*.',
  },
  {
    feature: 'Local JSON feedback writes',
    status: 'Replaced',
    reason: 'Vercel functions cannot depend on writable local files.',
    replacement: 'Feedback uses private cloud handling when configured, with log-only fallback.',
  },
  {
    feature: 'Cloud database code and secrets in local ZIPs',
    status: 'Blocked',
    reason: 'Local installs must not ship database credentials, database clients, or migrations.',
    replacement: 'Database env stays in Vercel; package scans verify the local bundle.',
  },
] as const;

export const localModeOptionalFeatureStatus = [
  {
    feature: 'Local install and update manager',
    status: 'Keep local-first',
    reason: 'Install, update, start, and open-local actions should be easy for users without adding serverless load.',
    operatingRule: 'Use the public update manifest and run all install/update work on the user PC.',
  },
  {
    feature: 'Floating mini player, queue polish, themes, and local profile UX',
    status: 'Keep local-first',
    reason: 'These are mostly UI or local-storage conveniences and do not pressure Vercel or the cloud database during normal local playback.',
    operatingRule: 'Keep them inside the local runtime unless the user explicitly signs in or syncs.',
  },
  {
    feature: 'Last.fm and ListenBrainz profile sync',
    status: 'Keep opt-in',
    reason: 'They are profile update integrations, not playable search providers, and failures should never block playback.',
    operatingRule: 'Send only now-playing and scrobble-threshold writes; keep provider credentials in cloud env or account storage.',
  },
  {
    feature: 'Spice Connect remote device control',
    status: 'Keep cost-gated',
    reason: 'Same-account remote control is useful, but it uses cloud device state and queued commands.',
    operatingRule: 'Use stale-command expiry, polling backoff, same-account checks, and emergency austerity controls if traffic spikes.',
  },
  {
    feature: 'Shared playlists and notification requests',
    status: 'Keep account-backed',
    reason: 'Collaboration is a real account feature, but it should not be required for local-only playback.',
    operatingRule: 'Batch database reads, avoid polling storms, and sync only for signed-in users.',
  },
  {
    feature: 'Listen Together sessions',
    status: 'Limit and monitor',
    reason: 'Realtime session state is heavier than normal sync and can create avoidable cloud/database churn.',
    operatingRule: 'Keep sessions opt-in, clean up inactive listeners quickly, and pause this lane first during cost emergencies.',
  },
  {
    feature: 'Discord Rich Presence backend route',
    status: 'Keep removed',
    reason: 'The backend RPC path was scrapped and does not belong in the Vercel control plane.',
    operatingRule: 'If it returns, implement it as Electron or local-runtime-only desktop integration with no cloud API path.',
  },
] as const;
