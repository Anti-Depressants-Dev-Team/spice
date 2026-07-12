const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const yauzl = require("yauzl");

const MAX_ARCHIVE_ENTRIES = 100000;
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
const FILE_TYPE_MASK = 0o170000;
const DIRECTORY_TYPE = 0o040000;
const SYMLINK_TYPE = 0o120000;

async function extractRuntimeArchive(archivePath, destinationPath) {
  const destination = path.resolve(destinationPath);
  fs.mkdirSync(destination, { recursive: true });
  const zipfile = await openArchive(archivePath);

  return new Promise((resolve, reject) => {
    let settled = false;
    let entryCount = 0;
    let uncompressedBytes = 0;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      try { zipfile.close(); } catch {}
      reject(error);
    };

    const readNext = () => {
      if (!settled) zipfile.readEntry();
    };

    zipfile.once("error", fail);
    zipfile.once("close", () => {
      if (settled) return;
      settled = true;
      resolve();
    });

    zipfile.on("entry", (entry) => {
      void extractEntry(entry).catch(fail);
    });

    async function extractEntry(entry) {
      entryCount += 1;
      if (entryCount > MAX_ARCHIVE_ENTRIES) {
        throw new Error(`Runtime archive exceeds ${MAX_ARCHIVE_ENTRIES} entries.`);
      }

      const targetPath = resolveArchiveEntryPath(destination, entry.fileName);
      if (!targetPath) {
        readNext();
        return;
      }

      const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
      const fileType = mode & FILE_TYPE_MASK;
      if (fileType === SYMLINK_TYPE) {
        throw new Error(`Runtime archive contains an unsupported symlink: ${entry.fileName}`);
      }

      const isDirectory = fileType === DIRECTORY_TYPE
        || entry.fileName.endsWith("/")
        || ((entry.versionMadeBy >>> 8) === 0 && (entry.externalFileAttributes & 0x10) !== 0);

      if (isDirectory) {
        fs.mkdirSync(targetPath, { recursive: true, mode: (mode & 0o777) || 0o755 });
        readNext();
        return;
      }

      uncompressedBytes += Number(entry.uncompressedSize) || 0;
      if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
        throw new Error("Runtime archive exceeds the 1 GiB extraction limit.");
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const input = await openEntryStream(zipfile, entry);
      const output = fs.createWriteStream(targetPath, { mode: (mode & 0o777) || 0o644 });
      await pipeline(input, output);
      readNext();
    }

    readNext();
  });
}

function resolveArchiveEntryPath(destinationPath, entryName) {
  if (typeof entryName !== "string" || entryName.includes("\0")) {
    throw new Error("Runtime archive contains an invalid entry name.");
  }

  const normalizedName = entryName.replace(/\\/g, "/");
  if (normalizedName.startsWith("/") || /^[A-Za-z]:/.test(normalizedName)) {
    throw new Error(`Runtime archive entry is absolute: ${entryName}`);
  }

  const segments = [];
  for (const segment of normalizedName.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      throw new Error(`Runtime archive entry escapes its destination: ${entryName}`);
    }
    segments.push(segment);
  }

  if (segments.length === 0) return null;

  const destination = path.resolve(destinationPath);
  const target = path.resolve(destination, ...segments);
  const relative = path.relative(destination, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Runtime archive entry escapes its destination: ${entryName}`);
  }
  return target;
}

function openArchive(archivePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true, validateEntrySizes: true }, (error, zipfile) => {
      if (error) reject(error);
      else if (!zipfile) reject(new Error("Runtime archive could not be opened."));
      else resolve(zipfile);
    });
  });
}

function openEntryStream(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else if (!stream) reject(new Error(`Runtime archive entry could not be read: ${entry.fileName}`));
      else resolve(stream);
    });
  });
}

module.exports = {
  extractRuntimeArchive,
  resolveArchiveEntryPath,
};
