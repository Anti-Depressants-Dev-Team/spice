import { headers } from 'next/headers';

import MarketingHome from './marketing-home';
import SpiceApp from './spice-app';

const LANDING_HOSTS = new Set(['spice-app.xyz', 'www.spice-app.xyz']);

export const dynamic = 'force-dynamic';

export default async function Home() {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get('host') || requestHeaders.get('x-forwarded-host') || '',
  );

  if (LANDING_HOSTS.has(host)) {
    return <MarketingHome />;
  }

  return <SpiceApp />;
}

function normalizeHost(value: string) {
  return value
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}
