import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  exhibition,
  exhibitionPhoto,
  photoAsset,
  publication,
  publishedRevision,
} from '../db/schema';
import type { AppEnv, Env } from '../env';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { publicationReadiness } from '../readiness';
import { objectKey, presignGet } from '../r2';

/**
 * Exhibition drafts (V4). The draft is mutable and private; publishing (V5)
 * will snapshot it into an immutable revision, so nothing here can ever
 * change a live exhibition (ADR 0005). Every route is workspace-scoped by
 * requireWorkspace; photo references are validated against the same
 * workspace so a draft can never point at someone else's asset.
 */
export const exhibitions = new Hono<AppEnv>();

exhibitions.use('*', requireWorkspace);

async function loadExhibition(
  db: AppEnv['Variables']['db'],
  workspaceId: string,
  id: string,
) {
  const [draft] = await db
    .select()
    .from(exhibition)
    .where(and(eq(exhibition.id, id), eq(exhibition.workspaceId, workspaceId)));
  return draft ?? null;
}

async function exhibitionResponse(
  db: AppEnv['Variables']['db'],
  env: Env,
  draft: typeof exhibition.$inferSelect,
) {
  const rows = await db
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
    .where(eq(exhibitionPhoto.exhibitionId, draft.id))
    .orderBy(asc(exhibitionPhoto.position));

  // Presigned URLs ride along because 3D texture loaders fetch anonymously
  // (no cookies), so the credentialed /view redirect cannot serve them.
  const photos = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      previewUrl: await presignGet(env, objectKey(draft.workspaceId, row.id, 'preview')),
      thumbUrl: await presignGet(env, objectKey(draft.workspaceId, row.id, 'thumb')),
    })),
  );

  const [pub] = await db
    .select({
      slug: publication.slug,
      status: publication.status,
      currentRevisionId: publication.currentRevisionId,
    })
    .from(publication)
    .where(eq(publication.exhibitionId, draft.id));

  let publicationInfo: {
    slug: string;
    status: 'published' | 'unpublished';
    revisionSeq: number;
    publishedAt: Date;
    draftChangedSincePublish: boolean;
  } | null = null;
  if (pub?.currentRevisionId) {
    const [rev] = await db
      .select({ seq: publishedRevision.seq, publishedAt: publishedRevision.publishedAt })
      .from(publishedRevision)
      .where(eq(publishedRevision.id, pub.currentRevisionId));
    if (rev) {
      publicationInfo = {
        slug: pub.slug,
        status: pub.status,
        revisionSeq: rev.seq,
        publishedAt: rev.publishedAt,
        draftChangedSincePublish: draft.updatedAt > rev.publishedAt,
      };
    }
  }

  return {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    coverPhotoId: draft.coverPhotoId,
    status: draft.status,
    updatedAt: draft.updatedAt,
    photos,
    publication: publicationInfo,
    readiness: publicationReadiness({
      title: draft.title,
      photoCount: photos.length,
      status: draft.status,
    }),
  };
}

exhibitions.get('/', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const rows = await db
    .select({
      id: exhibition.id,
      title: exhibition.title,
      status: exhibition.status,
      updatedAt: exhibition.updatedAt,
      coverPhotoId: exhibition.coverPhotoId,
      publicationStatus: publication.status,
      photoCount: count(exhibitionPhoto.photoAssetId),
    })
    .from(exhibition)
    .leftJoin(exhibitionPhoto, eq(exhibitionPhoto.exhibitionId, exhibition.id))
    .leftJoin(publication, eq(publication.exhibitionId, exhibition.id))
    .where(eq(exhibition.workspaceId, workspaceId))
    .groupBy(exhibition.id, publication.id)
    .orderBy(desc(exhibition.updatedAt));
  return c.json({ exhibitions: rows });
});

exhibitions.post('/', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const body = (await c.req.json().catch(() => null)) as { title?: string } | null;
  const title = body?.title?.trim();
  if (!title) {
    return c.json({ error: 'missing-title' }, 400);
  }
  const id = crypto.randomUUID();
  await db.insert(exhibition).values({ id, workspaceId, title });
  const draft = await loadExhibition(db, workspaceId, id);
  return c.json(await exhibitionResponse(db, c.env, draft!), 201);
});

