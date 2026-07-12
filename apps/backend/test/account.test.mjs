import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getInitialAccountRoleForEmail,
  hasActiveSubscription,
  isAdminAccount,
  normalizeAccountRole,
  serializeAccount,
  serializeSubscription,
} from '../lib/account.ts';

test('account roles normalize to user unless explicitly admin', () => {
  assert.equal(normalizeAccountRole('admin'), 'admin');
  assert.equal(normalizeAccountRole('user'), 'user');
  assert.equal(normalizeAccountRole('banned'), 'banned');
  assert.equal(normalizeAccountRole('owner'), 'user');
  assert.equal(isAdminAccount({ accountRole: 'admin' }), true);
  assert.equal(isAdminAccount({ accountRole: 'user' }), false);
});

test('configured admin emails bootstrap new admin accounts', () => {
  assert.equal(getInitialAccountRoleForEmail('Owner@Example.com', 'owner@example.com, ops@example.com'), 'admin');
  assert.equal(getInitialAccountRoleForEmail('listener@example.com', 'owner@example.com, ops@example.com'), 'user');
  assert.equal(getInitialAccountRoleForEmail('owner@example.com', ''), 'user');
});

test('account serialization includes role and default free subscription snapshot', () => {
  assert.deepEqual(
    serializeAccount({ id: 'user-1', email: 'listener@example.com', username: 'listener', accountRole: null }),
    {
      id: 'user-1',
      email: 'listener@example.com',
      username: 'listener',
      accountRole: 'user',
      isAdmin: false,
      subscription: {
        tier: 'free',
        status: 'inactive',
        provider: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isActive: false,
      },
    },
  );
});

test('subscription serialization preserves future plan codes and active state', () => {
  const subscription = serializeSubscription({
    tier: 'family_plus',
    status: 'active',
    provider: 'stripe',
    currentPeriodEnd: '2999-01-01T00:00:00.000Z',
    cancelAtPeriodEnd: true,
  });

  assert.equal(subscription.tier, 'family_plus');
  assert.equal(subscription.status, 'active');
  assert.equal(subscription.provider, 'stripe');
  assert.equal(subscription.cancelAtPeriodEnd, true);
  assert.equal(subscription.isActive, true);
});

test('expired or inactive subscriptions are not active entitlements', () => {
  assert.equal(hasActiveSubscription({ status: 'active', currentPeriodEnd: '2000-01-01T00:00:00.000Z' }), false);
  assert.equal(hasActiveSubscription({ status: 'inactive', currentPeriodEnd: null }), false);
});
