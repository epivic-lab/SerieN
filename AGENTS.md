# SerieN — Codex working rules

## Nuovo vincolo PROD — allowlist autenticazione 2026-11-05

Su **Supabase reale SerieN** è già stata applicata la migrazione `20261105155420_serien_verified_email_gate` (registro remoto: `serien_verified_email_gate`), con schema privato `serien_access.allowed_emails` popolato con **esattamente due indirizzi email autorizzati**; gli indirizzi non sono copiati nel repository pubblico. Funzione `public.serien_access_allowed()` (identità JWT validata e email confermata) e policy RLS `AS RESTRICTIVE` per tutte e dieci le tabelle pubbliche ferroviarie. **Non cancellare né ricreare questi oggetti; riconciliare ogni futura migrazione D09/D10 con il DB reale.** Nessun utente Auth o dato ferroviario è stato cancellato.

Il login Google e gate client sono preparati sul ramo separato `feature/approved-users-login`, checkpoint `64652d0e7ee9bbfe770aa6084aae481cde9425af`, **non pubblicati su main**: Google OAuth/redirect e smoke test reali sono ancora da configurare/verificare. GitHub Pages serve file statici pubblici, quindi il gate browser non nasconde il codice del simulatore; la protezione dei dati è RLS. Codex Train Management resta sospeso fino al riallineamento. Nessun nuovo deploy o altra migrazione è autorizzato automaticamente.

## Requisiti permanenti di prodotto — superseding future design constraints (2026-11-05)

**Obbligatorio prima di Train Management/Auth/cloud:** leggere [docs/product/SERIEN_PRODUCT_REQUIREMENTS.md](docs/product/SERIEN_PRODUCT_REQUIREMENTS.md). Requisiti futuri: applicazione dietro social login senza password SerieN, paywall/subscription lato server, persistenza ferroviaria isolata per utente e multiutenza contemporanea; semplicità e robustezza, browser-only, nessun Mac/server persistente/costo obbligatorio. **Codex 6A.12-S1 sospesa per riallineamento**, nessuna implementazione/deploy/DDL implicitamente autorizzata. Questa indicazione aggiornata prevale sui vecchi riferimenti a gate 6A.6 o ownerless definitivo; la storia dei gate resta storica.

Repository: `epivic-lab/SerieN`. These rules are permanent; read this file at the beginning of every new Codex conversation.

## Current turnout documentation status — S7 technical closure

Interactive Turnouts S0–S7, including S6.1, are approved by the Regia in RELEASE R1. `docs/turnouts/FINAL_REPORT.md` is the permanent handoff. The entire `docs/_active/turnouts/` tree remains a non-active historical archive; do not interpret old gates as current authorization. The user explicitly authorizes **only R1** controlled integration from current remote main on `release/turnouts-s7`, normal PR merge after required gates/policies, and the existing GitHub Pages publication with public-site verification. This is a task-specific main/deploy authorization, not a permanent relaxation of the rules below. No Train Management/6A/5E or subsequent phase is authorized. After release STOP for Regia post-release review. See `docs/releases/R1/REPORT.md`.

## Current Train Management gate — 6A.6 integrated isolated laboratory

The commissioning request approves 6A.5 at `ef36596224133f19ceebeb4de889456c78959515` and authorizes only 6A.6 integration on `feature/train-management`. Contract: `docs/_active/train-management/6A6_INTEGRATION.md`; report: `6A_INTEGRATION_GATE.md` in the same directory. Real Supabase remains strictly read-only; no production queries were needed. Approved migrations, synthetic DTO domain and all R1 runtime/assets remain unchanged. Laboratory E2E passes do not close 6A: hosted principal/provisioning/pool isolation and ownerless Auth cutover remain BLOCKED pending independent Regia decision. No 6B, simulator persistence, main/Pages/Supabase deployment. Atomic development-branch checkpoint and remote verification, then STOP for audit.

## Source of truth and scope
- Work **only in this repository**; never change `first`, `SerieN Control`, Z21 control software, or external projects. SerieN is a browser **simulator**, not a live Z21 controller.
- Read the actual checkout state (`git status`, branch, HEAD), then `PROGRESS.md` and **only the relevant section** of the current `docs/_active/` spec. Inspect actual code before deciding; a remote README or an old conversation is not the source of truth for unpushed work.
- The validated JMRI/RailModeller layout, `src/canonical-layout.json`, network topology, and the existing **150 rail meshes** are locked unless the user explicitly authorizes a separate layout change. Base 150 × 70 cm, 3 concentric visible loops R249/R282/R315, 2 WX310 crossovers, 6 simple turnouts, yard/runaround and 4 sidings. Never alter rails, turnout Kato shapes, track bed/ballast geometry or their locations to accommodate graphic effects.
- Do not enlarge the train control desk, reorganize route geometry, or move scenography without explicit approval.

