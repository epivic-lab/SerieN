# Evidenze R0.1

[Risultato e limiti](../../R01_CONTINUITY_RESOLUTION_REPORT.md). **Gap chiusi; candidato continuo; fedeltà WX aperta; NO-GO R1.**

Riproduzione dalla radice del repository, senza rete, Supabase o avvio del gioco:

```sh
python3 tools/scenario-v06/build-r01.py --output /tmp/r01-track.json
cmp docs/_active/scenario-v06/candidate/R01/track.json /tmp/r01-track.json
python3 tools/scenario-v06/verify-r01.py --candidate /tmp/r01-track.json --output /tmp/r01-verification --mutation-tests
python3 tools/scenario-v06/wx-alternatives-r01.py
python3 tools/scenario-v06/evidence-r01.py
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
```

Generatore e validatore richiedono solo Python stdlib. Il validatore legge gli oracoli congelati R0 e la baseline R01, senza importare il generatore. Il comando delle alternative rigenera il JSON delle ipotesi scartate. Lo script delle figure richiede NumPy/Matplotlib; senza opzioni usa il riferimento SVG già estratto e il ritaglio del master già conservato. Questi ultimi sono derivati di sola evidenza, non asset applicativi.

Per ricreare anche l'estrazione e il raster dal master originale hashato, ottenere il file Drive indicato nel lock e usare:

```sh
inkscape /percorso/master.svg --export-type=png --export-filename=/tmp/r01-master.png --export-width=2200
python3 tools/scenario-v06/evidence-r01.py --master-svg /percorso/master.svg --master-png /tmp/r01-master.png
```

Lo script rifiuta uno SVG dal digest diverso. Per ricontrollare l'estratto degli assi contro l'export originale: `python3 tools/scenario-v06/build-r01.py --raw-alignment /percorso/railway_alignment.json --output /tmp/r01-track.json`; il digest raw è vincolato al lock R0 e tutti i punti vengono confrontati. L'estratto `source-axes.json` conserva ogni `piece`, `centreline_plan_mm` come `points` e `hidden_intervals_mm` dall'originale `railway_alignment.json` del lock; tutti i 615 punti sono confrontati con il download originale nella ricevuta di preservazione. Gli originali non sono risalvati o caricati nell'applicazione.

- `provenance.json`: fonti, revisioni e limiti di integrità; estratto `kato-20-210-excerpt.xtp` normalizzato LF, solo record numerico ASCII.
- `verification.json`, `standalone-checks.txt`: risultati del validatore, 64 WX, 90 semplici, 128 configurazioni e sei mutanti rifiutati.
- `JUNCTIONS.md`, `junction-matrix.csv`: tutti i nodi/estremità e transiti; `wx-64-cases.csv` e `simple-90-cases.csv`: matrici ordinate complete.
- `metrology.json`, `reconstruction-alternatives.json`: trasformazioni gap, misure WX e alternative scartate; curvature sugli interni lisci, non sugli angoli originali.
- `overview-before-after.png`, `gaps-before-after.png`, `wx-before-after.png`: diagnostica prima/dopo in scala.
- `masterplan-board.png`, `masterplan-overlay.png`, `masterplan-rail-reference.json`: confronto con la fonte V06 originale, distinto dalle immagini del simulatore.
- `baseline-{node,jmri,build}.txt`, `final-{node,jmri,build}.txt`: nuove esecuzioni di questa sessione; nessun log R0 riciclato.
- `preservation.json`: confronto con il checkpoint e hash delle fonti; `checks-summary.json`: ricevuta finale e riproducibilità.

Nessuna di queste prove attiva un treno V06. Profilo fisico WX, aghi, mapping GLB, anchor di stop, capienza e sicurezza dinamica restano aperti come documentato.
