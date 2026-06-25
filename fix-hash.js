const fs = require('fs');

const hashPath = 'apps/backend/test/hash.test.mjs';
let hashCode = fs.readFileSync(hashPath, 'utf8');

hashCode = hashCode.replace(/assert\.equal\(verifyPassword\('password', 'part1:part2:part3:part4'\), false\);\n\}\);\n\}\);/, "assert.equal(verifyPassword('password', 'part1:part2:part3:part4'), false);\n});");
// Also fix the error:
// Expected values to be strictly equal:
// 3 !== 2
// from test('hashPassword creates a properly formatted hash string')

hashCode = hashCode.replace(/const parts = result\.split\(':'\);\n  assert\.equal\(parts\.length, 2\);/, "const parts = result.split(':');\n  assert.equal(parts.length, 3);");
hashCode = hashCode.replace(/const \[salt, hash\] = parts;\n  assert\.ok\(salt\.length > 0\);\n  assert\.ok\(hash\.length > 0\);\n  assert\.match\(salt, \/\^\[0-9a-f\]\+\$\/i\);\n  assert\.match\(hash, \/\^\[0-9a-f\]\+\$\/i\);/, "const [salt, iterations, hash] = parts;\n  assert.ok(salt.length > 0);\n  assert.ok(iterations.length > 0);\n  assert.ok(hash.length > 0);\n  assert.match(salt, /^[0-9a-f]+$/i);\n  assert.match(iterations, /^[0-9]+$/);\n  assert.match(hash, /^[0-9a-f]+$/i);");

fs.writeFileSync(hashPath, hashCode);
