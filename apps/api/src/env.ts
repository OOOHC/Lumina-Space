import type { Database } from './db/client';

/** Bindings provided via wrangler secrets / .dev.vars (never committed). */
export interface Env {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  /** Comma-separated allowed origins for the browser app. */
  WEB_ORIGIN: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  /** Vite production build served by the same Worker. */
  ASSETS: Fetcher;
}

/** Browser origins allowed by both CORS and Better Auth's origin check. */
export function webOrigins(env: Env, requestUrl: string): string[] {
  const current = new URL(requestUrl);
  const origins = new Set([current.origin]);
  if (current.hostname === 'localhost' || current.hostname === '127.0.0.1') {
    for (const origin of (env.WEB_ORIGIN ?? 'http://localhost:5174').split(',')) {
      if (origin.trim()) origins.add(origin.trim());
    }
  }
  return [...origins];
}

/** Hono context shape once requireWorkspace has run. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    userId: string;
    workspaceId: string;
  };
};
