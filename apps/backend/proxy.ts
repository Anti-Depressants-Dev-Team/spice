import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Simple in-memory cache for edge runtime
let cachedSettings: {
  emergencyAusterity: boolean;
  austerityThrottleRate: number;
  disableSync: boolean;
  emergencyStop: boolean;
} | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Only apply to /api routes, but ignore admin APIs so we can still manage the system
  if (!url.pathname.startsWith('/api') || url.pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Pre-flight OPTIONS should always pass through
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // If no DB, we can't check settings. Just pass through.
    return NextResponse.next();
  }

  try {
    const now = Date.now();
    if (!cachedSettings || now - lastFetchTime > CACHE_TTL_MS) {
      const sql = neon(databaseUrl);
      const rows = await sql`SELECT emergency_austerity, austerity_throttle_rate, disable_sync, emergency_stop FROM system_settings WHERE id = 'default' LIMIT 1`;

      if (rows && rows.length > 0) {
        cachedSettings = {
          emergencyAusterity: rows[0].emergency_austerity,
          austerityThrottleRate: rows[0].austerity_throttle_rate,
          disableSync: rows[0].disable_sync,
          emergencyStop: rows[0].emergency_stop,
        };
      } else {
        cachedSettings = {
          emergencyAusterity: false,
          austerityThrottleRate: 50,
          disableSync: false,
          emergencyStop: false,
        };
      }
      lastFetchTime = now;
    }

    if (cachedSettings.emergencyStop) {
      return new NextResponse(
        JSON.stringify({ error: 'service_unavailable', message: 'System is temporarily halted for maintenance.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (cachedSettings.emergencyAusterity) {
      if (cachedSettings.disableSync && url.pathname.startsWith('/api/sync')) {
        return new NextResponse(
          JSON.stringify({ error: 'service_unavailable', message: 'Sync services are temporarily disabled.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Randomly throttle based on rate (0-100)
      // If throttle rate is 80, 80% of requests should be dropped
      const randomValue = Math.random() * 100;
      if (randomValue < cachedSettings.austerityThrottleRate) {
        return new NextResponse(
          JSON.stringify({ error: 'too_many_requests', message: 'System is under heavy load. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
        );
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware system settings check failed:', error);
    // Fail open if the database is unreachable to avoid breaking the whole app
    return NextResponse.next();
  }
}

export const config = {
  matcher: '/api/:path*',
};
