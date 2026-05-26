import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

let dbInstance: any = null;

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!dbInstance) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not set');
      }
      const sql = neon(databaseUrl);
      dbInstance = drizzle(sql, { schema });
    }
    return Reflect.get(dbInstance, prop);
  }
});
