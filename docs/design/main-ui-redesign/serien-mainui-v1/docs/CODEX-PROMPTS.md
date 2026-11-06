# Prompts for Codex — one per step

Paste one prompt per task, in order. Open a new task only after the previous PR is reviewed and merged.
All prompts assume the package is at `design/ui-v1/` and `AGENTS.md` is at the repository root.

---

## Step 0 — Understand (no code)

```
Read AGENTS.md, design/ui-v1/README.md and design/ui-v1/spec/ui-spec.json.
Then inspect the current UI code of the game (header, side panel, train dock, next-switch card, camera bar, switches, environment, missions).

Do NOT write code. Reply with:
1. The list of files that make up the current UI and what each does.
2. Where the game state lives (trains, switches, time of day, missions, simulation pause/stop) and how the current UI reads it and sends commands.
3. A proposed mapping from the game state to spec stateModel (field by field), including the real switch IDs and descriptions.
4. For each row of spec migration.map: the current file/function to remove or change.
5. Anything that is missing in the game to support the new UI (e.g. speedActual, run KPI, predicted route, alarms, track geometry for the map).
6. Open questions.
```

## Step 1 — Assets

```
Step 1 of the UI migration (see AGENTS.md).
Copy design/ui-v1/tokens/tokens.css, design/ui-v1/css/serien-ui.css, design/ui-v1/assets/** into the app's static assets keeping the relative paths (css/ must reach ../assets/textures/).
Self-host the fonts Cinzel Decorative 700, Federo and Cutive Mono and load them from tokens.css instead of Google Fonts (keep the same family names).
Do NOT modify serien-ui.css. Do not change any UI markup yet.
Acceptance: the app builds; all assets load with no 404; fonts load.
```

## Step 2 — Shell markup

```
Step 2 of the UI migration (see AGENTS.md).
Replace the old UI DOM with the new shell copied from design/ui-v1/reference/serien-ui-reference.html: from <main id="st" class="st" data-tab="treni"> to the end of the three dialogs (#dlg, #tpD, #hlD), plus the SVG sprite at the top of <body> (design/ui-v1/assets/svg/serien-sprite.svg, fix the #spun image path).
Put the 3D engine canvas inside .win as its first child (position:absolute; inset:0). Delete .vph and svg.lay3d.
Remove the old header, Bell button, next-switch card, camera bar, switches grid, environment, rolling-stock select, missions, trains tab bar, train cards with mini-maps.
Keep all class names and ids. Static content only in this step (no wiring): leave train/switch lists empty.
Acceptance: at 1440x900 the layout matches design/ui-v1/screenshots/14-empty-state.jpg (header, panels, empty dock) with the live 3D view visible inside the frame and still interactive (orbit/zoom with the mouse on the 3D view).
```

## Step 3 — Port KEEP modules

```
Step 3 of the UI migration (see AGENTS.md).
From the <script> of design/ui-v1/reference/serien-ui-reference.html, port the functions listed in spec referenceJs.KEEP into separate modules (e.g. ui/sfx.js, ui/dialogs.js, ui/keyboard.js, ui/quality.js, ui/lighting.js, ui/controls.js). Port them as-is; only change what is needed to make them modules.
Do not port anything from MOCK. Stub ADAPT functions for now.
Wire: Menu / Track plan / Help dialogs (open, close, Esc, backdrop, focus return), Sound toggle (header + menu, localStorage sn-snd), Graphics quality (menu, .q-low, localStorage sn-q, auto rule), camera bar expand/collapse (8 s), Next-switch HUD expand/collapse, hold-to-reset visual (900 ms), STOP ALL latch visual, Environment slider -> --n/--k lighting + phase labels.
Acceptance: all these work without game data; night slider gives the hidden-bulb look of screenshots/03-desktop-night.jpg; Low quality matches 16-low-quality.jpg.
```

## Step 4 — State adapter and rendering

```
Step 4 of the UI migration (see AGENTS.md).
Create ui/state-adapter.js with toUiState(game) returning the shape of spec stateModel (agreed in step 0). Add what is missing in the game (speedActual with inertia 24 %/s up, 60 %/s down, 240 %/s emergency; run KPI time/distance reset on 0 -> moving and frozen when stopped/paused/E-stop; track geometry polylines for the map).
Implement the ADAPT functions from the reference (mk, upd/all, sets, pick, routeUpd, msUpd, place, tpUpd) so that they render from the UI state: train cards (gauge by kind, silhouette #l1/#l2/#l3, colour tokens color.train.list), switch tiles generated from the game switch registry with real IDs, map (track, switch dots, train markers, predicted route, key with KPI), missions, counters, empty states.
Re-render on game state changes (or every frame for positions, throttled to 30 fps in Low quality).
Acceptance: 0, 1, 3 and 8 trains render correctly (compare screenshots 14 and 15); selection is shown on card, marker and key row; no hard-coded counts or IDs.
```

## Step 5 — Events

```
Step 5 of the UI migration (see AGENTS.md).
Emit the UI events of spec events.uiToGame (CustomEvent 'serien:ui' or the game's own bus) from every control: switch tiles, HUD Straight/Diverging, Track plan labels, throttle, Reverse, Stop, Lights, Couple, Uncouple, card/marker/key selection, + Train, Pause/Resume, Reset (after the 900 ms hold), STOP ALL latch/release, time of day, camera actions and views, Next mission, quality, sound, Exit to title.
Handle them in the game. The UI must update only from the resulting game state (no optimistic toggling).
Keyboard: Space, 1–8, Arrow Up/Down, R, S, L, M, Esc as in spec keyboard.
Acceptance: every row of spec migration.map works end to end; switching from tile, HUD or Track plan updates all three and the map dot.
```

## Step 6 — Alarms

```
Step 6 of the UI migration (see AGENTS.md).
Implement spec alarmRules in the game layer (preferred) — or port scanAhead/scan from the reference — producing state.alarms. Include the automatic emergency hold at 90 mm (collision) and before a trailing switch set against the train.
Render with the annunciator lamps (blinking until acknowledged), alarm slip with actions (Set, Stop, Reverse, Show, Ack, Release), card ring and pill, marker colour, and the alarm/warning sounds.
Acceptance: each rule reproduces screenshots/04-alarm-collision.jpg style; Ack stops blinking; alarm disappears when its condition clears; STOP ALL shows the E-stop state of 05-emergency-stop.jpg.
```

## Step 7 — Responsive, quality, accessibility

```
Step 7 of the UI migration (see AGENTS.md).
Test and fix integration issues at 1920x1080, 1440x900, 1280x800, 1024x768, 820x1180 (portrait) and 390x844 (phone bottom navigation) against design/ui-v1/screenshots. Fix only integration issues; if the design itself seems wrong, do not change serien-ui.css — describe it in the PR.
Check Low/High/Auto quality, prefers-reduced-motion, keyboard focus ring, 44 px touch targets on touch devices.
Acceptance: nothing clipped at any size; side column fits; phone tabs work.
```

## Step 8 — Clean-up and acceptance

```
Step 8 of the UI migration (see AGENTS.md).
Delete all remaining mock code, the old UI code and CSS that are no longer used, and any placeholder. Set VERSION from the build and EDITION = {name:'Autumn Railways', emblem:'maple'}.
Run every item of spec acceptance and report the result item by item in the PR description, with screenshots.
```
