# Turnouts — ACTIVE SPEC / S0 PASS / WAIT FOR S1 APPROVAL

Spec revision: **v3.0**. Branch prepared: `docs/turnouts-handoff-v3` on 2026-10-30. **S0 completed: PASS on 2026-10-30. S1 NOT STARTED; explicit approval pending.**

- Active text: `docs/_active/turnouts/SPEC_v3.md`. Read Shared Gates + the one authorized step; do not load unrelated docs.
- Visual companion: `SPEC_v3.pdf`, copied from the supplied `SerieN_Scambi_Master_Specifica_v3.pdf` during S0: 27 A4 pages; SHA-256 `2face5b2eb8b02419b4da92efbfdb5d25ad0adf1dafac95721d6e46e65a9b89d` verified. Temporary active copy, to retire only at approved S7 closure.
- Execution gate: **5D completed and published on main at commit `58bbe62bffb37f19125ddb38513502b5ca306821`** (see `docs/PERFORMANCE_AUDIT_5D.md`). Codex must STILL verify its local checkout, baseline tests/build and working tree before S0. If local 5D is missing or uncommitted: BLOCKED.
- NEXT: await explicit user approval for S1. PR #1 merged as `6487f61`; S0 authorized by the pasted user request. No S1 implementation.
- Changes to the specification require user approval; annotate deviations in the phase report rather than silently editing the reference.
- After every S: status, evidence, commit SHA, tests, updated `PROGRESS.md`, explicit confirmation request.
- Final S7, after user approval: preserve `docs/turnouts/FINAL_REPORT.md`, retire `SPEC_v3.md`, `SPEC_v3.pdf` (if staged), and this STATUS file. Do not rewrite older phase reports or pretend deletion removes git history.

## S0–S7 status
| S | Status | Commit | User next-phase approval |
|---|---|---|---|
| S0 | PASS | commit introducing `evidence/S0/REPORT.md` (see git log) | S1 pending |
| S1 | NOT STARTED | — | pending |
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
- S1 scope if approved: pure router contract + canonical-ID guarded dispatcher, complete simple/WX state/port/reverse/unknown matrix. No effects yet. All later phases remain NOT STARTED.
