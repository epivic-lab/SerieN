# Turnouts — ACTIVE SPEC / S1 PASS / WAIT FOR S2 APPROVAL

Spec revision: **v3.0**. Branch prepared: `docs/turnouts-handoff-v3` on 2026-10-30. **S0 approved; S1 completed: PASS on 2026-10-30. S2 NOT STARTED; explicit approval pending.**

- Active text: `docs/_active/turnouts/SPEC_v3.md`. Read Shared Gates + the one authorized step; do not load unrelated docs.
- Visual companion: `SPEC_v3.pdf`, copied from the supplied `SerieN_Scambi_Master_Specifica_v3.pdf` during S0: 27 A4 pages; SHA-256 `2face5b2eb8b02419b4da92efbfdb5d25ad0adf1dafac95721d6e46e65a9b89d` verified. Temporary active copy, to retire only at approved S7 closure.
- Execution gate: **5D completed and published on main at commit `58bbe62bffb37f19125ddb38513502b5ca306821`** (see `docs/PERFORMANCE_AUDIT_5D.md`). Codex must STILL verify its local checkout, baseline tests/build and working tree before S0. If local 5D is missing or uncommitted: BLOCKED.
- NEXT: await explicit user approval for S2. S0 approved and S1 exclusively authorized by the user in the next request. No S2 implementation.
- Changes to the specification require user approval; annotate deviations in the phase report rather than silently editing the reference.
- After every S: status, evidence, commit SHA, tests, updated `PROGRESS.md`, explicit confirmation request.
- Final S7, after user approval: preserve `docs/turnouts/FINAL_REPORT.md`, retire `SPEC_v3.md`, `SPEC_v3.pdf` (if staged), and this STATUS file. Do not rewrite older phase reports or pretend deletion removes git history.

## S0–S7 status
| S | Status | Commit | User next-phase approval |
|---|---|---|---|
| S0 | PASS / APPROVED | `107178921bbc8049d855c0221b799444231120bb` | S1 explicitly approved |
| S1 | PASS | commit introducing `evidence/S1/REPORT.md` (see git log) | S2 pending |
| S2 | NOT STARTED | — | pending |
| S3 | NOT STARTED | — | visual signoff required |
| S4 | NOT STARTED | — | visual signoff required |
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
- **STOP: await S2 approval**. Next authorized proposal only: remove artificial markers and derive invisible canonical-path hit regions, keeping shared dispatcher and invariants. S2 has not started; no glow/arrows/STOP implemented.
