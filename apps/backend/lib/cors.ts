const DEFAULT_ALLOWED_ORIGINS = [
  'https://spice-app.xyz',
  'https://www.spice-app.xyz',
  'https://music.spice-app.xyz',
  'https://anime.spice-app.xyz',
  'https://movie.spice-app.xyz',
  'http://localhost:3000',
  'http://localhost:3939',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3939',
];

export const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range, Authorization',
  'Access-Control-Expose-Headers':
    'Accept-Ranges, Content-Length, Content-Range, Content-Type',
};

export function corsHeadersForRequest(request?: Request | null) {
  const headers: Record<string, string> = { ...corsHeaders };
  const origin = request?.headers.get('origin')?.trim();

  if (origin && isAllowedCorsOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

export function withCors(response: Response, request?: Request | null) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeadersForRequest(request))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function optionsResponse(request?: Request | null) {
  return new Response(null, { status: 204, headers: corsHeadersForRequest(request) });
}

export function jsonResponse(body: unknown, init: ResponseInit = {}, request?: Request | null) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeadersForRequest(request),
      ...init.headers,
    },
  });
}

export function isAllowedCorsOrigin(origin: string) {
  return allowedCorsOrigins().has(origin);
}

function allowedCorsOrigins() {
  const configured = (process.env.SPICE_CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}
