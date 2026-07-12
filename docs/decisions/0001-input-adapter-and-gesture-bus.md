# 0001 — Input adapters and an intent bus between devices and the application

- Status: accepted
- Date: 2026-07-12

## Context

Lumina Space will accept input from pointer (MVP), MediaPipe hand gestures, and WebXR
controllers/hands over its lifetime. If pointer handling is wired directly into gallery
code, every new modality forces a rewrite of working gallery and scene logic — the exact
restructuring cost this repository is designed to avoid. This is the one abstraction whose
retrofit cost is high enough to justify building before a second consumer exists.

## Decision

We will route all device input through per-modality adapters under `src/input/` that
translate raw events into a shared intent vocabulary (e.g. `select-photo`, `orbit`,
`move-forward`) defined in `src/input/intent.ts`. Application code (`gallery/`, `scene/`)
subscribes to intents and never to device events.

The seam starts at its minimum size: one file (`input/intent.ts`) containing the intent
types and a plain event emitter (~30 lines). It grows into a folder only when a second
producer (gesture or XR) actually exists.

## Consequences

- Adding MediaPipe or WebXR input later is a new sibling adapter under `input/`; gallery
  and scene code need zero changes.
- Every interaction must be expressible as an intent, which also forces pointer/keyboard
  equivalents to exist — an accessibility win.
- Costs one level of indirection in the MVP for a 1:1 producer/consumer relationship. We
  accept this because the alternative (retrofit) is a cross-module rewrite.

## Alternatives considered

- **Direct event handling in gallery components** — cheapest today; rejected because each
  new input modality would require rewriting gallery interaction code.
- **A full input framework (priority, gesture arbitration, middleware) now** — rejected as
  premature; nothing needs arbitration until two modalities coexist.
