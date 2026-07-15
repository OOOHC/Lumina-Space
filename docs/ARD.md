---
status: approved v1.0
last-updated: 2026-07-12
---

# Lumina Space Architecture Requirements Document

## Principles

- Modular, product-first, and browser-first
- Stable boundaries where retrofit is expensive
- Minimal implementation where later addition is cheap
- Device-neutral application behaviour
- Immutable public content and private mutable work
- Server-enforced ownership when remote data arrives

## Current architecture (as built, updated 2026-07-15)

A single Vite + React + TypeScript application with the V1/V2 layers realised:

- **scene/** — generic 3D runtime: `SceneCanvas` (renderer + WebGL detection),
  `CameraRig` (bounded orbit + reset), `Lighting`, `Environment` (parametric room).
  Contains no photograph knowledge.
- **gallery/** — exhibition domain: `galleryLayout` (pure wall-placement function),
  `PhotoFrame` (textured print with per-photo suspense/error isolation), `GalleryScene`.
- **input/** — `intent.ts` (device-neutral vocabulary + plain bus: five instant intents
  plus the continuous `point-at` stream and its `point-lost` cancel), `keyboardAdapter.ts`,
  and `gesture/` (pure landmark classification + a lazily-loaded MediaPipe adapter that
  emits `point-at` / `open-focused` / `point-lost`; raw landmarks never cross the
  boundary). Pointer and touch reach the bus through unified Pointer Events on
  interactive surfaces.
- **state/** — one Zustand store (`galleryStore`) plus `intentBindings.ts`, the single
  place where intents become state changes and inapplicable intents are ignored.
- **services/** — `photoRepository` function boundary serving bundled `data/` photos.
- **ui/** — status screens, HUD, detail overlay, 2D editorial fallback (small viewport
  or no WebGL), reduced-motion hook.

Backend, gesture, and XR layers do not exist. Roadmap descriptions beyond V2 are
requirements, not claims about current code.

## Planned application layers

These layers are created only with their first real occupant:

- **UI** — product controls and accessible non-spatial interface
- **Gallery** — photography exhibition domain and behaviour
- **Scene** — generic 3D runtime capability
- **Input** — device adapters and shared intent contracts
- **State** — the smallest state model required by current behaviour
- **Data** — local seed data while local content exists
- **Services** — provider and persistence boundaries used by domain code

## Binding dependency rules

1. `scene/` owns generic 3D runtime concerns and must never import `gallery/` or know that
   photographs exist.
2. `gallery/` owns exhibition behaviour. It may use scene capability; the reverse direction
   is forbidden.
3. `input/` adapters translate raw device events into intents and never import `gallery/` or
   `scene/`. Downstream code cannot know which device produced an intent.
4. Instant actions remain instant intents. Lifecycle phases exist only for continuous
   interactions that require start, update, end, or cancellation.
5. `gallery/` obtains photo data only through `services/photoRepository.ts`, never directly
   from local data, storage SDKs, or backend clients.
6. UI depends on application state and intents, never raw hardware or MediaPipe APIs.
7. Domain types live in `src/types.ts`; intent contracts live in `src/input/intent.ts`.
8. Provider-specific authentication, database, and storage details cannot leak into gallery
   or scene modules.

## Product data boundaries

### Ownership

Remote resources belong to a workspace. Registration creates a personal workspace and hides
the workspace concept until more than one membership is useful. A user gains authority
through workspace membership; resources do not belong directly to a user. See ADR 0003.

### Photo assets

A photo asset belongs to a workspace library and may be referenced by multiple exhibitions.
The original object is not overwritten in place. Only derivatives required by an active
product journey are created. Exhibition-specific text, order, crop, and presentation belong
to exhibition configuration, not the reusable asset. See ADR 0002.

### Exhibition revisions

An exhibition has mutable draft work and may point to one current immutable published
revision. Public routes resolve a stable slug to that revision and never read a mutable
draft. Publishing creates a new revision; it does not update an old one. See ADR 0005.

### Visibility

Lifecycle, publication, and visibility are separate concepts:

- Exhibition lifecycle: active or archived
- Work: mutable draft and zero or more immutable publication revisions
- Visibility: introduced only as required, beginning with unlisted sharing

Preview is a mode that renders a saved draft. It is not a persisted status.

## Viewer client strategy

Content is created once and delivered through multiple viewer clients. Workspace, photo,
exhibition, draft, publication, and stable-link semantics are platform concerns; input and
presentation capabilities belong to a viewer implementation.

Planned clients are:

- Conventional desktop/mobile browser viewer
- Gesture-enhanced browser viewer using the same web application and intent contracts
- Triggered WebXR viewer client
- Conditional native XR viewer client if WebXR evidence and measured limits justify it

All clients consume the same published exhibition model. They may use different renderers or
technology stacks, but cannot redefine ownership, publication, or content semantics. A native
XR client may live in a separate repository under ADR 0004; “one platform” means one product
content source, not one permanent implementation language.

Gesture providers are adapters. MediaPipe is the first planned browser implementation, not a
domain concept. Gallery behaviour receives focus/select/manipulation intents and cannot depend
on hand landmarks or identify the tracking provider.

## Proposed V3 platform (status: proposed — see ADR 0006)

Neon Postgres (relational product data), Cloudflare R2 (photo objects, presigned direct
upload), Better Auth (sessions in Postgres), and a Cloudflare Workers + Hono API layer
enforcing workspace ownership on every write. Chosen for unattended availability,
free-tier operation with application-enforced resource limits, the relational domain
model, and transferable skills. Nothing in this section authorises dependencies or
backend code before the approved V3 plan.

## Evolution strategy

Architecture changes are triggered by real consumers or measured constraints:

| Current architecture | Migration trigger | Future architecture |
|---|---|---|
| Flat single application | A second application or second real shared-code consumer | `apps/` and only the required `packages/` |
| Bundled `public/photos/` assets | Photographer uploads enter active milestone | Object storage plus only required image derivatives |
| Local `photoRepository` implementation | Remote photo library enters active milestone | Remote implementation behind the same function boundary |
| Personal workspace, one member | Real collaborative workspace enters active milestone | Workspace memberships and minimal roles |
| Pointer/keyboard/touch intents | Gesture Experience Validation enters active milestone | First gesture provider adapter plus minimum source arbitration |
| Browser 3D viewer | WebXR viewer experiment meets all roadmap triggers | XR client/adapters using the existing publication, scene, and intent seams |
| One React application state owner | A real shared state appears | One Zustand store, split only after boundaries become clear |
| Colocated logic without tests | First behaviour needing regression protection | Vitest and colocated tests |

The monorepo migration details and triggers are binding in ADR 0004. Non-TypeScript native
applications remain candidates for separate repositories.

## Change control

The approved PRD determines product intent; this ARD determines implementation boundaries.
When a requested behaviour conflicts with either, implementation pauses while the relevant
document is updated and approved. Convenience is not a reason to bypass a boundary, and a
document is not a reason to ignore an explicit new decision from the product owner.
