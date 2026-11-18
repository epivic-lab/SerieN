# Serie N — Rolling Stock L01 (Henschel DHG 500 C)

Branch: `codex/rolling-stock-l01-henschel`. Baseline `ba26f791e32c7d322da4169bb0b6fe5c4b692a32`.

## Implemented
- Original 272,032-byte GLB, 3,710 triangles, source/license retained under `assets/rolling-stock/henschel-dhg-500-c/`.
- Runtime scale to N 1:160: length 61.875 mm, width 19 mm, height 26.6875 mm.
- Independent wheel segmentation: six original wheel mesh components identified and detached from baked GLB geometry, rotating in sync with Journey odometer. No change to original texture/material.
- Henschel type added to locomotive rendering, Train Management spawn action, Depot catalog, project/side view and thumbnail (schematic SVG).
- Headlamp support, nominal couplers, train creation via existing protected placement, scene rendering, removal, controls and Follow.
- Existing BR 01 remains the default. No canonical track geometry changes.

## Source licence
accessviolation, Sketchfab; **CC BY-NC-SA 4.0**, noncommercial use only with attribution and share-alike of adaptations. Check `ATTRIBUTION.md` before commercialization.

## Verification
Automated CI branch workflow includes `npm ci`, `npm test`, `npm run build`, JMRI Python audit. The initial CI attempt on first commit failed three legacy assertions expecting a fixed two-model catalog / 16-image manifest; corrected in subsequent commit to reflect Henschel inclusion, preserving BR 01 checks. Check latest workflow run for results.

## Remaining independent visual gate
- Real-browser V06/Legacy spawning, traction, reversing, curves, turnout safety and occupancy, Follow, Train Management and mobile layout.
- Actual 3D thumbnail capture should replace the **schematic** SVG placeholder.
- Visual wheel motion/direction and coupler clearance on minimum track radii need browser verification.
- No merge/deploy on `main` without explicit Regia approval.
