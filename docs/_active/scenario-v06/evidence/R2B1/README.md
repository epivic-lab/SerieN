# R2B1 — evidenze riproducibili

[Rapporto e limiti](../../R2B1_TWO_TRAIN_SAFETY_REPORT.md),
[55 righe di matrice](SCENARIO_MATRIX.md), [sintesi](summary.json).
Parent esatto `9aa9656b1f40dec15215d4df366aae2e2e540904`.
Branch `codex/scenario-v06-r2b1-two-train-safety`; Draft con base R2A-F1/#18.

| File | Evidenza |
| --- | --- |
| REGIA_GATE.md | Mandato esclusivo R2B1, commento6859221401 della#18 |
| baseline-node.txt, baseline-build.txt | 412/412 e build della baseline, prima del nuovo codice |
| final-node.txt | 477/477, inclusi65nuovi R2B1, zero fail/skip/cancelled |
| final-jmri.txt, final-build.txt, canonical.txt | 9JMRI,build e canonico PASS; diff dei quattro artefatti vuoto |
| SCENARIO_MATRIX.md,summary.json,numeric-totals.json | Scenari effettivi, quantità, margini, progresso e deadlock |
| traces/*.json.gz | 55tracce, ammissione, comandi, history, pose/ganci, velocità, guard, sette controller e safety, occupazioni/prenotazioni |
| matrix-first.txt,matrix-repeat.txt,determinism.json | Due matrici complete,56file JSON byte-identici; SHA di ogni risultato e digest di ogni tick |
| audit.json | 64coppieWX,16ammesse/48vietate; dataset,Legacy,bundle/input,F1,segreti incluse tracce decompresse |
| preservation.json | Tutti4248blob baseline,4246protetti byte-identici, whitelist completa delle aggiunte |
| commands.json | Comandi principali effettivi ed esiti |
| development/ | Log e note dei problemi di preparazione, distinti dai risultati definitivi |

Le tracce sono gzip senza timestamp; decompresse coincidono esattamente con i
JSON prodotti dal runner. `determinism.json` contiene gli hash dei byte
**decompressi**. UUID di sessione e chiavi delle prenotazioni non vengono esportati.
Il campo `everyTickTraceSha256` copre tutti i60917tick per esecuzione, comprese
le pose non conservate nella campionatura diagnostica. I tempi dei runner Node
non partecipano al confronto deterministico.

Da root repository, Node24/Python3 e dipendenze del lock già installate:

```sh
npm test
python3 -m unittest discover -s tests -p jmri_audit_test.py
npm run build
python3 scripts/build-canonical-layout.py
git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg
node tools/scenario-v06/run-r2b1.js ../work/r2b1-review/first
node tools/scenario-v06/run-r2b1.js ../work/r2b1-review/repeat
node tools/scenario-v06/audit-r2b1.js ../work/r2b1-review/audit.json
python3 tools/scenario-v06/check-r2b1-scope.py
git diff --check
```

Il runner genera solo dati; non lancia browser, server, applicazione o deployment.
Su un errore scrive FAILURE.json con input/eventi/stato prima e dopo, e interrompe
la matrice senza tentare correzioni del core.

Verifica autonoma della riproduzione, dopo i due run sopra:

```sh
python3 - <<'PY'
import gzip,json,hashlib
from pathlib import Path
first=Path('../work/r2b1-review/first')
repeat=Path('../work/r2b1-review/repeat')
evidence=Path('docs/_active/scenario-v06/evidence/R2B1')
manifest=json.loads((evidence/'determinism.json').read_text())
for row in manifest['files']:
    a=(first/row['path']).read_bytes()
    b=(repeat/row['path']).read_bytes()
    published=(evidence/row['path']).read_bytes() if row['path']=='summary.json' else gzip.decompress((evidence/'traces'/(row['path']+'.gz')).read_bytes())
    assert a==b==published,row['path']
    assert hashlib.sha256(a).hexdigest()==row['sha256']
print('PASS: all 56 result files identical')
PY
```

Numeri/criteri: tolleranza posa1e-7mm; errore massimo2,278e-13mm; eccesso salto
massimo2,369e-13mm.702giunti effettivi. Min distanza corpi0,017742612701mm;
min clearance esterna dello sweep **con margine continuo conservativo**
0,012724691204mm. Nessun valore è una tolleranza fisica certificata.
`collisionStops` conta osservazioni di guard per treno/tick, anche a riposo,
non collisioni reali o eventi distinti.

PASS safety e possibilità di progresso sono distinti:15casi indipendenti,
12inseguimenti e ripartenze,8WX N e i casi protetti compatibili progrediscono;
frontale e10WX X restano in deadlock. Nessun dispatcher/priorità inventato.
48coppieWX vietate sono NOT VERIFIED come circolazione con prova topologica,
non collegamenti aggiunti. UNKNOWN ordinario non entra nel clock; il negativo
core, a gate di laboratorio deliberatamente escluso, prova separatamente due
fixture validate e la guard UNKNOWN originale. Non è un ingresso operativo.

runtimeAdmission:false, certificazione fisica/runtime false. Nessun core/app/UI/
asset/dataset/R2A/F1 modificato. Nessun merge/deploy/browser V06 o avvio R2B2.
**STOP: Quality Gate indipendente Regia.**
