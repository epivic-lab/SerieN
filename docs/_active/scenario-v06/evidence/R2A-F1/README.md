# R2A-F1 — evidenze numeriche

Parent esatto `7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003`.
Branch `codex/scenario-v06-r2a-f1-shared-junction-interlocking`.
[Rapporto e limiti](../../R2A_F1_SHARED_JUNCTION_REPORT.md).

| File | Contenuto |
| --- | --- |
| REGIA_R2A_GATE.md | Gate #17, commento6858353142, rischio inizialmente inferito |
| baseline-node.txt, baseline-build.txt | 395 Node/build PASS prima delle modifiche |
| red-tests.txt | Tre negativi realmente rossi prima del fix |
| before/adjacent-diagnostic.json | Dati baseline, ogni tick795–900, primo intervento/stop e18 richieste in sessioni isolate |
| after/adjacent-diagnostic.json | Stesso esperimento dopo il fix, stessi campi/tick/richieste |
| before-summary.json, after-summary.json | Sintesi leggibili delle due prove |
| green-initial.txt | I medesimi tre negativi verdi dopo il fix |
| focused-tests.txt | 17 test F1 PASS |
| shared-matrix.json, matrix-summary.json | 112 casi noti e56 UNKNOWN, tutte le unità adiacenti V06/Legacy, entrambi i lati e assi, una/due vetture |
| r2a-regression.json | Sei giri+due composizioni e dinamica confrontati esattamente con le sintesi R2A; stop aggiornati e protezioni |
| first-full-regression.txt | 411/412: contratto storico incontri=5C da adeguare; nessun altro fallimento |
| route-contract-tests.txt | PASS del contratto adeguato; fixture5C conservato |
| final-node.txt, final-jmri.txt, final-build.txt | 412 Node,9 JMRI e build PASS sul candidato |
| canonical.txt | Rigenerazione originale; confronto Git dei quattro artefatti senza differenze, exit0 |
| audit.json | 58.624 preview contro baseline, rete Legacy/dataset/ranges, bundle e85 input |
| baseline-reproduction.json, red-reproduced.txt | Diagnostico baseline byte-identico e tre negativi rossi usando i due moduli estratti dal parent |
| determinism.json | Hash e confronto esatto della seconda esecuzione dopo il fix e della matrice |
| preservation.json | Tutti i blob baseline e tutte le aggiunte, nessun percorso inatteso |
| commands.json | Comandi principali e relativi esiti |
| development/ | Failure di preparazione fixture e aspettativa stato audit, risolti senza modificare dataset o geometrie |

Riproduzione da root, Node24, Python3 e dipendenze del lock già installate:

```sh
node --test tests/v06-r2a-f1.test.js
node tools/scenario-v06/shared-junction-lab.js ../work/r2a-f1-review/after
node tools/scenario-v06/shared-junction-validation.js ../work/r2a-f1-review --r2a-regression
npm test
python3 -m unittest discover -s tests -p jmri_audit_test.py
npm run build
python3 scripts/build-canonical-layout.py
git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg
node tools/scenario-v06/audit-r2a-f1.js ../work/r2a-f1-review/audit --reproduce-baseline
python3 tools/scenario-v06/check-r2a-f1-scope.py
git diff --check
```

`audit-r2a-f1.js --reproduce-baseline` usa `git show` dei soli due moduli core
dal parent, ricostruisce bundle/browser e diagnostico/test Node tramite esbuild
già presente e mantiene gli URL sorgente per leggere gli stessi dataset/oracoli
immutati. Non cambia sorgenti, branch o working tree. Verifica che il bundle
parent abbia l'hash approvato, il diagnostico coincida coi dati prima del fix,
e il runner dei tre negativi termini con exit1 e tre fallimenti attesi.
L'audit complessivo termina con exit0 solo se tali verifiche passano.
Gli artefatti eseguibili intermedi restano nella cartella scratch indicata.

Per confrontare le evidenze deterministiche:

```sh
cmp docs/_active/scenario-v06/evidence/R2A-F1/after/adjacent-diagnostic.json ../work/r2a-f1-review/after/adjacent-diagnostic.json
cmp docs/_active/scenario-v06/evidence/R2A-F1/shared-matrix.json ../work/r2a-f1-review/shared-matrix.json
```

Nei log dei fallimenti sono rimossi soltanto gli spazi a fine riga emessi dal
runner Node, per consentire `git diff --check`; contenuti ed esiti conservati.

Nessun seed casuale. Clock, stati e rotabili espliciti. UUID privati della
sessione esclusi dai dati; durate dei runner/log non sono confronti temporali
deterministici. I comandi panel/device delle sonde prima/dopo sono realmente
isolati; la matrice prova anche richieste consecutive rifiutate su entrambe
le superfici. Il margine operativo30 mm non cambia.

Nessuna attivazione browser V06; runtimeAdmission:false. Nessun merge/deploy,
R2B, simultaneità o certificazione fisica. STOP per Quality Gate Regia.
