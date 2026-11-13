# R0.2 — prove riproducibili

Baseline `65ec1675510700fef503c16af2cfbe725817568a`. Originali non modificati e non ripubblicati integralmente. [Rapporto](../../R02_WX_GEOMETRY_VALIDATION_REPORT.md), [lock fonti e limiti di acquisizione](source-facts.json).

- [metrology.json](metrology.json): soluzione analitica, controlli G0/G1/raggio, metrologia del record XTP, confronti dei quattro nuclei, intersezioni, corridoi, sagome preliminari, tre mutanti nuovi.
- [r01-regression.json](r01-regression.json): esecuzione del checker congelato richiamata dal nuovo validatore.
- [regression/verification.json](regression/verification.json): nuova esecuzione CLI originale, comprese sei mutazioni negative; CSV delle 97 coppie incidenti, 64 casi WX e 90 casi semplici nella stessa cartella. La sua dicitura fisica aperta resta storica e corretta: non è certificazione del produttore.
- [visual-metadata.json](visual-metadata.json): estratto hashato da inventory/alignment/manifest; dati GLB dichiarati distinti dai buffer non letti.
- [checks-summary.json](checks-summary.json): esiti/log, bundle e verifica di preservazione/scope.
- `baseline-{node,jmri,build}.txt`, `final-{node,jmri,build}.txt`: nuove esecuzioni, non copia dei risultati R01.
- `wx-validation.png`, `cad-comparison.png`, `masterplan-overlay.png`: figure statiche offline nuove, ispezionate; nessuno screenshot del runtime V06.

Ambiente Node24.19.0, Python3.12.14; NumPy/Matplotlib preesistenti solo per misure e figure. Nessuna dipendenza applicativa introdotta. Le fonti Drive vengono acquisite con il connettore autenticato e materializzate in una directory di lavoro esterna al repository. Non conservare URL firmati, credenziali o i grandi binari nelle evidenze.

Da root repository, usando gli originali esatti identificati dal lock:

```sh
python3 tools/scenario-v06/consolidate-r02.py
python3 tools/scenario-v06/validate-r02.py \
  --xtp /percorso/fonti/kato.xtp \
  --master-svg /percorso/fonti/master.svg \
  --alignment /percorso/fonti/railway_alignment.json \
  --inventory /percorso/fonti/object_inventory.json \
  --manifest /percorso/fonti/scene_manifest.json
python3 tools/scenario-v06/verify-r01.py \
  --candidate docs/_active/scenario-v06/candidate/R02/track.json \
  --output docs/_active/scenario-v06/evidence/R02/regression --mutation-tests
python3 tools/scenario-v06/consolidate-r02.py --output /tmp/serien-r02-rebuilt.json
cmp docs/_active/scenario-v06/candidate/R02/track.json /tmp/serien-r02-rebuilt.json
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
```

Scaricare la libreria `kato.xtp` dal [commit pin](https://raw.githubusercontent.com/ankon/xtrkcad/236f93e4a0b35429dfae2d292ef4407b462f1f01/app/lib/params/N-Kato%20Track%20and%20Structures.xtp). Il validatore richiede digest esatti e confronto del record con l'estratto storico; non accetta silenziosamente un catalogo mobile.

Le figure scientifiche possono dipendere dal raster/font dell'ambiente; assert e valori geometrici usano coordinate e formule, non i pixel. Il ritaglio masterplan-board R01 viene riusato come sfondo, mentre l'XML originale viene riletto e verificato per le misure.

I test controllano geometria e regole offline; non verificano circolazione nel motore, cinematica delle lame, contatto fisico ruota-rotaia o compatibilità prestazionale V06. La comparazione TRAX completa non è attestata. I file originali e tutti i test applicativi/safety rimangono intatti.
