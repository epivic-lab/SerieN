# UI V2.1 — INTEGRATION READINESS REPORT

**Stato corrente: READY FOR UI V2.1 IMPLEMENTATION GATE — vedere §13.** I blocchi di trasferimento dei §§6/10/11/12 sono storici e risolti dagli allegati segmentati; nessuna implementazione autorizzata.

Data: 2026-11-11. Perimetro: **FASE 0**, audit e preparazione. Nessuna implementazione UI, modifica applicativa, merge o deploy autorizzati/eseguiti.

## 1. Baseline Git verificata

Verifica diretta `git ls-remote --heads origin`, seguita da fetch dei tre riferimenti pertinenti:

| Riferimento | SHA effettivo | Esito |
| --- | --- | --- |
| origin/main | `184cc9ba93a6b35493f365b2ffcb20ef0645963d` | Corrisponde al mandato |
| origin/codex/train-management-m2 | `91722fbdf6671e69deebf645c3d8bf389212f421` | Corrisponde al mandato |
| design/main-ui-redesign | `cf2c29a8112b37a53c62cb84fca44061942aea31` | Esistente, soltanto ispezione albero |

Checkout iniziale: branch `work`, HEAD `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`, working tree pulito. Non era una baseline autorizzata per l'integrazione: è stato preservato. Creato il branch autorizzato `codex/ui-v2-integration` direttamente dal commit M2/M3 approvato. Nessun branch locale/remoto con quel nome esisteva alla verifica iniziale. Nessun altro branch di integrazione UI individuato tra i riferimenti remoti controllati.

Main è antenato della baseline M2/M3: `git rev-list --left-right --count origin/main...91722fb` = **0 / 6**. Commit esclusivi: `2743bcd`, `59f54f1`, `a67e0de`, `afc6c00`, `252d9c3`, `91722fb`. Delta: 155 file, 15380 inserimenti/41 rimozioni, prevalentemente evidenze e documentazione; runtime: progetti/depot, viste laterali/management, CSS e una riga app.js. M2/M3 non sono in main. Nessun reset, clean, rebase, force-push o merge eseguito.

## 2. Stato M2/M3

Approvazione tecnica M2/M3 ricevuta nel mandato di questa Fase 0; i rapporti storici restano fotografie dei precedenti checkpoint, anche dove indicano attesa review. M1/M1.1 presenti in main, M2/M3 presenti nella baseline dedicata. Composer: progetti indipendenti in RAM, copia/comparazione con composizione reale, bozze e confermati, identità dei posti e guard di modifiche. Depot: record virtuali distinti, disponibilità/prenotazione esclusiva dei soli posti confermati, riconciliazione senza modificare M2 o R1. Ingresso/uscita fisici e applicazione globale del progetto non disponibili.

## 3. Mappa precisa della UI e delle dipendenze

| Area / file | Stato letto e responsabilità | Comandi, callback e vincoli da conservare |
| --- | --- | --- |
| `index.html`, `style.css` | Shell, `#view3d`, pannelli, modali, controlli globali, host di console e selettori | App richiede ID concreti già al caricamento; non sostituire markup prima di avere adapter equivalenti |
| `app.js` | Composition root: `trains`, `detached`, `selected`, `paused`, switchSpecs, missioni, luce, renderer/camera/nav, quality | `ui`, `select`, `log`, RAF, resize e teardown collegano viste e simulazione; non è un semplice file grafico sostituibile |
| `src/train-deck.js`, `train-deck-state.js` | Console indipendenti, tre slot recenti LRU per massimo quattro treni, mappe da network e Journey, velocità/stato/lunghezza | `onSelect`, `onSpeed`, `onReverse`, `onStop`, `onLights`, `onUncouple`, `onCouple`, `onFocus`; il quarto treno nascosto continua a muoversi |
| `src/train-management.js`, `train-management-state.js` | Dialog dinamico Layout/Catalog/Projects/Depot, proiezioni reali, selezione condivisa, generazione riferimenti al reset | `getTrains/getDetached/getSelected/getImportedCatalog`, `onSelect/onFocus`, `sync/update/invalidateReferences/dispose`; guard close/cancel/beforeunload |
| `src/train-side-view.js`, `train-side-layout.js` | Vista SVG laterale a scala comune, ordine/direzione e dimensioni effettive, zoom/scroll/Fit | Conservare coupler spacing e proiezioni; non riordinare fisicamente il convoglio per adattarlo al disegno |
| `src/train-projects.js`, `train-projects-view.js` | Catalogo condiviso, store sessione, UUID posti, bozza/confermato, copia e confronto, capability R1 | `copy/discard/snapshot/dirty/hasProjects/dispose`; onChange aggiorna vista e riconcilia deposito. Nessuna applicazione globale |
| `src/depot-inventory.js`, `depot-view.js` | Inventario virtuale, prenotazioni `(projectId, vehicleId)`, letture separate di stock progettato/fisico/sganciato | `reconcile`, lettura confermati, getGeneration; nessun dispatcher di trasferimento fisico, nessuna scrittura cloud |
| `src/next-switch.js`, `next-switch-view.js`, `railway-state.js` | Preview lungo Journey, direzione effettiva, distanza, safety, schema SVG dai percorsi reali | `mountNextSwitchHUD({host,network,getState})`, refresh limitato a 200 ms, minimize e dispose; sola lettura, preview ≠ autorizzazione al movimento |
| `src/turnout-interaction.js`, `turnout-picking.js` | Picking canvas, hover/focus, tastiera e pannello sincronizzati con gli otto controller canonici | Unico passaggio `requestToggle(controlId,origin)` → `turnout-commands.js`, con safety corrente; mai mutare direttamente gli scambi |
| `src/turnout-glow.js`, `turnout-arrows.js`, `turnout-arrow-view.js`, `turnout-arrow-approaches.js` | Feedback dei dispositivi reali e dei percorsi selezionati | Preservare disposers, reduced motion, geometrie e semantica: rosso non significa via libera |
| `src/guarded-stop-view.js`, `guarded-stop-scene.js`, `guarded-stop-bell.js` | Osservazione guard R1, segnale 3D, status accessibile e mute campana dinamici | Sicurezza indipendente da segnale/audio; bell ha lifecycle proprio, non va collegata al futuro mute UI |
| `src/navigation.js`, `view-controls.js` | Camera overview/station/yard/follow/manual; OrbitControls, zoom/pan/orbit | home/recenter → camera; start gesture interrompe follow; sincronizzare `#cameraView`, ripristinare input/disporre listener |
| `src/quality.js`, `presentation.js`, scena | Auto/Low/High/Cinema; shadow/pixel ratio/effects, daylight, asset nativi/Kenney | Cambio qualità e resize sullo stesso renderer; non ricreare scena per passare pannello |
| `app.js` missioni/log/plan | Quattro missioni da stato reale; `#log` mantiene ultimo messaggio; plan SVG dal network canonico | `nextMission`, `planBtn/helpBtn`, data-close, backdrop/Escape, revoca blob URL; niente KPI/allarmi mock |
| `auth-gate.js`, `auth-gate-core.js` | Avvio applicazione dopo gate Google, bottone signOut e gate HTML | Confine congelato: preservare ID e boot; non modificare Auth/config/backend in questa fase |

