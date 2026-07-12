# 0005 — Separate mutable drafts from immutable publication revisions

- Status: accepted
- Date: 2026-07-12

## Context

Photographers need to continue editing without accidentally changing a live exhibition.
Viewers need a stable shared URL, while future authors need recovery and audit capability.
Overwriting a single exhibition document on every edit makes draft privacy, reliable caching,
rollback, and consistent cross-device publication difficult.

A complete version-history UI, visual diff tool, and one-click rollback are not required to
establish the underlying integrity boundary.

## Decision

An exhibition will maintain mutable draft work separately from immutable publication
revisions. Publishing creates a new revision from the last successfully saved draft and
atomically advances the exhibition's `currentPublishedRevisionId`.

A stable public slug resolves to the current published revision. Public viewers never read a
mutable draft. Editing after publication changes only the draft; republishing creates another
revision. Previously published revisions and their required asset references are not mutated
in place.

Revision records are visible only to authorised workspace members. V5 stores the history
needed for integrity; history browsing, comparison, and rollback UI require separate approval.
Preview renders a saved draft and is not a publication status. Exhibition lifecycle and
visibility remain separate from revisions.

## Consequences

- Unpublished work cannot silently change the live exhibition.
- Stable links and cache keys can resolve consistently to immutable content.
- Storage retention must protect assets referenced by publication revisions.
- Publishing is an atomic server-side operation rather than a client-side pointer update.
- Revision storage grows over time; retention policy will require evidence before pruning.

## Alternatives considered

- **Publish by exposing the mutable draft** — rejected because editing would change live
  content and leak unfinished work.
- **Copy data but overwrite the same published record** — rejected because cache, audit, and
  recovery semantics remain ambiguous.
- **Build full version management in V5** — rejected because immutable revisions provide the
  expensive boundary while the management UI lacks a demonstrated first need.
