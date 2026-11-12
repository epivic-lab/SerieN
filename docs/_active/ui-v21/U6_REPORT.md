# SerieN — U6 Train Management

**U6 READY FOR REGIA REVIEW — STOP.** Proposta tecnica, non approvazione della Regia. U7/U8/U9 non avviate.

## Recovery e baseline

Recuperato il lavoro locale da U5 `e6f152c9b5a23347cbbd5aa6898b91a11e2194e0`, identica a upstream/remoto sul branch `codex/ui-v2-integration`. Main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` invariata. Inventario obbligatorio prima delle modifiche: quattro file applicativi unstaged, due log baseline non tracciati, nessun commit U6 locale/remoto, nessuno staged e un solo worktree. Nessuna modifica sconosciuta. [Inventario e hash recuperati](evidence/U6/recovery-inventory.json), [mandato recovery](evidence/U6/RECOVERY_AUTHORIZATION.md), [mandato originale](evidence/U6/AUTHORIZATION_U6.md).

Shell/Layout/Catalog/guard e responsive erano implementati parzialmente, non ancora verificati. Side View originale già riutilizzata. Conservato il codice valido; completati test, recuperi e documentazione. Nessun reset, clean, checkout distruttivo, rebase o applicazione di stash. Consultati A02/A03/A04/A05/A10/A12, G-U6, registri controlli/schermate, piano/risoluzioni, U5 e i materiali CSS/token frozen già integrati.

## Implementazione e perimetro

- `src/train-management.js`: unica istanza `#tmD`, API open/sessionSummary/invalidateReferences/sync/update/dispose conservate. Shell, quattro tab con ruoli accessibili e Arrow/Home/End, focus al launcher reale. Nuove regioni soltanto Layout/Catalog; tab senza discard e scroll verticale riportato all'inizio della vista scelta.
- Layout da getTrains/compositionView: identità, immagini, veicoli, lunghezze, UUID/ordine/dimensioni reali; selezione originale, Focus e Copy originali. Detached da detachedView read-only con UUID/traccia/misure: nessun trasferimento Depot.
- Catalog da PROJECT_CATALOG: filtri ruolo/provenienza/testo e definizioni originali, nessuna quantità/prezzo/stock inventato. CTRL-014 inoltra una change al select originale rollingModels, rileggendo rollback e log reale; nessun controller alternativo.
- `src/train-projects-view.js`: sola API di presentazione `discardAfterConsent(expected)`, booleano sincrono che confronta il draft serializzato prima del medesimo store.cancel. Prevista dal mandato per adattare la conferma della shell. `discard()`, `copy()`, handler interni e store invariati; nessun redesign U7.
- `src/ui/guard-modal.js`: cancel, fallback focus e callback di contesto invalido, opt-in compatibili con U2/U5. La shell rivalida generation, draft, vista, identità del target e composizione prima della mutazione. Cancel/Escape/backdrop conservano il draft; doppio consenso una volta; reset cancella il pending e informa senza scartare dati. Nessuna Promise sostituita a discard().
- `ui/css/serien-ui-integration.css`: sola appendice U6 con font locali/brass/enamel. Interni Projects/Depot legacy, CSS applicato alla shell e alle regioni Layout/Catalog; prefisso U5 e ordine dei fogli intatti.

createTrainSideView, compositionSideLayout, manifest/coupler, immagini e catalogo sorgente restano byte-identici. Zoom 1–6/Fit/scroll riutilizzano gli handler originali, senza nuovo setZoom pubblico o renderer. Condizione beforeunload esattamente `projects.dirty || projects.hasProjects || inventory.size > 0`; nessuna persistenza. La chiusura non rimonta gli store.

## PASS eseguiti

[Results/comandi](evidence/U6/results.json), [exit delle suite](evidence/U6/commands.json), [invarianti](evidence/U6/invariants.json), [hash sorgenti](evidence/U6/source-hashes.json), [mapping callback](evidence/U6/selector-delta.json).

