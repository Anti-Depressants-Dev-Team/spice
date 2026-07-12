import type { Metadata } from 'next';
import Link from 'next/link';

import ChangelogView from './changelog-view';
import { getChangelogPayload } from './changelog-data';
import styles from './changelog.module.css';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'SPICE Changelog',
  description: 'Release notes for SPICE Music and the wider SPICE service stack.',
};

export default async function ChangelogPage() {
  const initialPayload = await getChangelogPayload('user');

  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.hero}>
        <nav className={styles.nav} aria-label="SPICE changelog navigation">
          <Link className={styles.brand} href="/" aria-label="Open SPICE home">
            <span className={styles.logoMark}>
              <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                <path d="M24 4 42 14.4v19.2L24 44 6 33.6V14.4L24 4Z" />
                <path d="M17.5 30.5c4.7 3.3 12.3 1.6 14.2-3.2 1.3-3.4-.1-6.7-4.1-9.7L22 13.4v8.7l-3.1-2.2c-2.5-1.8-5.4-.1-5.4 2.9 0 1.3.7 2.6 1.9 3.4l4.4 3.1c1.4 1 3 .6 3.9-.7.8-1.2.5-2.8-.7-3.7l-3.8-2.7c-.3-.2-.4-.5-.2-.8.2-.3.6-.4.9-.2l6.2 4.4c1.7 1.2 2.2 2.7 1.5 4-.9 1.8-4.6 2.4-7.4.5l-4.2-2.9-3.2 4.4 4.7 3.3Z" />
              </svg>
            </span>
            <span>SPICE</span>
          </Link>

          <div className={styles.navLinks}>
            <Link href="/">Home</Link>
            <a href="https://music.spice-app.xyz">Music</a>
          </div>
        </nav>

        <ChangelogView initialPayload={initialPayload} />
      </section>
    </main>
  );
}
