import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildServiceChangelogPayload,
  parseChangelog,
  readWalkthrough,
} from '../app/changelog/changelog-data.ts';

test('service changelog hides admin operations notes for normal accounts', () => {
  const payload = buildServiceChangelogPayload(
    [
      {
        version: 'v1.0.0',
        notes: [
          'Add account-level roles with `user` and `admin` support.',
          'Add a host-specific Spice Anime starter frontend.',
          'Add a host-specific Spice Movie starter frontend.',
          'Improve player playback recovery for SPICE Music.',
        ],
      },
    ],
    'user',
  );

  assert.equal(payload.accountRole, 'user');
  assert.equal(payload.services.some((service) => service.id === 'admin'), false);
  assert.equal(payload.lockedServices.some((service) => service.id === 'admin'), true);
  assert.equal(JSON.stringify(payload).includes('account-level roles'), false);
  assert.ok(payload.services.find((service) => service.id === 'anime'));
  assert.ok(payload.services.find((service) => service.id === 'movie'));
  assert.ok(payload.services.find((service) => service.id === 'music'));
});

test('service changelog includes admin operations notes for admin accounts', () => {
  const payload = buildServiceChangelogPayload(
    [
      {
        version: 'v1.0.0',
        notes: [
          'Add account-level roles with `user` and `admin` support.',
          'Add a host-specific Spice Anime starter frontend.',
        ],
      },
    ],
    'admin',
  );

  const adminService = payload.services.find((service) => service.id === 'admin');

  assert.equal(payload.accountRole, 'admin');
  assert.deepEqual(payload.lockedServices, []);
  assert.ok(adminService);
  assert.equal(adminService?.entries[0]?.notes[0], 'Add account-level roles with `user` and `admin` support.');
});

test('walkthrough parser keeps release entries in file order', () => {
  const entries = parseChangelog(`
## v2.0.0

- Ship Music update.

## v1.0.0

- Ship Anime update.
`);

  assert.deepEqual(entries, [
    { version: 'v2.0.0', notes: ['Ship Music update.'] },
    { version: 'v1.0.0', notes: ['Ship Anime update.'] },
  ]);
});

test('readWalkthrough reads the packaged public changelog', async () => {
  const walkthrough = await readWalkthrough();

  assert.match(walkthrough, /^# SPICE Walkthrough\s+## v1\.0\.136/m);
});
