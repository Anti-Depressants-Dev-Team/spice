const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const extractZip = require("extract-zip");

const repoRoot = path.resolve(__dirname, "..");
const platform = process.env.SPICE_NATIVE_TARGET_PLATFORM || process.platform;
const platformNames = { win32: "windows", linux: "linux" };
const platformName = platformNames[platform];

if (!platformName) {
  throw new Error(`SPICE Native runtime packaging is not supported on ${platform}.`);
}

const runtimeName = `spice-local-${platformName}`;
const targetRoot = path.join(repoRoot, "native-runtime");
const targetRuntime = path.join(targetRoot, runtimeName);
const backendRepo = path.resolve(
  process.env.SPICE_BACKEND_REPO || path.join(repoRoot, "..", "SPICE-but-its-crazier-and-closed-source-cuz-yes-"),
);
const releaseUrl = process.env.SPICE_NATIVE_RUNTIME_ZIP_URL
  || `https://github.com/Anti-Depressants-Dev-Team/SPICE-but-its-crazier-cuz-yes-/releases/latest/download/${runtimeName}.zip`;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  fs.mkdirSync(targetRoot, { recursive: true });
  assertSafeChild(targetRuntime, targetRoot);

  const backendPackage = path.join(backendRepo, "apps", "backend", "package.json");
  if (platform === process.platform && fs.existsSync(backendPackage)) {
    console.log(`Preparing ${platformName} Native runtime from ${backendRepo}`);
    if (process.env.SPICE_NATIVE_SKIP_BACKEND_BUILD !== "1") {
      runPnpm(["--filter", "@spice/backend", "build:local"], backendRepo);
      runPnpm(["--filter", "@spice/backend", `package:local:${platformName}`], backendRepo);
    }
    installPreparedRuntime(path.join(backendRepo, "apps", "backend", "dist", runtimeName));
  } else {
    console.log(`Downloading ${platformName} Native runtime from ${releaseUrl}`);
    await installReleaseRuntime();
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(targetRuntime, "spice-local-manifest.json"), "utf8"));
  console.log(`Prepared SPICE Native ${platformName} runtime ${manifest.version || "unknown"} at ${targetRuntime}`);
}

function runPnpm(args, cwd) {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(executable, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${executable} ${args.join(" ")} exited with code ${result.status}.`);
}

function installPreparedRuntime(sourceRuntime) {
  assertRuntime(sourceRuntime);
  fs.rmSync(targetRuntime, { recursive: true, force: true });
  fs.cpSync(sourceRuntime, targetRuntime, { recursive: true });
  finalizeRuntime();
}

async function installReleaseRuntime() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "spice-native-runtime-"));
  const archive = path.join(scratch, `${runtimeName}.zip`);
  const expanded = path.join(scratch, "expanded");

  try {
    const response = await fetch(releaseUrl, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Runtime download failed with status ${response.status}.`);
    }
    if (!response.body) throw new Error("Runtime download returned an empty response body.");
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(archive));
    fs.mkdirSync(expanded, { recursive: true });
    await extractZip(archive, { dir: expanded });
    const sourceRuntime = findRuntimeRoot(expanded);
    if (!sourceRuntime) throw new Error(`Downloaded archive did not contain a valid ${runtimeName} runtime.`);
    installPreparedRuntime(sourceRuntime);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function findRuntimeRoot(root) {
  if (isRuntimeRoot(root)) return root;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = findRuntimeRoot(path.join(root, entry.name));
    if (candidate) return candidate;
  }
  return null;
}

function isRuntimeRoot(candidate) {
  return fs.existsSync(path.join(candidate, "spice-local-manifest.json"))
    && fs.existsSync(path.join(candidate, "apps", "backend", "server.js"));
}

function assertRuntime(candidate) {
  if (!isRuntimeRoot(candidate)) {
    throw new Error(`SPICE runtime package was not found at ${candidate}.`);
  }
}

function finalizeRuntime() {
  fs.writeFileSync(path.join(targetRuntime, ".gitkeep"), "");
  const shellLauncher = path.join(targetRuntime, "start-spice-local.sh");
  if (platform === "linux" && fs.existsSync(shellLauncher)) fs.chmodSync(shellLauncher, 0o755);
}

function assertSafeChild(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to modify unexpected runtime path: ${candidate}`);
  }
}