Flusso da mantenere: **evento DOM → callback app → fleet/turnout command validato → stato/step R1 → proiezione read-only → sync UI**. R1 (`railway-step`, guard/conflicts, state, routing/network/simulation/consist) resta il proprietario delle decisioni ferroviarie. Composer e inventario mantengono store indipendenti, non uno store ferroviario duplicato.

### DOM generato e accoppiamenti critici

- Deck crea article `.trainConsole[data-console-train]`, selector `[data-train]`, SVG defs/use e marker, `[data-command]`. Gli ID `speed`, `stop`, `reverse`, `lights`, `uncouple`, `couple`, `trainName`, `trainIcon`, `cars`, ecc. **migrano sulla console selezionata** a ogni sync. Space usa `#stop.click()`; rimuoverlo rompe anche la tastiera.
- `app.js ui()` crea `#switchList .switchCell` e `[data-switch]`; `switchHUDState()` aggiorna disabled/title/focus del parent. Il pannello e il picking condividono il dispatcher, non soltanto lo stile.
- Management genera `<dialog>`, `[data-view]`, `[data-composition]`, `[data-consist]`, `[data-vehicle-id]`, `[data-detached-id]`; Projects usa `[data-project-action]`, `[data-planned-vehicle]`; Depot `[data-depot-action]`, `[data-depot-id]`, `[data-depot-state]`, `[data-depot-physical-id]`, `[data-generation]`. Vista laterale: `.sideViewport`, `[data-fit]`, controlli zoom.
- HUD crea `#nextSwitchHUD/#nextSwitchBody`, classi `.nextSwitch*` e marker SVG. Guarded Stop crea status live e bottone mute; non sono presenti nel solo HTML statico.
- Preservare input/change/click/pointer/touch, keyboard Space/Escape, dialog cancel/close, beforeunload, visibilitychange, reduced-motion change, ResizeObserver e pagehide. `pagehide` non persisted libera RAF/listener/GPU/audio/store; lo spostamento del canvas deve preservare eventi e dimensioni effettive.

### Asset e CSS

UI corrente: font di sistema (`system-ui`, sans-serif), token CSS `--bg/--side/--line/--txt/--muted/--gold`, CSS globale e media query, regole inline per auth/guarded stop. SVG sia statici canonici sia generati; miniature `assets/locomotive-thumbnails` con fallback SVG, viste laterali e relativo manifest in `assets`, GLB Kenney tramite `src/train-assets.js`. Texture/materiali scenici appartengono al renderer e non alla futura skin. Non introdurre font/texture V2.1 deducendoli dal V1.

### Superfici sostituibili

Token, decorazioni e shell possono cambiare conservando host/contratti di boot. Le viste Deck/HUD/Management/Projects/Depot possono ricevere una nuova presentazione dietro gli stessi getter/callback/lifecycle. La sostituzione completa dei moduli di vista non è automatica: Projects possiede oggi lo store e Management ne coordina la durata. Prima di smontarli serve un contratto che conservi sessione/bozze/prenotazioni. `app.js`, renderer, comandi e dominio ferroviario non sono superfici di skin da riscrivere.

## 4. Contratti approvati verificati nel codice

| Contratto | Riscontro / rischio d'integrazione |
| --- | --- |
| Massimo quattro treni | `app.js addTrain`, guard inserimento occupato; tre console recenti non sono il limite flotta |
| STOP ALL momentaneo | `fleetCommands.stopAll()`, nessun latch; ripartenza esplicita possibile |
| Space ferma selezionato | Handler `keydown` → `#stop`; ignora INPUT/SELECT/BUTTON. Rivalutare target editabili/contenteditable della nuova UI nel contratto tecnico |
| Reset con conferma | `reset()` chiama confirm prima delle mutazioni; aggiorna generazione M1/M2/M3 |
| Qualità e camera | Quattro modalità reali; home è overview camera, non reset della sessione |
| HUD reale read-only | Schema da schematicPaths(network,preview); nessun comando scambi nel pannello |
| Campana indipendente | Modulo e mute dedicati; non esiste ancora un sistema generale audio UI |
| Log persistente | `log(s)` cambia textContent senza timer; non è uno storico persistito tra reload |
| Sign out / Exit to title | Sign out esistente chiama signOut e reload. **Exit to title separato non esiste**: comportamento/destinazione, dirty guard e sessione da definire, senza riutilizzare logout |
| Nessun mock / DnD obbligatorio | Dati da stato reale e comandi espliciti; reference non importato |
| No apply globale / trasferimenti fisici | Capability M2 esplicita; Depot ingresso/uscita disabilitati |
| Session only | Store M2/M3 in memoria; reset ferroviario e close/reopen preservano, reload perde. Nessuna persistenza introdotta |

## 5. Dipendenze, workflow e rischi

Package 0.12.0: runtime `three` 0.163.0, dev `esbuild` 0.25.12. Nessuna dipendenza aggiunta o installata; node_modules, Chromium e Python Playwright già disponibili. Esecuzione locale Node 24.19.0; CI usa Node 22/Python 3.12: equivalenza completa del runtime CI non verificata.

Workflow `.github/workflows/pages.yml`: solo push main o dispatch manuale; npm ci, canonico/diff, Python, Node, build, preparazione sito e Pages. Il checkpoint su branch dedicato non deve attivare deploy e non certifica da solo le suite browser (non presenti nel workflow). Nessuna modifica workflow/config.

