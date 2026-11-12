# U9 review package

Final verdict proposal and scope: [../../U9_REPORT.md](../../U9_REPORT.md). Regia approval remains pending. No merge/deploy or workflow modification.

Start with `results.json`, `commands.json`, `control-coverage.json` (66), `screen-coverage.json` (31), `adapter-coverage.json` (A01–A13), `bundle.json` and `release-readiness.json`.

`acceptance-checkpoint/` contains the 111 definitive real-app captures and six final axe scans. `native-checkpoint-recovery/` is the successful final production native RAF scenario. `native-checkpoint/` retains its failed fixture attempt; the M3 exclusivity assertion was preserved and the stale DOM reference corrected. Earlier successful U9 native runs have their own recorded bundle hashes and are not relabelled as final. `header-engraved-plaque/` contains original Claude source provenance/crop, five before/after pairs, computed cascade comparisons and source hashes.

`header-evidence-reuse.json` proves byte-for-byte that the previous header-tested bundle is reconstructed from all final sources by reverting only the last two Dock semantic DOM changes. New/historical/not-rerun distinctions are explicit in `regression-matrix.json` and the deduplicated 59-entry `gate-test-coverage.json`. Source hashes include 266 baseline files and four new acceptance harnesses. No new PASS is inferred from old screenshots.

Optional superseded full-page captures remain locally under `/workspace/work/u9/intermediate-captures`; names and hashes are in `intermediate-capture-retention.json`. Definitive captures, dedicated before/after header evidence and meaningful failure captures are included here. U0–U8 archives are referenced, not duplicated.

## Reproduction

Use repository root, installed project dependencies, Chromium/Python Playwright and a local static server on 8035. Tool versions are in `toolchain.json`. These are local Auth-boundary fixtures; no live provider login or Supabase write is performed.

```bash
npm run build -- --metafile=/workspace/work/u9-review-metafile.json
python3 -m http.server 8035 --bind 127.0.0.1
```

In a separate terminal use fresh output directories, preserving recorded evidence:

```bash
SERIEN_URL=http://127.0.0.1:8035/ U9_OUTPUT=/workspace/work/u9-review-visual U9_AXE=/workspace/work/u9/package/axe.min.js python3 tests/browser-ui-v21-U9.py
SERIEN_URL=http://127.0.0.1:8035/ U9_NATIVE_OUTPUT=/workspace/work/u9-review-native python3 tests/browser-ui-v21-U9-native-checkpoint.py
SERIEN_URL=http://127.0.0.1:8035/ U2_OUTPUT=/workspace/work/u9-review-shell python3 tests/browser-ui-v21-U2.py
```

axe-core 4.11.0 is test-only, acquired with `npm pack`; exact tar/script hashes are in `axe-provenance.json`. It is not vendored into the app or added as a project dependency.

For the header style fixture, read the original HTML from `design/main-ui-redesign` commit `cf2c29a8112b37a53c62cb84fca44061942aea31`, path `docs/design/main-ui-redesign/serien-mainui-v1/reference/serien-ui-reference.html`, into scratch. Pass its path as `U9_HEADER_REFERENCE`, a fresh `U9_HEADER_OUTPUT`, and run `tests/browser-ui-v21-U9-header.py`. No reference JavaScript is run in the app. Header-before capture is a preserved pre-fix record; never rerun it into the recorded output.

`run-command.py` refuses existing log names. Original browser suites remain unchanged; approved adapters under this folder translate consent and write separate outputs. `review-gates.py` checks final package completeness; `verify.py` checks authorized scope/source/frozen assets; neither substitutes for executed browser acceptance.

Raw process logs retain exact output, including terminal blank lines in three failure logs. The final staged whitespace gate checks source/docs/JSON and excludes raw `tests/*.txt`; log bytes are verified by the evidence manifest.
