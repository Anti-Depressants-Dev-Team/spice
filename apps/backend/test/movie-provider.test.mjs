import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMovieEmbedUrl,
  getMovieProviderBaseUrl,
  normalizeTmdbMovieId,
} from '../lib/movie-provider.ts';

test('movie provider accepts positive numeric TMDB IDs only', () => {
  assert.equal(normalizeTmdbMovieId(' 533535 '), '533535');
  assert.equal(normalizeTmdbMovieId('0'), null);
  assert.equal(normalizeTmdbMovieId('-12'), null);
  assert.equal(normalizeTmdbMovieId('tt1234567'), null);
  assert.equal(normalizeTmdbMovieId('12345678901'), null);
});

test('movie provider builds the documented VIDSrc movie embed URL', () => {
  assert.equal(buildMovieEmbedUrl('533535'), 'https://vidsrc.sbs/embed/movie/533535');
  assert.equal(
    buildMovieEmbedUrl('603', 'https://player.example.test/spice'),
    'https://player.example.test/spice/embed/movie/603',
  );
});

test('movie provider rejects unsafe configured origins', () => {
  assert.equal(
    getMovieProviderBaseUrl('http://player.example.test').toString(),
    'https://vidsrc.sbs/',
  );
  assert.equal(
    getMovieProviderBaseUrl('https://user:password@player.example.test').toString(),
    'https://vidsrc.sbs/',
  );
});
