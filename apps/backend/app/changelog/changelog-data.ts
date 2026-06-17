import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  ChangelogAccountRole,
  ChangelogAudience,
  ChangelogPayload,
  ServiceChangelog,
  ServiceChangelogEntry,
  ServiceChangelogSummary,
} from './changelog-types';

interface RawChangelogEntry {
  version: string;
  notes: string[];
}

const SERVICES: ServiceChangelogSummary[] = [
  {
    id: 'home',
    label: 'SPICE Home',
    description: 'Root domain, service launcher, changelog, and public routing updates.',
    audience: 'user',
  },
  {
    id: 'music',
    label: 'SPICE Music',
    description: 'Player, search, playlists, profile sync, lyrics, recommendations, and mobile polish.',
    audience: 'user',
  },
  {
    id: 'anime',
    label: 'Spice Anime',
    description: 'Anime starter surface, watch progress, featured shows, and release schedule work.',
    audience: 'user',
  },
  {
    id: 'connect',
    label: 'Spice Connect',
    description: 'Signed-in device discovery, receiver control, and cross-device playback commands.',
    audience: 'user',
  },
  {
    id: 'accounts',
    label: 'SPICE Accounts',
    description: 'Profiles, sign-in, provider links, cloud sync, subscriptions, and account services.',
    audience: 'user',
  },
  {
    id: 'admin',
    label: 'Admin Ops',
    description: 'Admin role, dashboard, backend operations, migrations, and account governance notes.',
    audience: 'admin',
  },
];

const SERVICE_BY_ID = new Map(SERVICES.map((service) => [service.id, service]));

export async function readWalkthrough() {
  return readFile(path.join(/* turbopackIgnore: true */ process.cwd(), '..', '..', 'walkthrough.md'), 'utf8');
}

export async function getChangelogPayload(accountRole: ChangelogAccountRole): Promise<ChangelogPayload> {
  return buildServiceChangelogPayload(parseChangelog(await readWalkthrough()), accountRole);
}

export function buildServiceChangelogPayload(
  rawEntries: RawChangelogEntry[],
  accountRole: ChangelogAccountRole,
): ChangelogPayload {
  const canViewAdmin = accountRole === 'admin';
  const visibleServices = SERVICES.filter((service) => service.audience === 'user' || canViewAdmin);
  const serviceEntries = new Map<string, Map<string, ServiceChangelogEntry>>();
  let latestVersion: string | null = null;
  let latestNote: string | null = null;

  for (const service of visibleServices) {
    serviceEntries.set(service.id, new Map());
  }

  for (const rawEntry of rawEntries) {
    for (const note of rawEntry.notes) {
      const noteAudience = classifyNoteAudience(note);
      if (noteAudience === 'admin' && !canViewAdmin) {
        continue;
      }

      const serviceIds = classifyNoteServices(note, noteAudience);
      const visibleServiceIds = serviceIds.filter((serviceId) => serviceEntries.has(serviceId));
      if (visibleServiceIds.length === 0) {
        continue;
      }

      latestVersion ??= rawEntry.version;
      latestNote ??= note;

      for (const serviceId of visibleServiceIds) {
        const versionEntries = serviceEntries.get(serviceId);
        if (!versionEntries) continue;

        const versionEntry = versionEntries.get(rawEntry.version) || {
          version: rawEntry.version,
          notes: [],
        };

        versionEntry.notes.push(note);
        versionEntries.set(rawEntry.version, versionEntry);
      }
    }
  }

  const services: ServiceChangelog[] = visibleServices
    .map((service) => ({
      ...service,
      entries: Array.from(serviceEntries.get(service.id)?.values() || []),
    }))
    .filter((service) => service.entries.length > 0);

  return {
    accountRole,
    latestVersion,
    latestNote,
    services,
    lockedServices: canViewAdmin ? [] : SERVICES.filter((service) => service.audience === 'admin'),
  };
}

export function parseChangelog(markdown: string): RawChangelogEntry[] {
  const entries: RawChangelogEntry[] = [];
  let current: RawChangelogEntry | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(v[\w.-]+)/);
    if (heading) {
      if (current) entries.push(current);
      current = { version: heading[1], notes: [] };
      continue;
    }

    const note = line.match(/^-\s+(.+)/);
    if (note && current) {
      current.notes.push(note[1]);
    }
  }

  if (current) entries.push(current);
  return entries;
}

function classifyNoteAudience(note: string): ChangelogAudience {
  const normalized = note.toLowerCase();
  if (
    normalized.includes('admin') ||
    normalized.includes('spice_admin_emails') ||
    normalized.includes('account-level roles') ||
    normalized.includes('role-aware auth') ||
    normalized.includes('account_subscriptions') ||
    normalized.includes('subscription normalization') ||
    normalized.includes('backend account-system') ||
    normalized.includes('backend tests') ||
    normalized.includes('database_url') ||
    normalized.includes('migrations')
  ) {
    return 'admin';
  }

  return 'user';
}

function classifyNoteServices(note: string, audience: ChangelogAudience) {
  const normalized = note.toLowerCase();
  const serviceIds = new Set<string>();

  if (audience === 'admin') {
    serviceIds.add('admin');
  }

  if (matchesAny(normalized, ['spice-app.xyz', 'home', 'landing', 'changelog', 'domain', 'service hub', 'route map', 'root page', 'apex'])) {
    serviceIds.add('home');
  }

  if (normalized.includes('anime')) {
    serviceIds.add('anime');
  }

  if (matchesAny(normalized, ['spice connect', 'remote', 'receiver', 'device', 'command', 'cross-device'])) {
    serviceIds.add('connect');
  }

  if (matchesAny(normalized, ['account', 'sign-in', 'signin', 'sign in', 'sign-up', 'signup', 'subscription', 'oauth', 'cloud sync', 'cloud account'])) {
    serviceIds.add('accounts');
  }

  if (
    matchesAny(normalized, [
      'music',
      'player',
      'playback',
      'playlist',
      'youtube',
      'soundcloud',
      'last.fm',
      'listenbrainz',
      'lyrics',
      'search',
      'library',
      'recommend',
      'track',
      'scrobble',
      'mobile',
      'now-playing',
      'audio',
      'pwa',
      'settings',
      'profile sync',
    ])
  ) {
    serviceIds.add('music');
  }

  return Array.from(serviceIds).filter((serviceId) => SERVICE_BY_ID.has(serviceId)).length > 0
    ? Array.from(serviceIds).filter((serviceId) => SERVICE_BY_ID.has(serviceId))
    : ['music'];
}

function matchesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate));
}
