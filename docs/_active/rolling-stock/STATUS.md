# Serie N — Rolling Stock L01 (Henschel DHG 500 C)

Branch: `codex/rolling-stock-l01-henschel`. Baseline `ba26f791e32c7d322da4169bb0b6fe5c4b692a32`.

## Implemented
- Original 272,032-byte GLB, 3,710 triangles, source/license retained under `assets/rolling-stock/henschel-dhg-500-c/`.
- Runtime scale to N 1:160: length 61.875 mm, width 19 mm, height 26.6875 mm.
- Independent wheel segmentation: six original wheel mesh components identified and detached from baked GLB geometry, rotating in sync with Journey odometer. No change to original texture/material.
- Henschel type added to locomotive rendering, Train Management spawn action, Depot catalog, project/side view and real runtime PNG thumbnails.
- Headlamp support, nominal couplers, train creation via existing protected placement, scene rendering, removal, controls and Follow.
- Existing BR 01 remains the default. No canonical track geometry changes.

## Source licence
accessviolation, Sketchfab; **CC BY-NC-SA 4.0**, noncommercial use only with attribution and share-alike of adaptations. Check `ATTRIBUTION.md` before commercialization.

## Verification
Automated CI branch workflow includes `npm ci`, `npm test`, `npm run build`, JMRI Python audit. The initial CI attempt on first commit failed three legacy assertions expecting a fixed two-model catalog / 16-image manifest; corrected in subsequent commit to reflect Henschel inclusion, preserving BR 01 checks. Check latest workflow run for results.

## L01-FINAL — 18 November 2026

**PASS tecnico locale; consegna per revisione Regia.** Resumed from remote
`236ec10c91056cfe9c10d632d34aad4f9d91e14e`. The final checkpoint is the commit
containing this report; remote publication is verified in the delivery receipt.

The browser timeout was caused by the service worker serving the real auth module
without invoking the Playwright route fixture. Reproduced worker enabled → login
screen/timeout, worker blocked in test context → app ready. Production auth remains
unchanged. Tests now retain real rendering and pause only ordinary physics before
explicit diagnostic steps, instead of relying on a minified callback name.

Corrected wheel rotation sign against actual GLB transforms; regression assertions
check ground-contact motion in both directions. Anchored the headlamp lens to the
raycast hood surface, removing the floating sphere. Replaced the schematic with
transparent runtime PNGs (512×231 side at 8 px/mm, 320×160 thumbnail). Added the
Henschel GLB and images to the existing static cache inventory.

### Verified
- Node **584/584**, JMRI **9/9**, production build **PASS**.
- Chrome V06/Legacy: initial BR 01, catalog, protected Henschel spawn, six wheels
  synchronized to signed odometer, forward/reverse and stationary STOP.
- **4,387.5 mm** sampled travel per scenario over **17 V06 / 15 Legacy edges**,
  curves and rendered poses matching Journey; approaching-turnout operation
  rejected by existing protection (`V06-C13` / `WX-A`).
- Follow, headlights command, real thumbnails, Train Management and 390 px mobile
  without horizontal overflow.
- Coupling to a real detached BR 01 tender used only as a fixture: nominal pitch
  **62.247249657 mm**, **734.6875 mm** hauled with matching rendered poses, then
  uncoupling. Diagnostic placement prepares the fixture; ordinary commands perform
  coupling, motion and uncoupling. This is not a proposed diesel train set.
- Real-time forward/reverse/STOP recording, with numeric samples.
- Original GLB, BR 01, canonical rails/network, railway engine, UI styles,
  authentication and production workflow unchanged. Capture provenance is recorded
  in `assets/rolling-stock/henschel-dhg-500-c/captures.json`.

Evidence and reproduction: [L01-final](evidence/L01-final/README.md).
Live OAuth is outside this local-fixture validation. Couplers remain nominal
simulator anchors, not a certified mechanical coupling model.
Next action: independent Regia review, then a separately authorized release.
No merge/deploy on `main` is performed by this checkpoint.
