import type { Metadata } from 'next';

import ShelvedService from '../shelved-service';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Spice Movie - Shelved',
  description: 'Spice Movie is frozen while the SPICE local runtime split is active.',
};

export default function MoviePage() {
  return <ShelvedService name="Spice Movie" />;
}
