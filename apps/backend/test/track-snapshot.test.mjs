import assert from 'node:assert/strict';
import test from 'node:test';

import { trackSnapshotColumns, trackSnapshotFromRow } from '../lib/track-snapshot.ts';

test('trackSnapshotColumns maps undefined track', () => {
  const result = trackSnapshotColumns(undefined, '123');
  assert.deepEqual(result, {
    title: 'Track',
    artistsJson: '[]',
    artworkUrl: null,
    durationMs: null,
  });
});

test('trackSnapshotColumns maps empty track', () => {
  const result = trackSnapshotColumns({ id: '1' }, '123');
  assert.deepEqual(result, {
    title: 'Track',
    artistsJson: '[]',
    artworkUrl: null,
    durationMs: null,
  });
});

test('trackSnapshotColumns trims title', () => {
  const result = trackSnapshotColumns({ id: '1', title: '  My Title  ' }, '123');
  assert.equal(result.title, 'My Title');
});

test('trackSnapshotColumns maps and rounds durationMs', () => {
  const result = trackSnapshotColumns({ id: '1', durationMs: 1234.56 }, '123');
  assert.equal(result.durationMs, 1235);
});

test('trackSnapshotColumns sanitizes artists', () => {
  const result = trackSnapshotColumns({
    id: '1',
    artists: [
      { id: '1', name: 'Artist 1' },
      { name: 'Artist 2' },
      { id: '3' },
      null,
      undefined,
      { name: '  ' },
      { id: '4', name: 'Artist 4', artworkUrl: 'http://example.com/art.jpg' },
    ],
  }, '123');

  assert.equal(result.artistsJson, JSON.stringify([
    { id: '1', name: 'Artist 1' },
    { id: 'Artist 2', name: 'Artist 2' },
    { id: '4', name: 'Artist 4', artworkUrl: 'http://example.com/art.jpg' },
  ]));
});

test('trackSnapshotFromRow maps complete row', () => {
  const result = trackSnapshotFromRow({
    trackId: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artistsJson: JSON.stringify([{ id: '2', name: 'Row Artist' }]),
    artworkUrl: 'http://example.com/row.jpg',
    durationMs: 999,
  });

  assert.deepEqual(result, {
    id: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artists: [{ id: '2', name: 'Row Artist' }],
    artworkUrl: 'http://example.com/row.jpg',
    durationMs: 999,
  });
});

test('trackSnapshotFromRow handles empty artistsJson', () => {
  const result = trackSnapshotFromRow({
    trackId: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artistsJson: '[]',
    artworkUrl: null,
    durationMs: null,
  });

  assert.deepEqual(result, {
    id: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artists: [],
  });
});

test('trackSnapshotFromRow handles invalid artistsJson', () => {
  const result = trackSnapshotFromRow({
    trackId: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artistsJson: 'invalid json',
    artworkUrl: null,
    durationMs: null,
  });

  assert.deepEqual(result, {
    id: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artists: [],
  });
});

test('trackSnapshotFromRow sanitizes parsed artists', () => {
  const result = trackSnapshotFromRow({
    trackId: '1',
    sourceId: 'src-1',
    title: 'Row Title',
    artistsJson: JSON.stringify([{ name: 'Sanitized' }, { id: '3' }]),
    artworkUrl: null,
    durationMs: null,
  });

  assert.deepEqual(result.artists, [
    { id: 'Sanitized', name: 'Sanitized' }
  ]);
});
