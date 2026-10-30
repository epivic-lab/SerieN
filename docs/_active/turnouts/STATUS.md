# Turnouts — ACTIVE SPEC / S3 B APPROVED / S4 REFINEMENT TECHNICAL PASS / VISUAL APPROVAL PENDING

Spec revision: **v3.0**. Branch prepared: `docs/turnouts-handoff-v3` on 2026-10-30. **S0–S3 approved; S3 B officially selected by user. S4 verification complete: technical PASS, visual/functional approval PENDING; S5 NOT STARTED.**

- Active text: `docs/_active/turnouts/SPEC_v3.md`. Read Shared Gates + the one authorized step; do not load unrelated docs.
- Visual companion: `SPEC_v3.pdf`, copied from the supplied `SerieN_Scambi_Master_Specifica_v3.pdf` during S0: 27 A4 pages; SHA-256 `2face5b2eb8b02419b4da92efbfdb5d25ad0adf1dafac95721d6e46e65a9b89d` verified. Temporary active copy, to retire only at approved S7 closure.
- Execution gate: **5D completed and published on main at commit `58bbe62bffb37f19125ddb38513502b5ca306821`** (see `docs/PERFORMANCE_AUDIT_5D.md`). Codex must STILL verify its local checkout, baseline tests/build and working tree before S0. If local 5D is missing or uncommitted: BLOCKED.
- NEXT: await explicit S4 visual/functional approval or refinements; [handoff](evidence/S4/RESUME.md). All previously pending S4 checks completed. No S5 authorization.
- Changes to the specification require user approval; annotate deviations in the phase report rather than silently editing the reference.
- After every S: status, evidence, commit SHA, tests, updated `PROGRESS.md`, explicit confirmation request.
- Final S7, after user approval: preserve `docs/turnouts/FINAL_REPORT.md`, retire `SPEC_v3.md`, `SPEC_v3.pdf` (if staged), and this STATUS file. Do not rewrite older phase reports or pretend deletion removes git history.

## S0–S7 status
| S | Status | Commit | User next-phase approval |
|---|---|---|---|
| S0 | PASS / APPROVED | `107178921bbc8049d855c0221b799444231120bb` | S1 explicitly approved |
| S1 | PASS / APPROVED | `99b143c918e016f7e744217aa4c760fc9987deb9` | S2 explicitly approved |
| S2 | PASS / APPROVED | `6bdec29194d4e232eeab0e1ff5a8d4e6b26ec47b` | S3 explicitly approved |
| S3 | PASS / APPROVED B | `fd32b43fe9438980bde798fd76773f8af2f3f5fc` | S4 explicitly authorized |
| S4 | TECHNICAL PASS / VISUAL PENDING | latest commit updating `evidence/S4/refinement/REPORT.md`, after `48a89d1` | visual/functional signoff and S5 authorization required |
| S5 | NOT STARTED | — | pending |
| S6 | NOT STARTED | — | pending |
| S7 | NOT STARTED | — | final signoff |

## Required per-step evidence
- Screenshots from exactly repeatable camera positions and day/night settings; prior and after frames where applicable.
- Single turnout and both WX310 closeups; glow transition and arrows animation frames/GIF if possible.
- Headless tests / browser tests / performance comparisons after 5D baseline.
- Invariants: 150 rail meshes & canonical hash unchanged, track bed not modified, routing/safety regression passes.

## S0 evidence and handoff (2026-10-30)

