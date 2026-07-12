# 0002 — Workspace photo assets with demand-driven derivatives

- Status: accepted
- Date: 2026-07-12

## Context

The local gallery begins with bundled files, but the photographer platform must later accept
uploads, reuse one photograph across exhibitions, protect published content, and serve sizes
appropriate to 3D textures, detail views, and previews. Embedding uploads directly in an
exhibition would duplicate storage and make reuse, deletion, and publication integrity hard.

A complete media pipeline, background queue, transformation service, quota product, or CDN
topology cannot be selected responsibly before an upload/storage provider and measured image
requirements exist.

## Decision

When V3 activates remote uploads, each uploaded photograph will become an immutable photo
asset owned by a workspace. Exhibitions reference that asset and store exhibition-specific
order, text, crop, and presentation separately.

The original storage object will not be overwritten in place. Replacing a photograph creates
a new asset and changes only mutable drafts that explicitly adopt it. Published revisions
retain references to the objects with which they were published.

The pipeline will create only derivatives required by an active product journey. Exact
formats, dimensions, transformation location, provider, retention, and cache policy are
decided in the approved V3 implementation plan using measured V1/V2 needs. GPS metadata is
private by default. Physical deletion cannot invalidate a published revision.

Until V3, `public/photos/` remains flat local media accessed by URL through the
`photoRepository` boundary. This ADR does not authorise upload infrastructure now.

## Consequences

- One asset can be reused without duplicating the original.
- Exhibition configuration remains independent from library metadata.
- “Replace” is an explicit reference change rather than destructive object mutation.
- Storage cleanup must account for draft, publication, and retention references.
- The provider and derivative topology remain deliberately undecided until they have a real
  occupant and measured requirements.

## Alternatives considered

- **Store a separate upload inside each exhibition** — rejected because it duplicates media
  and prevents a coherent workspace library.
- **Overwrite the existing object when a photographer replaces a photo** — rejected because
  it silently mutates published content and defeats immutable revisions.
- **Build a general processing queue and full derivative matrix now** — rejected because no
  upload provider, measured sizes, or active platform milestone exists.
