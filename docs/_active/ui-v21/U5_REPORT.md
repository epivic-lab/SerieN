# SerieN UI V2.1 — U5 REPORT

**U5 READY FOR REGIA REVIEW.** Proposta tecnica, non approvazione della Regia. STOP dopo U5; U6–U9 non avviate.

## Ingresso e perimetro

Repository `epivic-lab/SerieN`, branch esclusivo `codex/ui-v2-integration`. Remoto iniziale identico al checkpoint U4 approvato **`1d591bbc914f74cf066666522c6692be4132a614`**; U3 `907a9ec4a9d570f03af9ab77d39269ff49787256` e main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` antenate. Checkout iniziale dell'ambiente su `work@46f2655`; portato senza reset/rebase al branch autorizzato e verificato pulito prima degli interventi. Upstream e refspec del solo branch configurati; recupero del primo switch documentato in [execution-receipts.json](evidence/U5/execution-receipts.json).

Consultati mandato, G-U5, piano, A03/A07/A10/A12, risoluzioni, controlli/schermate e rapporto U4. Materiali e font frozen già integrati conservati. [Mandato originale](evidence/U5/AUTHORIZATION_U5.md).

## Implementazione

| File | Modifica |
| --- | --- |
| `src/train-deck.js` | Una card stabile per ogni ID fisico, fino ai quattro treni originali. `RecentConsoles(3)` resta cronologia recente, senza decidere le card montate. Getter `visibleIds` descrive ora tutte le card, non l'intersezione con il viewport. ID compatibili assegnati esclusivamente alla selezionata. Readout/meter e quadrante da velocità reale; pulizia esplicita degli handler e ResizeObserver per rivelare la selezione dopo ridimensionamento |
| `src/ui/dock.js` | Navigazione Previous/Next e Left/Right/Home/End, solo selezione originale. Intento reset con confronto generation e identità/numero della flotta prima del consenso. Dispose cancella intento e listener |
| `src/ui/keyboard.js` | Unico handler globale Space, senza repeat o modificatori; esclusi controlli nativi, textarea, select, contenteditable, elementi con ruolo interattivo e dialoghi aperti. Dispose rimuove l'handler |
| `src/ui/guard-modal.js` | Opzioni di etichette/classe/title ID, con default U2 identici. Reset usa classe e titolo distinti. `request/settle`, validazione atomica e guard Sign out restano gli stessi |
| `app.js` | Import/mount/dispose e trasferimento del solo consenso reset al coordinator. Il corpo reset è esattamente quello U4 dopo la rimozione della riga `confirm`; anche il primo `guardedStops.clear()` viene così raggiunto soltanto dopo consenso. Nessuna Promise |
| `index.html` e integration CSS | Regione U5, carousel accessibile, enamel/brass, font locali, quadrante e STOP ALL momentaneo. Solo appendice CSS U5; prefisso U4 e ordine dei fogli intatti |

[Mapping completo CTRL-016–026/050/053/054 e delta selettori](evidence/U5/selector-delta.json). Le callback individuali originali selezionano l'ID interessato e chiamano `fleetCommands`; Couple/Uncouple mantengono `applyConsistCommand`. UI rifiutata senza successo anticipato. Nessuna seconda flotta, composizione, velocità o selezione autorevole; il solo snapshot di riferimenti dell'intento reset serve alla rivalidazione.

**Throttle** resta comando percentuale 0–100. **Actual speed** e ago usano `abs(train.velocity)` in layout/s; massimo grafico 150, verificato da `MOTION.maxSpeed=100`, `speedScale=1.5` e `desired=dir*speed*speedScale`. Nessun km/h, nuova fisica o conversione fittizia. Stato Paused separato dalla velocità conservata dal motore.

STOP ALL e Pause sono i nodi/handler originali. STOP ALL non possiede latch né RELEASE. Add Train conserva integralmente massimo quattro, punto originale libero, messaggi e selezione soltanto al successo. Mappa U4, card e altri consumer condividono `select` originale.

## PASS eseguiti

[Results JSON e comandi](evidence/U5/results.json), log/exit in `evidence/U5/tests/`, ricevute storiche dei tentativi in `execution-logs/`, `gate-commands.json` e `verified-remaining-gate-commands.json`.

- **254 Node**, zero fail/skip; **9 Python**; build finale e metafile; rigenerazione canonico e diff zero.
- **U5 produttivo: 8 gruppi PASS** sul bundle definitivo: inserimento rifiutato senza mutazioni/consentito/quinta impossibile; quattro card e ID corretti; LRU indipendente; velocità reale distinta; Space/editabili/dialoghi; STOP ALL incluso fuori viewport e ripartenza; Pause/Reverse/Lights/Uncouple/Couple; reset cancel/confirm, generation=1, confronto STALE, UUID pianificati e record/prenotazione Depot conservati; responsive e pagehide/dispose. [Risultati](evidence/U5/delivery/results.json).
- **Lifecycle adapter PASS**, prova separata al confine callback: generation/identità obsolete rifiutate, dispose pending zero callback, doppio consenso una chiamata, tastiera rimossa/rimontata senza duplicazioni. Non presentata come prova del motore.
- **Browser Train Deck PASS**, native/Kenney, fallback, marker reali, controlli e quattro viewport; **Phase Zero PASS**, circuiti reali, quarto treno, arresti, runaround, scambi/HUD e asset.
- **Matrice 5C PASS**, undici scenari: frontali, composizioni lunghe, sganciati/scambi, inserimento occupato, avvicinamento, aggancio in curva/giunto, frame rate, circuiti misti, spazio modelli e route history. Asserzioni ferroviarie originali conservate.
- **U2/U3/U4 smoke PASS**, inclusi consenso Sign out una chiamata, sessioni e focus; camera/Route/HUD/Bell/Log; sidebar/scambi/missioni/daylight/mappa condivisa. I soli adattamenti ai vecchi test riguardano LRU diventata carousel, look HUD già approvato U3, porta locale effettiva e consenso esplicito al nuovo dialogo reset.
- **RAF nativo PASS** sul bundle finale: quattro treni realmente avanzanti, selezione quarta/Space individuale, STOP ALL dei fuori viewport, ripartenza senza latch, Pause congelata e Resume avanzante. Nessun passo/render manuale. **89 frame, 140.877,644 ms, circa 0,625 fps SwiftShader**, zero pageerror. È prova funzionale software, non fluidità o prestazioni GPU hardware. [Ricevuta](evidence/U5/native-current/results.json).
- **Invarianti PASS**: moduli ferroviari, dispatcher, topologia/canonico, asset, dipendenze, Auth/Supabase e workflow invariati; corpi dei comandi/globali/reset confrontati esattamente; nessun reference/test/observer nel bundle. [Hash e dipendenze](evidence/U5/invariants.json), [manifest sorgenti](evidence/U5/source-hashes.json).

Bundle SHA-256 definitivo **`8199e84ff8b0bf600013ff7b7ded3fe7d42a5a6be13468f55032e3a78add7ac3`**. Functional e native finali hanno lo stesso hash. Le regressioni intermedie precedono il solo ulteriore cleanup/reveal su resize del dock; unit/build, acceptance completa, pagehide e RAF sono ricontrollati sul definitivo. Hash dei tentativi precedenti restano nelle rispettive ricevute.

**PASS documentati da fasi precedenti:** matrici complete M2/M3, R1 estesa e S2/S5 non rieseguite integralmente; i domini non cambiano. In U5 rieseguiti i contratti reset/generation/session-only/prenotazione e le regressioni pertinenti sopra.

## Visuale, recuperi e limiti

Catture finali in [delivery](evidence/U5/delivery/): desktop 1440×900, tablet 1024×768, mobile 390×844, viewport/pagina intera/dock; tre e quattro treni, quarta selezionata, movimento con throttle diverso dall'actual, Pause, inserimento rifiutato/consentito e reset pending/confirm/post-state. Ispezionati dock tablet/mobile e layout completi: target principali ≥44 px, nessun overflow pagina, HUD/Bell/Log e sidebar separati dal dock. Sidebar e pagina mantengono lo scroll progressivo U4; nessuna revisione globale U9.

La [cattura singola](evidence/U5/single-projection-settled/) è dichiaratamente una proiezione UI del vero treno 0, senza alterare i tre treni fisici iniziali; include il reset cancellato. **NOT VERIFIED: sessione fisica con un solo treno**, non raggiungibile tramite comandi autorizzati attuali senza aggiungere una rimozione fuori scope. Zero treni resta difensivo, non nuova funzione.

Tutti i FAIL intermedi sono conservati e distinti dai PASS: attesa harness che restituiva una funzione, collocazioni di fixture incompatibili con lunghezza del tratto/convoglio, confronti con testo trasformato maiuscolo e STALE esposto come `data-comparison`, Pause testata inizialmente nel verso sbagliato, vecchie aspettative HUD/LRU e porta hardcoded. Recuperi di prodotto: righe CSS legacy sovrapposte e box meter assoluto che produceva 9 px di overflow; confinati alla regione U5. Su resize aggiunta rivelazione della selezione senza comandi, verificata anche dopo scroll assestato. Un errore Path+str nella ricevuta runner e una cattura partita prima della stabilizzazione del boot sono documentati senza nascondere il fallimento. Nessuna evidenza precedente sovrascritta.

**NOT VERIFIED:** GPU/dispositivi/touch/audio fisici, screen reader, altri browser, OAuth remoto, beforeunload nativo e accettazione responsive globale U9. Nessuna conclusione di prestazioni hardware dai frame software. Approvazione visiva e funzionale definitiva esclusiva della Regia.

## Sicurezza e consegna

Nessuna credenziale, scrittura cloud, modifica Supabase/Auth, dipendenza o nuova persistenza. Nuove stringhe variabili inserite con `textContent`; HTML aggiunto statico. Lifecycle cancella intenti/listener/observer; nessuna invalidazione prematura. Main, merge, deploy, Pages, rebase, clean/reset distruttivi e force push esclusi.

Checkpoint atomico contenente codice/test/rapporto/evidenze, push normale sul solo branch autorizzato e confronto SHA locale/remoto nella consegna. SHA del commit contenitore riportato nel messaggio finale, evitando un hash autoreferenziale nel rapporto.

**STOP U5 — READY FOR REGIA REVIEW. U6 non avviata.**