## Development gates — mandatory
- Execute **ONE authorized microphase per user turn**, even when the whole macrophase is documented. A PDF or long plan is **not** authorization to execute all steps.
- At the end of every microphase: run relevant tests and `npm run build`; verify invariants; capture required visual/performance evidence; update `PROGRESS.md` and the current `STATUS.md`; make **one reviewable atomic commit** with actual SHA; show `git status`; state PASS / FAIL / NOT VERIFIED accurately; and **STOP to ask for explicit user approval** of the next named microphase.
- For **every future microphase and macrophase**: tests → atomic local commit → verified remote checkpoint on the dedicated development branch → pause for user approval. For Interactive Turnouts use `feature/turnouts`. Before pushing, verify the destination and fast-forward ancestry; after pushing, verify the actual remote SHA and clean working tree. If remote history diverges or checkpoint fails, stop and report the exact issue. Never publish local main to origin/main automatically; integration into main requires separate explicit user authorization. No automatic merges, force-push, destructive reset, unauthorized rebase or deployment.
- A user approval covers only the named next microphase. If a gate fails, mark BLOCKED; do not quietly skip tests or continue. Never invent screenshots, benchmarks, test runs, or approval.
- Do not force-push, merge, deploy, modify production configuration, or change other branches without explicit user authorization.
- Before changing code, establish a baseline. Preserve existing performance gains, UI layout, camera, HUD, minimaps, train physics and all eight switches.

## Permanent rule — mandatory remote checkpoint

This commissioning directive applies to S6, S7, all later development phases and resumed/new sessions. It supersedes earlier generic local-only or second-push-approval restrictions; historical records remain intact. A later explicit task-specific publication prohibition still takes precedence.

For every authorized macrophase or microphase:
1. Verify the authorized development branch and initial checkpoint.
2. Implement only authorized work; run pertinent tests and checks.
3. Record evidence and update status documentation.
4. Create an atomic, reproducible commit.
5. Automatically perform a normal fast-forward push to the dedicated, already authorized development branch; no second authorization is required for that completed phase's code and evidence.
6. Verify the published remote commit and files; compare local HEAD with remote HEAD.
7. Deliver SHA, diff, tests and evidence to the Regia, then STOP for explicit approval of the next phase.

A verified remote checkpoint is part of DONE. PASS / DELIVERED means code and evidence complete, remote checkpoint verified, pending independent Regia audit; it never implies final approval. FAIL means technical checks failed. BLOCKED means publication or a mandatory check cannot be completed. NOT VERIFIED identifies specific checks not performed. Never declare delivery complete after a failed push.

Before a new branch is used, verify it is authorized for the task. If remote history diverges, STOP and report without rewriting history. Do not publish without an authorized phase ready for delivery. Automatic authorization covers only its development branch: never implicitly merge/push main, deploy, force-push, destructively reset, perform unauthorized rebase, change other repositories or production credentials/configuration, expose secrets, or start another phase. Main operations and deployment require separate explicit authorization.

## Art direction for the current turnout macrophase
- Blue pulsating glow identifies the **actual complete Kato turnout device** and must be refined, conformal, depth-aware and non-occlusive. No bulbs, generic rectangles, floating halos, toy aesthetics or globally expensive bloom.
- Red route arrows follow **real permitted network paths**, including both valid routes for WX310 and correct incoming direction. Low-intensity idle remains visible; red arrow means *selected routing*, **not safety clearance**.
- Safety stop belongs to the simulation engine, independent of the STOP sign and bell. Effects never mutate route state or determine permission.
- No local ballast reshaping or stylization. Any optional global, realistic ballast refinements need a separate proposal and user approval.

## Minimum security NOW, final audit LATER
- Never expose `service_role` / `sb_secret` keys, database passwords, credentials, access tokens or user data in code, client bundles, commits or logs; never request that they be pasted into chat.
- Validate control IDs against the known canonical eight controllers; reject invalid/NaN inputs; do not use `eval`, unsafe HTML insertion, implicit network egress or unnecessary dependencies. Dispose listeners, GPU resources and audio.
- Supabase phase 6A's cloud schema/RLS is out of scope for the turnout macrophase. Do not modify SQL grants, policies, Auth, migrations, API, Edge Functions or production data. No anonymous writes or RLS bypass.
- Phase 5E end-to-end security audit is deferred until after 6E; these baseline safety rules apply immediately.

## Documentation lifecycle / cost control
- Stable instructions live here. `PROGRESS.md` records factual status and one next action. `docs/_active/<macrophase>/` contains **only the current macrophase's working spec**.
- Read the full active spec once at kickoff; later read the applicable microphase plus its shared invariants. Do not repeatedly load the entire PDF; use the text spec for targeted lookup, PDF for illustrations/visual approvals.
- The working PDF/MD are temporary. On approved macrophase closure, write a permanent final report in `docs/turnouts/FINAL_REPORT.md` and remove or clearly invalidate the active copies on the working branch. Historic Git blobs remain in commit history.
- Permanent information must never depend solely on an ephemeral conversation or a deleted working spec.

## Checks and user reporting
- Usual baseline: `npm ci` if needed; `npm test`; `npm run build`. Use project browser tests for interaction, screenshot, touch and performance when available; record unavailable browser checks as NOT VERIFIED.
- Reply in Italian with: microphase; changed files; actual SHA and branch; tests & proof paths; railway and UI invariant results; security checks; risks; and the exact question `Approvi il passaggio alla sottofase [ID]?`.
