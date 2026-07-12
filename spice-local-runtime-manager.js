const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const { extractRuntimeArchive } = require("./runtime-archive");

const DEFAULT_LOCAL_URL = "http://127.0.0.1:3939/";
const RUNTIME_PLATFORMS = {
  win32: {
    id: "windows",
    archiveName: "spice-local-windows.zip",
  },
  linux: {
    id: "linux",
    archiveName: "spice-local-linux.zip",
  },
};

function runtimePlatformConfig(platform = process.platform) {
  const base = RUNTIME_PLATFORMS[platform];
  if (!base) return null;
  return {
    ...base,
    manifestUrl: `https://music.spice-app.xyz/api/updates/local-${base.id}`,
    downloadUrl: `https://github.com/Anti-Depressants-Dev-Team/spice/releases/download/spice-local-runtime/${base.archiveName}`,
  };
}

class SpiceLocalRuntimeManager {
  constructor(options) {
    this.app = options.app;
    this.platform = options.platform || process.platform;
    this.execPath = options.execPath || process.execPath;
    this.platformConfig = runtimePlatformConfig(this.platform);
    this.fetch = options.fetch || global.fetch;
    this.localUrl = normalizeServiceUrl(options.localUrl || DEFAULT_LOCAL_URL);
    this.manifestUrl = options.manifestUrl || this.platformConfig?.manifestUrl || "";
    this.rootDir = options.rootDir || path.join(this.app.getPath("userData"), "spice-local-runtime");
    this.runtimeDir = path.join(this.rootDir, "runtime");
    this.tempDir = path.join(this.rootDir, "tmp");
    this.bundledRuntimeDir = options.bundledRuntimeDir || null;
    this.child = null;
    this.busy = false;
    this.message = "Ready";
    this.onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
  }

  get supported() {
    return Boolean(this.platformConfig);
  }

  async getStatus() {
    const installedVersion = this.getInstalledVersion();
    const bundledVersion = this.getBundledVersion();
    const running = await this.isRunning();

    return {
      supported: this.supported,
      platform: this.platformConfig?.id || this.platform,
      installed: Boolean(installedVersion),
      installedVersion,
      bundled: Boolean(bundledVersion),
      bundledVersion,
      running,
      busy: this.busy,
      message: this.message,
      installDir: this.runtimeDir,
      bundledDir: this.bundledRuntimeDir,
      localUrl: this.localUrl,
      manifestUrl: this.manifestUrl,
    };
  }

  async ensureBundledRuntimeInstalled() {
    if (!this.supported) {
      throw new Error("The managed SPICE local runtime installer is not supported on this platform.");
    }
    if (!this.hasBundledRuntime()) {
      return this.getStatus();
    }

    const installedVersion = this.getInstalledVersion();
    const bundledVersion = this.getBundledVersion();
    if (installedVersion && bundledVersion && compareVersions(installedVersion, bundledVersion) >= 0) {
      return this.getStatus();
    }

    if ((await this.isRunning()) && !this.child) {
      throw new Error("SPICE local runtime is already running. Close the external runtime before replacing it with the bundled runtime.");
    }

    if (this.busy) {
      throw new Error("SPICE local runtime is already busy.");
    }

    this.busy = true;
    this.message = `Installing bundled SPICE local runtime ${bundledVersion || "included"}...`;
    this.emitStatus();

    const scratchDir = path.join(this.tempDir, `bundled-${Date.now()}`);
    const stagingDir = path.join(scratchDir, "runtime");

    try {
      fs.mkdirSync(stagingDir, { recursive: true });
      copyDirectory(this.bundledRuntimeDir, stagingDir);

      await this.stop();
      fs.mkdirSync(this.rootDir, { recursive: true });
      fs.rmSync(this.runtimeDir, { recursive: true, force: true });
      fs.renameSync(stagingDir, this.runtimeDir);

      this.message = `Bundled SPICE local runtime ${bundledVersion || "included"} installed.`;
      this.emitStatus();
      return this.getStatus();
    } finally {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      this.busy = false;
      this.emitStatus();
    }
  }

  async fetchManifest() {
    if (!this.fetch) {
      throw new Error("No fetch implementation is available for runtime updates.");
    }

    const response = await this.fetch(this.manifestUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`SPICE runtime manifest request failed with status ${response.status}.`);
    }

