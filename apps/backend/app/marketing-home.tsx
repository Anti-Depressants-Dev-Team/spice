'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import styles from './marketing-home.module.css';
import MarketingHomeTopbar from './marketing-home-topbar';

const musicAccountSetupUrl = 'https://music.spice-app.xyz/?page=account&auth=register';

const musicFeatures = [
  'Hybrid YouTube Music, video, and SoundCloud playback',
  'Spice Anime starter hub for watch queues, releases, and featured shows',
  'Spice Movie starter hub for cinematic queues, premieres, and watch rooms',
  'Synced lyrics, mini player, shared playlists, and Spice Connect',
  'Last.fm and ListenBrainz profile sync from your SPICE account',
];

export default function MarketingHome() {
  const [activeTab, setActiveTab] = useState<'hub' | 'profile'>('hub');
  const [activeProfile, setActiveProfile] = useState<{ id: string, displayName: string, avatarUrl: string, gradient: string, bio: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  useEffect(() => {
    window.queueMicrotask(() => {
    try {
      const savedProfiles = window.localStorage.getItem('spice_profiles_list');
      if (savedProfiles) {
        const activeProfileId = window.localStorage.getItem('spice_active_profile_id') || 'default';
        const profiles = JSON.parse(savedProfiles);
        const profile = profiles.find((p: Record<string, string>) => p.id === activeProfileId) || profiles[0];
        if (profile) {
          setActiveProfile(profile);
          setEditName(profile.displayName || '');
          setEditBio(profile.bio || '');
          setEditAvatarUrl(profile.avatarUrl || '');
        }
      }
    } catch (_e) {}
    });
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    try {
      const savedProfiles = window.localStorage.getItem('spice_profiles_list');
      if (savedProfiles) {
        const profiles = JSON.parse(savedProfiles);
        const updatedProfiles = profiles.map((p: Record<string, string>) => {
          if (p.id === activeProfile.id) {
            return { ...p, displayName: editName, bio: editBio, avatarUrl: editAvatarUrl };
          }
          return p;
        });
        window.localStorage.setItem('spice_profiles_list', JSON.stringify(updatedProfiles));

        setActiveProfile({ ...activeProfile, displayName: editName, bio: editBio, avatarUrl: editAvatarUrl });
        // Force a small reload or trigger event so the topbar catches it
        window.dispatchEvent(new Event('storage'));
      }
    } catch (_e) {}
  };

  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.hero}>
        <MarketingHomeTopbar onProfileClick={() => setActiveTab('profile')} />

        {activeTab === 'profile' ? (
          <div className={styles.profileEditor} style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>Your Profile</h2>
              <button onClick={() => setActiveTab('hub')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', padding: '8px 16px' }}>&larr; Back to Hub</button>
            </div>

            {activeProfile ? (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: activeProfile.avatarUrl ? 'none' : activeProfile.gradient, border: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                    {activeProfile.avatarUrl ? <img src={activeProfile.avatarUrl} alt="" /* eslint-disable-next-line @next/next/no-img-element */
 style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : activeProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{activeProfile.displayName}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage your public presence across the SPICE ecosystem.</p>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Display Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '1rem' }} required />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Bio</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '1rem', resize: 'vertical' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Avatar URL</label>
                  <input type="url" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '1rem' }} />
                </div>

                <button type="submit" style={{ padding: '14px', borderRadius: '999px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', marginTop: '16px' }}>Save Profile Changes</button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <p>No local profile found.</p>
                <a href={musicAccountSetupUrl} style={{ color: 'var(--accent-pink)', textDecoration: 'none', fontWeight: 600 }}>Create an account to start</a>
              </div>
            )}
          </div>
        ) : (
        <div className={styles.heroGrid}>
          <div className={styles.copy}>
            <div className={styles.kicker}>spice-app.xyz is the SPICE home screen</div>
            <h1>One front door for SPICE Music and everything coming next.</h1>
            <p className={styles.lede}>
              The apex domain is now the service hub. Music, Anime, and Movie live on their own subdomains,
              and future SPICE services can launch from here without turning the root site into a generic ad.
            </p>

            <div className={styles.actions}>
              <a className={styles.primaryAction} href="https://music.spice-app.xyz">
                Enter SPICE Music
              </a>
              <a className={styles.accountAction} href={musicAccountSetupUrl}>
                Create Spice Account
              </a>
              <a className={styles.secondaryAction} href="#services">
                View services
              </a>
              <a className={styles.secondaryAction} href="https://anime.spice-app.xyz">
                Preview Anime
              </a>
              <a className={styles.secondaryAction} href="https://movie.spice-app.xyz">
                Preview Movie
              </a>
            </div>

            <aside className={styles.accountPrompt} aria-label="Create a Spice Account">
              <div>
                <span>Spice Account</span>
                <strong>One sign-in for profiles, sync, and future SPICE services.</strong>
                <p>
                  Start as a normal user for your profile and service access. Admin accounts can unlock
                  the private dashboard later without changing the public home screen.
                </p>
              </div>
              <a href={musicAccountSetupUrl}>Start setup</a>
            </aside>

            <ul className={styles.featureList}>
              {musicFeatures.map((feature) => (
                <li key={feature}>
                  <span className={styles.checkIcon} aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path d="m6.4 10.6 6-7 1.9 1.6-7.8 9.1L1.7 9.4l1.8-1.8 2.9 3Z" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.commandPanel} aria-label="SPICE service home preview">
            <div className={styles.panelTop}>
              <span>SPICE Home</span>
              <strong>Service launcher</strong>
            </div>

            <div className={styles.profileBar} aria-label="SPICE account profile preview">
              <div className={styles.profileAvatar}>S</div>
              <div>
                <span>Profile bar</span>
                <strong>Spice Account</strong>
                <p>Normal access active</p>
              </div>
              <small>Admin-ready</small>
            </div>

            <div className={styles.musicTile}>
              <div>
                <span>Active service</span>
                <h2>SPICE Music</h2>
                <p>Search, stream, sync, share, and control playback from any signed-in device.</p>
              </div>
              <a href="https://music.spice-app.xyz">Open</a>
            </div>

            <div className={styles.animeTile}>
              <div>
                <span>Starter service</span>
                <h2>Spice Anime</h2>
                <p>Featured shows, watch progress, season heat, and a player-first anime shell.</p>
              </div>
              <a href="https://anime.spice-app.xyz">Open</a>
            </div>

            <div className={styles.movieTile}>
              <div>
                <span>Starter service</span>
                <h2>Spice Movie</h2>
                <p>Cinematic queues, premiere rows, room-ready playback, and a theater-first movie shell.</p>
              </div>
              <a href="https://movie.spice-app.xyz">Open</a>
            </div>

            <div className={styles.signalGrid} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className={styles.panelFooter}>
              <span>music.spice-app.xyz</span>
              <div>
                <span />
              </div>
              <span>Live</span>
            </div>
          </div>
        </div>
        )}
      </section>

    </main>
  );
}
