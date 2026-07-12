export type ChangelogAccountRole = 'user' | 'admin';
export type ChangelogAudience = 'user' | 'admin';

export interface ServiceChangelogEntry {
  version: string;
  notes: string[];
}

export interface ServiceChangelogSummary {
  id: string;
  label: string;
  description: string;
  audience: ChangelogAudience;
}

export interface ServiceChangelog extends ServiceChangelogSummary {
  entries: ServiceChangelogEntry[];
}

export interface ChangelogPayload {
  accountRole: ChangelogAccountRole;
  latestVersion: string | null;
  latestNote: string | null;
  services: ServiceChangelog[];
  lockedServices: ServiceChangelogSummary[];
}
