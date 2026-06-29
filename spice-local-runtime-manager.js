const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");

const DEFAULT_MANIFEST_URL = "https://music.spice-app.xyz/api/updates/local-windows";
const DEFAULT_LOCAL_URL = "http://127.0.0.1:3939/";
const DEFAULT_DOWNLOAD_URL =
  "https://github.com/Anti-Depressants-Dev-Team/SPICE-but-its-crazier-cuz-yes-/releases/latest/download/spice-local-windows.zip";

class SpiceLocalRuntimeManager {
  constructor(options) {
    this.app = options.app;
    this.fetch = options.fetch || global.fetch;
    this.localUrl = normalizeServiceUrl(options.localUrl || DEFAULT_LOCAL_URL);
    this.manifestUrl = options.manifestUrl || DEFAULT_MANIFEST_URL;
    this.rootDir = options.rootDir || path.join(this.app.getPath("userData"), "spice-local-runtime");
    this.runtimeDir = path.join(this.rootDir, "runtime");
    this.tempDir = path.join(this.rootDir, "tmp");
    this.child = null;
    this.busy = false;
    this.message = "Ready";
    this.onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
  }

  get supported() {
    return process.platform === "win32";
  }

  async getStatus() {
    const installedVersion = this.getInstalledVersion();
    const running = await this.isRunning();

    return {
      supported: this.supported,
      installed: Boolean(installedVersion),
      installedVersion,
      running,
      busy: this.busy,
      message: this.message,
      installDir: this.runtimeDir,
      localUrl: this.localUrl,
      manifestUrl: this.manifestUrl,
    };
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
    if (!this.supported) {
      throw new Error("The managed SPICE local runtime installer is currently Windows-only.");
    }
    if (this.busy) {
      throw new Error("SPICE local runtime is already busy.");
    }

    this.busy = true;
    this.message = "Fetching runtime manifest...";
    this.emitStatus();

    const scratchDir = path.join(this.tempDir, `install-${Date.now()}`);
    const zipPath = path.join(scratchDir, "spice-local-windows.zip");
    const stagingDir = path.join(scratchDir, "runtime");

    try {
      if ((await this.isRunning()) && !this.child) {
        throw new Error("SPICE local runtime is already running. Close the external runtime before updating it.");
      }

      fs.mkdirSync(stagingDir, { recursive: true });
      const manifest = await this.fetchManifest();
      const download = manifest && manifest.download ? manifest.download : null;
      const downloadUrl = resolveRuntimeDownloadUrl(download && download.url, this.manifestUrl);
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
      await expandZip(zipPath, stagingDir);

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
      throw new Error("The managed SPICE local runtime starter is currently Windows-only.");
    }

    if (await this.isRunning()) {
      this.message = "SPICE local runtime is already running.";
      this.emitStatus();
      return this.getStatus();
    }

    const startScript = path.join(this.runtimeDir, "start-spice-local.ps1");
    if (!fs.existsSync(startScript)) {
      throw new Error("SPICE local runtime is not installed yet.");
    }

    this.child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", startScript],
      {
        cwd: this.runtimeDir,
        env: {
          ...process.env,
          SPICE_RUNTIME_TARGET: "local",
          HOSTNAME: process.env.SPICE_LOCAL_HOSTNAME || "127.0.0.1",
          PORT: process.env.SPICE_LOCAL_PORT || "3939",
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
      await killProcessTree(this.child.pid).catch(() => {
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
    const manifestPath = path.join(this.runtimeDir, "spice-local-manifest.json");
    if (!fs.existsSync(manifestPath)) return null;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      return typeof manifest.version === "string" ? manifest.version : "unknown";
    } catch {
      return "unknown";
    }
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

function resolveRuntimeDownloadUrl(value, manifestUrl) {
  if (!value || !String(value).trim()) return DEFAULT_DOWNLOAD_URL;

  try {
    const parsed = new URL(String(value).trim(), manifestUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {}

  return DEFAULT_DOWNLOAD_URL;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function expandZip(zipPath, destinationPath) {
  return runPowerShell(
    `Expand-Archive -LiteralPath ${psQuote(zipPath)} -DestinationPath ${psQuote(destinationPath)} -Force`,
  );
}

function killProcessTree(pid) {
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

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
      stdio: "pipe",
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `PowerShell exited with code ${code}.`));
      }
    });
  });
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

module.exports = {
  SpiceLocalRuntimeManager,
};
