---
status: approved v1.0
last-updated: 2026-07-16
current-version: V2.6
current-gate: Spatial Reveal / Floating Print direct controls and unambiguous exit
next-milestone: owner acceptance of Floating Print before gesture-vocabulary expansion
---

# ROADMAP

This roadmap is a sequence of validated product increments, not a feature wishlist. Only
the current milestone may be implemented. A later milestone may inform an expensive
boundary, but does not authorise its folders, dependencies, services, or UI.

## Release structure

- **Engineering Foundation:** V0
- **Prototype Milestone:** V1, V2, and V2.5
- **Product Milestone:** V3, V4, and V5; completing V5 defines Lumina Space 1.0
- **Platform Expansion:** triggered V6 and V7
- **Experience Expansion:** triggered XR-1 and conditional XR-2 viewer clients

## Version gate template

Every milestone is reviewed against the same eight sections:

1. **Product Goal** — the assumption this version must validate.
2. **User Journey** — the complete user outcome delivered.
3. **Scope** — work required to pass the gate.
4. **Explicit Non-goals** — tempting work forbidden in this version.
5. **Architecture Boundaries** — seams that must exist or remain intact.
6. **Risks** — likely ways the version could fail or expand accidentally.
7. **Exit Criteria** — observable conditions required to close the version.
8. **Evidence** — artefacts proving the exit criteria were met.

## V0 — Engineering baseline (closed 2026-07-15)

### Product Goal

Create a trustworthy, minimal base from which product work can advance without speculative
structure or undocumented decisions.

### User Journey

A contributor can install dependencies, start the app, type-check it, and produce a build.

### Scope

- Vite, React, and strict TypeScript scaffold
- Working `dev`, `typecheck`, and `build` scripts
- CI that invokes only package scripts
- Approved product, architecture, design, roadmap, and development rules
- ADR template and accepted decisions for expensive boundaries

### Explicit Non-goals

- Gallery, scene, input, state, service, or data implementation
- 3D, gesture, backend, test, lint, or state dependencies without a real first use
- Empty future-facing directories

### Architecture Boundaries

The dependency rules in ARD and AGENTS are binding, but deferred modules remain absent.

### Risks

- Documentation pretending that unimplemented architecture already exists
- Tooling and folder growth without a product occupant
- Treating a successful build as product validation

### Exit Criteria

- [x] `npm run typecheck` succeeds. (verified 2026-07-15)
- [x] `npm run build` succeeds. (verified 2026-07-15)
- [x] CI invokes only existing package scripts. (`npm ci` / `typecheck` / `build`)
- [x] Current documentation agrees on product order and active milestone.
- [x] Repository status contains no unexplained generated artefacts. (clean tree at `35e3670`)

### Evidence

- Type-check and production-build output
- CI configuration review
- Documentation consistency review

## Prototype Milestone

## V1 — Stable local viewing gallery (closed 2026-07-15)

> Gate closed 2026-07-15: the owner completed the first-time journey unaided and
> reported normal behaviour and smooth performance on own hardware.

### Product Goal

Validate that a first-time visitor can and wants to view a curated photography story in a
3D space without game knowledge.

### User Journey

`enter -> orient -> browse 12 photographs -> open detail -> read metadata -> return -> reset`

### Scope

- One premium cinematic gallery template
- 12 bundled photographs loaded through `photoRepository`
- Guided or constrained desktop navigation
- Pointer selection, photo detail, metadata, back, and Reset View
- Responsive lower-complexity fallback
- Designed loading, empty, unsupported, and error states
- Texture/resource disposal, camera bounds, reduced motion, and baseline performance checks

### Explicit Non-goals

- Intent framework, gesture, camera permission, accounts, uploads, or backend
- Unrestricted FPS movement or a general scene editor
- Multiple room templates, WebXR, social features, analytics, or admin UI

### Architecture Boundaries

- `scene/` is generic and cannot know photographs exist.
- `gallery/` may use scene capability and reads photos only through `photoRepository`.
- Media lives in flat `public/photos/` URLs and is not imported through the JS bundle.
- Create only the deferred files and folders occupied by this milestone.

### Risks

- 3D spectacle competing with the photographs
- Disorientation, camera clipping, motion discomfort, or inaccessible controls
- Large textures causing long loads, memory growth, or unstable frame pacing
- Mobile fallback becoming a broken desktop clone

