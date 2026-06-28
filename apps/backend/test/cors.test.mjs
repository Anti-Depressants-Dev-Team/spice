import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonResponse, optionsResponse } from '../lib/cors.ts';

const allowedRequest = new Request('https://music.spice-app.xyz/api/test', {
  headers: { Origin: 'http://127.0.0.1:3939' },
});

test('optionsResponse returns a 204 response with allowlisted CORS headers', () => {
  const response = optionsResponse(allowedRequest);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3939');
  assert.equal(response.headers.get('vary'), 'Origin');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type, Range, Authorization');
  assert.equal(response.headers.get('access-control-expose-headers'), 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
});

test('optionsResponse omits wildcard CORS for untrusted origins', () => {
  const response = optionsResponse(new Request('https://music.spice-app.xyz/api/test', {
    headers: { Origin: 'https://evil.example' },
  }));

  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('jsonResponse returns JSON with allowlisted CORS headers', async () => {
  const body = { success: true };
  const response = jsonResponse(body, {}, allowedRequest);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3939');

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
  }, allowedRequest);

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('x-custom-header'), 'custom-value');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://example.com');
});
