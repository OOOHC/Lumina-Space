import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { createAuth } from '../auth';
import { createDb } from '../db/client';
import { workspace } from '../db/schema';
import { webOrigins, type AppEnv } from '../env';

/**
 * The server side of ADR 0003: every protected route runs behind this.
 * The workspace scope is derived from the authenticated session — never
 * from a client-supplied identifier — so a request can only ever act on
 * its own workspace. Downstream handlers read db/userId/workspaceId from
 * context and add their own resource-level checks where needed.
 */
export const requireWorkspace = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(
    db,
    c.env.BETTER_AUTH_SECRET,
    webOrigins(c.env, c.req.url),
    new URL(c.req.url).origin,
  );
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'unauthenticated' }, 401);
  }

  const [ws] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.ownerId, session.user.id));
  if (!ws) {
    // Should be impossible (sign-up provisions the workspace); treat as a
    // server inconsistency rather than a client error.
    return c.json({ error: 'workspace-missing' }, 500);
  }

  c.set('db', db);
  c.set('userId', session.user.id);
  c.set('workspaceId', ws.id);
  await next();
});
