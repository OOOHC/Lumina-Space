import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { createDb } from './db/client';
import { workspace } from './db/schema';
import { webOrigins, type Env } from './env';
import { exhibitions } from './routes/exhibitions';
import { photos } from './routes/photos';

const app = new Hono<{ Bindings: Env }>();

app.use('*', (c, next) => {
  return cors({
    origin: webOrigins(c.env),
    credentials: true,
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  })(c, next);
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'lumina-api' }));

// Better Auth owns everything under /api/auth (sign-up, sign-in, session, sign-out).
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(db, c.env.BETTER_AUTH_SECRET, webOrigins(c.env));
  return auth.handler(c.req.raw);
});

// The signed-in account and its personal workspace (ADR 0003 read side).
app.get('/api/me', async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(db, c.env.BETTER_AUTH_SECRET, webOrigins(c.env));
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  const [ws] = await db
    .select({ id: workspace.id, name: workspace.name })
    .from(workspace)
    .where(eq(workspace.ownerId, session.user.id));
  return c.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    workspace: ws ?? null,
  });
});

// Workspace photo library (ownership enforced inside via requireWorkspace).
app.route('/api/photos', photos);

// Exhibition drafts (V4) — same ownership rules, mutable until V5 publishes.
app.route('/api/exhibitions', exhibitions);

export default app;
