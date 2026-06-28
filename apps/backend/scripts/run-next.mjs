import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [, , command = 'dev', target = 'local', ...extraArgs] = process.argv;
const normalizedTarget = target === 'vercel' ? 'vercel' : 'local';
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const args = [nextBin, command, ...extraArgs];
const env = {
  ...process.env,
  SPICE_RUNTIME_TARGET: normalizedTarget,
  NEXT_PUBLIC_SPICE_RUNTIME_TARGET: normalizedTarget,
  SPICE_CLOUD_API_ORIGIN:
    process.env.SPICE_CLOUD_API_ORIGIN ||
    process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN ||
    'https://music.spice-app.xyz',
  NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN:
    process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN ||
    process.env.SPICE_CLOUD_API_ORIGIN ||
    'https://music.spice-app.xyz',
  SPICE_LOCAL_API_ORIGIN:
    process.env.SPICE_LOCAL_API_ORIGIN ||
    process.env.NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN ||
    'http://127.0.0.1:3939',
  NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN:
    process.env.NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN ||
    process.env.SPICE_LOCAL_API_ORIGIN ||
    'http://127.0.0.1:3939',
};

if (normalizedTarget === 'local') {
  env.HOSTNAME = process.env.HOSTNAME || '127.0.0.1';
  env.PORT = process.env.PORT || '3939';
}

const child = spawn(process.execPath, args, {
  cwd: appRoot,
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
