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

  it('open-focused returns an already-open photo to the wall (toggle)', () => {
    applyIntent({ type: 'open-focused' });
    expect(state().selectedId).toBe(samplePhotos[0].id);
    applyIntent({ type: 'open-focused' });
    expect(state().selectedId).toBeNull();
    // Focus stays on the returned photo so the journey continues from there.
    expect(state().focusedIndex).toBe(0);
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

  it('inspect with nothing open pulls out the focused photo', () => {
    applyIntent({ type: 'move-focus', delta: 1 });
    applyIntent({ type: 'inspect', magnitude: 0.4 });
    expect(state().selectedId).toBe(samplePhotos[1].id);
  });

  it('inspect while a photo is open changes no state (zoom is UI-side)', () => {
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'inspect', magnitude: 0.9 });
    applyIntent({ type: 'inspect-end' });
    expect(state().selectedId).toBe(samplePhotos[0].id);
    expect(state().focusedIndex).toBe(0);
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

  it('tracking-timeout closes the open photo', () => {
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'tracking-timeout' });
    expect(state().selectedId).toBeNull();
  });

  it('tracking-timeout is a no-op when nothing is open', () => {
    applyIntent({ type: 'tracking-timeout' });
    expect(state().selectedId).toBeNull();
    expect(state().focusedIndex).toBe(0);
  });

  it('point-lost never changes gallery state, open or closed', () => {
    applyIntent({ type: 'point-lost' });
    expect(state().selectedId).toBeNull();
    expect(state().focusedIndex).toBe(0);

    applyIntent({ type: 'select-photo', photoId: samplePhotos[2].id });
    applyIntent({ type: 'point-lost' });
    expect(state().selectedId).toBe(samplePhotos[2].id);
  });

  it('swipe changes the open photo forward and backward with wraparound', () => {
    applyIntent({ type: 'select-photo', photoId: samplePhotos[0].id });
    applyIntent({ type: 'swipe', direction: 1 });
    expect(state().selectedId).toBe(samplePhotos[1].id);
    applyIntent({ type: 'swipe', direction: -1 });
    expect(state().selectedId).toBe(samplePhotos[0].id);
    // Wraparound at the start of the sequence.
    applyIntent({ type: 'swipe', direction: -1 });
    expect(state().selectedId).toBe(samplePhotos[samplePhotos.length - 1].id);
  });

  it('swipe is ignored when no photo is open', () => {
    applyIntent({ type: 'swipe', direction: 1 });
    expect(state().selectedId).toBeNull();
    expect(state().focusedIndex).toBe(0);
  });
});
