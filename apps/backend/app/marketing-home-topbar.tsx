'use client';

/* eslint-disable @next/next/no-img-element */

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { RELEASE_NOTIFICATIONS, RELEASE_NOTIFICATION_STORAGE_KEY, type ReleaseNotification } from '@/lib/release-notifications';

import styles from './marketing-home.module.css';

type SearchProvider = 'hybrid' | 'youtube_music' | 'youtube_videos' | 'soundcloud';
type AccountStatus = 'checking' | 'guest' | 'signed-in' | 'admin' | 'cached';

interface HomeAccount {
  email?: string;
  accountRole?: string;
  isAdmin?: boolean;
  subscription?: {
    tier?: string;
    isActive?: boolean;
  } | null;
}

interface HomeProfile {
  displayName: string;
  avatarUrl?: string;
  gradient: string;
}

interface StoredProfile {
  id?: string;
  displayName?: string;
  avatarUrl?: string;
  gradient?: string;
}


const Icons = {
  bell: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
};

const MUSIC_APP_URL = 'https://music.spice-app.xyz';
const DEFAULT_PROFILE: HomeProfile = {
  displayName: 'Spice Listener',
  gradient: 'linear-gradient(135deg, #7c3aed, #c084fc)',
};

const SEARCH_PROVIDER_LABELS: Record<SearchProvider, string> = {
  hybrid: 'Hybrid',
  youtube_music: 'YouTube Music',
  youtube_videos: 'YouTube Videos',
  soundcloud: 'SoundCloud',
};

