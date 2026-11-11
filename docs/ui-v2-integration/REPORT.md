# UI V2.1 — INTEGRATION READINESS REPORT

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
