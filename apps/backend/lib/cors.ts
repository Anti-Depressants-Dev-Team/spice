export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Expose-Headers':
    'Accept-Ranges, Content-Length, Content-Range, Content-Type',
};

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init.headers,
    },
  });
}
