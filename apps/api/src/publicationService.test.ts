import { describe, expect, it } from 'vitest';
import {
  publishDraft,
  readPublished,
  unpublishDraft,
  type PublicationDraft,
  type PublicationPhoto,
  type PublicationRecord,
  type PublicationRepository,
  type RevisionPhotoRecord,
  type RevisionRecord,
} from './publicationService';

class MemoryPublicationRepository implements PublicationRepository {
  draft: PublicationDraft | null = {
    id: 'exhibition-1',
    title: 'A Quiet Coast',
    description: 'First published text',
    coverPhotoId: 'photo-1',
    status: 'active',
  };
  draftWorkspaceId = 'workspace-1';
  draftPhotos: PublicationPhoto[] = [
    {
      id: 'photo-1',
      title: 'Tide',
      caption: 'Original caption',
      width: 1600,
      height: 1067,
      position: 0,
    },
  ];
  publications: PublicationRecord[] = [];
  revisions: RevisionRecord[] = [];
  revisionPhotos: RevisionPhotoRecord[] = [];
  writes: string[] = [];

  async findDraft(workspaceId: string, exhibitionId: string) {
    return this.draft && workspaceId === this.draftWorkspaceId && exhibitionId === this.draft.id
      ? { ...this.draft }
      : null;
  }
  async listDraftPhotos(exhibitionId: string) {
    return exhibitionId === this.draft?.id ? this.draftPhotos.map((photo) => ({ ...photo })) : [];
  }
  async findByExhibition(exhibitionId: string) {
    return this.publications.find((row) => row.exhibitionId === exhibitionId) ?? null;
  }
  async createPublication(record: Omit<PublicationRecord, 'currentRevisionId' | 'status'>) {
    const created: PublicationRecord = {
      ...record,
      currentRevisionId: null,
      status: 'published',
    };
    this.publications.push(created);
    this.writes.push('publication');
    return created;
  }
  async latestRevisionSeq(publicationId: string) {
    return Math.max(
      0,
      ...this.revisions
        .filter((row) => row.publicationId === publicationId)
        .map((row) => row.seq),
    );
  }
  async insertRevision(record: Omit<RevisionRecord, 'publishedAt'>) {
    this.revisions.push({ ...record, publishedAt: new Date('2026-07-16T12:00:00Z') });
    this.writes.push(`revision:${record.seq}`);
  }
  async insertRevisionPhotos(records: RevisionPhotoRecord[]) {
    this.revisionPhotos.push(...records.map((row) => ({ ...row })));
    this.writes.push('revision-photos');
  }
  async pointAtRevision(publicationId: string, revisionId: string) {
    const row = this.publications.find((candidate) => candidate.id === publicationId);
    if (!row) throw new Error('missing-publication');
    row.currentRevisionId = revisionId;
    row.status = 'published';
    this.writes.push('pointer');
  }
  async findOwnedPublication(workspaceId: string, exhibitionId: string) {
    return (
      this.publications.find(
        (row) => row.workspaceId === workspaceId && row.exhibitionId === exhibitionId,
      ) ?? null
    );
  }
  async markUnpublished(publicationId: string) {
    const row = this.publications.find((candidate) => candidate.id === publicationId);
    if (!row) throw new Error('missing-publication');
    row.status = 'unpublished';
    this.writes.push('unpublished');
  }
  async findBySlug(slug: string) {
    return this.publications.find((row) => row.slug === slug) ?? null;
  }
  async findRevision(revisionId: string) {
    return this.revisions.find((row) => row.id === revisionId) ?? null;
  }
  async listRevisionPhotos(revisionId: string) {
    return this.revisionPhotos
      .filter((row) => row.revisionId === revisionId)
      .sort((a, b) => a.position - b.position)
      .map((row) => ({ ...row }));
  }
}

function ids(...values: string[]): () => string {
  let index = 0;
  return () => values[index++] ?? `id-${index}`;
}

describe('publication lifecycle', () => {
  it('keeps a stable slug and immutable live snapshot until republish', async () => {
    const repository = new MemoryPublicationRepository();
    const first = await publishDraft(
      repository,
      'workspace-1',
      'exhibition-1',
      ids('publication-1', 'abcdef-suffix', 'revision-1'),
    );
    expect(first).toEqual({
      kind: 'published',
      slug: 'a-quiet-coast-abcdef',
      revisionSeq: 1,
    });
    expect(repository.writes.slice(-3)).toEqual(['revision:1', 'revision-photos', 'pointer']);

    repository.draft = {
      ...repository.draft!,
      title: 'A Quiet Coast — Revised',
      description: 'Unpublished draft text',
    };
    repository.draftPhotos[0] = {
      ...repository.draftPhotos[0],
      title: 'Changed library title',
    };

    const stillLive = await readPublished(repository, 'a-quiet-coast-abcdef');
    expect(stillLive.kind).toBe('published');
    if (stillLive.kind === 'published') {
      expect(stillLive.revision.title).toBe('A Quiet Coast');
      expect(stillLive.revision.description).toBe('First published text');
      expect(stillLive.photos[0].title).toBe('Tide');
    }

    const second = await publishDraft(
      repository,
      'workspace-1',
      'exhibition-1',
      ids('revision-2'),
    );
    expect(second).toEqual({
      kind: 'published',
      slug: 'a-quiet-coast-abcdef',
      revisionSeq: 2,
    });
    const advanced = await readPublished(repository, 'a-quiet-coast-abcdef');
    expect(advanced.kind).toBe('published');
    if (advanced.kind === 'published') {
      expect(advanced.revision.seq).toBe(2);
      expect(advanced.revision.title).toBe('A Quiet Coast — Revised');
      expect(advanced.photos[0].title).toBe('Changed library title');
    }
    expect(repository.revisions).toHaveLength(2);
    expect(repository.revisions[0].title).toBe('A Quiet Coast');
  });

  it('returns removed after unpublish and restores the same slug on republish', async () => {
    const repository = new MemoryPublicationRepository();
    const first = await publishDraft(
      repository,
      'workspace-1',
      'exhibition-1',
      ids('publication-1', '123456', 'revision-1'),
    );
    expect(first.kind).toBe('published');
    expect(await unpublishDraft(repository, 'workspace-1', 'exhibition-1')).toEqual({
      kind: 'unpublished',
    });
    expect((await readPublished(repository, 'a-quiet-coast-123456')).kind).toBe('removed');

    const republished = await publishDraft(
      repository,
      'workspace-1',
      'exhibition-1',
      ids('revision-2'),
    );
    expect(republished).toEqual({
      kind: 'published',
      slug: 'a-quiet-coast-123456',
      revisionSeq: 2,
    });
    expect((await readPublished(repository, 'a-quiet-coast-123456')).kind).toBe('published');
  });

  it('enforces workspace ownership and readiness before creating publication state', async () => {
    const repository = new MemoryPublicationRepository();
    expect(
      await publishDraft(repository, 'another-workspace', 'exhibition-1', ids('unused')),
    ).toEqual({ kind: 'not-found' });
    expect(repository.publications).toHaveLength(0);

    repository.draftPhotos = [];
    const notReady = await publishDraft(
      repository,
      'workspace-1',
      'exhibition-1',
      ids('unused'),
    );
    expect(notReady.kind).toBe('not-ready');
    expect(repository.publications).toHaveLength(0);
  });

  it('distinguishes unknown slugs from known removed publications', async () => {
    const repository = new MemoryPublicationRepository();
    expect((await readPublished(repository, 'missing')).kind).toBe('not-found');
  });
});
