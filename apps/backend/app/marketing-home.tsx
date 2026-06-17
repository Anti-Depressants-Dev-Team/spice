import styles from './marketing-home.module.css';
import MarketingHomeTopbar from './marketing-home-topbar';

const musicAccountSetupUrl = 'https://music.spice-app.xyz/?page=account&auth=register';

const musicFeatures = [
  'Hybrid YouTube Music, video, and SoundCloud playback',
  'Spice Anime starter hub for watch queues, releases, and featured shows',
  'Synced lyrics, mini player, shared playlists, and Spice Connect',
  'Last.fm and ListenBrainz profile sync from your SPICE account',
];

const accountAccess = [
  {
    role: 'Normal user',
    summary: 'Built for listeners who need one profile across SPICE services.',
    access: ['Profile and avatar settings', 'SPICE Music library sync', 'Provider connections', 'Future services as they launch'],
  },
  {
    role: 'Admin account',
    summary: 'Reserved for operators who need service health and account oversight.',
    access: ['Everything normal users get', 'Admin dashboard access', 'Service status controls', 'User and invite moderation'],
  },
];

const services = [
  {
    status: 'Live',
    title: 'SPICE Music',
    href: 'https://music.spice-app.xyz',
    description: 'The full player service: search, stream, save libraries, sync profiles, and control other signed-in devices with Spice Connect.',
    cta: 'Open Music',
    live: true,
  },
  {
    status: 'Starter',
    title: 'Spice Anime',
    href: 'https://anime.spice-app.xyz',
    description: 'A first-pass anime watching surface with featured playback, continue watching rows, trending shows, release schedule, and watchlist structure.',
    cta: 'Open Anime',
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
        <MarketingHomeTopbar />

        <div className={styles.heroGrid}>
          <div className={styles.copy}>
            <div className={styles.kicker}>spice-app.xyz is the SPICE home screen</div>
            <h1>One front door for SPICE Music and everything coming next.</h1>
            <p className={styles.lede}>
              The apex domain is now the service hub. Music and Anime live on their own subdomains,
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

      <section className={styles.accountAccess} aria-label="SPICE account access types">
        <div className={styles.sectionHeading}>
          <span>Account access</span>
          <h2>Regular listeners get their profile. Admins get the control room.</h2>
        </div>

        <div className={styles.accessGrid}>
          {accountAccess.map((account) => (
            <article key={account.role} className={styles.accessCard}>
              <div className={styles.accessCardHeader}>
                <span>{account.role}</span>
                <strong>{account.role === 'Admin account' ? 'Dashboard tier' : 'Listener tier'}</strong>
              </div>
              <p>{account.summary}</p>
              <ul>
                {account.access.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
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
          <span>Anime starter</span>
          <strong>anime.spice-app.xyz</strong>
          <p>A first-pass anime watching interface for featured episodes, watchlists, and schedule structure.</p>
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
