import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Database } from './db/client';
import {
  exhibition,
  exhibitionPhoto,
  photoAsset,
  publication,
  publishedRevision,
  publishedRevisionPhoto,
} from './db/schema';
import { publicationReadiness } from './readiness';

export interface PublicationDraft {
  id: string;
  title: string;
  description: string | null;
  coverPhotoId: string | null;
  status: 'active' | 'archived';
}

export interface PublicationPhoto {
  id: string;
  title: string;
  caption: string | null;
  width: number;
  height: number;
  position: number;
}

export interface PublicationRecord {
  id: string;
  exhibitionId: string;
  workspaceId: string;
  slug: string;
  currentRevisionId: string | null;
  status: 'published' | 'unpublished';
}

export interface RevisionRecord {
  id: string;
  publicationId: string;
  seq: number;
  title: string;
  description: string | null;
  coverPhotoId: string | null;
  publishedAt: Date;
}

export interface RevisionPhotoRecord extends Omit<PublicationPhoto, 'id'> {
  revisionId: string;
  photoAssetId: string;
}

export interface PublicationRepository {
  findDraft(workspaceId: string, exhibitionId: string): Promise<PublicationDraft | null>;
  listDraftPhotos(exhibitionId: string): Promise<PublicationPhoto[]>;
  findByExhibition(exhibitionId: string): Promise<PublicationRecord | null>;
  createPublication(record: Omit<PublicationRecord, 'currentRevisionId' | 'status'>): Promise<PublicationRecord>;
  latestRevisionSeq(publicationId: string): Promise<number>;
  insertRevision(record: Omit<RevisionRecord, 'publishedAt'>): Promise<void>;
  insertRevisionPhotos(records: RevisionPhotoRecord[]): Promise<void>;
  pointAtRevision(publicationId: string, revisionId: string): Promise<void>;
  findOwnedPublication(workspaceId: string, exhibitionId: string): Promise<PublicationRecord | null>;
  markUnpublished(publicationId: string): Promise<void>;
  findBySlug(slug: string): Promise<PublicationRecord | null>;
  findRevision(revisionId: string): Promise<RevisionRecord | null>;
  listRevisionPhotos(revisionId: string): Promise<RevisionPhotoRecord[]>;
}

export type PublishResult =
  | { kind: 'not-found' }
  | { kind: 'not-ready'; problems: string[] }
  | { kind: 'published'; slug: string; revisionSeq: number };

export type UnpublishResult = { kind: 'not-found' } | { kind: 'unpublished' };

export type PublicReadResult =
  | { kind: 'not-found' }
  | { kind: 'removed' }
  | {
      kind: 'published';
      publication: PublicationRecord;
      revision: RevisionRecord;
      photos: RevisionPhotoRecord[];
    };

export function makePublicationSlug(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base.length > 0 ? `${base}-${suffix}` : suffix;
}

export async function publishDraft(
  repository: PublicationRepository,
  workspaceId: string,
  exhibitionId: string,
  createId: () => string = () => crypto.randomUUID(),
): Promise<PublishResult> {
  const draft = await repository.findDraft(workspaceId, exhibitionId);
  if (!draft) return { kind: 'not-found' };

  const photos = await repository.listDraftPhotos(exhibitionId);
  const readiness = publicationReadiness({
    title: draft.title,
    photoCount: photos.length,
    status: draft.status,
  });
  if (!readiness.ready) return { kind: 'not-ready', problems: readiness.problems };

  let publicationRecord = await repository.findByExhibition(exhibitionId);
  if (!publicationRecord) {
    const id = createId();
    publicationRecord = await repository.createPublication({
      id,
      exhibitionId,
      workspaceId,
      slug: makePublicationSlug(draft.title, createId().slice(0, 6)),
    });
  }

  const revisionSeq = (await repository.latestRevisionSeq(publicationRecord.id)) + 1;
  const revisionId = createId();
  await repository.insertRevision({
    id: revisionId,
    publicationId: publicationRecord.id,
    seq: revisionSeq,
    title: draft.title,
    description: draft.description,
    coverPhotoId: draft.coverPhotoId,
  });
  await repository.insertRevisionPhotos(
    photos.map((photo) => ({
      revisionId,
      photoAssetId: photo.id,
      position: photo.position,
      title: photo.title,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
    })),
  );

  // The stable pointer advances only after every snapshot row exists.
  await repository.pointAtRevision(publicationRecord.id, revisionId);
  return { kind: 'published', slug: publicationRecord.slug, revisionSeq };
}

