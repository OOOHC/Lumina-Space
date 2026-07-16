import { Hono } from 'hono';
import { createDb } from '../db/client';
import type { AppEnv, Env } from '../env';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { objectKey, presignGet } from '../r2';
import {
  createDrizzlePublicationRepository,
  publishDraft,
  readPublished,
  unpublishDraft,
} from '../publicationService';

/** Protected publishing surface. Business invariants live in publicationService. */
export const publishing = new Hono<AppEnv>();
publishing.use('*', requireWorkspace);

publishing.post('/:id/publish', async (c) => {
  const result = await publishDraft(
    createDrizzlePublicationRepository(c.get('db')),
    c.get('workspaceId'),
    c.req.param('id'),
  );
  if (result.kind === 'not-found') return c.json({ error: 'not-found' }, 404);
  if (result.kind === 'not-ready') {
    return c.json({ error: 'not-ready', problems: result.problems }, 409);
  }
  return c.json({
    slug: result.slug,
    revisionSeq: result.revisionSeq,
    status: 'published',
  });
});

publishing.post('/:id/unpublish', async (c) => {
  const result = await unpublishDraft(
    createDrizzlePublicationRepository(c.get('db')),
    c.get('workspaceId'),
    c.req.param('id'),
  );
  if (result.kind === 'not-found') return c.json({ error: 'not-found' }, 404);
  return c.json({ status: 'unpublished' });
});

/** Public, unauthenticated viewer API. Reads immutable revisions only. */
export const publicExhibitions = new Hono<{ Bindings: Env }>();

publicExhibitions.get('/:slug', async (c) => {
  const result = await readPublished(
    createDrizzlePublicationRepository(createDb(c.env.DATABASE_URL)),
    c.req.param('slug'),
  );
  if (result.kind === 'not-found') return c.json({ error: 'not-found' }, 404);
  if (result.kind === 'removed') return c.json({ error: 'removed' }, 410);

  const { publication, revision, photos: snapshotPhotos } = result;
  const photos = await Promise.all(
    snapshotPhotos.map(async (photo) => ({
      id: photo.photoAssetId,
      title: photo.title,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      previewUrl: await presignGet(
        c.env,
        objectKey(publication.workspaceId, photo.photoAssetId, 'preview'),
      ),
      thumbUrl: await presignGet(
        c.env,
        objectKey(publication.workspaceId, photo.photoAssetId, 'thumb'),
      ),
    })),
  );

  c.header('Cache-Control', 'no-store');
  return c.json({
    slug: publication.slug,
    title: revision.title,
    description: revision.description,
    revisionSeq: revision.seq,
    publishedAt: revision.publishedAt,
    photos,
  });
});
