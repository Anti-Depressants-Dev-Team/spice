const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SHELL_THEME,
  normalizeShellTheme,
  parseSupportedServiceUrl,
  getNavigationHistory,
  navigateHistory,
} = require("../desktop-helpers");

test("normalizes supported shell themes and rejects unknown values", () => {
  assert.deepEqual(normalizeShellTheme({ accent: "green", surface: "glass" }), {
    accent: "green",
    surface: "glass",
  });
  assert.deepEqual(
    normalizeShellTheme({ accent: "javascript:bad", surface: "unknown" }),
    DEFAULT_SHELL_THEME,
  );
});

test("accepts exact supported service URLs with safe protocols", () => {
  assert.equal(
    parseSupportedServiceUrl("https://music.youtube.com/watch?v=abc").serviceKey,
    "yt",
  );
  assert.equal(
    parseSupportedServiceUrl("https://m.soundcloud.com/artist/track").serviceKey,
    "sc",
  );
  assert.equal(
    parseSupportedServiceUrl("http://127.0.0.1:3939/search").serviceKey,
    "spice_crazy",
  );
  assert.equal(
    parseSupportedServiceUrl("https://music.spice-app.xyz/playlist").serviceKey,
    "spice_crazy",
  );
});

test("rejects hostile suffixes, credentials, and unsafe protocols", () => {
  assert.equal(
    parseSupportedServiceUrl("https://music.youtube.com.attacker.test/"),
    null,
  );
  assert.equal(parseSupportedServiceUrl("http://music.youtube.com/"), null);
  assert.equal(
    parseSupportedServiceUrl("https://user:pass@music.youtube.com/"),
    null,
  );
  assert.equal(parseSupportedServiceUrl("https://localhost:3939/"), null);
});

test("native mode only accepts SPICE URLs", () => {
  assert.equal(
    parseSupportedServiceUrl("https://music.youtube.com/", { nativeMode: true }),
    null,
  );
  assert.equal(
    parseSupportedServiceUrl("http://localhost:3939/", { nativeMode: true })
      .serviceKey,
    "spice_crazy",
  );
});

test("uses Electron navigationHistory and only navigates when available", () => {
  let backCalls = 0;
  const history = {
    canGoBack: () => true,
    goBack: () => {
      backCalls += 1;
    },
  };
  const webContents = { navigationHistory: history };

  assert.equal(getNavigationHistory(webContents), history);
  assert.equal(navigateHistory(history, "back"), true);
  assert.equal(backCalls, 1);
  assert.equal(
    navigateHistory({ canGoForward: () => false, goForward: () => {} }, "forward"),
    false,
  );
});
