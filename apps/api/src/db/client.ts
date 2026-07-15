import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

/**
 * One Drizzle client per request. Workers isolates are short-lived and may run
 * on any edge location, so the connection cannot be a module-level singleton;
 * neon-http sends each query over HTTPS, which suits that lifecycle and needs
 * no connection pool of its own beyond Neon's pooler endpoint.
 */
export function createDb(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}