Rischi principali: ID dinamici selezionati; store legati al mount della vista; overlay sopra canvas che intercettano picking/OrbitControls; dimensioni zero durante responsive e reparenting; focus/Space nei form Composer; update DOM inutili a ogni frame; listener/audio/URL/GPU non disposti; simboli SVG duplicati; allarmi mock del reference confusi con guardie R1. Mitigazione: adapter minimi, mantenere un solo renderer e stato R1, gate per ogni incremento e rollback del singolo commit.

## 6. Disponibilità del design

Disponibile in questa richiesta soltanto `Testo incollato.txt` (6946 byte). Ricerca locale allegati: nessun `serien-mainui-v2.1-train-management.zip`. **Integrità ZIP, manifest, checksum, font/licenze, token, mapping e completezza V2.1 NOT VERIFIED**, perché il file manca; non si assume accesso ad altre chat.

V1 individuato via albero Git in `docs/design/main-ui-redesign/serien-mainui-v1/` sul branch design: token CSS/JSON, sprite SVG, texture, reference/library, spec, prompt e screenshot. Non modificato, non importato e non usato come sostituto del V2.1. Il pacchetto tecnico definitivo di Claude non è stato consegnato in questa attività; approvazione dei relativi contratti ancora mancante.

## 7. Piano incrementale proposto, NON eseguito

Ogni passo richiede perimetro concordato, gate pertinente, build/invarianti, commit piccolo e checkpoint reversibile sul branch dedicato; niente merge main/deploy impliciti.

1. Consolidare baseline M2/M3 e questa mappa; confrontare il pacchetto tecnico definitivo con codice e contratti, registrando ogni differenza.
2. Validare archivio/manifest/hash/licenze V2.1; importare soli asset/token autorizzati senza logiche mock. Gate: nessuna variazione R1 o dipendenza non motivata.
3. Shell e collocazione canvas unico; mantenere boot/host/resize/picking, poi desktop/tablet/phone e lifecycle.
4. Collegare selezione, velocità, direzione, luci, stop, aggancio/sgancio, aggiunta quarto treno agli stessi dispatcher. Gate quattro treni/LRU/Space/STOP ALL/reset e inserimento occupato.
5. HUD read-only, diagrammi reali, scambi protetti, camera/quality/ambiente, missioni/log, campana distinta. Definire Exit to title separatamente, senza cambiare Auth.
6. On the Layout e Catalog M1/M1.1, vista laterale, focus e sincronizzazione scena/console; preservare asset e geometria.
7. Composer M2: store sessione, dirty guard, copia/confronto, identità, nessuna applicazione globale; gate lifecycle/reset/touch.
8. Depot M3: record e prenotazioni virtuali, riconciliazione, letture fisiche separate, trasferimenti disabilitati; gate M2/R1 incrociati.
9. Responsive/accessibilità/focus/reduced motion/rifiniture, profiling con hardware adeguato, indipendenza audio.
10. Regressioni finali R1/M1/M1.1/M2/M3, sicurezza/lifecycle, RAF nativo con tre treni; release soltanto con autorizzazione successiva specifica.

Sequenza preliminare da confrontare con Claude prima dell'approvazione. Non costituisce autorizzazione ad avviare il passo 2.

## 8. Test dipendenti da DOM e stato

| Suite | Accoppiamenti da mantenere o aggiornare esplicitamente insieme alla vista |
| --- | --- |
| `browser-train-deck.py`, `browser-phase-zero.py` | `#tabs/#trainDeck`, `[data-train]`, `[data-console-train]`, comandi/ID selezionato, `.trainMapMarker`, LRU, conteggio console, overflow e coordinate reali |
| `browser-train-management.py`, `browser-train-side.py` e relativo wrapper | `#trainManagement`, dialog, data-view/composition/consist/vehicle/detached, `.managementModel`, `.sideViewport`, zoom/Fit, selezione comune e focus |
| `browser-train-projects.py`, `browser-train-project-lifecycle.py` | data-project-action/id, data-planned/side-vehicle, orientamento/transform SVG, label dei form, data-comparison, dialog/dirty confirmation e generazione reset |
| `browser-depot.py`, `browser-depot-lifecycle.py`, `browser-depot-runtime.py` | data-depot-action/id/state/physical-id/generation, label inventario/prenotazione, reserved/available, controlli fisici disabilitati, beforeunload/dispose e assenza di mutazioni R1 |
| `browser-phase-five-close.py`, test turnout/guarded-stop | Diagnostica ferroviaria, controlli reali/ID, safety e comandi; alcune suite storiche richiedono un bundle observer separato, mai da installare in produzione |
| Node `train-deck`, `train-management`, `train-side-layout`, `train-project*`, `depot-inventory` | Proiezioni/stato dominio, identità/lunghezze/LRU, atomicità errori e isolamento; mantenere indipendenti dalla nuova presentazione |
| Node `fleet-commands`, `railway-*`, `turnout-*`, `next-switch`, `guarded-stop`, network/consist e Python JMRI | Protezioni, topologia/canonico, routing, lifecycle e assistenza: gate indipendenti dall'aspetto della UI |

Non indebolire le asserzioni per far passare il redesign: aggiornare soltanto i selettori strutturali quando il contratto semantico è equivalente e approvato. Diagnostica e fixture di auth locali non sono API operative per la UI.

## 9. Risultati della verifica baseline eseguita in Fase 0

Tutte le prove sotto sono nuove esecuzioni sulla baseline `91722fb`; le evidenze storiche M2/M3 sono state consultate separatamente, senza dichiararle rieseguite. Bundle prodotto SHA-256 `69eb83ebae0250ffe245d4ec6ede50cae3561f148f2e2973d0274f2c53b1068e`, identico al gate M3 storico. Evidenze di questa fase in `evidence/`.

| Prova | Esito | Evidenza |
| --- | --- | --- |
| `npm test` | PASS: 254 test, 0 fail/skip | `evidence/node.txt` |
| `python3 -m unittest discover -s tests -p '*_test.py'` | PASS: 9 test | `evidence/python.txt` |
| `npm run build` | PASS | `evidence/build.txt` |
| Canonico rigenerato + diff dei quattro artefatti CI | PASS: 70 nodi, 75 archi, 1 componente; diff vuoto | `evidence/canonical.txt`, `canonical-diff.txt` |
| Browser M1 | PASS incl. touch sul minificato | `evidence/m1.txt`, `m1/browser.json` |
| Browser M1.1 (wrapper scroll settle esistente) | PASS | `evidence/side.txt`, `side/browser.json` |
| Browser M2 | PASS: 13 gruppi | `evidence/m2.txt`, `m2/browser.json` |
| Lifecycle M2 | PASS | `evidence/m2-lifecycle.txt` |
| Browser M3 | PASS: 9 gruppi, desktop/tablet/touch, nomi inerti | `evidence/m3.txt`, `m3/result.json` |
| Lifecycle M3 | PASS incl. 25 cicli | `evidence/m3-lifecycle.txt` |
| Regressioni ferroviarie R1/5C | PASS: 11 scenari | `evidence/railway.txt`, `regressions/railway/` |
| Console / quattro treni / LRU | PASS | `evidence/deck.txt`, `regressions/deck/` |
| Phase Zero layout/HUD/controlli/quattro viewport | PASS | `evidence/phase-zero.txt`, `regressions/phase-zero/` |

