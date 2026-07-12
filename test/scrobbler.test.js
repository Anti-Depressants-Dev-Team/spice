const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

class MemoryStore {
    constructor(initial = {}) {
        this.values = new Map(Object.entries(initial));
    }

    get(key, fallback) {
        return this.values.has(key) ? this.values.get(key) : fallback;
    }

    set(key, value) {
        this.values.set(key, value);
    }

    delete(key) {
        this.values.delete(key);
    }
}

const requests = [];
const fakeFetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });

    if (String(url).includes('/1/validate-token')) {
        const valid = options.headers.Authorization === 'Token valid-token';
        return {
            json: async () => valid
                ? { valid: true, user_name: 'alice' }
                : { valid: false }
        };
    }

    return {
        json: async () => ({ token: 'lastfm-token' })
    };
};

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
    if (request === 'node-fetch' && parent?.filename?.endsWith('scrobbler.js')) {
        return fakeFetch;
    }
    return originalLoad.call(this, request, parent, isMain);
};

let Scrobbler;
try {
    ({ Scrobbler } = require('../scrobbler'));
} finally {
    Module._load = originalLoad;
}

test('getSettings uses stored Last.fm credentials with shared fallbacks', () => {
    const custom = new Scrobbler(new MemoryStore({
        'lastfm.apiKey': 'custom-key',
        'lastfm.secret': 'custom-secret'
    })).getSettings();
    const defaults = new Scrobbler(new MemoryStore()).getSettings();

    assert.equal(custom.lastfm.apiKey, 'custom-key');
    assert.equal(custom.lastfm.secret, 'custom-secret');
    assert.match(defaults.lastfm.apiKey, /^[a-f0-9]{32}$/);
    assert.match(defaults.lastfm.secret, /^[a-f0-9]{32}$/);
});

test('incomplete custom Last.fm credentials fall back as a pair', () => {
    const partial = new Scrobbler(new MemoryStore({
        'lastfm.apiKey': 'custom-key'
    })).getSettings();

    assert.notEqual(partial.lastfm.apiKey, 'custom-key');
    assert.match(partial.lastfm.apiKey, /^[a-f0-9]{32}$/);
    assert.match(partial.lastfm.secret, /^[a-f0-9]{32}$/);
});

test('invalid ListenBrainz tokens do not replace persisted credentials', async () => {
    const store = new MemoryStore({
        'listenbrainz.token': 'existing-token',
        'listenbrainz.username': 'existing-user'
    });
    const scrobbler = new Scrobbler(store);

    const validation = await scrobbler.saveListenBrainzToken('invalid-token');

    assert.deepEqual(validation, { valid: false, username: null });
    assert.equal(store.get('listenbrainz.token'), 'existing-token');
    assert.equal(store.get('listenbrainz.username'), 'existing-user');
});

test('valid ListenBrainz tokens are persisted after validation', async () => {
    const store = new MemoryStore();
    const scrobbler = new Scrobbler(store);

    const validation = await scrobbler.saveListenBrainzToken('valid-token');

    assert.deepEqual(validation, { valid: true, username: 'alice' });
    assert.equal(store.get('listenbrainz.token'), 'valid-token');
    assert.equal(store.get('listenbrainz.username'), 'alice');
});

test('Last.fm authentication starts with stored custom credentials', async () => {
    requests.length = 0;
    const scrobbler = new Scrobbler(new MemoryStore({
        'lastfm.apiKey': 'custom-key',
        'lastfm.secret': 'custom-secret'
    }));

    const authUrl = await scrobbler.startLastFmAuth();

    assert.equal(
        authUrl,
        'https://www.last.fm/api/auth/?api_key=custom-key&token=lastfm-token'
    );
    assert.match(requests[0].url, /api_key=custom-key/);
});
