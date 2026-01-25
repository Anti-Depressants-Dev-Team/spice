/**
 * Discord RPC Module for Spice
 * Clean implementation with user's registered Application ID
 */

const { Client } = require('@xhayper/discord-rpc');

// User's registered Spice Discord Application ID
const CLIENT_ID = '1464831676877111489';

let client = null;
let isReady = false;
let currentTrack = null;
let reconnectTimeout = null;

/**
 * Initialize and connect to Discord
 */
async function connect() {
    if (client && isReady) {
        return;
    }

    // Clean up existing client
    if (client) {
        try {
            await client.destroy();
        } catch (e) { }
        client = null;
        isReady = false;
    }

    try {
        console.log('[Discord RPC] Connecting...');

        client = new Client({ clientId: CLIENT_ID });

        client.on('ready', () => {
            console.log('[Discord RPC] ✓ CONNECTED! User:', client.user?.username);
            isReady = true;

            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }

            if (currentTrack) {
                setActivity(currentTrack);
            }
        });

        client.on('disconnected', () => {
            console.log('[Discord RPC] Disconnected');
            isReady = false;
            scheduleReconnect(15000);
        });

        await client.login();
        console.log('[Discord RPC] Login successful');

    } catch (err) {
        console.error('[Discord RPC] Error:', err.message);
        isReady = false;
        client = null;
        scheduleReconnect(30000);
    }
}

function scheduleReconnect(delay) {
    if (reconnectTimeout) return;

    console.log(`[Discord RPC] Retry in ${delay / 1000}s...`);
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect();
    }, delay);
}

async function setActivity(track) {
    currentTrack = track;

    if (!client || !isReady) return;

    try {
        const serviceName = track.service === 'yt' ? 'YouTube Music' :
            track.service === 'sc' ? 'SoundCloud' : 'Spice';

        const activity = {
            type: 2, // Listening
            details: (track.track || 'Unknown Track').substring(0, 128),
            state: (track.artist || 'Unknown Artist').substring(0, 128),
            largeImageKey: track.albumArt || 'spice',
            largeImageText: ((track.album || serviceName) || serviceName).substring(0, 128),
            smallImageKey: 'spice',
            smallImageText: track.paused ? 'Paused' : serviceName,
            instance: false
        };

        if (!track.paused && track.duration && track.duration > 0) {
            const now = Date.now();
            const startTime = track.currentTime !== undefined
                ? now - (track.currentTime * 1000)
                : now;

            activity.startTimestamp = Math.floor(startTime);
            activity.endTimestamp = Math.floor(startTime + (track.duration * 1000));
        }

        await client.user?.setActivity(activity);

    } catch (err) {
        console.error('[Discord RPC] Activity error:', err.message);
        if (err.message?.includes('Not connected')) {
            isReady = false;
            scheduleReconnect(5000);
        }
    }
}

function updatePresence(track) {
    return setActivity(track);
}

async function clearPresence() {
    currentTrack = null;
    if (client && isReady) {
        try {
            await client.user?.clearActivity();
        } catch (e) { }
    }
}

async function disconnect() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    currentTrack = null;
    isReady = false;
    if (client) {
        try {
            await client.destroy();
        } catch (e) { }
        client = null;
    }
}

// Auto-connect on load
connect();

module.exports = {
    connect,
    disconnect,
    updatePresence,
    setActivity,
    clearPresence
};
