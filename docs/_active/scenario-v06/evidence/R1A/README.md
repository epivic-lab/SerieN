# Evidenze R1A

Baseline `7118c99a9367da61f0042dfe40240fe78dc0d7c6`. Solo dataset isolato;
`runtime_circulation_verified:false`. [Rapporto](../../R1A_OPERATIONAL_DATASET_REPORT.md).

- `oracle.json`: copia congelata delle matrici/testimoni R0/R02, non generata dal builder R1A.
- `mapping.csv`: 79 righe di mapping sorgente→runtime, inclusi porte e hidden raw/bounded.
- `validation.json`: ammissione indipendente, checksum e conteggi.
- `baseline-{node,jmri,build}.txt`: baseline 254/9/build.
- `final-{node,jmri,build}.txt`: suite finale 298/9/build.
- `v06-tests.txt`: 44 test dedicati, 34 mutanti semantici e digest negativo inclusi.
- `initial-v06-failure.txt`: errore iniziale del nuovo harness sull'ingresso condiviso C12/C13; risolto verificando tutte le alternative.
- `legacy-network-equivalence.json`: confronto JSON integrale delle factory vecchia/nuova sul default legacy.
- `bundle.json`: hash/taglia finale e assenza V06 dal grafo di build.
- `preservation.json`: confronto Git di ogni file preesistente con la baseline.

Riproduzione da root, senza avviare l'app:

```sh
python3 tools/scenario-v06/build-r1a.py --output /tmp/v06-r1a-reproduced.json
cmp src/datasets/v06-r1a.json /tmp/v06-r1a-reproduced.json
node tools/scenario-v06/validate-r1a.js
node --test tests/v06-r1a.test.js
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
python3 tools/scenario-v06/check-r1a-scope.py
git diff --check
```

Node 24.19.0, npm 11.9.0, Python 3.12.14; dipendenze preinstallate invariate.
La validazione non importa il builder e blocca il digest dell'artefatto. La
funzione semantica separata consente di verificare i mutanti oltre il checksum.
I test importano il router e la guardia originali, non una loro sostituzione.
