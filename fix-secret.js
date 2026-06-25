const fs = require('fs');

const path = 'apps/backend/test/secret-box.test.mjs';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('process.env.JWT_SECRET')) {
  code = `process.env.JWT_SECRET = 'test-secret-key-123';\n` + code;
  fs.writeFileSync(path, code);
}
