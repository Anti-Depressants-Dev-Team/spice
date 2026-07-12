import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  buildMovieEmbedUrl,
  getMovieProviderHomeUrl,
  normalizeTmdbMovieId,
} from '../lib/movie-provider';
import styles from './movie-player.module.css';

type MoviePlayerProps = {
  backHref: string;
  tmdbMovieId: string;
};

export default function MoviePlayer({ backHref, tmdbMovieId }: MoviePlayerProps) {
  const normalizedId = normalizeTmdbMovieId(tmdbMovieId);
  const embedUrl = buildMovieEmbedUrl(normalizedId);

  if (!normalizedId || !embedUrl) notFound();

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href={backHref}>
          <span className={styles.logoMark}>S</span>
          <span>
            SPICE
            <strong>Movie</strong>
          </span>
        </Link>

        <div className={styles.sourceMeta}>
          <span>TMDB {normalizedId}</span>
          <a href={getMovieProviderHomeUrl()} target="_blank" rel="noreferrer">
            VIDSrc source
          </a>
        </div>
      </header>

      <section className={styles.player} aria-label={`Movie player for TMDB title ${normalizedId}`}>
        <iframe
          src={embedUrl}
          title={`VIDSrc movie player for TMDB title ${normalizedId}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-forms allow-same-origin allow-scripts allow-presentation"
        />
      </section>
    </main>
  );
}
