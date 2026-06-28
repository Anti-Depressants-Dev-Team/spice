import type { Metadata } from 'next';

import CloudPortal from './cloud-portal';
import SpiceApp from './spice-app';
import { getRuntimeTarget } from '@/lib/runtime-target';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  if (getRuntimeTarget() === 'vercel') {
    return {
      title: 'SPICE Connect Portal',
      description: 'The Vercel-hosted portal for SPICE auth, metadata, sync, and local runtime downloads.',
    };
  }

  return {
    title: 'SPICE Music - Local PC Runtime',
    description: 'The local SPICE Music runtime for search, streaming, playlists, and Spice Connect.',
  };
}

export default function Home() {
  return getRuntimeTarget() === 'vercel' ? <CloudPortal /> : <SpiceApp />;
}