export async function unpublishDraft(
  repository: PublicationRepository,
  workspaceId: string,
  exhibitionId: string,
): Promise<UnpublishResult> {
  const publicationRecord = await repository.findOwnedPublication(workspaceId, exhibitionId);
  if (!publicationRecord) return { kind: 'not-found' };
  await repository.markUnpublished(publicationRecord.id);
  return { kind: 'unpublished' };
}

export async function readPublished(
  repository: PublicationRepository,
  slug: string,
): Promise<PublicReadResult> {
  const publicationRecord = await repository.findBySlug(slug);
  if (!publicationRecord) return { kind: 'not-found' };
  if (publicationRecord.status !== 'published' || !publicationRecord.currentRevisionId) {
    return { kind: 'removed' };
  }
  const revision = await repository.findRevision(publicationRecord.currentRevisionId);
  if (!revision) return { kind: 'removed' };
  return {
    kind: 'published',
    publication: publicationRecord,
    revision,
    photos: await repository.listRevisionPhotos(revision.id),
  };
}

export function createDrizzlePublicationRepository(db: Database): PublicationRepository {
  return {
    async findDraft(workspaceId, exhibitionId) {
      const [draft] = await db
        .select()
        .from(exhibition)
        .where(and(eq(exhibition.id, exhibitionId), eq(exhibition.workspaceId, workspaceId)));
      return draft ?? null;
    },
    async listDraftPhotos(exhibitionId) {
      return db
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
        .where(eq(exhibitionPhoto.exhibitionId, exhibitionId))
        .orderBy(asc(exhibitionPhoto.position));
    },
    async findByExhibition(exhibitionId) {
      const [row] = await db
        .select()
        .from(publication)
        .where(eq(publication.exhibitionId, exhibitionId));
      return row ?? null;
    },
    async createPublication(record) {
      await db.insert(publication).values(record);
      const [created] = await db.select().from(publication).where(eq(publication.id, record.id));
      if (!created) throw new Error('publication-create-failed');
      return created;
    },
    async latestRevisionSeq(publicationId) {
      const [latest] = await db
        .select({ seq: publishedRevision.seq })
        .from(publishedRevision)
        .where(eq(publishedRevision.publicationId, publicationId))
        .orderBy(desc(publishedRevision.seq))
        .limit(1);
      return latest?.seq ?? 0;
    },
    async insertRevision(record) {
      await db.insert(publishedRevision).values(record);
    },
    async insertRevisionPhotos(records) {
      if (records.length > 0) await db.insert(publishedRevisionPhoto).values(records);
    },
    async pointAtRevision(publicationId, revisionId) {
      await db
        .update(publication)
        .set({ currentRevisionId: revisionId, status: 'published', updatedAt: sql`now()` })
        .where(eq(publication.id, publicationId));
    },
    async findOwnedPublication(workspaceId, exhibitionId) {
      const [row] = await db
        .select({
          id: publication.id,
          exhibitionId: publication.exhibitionId,
          workspaceId: publication.workspaceId,
          slug: publication.slug,
          currentRevisionId: publication.currentRevisionId,
          status: publication.status,
        })
        .from(publication)
        .innerJoin(exhibition, eq(publication.exhibitionId, exhibition.id))
        .where(
          and(
            eq(publication.exhibitionId, exhibitionId),
            eq(exhibition.workspaceId, workspaceId),
          ),
        );
      return row ?? null;
    },
    async markUnpublished(publicationId) {
      await db
        .update(publication)
        .set({ status: 'unpublished', updatedAt: sql`now()` })
        .where(eq(publication.id, publicationId));
    },
    async findBySlug(slug) {
      const [row] = await db.select().from(publication).where(eq(publication.slug, slug));
      return row ?? null;
    },
    async findRevision(revisionId) {
      const [row] = await db
        .select()
        .from(publishedRevision)
        .where(eq(publishedRevision.id, revisionId));
      return row ?? null;
    },
    async listRevisionPhotos(revisionId) {
      return db
        .select()
        .from(publishedRevisionPhoto)
        .where(eq(publishedRevisionPhoto.revisionId, revisionId))
        .orderBy(asc(publishedRevisionPhoto.position));
    },
  };
}
