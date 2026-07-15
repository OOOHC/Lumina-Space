# 0004 — Defer monorepo layout until a second consumer exists

- Status: accepted
- Date: 2026-07-12

## Context

The long-term product implies multiple deliverables: the web app, a creator platform, a
possible TypeScript backend, a possible native VR shell, and a reusable gesture library. A
monorepo (`apps/` + `packages/`) was evaluated and its shape is the right destination if
two or more of those materialise as TypeScript projects.

However, the repository today has exactly one application and zero shared packages.
Nesting `src/` under `apps/web/` now buys nothing: the move later is a single `git mv`
plus one workspace-config file, costing the same then as now. An empty `packages/`
directory would be a question every newcomer asks and a promise the codebase has not made.

## Decision

We will keep a flat single-application repository until one of these triggers fires:

1. A second application is concretely being built (e.g. creator studio), or
2. A second real consumer of the gesture library exists (e.g. a native shell needs it).

When a trigger fires: move `src/` to `apps/web/src/`, add workspace config, and create
only the package the trigger demands. Monorepo tooling (Turborepo/Nx) is a separate,
later decision, justified only by ≥3 workspaces and real build-time pain.

A backend or VR shell in a non-TypeScript stack gets its own repository regardless; a
JS-tooled monorepo offers a non-JS project nothing but friction.

## Guiding principle (applies repo-wide)

**Structure that is cheap to add later is not created now; only boundaries that are
expensive to retrofit are pre-built.** The pre-built boundaries in this repository are:
the intent seam (ADR 0001), the `scene/`–`gallery/` split, and the `photoRepository`
function boundary. Everything else — folders, tooling, docs — is added the moment it has
a real first occupant, never before.

## Addendum

- 2026-07-15: **Trigger 1 fired and the move was executed.** V3 (ADR 0006) introduces a
  Cloudflare Workers + Hono API — a second concretely-planned application. The web app
  moved to `apps/web/` under npm workspaces in the same change that opened V3. No
  `packages/` and no monorepo tooling were added, exactly as this ADR prescribes. The
  decision above is unchanged.

## Consequences

- MVP stays maximally simple; no workspace indirection in imports, builds, or CI.
- The migration cost is deferred, not avoided — accepted because it is small and constant
  over time.
- This ADR is the tripwire: whoever starts a second app or extracts the gesture library
  must execute the move as part of that work.

## Alternatives considered

- **Adopt `apps/` + `packages/` now** — rejected: same cost later, negative value today.
- **Never adopt a monorepo; publish shared code to a registry** — rejected: publish
  overhead is unjustified for a solo developer sharing code with themself.
