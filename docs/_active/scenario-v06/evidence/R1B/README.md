# Evidenze R1B

Baseline esatta `6a976749d5630c0abf858e64795210183a947f5e`.
[Rapporto](../../R1B_TURNOUT_DOMAIN_REPORT.md). Laboratorio Node, nessuna attivazione.

- `baseline-{node,jmri,build}.txt`: ingresso 298 Node/9 JMRI/build.
- `final-{node,jmri,build}.txt`: finale 336 Node/9 JMRI/build.
- `r1b-tests.txt`: 38 test dedicati finali, inclusi avvicinamenti nei due stati compatibili.
- `initial-fixture-failures.txt`, `second-fixture-failure.txt`: errori del nuovo harness, corretti e spiegati nel rapporto.
- `canonical.txt`: rigenerazione legacy, quattro artefatti senza diff.
- `audit.json`: hash dei sorgenti/test finali, ammissione del dataset, registri completi, equivalenza rete legacy, build senza input V06.
- `preservation.json`: 4.148 blob protetti senza differenze.

Riproduzione dalla root del repository (Node 24.19.0, Python 3.12.14,
esbuild 0.25.12, dipendenze già installate, package/lock invariati):

```sh
node --test tests/v06-r1b.test.js
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
python3 scripts/build-canonical-layout.py
git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg
node tools/scenario-v06/audit-r1b.js
python3 tools/scenario-v06/check-r1b-scope.py
git diff --check
```

I verificatori precedenti che confrontano il perimetro R1A con R02 rimangono
storici: R1B autorizza due ulteriori modifiche di sorgente. Usare il checker
R1B per il confronto della presente microfase, senza alterare il checker R1A.
L'audit legge il bundle prodotto da `npm run build` e ricostruisce in memoria
la stessa build per confrontarne i byte e controllare gli input.

Nei log testuali sono rimossi soltanto gli spazi di fine riga per il controllo
Git whitespace; risultati, errori e conteggi restano quelli delle esecuzioni.