### Exit Criteria

- [x] A first-time tester completes the full journey without verbal instruction. (owner run, 2026-07-15)
- [x] All 12 photographs render reliably through repeated open/close cycles. (15 cycles, 0 failures)
- [x] Camera cannot leave the intended experience or pass through blocking geometry.
- [x] Loading and failure paths recover without a page refresh where recovery is possible.
- [x] Pointer and keyboard users can complete every core task.
- [x] Reduced-motion mode remains functionally complete.
- [x] A performance budget and supported-browser matrix are recorded before gate approval.
- [x] Type-check, build, relevant tests, and manual journey checks pass.

### Evidence

- Tested journey record with browser, viewport, and device details
- Performance and repeated-navigation observations
- Screenshots/video of primary and fallback journeys
- Build, type-check, and test output

## V2 — Intent-based conventional interaction (closed 2026-07-15)

### Product Goal

Prove that one device-neutral intent vocabulary can support predictable pointer, keyboard,
and touch interaction without changing gallery behaviour per device.

### User Journey

The V1 journey plus consistent select, bounded detail zoom/rotation where justified, back,
and reset across conventional input methods.

### Scope

- Minimum intent contracts and plain event bus
- Pointer adapter, keyboard adapter, and touch adapter
- Instant intents for select, back, and reset
- Lifecycle only for genuinely continuous interactions
- Cancellation that restores a valid state
- Colocated tests for intent contracts and critical interaction behaviour

### Explicit Non-goals

- MediaPipe, WebXR, generic middleware, priority systems, or plugin architecture
- Universal `START / UPDATE / END / CANCEL` wrappers for instant actions
- Gesture-specific concepts in gallery or scene code
- Full FPS movement unless V1 evidence establishes a real need

### Architecture Boundaries

Adapters emit intents and never import `gallery/` or `scene/`. Downstream application code
cannot identify the device that produced an intent.

### Risks

- Input abstraction becoming larger than the behaviours it serves
- Pointer, touch, and future gesture producing subtly different outcomes
- Continuous input getting stuck after focus, pointer, or touch interruption

### Exit Criteria

- [x] The core journey succeeds with pointer, keyboard, and supported touch viewport.
- [x] Replacing the input adapter does not require gallery or scene changes.
- [x] Instant and continuous intent semantics are documented and tested.
- [x] Cancellation and focus-loss tests leave no stuck interaction state.
- [x] No source-arbitration framework exists without a demonstrated competing-source case.

### Evidence

- Intent contract and test output
- Manual input matrix
- Architecture import review
- Build and type-check output

## V2.5 — Gesture Experience Validation (closed 2026-07-15 by owner decision — multi-tester protocol deferred)

> Owner decision 2026-07-15: after the field-run fixes, the owner re-tested on real
> hardware — engagement no longer misfires, point + pinch opens a photograph, and
> point + pinch returns it to the wall. The owner accepted this single-tester evidence
> to close the prototype milestone and advance to V3. The formal multi-tester protocol
> (`docs/evidence/V2.5-protocol.md`) is deferred, and must run before any production
> gesture claim at V5. Unchecked criteria below are covered by this deferral.

### Product Goal

Determine whether a device-independent gesture experience makes the gallery more distinctive
and engaging without making core tasks less reliable. MediaPipe is the first implementation,
not the product identity.

### User Journey

`enable gesture -> grant permission -> open palm to engage -> point to focus -> pinch to`
`pull a photograph from the wall -> inspect -> return -> disable gesture and verify cleanup`

### Scope

- Explicit camera permission and denied/unavailable states
- MediaPipe hand tracking adapter
- Open-palm engagement state that prevents incidental hand motion from acting on the gallery
- Index-finger pointing mapped to focus with smoothing and target magnetism
- Pinch confirmation that appears to pull the focused photograph from the wall into a bounded
  detail view; it must remain semantically equivalent to conventional selection
- Optional small, bounded detail movement only if it improves the physical-print metaphor
- Tracking-lost cancellation and minimum competing-input arbitration
- Complete pointer/touch fallback
- Camera and model resource release when gesture mode closes
- Pre-implementation test protocol defining sample size, lighting conditions, completion
  target, accidental activation budget, and supported hardware

