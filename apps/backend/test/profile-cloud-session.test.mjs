import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountBoundProfiles,
  isHydratedCloudToken,
  readCloudSessionFromStorage,
} from '../lib/profile-cloud-session.ts';

function storage(values) {
  return {
    getItem(key) {
      return Object.hasOwn(values, key) ? values[key] : null;
    },
  };
}

test('cloud tokens cannot start sync before profile hydration completes', () => {
  assert.equal(isHydratedCloudToken(false, 'native-token'), false);
  assert.equal(isHydratedCloudToken(true, null), false);
  assert.equal(isHydratedCloudToken(true, 'native-token'), true);
});

test('active profile cloud sessions take precedence over the Native fallback', () => {
  const result = readCloudSessionFromStorage(storage({
    spice_active_profile_id: 'default',
    spice_profiles_list: JSON.stringify([{
      id: 'default',
      cloudToken: 'profile-token',
      cloudUser: { email: 'profile@example.com' },
      cloudUsername: 'profile-user',
    }]),
    spice_cloud_token: 'native-token',
    spice_cloud_user: JSON.stringify({ email: 'native@example.com' }),
  }), 'default');

  assert.deepEqual(result, {
    token: 'profile-token',
    user: { email: 'profile@example.com' },
    username: 'profile-user',
  });
});

test('Native account session fills an active profile with no saved cloud session', () => {
  const result = readCloudSessionFromStorage(storage({
    spice_profiles_list: JSON.stringify([{ id: 'default', cloudToken: null, cloudUser: null }]),
    spice_cloud_token: 'native-token',
    spice_cloud_user: JSON.stringify({ email: 'native@example.com', username: 'native-user' }),
  }), 'default');

  assert.deepEqual(result, {
    token: 'native-token',
    user: { email: 'native@example.com', username: 'native-user' },
    username: 'native-user',
  });
});

test('Native fallback stays bound to its profile instead of signing in another local profile', () => {
  const values = {
    spice_profiles_list: JSON.stringify([
      { id: 'default', cloudToken: null, cloudUser: null },
      { id: 'profile_sigma', cloudToken: null, cloudUser: null },
    ]),
    spice_cloud_profile_id: 'default',
    spice_cloud_token: 'native-token',
    spice_cloud_user: JSON.stringify({ id: 'account-1', username: 'callmeryan' }),
  };

  assert.deepEqual(
    readCloudSessionFromStorage(storage(values), 'profile_sigma'),
    { token: null, user: null, username: null },
  );
  assert.equal(readCloudSessionFromStorage(storage(values), 'default').token, 'native-token');
});

test('only profiles carrying a session for the active account are cloud synced', () => {
  const profiles = [
    { id: 'default', cloudToken: 'token-a', cloudUser: { id: 'account-1' } },
    { id: 'alt', cloudToken: 'token-b', cloudUser: { id: 'account-1' } },
    { id: 'sigma', cloudToken: null, cloudUser: null },
    { id: 'other', cloudToken: 'token-c', cloudUser: { id: 'account-2' } },
  ];

  assert.deepEqual(
    accountBoundProfiles(profiles, 'token-a', 'account-1').map((profile) => profile.id),
    ['default', 'alt'],
  );
});

test('profile account snapshot supplies its username when the legacy profile field is empty', () => {
  const result = readCloudSessionFromStorage(storage({
    spice_active_profile_id: 'default',
    spice_profiles_list: JSON.stringify([{
      id: 'default',
      cloudToken: 'profile-token',
      cloudUser: { email: 'profile@example.com', username: 'profile-user' },
      cloudUsername: null,
    }]),
  }), 'default');

  assert.deepEqual(result, {
    token: 'profile-token',
    user: { email: 'profile@example.com', username: 'profile-user' },
    username: 'profile-user',
  });
});

test('profile and Native account fields are never combined across sessions', () => {
  const result = readCloudSessionFromStorage(storage({
    spice_profiles_list: JSON.stringify([{ id: 'default', cloudToken: 'profile-token', cloudUser: null }]),
    spice_cloud_token: 'native-token',
    spice_cloud_user: JSON.stringify({ email: 'native@example.com', username: 'native-user' }),
  }), 'default');

  assert.deepEqual(result, { token: 'profile-token', user: null, username: null });
});

test('malformed profile storage still preserves the Native account session', () => {
  const result = readCloudSessionFromStorage(storage({
    spice_profiles_list: '{not-json',
    spice_cloud_token: 'native-token',
    spice_cloud_user: '{not-json',
  }), 'default');

  assert.deepEqual(result, { token: 'native-token', user: null, username: null });
});
