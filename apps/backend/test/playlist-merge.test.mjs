import assert from 'node:assert/strict';
import test from 'node:test';

import { mergePlaylistOccurrences } from '../app/playlist-merge.ts';

test('playlist sync preserves duplicate occurrences and their order', () => {
  const remote = [
    { id: 'a', title: 'Remote A' },
    { id: 'b', title: 'Remote B' },
    { id: 'a', title: 'Remote A duplicate' },
  ];
  const local = [
    { id: 'a', title: 'Local A' },
    { id: 'a', title: 'Local A duplicate' },
  ];

  const merged = mergePlaylistOccurrences(
    remote,
    local,
    (track) => track.id,
    (preferred, incoming) => ({ ...preferred, title: incoming.title }),
  );

  assert.deepEqual(merged.map((track) => track.id), ['a', 'b', 'a']);
  assert.equal(merged[1].title, 'Remote B');
});

test('playlist sync keeps the greater occurrence count from either side', () => {
  const local = [{ id: 'a' }, { id: 'a' }, { id: 'a' }];
  const remote = [{ id: 'a' }, { id: 'a' }];
  assert.equal(mergePlaylistOccurrences(local, remote, (track) => track.id, (left) => left).length, 3);
});
