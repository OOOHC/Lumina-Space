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

## Repository layout (since 2026-07-15, ADR 0004 executed)

npm workspaces: `apps/web` (the Vite/React viewer — everything previously at the repo
root) and, once V3 creates it, `apps/api` (Cloudflare Workers + Hono). Every `src/...`
path in this file and in docs/ means `apps/web/src/...`. `packages/` still does not
exist; it appears only with a second consumer of shared code.

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

## Current and deferred structure

- V1 through V2.5 have activated `src/ui/`, `src/state/`, `src/gallery/`, `src/scene/`,
  `src/input/`, `src/data/`, `src/services/`, and `src/types.ts`. Preserve their ARD
  boundaries; do not treat their existence as permission to add speculative siblings.
- The first Zustand store, colocated Vitest tests, Three / React Three Fiber / Drei, and the
  first MediaPipe provider now have real occupants. Split, wrap, or generalise them only when
  a current requirement demonstrates the need.
- `src/config.ts` now owns the API base: port 8787 in Vite development and same-origin in
  production. Do not turn it into a general speculative configuration layer.
- WebXR support remains deferred until triggered XR-1. Lint tooling remains deferred until
  standards and a package script are approved.
- Remote auth, storage, database, upload, editing, and publishing dependencies are active
  through V5; extend them only under an approved later milestone.
- Workspace collaboration waits for V6; enterprise systems wait for a triggered V7.
- `apps/` exists because ADR 0004's second-application trigger fired. `packages/` still
  waits for a second real shared-code consumer.
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

## Personal Development Journal Policy

The project owner keeps private learning records at:

- `.private/DEV_JOURNAL.md` — AI-maintained implementation facts and decision history.
- `.private/INTERVIEW_NOTES.md` — owner-maintained explanations and learning reflections.

The entire `.private/` directory is intentionally ignored by Git. Never stage, commit, push,
quote into public documentation, or copy its contents into a pull request. Never store
credentials, tokens, personal account data, or other secrets there.

### Purpose and authority

The journal is for the future project owner, assuming implementation details have been
forgotten six months later. It explains how and why the project evolved. It is not PRD, ARD,
ADR, ROADMAP, Evidence, a changelog, a build log, or an authority over tracked documentation.

Ground every entry in the final code, tests, Evidence, accepted ADRs, approved plans, and Git
history. Distinguish verified fact, inference, owner decision, and outstanding validation.
Never invent a problem, rationale, result, or lesson to make an entry sound complete.

### When to update

- Updating the current journal section is an automatic part of every approved implementation
  handoff; it does not require a separate plan or approval.
- Revise the existing Version/Gate section after the work unit reaches its final tested state.
  Do not append an entry after every edit, command, failed experiment, or debugging step.
- Finalise the section when its Version/Gate is explicitly closed.
- Update the relevant section when an important implementation decision changes or an ADR is
  accepted/superseded. Do not rewrite the earlier reasoning as if the original never existed.
- Never create duplicate sections for the same Version/Gate.

### What must be recorded

For each Version/Gate, maintain:

1. **Status and date** — implemented, gate open, closed, or validation outstanding.
2. **Goal** — why this version exists and what it is intended to prove.
3. **What works now** — user-observable outcomes, not a list of edited files.
4. **Why this implementation** — the product and architecture reasoning actually used.
5. **Technology in this project** — only technology actually used, with its specific job here.
6. **Meaningful Problem Ledger** — every issue that affected behaviour, architecture,
   performance, scope, validation, or a final decision. For each issue record:
   - symptom/impact;
   - root cause;
   - final solution or consciously accepted limitation;
   - reasonable alternatives considered and why they lost;
   - evidence or verification state.
7. **Current limitations and unknowns** — including human/hardware validation still open.
8. **Concepts the owner should understand** — project-specific explanations, not generic
   tutorials or claims that the owner has learned them.
9. **Owner understanding check** — three to five questions the owner should answer unaided.
10. **Next version** — why it follows naturally; this does not authorise starting it.

Meaningful problems include bugs that changed the final design, rejected approaches with a
real trade-off, performance or accessibility constraints, architecture conflicts, provider or
device limitations, and validation failures. Exclude typos, transient command mistakes,
routine dependency installation, and abandoned debugging noise that taught nothing durable.

### Ownership of learning

AI may explain technical lessons supported by the project and generate understanding
questions. AI must not write first-person claims such as “I learned” or “I understand” on the
owner's behalf. Only the owner writes answers and personal reflections in
`.private/INTERVIEW_NOTES.md`. AI may review those answers when explicitly asked, but must not
silently replace them with polished answers.

### Writing quality

Keep entries concise, concrete, chronological, and honest. Prefer a compact problem table over
debugging narrative. Describe final behaviour and consequential decisions, retain unresolved
items, and avoid generic technology definitions, line-by-line code tours, exaggerated success,
token/tool commentary, or repetition of tracked documents.

## Required implementation handoff

Every implementation ends with:

1. **Implementation Summary**
2. **Files Changed**
3. **Validation**
4. **Evidence**
5. **Next Recommended Version**

Before that handoff, update the current section in `.private/DEV_JOURNAL.md` according to the
policy above. Mention that the private journal was updated, but never reproduce its private
content in the public handoff unless the owner explicitly asks.

The final section recommends the next eligible step; it does not begin it.

## Workflow

Plan first, obtain explicit approval, implement the active scope, validate in proportion to
risk, and hand off against the current version gate. Do not create or modify files, install
dependencies, or begin feature work without an approved plan.

**Never push to any git remote unless the owner explicitly instructs it in the current
conversation.** Local commits accompany implementation handoffs as usual; pushing to
GitHub is always a separate, owner-initiated action.

**Local first, deploy only after owner approval.** The product now exists in two
environments: local development (`npm run dev` + `wrangler dev`) and the deployed
production Worker. Every change is implemented and verified LOCALLY first. `npm run
deploy` (or any `wrangler deploy`) runs only after the owner has reviewed the local
result and explicitly approved deploying it. Never deploy as a side effect of building
or testing; never deploy unreviewed changes because they "seem safe".
