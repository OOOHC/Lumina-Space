# 0006 — V3 backend platform: Neon, Cloudflare R2, Better Auth, Workers + Hono

- Status: accepted
- Date: 2026-07-15

## Context

V3 introduces the first remote platform surface: photographer accounts, personal
workspaces, uploads, and a photo library. The platform selection constraints:

1. **Unattended availability.** A shared or reviewed link must work without the owner
   logging into a dashboard to un-pause anything. Supabase Free and Appwrite Cloud Free
   (policy change 2026-02) both pause projects after ~7 days of inactivity and require
   owner action to restore — both are rejected on this constraint alone.
2. **Free-tier operation with application-enforced limits.** The platform is designed
   to run within provider free allowances; resource ceilings (storage quotas, upload
   caps) are enforced by the application rather than discovered through provider
   billing. Exact budgets are an owner-side operational matter, not public
   documentation.
3. **Relational domain.** The product model is
   `User → Workspace → PhotoAsset → ExhibitionDraft → PublishedRevision → ShareLink`
   (PRD, ADR 0003). Ownership scoping, revision immutability (ADR 0005), and asset
   reuse (ADR 0002) are naturally relational.
4. **Transferable skills.** Standard technologies (Postgres, S3-compatible storage,
   session auth) are preferred over provider-proprietary APIs.

The current app is a Vite SPA, so authentication and authorisation cannot live in the
client: a server-side API layer is required.

## Decision

The V3 target stack, recorded now and implemented only under an approved V3 plan:

| Concern | Choice | Notes |
|---|---|---|
| Relational data | **Neon Postgres** | users, workspaces, photo metadata, drafts, published revisions, share links |
| Photo objects | **Cloudflare R2** | originals + derivatives (ADR 0002); S3-compatible |
| Authentication | **Better Auth** | sessions stored in Postgres; email/password first |
| API layer | **Cloudflare Workers + Hono** | all writes, ownership checks, presigned URLs, publish logic |
| DB access | Drizzle ORM **or** similarly lightweight typed SQL layer | final pick in the V3 implementation plan |

### Accurate behaviour statements

- Neon **scales compute to zero** after idle and **wakes automatically** on the next
  connection; the first request after idle pays a cold-start latency. This is
  auto-wake, not "always-on with no delay" — and it is categorically different from
  Supabase/Appwrite project pausing, which requires manual dashboard restoration.
- R2 charges **no egress bandwidth**, but storage volume and Class A/B operations are
  metered beyond the free allowance. R2 is free *within quota*, not free absolutely.

### Upload flow (documented now, built in V3)

```
Browser: request upload permission
   ↓
Workers API: verify session → verify workspace ownership → enforce quota
   ↓
Workers API: issue short-lived R2 presigned PUT URL
   ↓
Browser uploads the image DIRECTLY to R2 (bytes never transit the API)
   ↓
Workers API records PhotoAsset metadata in Neon (workspace-scoped)
   ↓
Derivatives (thumbnail / preview) generated asynchronously per ADR 0002
```

### Server-side ownership enforcement (ADR 0003 realised)

- Every write goes through the Workers API; the API derives the workspace scope from
  the authenticated session, never from client-supplied identifiers alone.
- Ownership is checked on **every** mutation: asset create/archive, draft save,
  publish, share-link issue/revoke.
- Public routes read only immutable published revisions (ADR 0005); drafts and the
  photo library are never directly reachable.
- Presigned URLs are short-lived, single-purpose, and scoped to a key inside the
  requesting workspace's prefix.

## Consequences

- Three providers to assemble instead of one SDK: V3 is the slower-but-standard path.
- First request after idle has Neon cold-start latency; acceptable for the current
  audience, revisit if the platform ever hosts paying users.
- The owner provisions provider accounts personally; the agent integrates only.
- Per-workspace storage quotas and upload size caps are part of the V3 API scope from
  the first upload, not a later hardening step.
- The ORM decision is deliberately deferred to the V3 implementation plan.

## Addenda

- 2026-07-15: the V3 implementation plan was approved and this decision became accepted.
  Drizzle ORM was selected and the stack was implemented under npm workspaces.
- 2026-07-16: V5 uses one Cloudflare Worker deployment for both the built Vite SPA and
  Hono API. Static assets are edge-served; `/api/*` and `/e/*` enter the Worker first.
  Production therefore has one browser origin for sessions and public links. Better Auth
  derives and trusts that same origin per request; only explicitly configured localhost
  origins are added during development. The final deployed origin must still be added to
  the private R2 bucket CORS policy before the release gate can close.

## Alternatives considered

- **Firebase** — fastest integration and never pauses, but: Firestore's document model
  fights the relational workspace/revision domain; Cloud Storage requires the billed
  Blaze plan (since 2026-02); and its budget alerts are notifications rather than hard
  caps, which conflicts with the free-tier operation constraint.
- **Supabase / Appwrite Cloud free tiers** — rejected: 7-day inactivity pausing
  violates the unattended-availability constraint.
- **Self-hosted PocketBase/VPS** — full control, but converts the project from
  building product into operating a server (updates, backups, uptime); wrong trade
  for a solo owner at this stage.
- **Implement the stack now** — rejected: V2.5 human validation gates are still open;
  this ADR records direction so V3 can start cleanly, and authorises no code.
