# 5D.6 — Gate funzionali e visuali completati

> Checkpoint storico. La 5D è ora conclusa: stato corrente, prove finali e provenienza in [PERFORMANCE_AUDIT_5D.md](../PERFORMANCE_AUDIT_5D.md).

30 ottobre 2026. Applicazione candidata del checkpoint `5ae8ee9`; nessuna modifica applicativa dopo tale checkpoint. Documentazione e harness aggiornati nei commit seguenti. Codice di produzione compilato: SHA-256 `b6d2f21c18d936330e84a6886abd001488063f811c5a84b03f9e7fd24dd778f9`.

| Verifica realmente eseguita | Esito |
|---|---|
| `npm test` | PASS, 29 file di test |
| `node --test --test-isolation=none tests/*.test.js` | PASS, 130 casi, zero saltati/falliti |
| `python3 -m unittest discover -s tests -p '*_test.py'` | PASS, 9 casi |
| `npm run build` | PASS |
| `browser-phase-five-close.py` | PASS, 11 scenari della matrice di chiusura 5C |
| `browser-phase-zero.py` | PASS, operazioni reali e quattro viewport |
| `browser-phase-four.py` | PASS, ruote/biellismi, inversioni, agganci e quattro terminali, rendering |
| `browser-consist.py` | PASS, GLB reali, spaziature e ganci, sgancio/riaggancio, ripristino nativo/reset |
| `browser-phase-five-c.py` | PASS, rifiuto atomico del cambio modello e del posizionamento senza spazio |
| `visual-regression.py` | PASS, 8 coppie pixel-identiche e stato/trasformazioni nei due versi, nativo/Kenney |
| Confronto sorgenti protette e costruttori nativi | PASS, invariati rispetto alla 5C |

Log, JSON e screenshot nuovi in `regression/`, separati dalle prove storiche 5C. Le suite browser sono state eseguite in directory temporanee, contro la build locale, un browser alla volta. Le schermate visive diurne/notturne Cinema sono state anche ispezionate. Queste sono prove automatizzate con ispezione delle immagini; non un collaudo manuale su hardware fisico.

I test Node comprendono l’oracle congelato 5C per conflitti/traiettorie e le 120 combinazioni di traccia/anteprima. Il costruttore nativo in `rolling-stock.js`, prima di `animateStock`, conserva SHA-256 `da3d4e050fb130f6b3d9e9d59beb0261ef14374527cd449f4d8c5cb917f5721e` identico alla baseline. Il digest della manifest delle miniature cambia perché comprende l’intera sorgente animata; immagini e modelli non cambiano.

Grafo canonico, Journey/router/FixedClock, scenografia senza gallerie, materiali e shader, HUD/plancia, dipendenze e workflow Pages invariati. Compatibilità Pages verificata tramite build e asset/URL locali; nessun deployment avviato.

Questo checkpoint chiude i gate di regressione, non il confronto prestazionale completo né il gate memoria: attendere le acquisizioni A–F prima di dichiarare conclusa la 5D.
