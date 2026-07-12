import type { Metadata } from 'next';

import ShelvedService from '../../shelved-service';

export const metadata: Metadata = {
  title: 'Spice Movie Watch - Shelved',
  description: 'The Spice Movie watch route is frozen while the local runtime split is active.',
};

export default function HostWatchPage() {
  return <ShelvedService name="Spice Movie Watch" />;
}
