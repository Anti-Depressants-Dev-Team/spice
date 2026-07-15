import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyListenTogetherSessionFailure,
  databaseErrorCode,
} from '../lib/listen-together-session-errors.ts';

test('Listen Together finds a database code through wrapped query errors', () => {
  const databaseError = Object.assign(new Error('raw database detail'), { code: '42p10' });
  const wrappedError = Object.assign(new Error('query failed'), { cause: databaseError });

  assert.equal(databaseErrorCode(wrappedError), '42P10');
});

test('Listen Together reports migration drift as a retryable safe error', () => {
  const rawMessage = 'there is no unique or exclusion constraint matching the ON CONFLICT specification';
  const failure = classifyListenTogetherSessionFailure(
    Object.assign(new Error('query failed'), {
      cause: Object.assign(new Error(rawMessage), { code: '42P10' }),
    }),
  );

  assert.deepEqual(failure, {
    error: 'listen_together_schema_unavailable',
    message: 'Listen Together is temporarily unavailable while its database update finishes. Please try again shortly.',
    status: 503,
    databaseCode: '42P10',
  });
  assert.equal(failure.message.includes(rawMessage), false);
});

test('Listen Together keeps unknown failures private', () => {
  assert.deepEqual(classifyListenTogetherSessionFailure(new Error('secret query detail')), {
    error: 'session_creation_failed',
    message: 'Listen Together could not start right now. Please try again.',
    status: 500,
    databaseCode: null,
  });
});
