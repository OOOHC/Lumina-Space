import { API_BASE } from '../config';
import { fitWithin, PREVIEW_MAX_PX, THUMB_MAX_PX } from './imageSizing';

/**
 * Client for the workspace photo library (V3). Uploads follow ADR 0006:
 * the browser renders preview/thumb derivatives itself (canvas), asks the
 * API for presigned PUT URLs, sends bytes straight to storage, and then
 * confirms — the image never travels through the API server.
 */

export interface LibraryPhoto {
  id: string;
  title: string;
  caption: string | null;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface LibraryStorage {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
}

export interface Library {
  photos: LibraryPhoto[];
  storage: LibraryStorage;
}

export async function listLibrary(): Promise<Library | null> {
  const res = await fetch(`${API_BASE}/api/photos`, { credentials: 'include' });
  if (!res.ok) return null;
  return (await res.json()) as Library;
}

/** Thumb/preview/original images load through the API's presigned redirect. */
export function photoViewUrl(id: string, kind: 'original' | 'preview' | 'thumb'): string {
  return `${API_BASE}/api/photos/${id}/view?kind=${kind}`;
}

const UPLOAD_ERRORS: Record<string, string> = {
  'file-too-large': 'That file is larger than the 25 MB per-photograph limit.',
  'quota-exceeded': 'Your library is out of storage space.',
  'unsupported-type': 'Only JPEG, PNG, and WebP photographs are supported.',
};

async function renderDerivative(
  bitmap: ImageBitmap,
  maxPx: number,
): Promise<Blob> {
  const { width, height } = fitWithin(bitmap, maxPx);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) throw new Error('derivative-render-failed');
  return blob;
}

export async function uploadPhoto(
  file: File,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: 'That file could not be read as an image.' };
  }

  try {
    const [preview, thumb] = await Promise.all([
      renderDerivative(bitmap, PREVIEW_MAX_PX),
      renderDerivative(bitmap, THUMB_MAX_PX),
    ]);

    const request = await fetch(`${API_BASE}/api/photos/upload-request`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        contentType: file.type,
        totalBytes: file.size + preview.size + thumb.size,
        width: bitmap.width,
        height: bitmap.height,
      }),
    });
    if (!request.ok) {
      const detail = (await request.json().catch(() => null)) as { error?: string } | null;
      return {
        ok: false,
        error: UPLOAD_ERRORS[detail?.error ?? ''] ?? `Upload failed (${request.status}).`,
      };
    }
    const { assetId, uploads } = (await request.json()) as {
      assetId: string;
      uploads: { kind: 'original' | 'preview' | 'thumb'; url: string }[];
    };

    const bodies: Record<string, Blob> = { original: file, preview, thumb };
    for (const upload of uploads) {
      const put = await fetch(upload.url, {
        method: 'PUT',
        body: bodies[upload.kind],
        headers: { 'Content-Type': upload.kind === 'original' ? file.type : 'image/jpeg' },
      });
      if (!put.ok) {
        return { ok: false, error: `Storage rejected the ${upload.kind} (${put.status}).` };
      }
    }

    const confirm = await fetch(`${API_BASE}/api/photos/${assetId}/confirm`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!confirm.ok) {
      return { ok: false, error: `Could not finalise the upload (${confirm.status}).` };
    }
    return { ok: true };
  } finally {
    bitmap.close();
  }
}