Le nove suite browser sopra usano fixture locali di auth; le regressioni deterministiche usano rendering su richiesta, con provenance dei wrapper esistenti. Non provano login Google reale o fluidità nativa. Il 404 intenzionale della suite console esercita il fallback miniature. Nessuna operazione remota Auth/Supabase effettuata.

NOT VERIFIED in questa fase: hardware GPU/tablet/audio/screen reader, presentazione nativa del prompt beforeunload, login/logout Google di produzione, intero audit 5E, workflow CI sul runtime Node 22, tutte le suite browser storiche specifiche S1–S6 con observer dedicato. Le asserzioni di dominio R1/turnout/guard sono invece incluse nei 254 Node; non si dichiara una riesecuzione integrale del collaudo storico S7.

**Gate nativo aggiuntivo eseguito: PASS**, `tests/browser-depot-runtime.py`, sei gruppi, sette checkpoint e 74 frame in 139,378 secondi, RAF non intercettato, tre treni in movimento, input CDP trusted mouse/touch; sgancio/riaggancio reale del treno fermo mentre gli altri due avanzano. Progetti/inventario sopravvivono a close/reopen, nessuna conversione stock fisico→deposito. Contesto WebGL attivo, zero errori JS/console, richieste fallite o HTTP ≥400. Evidenze `evidence/native/result.json`, `frames.json`, `native-depot.png` (ispezionata). **Circa 0,524 fps nel worker software: fluidità hardware NOT VERIFIED**, non è un benchmark equivalente alla sessione storica M3. Nessuna pausa o stepping diagnostico in questo gate.

## 10. Invarianti, prerequisiti e verdetto

Confronto Git contro `91722fb`: app.js, src, HTML/CSS, asset, Auth, Supabase/migrazioni, dipendenze e workflow invariati. Canonico SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Layout/150 rail meshes preservati per assenza di modifiche; nessuna operazione remota backend, nessun nuovo codice eseguibile o dipendenza. Checkpoint composto soltanto da rapporto/stato/evidenze e nota PROGRESS. Le fixture test locali non cambiano il gate di produzione.

**Verdetto: BLOCKED per avvio integrazione UI.** Audit e baseline software completati, ma mancano:

1. Archivio approvato `serien-mainui-v2.1-train-management.zip`, con verifica integrità/manifest e licenze degli asset.
2. Pacchetto tecnico definitivo Claude consegnato e approvato dalla Regia: contratti/DOM/state/lifecycle, mapping completo e prompt incrementali.
3. Definizione di Exit to title distinta da Sign out e verifica dei mapping rispetto ai limiti reali (quattro treni, HUD read-only, session only, nessun apply/trasferimento).
4. Successiva autorizzazione della Regia alla prima microfase applicativa, dopo confronto con il pacchetto tecnico.

Nessuna incompatibilità Git o regressione software riprodotta nelle prove eseguite. L'equivalenza funzionale del design V2.1 è **NOT VERIFIED** finché non arriva il pacchetto; la mancanza non autorizza l'uso del V1 o l'invenzione di adapter. Fluidità/GPU fisica rimane un limite da risolvere prima della release, non un PASS desunto dai test.

**STOP dopo Fase 0.** Unica prossima azione: ricevere il pacchetto definitivo e attendere l'autorizzazione della Regia; nessuna UI V2.1 iniziata. SHA del commit documentale e verifica checkpoint remoto sono riportati nella consegna, evitando autoriferimenti del commit.

## 11. Acquisizione design approvato — aggiornamento del mandato

Il committente dichiara **UI V2.1 APPROVATA DALLA REGIA**, conferma la sola Fase 0 e rinvia a consegna/approvazione separata del pacchetto tecnico definitivo. Questa approvazione è registrata; non autorizza implementazione e non attesta che i byte dell'allegato siano stati verificati. I §§6/10 descrivono la precedente esecuzione: ora il design è allegato, ma non è leggibile tramite il trasferimento disponibile.

### Identità e blocco di acquisizione

- Nome effettivo dell'allegato: `serien-codex-package-ui-v21.zip`.
- Nome citato nel mandato: `serien-mainui-v2.1-train-management.zip`.
- Riferimento ricevuto: `sediment://file_00000000c2748212a234008561ed5c76`.
- Tentativo con `download_file`: **FAIL di trasferimento**, risposta esatta `file exceeds the executor transfer limit of 32 MiB`.
- Nessuna copia dell'archivio trovata negli allegati locali. Nessuna estrazione eseguita. Dimensione precisa e contenuto non disponibili; il solo errore stabilisce il superamento del limite, non una corruzione dello ZIP.
- Equivalenza tra il nome caricato e quello richiesto: **NOT VERIFIED**. Il nome «codex-package» non prova che sia il pacchetto tecnico definitivo; prevale la distinzione esplicita del mandato.

**BLOCKED: acquisizione incompleta.** Non sono leggibili README, PDF, FUNCTIONAL_COVERAGE, mapping CSV/JSON, DATA_AND_EVENT_CONTRACTS, DESIGN_DECISIONS, OPEN_ISSUES, CHANGELOG-DESIGN, FILE_INDEX né reference/component library/asset. CRC ZIP, checksum dichiarati, manifest, integrità, dipendenze/font/licenze, copertura dei mapping e compatibilità del JavaScript dimostrativo sono tutti **NOT VERIFIED**, non FAIL di contenuto. Non sono stati inventati file, checksum o divergenze della reference.

### Verifica Git ripetuta

