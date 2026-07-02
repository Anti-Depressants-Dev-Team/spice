import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

import * as schema from './db/schema';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    return;
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const allUsers = await db.query.users.findMany();
  console.log(JSON.stringify(allUsers, null, 2));

  const allProfiles = await db.query.profiles.findMany();
  console.log('--- PROFILES ---');
  console.log(JSON.stringify(allProfiles, null, 2));
}

main().catch(console.error);
