# AGENTS.md — SerieN Autumn Railways

> Copy this file to the **root of the game repository** (next to package.json / the main entry).
> It assumes the UI package is unpacked at `design/ui-v1/`. If you put it elsewhere, update the paths below.

## Project context

- SerieN Autumn Railways is a browser-based N-scale model-railway game (3D layout + control UI).
- We are replacing the **current prototype UI** with a new UI delivered as a handoff package in `design/ui-v1/`.
- The **3D layout view is out of scope**: do not change the engine/scene except to place its canvas in the new layout.

## Source of truth (read before changing UI code)

1. `design/ui-v1/README.md`
2. `design/ui-v1/spec/ui-spec.json` — components, state model, events, alarm rules, migration map, JS keep/adapt/mock list, acceptance tests.
3. `design/ui-v1/reference/serien-ui-reference.html` — working reference. **If the spec and the reference disagree, the reference wins**; report the mismatch in your PR description.
4. `design/ui-v1/tokens/tokens.json` — design tokens and behaviour constants (thresholds, timings).
5. `design/ui-v1/docs/SerieN-UI-Blueprint.pdf` — human version (section 9 = step plan, section 10 = checklist).

## Hard rules (never break these)

1. **Do not edit, reorder, split, minify-by-hand or "clean up" `design/ui-v1/css/serien-ui.css`.** It is order-dependent. Load `tokens/tokens.css` first, then `css/serien-ui.css`. If a style must change, add a rule in a separate file loaded **after** it and explain why in the PR.
2. **Keep every class name and id** used in the reference DOM (`#st`, `.m`, `.mi`, `.hd`, `.vp`, `.win`, `.side`, `.dk`, `#nx`, `#slip`, `#cam`, `.sw`, `.tr`, `.mush`, `#rst`, `.anl`, dialogs `#dlg #tpD #hlD`, etc.). CSS and behaviour depend on them.
3. **Never hard-code the number of trains (0–8) or switches (N).** Render from game state.
4. **Use the game's switch IDs and descriptions** (current game: WX-A, WX-B, Y-IN, Y-2, Y-3, Y-R1, Y-R2, Y-4). The IDs inside the reference mock are placeholders.
5. **The reference contains a mock simulation.** Port only what `spec/ui-spec.json → referenceJs.KEEP` lists as-is; adapt `ADAPT`; delete and replace `MOCK` with real game data.
6. **Render from game state, not optimistically.** A click emits an event; the UI updates when the game state changes.
7. **Speed has two values:** slider = `speedCmd` (commanded); gauge needle, motion and KPI = `speedActual`.
8. **Reset is a 900 ms hold. STOP ALL latches** until pressed again. Do not simplify these.
9. **Modules (`.m`) never move on hover.** Hover sheen only on interactive controls.
10. **The engine canvas goes inside `.win` as first child** (`position:absolute; inset:0`). Delete `.vph` and `svg.lay3d`. `.win` must not swallow pointer events meant for the 3D view; only `.ov` overlays capture clicks.
11. Do not add new UI features, labels or styles that are not in the package. If something is missing, ask in the PR.
12. Do not modify files inside `design/ui-v1/` (it is the delivered design). Copy what you need into the app source.

## Working method

- One pull request per step of the plan (Blueprint section 9 / `docs/CODEX-PROMPTS.md`). Do not combine steps.
- Each PR description must contain: what changed, which acceptance items were checked, screenshots at 1440×900 (and other sizes when layout is touched), open questions.
- Before writing code in a step, briefly state your plan (files to touch, mapping decisions).
- Prefer small, readable modules: `ui/sfx.js`, `ui/render.js`, `ui/state-adapter.js`, `ui/events.js`, `ui/dialogs.js`, `ui/keyboard.js`, `ui/lighting.js`, `ui/quality.js` (names are suggestions).
- Keep the fonts: Cinzel Decorative 700, Federo, Cutive Mono (SIL OFL). Self-host them under the app's static assets.

## Testing

- Visual check against `design/ui-v1/screenshots/` at 1920×1080, 1440×900, 1280×800, 1024×768, 820×1180, 390×844.
- Test with 0, 1, 3 and 8 trains.
- Run through `spec/ui-spec.json → acceptance` before marking the final step done.
- <!-- Fill in: command to start the game locally, e.g. `npm run dev` -->
- <!-- Fill in: test/lint commands, e.g. `npm test`, `npm run lint` -->
