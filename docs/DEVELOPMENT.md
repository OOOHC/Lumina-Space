---
status: active
last-updated: 2026-07-12
---

# DEVELOPMENT

## Milestone workflow

1. Read PRD, ARD, DESIGN, the active ROADMAP milestone, relevant ADRs, and AGENTS.
2. Present a file-level implementation plan and receive explicit approval.
3. Implement only the active milestone's approved scope.
4. Validate against milestone Exit Criteria and the universal completion checklist.
5. Update documentation in the same commit as behaviour it describes.
6. Obtain explicit approval before advancing the roadmap version.

Later roadmap milestones are context, not implementation permission. A useful future idea is
recorded in `PARKING_LOT.md`; it is not quietly included in the current change.

## Coding standards

- TypeScript strict mode; no `any` without a comment explaining the unavoidable boundary.
- Deferred directories are created with their first real file, never empty or with placeholder
  content.
- Prefer the smallest function/module that satisfies the active milestone.
- Keep provider, device, and renderer details behind the boundaries defined by ARD.
- Do not add a dependency, abstraction, configuration file, or script without a current use.
- Loading, empty, error, cancellation, and cleanup behaviour are part of implementation.

## Testing approach

- Tests colocate with their subject (`galleryLayout.ts` -> `galleryLayout.test.ts`).
- No top-level test directories.
- Vitest is added with the first real test; then `test` is added to package scripts and CI in
  the same change.
- Tests support a milestone's evidence. Do not create empty test infrastructure.
- Manual evidence records browser/device/viewport and the journey checked.
- A feature is not complete because its happy path rendered once.

## Decision records

- Hard-to-reverse decisions get an ADR in `docs/decisions/` using `template.md`.
- If reverting a choice would cross modules, migrate persisted data, change ownership, or
  require public compatibility, an ADR is usually required.
- Accepted ADRs are immutable; a changed decision creates a new ADR that supersedes one.
- ADRs document a decision. They do not authorise code outside the active roadmap milestone.

## Required implementation handoff

Every implementation response ends with these headings:

### Implementation Summary

What user-visible or architectural outcome was completed, tied to the active milestone.

### Files Changed

Only relevant files, with a short reason for each group.

### Validation

Commands and manual checks run, including failures or checks that could not run.

### Evidence

Results that demonstrate the relevant Exit Criteria, not merely a claim that code exists.

### Next Recommended Version

The current gate status and the next eligible milestone. This is a recommendation, not
permission to begin it.

## Definition of done

“Done” means the roadmap milestone checklist passes, relevant evidence exists, documentation
matches the code, and no unexplained work from later milestones was introduced.
