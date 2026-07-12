import { neon } from '@neondatabase/serverless';

export interface ProxySystemSettings {
  emergencyAusterity: boolean;
  austerityThrottleRate: number;
  disableSync: boolean;
  emergencyStop: boolean;
}

let cachedSettings: ProxySystemSettings | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000;

export async function getProxySystemSettings(): Promise<ProxySystemSettings | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const now = Date.now();
  if (cachedSettings && now - lastFetchTime <= CACHE_TTL_MS) {
    return cachedSettings;
  }

  const sql = neon(databaseUrl);
  const rows = await sql`SELECT emergency_austerity, austerity_throttle_rate, disable_sync, emergency_stop FROM system_settings WHERE id = 'default' LIMIT 1`;

  cachedSettings = rows && rows.length > 0
    ? {
        emergencyAusterity: Boolean(rows[0].emergency_austerity),
        austerityThrottleRate: Number(rows[0].austerity_throttle_rate ?? 50),
        disableSync: Boolean(rows[0].disable_sync),
        emergencyStop: Boolean(rows[0].emergency_stop),
      }
    : {
        emergencyAusterity: false,
        austerityThrottleRate: 50,
        disableSync: false,
        emergencyStop: false,
      };
  lastFetchTime = now;

  return cachedSettings;
}
