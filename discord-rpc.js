/**
 * Discord RPC Module for Spice
 * Shows currently playing track in Discord status
 * Uses @xhayper/discord-rpc (maintained alternative to deprecated discord-rpc)
 */

const { Client } = require('@xhayper/discord-rpc');

// Spice Discord Application ID
const CLIENT_ID = '1463626551278174354';

let rpcClient = null;
let isConnected = false;
let reconnectTimer = null;
let currentTrack = null;

/**
 * Initialize Discord RPC connection
 */
async function connect() {
    if (rpcClient && isConnected) return;

    try {
        // Clean up any existing client
        if (rpcClient) {
            try {
                await rpcClient.destroy();
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        rpcClient = new Client({ clientId: CLIENT_ID });

        rpcClient.on('ready', () => {
            console.log('[Discord RPC] Connected as', rpcClient.user?.username || 'Unknown User');
            isConnected = true;

            // If there's a pending track, set it now
            if (currentTrack) {
                updatePresence(currentTrack);
            }
        });

        rpcClient.on('disconnected', () => {
            console.log('[Discord RPC] Disconnected');
            isConnected = false;
            // Try to reconnect after 10 seconds
            scheduleReconnect();
        });

        await rpcClient.login();
        console.log('[Discord RPC] Login successful');
    } catch (err) {
        console.error('[Discord RPC] Connection failed:', err.message);
        rpcClient = null;
        isConnected = false;
        // Retry connection after 30 seconds
        scheduleReconnect(30000);
    }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect(delay = 10000) {
    if (reconnectTimer) return;
    console.log(`[Discord RPC] Scheduling reconnect in ${delay / 1000}s...`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, delay);
}

/**
 * Update Discord presence with current track
 * @param {Object} track - { track, artist, album?, duration?, service }
 */
async function updatePresence(track) {
    // Store track for later if not connected yet
    currentTrack = track;

    if (!rpcClient || !isConnected) {
        // Try to connect if not connected
        console.log('[Discord RPC] Not connected, attempting to connect...');
        await connect();
        if (!isConnected) {
            console.log('[Discord RPC] Still not connected, presence will be set when connected');
            return;
        }
    }

    try {
        const serviceName = track.service === 'yt' ? 'YouTube Music' :
            track.service === 'sc' ? 'SoundCloud' : 'Spice';

        // Use album art if available, otherwise fall back to service icon
        const largeImage = track.albumArt ||
            (track.service === 'yt' ? 'youtube_music' :
                track.service === 'sc' ? 'soundcloud' : 'spice');

        // Ensure large text is at least 2 characters (Discord requirement)
        let largeText = track.album || serviceName;
        if (largeText.length < 2) {
            largeText = serviceName;
        }

        const activity = {
            type: 2, // 2 = Listening (shows "Listening to [app name]")
            details: track.track || 'Unknown Track',
            state: track.artist || 'Unknown Artist',
            largeImageKey: largeImage,
            largeImageText: largeText,
            smallImageKey: track.service === 'yt' ? 'youtube_music' :
                track.service === 'sc' ? 'soundcloud' : 'spice',
            smallImageText: serviceName,
            instance: false
        };

        // Handle Pause/Play State and Timestamps
        if (track.paused) {
            activity.smallImageText = 'Paused';
            // No timestamps when paused
        } else if (track.duration && track.duration > 0) {
            const now = Date.now();
            let startTime;

            // If we have currentTime, use it for accurate seeking
            if (track.currentTime !== undefined) {
                // Calculate when the song ostensibly started
                const computedStart = now - (track.currentTime * 1000);

                // STABLE TIMESTAMP LOGIC:
                // If we have a previous start time and the new one is within 2 seconds, keep the old one.
                // This prevents the timer from jittering due to small latency variations.
                if (rpcClient.lastStartTime && Math.abs(computedStart - rpcClient.lastStartTime) < 2000) {
                    startTime = rpcClient.lastStartTime;
                    // console.log('[Discord RPC] Stabilized timestamp');
                } else {
                    startTime = computedStart;
                    rpcClient.lastStartTime = startTime;
                    console.log(`[Discord RPC] New Start Time: ${new Date(startTime).toTimeString()} (Seek/New Track)`);
                }

                activity.startTimestamp = Math.floor(startTime);
                activity.endTimestamp = Math.floor(startTime + (track.duration * 1000));
            } else {
                // Fallback for initial load
                startTime = now;
                rpcClient.lastStartTime = startTime;
                activity.startTimestamp = now;
                activity.endTimestamp = now + (track.duration * 1000);
            }

            // Debug check for the "00:10" issue
            if (track.duration < 30) {
                console.log('[Discord RPC] WARNING: Very short duration detected:', track.duration);
            }
        }

        await rpcClient.user?.setActivity(activity);
        console.log('[Discord RPC] Updated:', track.track, 'by', track.artist, 'with art:', !!track.albumArt);
    } catch (err) {
        console.error('[Discord RPC] Failed to update presence:', err.message);
        // If setting activity failed, mark as disconnected and try to reconnect
        if (err.message.includes('Not connected') || err.message.includes('ECONNRESET')) {
            isConnected = false;
            scheduleReconnect(5000);
        }
    }
}

/**
 * Clear Discord presence
 */
async function clearPresence() {
    currentTrack = null;

    if (!rpcClient || !isConnected) return;

    try {
        await rpcClient.user?.clearActivity();
        console.log('[Discord RPC] Presence cleared');
    } catch (err) {
        console.error('[Discord RPC] Failed to clear presence:', err.message);
    }
}

/**
 * Disconnect from Discord RPC
 */
async function disconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    currentTrack = null;

    if (rpcClient) {
        try {
            await rpcClient.destroy();
        } catch (err) {
            // Ignore errors during disconnect
        }
        rpcClient = null;
        isConnected = false;
        console.log('[Discord RPC] Disconnected and cleaned up');
    }
}

/**
 * Check if connected
 */
function isRpcConnected() {
    return isConnected;
}

module.exports = {
    connect,
    disconnect,
    updatePresence,
    clearPresence,
    isConnected: isRpcConnected
};
