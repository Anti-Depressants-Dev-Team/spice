import { jsonResponse, optionsResponse } from '@/lib/cors';
import { runtimeConfigPayload } from '@/lib/runtime-target';

export const runtime = 'nodejs';

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export function GET(request: Request) {
  return jsonResponse(runtimeConfigPayload(), { status: 200 }, request);
}
