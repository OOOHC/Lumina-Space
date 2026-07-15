import { Hono } from 'hono';

/** Bindings provided via wrangler secrets / .dev.vars (never committed). */
export interface Env {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'lumina-api' }),
);

export default app;
