/**
 * Scrobbler Module for Spice
 * Handles Last.fm and ListenBrainz scrobbling
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

// Spice shared API credentials (registered by Anti-Depressants-Dev-Team)
const SPICE_LASTFM_API_KEY = '19776074f46f7067ee8c1e30e5e1ee98';
const SPICE_LASTFM_SECRET = '26ed0df4f07941cafac0ebc29709925d';

// API endpoints
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_AUTH_URL = 'https://www.last.fm/api/auth/';
const LISTENBRAINZ_API_URL = 'https://api.listenbrainz.org';

// Track state
let currentTrack = null;
let trackStartTime = null;
let scrobbleTimeout = null;

/**
 * Generate Last.fm API signature
 * @param {Object} params - Parameters to sign
 * @param {string} secret - API shared secret
 * @returns {string} MD5 signature
 */
function generateLastFmSignature(params, secret) {
    const keys = Object.keys(params).sort();
    let sigString = '';
    for (const key of keys) {
        sigString += key + params[key];
    }
    sigString += secret;
    return crypto.createHash('md5').update(sigString, 'utf8').digest('hex');
}

/**
 * Make Last.fm API call
 * @param {Object} params - API parameters
 * @param {string} secret - API shared secret (for signed calls)
 * @param {boolean} post - Use POST method
 * @returns {Promise<Object>} API response
 */
