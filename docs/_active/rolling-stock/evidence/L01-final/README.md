# Henschel L01-FINAL — 18 November 2026

Baseline `236ec10c91056cfe9c10d632d34aad4f9d91e14e`, branch
`codex/rolling-stock-l01-henschel`. Actual browser renders; no synthesized or
retouched imagery.

- [Browser assertions and travel samples](report.json)
- [Motion video](motion.webm), [numeric samples](motion.json), [poster](motion-poster.png)
- [V06 closeup](v06-closeup.png), [coupling](v06-coupled.png), [Train Management](v06-train-management.png), [mobile](v06-mobile.png)
- [Legacy closeup](legacy-closeup.png), [coupling](legacy-coupled.png), [mobile](legacy-mobile.png)
- [Node tests](node-tests.txt), [JMRI](jmri-tests.txt), [build](build.txt)

The video records real-time simulation from a diagnostic straight-track starting
position, using the ordinary throttle/reverse/STOP controls. The browser test
instead pauses ordinary physics and uses explicit steps while retaining rendering.
The tender is an existing test vehicle, not a proposed train set.

## Reproduce

With Node 22, Python Playwright and Chromium, from the repository root:

```sh
npm ci
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
cp dist/service-worker.js service-worker.js
python3 -m http.server 8000 --bind 127.0.0.1
```

In another terminal:

```sh
python3 tests/browser-henschel-l01.py
python3 scripts/record-henschel.py
node_modules/.bin/esbuild scripts/capture-henschel.js --bundle --format=esm --outfile=dist/capture-henschel.js
python3 scripts/capture-henschel.py
```

`CHROMIUM_PATH` optionally selects local Chrome; `SERIEN_URL` selects the local
server. This Mac used Chrome with Node 22.14.0. Captures update only Henschel PNGs
and its side-manifest entry. Browser output goes to `work/henschel-l01`; transient
work/worker files are not committed. No live login or production data is used.
