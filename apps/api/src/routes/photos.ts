import { and, desc, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { photoAsset } from '../db/schema';
import type { AppEnv } from '../env';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { storageSummary } from '../quota';

/**
 * The workspace photo library (V3). Reads are scoped to the session's
 * workspace by requireWorkspace; nothing here accepts a workspace id from
 * the client. Upload issuance arrives with the R2 step (Phase 4) — until
 * then the library lists what exists and reports storage headroom.
 */
export const photos = new Hono<AppEnv>();

photos.use('*', requireWorkspace);

photos.get('/', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');

  const visible = await db
    .select({
      id: photoAsset.id,
      title: photoAsset.title,
      caption: photoAsset.caption,
      contentType: photoAsset.contentType,
      sizeBytes: photoAsset.sizeBytes,
      width: photoAsset.width,
      height: photoAsset.height,
      createdAt: photoAsset.createdAt,
    })
    .from(photoAsset)
    .where(and(eq(photoAsset.workspaceId, workspaceId), isNull(photoAsset.archivedAt)))
    .orderBy(desc(photoAsset.createdAt));

  // Quota counts archived assets too: their bytes still occupy storage.
  const all = await db
    .select({ sizeBytes: photoAsset.sizeBytes })
    .from(photoAsset)
    .where(eq(photoAsset.workspaceId, workspaceId));

  return c.json({
    photos: visible,
    storage: storageSummary(all.map((row) => row.sizeBytes)),
  });
});
