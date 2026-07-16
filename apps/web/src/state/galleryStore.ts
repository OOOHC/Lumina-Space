import { create } from 'zustand';
import { getPhotos } from '../services/photoRepository';
import type { Photo } from '../types';

export type GalleryPhase = 'loading' | 'ready' | 'empty' | 'error';

interface GalleryState {
  phase: GalleryPhase;
  photos: Photo[];
  /** Photo currently open in the detail view, if any. */
  selectedId: string | null;
  /** Keyboard focus position within the photo sequence. */
  focusedIndex: number;
  /** Incremented to ask the camera rig to return to its home view. */
  resetToken: number;
  /** Non-null while the gallery is showing an exhibition draft preview. */
  preview: { title: string } | null;
  load: () => Promise<void>;
  /** Swap the room's contents for a draft (V4 preview). */
  enterPreview: (photos: Photo[], title: string) => void;
  /** Present a published exhibition (V5 public viewer) — no preview banner. */
  present: (photos: Photo[]) => void;
  exitPreview: () => Promise<void>;
  select: (id: string | null) => void;
  moveFocus: (delta: number) => void;
  setFocusedIndex: (index: number) => void;
  requestReset: () => void;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  phase: 'loading',
  photos: [],
  selectedId: null,
  focusedIndex: 0,
  resetToken: 0,
  preview: null,

  load: async () => {
    set({ phase: 'loading' });
    try {
      const photos = await getPhotos();
      if (photos.length === 0) {
        set({ photos: [], phase: 'empty', selectedId: null, focusedIndex: 0 });
      } else {
        set({ photos, phase: 'ready', selectedId: null, focusedIndex: 0 });
      }
    } catch {
      set({ phase: 'error' });
    }
  },

  enterPreview: (photos, title) => {
    if (photos.length === 0) return;
    set({
      photos,
      phase: 'ready',
      preview: { title },
      selectedId: null,
      focusedIndex: 0,
    });
    get().requestReset();
  },

  present: (photos) => {
    set({
      photos,
      phase: photos.length === 0 ? 'empty' : 'ready',
      preview: null,
      selectedId: null,
      focusedIndex: 0,
    });
  },

  exitPreview: async () => {
    set({ preview: null });
    await get().load();
    get().requestReset();
  },

  select: (id) => {
    if (id === null) {
      set({ selectedId: null });
      return;
    }
    const index = get().photos.findIndex((p) => p.id === id);
    if (index >= 0) {
      set({ selectedId: id, focusedIndex: index });
    }
  },

  moveFocus: (delta) => {
    const { photos, focusedIndex } = get();
    if (photos.length === 0) return;
    const next = (focusedIndex + delta + photos.length) % photos.length;
    set({ focusedIndex: next });
  },

  setFocusedIndex: (index) => {
    const { photos, focusedIndex } = get();
    if (index >= 0 && index < photos.length && index !== focusedIndex) {
      set({ focusedIndex: index });
    }
  },

  requestReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
}));
