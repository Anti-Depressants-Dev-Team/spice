import assert from 'node:assert/strict';
import test from 'node:test';

import { enableDatabaseIntegrationTests } from './database-test-helper.mjs';

test('database integration tests ignore an ambient DATABASE_URL', () => {
  const env = { DATABASE_URL: 'postgresql://production.example/spice' };

  assert.equal(enableDatabaseIntegrationTests(env), false);
  assert.equal(env.DATABASE_URL, 'postgresql://production.example/spice');
});

test('database integration tests map only the explicit test database URL', () => {
  const env = {
    DATABASE_URL: 'postgresql://production.example/spice',
    SPICE_TEST_DATABASE_URL: '  postgresql://test.example/spice_test  ',
  };

  assert.equal(enableDatabaseIntegrationTests(env), true);
  assert.equal(env.DATABASE_URL, 'postgresql://test.example/spice_test');
});