- Baseline branch `main`, HEAD `6487f61612818c8cd46d882741cfa1ca96ac5a16`, clean before S0 artifacts; final S0 commit contains only documentation/PDF/evidence. Resolve its actual SHA with `git log -1 --format=%H -- docs/_active/turnouts/evidence/S0/REPORT.md`; actual SHA supplied in user handoff.
- [S0 report](evidence/S0/REPORT.md), [baseline](evidence/S0/baseline.json), [geometry manifest](evidence/S0/geometry.json), [camera/timing](evidence/S0/capture.json).
- 5D publication/code and PR #1 integration verified. 131 Node + 9 Python + build PASS; 11-scenario production 5C browser suite PASS. Production circuit/HUD/responsive evidence linked in S0 report.
- Canonical SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`, 150 original rails + 75 track beds captured before existing static batching; runtime unchanged. No local ballast or UI changes.
- Eight fixed-camera Low day/night images: overview, simple Y-IN, WX-A, WX-B. Historical 5D metrics retained separately from short S0 instrumented RAF sample. Hardware GPU / physical touch NOT VERIFIED.
- S1 subsequently explicitly authorized and completed as recorded below. No S2–S7 implementation.

## S1 evidence and handoff (2026-10-30)

- Baseline S0 `107178921bbc8049d855c0221b799444231120bb`, branch `main`, clean at start. Actual S1 SHA is the commit adding [S1 report](evidence/S1/REPORT.md); resolve with `git log -1 --format=%H -- docs/_active/turnouts/evidence/S1/REPORT.md`. SHA and clean final status supplied in user handoff.
- [Internal contract and transition tables](S1_CONTRACT.md). Pure model from existing router; actual-network approach includes current neighbouring states. Canonical-ID guarded dispatcher shared by panel and existing 3D markers. Logic/safety/rendering remain separate.
- **148 Node + 9 Python + build PASS**; 7.168 entries across all 256 controller configurations; 16 actual panel/marker pairs, occupied and invalid rejection. Browser 5C 11 cases and production circuit/HUD/four-viewport responsive suite PASS.
- **150 rails + 75 beds match full S0 fingerprints**; canonical regeneration unchanged. Eight visual pairs pixel-identical; native and GLB motion/state/transforms equal in both directions. Hot simulation/renderer/Next Switch functions unchanged. No per-frame new view work, no dependencies/backend/permission changes.
- Security minima PASS within S1 scope. Hardware GPU, physical touch and full repeated 5D benchmarks NOT VERIFIED in S1; no claimed FPS improvement. No known blocker.
- S1 subsequently approved; S0/S1 remote checkpoint verified at `99b143c` on `feature/turnouts`. S2 subsequently authorized/completed below; no S3 implementation.

## S2 evidence and handoff (2026-10-30)

- Branch `feature/turnouts`, clean initial baseline `99b143c`; remote checkpoint S0/S1 verified before edits. [Report](evidence/S2/REPORT.md), [interaction contract](S2_INTERACTION.md), [before/after gallery](evidence/S2/visual/GALLERY.md), [commands](evidence/S2/commands.json).
- Removed only artificial base/stalk/bulbs and obsolete materials/feedback. Eight off-scene CPU-only canonical-path hit regions; geometry-based occlusion, stable ties, same S1 command boundary. Shared read-only identity for panel/device/keyboard; no visible 3D replacement, glow/arrows/STOP/audio.
- **161 Node, 9 Python, build PASS**. All eight controls, twenty branches, two zooms, 16 actual panel/device pairs; protected rejection, no hover mutation, real mouse gestures and CDP touch, keyboard, scenery occlusion, locomotive selection, resource/listener teardown.
- **150 rails + 75 beds exactly match S0**; canonical regeneration unchanged, material/texture signatures identical. Eight WebGL views equal the S1 reference with only old markers hidden. Railway/safety/5D sources unchanged. Small paired RAF sample within budgets; draw calls 367→343, GPU geometry count 364→340; no physical FPS claim.
- 5C eleven-scenario browser suite, production circuit/HUD/responsive suite and adapted Phase 2 acceptance (five viewports, occupied hover, High day/night) PASS. GPU/physical touch/full repeated 5D benchmark NOT VERIFIED in S2. Conservative geometric occlusion for alpha-masked foliage; no known blocker for S3.
- Permanent checkpoint protocol now in `AGENTS.md`. Resolve actual S2 SHA with `git log -1 --format=%H -- docs/_active/turnouts/evidence/S2/REPORT.md`; local SHA and verified remote SHA supplied after the final commit/push. Checkpoint only `feature/turnouts`; origin/main unchanged, no integration/deployment authorized.
- **STOP: wait for explicit S3 authorization.** Two blue-glow variants and aesthetic signoff belong to S3; none has been implemented here.


## S3 evidence and handoff (2026-10-30)

- Authorized only S3 after explicit S2 approval. Clean baseline and verified remote S0/S1/S2 at `6bdec29194d4e232eeab0e1ff5a8d4e6b26ec47b`, branch `feature/turnouts`. [Report](evidence/S3/REPORT.md), [contract](S3_GLOW.md), [A/B gallery](evidence/S3/visual/GALLERY.md), [HTML comparison](evidence/S3/visual/index.html), [commands](evidence/S3/commands.json).
- Two shared-resource conformal styles; all real S1 device paths, S2 identity and guarded commands. 1400 ms pulse, 160 ms fade, static reduced motion, brief touch identity; one visible device, depth test, no global bloom/light or route mutation. Default A is provisional review configuration, not aesthetic selection.
- **175 Node + 9 Python + build PASS**. Real bidirectional hover all8 both styles, keyboard/touch/protected/reduced-motion/depth/High day-night/resource cleanup; full original 150 rails + 75 beds equal S0, material/texture runtime signatures equal S2. S1/S2 interaction regressions, 5C eleven scenarios and Phase0 circuits/HUD/minimaps/responsive PASS. Ten no-glow images exactly match S2; both WX, day/night and three pulse phases per style captured. Opposite/low cameras at two zooms also checked.
- Isolated actual published5D comparison: p50 A +0.84%, B −1.68%; p95 A +1.61%, B +6.45%; draw calls 367→343 off /344 active. 16 software RAF samples per condition; full5D matrix/hardware FPS NOT VERIFIED. GPU lifecycle stable after warmup and all eight geometries/one material/listener released. Railway/safety/hot5D sources unchanged.
- GPU/physical touch NOT VERIFIED; inherited conservative alpha-foliage picking. A is subtler at distance/raking views. No known technical blocker; aesthetic approval deliberately pending. No S4 arrows, STOP/audio, backend, dependencies, layout/material changes or deployment.
- Resolve S3 SHA with `git log -1 --format=%H -- docs/_active/turnouts/evidence/S3/REPORT.md`; actual local/remote SHA, ancestry and clean tree verified in final handoff. Permanent checkpoint rule already in AGENTS and unchanged here. Only fast-forward `feature/turnouts`, origin/main untouched.
- **STOP: explicit A/B visual approval, any refinements and S4 authorization required.**


## S4 intermediate checkpoint — user-requested pause

S3 B officially approved; current runtime uses B by default with original geometry/shader/style unchanged. [Resume instructions](evidence/S4/RESUME.md), [intermediate report](evidence/S4/REPORT.md), [contract](S4_ROUTES.md), [gallery](evidence/S4/visual/GALLERY.md).

194 Node + 9 Python + build PASS. Canonical regeneration unchanged, 64 locked source/asset/dependency files and five hot functions unchanged. Capture set all8/two states/day-night PASS, B isolated renders exact to S3, WX same-path reverse examples and three reveal phases PASS. Original geometry/material construction sources intact.

**NOT VERIFIED / pending:** new S4 functional browser was interrupted by explicit user request before completion; S1/S2/5C/Phase0 regressions, runtime material/GPU checks and 5D/S3 performance still to run. No complete browser suite result from the interrupted driver. No S4 aesthetic signoff, no S5, no engine STOP/audio/backend work. Resume only S4 tomorrow; tests → final S4 commit → remote checkpoint → aesthetic approval remains the final gate.

Intermediate commit introducing RESUME, actual SHA/local-remote equality and clean tree in handoff. Permanent AGENTS protocol unchanged, checkpoint only feature/turnouts; main untouched. Prior historical S3 pending-signoff entries are superseded by the user's official B approval recorded here.


## S4 verification closure — supersedes the intermediate pause

Resumed from clean verified remote checkpoint c54c8c1. Runtime unchanged; approved B unchanged. **194 Node + 9 Python + build PASS; all five browser suites PASS** (S4 functional, S1 contract/geometry, S2 interactions, 5C eleven cases, Phase0 operations/GLB/HUD/minimaps/responsive). All WX four ports/two states and both signs verified; rejected commands preserve routes; UNKNOWN/reduced-motion/depth pass. GPU lifecycle stable, twenty geometries/eight materials/one program released. Runtime materials and textures equal S3; 150 rails/75 beds exactly equal S0, canonical hash unchanged, 64 original source/asset/dependency files and five hot functions unchanged.

Isolated 5D/S3/S4 RAF comparison and moving-train presentation CPU sample completed; data/provenance/limits in [final report](evidence/S4/REPORT.md). Existing real captures preserved and revalidated. Only test fixture clock/pointer normalization corrected during resume; no new railway or graphic implementation.

[Gallery](evidence/S4/visual/GALLERY.md), [handoff](evidence/S4/RESUME.md), [commands](evidence/S4/commands.json). Final closure commit updates report after intermediate c54c8c1; actual local/remote SHA and clean tree verified in handoff. Origin/main untouched; no merge/rebase/reset/force-push/deployment. Physical GPU/touch and full5D matrix NOT VERIFIED. **STOP: aesthetic/functional S4 approval and explicit S5 authorization required.**


## S4 conservative refinement — technical closure

Fresh review from clean local/remote `48a89d1`, with requested `c54c8c1` ancestor verified. **S4 technical PASS; aesthetic/functional approval PENDING. S5 NOT STARTED.** Only runtime correction: arrowhead bisectors follow local canonical tangents on curved paths, instead of the final7mm chord. All style/configuration,340ms reveal, shaft vertices, approved glowB and railway geometry unchanged.

**195 Node +9 Python/JMRI +build, five fresh browser regression suites and additional stress/camera review PASS.** 1,616 guarded rapid commands, all20geometry/material identities stable, no ghost routes/residual animation; GPU360/45/47 stable. Dispose20geometries/8materials/1program checked separately. Twenty-four opposite/low-angle zoomed poses idle-pixel-exact, real orbit/wheel and three resizes PASS. New73captures validate all8/bothstates/daynight, WX opposite directions,340ms reveal and six B-only comparisons pixel-exact toS3. Fresh isolated5D/S3/S4 comparison within gates; full5D/hardware GPU/touch NOT VERIFIED.

[Current report](evidence/S4/refinement/REPORT.md), [new gallery](evidence/S4/refinement/visual/GALLERY.md), [camera review](evidence/S4/refinement/review/GALLERY.md), [provenance](evidence/S4/refinement/commands.json). Previous report/images preserved as history. Current final commit is the latest affecting refinement/REPORT.md; actual SHA, verified remote feature/turnouts equality and clean tree in handoff. Main unchanged; no merge/rebase/reset/force/deploy. **STOP for user's red-arrow visual/functional approval and explicit S5 authorization.**
