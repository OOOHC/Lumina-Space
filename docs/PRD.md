---
status: approved v1.0
last-updated: 2026-07-12
---

# Lumina Space Product Requirements Document

## Executive summary

> **Lumina Space is a browser-first platform that enables photographers to create, curate,
> publish, and share immersive photography exhibitions.**

> **Its primary differentiation is a gesture-enhanced 3D viewing experience, with future
> expansion to WebXR and native XR clients.**

Lumina Space 是一个面向摄影师的创作、策展与发布平台，以手势增强的半沉浸式 3D
摄影观看体验作为核心差异化，并逐步扩展到 WebXR 与原生 XR 观看终端。

## Vision

Make spatial photography exhibitions feel as intentional, accessible, and shareable as a
well-curated physical gallery. Design for the destination; implement only what the current
validated milestone can justify.

> **Content is created once. Experiences are delivered everywhere.**
>
> 内容只创作一次，体验可以发生在任何终端。

## Product principles

1. **Photography First** — the image is always the primary visual and narrative object.
2. **Immersion over Decoration** — spatial and motion choices must improve viewing, not
   merely advertise that the product is 3D.
3. **Spatial Storytelling** — sequence, distance, scale, and movement help tell the story.
4. **Simplicity before Feature Count** — one coherent journey beats many unfinished tools.
5. **Performance is a Feature** — a beautiful experience that stutters is not complete.
6. **Gesture Enhances Interaction** — gesture is an optional expressive input, never the
   only way to complete a core task.
7. **Build for the Future, Deliver for Today** — preserve expensive boundaries while
   deferring cheap structure and speculative capability.

## Problem

Conventional online portfolios flatten photography into scrolling grids. They provide
little control over pacing, attention, or the relationship between images. Existing 3D
experiences often prioritise technical spectacle over the photographs themselves.

## Product audiences

The platform expands in this order:

1. **Photographers** create, upload, curate, publish, and manage their exhibitions.
2. **Curators** combine work from multiple photographers and collaborate on exhibitions.
3. **Organisations** manage branded spaces, members, governance, and permissions.

The first validated viewer audience is photography enthusiasts. Recruiters and
collaborators are important early observers, but do not determine the product model.

## First experience hypothesis

Users will choose to explore photography in a 3D space when the experience is cinematic,
clear, performant, and easier to understand than a game. Point-and-pinch gesture can make
that experience distinctive when it remains optional and predictable.

## Interaction philosophy

> **Gesture is primarily an exhibition interaction model, not an authoring or
> administrative model.**

| Product area | Pointer | Keyboard | Touch | Gesture | XR |
|---|---:|---:|---:|---:|---:|
| Exhibition viewing | Yes | Yes | Yes | Yes | Future client |
| Exhibition editing | Yes | Yes | Yes | Preview only | No |
| Publishing | Yes | Yes | Supported UI | No | No |
| Asset management | Yes | Yes | Supported UI | No | No |
| Workspace management | Yes | Yes | Supported UI | No | No |

Gesture must never be required to finish a core task. It may make viewing more expressive,
but cannot authorize destructive, administrative, or publication actions.

## Initial exhibition experience

- One curated exhibition with 12 bundled photographs
- One high-quality 3D gallery template
- Desktop viewing with responsive fallback
- Photo detail view and intentionally selected metadata
- Pointer, keyboard, and touch access to every core task
- Optional MediaPipe Point + Pinch interaction after conventional input is stable
- A signature interaction in which pointing focuses a photograph and pinching appears to
  pull it from the gallery wall into a bounded detail view
- Loading, empty, error, and reset states

This stage validates viewing and interaction. It does not require accounts or a backend.

## Photographer platform loop

The first real platform loop is:

`create -> curate -> preview -> publish -> share -> experience -> revise and republish`

The platform entities supporting that loop are:

`Photographer -> Workspace -> Photo Library -> Exhibition Draft -> Published Revision ->`
`Stable Public Link -> Viewer Client`

Product rules for that loop:

- Every photographer receives a personal workspace.
- Photos belong to the workspace library and may be referenced by multiple exhibitions.
- Exhibitions use controlled templates; the editor is not a general 3D modelling tool.
- Editing changes a draft and never silently changes the live exhibition.
- Publishing creates an immutable revision and advances the stable public link.
- Historical revisions are private to authorised members. A history interface is deferred
  until recovery or collaboration provides a real need.

## Release definitions

### Prototype Milestone — V1 through V2.5

Proves the premium local 3D gallery, device-neutral interaction, and gesture-enhanced viewing.
It is a product and technical validation milestone, not the completed photographer platform.

### Lumina Space 1.0 — complete through V5

Lumina Space 1.0 is complete only when a photographer can:

1. Sign in and work inside a personal workspace.
2. Upload reusable photographs to a private photo library.
3. Create and curate a template-based exhibition.
4. Save and preview a draft without changing the public exhibition.
5. Publish an immutable revision to a stable shareable link.
6. Open that link on another device and complete the viewing journey.
7. Use production-supported gesture viewing where available, with complete conventional
   input fallback where it is not.
8. Revise the draft and republish without mutating historical revisions.

### Platform and experience expansion

V6 and V7 add triggered collaboration and enterprise capability. XR clients deliver the
same published exhibition model through new viewing implementations; they do not create a
separate content or publishing platform.

## Success measures by stage

- **Viewing:** a first-time viewer completes enter, browse, open detail, return, and reset
  without instruction or loss of orientation.
- **Gesture:** a first-time tester completes point, pinch-to-open, and return without verbal
  coaching; tracking loss leaves the application in a valid state; pointer fallback works.
- **Creation:** a photographer can create and preview an exhibition without developer help.
- **Publishing:** the same stable link loads the latest published revision on another device
  while unpublished edits remain private.

Exact performance thresholds, test sample sizes, and gesture error budgets are set in the
active roadmap milestone before implementation begins.

## Product boundaries

Until the roadmap milestone that owns them, do not implement:

- Accounts, uploads, or remote persistence during the local viewing milestones
- Free-form scene construction, arbitrary object placement, or Blender-like tooling
- Social feeds, likes, comments, marketplace, or community mechanics
- Advanced gesture vocabulary before Point + Pinch evidence exists
- WebXR or native VR without the roadmap triggers being met
- Real-time collaboration, enterprise governance, SSO, or custom domains

## Change control

This approved PRD is the implementation baseline. A new product request may change it, but
the change is documented and approved here before dependent architecture, roadmap, or code
changes. The product owner's explicit decisions remain authoritative.
