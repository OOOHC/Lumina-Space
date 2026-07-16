# Lumina Space

A browser-first platform that enables photographers to create, curate, publish, and share
immersive photography exhibitions. Its primary differentiation is a gesture-enhanced 3D
viewing experience, with future expansion to WebXR and native XR clients.

> **Content is created once. Experiences are delivered everywhere.**

## Project status

| Field | Current |
|---|---|
| Current Version | V5 — Publishing Platform / Lumina Space 1.0 |
| Current Gate | V5 implemented locally; open on deployment + owner cross-device/gesture runs |
| Next Milestone | Lumina Space 1.0 sign-off → triggered V6 / XR-1 |
| Current Status | V4 closed 2026-07-16 (editor + 3D draft preview); V5 publishing verified locally end to end |

Development must follow the active gate in [docs/ROADMAP.md](docs/ROADMAP.md). Later versions
are direction, not permission to implement their features early.

## Product direction

The validated release structure is:

```text
Engineering Foundation
V0

Prototype Milestone
V1 Viewable Gallery -> V2 Interactive Gallery -> V2.5 Gesture Experience Validation

Product Milestone
V3 Photographer Workspace -> V4 Exhibition Editor -> V5 Publishing Platform

Lumina Space 1.0 = V5 complete

Platform Expansion
V6 Curatorial Collaboration -> V7 Triggered Enterprise Capability

Experience Expansion
XR-1 WebXR Viewer Client -> XR-2 Conditional Native XR Viewer Client
```

The signature gesture experience is: **point at a photograph, then pinch to pull it from the
wall.** Gesture enhances exhibition viewing; it does not control authoring, asset management,
publishing, or workspace administration.

The visual north star is “a premium cinematic photography experience.” See
[docs/DESIGN.md](docs/DESIGN.md) and [docs/PRD.md](docs/PRD.md).

## Development

Requires Node.js >= 20.

```sh
npm install
npm run dev        # start development server
npm run typecheck  # TypeScript validation
npm run build      # production build
```

## Repository layout

```text
docs/            product, architecture, design, roadmap, and development rules
docs/decisions/  accepted architecture decision records and ADR template
apps/web/        the Vite + React viewer (ADR 0004 workspaces layout, 2026-07-15)
apps/api/        Cloudflare Workers + Hono API — created with V3's first server code
```

Directories such as `scene/`, `gallery/`, `input/`, `state/`, and `services/` are created
only with the active milestone that supplies their first real file. See [AGENTS.md](AGENTS.md)
for binding repository rules.

## Documentation change order

The baseline can evolve. When product direction changes, assess feasibility and update and
approve documentation before dependent code:

`PRD -> ARD/ADR -> ROADMAP -> implementation`

New ideas are recorded in [docs/PARKING_LOT.md](docs/PARKING_LOT.md) until promoted through
that process.

## License

[MIT](LICENSE)