    return response.json();
  }

  async installOrUpdate() {
    return this.installFromManifest(null);
  }

  async installLatestIfAvailable() {
    if (!this.supported) {
      throw new Error("The managed SPICE local runtime installer is not supported on this platform.");
    }
    if (this.busy) {
      throw new Error("SPICE local runtime is already busy.");
    }

    if (await this.isRunning()) {
      this.message = "SPICE local runtime is already running. Update check deferred until the next start.";
      this.emitStatus();
      return this.getStatus();
    }

    this.message = "Checking for SPICE local runtime updates...";
    this.emitStatus();

    const manifest = await this.fetchManifest();
    const latestVersion = typeof manifest?.version === "string" ? manifest.version : null;
    const installedVersion = this.getInstalledVersion();

    if (!shouldInstallRuntimeUpdate(installedVersion, latestVersion)) {
      this.message = `SPICE local runtime ${installedVersion || "latest"} is up to date.`;
      this.emitStatus();
      return this.getStatus();
    }

    return this.installFromManifest(manifest);
  }

  async installFromManifest(manifestOverride) {
    if (!this.supported) {
      throw new Error("The managed SPICE local runtime installer is not supported on this platform.");
    }
    if (this.busy) {
      throw new Error("SPICE local runtime is already busy.");
    }

    this.busy = true;
    this.message = manifestOverride ? "Preparing runtime update..." : "Fetching runtime manifest...";
    this.emitStatus();

    const scratchDir = path.join(this.tempDir, `install-${Date.now()}`);
    const zipPath = path.join(scratchDir, this.platformConfig.archiveName);
    const stagingDir = path.join(scratchDir, "runtime");

    try {
      if ((await this.isRunning()) && !this.child) {
        throw new Error("SPICE local runtime is already running. Close the external runtime before updating it.");
      }

      fs.mkdirSync(stagingDir, { recursive: true });
      const manifest = manifestOverride || await this.fetchManifest();
      const download = manifest && manifest.download ? manifest.download : null;
      const downloadUrl = resolveRuntimeDownloadUrl(
        download && download.url,
        this.manifestUrl,
        this.platformConfig.downloadUrl,
      );
      if (!downloadUrl) {
        throw new Error("The SPICE local runtime manifest does not include a download URL.");
      }

      this.message = `Downloading SPICE local runtime ${manifest.version || "latest"}...`;
      this.emitStatus();
      await this.downloadFile(downloadUrl, zipPath);

      if (download && download.sha256) {
        this.message = "Verifying SPICE local runtime package...";
        this.emitStatus();
        const actual = await sha256File(zipPath);
        if (actual.toLowerCase() !== String(download.sha256).toLowerCase()) {
          throw new Error(`Downloaded runtime hash mismatch. Expected ${download.sha256}, got ${actual}.`);
        }
      }

      this.message = "Extracting SPICE local runtime...";
      this.emitStatus();
      await extractRuntimeArchive(zipPath, stagingDir);

      await this.stop();
      fs.mkdirSync(this.rootDir, { recursive: true });
      fs.rmSync(this.runtimeDir, { recursive: true, force: true });
      fs.renameSync(stagingDir, this.runtimeDir);

      this.message = `SPICE local runtime ${manifest.version || "latest"} installed.`;
      this.emitStatus();
      return this.getStatus();
    } finally {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      this.busy = false;
      this.emitStatus();
    }
  }

  async start() {
    if (!this.supported) {
      throw new Error("The managed SPICE local runtime starter is not supported on this platform.");
    }

    if (await this.isRunning()) {
      this.message = "SPICE local runtime is already running.";
      this.emitStatus();
      return this.getStatus();
    }

    let serverFile = runtimeServerFile(this.runtimeDir);
    if (!fs.existsSync(serverFile)) {
      if (this.hasBundledRuntime()) {
        await this.ensureBundledRuntimeInstalled();
        serverFile = runtimeServerFile(this.runtimeDir);
      } else {
        throw new Error("SPICE local runtime is not installed yet.");
      }
    }

    this.child = spawn(
      this.execPath,
      [serverFile],
      {
        cwd: this.runtimeDir,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1",
          SPICE_RUNTIME_TARGET: "local",
          HOSTNAME: process.env.SPICE_LOCAL_HOSTNAME || "127.0.0.1",
          PORT: process.env.SPICE_LOCAL_PORT || "3939",
          SPICE_CLOUD_API_ORIGIN: process.env.SPICE_CLOUD_API_ORIGIN || "https://music.spice-app.xyz",
          SPICE_LOCAL_UPDATE_MANIFEST_URL: this.manifestUrl,
        },
        stdio: "ignore",
        windowsHide: true,
      },
    );

    this.child.once("exit", () => {
      this.child = null;
      this.emitStatus();
    });

    this.message = "Starting SPICE local runtime...";
    this.emitStatus();
    try {
      await this.waitUntilRunning(15000);
    } catch (error) {
      await this.stop().catch(() => {});
      throw error;
    }
    this.message = "SPICE local runtime is running.";
    this.emitStatus();
    return this.getStatus();
  }

  async stop() {
    if (!this.child) {
      this.message = "Only a runtime started by this desktop app can be stopped here.";
      this.emitStatus();
      return this.getStatus();
    }

    if (this.child && !this.child.killed) {
      await killProcessTree(this.child.pid, this.platform).catch(() => {
        this.child.kill();
      });
      this.child = null;
    }
    return this.getStatus();
  }

  async waitUntilRunning(timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await this.isRunning()) return true;
      await delay(500);
    }
    throw new Error("SPICE local runtime did not answer before the startup timeout.");
  }

  async isRunning() {
    if (!this.fetch) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await this.fetch(new URL("/api/runtime", this.localUrl).toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      return Boolean(response && response.ok);
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  getInstalledVersion() {
    return readRuntimeVersion(this.runtimeDir);
  }

  getBundledVersion() {
    return readRuntimeVersion(this.bundledRuntimeDir);
  }

  hasBundledRuntime() {
    return Boolean(this.bundledRuntimeDir && fs.existsSync(runtimeServerFile(this.bundledRuntimeDir)));
  }

  async downloadFile(url, targetPath) {
    if (!this.fetch) {
      throw new Error("No fetch implementation is available for runtime downloads.");
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const response = await this.fetch(url);
    if (!response.ok) {
      throw new Error(`SPICE runtime download failed with status ${response.status}.`);
    }

    await pipeline(response.body, fs.createWriteStream(targetPath));
  }

  emitStatus() {
    this.getStatus()
      .then((status) => this.onStatus(status))
      .catch(() => {});
  }
}

function normalizeServiceUrl(url) {
  const value = String(url || "").trim();
  return value.endsWith("/") ? value : `${value}/`;
}

function resolveRuntimeDownloadUrl(value, manifestUrl, fallbackUrl = runtimePlatformConfig()?.downloadUrl || null) {
  if (!value || !String(value).trim()) return fallbackUrl;

  try {
    const parsed = new URL(String(value).trim(), manifestUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {}

  return fallbackUrl;
}

function runtimeServerFile(runtimeDir) {
  return path.join(runtimeDir, "apps", "backend", "server.js");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRuntimeVersion(runtimeDir) {
  if (!runtimeDir) return null;
  const manifestPath = path.join(runtimeDir, "spice-local-manifest.json");
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return typeof manifest.version === "string" ? manifest.version : "unknown";
  } catch {
    return "unknown";
  }
}

function compareVersions(left, right) {
  const leftParts = String(left || "").split(".").map(parseVersionPart);
  const rightParts = String(right || "").split(".").map(parseVersionPart);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function parseVersionPart(part) {
  const match = String(part || "").match(/^\d+/);
  return match ? Number(match[0]) : 0;
}

function shouldInstallRuntimeUpdate(installedVersion, latestVersion) {
  if (!installedVersion) return true;
  if (installedVersion === "unknown") return true;
  if (!latestVersion) return false;
  return compareVersions(installedVersion, latestVersion) < 0;
}

function copyDirectory(sourceDir, destinationDir) {
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    throw new Error("Bundled SPICE local runtime is missing.");
  }

  fs.mkdirSync(destinationDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function killProcessTree(pid, platform = process.platform) {
  if (platform !== "win32") {
    return new Promise((resolve, reject) => {
      try {
        process.kill(pid, "SIGTERM");
        setTimeout(resolve, 250);
      } catch (error) {
        reject(error);
      }
    });
  }

  return new Promise((resolve, reject) => {
    const child = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`taskkill exited with code ${code}.`));
    });
  });
}

module.exports = {
  SpiceLocalRuntimeManager,
  compareVersions,
  resolveRuntimeDownloadUrl,
  runtimePlatformConfig,
  shouldInstallRuntimeUpdate,
};
