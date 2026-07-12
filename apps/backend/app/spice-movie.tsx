'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

import { getMovieProviderHomeUrl } from '../lib/movie-provider';
import styles from './spice-movie.module.css';

const continueWatching = [
  {
    title: 'Velvet Signal',
    meta: 'Feature - 1h 57m',
    progress: 74,
    tag: 'Resume',
  },
  {
    title: 'Harbor Zero',
    meta: 'Thriller - 2h 06m',
    progress: 38,
    tag: 'Queue',
  },
  {
    title: 'After Midnight Drive',
    meta: 'Drama - 1h 44m',
    progress: 16,
    tag: 'New',
  },
];

const featuredMovies = [
  { title: 'North Terminal', genre: 'Crime drama', rating: '96%' },
  { title: 'Blue Static', genre: 'Sci-fi mystery', rating: '94%' },
  { title: 'Glass Horizon', genre: 'Prestige action', rating: '91%' },
  { title: 'Sunday Rewind', genre: 'Comedy drama', rating: '89%' },
  { title: 'Signal House', genre: 'Found footage', rating: '93%' },
];

const showtimes = [
  { time: '19:00', title: 'Velvet Signal', detail: 'Private room cut' },
  { time: '21:20', title: 'North Terminal', detail: 'Director pick' },
  { time: '23:10', title: 'Blue Static', detail: 'Late feature' },
];

type SpiceMovieProps = {
  watchBasePath?: string;
};