### Explicit Non-goals

- Grab, two-hand zoom, gesture locomotion, gesture-only tasks, or full sign vocabulary
- Gesture concepts in gallery or scene modules
- Background camera use or automatic permission prompts on page load
- Claiming success from a developer-only demonstration
- Gesture control for editing, publishing, asset management, or workspace administration
- Neon hand skeletons, persistent HUDs, or novelty effects that compete with photography

### Architecture Boundaries

MediaPipe is an input adapter. It translates tracking output into existing intents; it does
not become a gallery dependency. Raw landmarks do not cross the adapter boundary.

### Risks

- Novelty being mistaken for usability
- Lighting, skin-tone, camera, or background variability causing unequal reliability
- Jitter and accidental pinch activation
- Camera lifecycle, privacy, CPU, battery, and frame-rate cost
- The signature animation looking impressive while the input remains hard to understand

### Exit Criteria

- [ ] First-time testers discover engagement, focus, pinch-to-open, and return without verbal
      coaching after no more than one short visual demonstration.
- [ ] Testers describe the interaction as taking or pulling a photograph from the wall, not
      merely clicking with a hand cursor.
- [ ] Measured completion, error, and accidental-activation results meet the protocol set
      before implementation.
- [ ] Tracking loss or hand removal cannot leave a selection or manipulation stuck.
- [ ] Denied permission and no-camera devices retain the complete core journey.
- [ ] Disabling gesture releases camera tracks and gesture resources.
- [ ] Gallery performance remains within the recorded V1 budget or an approved revision.

### Evidence

- Anonymised test protocol and results
- Permission, fallback, tracking-loss, and cleanup test output
- Supported-device/browser matrix
- Performance comparison with gesture off and on

## V2.6 — Floating Print and evidence-selected gesture (current — opened 2026-07-16)

> 2026-07-17: the owner selected **held-pinch inspect** as the one advanced
> interaction (short pinch = take/return unchanged; a pinch held past 400 ms becomes a
> continuous inspect whose thumb–index spread drives the print's zoom, with exit
> hysteresis; release or tracking loss always settles back — no partial zoom can
> latch). Implemented locally; its success metric is the owner-present tuning session
> plus the deferred multi-tester protocol. Not deployed yet.

### Product Goal

Make the pulled-forward photograph a complete, teachable gesture viewing mode without
turning gallery management or authoring into gesture-controlled work.

Its signature moment is **Spatial Reveal / Floating Print**: the focused photograph behaves
like a physical print that leaves the wall, becomes the stable portfolio-viewing object, and
returns to its exact hanging position. This is an authored spatial transition, not a claim of
camera-composited WebAR.

### User Journey

`open palm engage -> point -> one-hand pinch open -> open-palm horizontal swipe previous/next
-> two-hand span zoom -> neutral re-arm -> point + one-hand pinch close -> gallery`

Tracking loss at any point cancels continuous recognition and preserves the last stable view.

### Scope

- Detail-mode open-palm horizontal swipe mapped to existing previous/next focus intent
- Bounded two-hand span zoom with `START / UPDATE / END / CANCEL`
- Existing one-hand point-then-pinch toggle remains open/close, including after zoom
- Neutral re-arm after two-hand zoom so an inward zoom cannot accidentally close the photo
- Direction threshold, cancellation, cooldown, and restrained frame/light feedback
- Spatial Reveal / Floating Print continuity for pointer, keyboard, touch, and gesture entry;
  reduced-motion substitutes a short state fade
- A lighter warm-grey focus edge whose intensity increases only during active pointing
- No dwell timer is added to opening in the first trial; false-positive evidence may trigger
  reconsideration later

### Explicit Non-goals

- Rotation, grab, push-depth recognition, or an unbounded gesture vocabulary
- Camera-composited WebAR, plane detection, or placing exhibitions in a physical room
- Animating or depth-warping the photographer's image content
- Gesture navigation without usability evidence
- Making gesture mandatory

### Architecture Boundaries

Swipe reuses device-neutral navigation intent and one-hand pinch reuses the open/close toggle.
Only continuous zoom may add a lifecycle intent; MediaPipe landmarks and hand-count knowledge
remain inside the adapter.

### Risks

