import { describe, expect, it, vi } from 'vitest';
import { createIntentBus, type Intent } from './intent';

const SELECT: Intent = { type: 'select-photo', photoId: 'photo-01' };

describe('intent bus', () => {
  it('delivers an emitted intent to every subscriber', () => {
    const bus = createIntentBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe(a);
    bus.subscribe(b);
    bus.emit(SELECT);
    expect(a).toHaveBeenCalledWith(SELECT);
    expect(b).toHaveBeenCalledWith(SELECT);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createIntentBus();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(handler);
    unsubscribe();
    bus.emit(SELECT);
    expect(handler).not.toHaveBeenCalled();
  });

  it('survives a handler unsubscribing during dispatch', () => {
    const bus = createIntentBus();
    const second = vi.fn();
    const unsubscribeFirst = bus.subscribe(() => unsubscribeFirst());
    bus.subscribe(second);
    bus.emit(SELECT);
    expect(second).toHaveBeenCalledTimes(1);
    bus.emit(SELECT);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('keeps independent buses isolated', () => {
    const one = createIntentBus();
    const two = createIntentBus();
    const handler = vi.fn();
    one.subscribe(handler);
    two.emit(SELECT);
    expect(handler).not.toHaveBeenCalled();
  });
});
