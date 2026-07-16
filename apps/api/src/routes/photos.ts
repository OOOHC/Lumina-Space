import { and, desc, eq, gt, isNotNull, isNull, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { exhibition, exhibitionPhoto, photoAsset } from '../db/schema';
import type { AppEnv } from '../env';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { rejectUpload, storageSummary } from '../quota';
import { deleteObject, objectKey, presignGet, presignPut, type ObjectKind } from '../r2';

/**
 * The workspace photo library (V3). Reads are scoped to the session's
 * workspace by requireWorkspace; nothing here accepts a workspace id from
 * the client. Upload issuance arrives with the R2 step (Phase 4) — until
 * then the library lists what exists and reports storage headroom.
 */
export const photos = new Hono<AppEnv>();

photos.use('*', requireWorkspace);

/** Pending (unconfirmed) uploads newer than this still reserve quota. */
const PENDING_RESERVATION_MS = 60 * 60 * 1000;

async function quotaSizes(
  db: AppEnv['Variables']['db'],
  workspaceId: string,
): Promise<number[]> {
  // Quota counts archived assets (bytes still stored) and recent pending
  // uploads (reserved), but lets abandoned upload requests age out.
  const rows = await db
    .select({ sizeBytes: photoAsset.sizeBytes })
    .from(photoAsset)
    .where(
      and(
        eq(photoAsset.workspaceId, workspaceId),
        or(
          isNotNull(photoAsset.uploadedAt),
          gt(photoAsset.createdAt, new Date(Date.now() - PENDING_RESERVATION_MS)),
        ),
      ),
    );
  return rows.map((row) => row.sizeBytes);
}

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
    .where(
      and(
        eq(photoAsset.workspaceId, workspaceId),
        isNull(photoAsset.archivedAt),
        isNotNull(photoAsset.uploadedAt),
      ),
    )
    .orderBy(desc(photoAsset.createdAt));

  return c.json({
    photos: visible,
    storage: storageSummary(await quotaSizes(db, workspaceId)),
  });
});

interface UploadRequestBody {
  title: string;
  caption?: string;
  contentType: string;
  /** Total bytes across original + preview + thumb (all three are stored). */
  totalBytes: number;
  width: number;
  height: number;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const KINDS: ObjectKind[] = ['original', 'preview', 'thumb'];

/**
 * Step 1 of the ADR 0006 upload flow: verify ownership (middleware), enforce
 * quota, reserve the asset row, and hand back short-lived presigned PUT URLs.
 * Bytes go browser → R2 directly; they never transit this API.
 */
photos.post('/upload-request', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');

  const body = (await c.req.json().catch(() => null)) as UploadRequestBody | null;
  if (
    !body ||
    typeof body.title !== 'string' ||
    body.title.trim().length === 0 ||
    typeof body.contentType !== 'string' ||
    !Number.isFinite(body.totalBytes) ||
    body.totalBytes <= 0 ||
    !Number.isInteger(body.width) ||
    !Number.isInteger(body.height) ||
    body.width <= 0 ||
    body.height <= 0
  ) {
    return c.json({ error: 'invalid-request' }, 400);
  }
  if (!ALLOWED_TYPES.has(body.contentType)) {
    return c.json({ error: 'unsupported-type' }, 415);
  }

  const used = storageSummary(await quotaSizes(db, workspaceId)).usedBytes;
  const rejection = rejectUpload(used, body.totalBytes);
  if (rejection) {
    return c.json({ error: rejection }, 413);
  }

  const assetId = crypto.randomUUID();
  await db.insert(photoAsset).values({
    id: assetId,
    workspaceId,
    title: body.title.trim(),
    caption: body.caption?.trim() || null,
    storageKey: objectKey(workspaceId, assetId, 'original'),
    contentType: body.contentType,
    sizeBytes: Math.round(body.totalBytes),
    width: body.width,
    height: body.height,
  });

  const uploads = await Promise.all(
    KINDS.map(async (kind) => ({
      kind,
      url: await presignPut(c.env, objectKey(workspaceId, assetId, kind)),
    })),
  );

  return c.json({ assetId, uploads });
});

/** Step 2: the browser confirms every object reached storage. */
photos.post('/:id/confirm', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const [updated] = await db
    .update(photoAsset)
    .set({ uploadedAt: new Date() })
    .where(
      and(
        eq(photoAsset.id, id),
        eq(photoAsset.workspaceId, workspaceId),
        isNull(photoAsset.uploadedAt),
      ),
    )
    .returning({ id: photoAsset.id, uploadedAt: photoAsset.uploadedAt });
  if (!updated) {
    return c.json({ error: 'not-found' }, 404);
  }
  return c.json(updated);
});

/**
 * Remove a photograph from the library: storage objects first, then the row,
 * so a failed storage delete cannot orphan invisible bytes. Since V4, a
 * photograph referenced by any exhibition draft REFUSES deletion (ADR 0002)
 * — the reference check runs before anything is touched, and the FK without
 * cascade is the database-level backstop. V5 published revisions extend the
 * same rule to snapshots.
 */
photos.delete('/:id', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const [asset] = await db
    .select({ id: photoAsset.id })
    .from(photoAsset)
    .where(and(eq(photoAsset.id, id), eq(photoAsset.workspaceId, workspaceId)));
  if (!asset) {
    return c.json({ error: 'not-found' }, 404);
  }

  const references = await db
    .select({ title: exhibition.title })
    .from(exhibitionPhoto)
    .innerJoin(exhibition, eq(exhibitionPhoto.exhibitionId, exhibition.id))
    .where(eq(exhibitionPhoto.photoAssetId, id));
  if (references.length > 0) {
    return c.json(
      { error: 'referenced', exhibitions: references.map((r) => r.title) },
      409,
    );
  }

  await Promise.all(
    KINDS.map((kind) => deleteObject(c.env, objectKey(workspaceId, id, kind))),
  );
  await db.delete(photoAsset).where(eq(photoAsset.id, id));
  return c.body(null, 204);
});

/** Private-bucket reads: redirect to a short-lived presigned GET. */
photos.get('/:id/view', async (c) => {
  const db = c.get('db');
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');
  const kindParam = c.req.query('kind') ?? 'thumb';
  if (!KINDS.includes(kindParam as ObjectKind)) {
    return c.json({ error: 'invalid-kind' }, 400);
  }

  const [asset] = await db
    .select({ id: photoAsset.id })
    .from(photoAsset)
    .where(
      and(
        eq(photoAsset.id, id),
        eq(photoAsset.workspaceId, workspaceId),
        isNotNull(photoAsset.uploadedAt),
      ),
    );
  if (!asset) {
    return c.json({ error: 'not-found' }, 404);
  }

  const url = await presignGet(c.env, objectKey(workspaceId, id, kindParam as ObjectKind));
  return c.redirect(url, 302);
});
