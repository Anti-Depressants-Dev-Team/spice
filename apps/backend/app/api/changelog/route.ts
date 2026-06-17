import { getChangelogPayload } from '@/app/changelog/changelog-data';
import type { ChangelogAccountRole } from '@/app/changelog/changelog-types';
import { jsonResponse, optionsResponse } from '@/lib/cors';
import { verifySession } from '@/lib/auth';

export const runtime = 'nodejs';

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const accountRole = await resolveAccountRole(request);
  const payload = await getChangelogPayload(accountRole);

  return jsonResponse(payload);
}

async function resolveAccountRole(request: Request): Promise<ChangelogAccountRole> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return 'user';
  }

  try {
    const session = await verifySession(auth.substring(7));
    return session.accountRole === 'admin' ? 'admin' : 'user';
  } catch {
    return 'user';
  }
}
