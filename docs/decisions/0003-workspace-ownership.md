# 0003 — Workspaces own platform resources

- Status: accepted
- Date: 2026-07-12

## Context

The first platform user is an individual photographer, but the intended evolution includes
curators and organisations managing shared exhibitions. If photos and exhibitions belong
directly to a user, adding collaboration later requires migrating every persisted resource,
storage path, authorisation rule, and ownership assumption.

Building invitations, organisations, role administration, and enterprise policy now would be
premature. The expensive boundary is resource ownership, not the future management UI.

## Decision

When accounts arrive in V3, every user will receive a personal workspace. Platform resources,
including photo assets and exhibitions, belong to a workspace. Users obtain access through
workspace membership.

The V3 product presents a simple personal-account experience: it does not expose workspace
switching, invitations, teams, or role management. The initial personal workspace has one
member with owner authority.

Multi-member workspaces and the minimum Owner, Editor, and Viewer roles are introduced only
when V6's real collaboration trigger and approved role/capability matrix exist. Publication
authority may be a capability rather than a speculative role. All remote authorisation is
enforced server-side.

## Consequences

- Personal and future collaborative resources share one ownership model.
- The first UI remains simple even though persisted ownership can evolve.
- Every remotely persisted resource and storage policy must carry or derive workspace scope.
- Membership exists minimally in V3; invites and multiple roles wait for V6.

## Addendum

- 2026-07-15: server-side enforcement will be realised by a Cloudflare Workers + Hono
  API layer checking workspace ownership on every write — see
  [ADR 0006](0006-v3-backend-platform.md). The decision above is unchanged.

## Alternatives considered

- **Let users directly own resources and migrate later** — rejected because ownership and
  authorisation would require a cross-system data migration.
- **Build the complete organisation model in V3** — rejected because there is no team
  workflow or enterprise customer to define it.
- **Use separate ownership models for people and organisations** — rejected because it
  duplicates authorisation logic and complicates transfers and collaboration.
