import {
  CLOUD_ORIGIN,
  INSTALL_ORIGIN,
  LOCAL_RUNTIME_URL,
  localModeFeatureStatus,
  localModeLanes,
  localModeOptionalFeatureStatus,
} from '@/lib/local-mode-feature-status';
import Link from 'next/link';

import CloudAccountPanel from './cloud-account-panel';
import styles from './cloud-portal.module.css';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 10h10M11 6l4 4-4 4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" />
    </svg>
  );
}

function SpiceMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.5 4.5v10.3a3.7 3.7 0 1 1-2-3.3V6.4l6-1.4v7.6a3.7 3.7 0 1 1-2-3.3V4.1l-2 .4Z" />
    </svg>
  );
}

export default function CloudPortal() {
  return (
    <main className={styles.shell}>
      <a className={styles.skipLink} href="#portal-content">
        Skip to main content
      </a>

      <nav className={styles.topbar} aria-label="Portal navigation">
        <Link className={styles.brand} href="/" aria-label="SPICE local mode home">
          <span className={styles.logoMark}>
            <SpiceMark />
          </span>
          <span className={styles.brandName}>
            <strong>SPICE</strong>
            <small>Local mode</small>
          </span>
        </Link>

        <div className={styles.navLinks}>
          <a href="#account">Account</a>
          <a href="#technical-details">Details</a>
          <a className={styles.navLaunch} href={LOCAL_RUNTIME_URL}>
            Open local SPICE
            <ArrowIcon />
          </a>
        </div>
      </nav>

      <section id="portal-content" className={styles.hero} aria-label="SPICE local runtime portal">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>
            <span className={styles.statusDot} aria-hidden="true" />
            Privacy-first desktop runtime
          </div>

          <h1>
            Your music stays <span>local.</span>
            <br />
            Your account stays connected.
          </h1>
          <p>
            Install the full SPICE player on your PC for playback and media services. Keep this
            lightweight cloud portal for accounts, setup, sync, and release updates.
          </p>

          <div className={styles.actions} aria-label="Runtime actions">
            <a className={styles.primaryAction} href={INSTALL_ORIGIN}>
              <DownloadIcon />
              Install local runtime
            </a>
            <a className={styles.secondaryAction} href={LOCAL_RUNTIME_URL}>
              Open local SPICE
              <ArrowIcon />
            </a>
            <a className={styles.textAction} href="/changelog">
              View changelog
            </a>
          </div>

          <ul className={styles.guardrails} aria-label="Local mode guardrails">
            <li>
              <span aria-hidden="true">&#10003;</span>
              Local media playback
            </li>
            <li>
              <span aria-hidden="true">&#10003;</span>
              Thin cloud account layer
            </li>
            <li>
              <span aria-hidden="true">&#10003;</span>
              Sync stays optional
            </li>
          </ul>
        </div>

        <aside className={styles.runtimeCard} aria-label="Three-step local runtime setup">
          <div className={styles.runtimeCardHeader}>
            <div>
              <span>Local mode</span>
              <strong>Ready when you are</strong>
            </div>
            <span className={styles.liveBadge}>
              <i aria-hidden="true" />
              Online
            </span>
          </div>

          <ol className={styles.runtimeSteps}>
            <li>
              <span>01</span>
              <div>
                <strong>Install the runtime</strong>
                <small>One setup for the full player</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Open SPICE locally</strong>
                <small>Playback stays on this PC</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Sign in if you want sync</strong>
                <small>Your local player works independently</small>
              </div>
            </li>
          </ol>

          <div className={styles.endpointCard}>
            <span>Local player address</span>
            <strong>localhost:3939</strong>
            <a href={LOCAL_RUNTIME_URL} aria-label="Open local SPICE at localhost port 3939">
              <ArrowIcon />
            </a>
          </div>
        </aside>
      </section>

      <section id="account" className={styles.accountSection} aria-label="Hosted account management">
        <div className={styles.sectionHeading}>
          <div>
            <span>Cloud account</span>
            <h2>Manage sync without opening the player</h2>
          </div>
          <p>
            Sign in, update your profile, and check account status here. Your media services stay
            on your computer.
          </p>
        </div>
        <CloudAccountPanel localRuntimeUrl={LOCAL_RUNTIME_URL} />
      </section>

      <details id="technical-details" className={styles.technicalDetails}>
        <summary>
          <span>
            <small>Under the hood</small>
            Technical runtime details
          </span>
          <i aria-hidden="true" />
        </summary>

        <section className={styles.operatingModel} aria-label="SPICE operating model">
          <div className={styles.sectionHeading}>
            <div>
              <span>Operating model</span>
              <h2>What stays online and what moved home</h2>
            </div>
          </div>
          <div className={styles.modelGrid}>
            {localModeLanes.map((lane) => (
              <article key={lane.name}>
                <span>{lane.status}</span>
                <h3>{lane.name}</h3>
                <p>{lane.scope}</p>
              </article>
            ))}
          </div>
          <div className={styles.routeStrip}>
            <span>{LOCAL_RUNTIME_URL}</span>
            <span>{CLOUD_ORIGIN}</span>
            <span>{INSTALL_ORIGIN}</span>
          </div>
        </section>

        <section className={styles.featureLedger} aria-label="Features changed by local mode">
          <div className={styles.sectionHeading}>
            <div>
              <span>Feature ledger</span>
              <h2>What had to change for local mode</h2>
            </div>
          </div>
          <div className={styles.ledgerList}>
            {localModeFeatureStatus.map((item) => (
              <article key={item.feature} className={styles.ledgerItem}>
                <div>
                  <span>{item.status}</span>
                  <h3>{item.feature}</h3>
                </div>
                <p>{item.reason}</p>
                <small>{item.replacement}</small>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.featureLedger} aria-label="Optional features and integrations">
          <div className={styles.sectionHeading}>
            <div>
              <span>QoL and integrations</span>
              <h2>What stays, what gets throttled, and what stays removed</h2>
            </div>
          </div>
          <div className={styles.ledgerList}>
            {localModeOptionalFeatureStatus.map((item) => (
              <article key={item.feature} className={styles.ledgerItem}>
                <div>
                  <span>{item.status}</span>
                  <h3>{item.feature}</h3>
                </div>
                <p>{item.reason}</p>
                <small>{item.operatingRule}</small>
              </article>
            ))}
          </div>
        </section>
      </details>
    </main>
  );
}
