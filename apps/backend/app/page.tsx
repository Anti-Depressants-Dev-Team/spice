import MusicTester from './music-tester';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Spice music test</h1>
        <p>
          Search YouTube Music through the backend <code>youtubei.js</code>{' '}
          provider and play selections in YouTube&apos;s embedded player.
        </p>
      </header>
      <MusicTester />
    </main>
  );
}