export default function SpiceMovie({ watchBasePath = '/movie/watch' }: SpiceMovieProps) {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Form states
  const [interest, setInterest] = useState('streaming');
  const [devices, setDevices] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (!active) return;
      const token = localStorage.getItem('spice_cloud_token');
      const betaAccess = localStorage.getItem('spice_beta_access') === 'true';
      const savedUser = localStorage.getItem('spice_cloud_user');

      setIsLoggedIn(Boolean(token));
      setHasAccess(betaAccess);

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUserEmail(parsed.email || '');
        } catch {}
      }

      setCheckingAccess(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDeviceChange = (device: string) => {
    setDevices(prev =>
      prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return;

    setIsSubmitting(true);

    setTimeout(() => {
      localStorage.setItem('spice_beta_access', 'true');
      setHasAccess(true);
      setIsSubmitting(false);
    }, 800);
  };

  if (checkingAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#020205',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Checking beta authorization...</div>
      </div>
    );
  }

  if (!hasAccess) {
    const musicAccountSetupUrl = 'https://music.spice-app.xyz/?page=account&auth=register';

    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.12), transparent 40rem), linear-gradient(135deg, #020205 0%, #05040a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#f8fafc',
        fontFamily: 'Outfit, Inter, sans-serif'
      }}>
        <div style={{
          background: 'rgba(8, 7, 18, 0.75)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          padding: '32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(236, 72, 153, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ec4899, #be185d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.3rem',
              boxShadow: '0 0 15px rgba(236, 72, 153, 0.4)'
            }}>S</div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Spice Movie Beta</h2>
              <p style={{ margin: '2px 0 0 0', color: '#f472b6', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>PRE-RELEASE CONCEPT</p>
            </div>
          </div>

          {!isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>SPICE Account Required</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                This pre-release version of Spice Movie requires an active <strong>SPICE account</strong> to access.
              </p>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                color: '#94a3b8',
              }}>
                Please log in or register through SPICE Music first. Once completed, return here to unlock the preview.
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <a
                  href={musicAccountSetupUrl}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ec4899, #be185d)',
                    color: '#fff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)'
                  }}
                >
                  Log In / Register
                </a>
                <a
                  href="https://spice-app.xyz"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  Return Home
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                Signed in as <strong style={{ color: '#fff' }}>{userEmail || 'Spice Member'}</strong>. Submit the pre-release agreement to unlock Spice Movie:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                  What features are you most excited to test?
                </label>
                <select
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#07070a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="streaming">Full-speed video streaming</option>
                  <option value="watchlist">Watchlist tracking & schedule</option>
                  <option value="ui">Cinematic UI shells & players</option>
                  <option value="all">All of the above</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                  Which devices will you use to test?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {['Desktop / Laptop', 'Mobile browser', 'Tablet / iPad', 'Smart TV'].map(device => (
                    <label key={device} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                    }}>
                      <input
                        type="checkbox"
                        checked={devices.includes(device)}
                        onChange={() => handleDeviceChange(device)}
                        style={{ accentColor: '#ec4899' }}
                      />
                      {device}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}>
                <label style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    required
                    style={{ accentColor: '#ec4899', marginTop: '3px', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.8rem', lineHeight: 1.4, color: '#cbd5e1' }}>
                    <strong>Pre-release Agreement:</strong> I agree to provide constructive feedback in the app settings, understand features are in beta, and consent to local storage tracking.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !agree}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ec4899, #be185d)',
                    color: '#fff',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)'
                  }}
                >
                  {isSubmitting ? 'Verifying...' : 'Unlock Access Now'}
                </button>
                <a
                  href="https://spice-app.xyz"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  Cancel
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Spice Movie navigation">
        <a className={styles.brand} href="https://spice-app.xyz" aria-label="Open SPICE home">
          <span className={styles.logoMark}>S</span>
          <span>
            SPICE
            <strong>Movie</strong>
          </span>
        </a>

        <nav className={styles.navLinks}>
          {['Home', 'Premieres', 'Rooms', 'Watchlist', 'Profiles'].map((item) => (
            <a key={item} className={item === 'Home' ? styles.activeLink : undefined} href="#">
              {item}
            </a>
          ))}
        </nav>

        <div className={styles.profileCard}>
          <span>Profile</span>
          <strong>Screen Room</strong>
          <p>8 films queued</p>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <span>Search</span>
            <input type="search" placeholder="Find movies, directors, moods..." />
          </label>

          <div className={styles.topActions}>
            <a href="https://music.spice-app.xyz">Music</a>
            <a href="https://anime.spice-app.xyz">Anime</a>
            <a href={getMovieProviderHomeUrl()} target="_blank" rel="noreferrer">
              VIDSrc
            </a>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
              onClick={() => {
                if (confirm('Clear your beta access status to test gating?')) {
                  localStorage.removeItem('spice_beta_access');
                  window.location.reload();
                }
              }}
            >
              Reset Beta
            </button>
          </div>
        </header>

        <section className={styles.hero} aria-label="Featured movie">
          <Image
            className={styles.heroImage}
            src="/movie/spice-movie-hero.png"
            alt="Stylized private cinema with projector beam, screen, and theater seats"
            width={1680}
            height={960}
            priority
          />

          <div className={styles.heroShade} />

          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Now screening</span>
              <h1>
                <span>Velvet</span>
                <span>Signal</span>
              </h1>
              <p>
                A premium movie hub concept for watch queues, room-ready premieres,
                curated shelves, profile progress, and a cinematic player shell.
              </p>

              <div className={styles.heroActions}>
                <a href="#screening">Choose a movie</a>
                <button type="button">Add to Watchlist</button>
              </div>
            </div>

            <aside className={styles.screeningPanel} id="screening" aria-label="Movie player preview">
              <div className={styles.panelTop}>
                <span>External source</span>
                <strong>VIDSrc connected</strong>
              </div>
              <div className={styles.playButton} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className={styles.panelBottom}>
                <label htmlFor="movie-tmdb-id">TMDB movie ID</label>
                <form className={styles.sourceForm} action={watchBasePath} method="get">
                  <input
                    id="movie-tmdb-id"
                    name="tmdb"
                    type="text"
                    inputMode="numeric"
                    pattern="[1-9][0-9]{0,9}"
                    maxLength={10}
                    placeholder="533535"
                    aria-label="TMDB movie ID"
                    required
                  />
                  <button type="submit">Play</button>
                </form>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.gridSection} aria-label="Continue watching movies">
          <div className={styles.sectionHeading}>
            <span>Continue watching</span>
            <h2>Your private queue is ready.</h2>
          </div>

          <div className={styles.continueGrid}>
            {continueWatching.map((movie, index) => (
              <article key={movie.title} className={styles.continueCard}>
                <div className={`${styles.poster} ${styles[`poster${index + 1}`]}`}>
                  <span>{movie.tag}</span>
                </div>
                <div className={styles.cardBody}>
                  <h3>{movie.title}</h3>
                  <p>{movie.meta}</p>
                  <div className={styles.progressTrack} aria-label={`${movie.progress}% watched`}>
                    <span style={{ width: `${movie.progress}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.lowerGrid}>
          <div className={styles.featurePanel}>
            <div className={styles.sectionHeading}>
              <span>Premiere deck</span>
              <h2>Curated for tonight</h2>
            </div>

            <div className={styles.movieList}>
              {featuredMovies.map((movie, index) => (
                <article key={movie.title} className={styles.movieItem}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{movie.title}</h3>
                    <p>{movie.genre}</p>
                  </div>
                  <strong>{movie.rating}</strong>
                </article>
              ))}
            </div>
          </div>

          <aside className={styles.showtimePanel} aria-label="Tonight showtimes">
            <div className={styles.sectionHeading}>
              <span>Tonight</span>
              <h2>Showtimes</h2>
            </div>

            <div className={styles.showtimeList}>
              {showtimes.map((item) => (
                <article key={`${item.time}-${item.title}`}>
                  <span>{item.time}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