- 254 Node, 9 Python, build produttiva/metafile, canonico rigenerato con diff zero.
- M1: selezione condivisa, UUID/ordine/reverse, detached, catalogo, Focus/Escape, responsive e touch sulla build minificata.
- Side View storico: asserzioni originali su ganci/scala/ordine, native/Kenney, sgancio/riaggancio, zoom/scroll/Fit, fixture sei veicoli, touch e unico renderer; harness originale con sola attesa dello swipe.
- Projects lifecycle: dirty/cancel/confirmed, listener beforeunload sintetico e 25 mount/open/dispose. Nessun rerun indiscriminato di M2/M3.
- Browser U6: sei gruppi PASS su tre launcher/unica istanza/focus/tab; dirty Close/Escape/backdrop/Focus/Copy e doppio consenso senza mutazione fisica; clean close/sessione/generation/STALE/pending invalidato; cinque viewport e Zoom/Fit/scroll/filtri; native/Kenney/fallback/detached/Space; dispose pending e cleanup beforeunload.
- U2 smoke: dieci gruppi, Sign out una chiamata, session summary reale, Menu/Stock/focus, zero errori JS/HTTP/richieste esterne.
- U5 regression: otto gruppi completi, quattro card/ID, Space, STOP ALL senza latch, Pause, Add Train protetto, comandi R1, reset atomico/generation, record e prenotazione M2/M3 conservati, responsive e cleanup.
- RAF nativo sul definitivo: quattro treni realmente in movimento, apertura/selezione/chiusura TM, Space sul quarto, STOP ALL dei fuori viewport, ripartenza/Pause/Resume. Nessun passo/render manuale. [Ricevuta finale](evidence/U6/native-final/results.json); limiti SwiftShader, nessuna certificazione di fluidità GPU.
- Invarianti: app.js/index/motore/dispatcher/topologia/store/catalogo/asset/font/Auth/dipendenze/workflow immutati; nessun reference/test/mock nel bundle.

Bundle definitivo SHA-256 `8672384da7e4224342c2d6f2168132aca45d97ce49a6a1b1a6d98fe84ad2b7e7`, uguale in acceptance e RAF finali. Le regressioni intermedie precedono il solo ritocco allo scroll verticale dei tab; build, acceptance completa e RAF finali ricontrollati. Nessuna asserzione ferroviaria storica modificata.

**PASS storici documentati in U5:** matrici estese U3/U4/R1/M2/M3 non rieseguite integralmente. U3/U4 conservati per hash, DOM e selezione condivisa attraversati dalla regressione U5 e dalla consultazione U6; non presentati come nuova esecuzione completa delle loro matrici.

## Visuale, failure e limiti

Catture in `delivery/`: Layout/convoglio selezionato, Zoom e scroll, Catalog completo/filtrato a 1440×900,1024×768,820×1180,768×1024,390×844; guard dirty, fallback e detached. M1/Side producono prove isolate; nessuna copia delle intere cartelle storiche U2–U5. Ispezionati Layout tablet, Catalog mobile e guard dirty: testo leggibile, controlli principali ≥44 px, nessun overflow del dialogo. Corpo scrollabile; tab conservano i draft. Accettazione estetica alla Regia.

FAIL intermedi conservati: collisione data-view tab/pannello corretta con data-u6-view; fixture che cercava Copy su un convoglio non selezionato; aspettativa errata di conservazione della selezione dell'editor dopo chiusura del draft pulito. Corretto il test riaprendo il progetto confermato, preservando la semantica legacy e la verifica degli UUID. Directory browser-first/second/third/fourth separate; delivery è il definitivo. Disconnessione temporanea exec-server durante la preparazione del rapporto: nessuna mutazione Git; recuperato il collegamento e verificato il PASS nativo finale prima del checkpoint.

**NOT VERIFIED:** presentazione del prompt nativo beforeunload (verificato il listener), OAuth remoto, GPU/dispositivi/touch/audio fisici, screen reader, altri browser e U9. Touch = input emulato Chromium. Gli handler interni Projects/Depot con conferma nativa restano deliberatamente legacy fino a U7/U8; tutti i call site shell U6 passano dalla nuova guard senza doppia conferma.

Nessuna credenziale, scrittura cloud/Supabase/Auth/RLS, nuova persistenza, merge/main/deploy/Pages/force push. Dati variabili inseriti con API DOM sicure, HTML nuovo statico. Checkpoint atomico contenitore e confronto remoto nella consegna, evitando un hash autoreferenziale nel rapporto.

**STOP U6 — READY FOR REGIA REVIEW. U7 non avviata.**
