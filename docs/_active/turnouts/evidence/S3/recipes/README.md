# Riproduzione S3

Dalla radice del repository, con dipendenze già installate:

```sh
npm test
npm run build
python3 -m unittest discover -s tests -p '*_test.py'
node docs/_active/turnouts/evidence/S3/recipes/build-profile.mjs . /tmp/s3-profile.js
node docs/_active/turnouts/evidence/S3/recipes/build-observer.mjs . /tmp/s3-observer.js
```

I due builder riprendono il profiler 5D e l'osservatore geometrico S0; aggiungono solo riferimenti temporanei ai componenti S2/S3. I bundle NON vanno copiati in dist, pubblicati o committati. `check-invariants.py` è la ricetta della verifica sorgenti usata in questa esecuzione, con checkout di lavoro `/workspace/SerieN` e baseline S2 espliciti.

Servire la build locale via HTTP. Le suite supportano `SERIEN_URL`, `S3_BUNDLE`, `S3_OUTPUT`; la suite contrattuale preesistente usa `S1_BUNDLE` e `S1_OUTPUT`, quella S2 `S2_BUNDLE` e `S2_OUTPUT`. Usare sempre directory di output temporanee: le suite storiche scrivono rispetto a cwd.

Per le immagini: `tests/capture-turnout-glow.py`, con `S3_BASELINE_BUNDLE` costruito dalle fonti S2 `6bdec29194d4e232eeab0e1ff5a8d4e6b26ec47b` usando il profiler standard. Impostare anche `S3_BUNDLE` e `S3_OUTPUT`.

Per i tempi: `tests/browser-turnout-glow-performance.py`, con `S3_5D_BUNDLE`, `S3_BUNDLE`, `S3_PERF_OUTPUT`. Ricostruire 5D da un **archivio** del commit `58bbe62bffb37f19125ddb38513502b5ca306821`, senza checkout/reset/rebase. Il bundle minificato di quell'archivio deve avere SHA-256 `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`; il suo profiler si ottiene con `scripts/performance/build-profile.mjs`. Un solo browser alla volta, nessun test CPU concorrente. I quattro casi sono 5D, S3 spento, S3 A, S3 B; 16 intervalli RAF dopo 3 di riscaldamento, SwiftShader. È un campione limitato, non la matrice completa 5D né una misura di FPS hardware.

`commands.json` registra bundle effettivi, hash e comandi dell'acquisizione. `visual/capture.json` registra camera, luce, fase e parametri per ogni immagine originale.
