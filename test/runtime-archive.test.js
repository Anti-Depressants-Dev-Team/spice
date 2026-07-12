const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { extractRuntimeArchive, resolveArchiveEntryPath } = require("../runtime-archive");

const ROOT_DOT_ARCHIVE = "UEsDBBQAAAAAAPST61wAAAAAAAAAAAAAAAACACAALi91eAsAAQQAAAAABAAAAABVVA0AB9xhUmrcYVJq3GFSalBLAwQUAAAAAAD0k+tcAAAAAAAAAAAAAAAABwAgAC4vYXBwcy91eAsAAQQAAAAABAAAAABVVA0AB9xhUmrcYVJq3GFSalBLAwQUAAgACAD0k+tcAAAAAAAAAAAAAAAAGwAgAC4vc3BpY2UtbG9jYWwtbWFuaWZlc3QuanNvbnV4CwABBAAAAAAEAAAAAFVUDQAH3GFSatxhUmrcYVJqq64FAFBLBwhDv6ajBAAAAAIAAABQSwMEFAAAAAAA9JPrXAAAAAAAAAAAAAAAAA8AIAAuL2FwcHMvYmFja2VuZC91eAsAAQQAAAAABAAAAABVVA0AB9xhUmrcYVJq3GFSalBLAwQUAAgACAD0k+tcAAAAAAAAAAAAAAAAGAAgAC4vYXBwcy9iYWNrZW5kL3NlcnZlci5qc3V4CwABBAAAAAAEAAAAAFVUDQAH3GFSatxhUmrcYVJqS8usKCktSgUAUEsHCO5A5QUJAAAABwAAAFBLAQIUAxQAAAAAAPST61wAAAAAAAAAAAAAAAACABgAAAAAAAAAAAD/QQAAAAAuL3V4CwABBAAAAAAEAAAAAFVUBQAB3GFSalBLAQIUAxQAAAAAAPST61wAAAAAAAAAAAAAAAAHABgAAAAAAAAAAAD/QUAAAAAuL2FwcHMvdXgLAAEEAAAAAAQAAAAAVVQFAAHcYVJqUEsBAhQDFAAIAAgA9JPrXEO/pqMEAAAAAgAAABsAGAAAAAAAAAAAALaBhQAAAC4vc3BpY2UtbG9jYWwtbWFuaWZlc3QuanNvbnV4CwABBAAAAAAEAAAAAFVUBQAB3GFSalBLAQIUAxQAAAAAAPST61wAAAAAAAAAAAAAAAAPABgAAAAAAAAAAAD/QfIAAAAuL2FwcHMvYmFja2VuZC91eAsAAQQAAAAABAAAAABVVAUAAdxhUmpQSwECFAMUAAgACAD0k+tc7kDlBQkAAAAHAAAAGAAYAAAAAAAAAAAAtoE/AQAALi9hcHBzL2JhY2tlbmQvc2VydmVyLmpzdXgLAAEEAAAAAAQAAAAAVVQFAAHcYVJqUEsFBgAAAAAFAAUAqQEAAK4BAAAAAA==";

test("runtime archive extraction tolerates the published root-dot layout", async (t) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "spice-runtime-archive-test-"));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const archive = path.join(scratch, "runtime.zip");
  const destination = path.join(scratch, "expanded");
  fs.writeFileSync(archive, Buffer.from(ROOT_DOT_ARCHIVE, "base64"));

  await extractRuntimeArchive(archive, destination);

  assert.equal(fs.readFileSync(path.join(destination, "apps", "backend", "server.js"), "utf8"), "fixture");
  assert.equal(fs.readFileSync(path.join(destination, "spice-local-manifest.json"), "utf8"), "{}");
});

test("runtime archives ignore root-dot entries and normalize their children", () => {
  const destination = path.resolve("runtime-test-destination");

  assert.equal(resolveArchiveEntryPath(destination, "./"), null);
  assert.equal(
    resolveArchiveEntryPath(destination, "./apps/backend/server.js"),
    path.join(destination, "apps", "backend", "server.js"),
  );
});

test("runtime archives reject traversal and absolute paths", () => {
  const destination = path.resolve("runtime-test-destination");

  assert.throws(
    () => resolveArchiveEntryPath(destination, "../outside.txt"),
    /escapes its destination/,
  );
  assert.throws(
    () => resolveArchiveEntryPath(destination, "folder\\..\\outside.txt"),
    /escapes its destination/,
  );
  assert.throws(
    () => resolveArchiveEntryPath(destination, "C:/outside.txt"),
    /absolute/,
  );
});
