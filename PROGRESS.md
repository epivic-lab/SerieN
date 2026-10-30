# SerieN — Development handoff / project progress

Last documentation sync: 2026-10-30. **This is a handoff, not a claim that phase 5D has passed.** Codex must refresh every state from the local checkout before any work.

## Verified from remote GitHub at handoff
- Remote repository `epivic-lab/SerieN`, `main` commit at inspection: `f582b1226ccf8a592970b0304d0010e1cc43aa57` ("commit finale", 2026-10-29 UTC). This commit message does **not** establish what happened in the Codex local 5D workspace.
- `AGENTS.md` and `PROGRESS.md` did not exist on main before this documentation change.
- Browser simulator scale N, three rings, two WX310, eight controller IDs, no live Z21 integration; canonical geometry must be validated from checkout.
- Cloud Supabase project SerieN: 6A initial schema/security work was reported applied separately (10 tables, RLS and restricted public access); **the GitHub repository schema/history has not been reconciled or verified**. Do not infer that 6A application work is complete.

## Development schedule
1. Finish and verify phase **5D** (performance), with documented tests and commit. State here: **NOT VERIFIED / MAY BE IN PROGRESS IN OTHER CODEX WORKSPACE**.
2. Execute **Interactive Turnouts S0–S7**, one approved microphase at a time. Current: **S0 NOT STARTED; gated on 5D**.
3. Complete **6A.3–6A.6**, with schema/migration reconciliation, backend transactions, persistence and protected testing; no unauthorized browser writes.
4. Implement **6B** asset normalization/catalogue; **6C** Train Composer; **6D** 3D Loco Depot; **6E** integration.
5. Run **5E final architecture + cybersecurity audit** before any public backend write exposure.

## Current working spec
- `docs/_active/turnouts/SPEC_v3.md` is the active **text specification**.
- `docs/_active/turnouts/STATUS.md` identifies the phase state.
- Illustrated PDF `SerieN_Scambi_Master_Specifica_v3.pdf` is supplied separately to the Codex S0 session; if accessible, S0 stores it temporarily as `docs/_active/turnouts/SPEC_v3.pdf`, verifies its checksum, and removes it in S7. Do not fabricate its presence.

## Next approved action / gate
**NOTHING authorized beyond readiness/documentation at present.** After 5D is demonstrably closed, user may explicitly authorize **S0** using the companion prompt. If 5D remains open, report BLOCKED and stop.

## Microphase ledger (fill only after actual execution)
| Phase | State | Commit | Evidence | User approval to proceed |
|---|---|---|---|---|
| 5D | NOT VERIFIED | — | local checkout required | — |
| S0 | NOT STARTED | — | — | — |
| S1 | NOT STARTED | — | — | — |
| S2 | NOT STARTED | — | — | — |
| S3 | NOT STARTED | — | — | visual approval mandatory |
| S4 | NOT STARTED | — | — | visual approval mandatory |
| S5 | NOT STARTED | — | — | — |
| S6 | NOT STARTED | — | — | — |
| S7 | NOT STARTED | — | — | final signoff |

Do not change a state to PASS based on an assertion without recorded evidence. Never pre-populate SHA placeholders with invented values.

## Last approved technical invariants
- Canonical trackage / all 150 rail meshes unchanged; same rail bed, turnout shapes and physical proportions.
- Three train consoles keep existing overall desk height; no new controls in this macrophase.
- Visual effect state separate from simulation route/safety state.
- No Supabase API, schema, grant, policy or credential changes in S0–S7.