exhibitions.get('/:id', async (c) => {
  const db = c.get('db');
  const draft = await loadExhibition(db, c.get('workspaceId'), c.req.param('id'));
  if (!draft) return c.json({ error: 'not-found' }, 404);
  return c.json(await exhibitionResponse(db, c.env, draft));
});

interface SaveBody {
  title?: string;
  description?: string | null;
  coverPhotoId?: string | null;
  /** Full ordered photo list; presence replaces the previous order entirely. */
  photoIds?: string[];
}

/**
 * Autosave endpoint: partial updates, last write wins, always answers with
 * the saved state + readiness so the editor can show Saved/Failed honestly.
 */
exhibitions.put('/:id', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const draft = await loadExhibition(db, workspaceId, c.req.param('id'));
  if (!draft) return c.json({ error: 'not-found' }, 404);

  const body = (await c.req.json().catch(() => null)) as SaveBody | null;
  if (!body) return c.json({ error: 'invalid-request' }, 400);
  if (body.title !== undefined && body.title.trim().length === 0) {
    return c.json({ error: 'missing-title' }, 400);
  }

  let photoIds = body.photoIds;
  if (photoIds !== undefined) {
    photoIds = [...new Set(photoIds)];
    if (photoIds.length > 0) {
      const owned = await db
        .select({ id: photoAsset.id })
        .from(photoAsset)
        .where(
          and(
            eq(photoAsset.workspaceId, workspaceId),
            inArray(photoAsset.id, photoIds),
          ),
        );
      if (owned.length !== photoIds.length) {
        return c.json({ error: 'unknown-photo' }, 400);
      }
    }
    await db.delete(exhibitionPhoto).where(eq(exhibitionPhoto.exhibitionId, draft.id));
    if (photoIds.length > 0) {
      await db.insert(exhibitionPhoto).values(
        photoIds.map((photoAssetId, position) => ({
          exhibitionId: draft.id,
          photoAssetId,
          position,
        })),
      );
    }
  }

  const effectivePhotoIds =
    photoIds ??
    (
      await db
        .select({ id: exhibitionPhoto.photoAssetId })
        .from(exhibitionPhoto)
        .where(eq(exhibitionPhoto.exhibitionId, draft.id))
    ).map((row) => row.id);

  const coverPhotoId =
    body.coverPhotoId !== undefined ? body.coverPhotoId : draft.coverPhotoId;
  if (coverPhotoId !== null && !effectivePhotoIds.includes(coverPhotoId)) {
    return c.json({ error: 'cover-not-in-exhibition' }, 400);
  }

  await db
    .update(exhibition)
    .set({
      title: body.title !== undefined ? body.title.trim() : draft.title,
      description:
        body.description !== undefined ? body.description : draft.description,
      coverPhotoId,
      // DB clock, not Worker clock: publishedAt also comes from the DB, and
      // draftChangedSincePublish compares the two — mixed clocks skew it.
      updatedAt: sql`now()`,
    })
    .where(eq(exhibition.id, draft.id));

  const saved = await loadExhibition(db, workspaceId, draft.id);
  return c.json(await exhibitionResponse(db, c.env, saved!));
});

exhibitions.post('/:id/archive', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const [updated] = await db
    .update(exhibition)
    .set({ status: 'archived', updatedAt: sql`now()` })
    .where(
      and(eq(exhibition.id, c.req.param('id')), eq(exhibition.workspaceId, workspaceId)),
    )
    .returning({ id: exhibition.id, status: exhibition.status });
  if (!updated) return c.json({ error: 'not-found' }, 404);
  return c.json(updated);
});

exhibitions.post('/:id/restore', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const [updated] = await db
    .update(exhibition)
    .set({ status: 'active', updatedAt: sql`now()` })
    .where(
      and(eq(exhibition.id, c.req.param('id')), eq(exhibition.workspaceId, workspaceId)),
    )
    .returning({ id: exhibition.id, status: exhibition.status });
  if (!updated) return c.json({ error: 'not-found' }, 404);
  return c.json(updated);
});