Remote main `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, branch Train Management `91722fbdf6671e69deebf645c3d8bf389212f421`, branch design V1 `cf2c29a8112b37a53c62cb84fca44061942aea31`: SHA nuovamente verificati direttamente con ls-remote, identici ai riferimenti precedenti. Branch d'integrazione iniziale locale/remoto `e61402c63780dd6bf616f809177b031e1475241b`, working tree pulito, baseline approvata antenata del checkpoint. Main vs baseline M2/M3: 0/6 commit esclusivi. Non si ricrea né si riporta indietro il branch già preparato.

### Quattro sezioni: autorità applicativa confermata, confronto design sospeso

| Sezione | Moduli/contratti effettivi riutilizzabili | Da verificare sul design una volta leggibile |
| --- | --- | --- |
| On the Layout | `train-management.js`, `train-management-state.js`, `train-side-view.js`; getter treni/sganciati/selezione, onSelect/onFocus; composizioni/identità/lunghezze reali e generazione reset | Nuovo DOM, selezione comune, STALE, dettagli e viste laterali; test M1/M1.1, reset e focus |
| Model Catalog | `PROJECT_CATALOG` in `train-projects.js`, miniature e asset esistenti; vista catalog generata da management | Copertura modelli, dimensioni/immagini/fallback e distinzione catalogo/inventario; nessun KPI senza sorgente |
| Projects / Train Composer | `train-projects.js`, `train-projects-view.js`, `train-side-layout.js`; bozza/confermati/UUID, copy/discard/snapshot, dirty guards, confronto read-only con treno reale | Mapping di tutti i comandi M2, conferma/annulla, STALE e session only; niente apply globale o DnD; suite M2/lifecycle e identità |
| Depot | `depot-inventory.js`, `depot-view.js`; inventario separato in RAM, slot confermati, reconcile, getGeneration e stato fisico read-only | Mapping M3 completo, prenotazioni/rilasci/rimozioni/avvisi, trasferimenti disabilitati; suite M3/lifecycle, reset, R1 con treni in moto |

Resta valida la mappa tecnica dei §§3/4/8, che descrive **il codice reale**, non una verifica del design non letto. Candidati da adattare: presentazioni shell/deck/HUD/management/composer/depot e relativi selettori dei test. Componenti nuovi e file applicativi da modificare non possono essere stabiliti definitivamente prima di leggere i mapping V2.1. Exit to title è tuttora un'assenza nel codice, non una divergenza dimostrata della reference.

Conservare integralmente tutte le decisioni della Regia dei mandati: quattro treni, stop momentanei, Space selezionato, reset confermato/STALE, qualità/preset reali, HUD read-only dalla topologia reale, campana R1 separata da UI Sound, ultimo log visibile, Sign out distinto, protezioni e identità R1, separazione progetti/inventario/stock fisico. Nessun mock importato, nessuna persistenza/trasferimento fisico/apply globale o DnD. La sequenza proposta al §7 resta preliminare, non eseguita e da confrontare col pacchetto definitivo.

### Prerequisito operativo

Rendere disponibili gli stessi byte dello ZIP tramite un URL scaricabile oppure suddividerli in allegati ciascuno inferiore a 32 MiB, conservando un checksum SHA-256 dell'archivio originale per la ricomposizione. In alternativa, per iniziare il confronto documentale, allegare un sottoinsieme leggero con i documenti prioritari, CSV/JSON dei contratti e checksum; l'integrità dell'intero pacchetto e l'audit degli asset resterebbero comunque da completare.

**Verdetto confermato: BLOCKED**, ora per limite tecnico di trasferimento dell'allegato e per pacchetto tecnico definitivo ancora separatamente atteso. Non si richiede approvazione all'implementazione: **STOP Fase 0**, in attesa di accesso ai file; audit completo design↔codice non consegnato.

### Test e confini dell'aggiornamento di acquisizione

Nuove esecuzioni: **254 Node PASS (zero fail/skip), 9 Python PASS, build PASS, canonico rigenerato/diff PASS**. Codici d'uscita tutti zero; log e codici in `evidence/acquisition/`. Bundle e canonico mantengono gli SHA-256 riportati al §9/10. Confronto Git dei percorsi applicativi/bloccati contro `91722fb`: diff vuoto (app/src/HTML/CSS/asset/Auth/Supabase/workflow/package). Nessun cambiamento a V1 o agli altri branch; nessun dato/credenziale remota trattato. Nuove modifiche limitate a questo rapporto, STATUS, PROGRESS ed evidenze test.

Le dieci suite browser della precedente Fase 0 restano **PASS storico**, non rieseguite in questo aggiornamento documentale: non è cambiato il bundle. Nuovo confronto browser con il design, immagini/PDF/reference, checksum e verifiche di dipendenze del pacchetto **NOT VERIFIED** per mancata acquisizione. Il fallimento di download non è una regressione del simulatore né prova di un archivio danneggiato.

## 12. Acquisizione da Google Drive — esito del nuovo tentativo

Questa sezione aggiorna il §11: il file è ora identificato tramite Drive, ma l'acquisizione nel workspace resta bloccata. URL fornito: https://drive.google.com/file/d/1lZ9zmhbh8HwDC1ILd5OqeKJCrV0fm2i8/view . Evidenza sintetica priva del link temporaneo firmato: `evidence/drive-acquisition/result.json`.

| Passaggio | Esito osservato |
| --- | --- |
| Metadati con connettore Google Drive | **PASS**: nome `serien-codex-package-ui-v21.zip`, MIME dichiarato `application/zip`, dimensione 36.752.894 byte corrispondenti al mandato |
| Fetch raw con `include_base64=false` | **PASS del connettore**: restituiti riferimento completo al file e dimensione 36.752.894 byte; nessun `workspace_path` materializzato |
| Materializzazione del riferimento tramite curl | **FAIL trasferimento**: HTTP 403 sul dominio temporaneo `sdmntprnortheu.oaiusercontent.com` |
| Tentativo diretto Drive `/uc?export=download&id=…` | **FAIL trasferimento**: `curl: (56) CONNECT tunnel failed, response 403`; nessun corpo/file scaricato |
| Policy dell'ambiente | `restricted`, `enforced`, osservazioni correnti; `drive.google.com` e l'host temporaneo non sono nell'allowlist effettiva |
| ZIP magic, confronto byte locali con dimensione, CRC, directory centrale, manifest/checksum | **NOT VERIFIED**, nessun archivio disponibile localmente. MIME e size del provider non provano l'integrità dei byte |
| Identificazione tecnica/design/entrambi, lettura istruzioni/contratti/mapping, incompatibilità con M2/M3 | **NOT VERIFIED**: non si deduce il contenuto dal nome del file |

Il connettore ha accesso al file; **non è stato osservato un diniego dei permessi Google Drive né un archivio incompleto/corrotto**. Il blocco osservato è la policy di rete dell'ambiente per la materializzazione. Il precedente limite Sediment di 32 MiB resta insufficiente per il riferimento da 36.752.894 byte. Non si usa base64 inline né si modifica la condivisione del file. Nessun link firmato o credenziale salvato in Git.

### Baseline e test

Verifica remota ripetuta: main `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421`, V1 `cf2c29a8112b37a53c62cb84fca44061942aea31`, branch dedicato iniziale locale/remoto `e48dd96dcc9d14a3b1ad7befd9287619640f54b2`. Working tree iniziale pulito; baseline approvata antenata di HEAD. Confronto dei percorsi applicativi e congelati contro `91722fb`: diff vuoto. Bundle e canonico mantengono gli hash dei §§9/10.

**Test applicativi non ripetuti**, come richiesto: nessuna modifica applicativa. Restano i risultati precedenti con provenienza distinta (254 Node, 9 Python, build/canonico e dieci suite browser nella Fase 0; Node/Python/build/canonico ripetuti nel §11). In questo tentativo verificati soltanto metadati, trasferimenti, Git e invarianti. Nessun merge/deploy, modifica R1/Supabase/Auth/main/V1 o avvio dell'implementazione.

### Verdetto e prossimo passo

**BLOCKED.** Per completare il gate occorre prima consentire la materializzazione: nelle impostazioni di rete dell'ambiente autorizzare `sdmntprnortheu.oaiusercontent.com` (poi generare un riferimento fresco con il connettore); per l'alternativa HTTP diretta servono `drive.google.com` e gli eventuali host di redirect effettivamente osservati. Non è disponibile in questa sessione uno strumento per proporre/modificare tale configurazione. In alternativa sono utilizzabili parti dell'archivio sotto 32 MiB.

Dopo lo sblocco restano obbligatori verifica ZIP/CRC/manifest/checksum, lettura completa e identificazione del contenuto, confronto dei contratti con R1/M1/M2/M3 e verifica dell'effettiva approvazione del pacchetto tecnico. Il titolo **READY FOR UI V2.1 IMPLEMENTATION GATE** non può essere assegnato a un pacchetto non ispezionato. Nessuna incompatibilità concreta del pacchetto è dichiarata senza accesso ai documenti.

**STOP per la Regia.** Questo è un checkpoint documentale di blocco, non la consegna dell'audit completo né un'autorizzazione a implementare.

## 13. Acquisizione definitiva da segmenti — gate tecnico di readiness

**Verdetto: READY FOR UI V2.1 IMPLEMENTATION GATE.** Pacchetto acquisito, integro secondo CRC e manifest dichiarati, identificato e confrontato con la baseline completa M2/M3. I precedenti blocchi di trasferimento e indisponibilità documentale sono **RISOLTI**. Questo verdetto porta il dossier al gate della Regia: non approva automaticamente il pacchetto tecnico né autorizza U0/U1 o modifiche applicative.

### 13.1 Ricostruzione e integrità — PASS

| Oggetto | Riscontro |
| --- | --- |
| `serien-v21-01.zip` | 24.000.186 byte; CRC PASS; contiene soltanto `serien-v21.part.aa` |
| `serien-v21-02.zip` | 12.753.080 byte; CRC PASS; contiene soltanto `serien-v21.part.ab` |
| Segmenti estratti | `.aa` = 24.000.000 byte; `.ab` = 12.752.894 byte |
| Ricostruzione | Concatenazione binaria `.aa` poi `.ab`, non concatenazione dei due contenitori ZIP |
| ZIP originale | **36.752.894 byte**, esattamente la dimensione attesa; archivio ZIP leggibile, non HTML |
| SHA-256 originale calcolato | `9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d` |
| CRC originale | PASS su tutte le entry; percorsi controllati prima dell'estrazione, nessuna traversal assoluta/`..` |
| Manifest tecnico `FILE_INDEX.md` | **197/197** voci: dimensioni e prefissi SHA-256 dichiarati (16 cifre) corrispondenti |
| Manifest design V2.1 | **143/143** voci corrispondenti |
| Inventario completo | 198 file, compreso l'indice tecnico stesso; SHA-256 completi calcolati in `file-inventory.json` |

SHA dell'archivio registrato come misura riproducibile: non è stato fornito un hash esterno originale con cui confrontarlo. I manifest contengono hash abbreviati, non firme di autenticità. Nessun errore di integrità osservato. Le copie estratte restano nello scratch, senza installare asset o controller nell'app.

Evidenze nuove: `evidence/final-package/integrity.json`, `manifests.json`, `file-inventory.json`. I file dei precedenti tentativi rimangono come cronologia, non indicano più un impedimento corrente.

### 13.2 Identità del contenuto — entrambi i pacchetti presenti

- **Dossier tecnico Codex** alla radice: README, indice; `spec/` (specifica, regole supplementari, constraints ferroviari, asset layout, test plan, status template); `contracts/` (66 controlli, 31 schermate, read models/intents, state machines, accettazione per microfase); `prompts/CODEX_PROMPTS.md` (U0–U9). È il pacchetto tecnico destinato al gate, non soltanto un export del design.
- **Design V2.1 approvato**, versione documentale `2.1.1-design`, in `design-baseline/serien-mainui-v21/`: audit, functional coverage, mapping master, decisioni/open issues/changelog, T-01/T-02; reference HTML con tre script demo, CSS/token, libreria componenti, asset, due PDF e screenshot. Il PDF Design ha 20 pagine. PDF letti tramite estrazione testo, immagini trattate come riferimento visivo mock, non prova ferroviaria.
- **V1 congelato** in `design-baseline/serien-mainui-v1/`: 40 file confrontati byte per byte con `design/main-ui-redesign@cf2c29a…`, tutti identici. Nessuna modifica/copia sopra il V1 del repository.
- JSON sintatticamente validi; CSV e JSON coerenti campo per campo: 66 righe nel binding tecnico, 143 nel master (66 controlli, 31 schermate, 24 migration, 17 aggiunte, 3 estensioni, 2 blocchi). I due contratti UI e state machine duplicati nel design sono identici alle copie tecniche.

La frase storica D-24/O-12/PDF «pacchetto tecnico non ancora preparato» descrive lo stadio del design precedente. La presenza verificata di spec/contracts/prompts risolve l'indisponibilità; l'approvazione tecnica del dossier e l'avvio di ogni microfase restano decisioni della Regia. Le istruzioni U0 incluse sono materiale da revisionare: **non sono state eseguite** (nessuna copia nelle specifiche attive, selector migration o modifica ai test/app).

### 13.3 Baseline effettiva e correzioni di contesto

Nuova verifica diretta remota: main `184cc9ba93a6b35493f365b2ffcb20ef0645963d`; Train Management `91722fbdf6671e69deebf645c3d8bf389212f421`; V1 `cf2c29a8112b37a53c62cb84fca44061942aea31`; checkpoint iniziale locale/remoto `5586ab4ef93327b0fb910f203c9993fab1be2e19` su **`codex/ui-v2-integration`**, working tree pulito. Baseline approvata antenata del branch dedicato.

Il dossier propone `codex/ui-v21` da `a67e0de` e M3 provvisoria `252d9c3`, con U8 subordinata a futuro merge/rebase. **Prevale il mandato corrente**: mantenere `codex/ui-v2-integration` da `91722fb`, con M3 già approvata e presente. Nessun nuovo branch, arretramento, merge/rebase o reintegrazione M3 necessari. Il confronto `252d9c3..91722fb` su app/src/CSS/HTML/asset è vuoto: il commit finale aggiunge collaudo/evidenze. Il dominio M2 `train-projects.js` resta invariato rispetto alla M2 approvata; M3 aggiunge dominio/vista e due righe di coordinamento nella vista Projects. Gate C M3 **già assolto** dalla baseline e dal mandato, non più un blocco attuale.

Nessun test baseline ripetuto: codice applicativo identico a `91722fb`, bundle e canonico con hash invariati dei §§9/10. I risultati precedenti conservano la loro provenienza: 254 Node, 9 Python, build/canonico e dieci suite browser nella Fase 0, poi Node/Python/build/canonico nel §11. Non sono nuove prove di questa acquisizione.

### 13.4 Mapping effettivo e soluzioni conservative

Il registro `evidence/final-package/CONTROL_COMPATIBILITY.csv` conserva tutti i **66** binding originali, nuovo DOM, callback, test, accettazione, microfase e risoluzione conservativa dell'audit su `91722fb`. `SOURCE_CODE_DOM_MAP.json` conserva anche le 31 schermate. Questi registri completano la mappa del §3: la copertura dichiarata è documentale, non certificazione di una UI integrata.

| Componente / CTRL | Baseline e dati reali | Nuova presentazione / lavoro consentito in futuro | Test da conservare |
| --- | --- | --- | --- |
| Shell/Auth/Menu 001–006, 014, 027, 060–064 | Boot auth, quality/applyQuality, handler rollingModels, modali, log, launcher esistenti | Skin e nodi spostati; proxy ai select; mantenere ID/boot, link XML, Exit to title disabilitato con motivo | access-gate, quality, Phase Zero/One, modal focus/Escape |
| Camera/HUD 004, 007–011, 048–049, 052 | nav, mountViewControls, real deriveSwitchAssistance/schemaSVG, routePreview 15 s, picking canvas | `.win/#cam/#nx`, canvas unico, diagramma reale read-only, disclaimer e avvisi; overlay non intercettano la scena | navigation/view-controls/next-switch, phase-three/four, turnout-interaction |
| Scambi/ambiente/missioni/mappa 012–015, 053 | switchSpecs, requestToggle, safetyByControl, day, statuses, railwayMapPath/locomotivePoint | Otto tile con motivi leggibili; stati reali; nessun KPI o blocco artificiale Next mission | turnout/guard, phase-one/zero, marker focus |
| Dock/stop/reset 016–026, 050, 054 | Fleet callbacks, selected, speed/velocity, max quattro treni, reset confermato | Tutte le card nel carosello, ID selezionato preservati, manometro vs throttle distinti, modale reset, STOP ALL momentaneo | train-deck/fleet/consist/R1, quarto treno nascosto, Space, reset cancel/confirm |
| **On the Layout** 028–030, 040, 055–056, 065 | compositionView/detachedView, getter reali, selezione comune, onFocus/copy, train-side-view | Binario laterale e lista UUID/ordine/lunghezza reali, sganciati sul binario; dialogo unico e ritorno focus | M1/M1.1, selezione scena/console/TM, focus, dirty guard |
| **Model Catalog** 014, 066, ADD-05/06/13 | PROJECT_CATALOG: 14 modelli, ruoli/dimensioni/miniature; updateModels con rollback | Filtri/anteprima/nomi solo vista; nessuna quantità inventario; non mutare modelId | catalogo native/Kenney, fallback, cambio modelli rifiutato |
| **Projects/Composer/Compare** 031–040, 057–058 | createTrainProjects, draft/confirmed, UUID posti, copy/link, compareProject cinque stati, capabilities | Vassoio, inspector e ghost slots; bottoni/scorciatoie locali; confermato read-only → Edit. Link picker solo nella bozza (`compareView(p,editable)`), come store.requireDraft; nessun confirm implicito | M2 domain/browser/lifecycle, 1+5, atomicità, STALE, dirty, no mutazioni fisiche |
| **Depot** 041–045, 059 | inventory.items, projectSlots dei confermati, assign/release/remove/reconcile, railwayInventoryView/generation | Schede virtuali, riepiloghi derivati, posti progettati e piastra fisica separati; targa trasferimenti senza controlli; conferma rimozione solo UX | M3/lifecycle, prenotazione esclusiva, modello uguale, release, reset, R1 in moto |
| Bell/Guarded stop/Log 046–047, 062 | guardedStops.bell.setMuted/snapshot, status reale interno, log(string) | Un solo controller bell per chip/Menu, UI Sound separato; status e ultimo messaggio persistenti, niente lampade mock | guarded-stop e lifecycle/audio, rifiuti R1 visibili anche con UI sound off |

