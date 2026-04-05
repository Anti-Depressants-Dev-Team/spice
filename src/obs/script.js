const API_URL = "/api";

const els = {
  title: document.getElementById("track-title"),
  artist: document.getElementById("track-artist"),
  art: document.getElementById("album-art"),
  bg: document.getElementById("bg-art"),
  progress: document.getElementById("progress-bar"),
};

async function updateState() {
  try {
    const res = await fetch(`${API_URL}/status`);
    const state = await res.json();

    // Update Metadata
    if (state.track) {
      if (els.title.innerText !== state.track.title)
        els.title.innerText = state.track.title;
      if (els.artist.innerText !== state.track.artist)
        els.artist.innerText = state.track.artist;

      if (state.track.art && els.art.src !== state.track.art) {
        els.art.src = state.track.art;
        els.bg.style.backgroundImage = `url(${state.track.art})`;
        els.art.classList.remove("hidden");
      }
    }

    // Update Progress
    if (state.track && state.track.duration > 0) {
      const pct = (state.currentTime / state.track.duration) * 100;
      els.progress.style.width = `${pct}%`;
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

setInterval(updateState, 1000);
updateState();
