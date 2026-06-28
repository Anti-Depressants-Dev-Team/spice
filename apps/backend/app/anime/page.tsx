import type { Metadata } from 'next';

import ShelvedService from '../shelved-service';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Spice Anime - Shelved',
  description: 'Spice Anime is frozen while the SPICE local runtime split is active.',
};

export default function AnimePage() {
  return <ShelvedService name="Spice Anime" />;
}
