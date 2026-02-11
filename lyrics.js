// Basic Lyrics Logic using lrclib.net

let currentTrack = null;
let currentLyrics = [];
let isStaticMode = false;

const titleEl = document.getElementById('track-title');
const artistEl = document.getElementById('track-artist');
const containerEl = document.getElementById('lyrics-container');
const modeBtn = document.getElementById('mode-btn');
const iconSync = document.getElementById('icon-sync');
const iconStatic = document.getElementById('icon-static');
const providerSelect = document.getElementById('provider-select');

// Window Controls
document.getElementById('close-btn').addEventListener('click', () => {
    window.close();
});

// Mode Toggle
modeBtn.addEventListener('click', () => {
    // If not using LRCLIB, mode is forced to Static
    if (providerSelect.value !== 'lrclib') return;

    isStaticMode = !isStaticMode;
    updateModeUI();
});

// Provider Change
providerSelect.addEventListener('change', () => {
    console.log('Provider changed to:', providerSelect.value);

    // Auto switch mode UI
    if (providerSelect.value !== 'lrclib') {
        // Enforce static mode for non-synced providers
        isStaticMode = true;
        updateModeUI();
        modeBtn.style.opacity = '0.3';
        modeBtn.style.pointerEvents = 'none';
        modeBtn.title = "Sync unavailable for this provider";
    } else {
        // Re-enable toggle
        isStaticMode = false;
        updateModeUI();
        modeBtn.style.opacity = '1';
        modeBtn.style.pointerEvents = 'auto';
        modeBtn.title = "Toggle Sync/Static";
    }

    // Force refresh with new provider
    if (currentTrack) {
        updateLyrics(currentTrack, true); // true = force refresh
    }
});

function updateModeUI() {
    if (isStaticMode) {
        iconSync.style.display = 'none';
        iconStatic.style.display = 'block';
        modeBtn.title = "Switch to Synced (Animated)";
        containerEl.classList.add('static-mode');
        // Remove active class from all lines
        document.querySelectorAll('.lyric-line').forEach(l => l.classList.remove('active'));
    } else {
        iconSync.style.display = 'block';
        iconStatic.style.display = 'none';
        modeBtn.title = "Switch to Static (Text)";
        containerEl.classList.remove('static-mode');
        // Trigger sync immediately if we have a track
        if (currentTrack) {
            // We need current time. 
            // We can't get it easily here without waiting for next update, 
            // OR we could store last known time.
        }
    }
}

// Initial load
(async () => {
    containerEl.innerHTML = '<div style="color: #666;">Initializing...</div>';

    if (!window.api) {
        containerEl.innerHTML = '<div style="color: red;">Error: API not found</div>';
        return;
    }

    try {
        const track = await window.api.getNowPlaying();
        if (track) {
            containerEl.innerHTML = `<div style="color: #888;">Track found: ${track.title}</div>`;
            updateLyrics(track);
        } else {
            containerEl.innerHTML = '<div style="color: #666;">No track playing yet...</div>';
        }
    } catch (e) {
        containerEl.innerHTML = `<div style="color: red;">Error getting track: ${e.message}</div>`;
    }
})();

// Listen for track updates from Main process
if (window.api && window.api.onLyricsTrackUpdate) {
    window.api.onLyricsTrackUpdate(async (track) => {
        updateLyrics(track);
    });
}

// Enable live syncing via IPC
if (window.api && window.api.onLyricsProgressUpdate) {
    window.api.onLyricsProgressUpdate((progress) => {
        // progress: { currentTime, duration, paused }
        if (!isStaticMode) {
            syncLyrics(progress.currentTime);
        }
    });
}

async function updateLyrics(track, force = false) {
    if (!track) return;

    // Check if same track AND same provider (unless forced)
    const provider = providerSelect.value;
    if (!force && currentTrack && currentTrack.title === track.title && currentTrack.artist === track.artist) {
        // We could verify if the provider changed, but the change listener handles that with 'force=true'
        return;
    }

    currentTrack = track;
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    containerEl.innerHTML = `<div class="no-lyrics">Loading from ${provider}...</div>`;

    // Clear old lyrics to prevent stale state
    currentLyrics = [];

    try {
        if (window.api && window.api.fetchLyrics) {
            const lyrics = await window.api.fetchLyrics({
                title: track.title,
                artist: track.artist,
                album: track.album,
                provider: provider
            });

            if (lyrics && lyrics.syncedLyrics) {
                renderLyrics(lyrics.syncedLyrics);
                // Sync is handled by onLyricsProgressUpdate event
            } else if (lyrics && lyrics.plainLyrics) {
                renderPlainLyrics(lyrics.plainLyrics);
            } else {
                containerEl.innerHTML = `<div class="no-lyrics">No lyrics found on ${provider}</div>`;
            }
        } else {
            console.error('fetchLyrics API not available');
            containerEl.innerHTML = '<div class="no-lyrics">API Error</div>';
        }
    } catch (e) {
        console.error('Error fetching lyrics:', e);
        containerEl.innerHTML = '<div class="no-lyrics">Error loading lyrics</div>';
    }
}

function parseLrc(lrcInfo) {
    const lines = lrcInfo.split('\n');
    const result = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = timeReg.exec(line);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3].padEnd(3, '0')); // Handle 2 or 3 digits
            const time = min * 60 + sec + ms / 1000;
            const text = line.replace(timeReg, '').trim();
            if (text) {
                result.push({ time, text });
            }
        }
    }
    return result;
}

function renderLyrics(lrcText) {
    currentLyrics = parseLrc(lrcText);
    containerEl.innerHTML = '';
    currentLyrics.forEach((line, index) => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        div.textContent = line.text;
        div.dataset.index = index;
        div.dataset.time = line.time;
        // Allow clicking lines to seek? (Future feature, not now)
        containerEl.appendChild(div);
    });
}

function renderPlainLyrics(text) {
    containerEl.innerHTML = `<div style="white-space: pre-wrap; font-size: 1rem; line-height: 1.5; padding: 0 20px;">${text}</div>`;
}

function syncLyrics(time) {
    if (!currentLyrics || currentLyrics.length === 0) return;
    if (isStaticMode) return; // Double check

    // Add small offset to compensate for polling/processing delay
    const adjustedTime = time + 0.3;  // Show lyrics 0.3s ahead

    // Find the current line
    // We want the *last* line where time >= line.time
    let activeIndex = -1;
    for (let i = 0; i < currentLyrics.length; i++) {
        if (adjustedTime >= currentLyrics[i].time) {
            activeIndex = i;
        } else {
            // Once we find a line in the future, stop
            break;
        }
    }

    if (activeIndex !== -1) {
        highlightLine(activeIndex);
    }
}

function highlightLine(index) {
    const lines = document.querySelectorAll('.lyric-line');

    // Check if valid index
    const activeLine = lines[index];
    if (!activeLine || activeLine.classList.contains('active')) return;

    // Remove old active class
    lines.forEach(l => l.classList.remove('active'));

    // Add new active class
    activeLine.classList.add('active');

    // Smooth scroll to center
    activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
