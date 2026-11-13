# R2B2 — evidenze riproducibili

Baseline esatta `ab9c9bacdba652209b2ffc14b7c70856645601ba` (PR #19).
Unica microfase R2B2, laboratorio Node; nessun browser V06.

- `REGIA_GATE.md`: autorizzazione e vincoli del commento 6860875610.
- `baseline-node.txt`, `baseline-build.txt`: baseline prima delle modifiche.
- `summary.json`, `SCENARIO_MATRIX.md`, `numeric-totals.json`: matrice e numeri.
- `traces/*.json.gz`: iniziale, campioni, giunti, comandi, arresti, finale e digest
  cumulativo del JSON di ogni tick, inclusi i tick non campionati.
- `determinism.json`: due esecuzioni complete, confronto byte per byte dei JSON.
- `r2b1-compatibility.json`: 55 risultati originali byte-identici dopo rimozione
  del solo nuovo campo `pairChecks`; identici tutti i digest dei tick R2B1.
- `final-node.txt`, `final-jmri.txt`, `final-build.txt`, `canonical.txt`: gate.
- `audit.json`, `preservation.json`: bundle/input/topologia/segreti e tutti i blob.
- `development/`: errori di preparazione del nuovo harness, diagnosi e correzioni.

Dalla radice repository, con le dipendenze del lock già presenti:

```sh
npm test
python3 -m unittest discover -s tests -p jmri_audit_test.py
npm run build
python3 scripts/build-canonical-layout.py
git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg
node tools/scenario-v06/run-r2b2.js /workspace/work/r2b2-reproduce
node tools/scenario-v06/audit-r2b2.js /workspace/work/r2b2-audit.json
python3 tools/scenario-v06/check-r2b2-scope.py
```

Il secondo argomento opzionale del runner filtra l'ID (per esempio
`S3-WX-B-queued-three` o `S2-012-moving-0`). Un errore interrompe subito la matrice
e scrive `FAILURE.json` con ID, stack, iniziale, precedente/corrente e input.
In caso di penetrazione o difetto sostanziale del core, STOP: nessun fix del motore.

Le tracce non contengono UUID di sessione né chiavi casuali di prenotazione.
Tutti e tre i Journey restano nella stessa rete/sessione; un solo clock e una
sola `stepRailway` originale per tick. I due inviluppi di ciascuna delle tre
coppie vengono ricostruiti per ogni veicolo dal testimone indipendente R2B1.
Il campo `pairChecks` deve essere `{0:1:ticks,0:2:ticks,1:2:ticks}`.

Tempi di esecuzione nei log non deterministici. Nessuna certificazione fisica,
visuale, di equità generale o di assenza di starvation. `runtimeAdmission:false`.
