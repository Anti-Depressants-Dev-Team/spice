const fs = require('fs');

const streamPath = 'apps/backend/test/stream-signing.test.mjs';
let streamCode = fs.readFileSync(streamPath, 'utf8');

if (streamCode.includes("<<<<<<<")) {
  console.log("Fixing stream-signing merge conflicts");
  streamCode = streamCode.replace(/<<<<<<< SEARCH[\s\S]*?=======\n/g, '').replace(/>>>>>>> REPLACE\n/g, '');
  fs.writeFileSync(streamPath, streamCode);
} else {
  console.log("No merge conflicts found in stream-signing");
}

const hashPath = 'apps/backend/test/hash.test.mjs';
let hashCode = fs.readFileSync(hashPath, 'utf8');

if (hashCode.includes("<<<<<<<")) {
  console.log("Fixing hash merge conflicts");
  hashCode = hashCode.replace(/<<<<<<< SEARCH[\s\S]*?=======\n/g, '').replace(/>>>>>>> REPLACE\n/g, '');
  fs.writeFileSync(hashPath, hashCode);
} else {
  console.log("No merge conflicts found in hash");
}