export default function MarketingHomeTopbar({ onProfileClick }: { onProfileClick?: () => void }) {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<SearchProvider>('hybrid');
  const [profile, setProfile] = useState<HomeProfile>(DEFAULT_PROFILE);
  const [account, setAccount] = useState<HomeAccount | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('checking');
  const [notificationTrayOpen, setNotificationTrayOpen] = useState(false);
  const [selectedReleaseNotification, setSelectedReleaseNotification] = useState<ReleaseNotification | null>(null);
  const [readReleaseNotificationIds, setReadReleaseNotificationIds] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<{ playlistId: string; playlistTitle: string; ownerDisplayName: string; ownerUsername: string | null }[]>([]);
  const [pendingInvitesLoading, _setPendingInvitesLoading] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  useEffect(() => {
    let active = true;

    window.queueMicrotask(() => {
      if (!active) return;

      try {
        const saved = window.localStorage.getItem(RELEASE_NOTIFICATION_STORAGE_KEY);
        if (saved) {
          setReadReleaseNotificationIds(JSON.parse(saved));
        }
      } catch {}
      const savedProvider = window.localStorage.getItem('spice_search_provider');
      if (isSearchProvider(savedProvider)) {
        setProvider(savedProvider);
      }

      const nextProfile = readStoredProfile();
      if (nextProfile) {
        setProfile(nextProfile);
      }

      const savedAccount = readStoredAccount();
      if (savedAccount) {
        setAccount(savedAccount);
      }

      const token = window.localStorage.getItem('spice_cloud_token');
      if (!token) {
        setAccountStatus(savedAccount ? 'cached' : 'guest');
        return;
      }

      void fetch('/api/account/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Could not verify saved SPICE account.');
          }
          return response.json() as Promise<{ account?: HomeAccount; user?: HomeAccount }>;
        })
        .then((payload) => {
          if (!active) return;
          const nextAccount = payload.account || payload.user || null;
          setAccount(nextAccount);
          if (token) {
            void fetch('/api/account/invites', {
              headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => setPendingInvites(data.invites || []))
            .catch(() => {});
          }
          if (nextAccount) {
            window.localStorage.setItem('spice_cloud_user', JSON.stringify(nextAccount));
          }
          setAccountStatus(nextAccount?.isAdmin || nextAccount?.accountRole === 'admin' ? 'admin' : 'signed-in');
        })
        .catch(() => {
          if (!active) return;
          setAccountStatus(savedAccount ? 'cached' : 'guest');
        });
    });


    const onStorage = () => {
      const nextProfile = readStoredProfile();
      if (nextProfile) setProfile(nextProfile);

      const nextAccount = readStoredAccount();
      setAccount(nextAccount);

      const hasToken = !!window.localStorage.getItem('spice_cloud_token');
      const isAdmin = nextAccount?.isAdmin || nextAccount?.accountRole === 'admin';
      setAccountStatus(hasToken ? (isAdmin ? 'admin' : 'signed-in') : (nextAccount ? 'cached' : 'guest'));
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);

      active = false;
    };
  }, []);

  const accountHref = useMemo(
    () => buildMusicUrl({
      page: 'account',
      auth: account ? undefined : 'register',
    }),
    [account],
  );

  const accountLabel = account?.isAdmin || account?.accountRole === 'admin'
    ? 'Admin account'
    : account
      ? 'SPICE account'
      : 'Create account';

  const accountDetail = account?.subscription?.tier
    ? `${account.subscription.tier} ${account.subscription.isActive ? 'active' : 'subscription'}`
    : accountStatus === 'checking'
      ? 'Checking account'
      : account?.email || 'Profile and sync';

  const displayName = account?.email ? account.email.split('@')[0] : profile.displayName;
  const avatarLetter = (displayName || 'S').charAt(0).toUpperCase();


  const unreadReleaseNotifications = RELEASE_NOTIFICATIONS.filter((notification) => !readReleaseNotificationIds.includes(notification.id));
  const notificationCount = unreadReleaseNotifications.length + pendingInvites.length;
  const notificationCountLabel = notificationCount > 99 ? '99+' : String(notificationCount);

  const openReleaseNotification = (notification: ReleaseNotification) => {
    setSelectedReleaseNotification(notification);
    setNotificationTrayOpen(false);
    setReadReleaseNotificationIds((prev) => {
      if (prev.includes(notification.id)) return prev;
      const next = [...prev, notification.id];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RELEASE_NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleAcceptInvite = async (playlistId: string) => {
    const token = window.localStorage.getItem('spice_cloud_token');
    if (!token) return;
    setAcceptingInvite(true);
    try {
      const res = await fetch(`/api/account/invites/${playlistId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.playlistId !== playlistId));
      }
    } catch {
    } finally {
      setAcceptingInvite(false);
    }
  };

  const handleRejectInvite = async (playlistId: string) => {
    const token = window.localStorage.getItem('spice_cloud_token');
    if (!token) return;
    setAcceptingInvite(true);
    try {
      const res = await fetch(`/api/account/invites/${playlistId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.playlistId !== playlistId));
      }
    } catch {
    } finally {
      setAcceptingInvite(false);
    }
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    window.localStorage.setItem('spice_search_provider', provider);
    window.location.href = buildMusicUrl({
      page: 'search',
      q: trimmedQuery,
      provider,
    });
  };


  return (
    <>
      {selectedReleaseNotification && (
        <div className="spice-dialog-backdrop" role="presentation" onClick={() => setSelectedReleaseNotification(null)}>
          <div className="spice-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="spice-release-title" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="spice-dialog__tag" style={{ background: 'rgba(216, 180, 254, 0.1)', color: '#d8b4fe', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release Notes</span>
              <button
                type="button"
                className="app-topbar__tray-close"
                onClick={() => setSelectedReleaseNotification(null)}
                aria-label="Close dialog"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', margin: '-8px -8px 0 0' }}
              >
                {Icons.close}
              </button>
            </div>
            <h2 id="spice-release-title" style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{selectedReleaseNotification.version}: {selectedReleaseNotification.title}</h2>
            <p className="spice-release-dialog__summary" style={{ margin: '0 0 24px 0', color: '#d8b4fe', fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedReleaseNotification.summary}</p>
            <div className="spice-dialog__content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedReleaseNotification.body.map((paragraph, i) => (
                <p key={i} style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{paragraph}</p>
              ))}
            </div>
            <div className="spice-dialog__actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button type="button" className="app-topbar__notification-action app-topbar__notification-action--primary" onClick={() => setSelectedReleaseNotification(null)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <header className={styles.homeTopbar} aria-label="SPICE home topbar">
      <a className={styles.brand} href={MUSIC_APP_URL} aria-label="Open SPICE Music">
        <span className={styles.logoMark}>
          <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
            <path d="M24 4 42 14.4v19.2L24 44 6 33.6V14.4L24 4Z" />
            <path d="M17.5 30.5c4.7 3.3 12.3 1.6 14.2-3.2 1.3-3.4-.1-6.7-4.1-9.7L22 13.4v8.7l-3.1-2.2c-2.5-1.8-5.4-.1-5.4 2.9 0 1.3.7 2.6 1.9 3.4l4.4 3.1c1.4 1 3 .6 3.9-.7.8-1.2.5-2.8-.7-3.7l-3.8-2.7c-.3-.2-.4-.5-.2-.8.2-.3.6-.4.9-.2l6.2 4.4c1.7 1.2 2.2 2.7 1.5 4-.9 1.8-4.6 2.4-7.4.5l-4.2-2.9-3.2 4.4 4.7 3.3Z" />
          </svg>
        </span>
        <span>SPICE</span>
      </a>

      <nav className={styles.navLinks} aria-label="SPICE home navigation">
        <a href="#services">Services</a>
        <a href="#route-map">Domains</a>
        <a href="/changelog">Changelog</a>
        <a className={styles.navCta} href={MUSIC_APP_URL}>
          Launch Music
        </a>
      </nav>

      <form className={styles.homeTopbarSearch} onSubmit={handleSearchSubmit} role="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder={`Search ${SEARCH_PROVIDER_LABELS[provider]}...`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          aria-label="Search SPICE Music from home"
        />
        <label className={styles.homeTopbarProvider}>
          <span className={styles.srOnly}>Search provider</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as SearchProvider)}
            aria-label="Search provider"
          >
            <option value="hybrid">Hybrid</option>
            <option value="youtube_music">YouTube Music</option>
            <option value="youtube_videos">YouTube Videos</option>
            <option value="soundcloud">SoundCloud</option>
          </select>
        </label>
        <button type="submit" disabled={!query.trim()}>
          Search
        </button>
      </form>

      <div className={styles.homeTopbarActions}>
        {account?.isAdmin || account?.accountRole === 'admin' ? (
          <a className={styles.homeTopbarAdmin} href="/admin-dashboard">
            Admin
          </a>
        ) : null}

        <div className="app-topbar__notification-shell" style={{ zIndex: 100 }}>
          <button
            className={`app-topbar__notification ${notificationTrayOpen ? 'active' : ''}`}
            type="button"
            onClick={() => setNotificationTrayOpen(!notificationTrayOpen)}
            aria-label={`Open notifications${notificationCount > 0 ? ` (${notificationCount} waiting)` : ''}`}
            aria-expanded={notificationTrayOpen}
            title="Notifications"
          >
            {Icons.bell}
            {notificationCount > 0 && (
              <span className="app-topbar__notification-badge">{notificationCountLabel}</span>
            )}
          </button>

          {notificationTrayOpen && (
            <div className="app-topbar__notification-tray" role="region" aria-label="SPICE notifications">
              <div className="app-topbar__notification-header">
                <div>
                  <span>Notifications</span>
                  <strong>{notificationCount > 0 ? `${notificationCount} waiting` : 'All caught up'}</strong>
                </div>
                <button
                  type="button"
                  className="app-topbar__tray-close"
                  onClick={() => setNotificationTrayOpen(false)}
                  aria-label="Close notifications"
                >
                  {Icons.close}
                </button>
              </div>

              <div className="app-topbar__notification-section">
                <span className="app-topbar__notification-section-title">Version updates</span>
                {RELEASE_NOTIFICATIONS.map((notification) => {
                  const isUnread = !readReleaseNotificationIds.includes(notification.id);
                  return (
                    <div key={notification.id} className={`app-topbar__notification-item ${isUnread ? 'is-unread' : ''}`}>
                      <div className="app-topbar__notification-copy">
                        <span>{notification.version}</span>
                        <strong>{notification.title}</strong>
                        <p>{notification.summary}</p>
                      </div>
                      <button
                        type="button"
                        className="app-topbar__notification-action"
                        onClick={() => openReleaseNotification(notification)}
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="app-topbar__notification-section">
                <span className="app-topbar__notification-section-title">Shared playlist requests</span>
                {pendingInvitesLoading && pendingInvites.length === 0 ? (
                  <p className="app-topbar__notification-empty">Checking for playlist requests...</p>
                ) : pendingInvites.length > 0 ? (
                  pendingInvites.map((invite) => (
                    <div key={invite.playlistId} className="app-topbar__notification-item app-topbar__notification-item--request">
                      <div className="app-topbar__notification-copy">
                        <span>Join request</span>
                        <strong>{invite.playlistTitle}</strong>
                        <p>{invite.ownerDisplayName} (@{invite.ownerUsername || 'unknown'}) invited you to join.</p>
                      </div>
                      <div className="app-topbar__notification-actions">
                        <button
                          type="button"
                          className="app-topbar__notification-action"
                          onClick={() => handleRejectInvite(invite.playlistId)}
                          disabled={acceptingInvite}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="app-topbar__notification-action app-topbar__notification-action--primary"
                          onClick={() => handleAcceptInvite(invite.playlistId)}
                          disabled={acceptingInvite}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="app-topbar__notification-empty">
                    Playlist requests will appear here before anything joins your library.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <a
          className={styles.homeTopbarProfile}
          href={accountHref}
          onClick={(e) => {
            if (onProfileClick) {
              e.preventDefault();
              onProfileClick();
            }
          }}
          aria-label={`${accountLabel}: ${displayName}`}
        >
          <span className={styles.homeTopbarAvatar} style={{ background: profile.avatarUrl ? 'transparent' : profile.gradient }}>
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : avatarLetter}
          </span>
          <span className={styles.homeTopbarProfileCopy}>
            <strong>{displayName}</strong>
            <small>{accountLabel}</small>
            <em>{accountDetail}</em>
          </span>
        </a>
      </div>
    </header>
    </>
  );
}

function buildMusicUrl(params: Record<string, string | undefined>) {
  const url = new URL(MUSIC_APP_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function readStoredAccount(): HomeAccount | null {
  try {
    const saved = window.localStorage.getItem('spice_cloud_user');
    return saved ? (JSON.parse(saved) as HomeAccount) : null;
  } catch {
    return null;
  }
}

function readStoredProfile(): HomeProfile | null {
  try {
    const savedProfiles = window.localStorage.getItem('spice_profiles_list');
    if (!savedProfiles) return null;

    const activeProfileId = window.localStorage.getItem('spice_active_profile_id') || 'default';
    const profiles = JSON.parse(savedProfiles) as StoredProfile[];
    const activeProfile = profiles.find((item) => item.id === activeProfileId) || profiles[0];
    if (!activeProfile) return null;

    return {
      displayName: activeProfile.displayName || DEFAULT_PROFILE.displayName,
      avatarUrl: activeProfile.avatarUrl,
      gradient: activeProfile.gradient || DEFAULT_PROFILE.gradient,
    };
  } catch {
    return null;
  }
}

function isSearchProvider(value: string | null): value is SearchProvider {
  return value === 'hybrid' || value === 'youtube_music' || value === 'youtube_videos' || value === 'soundcloud';
}
