import assert from 'node:assert/strict';
import test from 'node:test';

import { isHydratedCloudToken, readCloudSessionFromStorage } from '../lib/profile-cloud-session.ts';

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
