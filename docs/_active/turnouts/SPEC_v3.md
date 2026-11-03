# SerieN — Interactive Turnout Experience, normative specification v3.0

**Temporary working technical specification.** Scope S0–S7. Prepared 2026-10-30. Illustrated PDF companion: `SerieN_Scambi_Master_Specifica_v3.pdf`; if provided, stage only temporarily as `SPEC_v3.pdf` in S0. This Markdown is complete for implementation and searchable. Visual diagrams from the PDF are artistic references, **not geometry**.

## 0. Non-negotiable visual result

The viewer must immediately recognize the **real existing Kato/Unitrack turnout**, not a substituted graphic. On hovering its control or the device, a restrained but unmistakable **pulsating blue light traces the actual shape** of that turnout, including relevant diverging geometry. On actuation, a **thin, elegantly animated red route arrow** follows the **actual permitted metal-track path**. The result must look like premium model-railway interaction, not cartoon neon or a generic game HUD.

**ABSOLUTELY DO NOT** relocate, rotate, deform, re-mesh, hide, replace or re-scale the canonical 150 rails, turnout needles, base track beds, sleepers, rail spacing or ballast to make an effect fit. Do not apply different ballast geometry or stylized materials around switches. A subtle **global** ballast material improvement is outside scope and must be separately proposed and approved; the default is **no ballast change at all**.

The active eight controller IDs: `Y-IN`, `Y-R1`, `Y-R2`, `Y-3`, `Y-4`, `Y-2`, `WX-A`, `WX-B`. Six simple turnouts + 2 Kato WX310 double crossovers. Three visible concentric loops R249/R282/R315, four sidings, runaround; none of these may change. Train desk overall size/height remains unchanged.

## 1. Semantics — never mix the three states

**Blue** = identity/hover/focus of the **turnout piece**, never track clearance.
**Red arrow** = route(s) currently selected by turnout position, never a signal of *permission* or *safety*.
**STOP sign + bell** = a real unsafe/blocked approach identified by the **simulation engine**, and only after the physical stopping guard works. Danger must be communicated by accessible text/icon as well as color.

No visual overlay may own or mutate routing logic. Rendering and UI observe one shared canonical route model. All panel and 3D actions pass the *same* controller validation, switch lock checks, occupancy checks and dispatcher. Mouse hover is completely read-only; tap/click applies only after validation.

## 2. Art direction — blue pulsing conformal glow

**Target sensation:** precisely controlled, calm technical illumination over true rail geometry; excellent in daylight and in nocturnal scene without washing out sleepers or weathering.

- Starting palette (to be tuned by **actual screenshots**, not guessed): vivid cold blue `#37A8FA`, softer edge `#A9DDFF`. Do not shift to lime, turquoise cartoon or purple bloom.
- Pulsation smoothly eased or sinusoidal, period **1.2–1.6 seconds**, entry/exit fade **120–180 ms**; no hard flash, no strobe. Reduced-motion users get a stable outline.
- Follow exactly the **device's real constituent paths or silhouette**; subtle narrow ribbons/edge highlights derived from canonical geometry, not screen-space rectangle, bulky halo ring or a floating sphere. Match switch #6 curves and both WX310 branches; never make the middle X a new connection.
- Layer slightly above contact plane to avoid z-fighting, with depth testing/occlusion: no through-building, no detached projected outline when camera changes. Respect near/far clipping, camera orbit and zoom.
- Rails, point blades, sleepers, rust and ballast must stay visibly recognizable under the effect. Avoid swapping original material, inflating rail meshes or full-scene bloom. No shadow-producing lights.
- Only the intended control glows. Panel hover ↔ real piece hover are synchronized and unambiguous; whichever surface is selected has a consistent visual state; focus and selection priority are deterministic.
- Touch: distinguish orbit/drag versus deliberate tap; don't accidentally throw turnouts. Keyboard focus has equivalent identification.
- Require at least **two visual variants** at S3 with grounded evidence. Compare side-by-side; choose one only after human visual approval.
- Evidence: exact camera screenshots BEFORE/AFTER, normal/day, night, close-up simple turnout, close-up WX-A and WX-B, and at least three frames of pulse or short video. Record draw calls and frame-time impact.

## 3. Art direction — red route arrow

**Target sensation:** the selected path lights up on the authentic turnout as a restrained, accurate hint. **Not** a big red chevron, laser beam, floating arrow board or improvised straight line.

