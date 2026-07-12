import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'SPICE_RUNTIME_TARGET=vercel next build',

  headers: [
    {
      source: '/api/local/(.*)/stream/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'Accept-Ranges', value: 'bytes' },
      ],
    },
  ],
};

export default config;
