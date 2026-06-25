import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonResponse, optionsResponse } from '../lib/cors.ts';

test('optionsResponse returns a 204 response with CORS headers', () => {
  const response = optionsResponse();
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, DELETE, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type, Range, Authorization');
  assert.equal(response.headers.get('access-control-expose-headers'), 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
});

test('jsonResponse returns a JSON response with CORS headers', async () => {
  const body = { success: true };
  const response = jsonResponse(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');

  const data = await response.json();
  assert.deepEqual(data, body);
});

test('jsonResponse merges provided headers with CORS headers', () => {
  const response = jsonResponse({ success: true }, {
    status: 201,
    headers: {
      'X-Custom-Header': 'custom-value',
      'Access-Control-Allow-Origin': 'https://example.com'
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('x-custom-header'), 'custom-value');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://example.com');
});