**Adattamenti concreti da pianificare, non blocchi del motore:**

1. **Session summary / launcher.** `mountTrainManagement` non espone lo snapshot richiesto dalla riga logout né open(view)/launcher multipli: servono getter read-only con conteggi/dirty e API minima della vista. Store/identità rimangono privati, nessuna copia ferroviaria. `auth-gate.js` usa `addEventListener`, non `.onclick`: spostare il nodo non basta per la guard. Intercettazione UI prima del listener originale, consenso una sola volta e prevenzione della ricorsione/doppio logout; nessun cambio Auth.
2. **Conferme sincrone.** `discard()` restituisce booleano ed è usato da start/copy/close/focus; una modale stilizzata non può sostituire `window.confirm` lasciando i call site sincroni. Coordinare callback/promise solo nelle viste. Prima di conferma nessun cancel/reset; conferma applicata una sola volta. Reset conserva il corpo ferroviario e incrementa generation dopo conferma; M2/M3 rimangono in sessione.
3. **DOM e API effettive.** `setZoom` è interno a train-side-view, non metodo pubblico come può suggerire il contratto: mantenere i controlli o esporre un adapter UI minimo. Guarded-stop text/hazards sono interni: riusare/spostare il nodo status, senza reimplementare guardie. `#stop` e gli altri ID migrano sulla card selezionata; mantenerli finché consumati. Conservare anche data-switch/data-switch-hover/parent focus per gli attuali consumer.
4. **Stato e reference.** State machine `dialog` usa guard come destinazione senza elencarlo negli stati; wildcard dirty «any switch» non è un requisito di scartare la bozza al cambio tab TM. Prevalgono intenti/code e conservazione della bozza. `hasSession` mock include qualunque draft, mentre la guard reale è `dirty || hasProjects || inventory.size>0`: preservare la condizione reale. Confermati restano read-only; link disponibile dopo Edit, coerentemente con la reference verificata.
5. **Scala e messaggi.** `train.speed` è comando percentuale, `velocity` dato dinamico del motore: il gauge deve usare una scala derivata da grandezze reali, senza attribuire km/h fittizi. `log` ha testo ma nessun severity enum: colori UI conservativi, messaggio integrale, nessuna nuova categoria di allarme motore.
6. **Contraddizioni operative U1/U0.** Il pacchetto non decide univocamente l'ordine finale di legacy CSS (ASSET_LAYOUT propone alternative), e caricare CSS globali V1 può alterare regioni prima di U2. Verificare cascade e host in U1, usare soltanto il file di integrazione per isolamento, senza correggere il design frozen. Il prompt U0 comprende registry/migrazione selettori e tutti i browser: è lavoro futuro da autorizzare esplicitamente, non già eseguito in questa Fase 0.

