const fs = require('fs');

const hashPath = 'apps/backend/test/hash.test.mjs';
const hashCode = fs.readFileSync(hashPath, 'utf8');
if (!hashCode.endsWith('});\n')) {
  fs.appendFileSync(hashPath, '});\n');
}

const streamPath = 'apps/backend/test/stream-signing.test.mjs';
const streamCode = fs.readFileSync(streamPath, 'utf8');
if (!streamCode.endsWith('});\n')) {
  fs.appendFileSync(streamPath, '});\n');
}
