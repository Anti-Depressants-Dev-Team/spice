import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || 'development';
  return NextResponse.json(
    { version },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
