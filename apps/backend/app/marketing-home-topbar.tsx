'use client';

/* eslint-disable @next/next/no-img-element */

import { type FormEvent, useEffect, useMemo, useState } from 'react';

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

export default function MarketingHomeTopbar() {
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<SearchProvider>('hybrid');
  const [profile, setProfile] = useState<HomeProfile>(DEFAULT_PROFILE);
  const [account, setAccount] = useState<HomeAccount | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('checking');

  useEffect(() => {
    let active = true;

    window.queueMicrotask(() => {
      if (!active) return;

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

    return () => {
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
        <a className={styles.homeTopbarProfile} href={accountHref} aria-label={`${accountLabel}: ${displayName}`}>
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
    if (!activeProfile?.displayName) return null;

    return {
      displayName: activeProfile.displayName,
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
