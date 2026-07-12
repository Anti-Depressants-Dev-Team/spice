const ACCENT_THEMES = new Set([
  "pink",
  "blue",
  "orange",
  "green",
  "gold",
  "crimson",
  "deeppurple",
]);

const SURFACE_THEMES = new Set(["midnight", "glass", "solid", "aurora"]);

const DEFAULT_SHELL_THEME = Object.freeze({
  accent: "deeppurple",
  surface: "midnight",
});

function normalizeShellTheme(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    accent: ACCENT_THEMES.has(source.accent)
      ? source.accent
      : DEFAULT_SHELL_THEME.accent,
    surface: SURFACE_THEMES.has(source.surface)
      ? source.surface
      : DEFAULT_SHELL_THEME.surface,
  };
}

function parseSupportedServiceUrl(value, options = {}) {
  let parsed;
  try {
    parsed = new URL(String(value || "").trim());
  } catch {
    return null;
  }

  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  const isLocalRuntime =
    parsed.protocol === "http:" &&
    (host === "127.0.0.1" || host === "localhost") &&
    parsed.port === "3939";
  const isYtMusic =
    parsed.protocol === "https:" &&
    (host === "music.youtube.com" || host === "www.music.youtube.com");
  const isSoundCloud =
    parsed.protocol === "https:" &&
    (host === "soundcloud.com" ||
      host === "www.soundcloud.com" ||
      host === "m.soundcloud.com");
  const isRemoteSpice =
    parsed.protocol === "https:" &&
    (host === "music.spice-app.xyz" || host === "install.spice-app.xyz");

  const serviceKey = isYtMusic
    ? "yt"
    : isSoundCloud
      ? "sc"
      : isLocalRuntime || isRemoteSpice
        ? "spice_crazy"
        : null;

  if (!serviceKey || (options.nativeMode && serviceKey !== "spice_crazy")) {
    return null;
  }

  return {
    url: parsed.toString(),
    serviceKey,
    isLocalRuntime,
  };
}

function getNavigationHistory(webContents) {
  if (!webContents) return null;
  return webContents.navigationHistory || webContents;
}

function canNavigate(history, direction) {
  if (!history) return false;
  const method = direction === "forward" ? "canGoForward" : "canGoBack";
  return typeof history[method] === "function" && history[method]();
}

function navigateHistory(history, direction) {
  if (!canNavigate(history, direction)) return false;
  const method = direction === "forward" ? "goForward" : "goBack";
  if (typeof history[method] !== "function") return false;
  history[method]();
  return true;
}

module.exports = {
  DEFAULT_SHELL_THEME,
  normalizeShellTheme,
  parseSupportedServiceUrl,
  getNavigationHistory,
  navigateHistory,
};
