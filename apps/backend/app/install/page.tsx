import type { Metadata } from 'next';

import InstallGuide from '../install-guide';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Install SPICE Local',
  description: 'Download, install, or run the portable SPICE local Windows runtime.',
};

export default function InstallPage() {
  return <InstallGuide />;
}
