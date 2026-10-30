# Turnouts — ACTIVE SPEC / WAIT FOR 5D

Spec revision: **v3.0**. Branch prepared: `docs/turnouts-handoff-v3` on 2026-10-30. The initial action **S0 has not been run or approved**.

- Active text: `docs/_active/turnouts/SPEC_v3.md`. Read Shared Gates + the one authorized step; do not load unrelated docs.
- Visual companion: local source `SerieN_Scambi_Master_Specifica_v3.pdf` (27 A4 pages; SHA-256 `2face5b2eb8b02419b4da92efbfdb5d25ad0adf1dafac95721d6e46e65a9b89d`). **NOT YET IN THIS BRANCH**. If the user attaches it to Codex, copy exactly to `docs/_active/turnouts/SPEC_v3.pdf` during S0 and verify SHA before using; otherwise note PDF NOT AVAILABLE and rely on complete Markdown requirements, requesting the original if visual approval depends on it.
- Execution gate: **5D completed and published on main at commit `58bbe62bffb37f19125ddb38513502b5ca306821`** (see `docs/PERFORMANCE_AUDIT_5D.md`). Codex must STILL verify its local checkout, baseline tests/build and working tree before S0. If local 5D is missing or uncommitted: BLOCKED.
- NEXT: after merging PR #1, user explicitly authorizes S0 in a new Codex conversation. Do not automatically execute S1.
- Changes to the specification require user approval; annotate deviations in the phase report rather than silently editing the reference.
- After every S: status, evidence, commit SHA, tests, updated `PROGRESS.md`, explicit confirmation request.
- Final S7, after user approval: preserve `docs/turnouts/FINAL_REPORT.md`, retire `SPEC_v3.md`, `SPEC_v3.pdf` (if staged), and this STATUS file. Do not rewrite older phase reports or pretend deletion removes git history.

## S0–S7 status
| S | Status | Commit | User next-phase approval |
|---|---|---|---|
| S0 | NOT STARTED | — | pending |
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
