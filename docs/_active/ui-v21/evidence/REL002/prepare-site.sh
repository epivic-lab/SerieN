# Clean only the verified temporary destination, including stale docs.
test ! -L _site
test "$(realpath -m _site)" = "$(pwd -P)/_site"
rm -rf -- _site
mkdir -p _site
cp index.html style.css auth-gate.js auth-gate-core.js legacy-v0.1.html .nojekyll _site/
cp -R dist assets ui _site/
# Public dependency closure: docs/_active/ui-v21/REL002_REPORT.md
# Keep linked reports/evidence; exclude unreferenced development archives.
for doc in \
  docs/consolidation/FINAL-REPORT.md \
  docs/consolidation/INTAKE.md \
  docs/consolidation/README.md \
  docs/consolidation/SerieN_Dossier_Tecnico_Codex_REV_A.pdf \
  docs/consolidation/browser-result.json \
  docs/consolidation/consist/consist-check.json \
  docs/consolidation/desktop.png \
  docs/consolidation/index.html \
  docs/consolidation/node-tests.txt \
  docs/consolidation/parser-tests.txt \
  docs/consolidation/smoke-result.json \
  docs/jmri-layout/canonical-graph.json \
  docs/jmri-layout/layout-canonical.svg \
  docs/jmri-layout/minimap-canonical.svg \
  docs/jmri-layout/railmodeller-original.pdf \
  docs/jmri-layout/source.xml \
  docs/phase-0/kato-parts.csv \
  docs/phase-1/README.md \
  docs/phase-1/baseline-ui.json \
  docs/phase-1/browser-result.json \
  docs/phase-1/node-tests.txt \
  docs/phase-1/parser-tests.txt \
  docs/phase-1/railway-preservation.json \
  docs/train-deck/browser-result.json \
; do
  cp --parents "$doc" _site/
done