- Color reference `#EF5066` with subdued idle opacity. Small tapered/capped strokes or a fine arrowhead aligned to **sampled network path**, not an invented spline or Euclidean line from control center.
- On a successful switch change: reveal from entry toward exit **260–400 ms**, low-intensity settled idle afterwards. Keep route state readable in the absence of trains. Avoid constant frantic animation.
- For locomotives approaching: orient to real arrival side and movement direction from Journey. Without an approaching train: use a consistent, *documented* reference direction and explanation; don't guess a train direction.
- On a WX310: represent **both valid selected paths** in both states (through straight pair or legal crossover pair), never a fictitious physical junction in center of X. Test entrances and reverse traversal individually.
- Show no arrow implying a known route when the router result is UNKNOWN; fail conservatively, communicate uncertainty.
- Arrow may not hide needles, frogs, guard rails or key Kato piece details. Respect camera angles, occlusion and day/night contrast.
- Red routing arrow and red STOP danger must remain conceptually distinct in copy and placement.
- Evidence: S4 screenshots / animation frames for six singles and both WX units at their two positions; test matrix for entry and reverse direction; idle screenshot without trains; zoom and night samples. S4 requires user **visual approval**, not merely PASS unit tests.

## 4. Interaction and controller correctness

Canonical controller mapping (verify actual checkout, do not replace canonical data):
- `Y-IN` West yard entrance — `TO0:AB / TO0:AC`
- `Y-R1` West runaround switch — `TO1:AB / TO1:AC`
- `Y-R2` East runaround switch — `TO2:AB / TO2:AC`
- `Y-3` East yard entrance — `TO3:AB / TO3:AC`
- `Y-4` East siding — `TO4:AB / TO4:AC`
- `Y-2` West siding junction — `TO5:AB / TO5:AC`
- `WX-A` west double crossover — `upper, lower, down, up`
- `WX-B` east double crossover — `upper, lower, down, up`

Panel hover -> corresponding physical piece pulses. Physical piece hover -> exact panel button identifies. Panel click/touch and 3D click/tap produce the same guarded switch request and outcome. Rejected switch requests (occupied, protected, invalid) must remain rejected on both surfaces. Hover must not reposition controller or reserve routes.

Invisible picking aids may be introduced **only as interaction hit regions** rooted in canonical 3D physical paths, no visible modifications to ballast or rails. Deterministic tie-breaking if device hit regions overlap. Prevent accidental actuation while camera dragging or interacting with scenery; honor UI overlays. Remove only artificial switch-indicator bulbs/lamp posts; preserve genuine scenic lighting.

## 5. Safety engine — must precede STOP visuals

The simulation engine is authoritative. Assess approach using **Journey distance along edges**, actual head/consist extent, direction, movement speed and validated switch route/locks. Do not use 2D Euclidean proximity as a safety decision. Distinguish `SAFE`, `UNSAFE` and `UNKNOWN`; UNKNOWN does **not** authorize passage into a protected discontinuity.

- Detect approaching a configuration that cannot legally traverse from the incoming port; don't confuse legitimate trailing-point entry with an illegal entry.
- Safe stopping must occur **before** protected limit, including low/large dt, paused tabs, resumed background simulation, changing turnout state, multiple trains and consist lengths. Use existing deceleration semantics; if stopping-distance physics cannot guarantee the guard, enforce movement clamp at safe boundary. Never allow tunneling.
- Route guards and occupancy locks remain coherent during transitions; no race on a switch changing as a train approaches.
- Reversing away from hazard or applying a safe state clears warning; do not resume a train that the user explicitly stopped. `STOP ALL` remains authoritative.
- Unit tests with high speed, reverse, multiple approach sources, blocked turnouts, runaround and short sidings. Record distance to boundary, direction, branch ID and stop position. Safety must pass before S6 can start.

## 6. Scenic STOP and crossing bell — dependent on engine hazard

Small N-scale credible sign **beside** the approach, not on the track bed or between railheads. Smooth emergence from ground **350–450 ms**, restrained easing and gentle settling; retract **250–350 ms** when hazard resolves. No cartoon overshoot or model-plane collisions. Intersect neither rails, ballast nor scenography.

Original crossing-bell-like sound via Web Audio is appropriate; no reuse of copyrighted recordings. Begin only after authorized user gesture; subtle volume, global single sound coordinator for multiple hazards, no overlapping bell explosions. Mute on risk resolved, pause, tab hidden, reset, scene disposal and browser lifecycle. Respect reduced-motion and audio mute. Warnings readable without sound.

