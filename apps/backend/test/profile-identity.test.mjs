import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PROFILE_DISPLAY_NAME,
  mergeProfileAvatarUrl,
  mergeProfileDisplayName,
  mergeProfileUsername,
} from '../lib/profile-identity.ts';

test('profile identity keeps a meaningful local name over an uninitialized cloud name', () => {
  assert.equal(mergeProfileDisplayName('Yabosen', DEFAULT_PROFILE_DISPLAY_NAME, 'yabosen'), 'Yabosen');
});

test('profile identity prefers a meaningful cloud name after initialization', () => {
  assert.equal(mergeProfileDisplayName('Local Name', 'Cloud Name', 'listener'), 'Cloud Name');
});

test('profile identity falls back to the account username when both names are default', () => {
  assert.equal(mergeProfileDisplayName(DEFAULT_PROFILE_DISPLAY_NAME, DEFAULT_PROFILE_DISPLAY_NAME, '@yabosen'), 'yabosen');
});

test('profile identity preserves a local avatar only while cloud identity is uninitialized', () => {
  assert.equal(mergeProfileAvatarUrl('/avatars/local.webp', null, DEFAULT_PROFILE_DISPLAY_NAME), '/avatars/local.webp');
  assert.equal(mergeProfileAvatarUrl('/avatars/local.webp', '/avatars/cloud.webp', DEFAULT_PROFILE_DISPLAY_NAME), '/avatars/cloud.webp');
  assert.equal(mergeProfileAvatarUrl('/avatars/stale.webp', null, 'Cloud Name'), undefined);
});

test('profile username coalesces nullable cloud values before account fallback', () => {
  assert.equal(mergeProfileUsername(null, 'local-user', 'account-user', true), 'local-user');
  assert.equal(mergeProfileUsername(null, null, '@account-user', true), 'account-user');
  assert.equal(mergeProfileUsername('cloud-user', 'local-user', 'account-user', true), 'cloud-user');
});

test('profile username limits account fallback to the active profile', () => {
  assert.equal(mergeProfileUsername(null, null, 'account-user', false), null);
});

test('profile username persistence retains a derived value over a stored null', () => {
  assert.equal(mergeProfileUsername(null, 'derived-user', null, false), 'derived-user');
});