- One-hand pinch being confused with two-hand inward zoom
- Swipe being triggered by ordinary pointing drift
- Discoverability, fatigue, and false positives

### Exit Criteria

- [x] Owner review identified the coherent detail-view vocabulary and state boundaries.
- [ ] Ten intended swipes in each direction achieve at least 9 correct moves with no skipped
      photograph, and 60 seconds of pointing/zoom produces no unintended navigation.
- [ ] Ten open-zoom-close journeys achieve at least 9 clean completions with no zoom gesture
      interpreted as close.
- [ ] Tracking loss cancels safely; pointer, keyboard, and touch remain complete fallbacks.

### Evidence

- Decision record referencing V2.5 findings
- Focused usability, reliability, and performance results

## Product Milestone

## V3 — Photographer account and photo library (closed 2026-07-16)

> Gate closed by owner 2026-07-16 with four recorded simplifications (progress
> indicator not per-byte, manual retry, EXIF extraction deferred with GPS never
> extracted, hard delete until references exist) — see `docs/evidence/V3.md`.

### Product Goal

Let a photographer securely establish a personal workspace and upload reusable photo assets.

### User Journey

`sign in -> enter personal workspace -> upload -> observe progress -> review photo library`

### Scope

- Authentication and photographer profile
- Automatically created personal workspace
- Workspace-scoped photo library and access enforcement
- Upload progress, failure state, and retry/recovery appropriate to the selected provider
- Original plus only the derivatives required by the active viewer/editor
- Basic metadata extraction with GPS hidden by default
- Archive/remove rules that protect referenced or published content

### Explicit Non-goals

- Exhibition editor, public publishing, collaboration, organisations, quotas product, or
  general asynchronous processing platform
- In-place replacement of a file referenced by an immutable published revision

### Architecture Boundaries

Photo data continues through `photoRepository`. Storage provider details do not leak into
gallery code. Assets belong to workspaces, not directly to users or exhibitions.

### Risks

- Upload and derivative scope becoming a speculative media platform
- Privacy leaks through metadata or storage policy
- Orphaned objects and ambiguous delete/replace behaviour

### Exit Criteria

- [x] One user cannot read or mutate another workspace's private assets. (attack-tested 2026-07-16)
- [x] Upload progress, failure, retry, metadata, and archive paths are tested. (with recorded simplifications)
- [x] Only currently required image derivatives are generated. (exactly 3, browser-rendered)
- [x] ADR 0002 is reviewed against the chosen provider before implementation approval. (ADR 0006 + addendum)

### Evidence

- Access-control and upload test output
- Storage lifecycle inspection
- Metadata/privacy verification
- Build, type-check, and relevant integration output

## V4 — Template exhibition editor (closed 2026-07-16)

> Gate closed under the owner's continue-through-V5 instruction. One recorded
> simplification: leave-page protection relies on the 700 ms autosave debounce plus the
> Saved/Failed indicator; there is no beforeunload interception yet (parked).

### Product Goal

Let a photographer create a coherent exhibition without learning 3D modelling software.

### User Journey

`create -> choose library photos -> arrange -> edit title/text/metadata visibility ->`
`preview draft -> return and continue editing`

### Scope

- One controlled exhibition template
- Exhibition title, description, cover, photo selection, order, and supported presentation
  settings
- Draft revision, automatic save, and clear Saving/Saved/Failed state
- Draft preview separate from the public viewer route
- Active/archive exhibition lifecycle
- Publication readiness validation

### Explicit Non-goals

- Public publishing, free-form 3D placement, custom shaders, building modelling, template
  marketplace, real-time collaboration, or silent mutation of published content
- Treating preview as a persisted lifecycle state

### Architecture Boundaries

Draft content is separate from any published revision. A failed or incomplete save blocks
publishing. Exhibition configuration references workspace photo assets.

### Risks

- Editor turning into a general scene builder
- Autosave races, unclear save state, or preview differing from publication
- Configuration becoming coupled to one renderer implementation

### Exit Criteria

- [x] A photographer creates and previews an exhibition without developer assistance.
      (full journey driven in-browser: create → add 3 → reorder → cover → preview on 3D walls)
- [x] Autosave semantics, failure recovery, and leave-page behaviour are tested.
      (server-echoed Saving/Saved/Failed with retry; leave-page simplification recorded above)
