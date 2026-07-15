import { beforeEach, describe, expect, it } from 'vitest';
import { samplePhotos } from '../data/samplePhotos';
import { useGalleryStore } from './galleryStore';
import { applyIntent } from './intentBindings';

function resetStore(overrides: Partial<ReturnType<typeof useGalleryStore.getState>> = {}) {
  useGalleryStore.setState({
    phase: 'ready',
    photos: samplePhotos,
    selectedId: null,
    focusedIndex: 0,
    resetToken: 0,
    ...overrides,
  });
}

const state = () => useGalleryStore.getState();

describe('intent bindings', () => {
  beforeEach(() => resetStore());

  it('select-photo opens the detail view and moves focus with it', () => {
    applyIntent({ type: 'select-photo', photoId: samplePhotos[2].id });
    expect(state().selectedId).toBe(samplePhotos[2].id);
    expect(state().focusedIndex).toBe(2);
  });

  it('select-photo for an unknown id changes nothing', () => {
    applyIntent({ type: 'select-photo', photoId: 'does-not-exist' });
    expect(state().selectedId).toBeNull();
  });

  it('select-photo is ignored while another photo is open', () => {
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'select-photo', photoId: samplePhotos[1].id });
    expect(state().selectedId).toBe(samplePhotos[0].id);
  });

  it('move-focus wraps around both ends of the sequence', () => {
    applyIntent({ type: 'move-focus', delta: -1 });
    expect(state().focusedIndex).toBe(samplePhotos.length - 1);
    applyIntent({ type: 'move-focus', delta: 1 });
    expect(state().focusedIndex).toBe(0);
  });

  it('move-focus is ignored while the detail view is open', () => {
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'move-focus', delta: 1 });
    expect(state().focusedIndex).toBe(0);
  });

  it('open-focused opens the focused photo', () => {
    applyIntent({ type: 'move-focus', delta: 1 });
    applyIntent({ type: 'open-focused' });
    expect(state().selectedId).toBe(samplePhotos[1].id);
  });

  it('back closes the detail view and is a safe no-op otherwise', () => {
    applyIntent({ type: 'back' });
    expect(state().selectedId).toBeNull();
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'back' });
    expect(state().selectedId).toBeNull();
  });

  it('reset-view requests a camera reset only while browsing', () => {
    applyIntent({ type: 'reset-view' });
    expect(state().resetToken).toBe(1);
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'reset-view' });
    expect(state().resetToken).toBe(1);
  });

  it('every intent is inert outside the ready phase', () => {
    resetStore({ phase: 'loading' });
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'move-focus', delta: 1 });
    applyIntent({ type: 'reset-view' });
    expect(state().selectedId).toBeNull();
    expect(state().focusedIndex).toBe(0);
    expect(state().resetToken).toBe(0);
  });
});
