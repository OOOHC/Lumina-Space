---
status: approved v1.1 (owner amendment 2026-07-16: neutral architectural gallery)
last-updated: 2026-07-16
---

# DESIGN

## Visual North Star

> **Not a 3D room with photographs, but an architectural space designed to let
> photography breathe.**

The exhibition language is a **neutral architectural gallery** — calm, premium, and
timeless, so that photographs of any style become the visual focus. It is neither a
permanently dark cinematic space nor a white museum: avoid pure black rooms and pure
white walls. Use soft architectural materials, subtle indirect lighting, natural
shadows, and restrained reflections. The default template must serve landscape,
portrait, documentary, street, and fine-art photography equally, favouring no genre.
The gallery supports future exhibition themes, but ships with exactly one high-quality
default template.

Lumina Space should feel like entering a deliberately curated exhibition: quiet, tactile,
spatial, and confident. The interface recedes when it is not needed. Photography supplies
the colour; architecture, typography, lighting, and motion provide rhythm and focus.

## Never become

- A sci-fi dashboard
- A cyberpunk HUD
- A wall of floating analytics panels
- A game menu wrapped around photographs
- A generic developer demo that uses 3D as decoration
- A template marketplace before the core exhibition is excellent

## Visual hierarchy

1. The current photograph
2. The relationship between photographs in the space
3. Orientation and interaction feedback
4. Curatorial text and metadata
5. Product chrome

UI must not compete with the first two levels. Avoid persistent panels, glowing borders,
excess gradients, glass-on-glass surfaces, and decorative telemetry.

## Visual identity

- Use a neutral architectural environment (warm greys, soft material tones) that
  preserves perceived image colour — never pure black, never pure white.
- Light photographs individually (subtle wash per print); let indirect light carry the
  room so shadows feel natural and reflections stay restrained.
- Let exhibition photographs create visual accents; do not impose a dominant brand tint.
- Prefer editorial typography with generous spacing and short readable line lengths.
- Use contrast, scale, and light before borders, badges, or ornamental containers.
- Treat empty space as part of the exhibition rather than a gap to fill.

## Spatial UX principles

- A first-time visitor must immediately understand where to look and what can be selected.
- Movement is **guided waypoint gliding** (owner decision 2026-07-16): browsing carries
  the visitor smoothly to a curated viewpoint in front of each photograph — walking the
  exhibition, not piloting a game camera. Unrestricted first-person movement remains
  out until evidence demands it.
- Prevent camera clipping, accidental exits, disorientation, and dead ends.
- Provide a calm and reliable Reset View action.
- Detail view must preserve a clear path back to the exhibition.
- Spatial scale and image placement serve narrative pacing, not novelty.

## Interaction principles

- Every core task works with pointer and keyboard; touch is supported where the layout runs.
- Gesture duplicates intent rather than creating a gesture-only product path.
- Feedback begins immediately, remains subtle, and confirms state without covering the image.
- Motion communicates location and causality; it is not ambient decoration.
- Respect reduced-motion preferences with a functionally equivalent experience.
- Tracking loss, cancellation, or device changes must leave the experience in a valid state.

## Signature interaction — Curator's Hand

The memorable interaction is not “use a hand as a mouse.” It is:

> **Point at a photograph. Pinch to pull it from the wall.**

The sequence is one coherent spatial metaphor:

1. **Open Palm — Engage:** enter gesture mode intentionally; incidental hand motion remains
   inert. Interface chrome recedes and restrained feedback confirms readiness.
2. **Point — Curatorial Light:** the intended photograph receives subtle light/focus and a
   slight spatial response. Smoothing and target magnetism reduce visible hand jitter.
3. **Pinch — Pull from the Wall:** the focused photograph leaves the wall and moves into a
   bounded detail presentation while the surrounding gallery softens.
4. **Small Move — Inspect:** a pinch held past a short threshold becomes a continuous
   zoom driven by thumb–index spread; a quick pinch remains the plain take/return tap.
   It never becomes unrestricted object manipulation, and tilt/rotation stay excluded
   (parked in FEATURE_PARKING_LOT.md).
5. **Release — Settle:** the photograph resolves to the nearest valid stable state.
6. **Tracking Lost — Cancel:** tracking loss is a graded recovery, not one blunt cancel
   (2026-07-17). The pointer/hover position invalidates immediately; a brief gap during
   an active zoom ends only that zoom; only sustained loss (~1.8s) closes an opened
   photo and returns to the exhibition. Tracking returning before that closes nothing —
   the photo stays open, though an interrupted zoom does not resume (a fresh pinch is
   required). No tier can leave a selection, zoom, or swipe trajectory partially active.
7. **Open-Palm Swipe — Browse While Open:** with a photograph open, an open-palm
   horizontal motion moves directly to the previous/next photograph without closing the
   detail view. Distance, velocity, and cooldown thresholds are initial estimates,
   unvalidated against a real camera.

The same domain action remains available through conventional input. Gesture changes the
physical expression and feedback, not the meaning of selection.

### Gesture visual rules

- Prefer subtle focus, light, depth, and movement over a literal cursor.
- Never show production users a landmark skeleton, tracking mesh, or diagnostic overlay.
- Do not use neon trails, sci-fi reticles, or persistent camera previews as exhibition UI.
- One short visual demonstration may teach the sequence; avoid a gesture manual.
- Keep interaction near a comfortable resting posture and avoid sustained raised-arm input.

### Gesture product boundary

- **Viewing:** supported after validation, always with conventional fallback.
- **Editor:** conventional input; gesture may enter a non-destructive viewer preview only.
- **Publishing:** no gesture actions.
- **Asset management:** no gesture actions, especially delete or replace.
- **Workspace administration:** no gesture actions.

## Detail view

- The image remains dominant at every supported viewport.
- Title and selected metadata are available without becoming a permanent sidebar.
- Zoom and rotation are bounded, reversible, and never required to read basic information.
- Back, close, and reset affordances remain predictable across input methods.
- The wall-to-detail transition should preserve the impression that the selected print was
  taken from a known physical location and can return there.
- A deliberate close — Back, Escape, or a quick pinch — always glides the camera to the
  room overview, not just back to that photograph's own close-up viewpoint (2026-07-17
  fix). "Closed" must look unmistakably different from "about to open," not identical
  to it.
- Tracking loss closing the photo (see step 6) is involuntary, not a deliberate "I'm
  done" signal, and deliberately does NOT glide the camera anywhere (2026-07-18
  correction) — it leaves the visitor exactly where they were, camera untouched.

## Responsive and fallback behaviour

- Preserve the exhibition narrative on smaller screens even when spatial complexity reduces.
- Prefer a deliberate lower-complexity presentation over an unstable imitation of desktop.
- Loading, empty, unsupported, and error states use the same editorial visual language.
- No-camera and denied-permission states retain the complete pointer/touch journey.

## Visual acceptance checklist

- [ ] Photography is the strongest element in every primary view.
- [ ] The complete core journey is understandable without explanatory developer text.
- [ ] No persistent HUD or diagnostic element is presented as product UI.
- [ ] Motion has a user-facing purpose and a reduced-motion alternative.
- [ ] Focus, hover, selected, loading, empty, and error states are intentionally designed.
- [ ] Typography remains legible against scene content and across supported viewports.
- [ ] A low-capability fallback remains coherent rather than visibly broken.
- [ ] Screenshots look like a finished exhibition product, not a component showcase.
- [ ] Gesture footage communicates “pull a photograph from the wall,” not “air-click a UI.”
- [ ] Gesture feedback remains photography-first and disappears cleanly when inactive.