**Physical train stop must succeed even if overlay/audio fail, are disabled, or have not loaded.**

## 7. Performance, geometry integrity and minimum security

- Lock baseline from the actual checkout: canonical `src/canonical-layout.json` hash/graph and **150 rail meshes** (identity, transforms, bounding boxes, segment endpoints). Compare after S2/S3/S4/S7. Rendering additions must not silently modify Kato geometry/ballast/scene.
- Maintain 5D performance as baseline. No unnecessary per-frame object allocation, new shadow lights, full-scene post-processing or leaks. Set explicit resource lifetime/dispose for geometry, materials, event listeners and Web Audio.
- Preserve three recent train consoles, their original desk height, HUD Next Switch, minimaps, camera orbit/Follow, four missions, routing and Z21 independence. Check responsive desktop/tablet/touch.
- Basic security NOW: no secrets, auth tokens, service keys, SQL migrations, Supabase permission changes, remote API calls, dependencies without explicit review. Validate all control IDs, finite numeric inputs, privileged browser APIs via gesture, no eval/unsafe HTML, no arbitrary uploaded JS. Keep existing RLS, grants and API restrictions unchanged.
- Phase 5E deep cybersecurity follows after Train Management 6E; security minima are not optional.

## 8. Execution contract: S0–S7, exactly one at a time

**Pause condition:** End EVERY microphase by running pertinent tests & build, producing documentary/visual evidence, committing one atomic diff and updating `PROGRESS.md` and `STATUS.md`; respond in Italian with SHA + PASS/FAIL/NOT VERIFIED + risks; ask `Approvi l'avvio di S[n+1]?` and STOP. A prior chat or user's general approval of this plan NEVER authorizes the next step. No autonomous continuation across phases.

**S0 — Baseline after 5D.**
Check git branch, status, HEAD, local unpushed 5D work; 5D must be demonstrably closed, tested, documented and committed. Run `npm test`, `npm run build` and relevant browser suite. Capture fixed-camera day/night reference images and 5D frame-time metrics (or NOT VERIFIED). Record canonical graph hash, 150 rail mesh baseline, existing indicator/picker modules and eight controllers. If supplied by user, copy the original PDF bytes to `docs/_active/turnouts/SPEC_v3.pdf` (SHA-256 `2face5b2eb8b02419b4da92efbfdb5d25ad0adf1dafac95721d6e46e65a9b89d`), otherwise record PDF missing without faking it. Update handoff. Commit suggestion `docs(turnouts): establish baseline and evidence`. **STOP and ask approval for S1.**

**S1 — Single turnout/router contract.**
Consolidate a pure route view-model from existing router, for simple and WX310 (both states, all four ports, reverse and unknown). Ensure single guarded dispatcher used by UI and 3D. Do not animate yet or mutate graph. Test matrix + docs + commit `refactor(turnouts): unify routing contract`. **STOP / S2 approval.**

**S2 — Remove artificial marker; invisible geometry-conformal pick zones.**
Only remove switch indicator bulbs, not scenic lamps. Derive invisible hit regions from actual turnout paths; mouse, touch, camera drag distinction and occlusion. Test all eight; preserve rail/ballast mesh proof. Screenshot before/after. Commit `feat(turnouts): select physical devices`. **STOP / S3 approval.**

**S3 — Blue glow: TWO variants and visual approval.**
Build conformal controlled blue pulse, hover/focus sync, day/night and closeups, reduced motion, no through-wall bloom. Produce two viable styles and comparative captures; do not silently choose a weak option. Test no rail/ballast changes, benchmark frame-time/draw calls. Commit `feat(turnouts): add conformal blue pulse`. **STOP; request explicit visual approval before S4.**

**S4 — Animated red selected routes; visual approval.**
Sample real route paths and create restrained route arrows reveal+idle. Include both WX310 legal paths, correct ports/reverse, unknown fails closed; never suggest clearance. Capture simple + WX-A + WX-B day/night, compare idle and arrow reveal sequence, verify tests. Commit `feat(turnouts): show canonical selected routes`. **STOP; request explicit visual approval before S5.**