- [x] Preview renders the last successfully saved server draft. (preview consumes the save
      response, by construction)
- [x] Unsupported arbitrary scene edits are absent. (template-only: order, cover, text)

### Evidence

- End-to-end creation journey
- Save/failure/concurrency test output
- Draft-preview parity review

## V5 — Publishing Platform / Lumina Space 1.0 (closed 2026-07-16)

> All software exists and every locally-verifiable criterion passed. A production-shaped
> local run now serves the Vite SPA and Hono API from one Cloudflare Worker; same-origin
> authentication, anonymous publication reads, designed scene loading, and immutable
> revision-derived Open Graph metadata were verified in-browser. The free production route
> `lumina-space.lumina-exhibitions.workers.dev` and its R2 CORS origin are configured. The
> public DNS, TLS, API, metadata, signed image delivery, production sign-in, authenticated
> Workspace loading, real cover display, and publication status were verified. The owner
> accepted the V5 product loop and opened V2.6. Another-device verification remains recorded
> release evidence debt; advanced camera-hardware validation now belongs to V2.6.
>
> 2026-07-16 owner full-product review additionally approved and received an experience
> refresh inside the V5 window: DESIGN v1.1 (neutral architectural gallery — warm
> materials, per-photo wash lights, cove lighting, never pure black or white) and
> guided waypoint gliding (browsing walks the visitor to a curated viewpoint per
> photograph; gesture pointing highlights without walking). Remaining review items are
> queued outside this gate: gesture responsiveness plus Spatial Reveal / Floating Print
> (V2.6 trigger), the
> Photograph Space home, controlled curation templates, and a supervised Lumina Curator.
> The latter three remain parked and authorise no current code.

### Product Goal

Make an exhibition reliably shareable across devices without unpublished edits changing the
live experience.

### User Journey

`review draft -> publish -> open stable link elsewhere -> edit draft -> verify live version`
`unchanged -> republish -> verify stable link advances`

### Scope

- Immutable publication revisions
- Stable exhibition URL slug pointing to the current published revision
- Republish, unpublish, removed, and not-found states
- Unlisted sharing first; public discovery/SEO only when explicitly approved for this gate
- Open Graph preview appropriate to the published revision
- Cache policy that advances safely when the current revision changes
- Private owner access to revision records; history/rollback UI only if separately approved
- Production-supported gesture-enhanced viewing on published exhibitions where capability is
  available, with complete pointer, keyboard, and supported touch fallback
- Integration of the validated signature gesture with remote exhibition/photo loading and
  public viewer lifecycle

### Explicit Non-goals

- Password audiences, named-viewer sharing, social feed, analytics product, custom domains,
  or full version diff interface

### Architecture Boundaries

Public routes read immutable revisions, never mutable drafts. The stable slug resolves to a
revision identifier. Existing publication assets cannot be overwritten in place.

### Risks

- Cache serving stale or mixed revisions
- Published assets being deleted or replaced
- Draft/public data leakage
- Visibility scope expanding into a full access-control product

### Exit Criteria

- [x] The stable link loads the current published revision anonymously and the owner accepted
      deferring the additional-device repeat as release evidence debt rather than blocking V2.6.
- [x] Draft edits do not change that link before republish. (e2e: edit → public unchanged)
- [x] Republish creates a new immutable revision and advances the link atomically.
      (same slug, seq+1; pointer advance is the final single UPDATE)
- [x] Unpublish, removed, and not-found states cannot leak private content.
      (410 unpublished / 404 unknown; drafts never publicly reachable)
- [x] ADR 0005 invariants are covered by repeatable integration-contract tests plus the
      live provider run. (stable slug, immutable snapshot, pointer-last write order,
      edit/republish, unpublish/removed, and republish restoration)
- [x] The owner accepted V2.5 point/pinch as the published baseline; the incomplete advanced
      gesture journey is explicitly transferred to the now-open V2.6 gate.
- [x] Denied permission, unavailable camera, tracking loss, or gesture startup failure never
      prevents the complete conventional viewing journey. Camera denial, unavailable
      hardware, and model startup failure now have distinct feedback; pointer/keyboard
      remains complete.
- [x] Gesture is absent from authoring, asset management, workspace administration, and
      publishing actions except for an explicitly labelled non-destructive preview.
      (no gesture surface exists in any panel; only viewing mounts GestureControls)
