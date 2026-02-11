const API_URL = '/api';

const els = {
    title: document.getElementById('track-title'),
    artist: document.getElementById('track-artist'),
    art: document.getElementById('album-art'),
    bg: document.getElementById('bg-art'),
    play: document.getElementById('icon-play'),
    pause: document.getElementById('icon-pause'),
    progress: document.getElementById('progress-bar'),
    vol: document.getElementById('volume-slider')
};

let lastState = null;

async function updateState() {
    try {
        const res = await fetch(`${API_URL}/status`);
        const state = await res.json();

        // Update Metadata
        if (state.track) {
            if (els.title.innerText !== state.track.title) els.title.innerText = state.track.title;
            if (els.artist.innerText !== state.track.artist) els.artist.innerText = state.track.artist;

            if (state.track.art && els.art.src !== state.track.art) {
                els.art.src = state.track.art;
                els.bg.style.backgroundImage = `url(${state.track.art})`;
                els.art.classList.remove('hidden');
            }
        }

        // Update Play/Pause UI
        if (state.paused) {
            els.play.classList.remove('hidden');
            els.pause.classList.add('hidden');
        } else {
            els.play.classList.add('hidden');
            els.pause.classList.remove('hidden');
        }

        // Update Progress
        if (state.track && state.track.duration > 0) {
            const pct = (state.currentTime / state.track.duration) * 100;
            els.progress.style.width = `${pct}%`;
        }

        // Update Shuffle/Repeat UI
        const shuffleBtn = document.getElementById('btn-shuffle');
        const repeatBtn = document.getElementById('btn-repeat');

        if (state.shuffle) shuffleBtn.classList.add('active');
        else shuffleBtn.classList.remove('active');

        if (state.repeat && state.repeat !== 'off') {
            repeatBtn.classList.add('active');
            // Optional: Change icon for 'one' vs 'all'
            if (state.repeat === 'one') {
                repeatBtn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>';
            } else {
                repeatBtn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
            }
        } else {
            repeatBtn.classList.remove('active');
            repeatBtn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
        }

        // Update Volume (only if not dragging)
        if (!isDraggingVol && state.volume !== undefined) {
            els.vol.value = state.volume * 100;
            if (volText) volText.innerText = Math.round(state.volume * 100) + '%';
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

async function sendControl(action, data = {}) {
    try {
        await fetch(`${API_URL}/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data })
        });
        // We don't force updateState() here because it causes jumps if scraping hasn't caught up
        // Instead, rely on the next polling cycle or optimistic UI update
    } catch (e) {
        console.error('Control error:', e);
    }
}

// Logic
setInterval(updateState, 1000);
updateState();


document.getElementById('btn-play').addEventListener('click', () => sendControl('playpause'));
document.getElementById('btn-prev').addEventListener('click', () => sendControl('prev'));
document.getElementById('btn-next').addEventListener('click', () => sendControl('next'));
document.getElementById('btn-shuffle').addEventListener('click', () => sendControl('shuffle'));
document.getElementById('btn-repeat').addEventListener('click', () => sendControl('repeat'));

// Volume Logic
let isDraggingVol = false;
const volText = document.getElementById('volume-text');

// Helpers
const updateVol = (val) => {
    // Backend expects gain (0.0 - 10.0)
    // Slider is 0-200 (0% - 200%)
    // So gain = val / 100
    sendControl('volume', { value: val / 100 });
    if (volText) volText.innerText = Math.round(val) + '%';
};

els.vol.addEventListener('mousedown', () => isDraggingVol = true);
els.vol.addEventListener('mouseup', () => {
    isDraggingVol = false;
});
els.vol.addEventListener('input', (e) => {
    isDraggingVol = true;
    // Update local UI immediately if we had one, but slider moves itself.
});
els.vol.addEventListener('change', (e) => {
    isDraggingVol = false;
    updateVol(els.vol.value);
});

// Scroll to change volume
els.vol.parentElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    let val = parseInt(els.vol.value);
    // Sensitivity: 10 per step (5% of 200, but visually 10% volume increments)
    if (e.deltaY < 0) val += 10;
    else val -= 10;

    // Clamp
    if (val > 200) val = 200;
    if (val < 0) val = 0;

    els.vol.value = val;
    isDraggingVol = true;
    clearTimeout(window.volScrollTimeout);
    window.volScrollTimeout = setTimeout(() => isDraggingVol = false, 1000);

    updateVol(val);
});

// Double click to type volume
els.vol.parentElement.addEventListener('dblclick', () => {
    const input = prompt('Enter volume (0-200):', els.vol.value);
    if (input !== null) {
        let val = parseInt(input);
        if (isNaN(val)) return;
        if (val < 0) val = 0;
        if (val > 200) val = 200;

        els.vol.value = val;
        updateVol(val);
    }
});

document.getElementById('btn-close').addEventListener('click', () => sendControl('close'));