### 13.5 Asset, dipendenze e reference

Font richiesti: **Cinzel Decorative 700, Federo 400, Cutive Mono 400**, da self-host con OFL. **Non sono inclusi WOFF/WOFF2 o licenze font**: acquisizione/verifica licenze e gate visivo appartengono a U1/U9, non sono certificati ora. V1 tokens contiene `@import` Google Fonts: la specifica asset ammette una rimozione documentata nella futura copia applicativa per offline, mantenendo intatta la baseline; `@font-face` non annulla da solo l'import remoto. Nessun font scaricato o dipendenza aggiunta in questa acquisizione.

I 28 PNG rotabili inclusi differiscono per bytes/hashing dai PNG applicativi, ma hanno **dimensioni e tutti i pixel RGBA identici**. Il fallback SVG differisce come bytes: riusare quello applicativo. Le copie design non vanno sovrascritte sugli asset del simulatore; topologia, manifest coupler e `train-side-layout` sono l'autorità per la geometria, non il mirror `sideLayout`. CSS/token/materiali/sprite disponibili; nuovo styling soltanto in copia applicativa/foglio integration dopo autorizzazione, V1 congelato.

Reference: V1 inline simula graph/RAF/treni; `tm-reference.js` mantiene SIM/PRJ/INV mirror e scenari; `tm-catalog.js` è una copia di catalogo per demo; `tm-shell-v21.js` simula HUD/campana/reset/guardie. **Nessuno dei tre script entra nel bundle applicativo**. T-01/T-02 sono presenti coerentemente nei contratti: HUD dal vero schemaSVG, campana dal vero controller, nessun dispatcher HUD o mock ferroviario.