async function lastFmApiCall(params, secret = null, post = false) {
    const queryParams = { ...params, format: 'json' };

    if (secret) {
        queryParams.api_sig = generateLastFmSignature(params, secret);
    }

    let response;
    if (post) {
        const body = new URLSearchParams(queryParams);
        response = await fetch(LASTFM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
    } else {
        const url = `${LASTFM_API_URL}?${new URLSearchParams(queryParams)}`;
        response = await fetch(url);
    }

    return response.json();
}

/**
 * Get Last.fm authentication token
 * @param {string} apiKey - Last.fm API key
 * @param {string} secret - API shared secret
 * @returns {Promise<string>} Authentication token
 */
async function getLastFmToken(apiKey, secret) {
    const result = await lastFmApiCall({
        method: 'auth.getToken',
        api_key: apiKey
    }, secret);

    if (result.error) {
        throw new Error(result.message || 'Failed to get token');
    }

    return result.token;
}

/**
 * Get Last.fm authorization URL for user to visit
 * @param {string} apiKey - Last.fm API key
 * @param {string} token - Authentication token
 * @returns {string} Authorization URL
 */
function getLastFmAuthUrl(apiKey, token) {
    return `${LASTFM_AUTH_URL}?api_key=${apiKey}&token=${token}`;
}

/**
 * Get Last.fm session key after user authorization
 * @param {string} apiKey - Last.fm API key
 * @param {string} secret - API shared secret
 * @param {string} token - Authorized token
 * @returns {Promise<Object>} Session info with key and username
 */
async function getLastFmSession(apiKey, secret, token) {
    const result = await lastFmApiCall({
        method: 'auth.getSession',
        api_key: apiKey,
        token: token
    }, secret);

    if (result.error) {
        throw new Error(result.message || 'Failed to get session');
    }

    return {
        sessionKey: result.session.key,
        username: result.session.name
    };
}

/**
 * Update Now Playing on Last.fm
 * @param {Object} track - Track info { artist, track, album?, duration? }
 * @param {Object} credentials - { apiKey, secret, sessionKey }
 */
async function lastFmUpdateNowPlaying(track, credentials) {
    const params = {
        method: 'track.updateNowPlaying',
        api_key: credentials.apiKey,
        sk: credentials.sessionKey,
        artist: track.artist,
        track: track.track
    };

    if (track.album) params.album = track.album;
    if (track.duration) params.duration = Math.floor(track.duration);

    try {
        const result = await lastFmApiCall(params, credentials.secret, true);
        if (result.error) {
            console.error('[Last.fm] Now Playing error:', result.message);
            return false;
        }
        console.log('[Last.fm] Now Playing updated:', track.track);
        return true;
    } catch (err) {
        console.error('[Last.fm] Now Playing failed:', err);
        return false;
    }
}

/**
 * Scrobble track to Last.fm
 * @param {Object} track - Track info { artist, track, album?, duration?, timestamp }
 * @param {Object} credentials - { apiKey, secret, sessionKey }
 */
async function lastFmScrobble(track, credentials) {
    const params = {
        method: 'track.scrobble',
        api_key: credentials.apiKey,
        sk: credentials.sessionKey,
        artist: track.artist,
        track: track.track,
        timestamp: track.timestamp || Math.floor(Date.now() / 1000)
    };

    if (track.album) params.album = track.album;
    if (track.duration) params.duration = Math.floor(track.duration);

    try {
        const result = await lastFmApiCall(params, credentials.secret, true);
        if (result.error) {
            console.error('[Last.fm] Scrobble error:', result.message);
            return false;
        }
        console.log('[Last.fm] Scrobbled:', track.track);
        return true;
    } catch (err) {
        console.error('[Last.fm] Scrobble failed:', err);
        return false;
    }
}

/**
 * Submit listen to ListenBrainz
 * @param {Object} track - Track info { artist, track, album?, duration? }
 * @param {string} token - ListenBrainz user token
 * @param {string} listenType - 'playing_now' or 'single'
 * @param {number} timestamp - Unix timestamp (for 'single' type)
 */
async function listenBrainzSubmit(track, token, listenType = 'single', timestamp = null) {
    const payload = {
        listen_type: listenType,
        payload: [{
            track_metadata: {
                artist_name: track.artist,
                track_name: track.track
            }
        }]
    };

    if (track.album) {
        payload.payload[0].track_metadata.release_name = track.album;
    }

    if (track.duration) {
        payload.payload[0].track_metadata.additional_info = {
            duration_ms: Math.floor(track.duration * 1000)
        };
    }

    if (listenType === 'single' && timestamp) {
        payload.payload[0].listened_at = timestamp;
    }

    try {
        const response = await fetch(`${LISTENBRAINZ_API_URL}/1/submit-listens`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[ListenBrainz] Submit error:', error);
            return false;
        }

        console.log(`[ListenBrainz] ${listenType === 'playing_now' ? 'Now Playing' : 'Scrobbled'}:`, track.track);
        return true;
    } catch (err) {
        console.error('[ListenBrainz] Submit failed:', err);
        return false;
    }
}

/**
 * Validate ListenBrainz token
 * @param {string} token - User token
 * @returns {Promise<Object>} { valid: boolean, username?: string }
 */
async function validateListenBrainzToken(token) {
    try {
        const response = await fetch(`${LISTENBRAINZ_API_URL}/1/validate-token`, {
            headers: { 'Authorization': `Token ${token}` }
        });

        const data = await response.json();
        return {
            valid: data.valid === true,
            username: data.user_name || null
        };
    } catch (err) {
        console.error('[ListenBrainz] Token validation failed:', err);
        return { valid: false };
    }
}

/**
 * Scrobbler class - manages scrobbling state
 */
class Scrobbler {
    constructor(store) {
        this.store = store;
        this.currentTrack = null;
        this.trackStartTime = null;
        this.hasScrobbled = false;
        this.lastScrobbledTrack = null;
        this.pendingToken = null; // For Last.fm auth flow
    }

    /**
     * Get scrobbler settings
     */
    getSettings() {
        return {
            lastfm: {
                enabled: this.store.get('lastfm.enabled', false),
                // Use shared Spice API key by default
                apiKey: SPICE_LASTFM_API_KEY,
                secret: SPICE_LASTFM_SECRET,
                sessionKey: this.store.get('lastfm.sessionKey', ''),
                username: this.store.get('lastfm.username', '')
            },
            listenbrainz: {
                enabled: this.store.get('listenbrainz.enabled', false),
                token: this.store.get('listenbrainz.token', ''),
                username: this.store.get('listenbrainz.username', '')
            }
        };
    }

    /**
     * Save Last.fm credentials
     */
    saveLastFmCredentials(apiKey, secret) {
        this.store.set('lastfm.apiKey', apiKey);
        this.store.set('lastfm.secret', secret);
    }

    /**
     * Save Last.fm session
     */
    saveLastFmSession(sessionKey, username) {
        this.store.set('lastfm.sessionKey', sessionKey);
        this.store.set('lastfm.username', username);
    }

    /**
     * Enable/disable Last.fm
     */
    setLastFmEnabled(enabled) {
        this.store.set('lastfm.enabled', enabled);
    }

    /**
     * Save ListenBrainz token
     */
    async saveListenBrainzToken(token) {
        const validation = await validateListenBrainzToken(token);
        this.store.set('listenbrainz.token', token);
        this.store.set('listenbrainz.username', validation.username || '');
        return validation;
    }

    /**
     * Enable/disable ListenBrainz
     */
    setListenBrainzEnabled(enabled) {
        this.store.set('listenbrainz.enabled', enabled);
    }

    /**
     * Disconnect Last.fm (clear session)
     */
    disconnectLastFm() {
        this.store.delete('lastfm.sessionKey');
        this.store.delete('lastfm.username');
    }

    /**
     * Disconnect ListenBrainz
     */
    disconnectListenBrainz() {
        this.store.delete('listenbrainz.token');
        this.store.delete('listenbrainz.username');
        this.store.set('listenbrainz.enabled', false);
    }

    /**
     * Start Last.fm authentication flow
     * @returns {Promise<string>} Auth URL to open
     */
    async startLastFmAuth() {
        // Use shared Spice API credentials
        this.pendingToken = await getLastFmToken(SPICE_LASTFM_API_KEY, SPICE_LASTFM_SECRET);
        return getLastFmAuthUrl(SPICE_LASTFM_API_KEY, this.pendingToken);
    }

    /**
     * Complete Last.fm authentication after user authorizes
     * @returns {Promise<Object>} Session info
     */
    async completeLastFmAuth() {
        if (!this.pendingToken) {
            throw new Error('No pending authentication');
        }

        const settings = this.getSettings();
        const session = await getLastFmSession(
            settings.lastfm.apiKey,
            settings.lastfm.secret,
            this.pendingToken
        );

        this.saveLastFmSession(session.sessionKey, session.username);
        this.pendingToken = null;

        return session;
    }

    /**
     * Check if track is the same as last scrobbled
     */
    isSameTrack(track) {
        if (!this.lastScrobbledTrack) return false;
        return this.lastScrobbledTrack.artist === track.artist &&
            this.lastScrobbledTrack.track === track.track;
    }

    /**
     * Update now playing for both services
     */
    async updateNowPlaying(track) {
        // Check if this is a new track or a repeat
        const isNewTrack = !this.currentTrack ||
            this.currentTrack.artist !== track.artist ||
            this.currentTrack.track !== track.track;

        if (!isNewTrack && !track.isRepeat) {
            // Only skip if it's the same track and NOT a repeat event
            return;
        }

        this.currentTrack = track;
        this.trackStartTime = Date.now();
        this.hasScrobbled = false; // Reset for new track

        // If it's a repeat, clear the last scrobbled track so it can be scrobbled again
        if (track.isRepeat) {
            this.lastScrobbledTrack = null;
            console.log('[Scrobbler] Track repeat detected, resetting scrobble state');
        }

        console.log('[Scrobbler] Now Playing:', track.artist, '-', track.track, track.isRepeat ? '(Repeat)' : '');

        const settings = this.getSettings();

        // Last.fm Now Playing
        if (settings.lastfm.enabled && settings.lastfm.sessionKey) {
            lastFmUpdateNowPlaying(track, {
                apiKey: settings.lastfm.apiKey,
                secret: settings.lastfm.secret,
                sessionKey: settings.lastfm.sessionKey
            });
        }

        // ListenBrainz Now Playing
        if (settings.listenbrainz.enabled && settings.listenbrainz.token) {
            listenBrainzSubmit(track, settings.listenbrainz.token, 'playing_now');
        }

        // Timer-based scrobbling removed in favor of progress-based triggering
    }

    /**
     * Update progress and trigger scrobble if threshold met
     * @param {number} currentTime - Current track progress in seconds
     * @param {number} duration - Track duration in seconds
     */
    updateProgress(currentTime, duration) {
        if (!this.currentTrack || this.hasScrobbled) return;

        // Ensure we have a valid duration
        const trackDuration = duration || this.currentTrack.duration || 180;

        // Scrobble Threshold: 50% or 4 minutes (240s), whichever is smaller.
        // Also enforce minimum 30s playback.
        const threshold = Math.min(trackDuration * 0.5, 240);

        // Check if passed threshold (and at least 30s)
        if (currentTime > threshold && currentTime > 30) {
            console.log(`[Scrobbler] Threshold reached (${currentTime.toFixed(1)}s > ${threshold.toFixed(1)}s). Scrobbling...`);
            this.scrobbleCurrentTrack();
        }
    }

    /**
     * Scrobble the current track
     */
    async scrobbleCurrentTrack() {
        if (!this.currentTrack || this.hasScrobbled) return;

        // Avoid duplicate scrobbles
        if (this.isSameTrack(this.currentTrack) && !this.currentTrack.isRepeat) {
            console.log('[Scrobbler] Already scrobbled this track, skipping');
            this.hasScrobbled = true; // Mark as done to stop checking
            return;
        }

        const settings = this.getSettings();
        const timestamp = Math.floor(this.trackStartTime / 1000);
        const track = { ...this.currentTrack, timestamp };

        console.log('[Scrobbler] Scrobbling:', track.artist, '-', track.track);
        this.hasScrobbled = true; // Mark as scrobbled immediately to prevent double submissions

        // Last.fm Scrobble
        if (settings.lastfm.enabled && settings.lastfm.sessionKey) {
            const success = await lastFmScrobble(track, {
                apiKey: settings.lastfm.apiKey,
                secret: settings.lastfm.secret,
                sessionKey: settings.lastfm.sessionKey
            });
            if (success) {
                this.lastScrobbledTrack = { ...track };
            }
        }

        // ListenBrainz Scrobble
        if (settings.listenbrainz.enabled && settings.listenbrainz.token) {
            const success = await listenBrainzSubmit(
                track,
                settings.listenbrainz.token,
                'single',
                timestamp
            );
            if (success) {
                this.lastScrobbledTrack = { ...track };
            }
        }
    }

    /**
     * Handle track end/pause
     */
    onTrackEnd() {
        // Nothing needed for progress-based approach
    }
}

module.exports = {
    Scrobbler,
    validateListenBrainzToken
};
