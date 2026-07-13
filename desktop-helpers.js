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

const CUSTOM_THEME_COLOR_KEYS = [
  "primary",
  "secondary",
  "highlight",
  "background",
  "surface",
  "glass",
  "border",
];

function normalizeLiteralColor(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  const hex = candidate.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) return `#${hex[1]}`;
  const rgb = candidate.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/);
  if (!rgb) return null;
  const channels = rgb.slice(1, 4).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  const isRgba = candidate.startsWith("rgba(");
  if (isRgba !== (rgb[4] !== undefined)) return null;
  if (!isRgba) return `rgb(${channels.join(", ")})`;
  const alpha = Number(rgb[4]);
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null;
  return `rgba(${channels.join(", ")}, ${alpha})`;
}

function colorRgbChannels(color) {
  if (color.startsWith("#")) {
    return [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)]
      .map((channel) => Number.parseInt(channel, 16));
  }
  const match = color.match(/^rgba?\((\d+), (\d+), (\d+)/);
  return match ? match.slice(1, 4).map(Number) : null;
}

function normalizeCustomShellTheme(value) {
  if (!value || typeof value !== "object") return null;
  const colors = {};
  for (const key of CUSTOM_THEME_COLOR_KEYS) {
    const color = normalizeLiteralColor(value[key]);
    if (!color) return null;
    colors[key] = color;
  }
  const channels = colorRgbChannels(colors.primary);
  if (!channels) return null;
  return { ...colors, primaryRgb: channels.join(", ") };
}

function normalizeShellTheme(value) {
  const source = value && typeof value === "object" ? value : {};
  const theme = {
    accent: ACCENT_THEMES.has(source.accent)
      ? source.accent
      : DEFAULT_SHELL_THEME.accent,
    surface: SURFACE_THEMES.has(source.surface)
      ? source.surface
      : DEFAULT_SHELL_THEME.surface,
  };
  const custom = normalizeCustomShellTheme(source.custom);
  return custom ? { ...theme, custom } : theme;
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
