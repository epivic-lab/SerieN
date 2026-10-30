# SerieN — Codex working rules

Repository: `epivic-lab/SerieN`. These rules are permanent; read this file at the beginning of every new Codex conversation.

## Source of truth and scope
- Work **only in this repository**; never change `first`, `SerieN Control`, Z21 control software, or external projects. SerieN is a browser **simulator**, not a live Z21 controller.
- Read the actual checkout state (`git status`, branch, HEAD), then `PROGRESS.md` and **only the relevant section** of the current `docs/_active/` spec. Inspect actual code before deciding; a remote README or an old conversation is not the source of truth for unpushed work.
- The validated JMRI/RailModeller layout, `src/canonical-layout.json`, network topology, and the existing **150 rail meshes** are locked unless the user explicitly authorizes a separate layout change. Base 150 × 70 cm, 3 concentric visible loops R249/R282/R315, 2 WX310 crossovers, 6 simple turnouts, yard/runaround and 4 sidings. Never alter rails, turnout Kato shapes, track bed/ballast geometry or their locations to accommodate graphic effects.
- Do not enlarge the train control desk, reorganize route geometry, or move scenography without explicit approval.

## Development gates — mandatory
- Execute **ONE authorized microphase per user turn**, even when the whole macrophase is documented. A PDF or long plan is **not** authorization to execute all steps.
- At the end of every microphase: run relevant tests and `npm run build`; verify invariants; capture required visual/performance evidence; update `PROGRESS.md` and the current `STATUS.md`; make **one reviewable atomic commit** with actual SHA; show `git status`; state PASS / FAIL / NOT VERIFIED accurately; and **STOP to ask for explicit user approval** of the next named microphase.
- A user approval covers only the named next microphase. If a gate fails, mark BLOCKED; do not quietly skip tests or continue. Never invent screenshots, benchmarks, test runs, or approval.
- Do not force-push, merge, deploy, modify production configuration, or change other branches without explicit user authorization.
- Before changing code, establish a baseline. Preserve existing performance gains, UI layout, camera, HUD, minimaps, train physics and all eight switches.

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
