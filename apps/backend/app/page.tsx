import type { Metadata } from 'next';
import { headers } from 'next/headers';

import CloudPortal from './cloud-portal';
import InstallGuide from './install-guide';
import SpiceApp from './spice-app';
import { getRuntimeTarget } from '@/lib/runtime-target';

export const dynamic = 'force-dynamic';

const INSTALL_HOSTS = new Set(['install.spice-app.xyz']);

const INSTALL_METADATA: Metadata = {
  title: 'Install SPICE Local',
  description: 'Download, install, or run the portable SPICE local Windows runtime.',
};

export async function generateMetadata(): Promise<Metadata> {
  const host = normalizeHost((await headers()).get('host'));

  if (INSTALL_HOSTS.has(host)) {
    return INSTALL_METADATA;
  }

  if (getRuntimeTarget() === 'vercel') {
    return {
      title: 'SPICE Local Runtime Portal',
      description: 'The Vercel-hosted control plane for SPICE auth, sync, metadata, installs, and local runtime updates.',
    };
  }

  return {
    title: 'SPICE Music - Local PC Runtime',
    description: 'The local SPICE Music runtime for search, streaming, playlists, and Spice Connect.',
  };
}

export default async function Home() {
  const host = normalizeHost((await headers()).get('host'));

  if (INSTALL_HOSTS.has(host)) {
    return <InstallGuide />;
  }

  return getRuntimeTarget() === 'vercel' ? <CloudPortal /> : <SpiceApp />;
}

function normalizeHost(host: string | null) {
  return (host ?? '').split(',')[0]?.split(':')[0]?.trim().toLowerCase() ?? '';
}
