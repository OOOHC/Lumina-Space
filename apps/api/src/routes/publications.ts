import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Database } from '../db/client';
import {
  exhibition,
  exhibitionPhoto,
  photoAsset,
  publication,
  publishedRevision,
  publishedRevisionPhoto,
} from '../db/schema';
import type { AppEnv, Env } from '../env';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { objectKey, presignGet } from '../r2';
import { publicationReadiness } from '../readiness';

/**
 * Publishing (V5, ADR 0005). A publish snapshots the draft into an immutable
 * revision; the stable slug's pointer advances as the LAST write (single
 * UPDATE = atomic without transactions), so the public link always resolves
 * to a complete revision or the previous one — never a half-published state.
 */

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return base.length > 0 ? `${base}-${suffix}` : suffix;
}

export const publishing = new Hono<AppEnv>();
publishing.use('*', requireWorkspace);

publishing.post('/:id/publish', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const [draft] = await db
    .select()
    .from(exhibition)
    .where(and(eq(exhibition.id, id), eq(exhibition.workspaceId, workspaceId)));
  if (!draft) return c.json({ error: 'not-found' }, 404);

  const draftPhotos = await db
    .select({
      id: photoAsset.id,
      title: photoAsset.title,
      caption: photoAsset.caption,
      width: photoAsset.width,
      height: photoAsset.height,
      position: exhibitionPhoto.position,
    })
    .from(exhibitionPhoto)
    .innerJoin(photoAsset, eq(exhibitionPhoto.photoAssetId, photoAsset.id))
    .where(eq(exhibitionPhoto.exhibitionId, id))
    .orderBy(asc(exhibitionPhoto.position));

  const readiness = publicationReadiness({
    title: draft.title,
    photoCount: draftPhotos.length,
    status: draft.status,
  });
  if (!readiness.ready) {
    return c.json({ error: 'not-ready', problems: readiness.problems }, 409);
  }

  // Find or create the stable publication identity (slug never changes).
  let [pub] = await db
    .select()
    .from(publication)
    .where(eq(publication.exhibitionId, id));
  if (!pub) {
    const created = {
      id: crypto.randomUUID(),
      exhibitionId: id,
      workspaceId,
      slug: makeSlug(draft.title),
    };
    await db.insert(publication).values(created);
    [pub] = await db.select().from(publication).where(eq(publication.id, created.id));
  }

  const [latest] = await db
    .select({ seq: publishedRevision.seq })
    .from(publishedRevision)
    .where(eq(publishedRevision.publicationId, pub.id))
    .orderBy(desc(publishedRevision.seq))
    .limit(1);

  // 1) Write the immutable snapshot…
  const revisionId = crypto.randomUUID();
  await db.insert(publishedRevision).values({
    id: revisionId,
    publicationId: pub.id,
    seq: (latest?.seq ?? 0) + 1,
    title: draft.title,
    description: draft.description,
    coverPhotoId: draft.coverPhotoId,
  });
  if (draftPhotos.length > 0) {
    await db.insert(publishedRevisionPhoto).values(
      draftPhotos.map((p) => ({
        revisionId,
        photoAssetId: p.id,
        position: p.position,
        title: p.title,
        caption: p.caption,
        width: p.width,
        height: p.height,
      })),
    );
  }

  // 2) …then advance the stable pointer in one atomic UPDATE.
  await db
    .update(publication)
    .set({ currentRevisionId: revisionId, status: 'published', updatedAt: sql`now()` })
    .where(eq(publication.id, pub.id));

  return c.json({
    slug: pub.slug,
    revisionSeq: (latest?.seq ?? 0) + 1,
    status: 'published',
  });
});

publishing.post('/:id/unpublish', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const [pub] = await db
    .select({ id: publication.id })
    .from(publication)
    .innerJoin(exhibition, eq(publication.exhibitionId, exhibition.id))
    .where(
      and(
        eq(publication.exhibitionId, c.req.param('id')),
        eq(exhibition.workspaceId, workspaceId),
      ),
    );
  if (!pub) return c.json({ error: 'not-found' }, 404);
  await db
    .update(publication)
    .set({ status: 'unpublished', updatedAt: sql`now()` })
    .where(eq(publication.id, pub.id));
  return c.json({ status: 'unpublished' });
});

/** Public, unauthenticated viewer API. Reads immutable revisions only. */
export const publicExhibitions = new Hono<{ Bindings: Env }>();

publicExhibitions.get('/:slug', async (c) => {
  const { createDb } = await import('../db/client');
  const db: Database = createDb(c.env.DATABASE_URL);

  const [pub] = await db
    .select()
    .from(publication)
    .where(eq(publication.slug, c.req.param('slug')));
  // Correct states per the V5 gate: unknown → 404, unpublished → 410.
  if (!pub) return c.json({ error: 'not-found' }, 404);
  if (pub.status !== 'published' || !pub.currentRevisionId) {
    return c.json({ error: 'removed' }, 410);
  }

  const [revision] = await db
    .select()
    .from(publishedRevision)
    .where(eq(publishedRevision.id, pub.currentRevisionId));
  if (!revision) return c.json({ error: 'removed' }, 410);

  const rows = await db
    .select()
    .from(publishedRevisionPhoto)
    .where(eq(publishedRevisionPhoto.revisionId, revision.id))
    .orderBy(asc(publishedRevisionPhoto.position));

  const photos = await Promise.all(
    rows.map(async (p) => ({
      id: p.photoAssetId,
      title: p.title,
      caption: p.caption,
      width: p.width,
      height: p.height,
      previewUrl: await presignGet(
        c.env,
        objectKey(pub.workspaceId, p.photoAssetId, 'preview'),
      ),
      thumbUrl: await presignGet(
        c.env,
        objectKey(pub.workspaceId, p.photoAssetId, 'thumb'),
      ),
    })),
  );

  // no-store: correctness before caching — presigned URLs expire, and a
  // republish must be visible on the next load (cache policy revisited at
  // deployment with real traffic numbers).
  c.header('Cache-Control', 'no-store');
  return c.json({
    slug: pub.slug,
    title: revision.title,
    description: revision.description,
    revisionSeq: revision.seq,
    publishedAt: revision.publishedAt,
    photos,
  });
});
