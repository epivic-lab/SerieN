# Evidenze e riproduzione

Queste prove riguardano il branch hotfix, non un deployment pubblico. Leggere [il rapporto](../../VISUAL_PARITY_REPORT.md) e [la galleria](GALLERY.md). `evidence-manifest.json` contiene dimensioni e SHA256 delle prove; `invariants-and-package.json` separa sorgenti immutati, codice modificato e artefatto.

Le catture reference usano il vero HTML `cf2c29a`, UI High, font locali già approvati. La baseline è `d77b8aa`. La scena nel runtime è reale; il bootstrap Auth è soltanto locale e dichiarato. Nelle catture/observer il RAF di rendering è on-demand, mentre la prova `native-final` usa il bundle reale e il RAF originale senza sostituzione. Nessuna prova OAuth è attribuita a questi harness.

Le ricette conservano i percorsi del collaudo `/workspace/SerieN` e `/workspace/work/visual-parity`. Si eseguono dal repository. Playwright, Chromium, Pillow ed esbuild erano già disponibili nell'ambiente; nessuna nuova dipendenza applicativa. Per altri checkout adattare soltanto i percorsi di laboratorio e conservarne la provenienza.

1. Creare in `work/visual-parity/` le directory `baseline`, `reference`, `evidence`, `tools`; copiare le ricette in `tools`.
2. Materializzare `baseline` con `git archive d77b8aa` per `index.html style.css app.js src assets ui auth-gate.js auth-gate-core.js docs/jmri-layout docs/consolidation docs/phase-1 docs/train-deck`; estrarre solo nella directory di laboratorio, senza checkout/reset del lavoro corrente. Compilare `baseline/app.js` con esbuild e le dipendenze bloccate del repository (`nodePaths` nell'API esbuild), creando `baseline/dist/game.js`; l'hash atteso è nel manifest RC storico e in `capture-provenance.json`.
3. Estrarre `git show cf2c29a:docs/design/main-ui-redesign/serien-mainui-v1/reference/serien-ui-reference.html` in `reference/index.html`, senza modificarlo. Compilare il candidato con `npm run build`.
4. Avviare `python3 tools/server.py` per i confronti su8040 e `python3 -m http.server 8041 --bind 127.0.0.1` dalla radice del repository per i test funzionali.
5. Eseguire `capture.py reference`, `capture.py baseline`, `capture.py current`, poi `compare.py`. Tutti gli output sono isolati in `evidence`. Le maschere escludono solo l'interno dinamico comune della scena e conservano ogni overlay/UI; l'overlay50/50 non è mascherato.
6. Eseguire `node tools/build-observer.mjs`, poi `python3 tools/ui-gate.py`. L'observer è solo nel laboratorio, mai in `dist` o nel pacchetto Pages.
7. Eseguire `python3 tools/run-suite.py tests/browser-ui-v21-U9-native-checkpoint.py <output-native>` e la suite `tests/browser-ui-v21-U3-picking.py` con `SERIEN_URL=http://127.0.0.1:8041/`, `U3_OBSERVER=<observer.js>`, `U3_PICKING_OUTPUT=<output-picking>`. Il wrapper documenta il launcher Menu e aggiunge le frecce trusted; le asserzioni di dominio originarie non sono indebolite.
8. Eseguire `python3 tools/control-fit.py`: quattro missioni reali × sette viewport, controlli console/overflow e verifica del ritocco CSS finale rispetto alla ricevuta nativa. La ricetta conclusiva conserva il percorso della snapshot CSS della sessione; per riprodurre il solo controllo contenuti, separare la sezione di provenienza finale e usare i file/hash consegnati.
9. La matrice5C è stata eseguita tramite `docs/_active/ui-v21/evidence/U9/run-legacy.py tests/browser-phase-five-close.py <output-5c>` con la stessa URL locale; il wrapper traduce il consenso reset già esplicito nella conferma nativa, conservando le asserzioni ferroviarie.

`finalize.py` è la ricetta di raccolta/validazione della consegna originale e richiede i ricevuti output e il template di rapporto di quella sessione. Non è un test o un comando applicativo. I risultati/log intermedi in `failures/` sono preservati; i PASS conclusivi sono quelli referenziati dal rapporto e dal bundle finale.

I log `.log`/`.txt` sono normalizzati rimuovendo soltanto spazi finali e righe bianche finali prima del manifest Git; valori, messaggi e asserzioni restano intatti.