- [x] The PRD Lumina Space 1.0 creation-to-republish loop passes end to end. (locally:
      sign-in → upload → curate → preview → publish → anonymous view → edit → republish)

### Evidence

- Cross-device publishing journey
- Revision, visibility, and cache test output
- Storage-reference integrity review
- Published-viewer gesture, fallback, cleanup, and performance evidence

## Platform Expansion

## V6 — Curatorial collaboration (triggered)

### Product Goal

Allow a real curatorial team to work asynchronously in one workspace without surrendering
ownership or publication control.

### User Journey

`owner invites -> member accepts -> collaborates within role -> authorised member publishes`

### Scope

- Multi-member workspaces and expiring invitations
- Minimal Owner, Editor, and Viewer roles
- Explicit publish capability
- Member removal and essential activity/audit records
- Non-real-time conflict handling

### Explicit Non-goals

- Real-time co-editing, enterprise approval workflows, SSO, or speculative Curator role whose
  permissions do not differ from Editor

### Architecture Boundaries

This milestone activates the membership model anticipated by ADR 0003. Authorisation is
enforced server-side and cannot rely on hidden UI.

### Risks

- Ambiguous roles or ownership transfer
- Invitation, removal, and stale-session security gaps
- Collaboration complexity arriving before real collaborators

### Exit Criteria

- [ ] A named real collaboration need and approved role matrix trigger the milestone.
- [ ] Access and publication permissions are covered by integration tests.
- [ ] Removal immediately prevents future protected actions.

### Evidence

- Approved role/capability matrix
- Invitation, membership, and authorisation test output
- Collaborative journey review

## V7 — Enterprise capability (triggered)

### Product Goal

Meet demonstrated organisational governance and brand needs that cannot be served by V6.

### User Journey

Defined by the first qualified organisation and its approved requirements.

### Scope

Only capabilities justified by validated demand, potentially organisation lifecycle, brand
themes, approval, finer permissions, audit retention, SSO, custom domains, or usage controls.

### Explicit Non-goals

- Building the complete enterprise wishlist in advance
- SLA or compliance claims without operational capability

### Architecture Boundaries

Any access-control expansion requires a new ADR that supersedes or extends ADR 0003.

### Risks

- Enterprise theatre without customers
- Permanent complexity introduced for one hypothetical workflow

### Exit Criteria

- [ ] A qualified organisational requirement and commercial/product rationale exist.
- [ ] Scope, security model, operational owner, and evidence plan are separately approved.

### Evidence

- Validated requirement and approved milestone amendment
- Security, operational, and acceptance evidence defined by that amendment

## Experience Expansion

## XR-1 — WebXR Viewer Client (parallel only when triggered)

XR-1 may begin only when V2.5 demonstrates spatial interaction value, target hardware is
available, a fixed experiment budget exists, and the work cannot delay the active platform
milestone. It tests entry, head pose, select/open/close, controller fallback, and real-device
performance through the existing scene and intent boundaries.

## XR-2 — Conditional Native XR Viewer Client evaluation

Native VR is evaluated only after WebXR proves user value, browser limits are measured, real
device demand exists, and the project can maintain a second technology stack. It is not a
committed milestone.

## Universal completion checklist

A version is complete only when all applicable items are checked:

- [ ] Product Goal has evidence, not only implementation output.
- [ ] The complete User Journey passes from a clean start.
- [ ] Every Scope item is complete or removed by an approved roadmap change.
- [ ] Explicit Non-goals are absent from the implementation.
- [ ] Architecture boundaries and dependency direction have been reviewed.
- [ ] Risks have either evidence, mitigation, or an explicit accepted residual risk.
- [ ] Type-check, build, package scripts, tests, and manual checks pass as applicable.
- [ ] Loading, empty, error, cancellation, cleanup, and accessibility paths were considered.
- [ ] Relevant docs and ADRs changed in the same commit as the behaviour they describe.
- [ ] New ideas were parked rather than quietly added.
- [ ] Implementation Summary, Files Changed, Validation, Evidence, and Next Recommended
      Version are included in the implementation handoff.

Advancing to the next version requires explicit approval after this checklist and the
milestone-specific Exit Criteria have been reviewed.
