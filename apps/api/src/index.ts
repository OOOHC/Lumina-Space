import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { createDb } from './db/client';

/** Bindings provided via wrangler secrets / .dev.vars (never committed). */
export interface Env {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  /** Comma-separated allowed origins for the browser app. */
  WEB_ORIGIN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', (c, next) => {
  const origins = (c.env.WEB_ORIGIN ?? 'http://localhost:5173').split(',');
  return cors({
    origin: origins,
    credentials: true,
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })(c, next);
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'lumina-api' }));

// Better Auth owns everything under /api/auth (sign-up, sign-in, session, sign-out).
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(db, c.env.BETTER_AUTH_SECRET);
  return auth.handler(c.req.raw);
});

export default app;