**S5 — Predictive hard stop in engine.**
Implement authoritative, direction-aware guard before integrating motion. Validate dt spikes, high speed, consist tails, crossing, two trains, reverse, no false hazards and STOP ALL. Record boundary collision proof. No STOP sign/audio implementation yet. Commit `feat(safety): enforce turnout boundaries`. **STOP / S6 approval.**

**S6 — N-scale STOP sign and bell.**
Connect 3D sign and a single lifecycle-safe audio source to S5 hazard state; animate emergence/retraction, no audio before gesture or when hidden/paused. Check reverse resolution, mute, concurrency. Commit `feat(turnouts): add STOP scene and bell`. **STOP / S7 approval.**

**S7 — Final visual and technical acceptance; retire temporary spec.**
Run T01–T40, screenshots with identical cameras and explicit before/after, full regression and 5D performance deltas, minimal security review, bundle check for Pages /SerieN/. Write `docs/turnouts/FINAL_REPORT.md` with evidence, known limitations, reviewer approvals and handoff to 6A. Remove `docs/_active/turnouts/SPEC_v3.md`, `SPEC_v3.pdf` if staged, and `STATUS.md`; update permanent docs without dangling active links. Commit `test(turnouts): close and retire active spec`. **STOP / user final approval.**

## 9. Test matrix (40 acceptance cases)

T01 Panel hover identifies exact real 3D device.  
T02 Device hover highlights corresponding panel control.  
T03 Hit regions conform to geometry; old bulb markers absent.  
T04 Panel and 3D share same guarded dispatcher.  
T05 Occupancy/lock rejection identical from both surfaces.  
T06 Hover/preview never changes route.  
T07 Touch tap not confused with orbit drag.  
T08 Keyboard focus and accessible state announcements.  
T09 Glow conforms to whole device and respects depth/occlusion.  
T10 Glow readable in day/night from multiple cameras.  
T11 Glow never masks rails, point blades, ballast.  
T12 Reduced motion shows non-pulsing equivalent.  
T13 Simple turnout arrow follows selected legal branch.  
T14 Arrow remains subtly visible with no approaching train.  
T15 Reverse traversal points arrow correctly.  
T16 WX310 straight uses both legal through paths.  
T17 WX310 crossover uses both real legal diagonals.  
T18 WX crossing center introduces no spurious connection.  
T19 Two WX × two states × four entry ports verified.  
T20 UNKNOWN/nonfinite state never produces fictional route.  
T21 Valid trailing-point approach does not trigger false STOP.  
T22 Invalid approach stops before protected limit.  
T23 Journey head + consist length, never Euclidean-only.  
T24 High dt / resume cannot tunnel past limit.  
T25 Multi-train simultaneous hazards handled correctly.  
T26 Safe reversal clears hazard and scenic warning.  
T27 Voluntary stop never auto-restarts.  
T28 STOP ALL retains precedence.  
T29 STOP sign scale, scene and ground placement correct.  
T30 Bell requires gesture, supports mute and lifecycle.  
T31 Reset/dispose does not leak listeners, geometry or audio.  
T32 150 rail meshes and canonical layout hash unchanged.  
T33 Ballast unchanged at turnouts; no local stylization.  
T34 Three loops, four sidings, runaround and missions regressions pass.  
T35 Three consoles/HUD/minimaps/plancia dimensions unchanged.  
T36 `npm test` and `npm run build` green.  
T37 Desktop/mobile/browser touch and GitHub Pages base path.  
T38 Performance comparisons against real 5D baseline.  
T39 No secrets, new network egress, DB/schema/permission changes.  
T40 Final report exists; active specs removed or superseded.

## 10. Evidence/report template, per S

- Step Sx: PASS / BLOCKED; branch + HEAD before/after, git status.
- Changed files and rationale; actual commit SHA (not placeholder).
- Tests PASS/FAIL/NOT VERIFIED with commands and evidence paths.
- Visual evidence: same-camera before/after and snapshots/animation (required S2, S3, S4, S6, S7).
- Geometry/track bed, UI height, router and safety invariants PASS/FAIL/NOT VERIFIED.
- Performance p50/p95 frame-time and draw calls when relevant; baseline recorded.
- Security minima: secret scan, dependency changes, no Supabase/RLS/permissions.
- Remaining issues; **request explicit user authorization for the next named microphase**.

**Follow-on development:** verified 5D → S0–S7 → reconcile cloud Supabase 6A migrations and complete backend 6A.3–6A.6 → 6B/6C/6D/6E Train Management → final 5E security audit prior to any production write exposure.
