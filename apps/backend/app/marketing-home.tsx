import styles from './marketing-home.module.css';

const musicFeatures = [
  'Hybrid YouTube Music, video, and SoundCloud playback',
  'Synced lyrics, mini player, shared playlists, and remote control',
  'Last.fm and ListenBrainz profile sync from your SPICE account',
];

const services = [
  {
    status: 'Live',
    title: 'SPICE Music',
    href: 'https://music.spice-app.xyz',
    description: 'The full player service: search, stream, save libraries, sync profiles, and control other signed-in devices.',
    cta: 'Open Music',
    live: true,
  },
  {
    status: 'Planned',
    title: 'SPICE Rooms',
    description: 'Shared listening rooms, friend invites, and collaborative queue control built on top of the playlist system.',
    cta: 'Coming soon',
  },
  {
    status: 'Planned',
    title: 'SPICE Recap',
    description: 'Trimester and yearly listening recaps with favorite songs, artists, playtime, and profile history.',
    cta: 'Coming soon',
  },
  {
    status: 'Planned',
    title: 'SPICE Cloud',
    description: 'Account tools for saved devices, provider links, shared playlists, and future service settings.',
    cta: 'Coming soon',
  },
];

export default function MarketingHome() {
  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.hero}>
        <nav className={styles.nav} aria-label="SPICE home navigation">
          <a className={styles.brand} href="https://music.spice-app.xyz" aria-label="Open SPICE Music">
            <span className={styles.logoMark}>
              <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                <path d="M24 4 42 14.4v19.2L24 44 6 33.6V14.4L24 4Z" />
                <path d="M17.5 30.5c4.7 3.3 12.3 1.6 14.2-3.2 1.3-3.4-.1-6.7-4.1-9.7L22 13.4v8.7l-3.1-2.2c-2.5-1.8-5.4-.1-5.4 2.9 0 1.3.7 2.6 1.9 3.4l4.4 3.1c1.4 1 3 .6 3.9-.7.8-1.2.5-2.8-.7-3.7l-3.8-2.7c-.3-.2-.4-.5-.2-.8.2-.3.6-.4.9-.2l6.2 4.4c1.7 1.2 2.2 2.7 1.5 4-.9 1.8-4.6 2.4-7.4.5l-4.2-2.9-3.2 4.4 4.7 3.3Z" />
              </svg>
            </span>
            <span>SPICE</span>
          </a>

          <div className={styles.navLinks}>
            <a href="#services">Services</a>
            <a href="#route-map">Domains</a>
            <a className={styles.navCta} href="https://music.spice-app.xyz">
              Launch Music
            </a>
          </div>
        </nav>

        <div className={styles.heroGrid}>
          <div className={styles.copy}>
            <div className={styles.kicker}>spice-app.xyz is the SPICE home screen</div>
            <h1>One front door for SPICE Music and everything coming next.</h1>
            <p className={styles.lede}>
              The apex domain is now the service hub. Music lives on its own subdomain, and future
              SPICE services can launch from here without turning the root site into a generic ad.
            </p>

            <div className={styles.actions}>
              <a className={styles.primaryAction} href="https://music.spice-app.xyz">
                Enter SPICE Music
              </a>
              <a className={styles.secondaryAction} href="#services">
                View services
              </a>
            </div>

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

            <div className={styles.musicTile}>
              <div>
                <span>Active service</span>
                <h2>SPICE Music</h2>
                <p>Search, stream, sync, share, and control playback from any signed-in device.</p>
              </div>
              <a href="https://music.spice-app.xyz">Open</a>
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
      </section>

      <section id="services" className={styles.services} aria-label="SPICE services">
        <div className={styles.sectionHeading}>
          <span>Service stack</span>
          <h2>Launch what exists. Reserve space for what comes next.</h2>
        </div>

        <div className={styles.serviceGrid}>
          {services.map((service) => {
            const content = (
              <>
                <div className={styles.serviceHeader}>
                  <span className={service.live ? styles.statusLive : styles.statusPlanned}>{service.status}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
                    <path d="M8 13.5V8l7 4-7 4Z" />
                  </svg>
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <strong>{service.cta}</strong>
              </>
            );

            return service.href ? (
              <a key={service.title} className={`${styles.serviceCard} ${styles.serviceCardLive}`} href={service.href}>
                {content}
              </a>
            ) : (
              <article key={service.title} className={styles.serviceCard}>
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <section id="route-map" className={styles.bottomBand} aria-label="SPICE service routing">
        <div>
          <span>Home screen</span>
          <strong>spice-app.xyz</strong>
          <p>Root domain for service discovery, account entry points, and future SPICE products.</p>
        </div>
        <div>
          <span>Music service</span>
          <strong>music.spice-app.xyz</strong>
          <p>The full SPICE player, provider sync, shared playlists, and playback app.</p>
        </div>
        <div>
          <span>Future services</span>
          <strong>*.spice-app.xyz</strong>
          <p>Reserved structure for Rooms, Recap, Cloud, and anything else we ship later.</p>
        </div>
      </section>
    </main>
  );
}
