import { readWalkthrough, parseChangelog } from '@/app/changelog/changelog-data';
import { jsonResponse, optionsResponse } from '@/lib/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const markdown = await readWalkthrough();
    const rawEntries = parseChangelog(markdown);
    
    // Grab the top 3 entries for notifications
    const topEntries = rawEntries.slice(0, 3);
    
    const notifications = topEntries.map(entry => ({
      id: `spice-media-core-${entry.version.replace(/^v/, '')}`,
      version: entry.version.startsWith('v') ? entry.version : `v${entry.version}`,
      title: `SPICE ${entry.version} Updates`,
      summary: 'New release updates are available for SPICE.',
      body: entry.notes
    }));
    
    return jsonResponse({ notifications });
  } catch (error) {
    return jsonResponse({ notifications: [] });
  }
}
