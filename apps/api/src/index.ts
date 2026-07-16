import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAuth } from './auth';
import { createDb } from './db/client';
import { workspace } from './db/schema';
import { webOrigins, type Env } from './env';
import { createDrizzlePublicationRepository, readPublished } from './publicationService';
import { objectKey, presignGet } from './r2';
import { exhibitions } from './routes/exhibitions';
import { photos } from './routes/photos';
import { publicExhibitions, publishing } from './routes/publications';
import { buildShareMetadata } from './shareMetadata';

const app = new Hono<{ Bindings: Env }>();

app.use('*', (c, next) => {
  return cors({
    origin: webOrigins(c.env, c.req.url),
    credentials: true,
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })(c, next);
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'lumina-api' }));

// Social crawlers do not execute the SPA. Serve the same index shell while
// replacing metadata from the immutable revision behind the stable slug.
app.get('/e/:slug', async (c) => {
  const indexUrl = new URL('/', c.req.url);
  const indexResponse = await c.env.ASSETS.fetch(new Request(indexUrl, c.req.raw));
  if (!indexResponse.ok) return indexResponse;

  try {
    const result = await readPublished(
      createDrizzlePublicationRepository(createDb(c.env.DATABASE_URL)),
      c.req.param('slug'),
    );
    if (result.kind !== 'published') return indexResponse;

    const cover =
      result.photos.find((photo) => photo.photoAssetId === result.revision.coverPhotoId) ??
      result.photos[0];
    const imageUrl = cover
      ? await presignGet(
          c.env,
          objectKey(result.publication.workspaceId, cover.photoAssetId, 'preview'),
        )
      : null;
    const metadata = buildShareMetadata({
      origin: new URL(c.req.url).origin,
      slug: result.publication.slug,
      title: result.revision.title,
      description: result.revision.description,
      imageUrl,
    });

    const rewriter = new HTMLRewriter()
      .on('title', {
        element(element) {
          element.setInnerContent(metadata.documentTitle);
        },
      })
      .on('meta[name="description"]', {
        element(element) {
          element.setAttribute('content', metadata.description);
        },
      })
      .on('meta[property="og:title"]', {
        element(element) {
          element.setAttribute('content', metadata.title);
        },
      })
      .on('meta[property="og:description"]', {
        element(element) {
          element.setAttribute('content', metadata.description);
        },
      })
      .on('meta[property="og:url"]', {
        element(element) {
          element.setAttribute('content', metadata.url);
        },
      })
      .on('meta[property="og:image"]', {
        element(element) {
          if (metadata.imageUrl) element.setAttribute('content', metadata.imageUrl);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(element) {
          element.setAttribute('content', metadata.title);
        },
      })
      .on('meta[name="twitter:description"]', {
        element(element) {
          element.setAttribute('content', metadata.description);
        },
      })
      .on('meta[name="twitter:image"]', {
        element(element) {
          if (metadata.imageUrl) element.setAttribute('content', metadata.imageUrl);
        },
      });
    const response = rewriter.transform(indexResponse);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    // Metadata failure must never make a published exhibition unreachable.
    return indexResponse;
  }
});

// Better Auth owns everything under /api/auth (sign-up, sign-in, session, sign-out).
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const auth = createAuth(
    db,
    c.env.BETTER_AUTH_SECRET,
    webOrigins(c.env, c.req.url),
    new URL(c.req.url).origin,
  );
  return auth.handler(c.req.raw);
});

// The signed-in account and its personal workspace (ADR 0003 read side).
app.get('/api/me', async (c) => {
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

// Publishing (V5): snapshot to immutable revisions; stable public slugs.
app.route('/api/exhibitions', publishing);
app.route('/api/public/exhibitions', publicExhibitions);

export default app;
