import styles from './marketing-home.module.css';

const features = [
  'Hybrid YouTube Music, video, and SoundCloud search',
  'Synced lyrics, queue control, and saved playback states',
  'Last.fm and ListenBrainz profile sync from the player',
];

export default function MarketingHome() {
  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.hero}>
        <nav className={styles.nav} aria-label="SPICE landing navigation">
          <a className={styles.brand} href="https://music.spice-app.xyz" aria-label="Open SPICE Music">
            <span className={styles.logoMark}>
              <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                <path d="M24 4 42 14.4v19.2L24 44 6 33.6V14.4L24 4Z" />
                <path d="M17.5 30.5c4.7 3.3 12.3 1.6 14.2-3.2 1.3-3.4-.1-6.7-4.1-9.7L22 13.4v8.7l-3.1-2.2c-2.5-1.8-5.4-.1-5.4 2.9 0 1.3.7 2.6 1.9 3.4l4.4 3.1c1.4 1 3 .6 3.9-.7.8-1.2.5-2.8-.7-3.7l-3.8-2.7c-.3-.2-.4-.5-.2-.8.2-.3.6-.4.9-.2l6.2 4.4c1.7 1.2 2.2 2.7 1.5 4-.9 1.8-4.6 2.4-7.4.5l-4.2-2.9-3.2 4.4 4.7 3.3Z" />
              </svg>
            </span>
            <span>SPICE</span>
          </a>

          <a className={styles.navCta} href="https://music.spice-app.xyz">
            Launch music app
          </a>
        </nav>

        <div className={styles.heroGrid}>
          <div className={styles.copy}>
            <div className={styles.kicker}>music.spice-app.xyz is live</div>
            <h1>One blacked-out command center for your music.</h1>
            <p className={styles.lede}>
              SPICE pulls playable music from the platforms you actually use, keeps the player fast,
              and turns every session into a synced profile signal.
            </p>

            <div className={styles.actions}>
              <a className={styles.primaryAction} href="https://music.spice-app.xyz">
                Enter SPICE Music
              </a>
              <a className={styles.secondaryAction} href="https://music.spice-app.xyz">
                Connect profiles
              </a>
            </div>

            <ul className={styles.featureList}>
              {features.map((feature) => (
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

          <div className={styles.productCard} aria-label="SPICE Music preview">
            <div className={styles.cardHeader}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.albumArt}>
              <div className={styles.albumGlow} />
              <svg viewBox="0 0 96 96" role="img" aria-label="SPICE album art">
                <rect width="96" height="96" rx="24" />
                <path d="M28 62c9 7 26 4 31-8 4-9 0-16-10-23l-9-6v17l-5-4c-7-5-16 0-16 8 0 4 2 7 5 10l9 6c3 2 7 1 9-2 2-3 1-7-2-9l-8-5c-1-1-1-2 0-3 1-1 2-1 3 0l13 9c4 3 5 6 3 9-3 5-12 6-18 2l-8-5-7 9 10 7Z" />
              </svg>
            </div>
            <div className={styles.trackPreview}>
              <span>Now playing</span>
              <strong>Get Lucky</strong>
              <p>Daft Punk, Pharrell Williams, Nile Rodgers</p>
            </div>
            <div className={styles.waveform} aria-hidden="true">
              {Array.from({ length: 28 }).map((_, index) => (
                <span key={index} style={{ height: `${18 + ((index * 11) % 38)}px` }} />
              ))}
            </div>
            <div className={styles.playerBar}>
              <span>0:42</span>
              <div>
                <span />
              </div>
              <span>3:54</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bottomBand} aria-label="SPICE service split">
        <div>
          <span>Main site</span>
          <strong>spice-app.xyz</strong>
          <p>Brand landing page and launch ad.</p>
        </div>
        <div>
          <span>Music service</span>
          <strong>music.spice-app.xyz</strong>
          <p>The full SPICE player, profile sync, and playback app.</p>
        </div>
      </section>
    </main>
  );
}