**Smoke indipendente nuovo PASS:** Chromium headless, reference servita localmente, quattro click reali sui tab Layout/Catalog/Projects/Depot e verifica aria-selected, zero pageerror/HTTP locali falliti; screenshot Depot ispezionato. `reference-smoke.json`, script e nota sul primo harness conservati. Primo harness fallito per selettore `data-v` errato, corretto in `data-view` e ripetuto sullo stesso pacchetto invariato; il limite dell'harness è registrato. Font esterni deliberatamente non caricati nello smoke. Non è collaudo completo interattivo/accessibilità/responsive, prova R1 o gate font; la libreria è una raccolta di iframe/scenari della stessa reference, non componenti applicativi autonomi.

### 13.6 Sequenza aggiornata e gate residui

Adottare la struttura **U0–U9** del dossier, nel branch e sulla baseline del mandato: U0 intake/selector registry mirata al delta ancora da autorizzare; U1 asset/font/cascade; U2 shell/dialoghi; U3 overlay camera/HUD/bell/log; U4 sidebar; U5 dock; U6 Layout/Catalog; U7 Composer/Compare; U8 Depot già disponibile senza integrazione Git; U9 responsive/accessibilità/font/regressioni e gate finale. Per ogni passo: adapter minimo, test semantici preservati, evidence, commit/checkpoint reversibile e STOP. No delete progetto, DnD, apply globale, trasferimenti fisici o persistenza cloud.

**Non rimangono blocchi di acquisizione o incompatibilità che richiedano una modifica R1/store/backend.** Le correzioni di branch/base/stato M3 sono risolte dal mandato, le differenze di API hanno soluzioni di sola vista documentate sopra. Nessun merge su main necessario per iniziare il gate.

**Ancora da eseguire nelle rispettive fasi:** acquisizione dei font/licenze, gate visivo con font definitivi, verifica interattiva completa indipendente (lo smoke non la sostituisce), registry/cascade, test dei nuovi adapter, regressioni della futura UI, hardware fisico/fluidità. Non sono dichiarati PASS né sostituiti da screenshot mock. Prima di qualunque intervento applicativo serve **approvazione della Regia del pacchetto tecnico con questi adattamenti e autorizzazione della microfase nominata**.

Invarianti attuali PASS per diff vuoto contro `91722fb`: app/src/HTML/CSS/assets/Auth/Supabase/dipendenze/workflow intatti. Sole modifiche: rapporto, STATUS, PROGRESS ed evidenze di acquisizione/audit. **STOP per approvazione della Regia.**
