const fs = require('fs');

const streamPath = 'apps/backend/test/stream-signing.test.mjs';
let streamCode = fs.readFileSync(streamPath, 'utf8');

streamCode = streamCode.replace(/import \{ buildSignedStreamUrl, verifySignedStream \} from '\.\.\/lib\/stream-signing\.ts';/g, '');

const importCode = "import { buildSignedStreamUrl, verifySignedStream } from '../lib/stream-signing.ts';\n";
streamCode = streamCode.replace(/import \{ buildSignedStreamUrl \} from '\.\.\/lib\/stream-signing\.ts';/g, importCode);

fs.writeFileSync(streamPath, streamCode);
