import { API_BASE } from '../config';
import type { Photo } from '../types';

/** Client for exhibition drafts (V4). Autosave-friendly: every write returns
 * the saved state + readiness so the editor can show Saved/Failed honestly. */

export interface ExhibitionListItem {
  id: string;
  title: string;
  status: 'active' | 'archived';
  updatedAt: string;
  photoCount: number;
}

export interface ExhibitionPhoto {
  id: string;
  title: string;
  caption: string | null;
  width: number;
  height: number;
  position: number;
  previewUrl: string;
  thumbUrl: string;
}

export interface Readiness {
  ready: boolean;
  problems: ('missing-title' | 'no-photos' | 'archived')[];
}

export interface PublicationInfo {
  slug: string;
  status: 'published' | 'unpublished';
  revisionSeq: number;
  publishedAt: string;
  draftChangedSincePublish: boolean;
}

export interface ExhibitionDraft {
  id: string;
  title: string;
  description: string | null;
  coverPhotoId: string | null;
  status: 'active' | 'archived';
  updatedAt: string;
  photos: ExhibitionPhoto[];
  publication: PublicationInfo | null;
  readiness: Readiness;
}

export interface SavePatch {
  title?: string;
  description?: string | null;
  coverPhotoId?: string | null;
  photoIds?: string[];
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
}

export async function listExhibitions(): Promise<ExhibitionListItem[] | null> {
  const res = await api('/api/exhibitions');
  if (!res.ok) return null;
  return ((await res.json()) as { exhibitions: ExhibitionListItem[] }).exhibitions;
}

export async function createExhibition(title: string): Promise<ExhibitionDraft | null> {
  const res = await api('/api/exhibitions', { method: 'POST', body: JSON.stringify({ title }) });
  if (!res.ok) return null;
  return (await res.json()) as ExhibitionDraft;
}

export async function getExhibition(id: string): Promise<ExhibitionDraft | null> {
  const res = await api(`/api/exhibitions/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as ExhibitionDraft;
}

export async function saveExhibition(
  id: string,
  patch: SavePatch,
): Promise<ExhibitionDraft | null> {
  const res = await api(`/api/exhibitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  return (await res.json()) as ExhibitionDraft;
}

export async function publishExhibition(
  id: string,
): Promise<{ slug: string; revisionSeq: number } | null> {
  const res = await api(`/api/exhibitions/${id}/publish`, { method: 'POST' });
  if (!res.ok) return null;
  return (await res.json()) as { slug: string; revisionSeq: number };
}

export async function unpublishExhibition(id: string): Promise<boolean> {
  return (await api(`/api/exhibitions/${id}/unpublish`, { method: 'POST' })).ok;
}

export async function setExhibitionStatus(
  id: string,
  action: 'archive' | 'restore',
): Promise<boolean> {
  return (await api(`/api/exhibitions/${id}/${action}`, { method: 'POST' })).ok;
}

/** Maps a draft into the gallery's Photo shape for 3D preview. */
export function draftToGalleryPhotos(draft: ExhibitionDraft): Photo[] {
  return draft.photos.map((p) => ({
    id: p.id,
    title: p.title,
    caption: p.caption ?? '',
    credit: `Draft preview — ${draft.title}`,
    src: p.previewUrl,
    width: p.width,
    height: p.height,
  }));
}
