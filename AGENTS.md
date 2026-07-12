# AGENTS.md — rules for AI agents working in this repository

Lumina Space is a browser-first immersive 3D photography exhibition platform.
Stack: Vite + React + TypeScript; later React Three Fiber, Zustand, MediaPipe, and WebXR
only when their roadmap milestones activate them.

## Product and architecture authority

The approved PRD is the implementation baseline for product intent. The approved ARD and
accepted ADRs are the implementation baseline for architecture.

When a request conflicts with those documents:

1. Do not implement the conflicting change immediately.
2. Explain the exact conflict.
3. Recommend and obtain approval for the required documentation change first.
4. Update PRD, then ARD/ADR, then ROADMAP as applicable before changing code.

An explicit new decision from the product owner may change the documents; the documents do
not outrank the product owner. They enforce a doc-first change process and prevent accidental
scope drift or implementation-convenience architecture.

## Guiding principle

**Structure that is cheap to add later is not created now; only boundaries that are
expensive to retrofit are pre-built.** See ADR 0004. Do not “helpfully” create folders,
config, tooling, abstractions, or documents ahead of their first real occupant.

## Active milestone rule

- Read `docs/ROADMAP.md` and implement only its current approved milestone and plan.
- Later milestones explain direction; they do not authorise their code or dependencies.
- Every implementation requires a file-level plan and explicit approval first.
- Do not advance to the next version until current Exit Criteria, Evidence, and the universal
  completion checklist have been reviewed and explicitly approved.
- Put unapproved ideas in `docs/PARKING_LOT.md`; never smuggle them into the current change.

## Dependency rules (binding — see docs/ARD.md)

- `src/scene/` = generic 3D runtime. It must never import from `src/gallery/`.
- `src/gallery/` = photography-exhibition domain. It may depend on scene capability.
- `src/input/` adapters emit intents from `src/input/intent.ts` and never import `gallery/`
  or `scene/`. Downstream code cannot know which device produced an intent.
- Instant actions remain instant intents; lifecycle phases exist only for continuous input.
- `gallery/` reads photo data only via `src/services/photoRepository.ts`, never from
  `src/data/`, storage SDKs, or backend clients directly. Keep the repository a plain
  function boundary until evidence demands more.
- UI depends on state/intents, never raw hardware or MediaPipe APIs.
- Domain types -> `src/types.ts`. Intent contracts -> `src/input/intent.ts`.
- Remote platform resources belong to workspaces; public routes read immutable publication
  revisions, never mutable drafts. See ADRs 0002, 0003, and 0005.

## Deferred until their first real occupant exists

- `src/ui/`, `src/state/`, `src/gallery/`, `src/scene/`, `src/input/`, `src/data/`,
  `src/services/`, `src/types.ts`, and `src/config.ts`
- No empty Zustand stores; start with one store and split when boundaries become clear.
- Dependencies: three / @react-three/fiber / drei (V1 gallery), vitest (first real test),
  Zustand (first shared state), the first MediaPipe provider (V2.5 Gesture Experience
  Validation), WebXR support (triggered XR-1), and lint
  tooling only when standards and a script are approved.
- Remote auth, storage, database, and upload dependencies wait for V3.
- Workspace collaboration waits for V6; enterprise systems wait for a triggered V7.
- `apps/` + `packages/` only under ADR 0004 triggers.
- `scripts/`, `e2e/`, `CHANGELOG.md`, `CONTRIBUTING.md`, issue/PR templates, additional
  room templates, analytics, and general plugin systems.

## Conventions

- Tests colocate with their subject (`foo.ts` -> `foo.test.ts`). No top-level test dirs.
- CI (`.github/workflows/ci.yml`) may only invoke commands that exist in `package.json`.
- Living docs carry `status` / `last-updated` front matter. ADRs use their template's
  immutable Status/Date metadata. Documentation changes in the same commit as the code it
  describes; hard-to-reverse decisions use `docs/decisions/template.md`.
- Photo media lives in flat `public/photos/` URLs until ADR 0002 activates at V3; never import
  photo binaries through the JavaScript bundle.
- Preserve user changes and unrelated dirty-worktree content.

## Required implementation handoff

Every implementation ends with:

1. **Implementation Summary**
2. **Files Changed**
3. **Validation**
4. **Evidence**
5. **Next Recommended Version**

The final section recommends the next eligible step; it does not begin it.

## Workflow

Plan first, obtain explicit approval, implement the active scope, validate in proportion to
risk, and hand off against the current version gate. Do not create or modify files, install
dependencies, or begin feature work without an approved plan.
