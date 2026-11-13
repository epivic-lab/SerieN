# R2A — evidenze numeriche, solo Node

Base `b49320c6be4d9f149bb2c5473858c616925a5f6c`.
Branch `codex/scenario-v06-r2a-dynamic-circulation`.
[Rapporto e limiti](../../R2A_DYNAMIC_LOOP_REPORT.md).

| File | Contenuto |
| --- | --- |
| `REGIA_R1C_GATE.md` | Decisione R1C e mandato R2A letti dalla PR #16 |
| `baseline-node.txt`, `baseline-jmri.txt`, `baseline-build.txt` | Baseline:371 Node/9 JMRI/build PASS prima del nuovo codice |
| `r2a-tests.txt` | 24 test R2A PASS |
| `summary.json` | Sei giri,composizioni,velocità,distanze,stop e lock dinamici |
| `trajectories.json` | Snapshot iniziale/1s/giunti,history,centri/ganci,stati e guard; asserzioni ogni tick |
| `adjacent-stop-diagnostic.json` | Caso ADJ-01 prima della recovery:preview/guard/tick 889,occupazione,topologia e rifiuto |
| `initial-fixture-failures.txt` | Tre prime aspettative fallite:tail/ingombro e C13 unlocked; analisi nel rapporto |
| `first-regression-dependency-path.txt` | Primo run completo con dipendenze spostate:import relativo Three.js non trovato; nessuna modifica ai test |
| `final-node.txt`, `final-jmri.txt`, `final-build.txt` | 395 Node/9 JMRI/build PASS sul codice finale |
| `canonical.txt` | Rigenerazione originale e confronto Git quattro artefatti senza diff |
| `audit.json` | Hash bundle/rete legacy/dataset e85 input,zero V06/laboratorio |
| `preservation.json` | 4186 blob protetti R1C identici e nuovo scope consentito |

Riproduzione da root con Node24 e dipendenze del lock (installazione standard
`npm ci` se mancanti):

```sh
node --test tests/v06-r2a.test.js
node tools/scenario-v06/run-r2a.js work/r2a-evidence
node tools/scenario-v06/run-r2a.js --adjacent-stop
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
python3 scripts/build-canonical-layout.py
git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg
node tools/scenario-v06/audit-r2a.js
python3 tools/scenario-v06/check-r2a-scope.py
git diff --check
```

`run-r2a.js` scrive solo nell'output esplicito (default work/r2a-evidence),
non modifica dataset o codice. --adjacent-stop stampa il caso minimo.
Nessun seed casuale; clock 1/60 e stati/dimensioni espliciti. Le durate dei test
e gli UUID privati di sessione possono cambiare; le evidenze di movimento
escludono tali UUID e sono riproducibili byte per byte.

ADJ-01 resta limite APERTO della previsione/protezione operativa adiacente,
con giunto e comando sicuri: nessuna certificazione di recovery automatica,
nessuna correzione al core in questo mandato. Nessun browser V06, traffico
simultaneo,terminale N16, manovra N07,scalo,quarto treno o coupling dinamico.
I PASS numerici non certificano geometria manifatturiera né sagome fisiche.
