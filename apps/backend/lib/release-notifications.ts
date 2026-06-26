export const SPICE_MEDIA_CORE_VERSION = '1.0.75';
export const RELEASE_NOTIFICATION_STORAGE_KEY = 'spice_read_release_notifications';

export interface ReleaseNotification {
  id: string;
  version: string;
  title: string;
  summary: string;
  body: string[];
}

export const RELEASE_NOTIFICATIONS: ReleaseNotification[] = [
  {
    id: `spice-media-core-${SPICE_MEDIA_CORE_VERSION}`,
    version: `v${SPICE_MEDIA_CORE_VERSION}`,
    title: 'Notification Center & Playlist Requests',
    summary: 'SPICE now has topbar notifications for release updates and shared playlist requests.',
    body: [
      'A new notification bell now lives beside your profile in the top bar. When there is something new, the badge in the lower-right corner shows the number of notifications waiting for you.',
      'Version notes can be opened from the notification tray for a larger release detail view, so changes to SPICE are easier to read without digging through settings.',
      'Shared playlist collaborator invites now surface as notification requests. You choose Accept or Reject from the notification tray, and pending invites stay out of your library until you accept them.',
    ],
  },
];
