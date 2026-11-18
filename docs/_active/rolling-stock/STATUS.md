# Serie N — Rolling Stock L01 (Henschel DHG 500 C)

## Branch checkpoint
Branch: `codex/rolling-stock-l01-henschel` (not main). Baseline `ba26f791e32c7d322da4169bb0b6fe5c4b692a32`.

## Scope
- New Henschel DHG 500 C GLB in `assets/rolling-stock/henschel-dhg-500-c/`, 272,032 bytes, 3,710 triangles, one baked mesh.
- Runtime scale normalization to N 1:160 (61.875 × 19 × 26.6875 mm), nominal couplers and headlight.
- New train type via protected existing spawn path, controls, camera Follow and existing railway safety.
- Catalog, Train Management creation button, project model, Depot identity and side/thumbnail placeholder.
- Generic-only renderer/reset guards, preserving BR 01 behavior.
- Automated unit test and branch-scoped GitHub Actions npm test/build workflow.

## Licencing
Original by accessviolation, licensed CC BY-NC-SA 4.0. Non-commercial distribution only with attribution and share-alike for the model and its adaptations. See asset attribution.

## Deliberate limits
- Source has a **single baked mesh** with no independent wheel geometry or wheel animation.
- SVG thumbnails are **schematic placeholders**, not rendered shots of the GLB.
- Coupler coordinates are nominal and not yet physically calibrated in browser.
- The locomotive must **not** be declared fully verified or released until Node, build and browser railway/visual gates pass.
- No changes to the underlying canonical layout or BR 01 geometry.

## Gate
Implementation checkpoint; initial CI and browser evidence pending. Record PASS/FAIL/NOT VERIFIED after observing actual results.
