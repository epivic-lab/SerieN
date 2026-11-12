# M2 — Milestone A, compositore

**M2 READY FOR REVIEW — esito tecnico conclusivo. STOP per audit della Regia.**

Mandato 11 novembre 2026: completare esclusivamente A, in incrementi con commit/checkpoint, poi STOP per Regia. Questa istruzione specifica autorizza l'intera milestone e prevale sulle pause generiche fra microfasi di AGENTS. Nessun M3, persistenza, merge, deploy o redesign.

## Baseline verificata

- Checkout iniziale pulito `work` a `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`.
- `git ls-remote origin refs/heads/main`: `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, coincidente con il mandato. Fetch e nuovo branch `codex/train-management-m2` da tale commit; nessuna modifica ad altri branch.
- Baseline: 234 Node PASS, build PASS (evidence/M2/baseline-*).
- M1/M1.1 presenti: catalogo 14 modelli, viste pure, PNG laterali/manifest, consistLayout e vista SVG con zoom/Fit.
- M2-A non reperita come documento nel checkout: contratti verificati nel codice effettivo `src/fleet-commands.js`, `src/consist.js`, `src/railway-state.js`, reset e dispatcher in app.js. Nessuna deduzione da analisi non disponibile.
- Tre migrazioni versionate presenti; workflow Supabase isolato su main/PR, senza deploy. Backend/Auth/RLS/RPC/privilegi restano fuori perimetro, nessun collegamento al cloud per i progetti.

## Incremento 1 — dominio

Catalogo normalizzato delle stesse 14 identità del manifest M1.1. Store in RAM separato per bozza e progetti confermati, copie difensive, UUID progettati distinti da UUID fisici, limite una locomotiva iniziale e cinque rimorchi. Aggiunta/rimozione/ordine/orientamento, rinomina, conferma/annullamento, dirty state, copia per valore dal reale. Confronto ordine/modello/identità/orientamento e generazione per reset. Indicazioni conservative dei comandi R1, senza dispatcher nuovo o applicazione di progetti.

Sette nuovi test di dominio: lifecycle e rollback, modelli identici distinti, guardie e atomicità degli errori, copia senza effetti, modifiche esterne/reset, limiti R1. Evidenze in evidence/M2/domain. Interfaccia M2 e integrazione browser ancora NOT VERIFIED a questo checkpoint.

## Limiti intenzionali

Confermare significa conservare un progetto nella sessione corrente, senza effetti sulla simulazione. Ricaricare/chiudere la pagina perde i progetti: persistenza rinviata a C. Nessun inventario deposito o assegnazione di materiale fisico. Nessun pulsante di applicazione globale. I comandi fisici singoli restano nelle console R1 già esistenti; il compositore descrive i vincoli, non attribuisce permessi spaziali. Orientamento per veicolo solo progettato, non disponibile nel motore R1.

## Stato al checkpoint di dominio (storico)

Milestone A IN CORSO a quel checkpoint. Nessun verdetto READY finché integrazione e collaudo non sono completati.

## Incremento 2 — editor e vista laterale

Vista Projects nella finestra M1, catalogo unico di 14 modelli. Creazione/rinomina, aggiunta e rimozione, frecce per ordine rimorchi, orientamento individuale, conferma e modifica dei progetti della sessione, annullamento con ripristino del confermato. Una sola bozza aperta; prima di sostituirla o chiudere con Close/Escape/Focus 3D si chiede se scartare le modifiche. Navigare tra le viste conserva la bozza; reload/chiusura pagina usa beforeunload anche in presenza di confermati, che sono solo in RAM.

Copia dal reale con snapshot per valore e UUID progettati nuovi; confronto per posizione, modello, ordine e identità fisica originaria. Anche i progetti indipendenti possono scegliere il treno reale di confronto. Cambiamenti esterni producono CHANGED; un reset invalida la generazione senza toccare progetti/bozze. L'unica riga aggiunta ad app.js notifica tale invalidazione dopo il reset già esistente.

La stessa pipeline SVG/PNG M1.1 disegna le bozze. Il flip usa ganci front/back scambiati e negati e origine asimmetrica corretta; la locomotiva resta prima. Zoom, scroll e Fit conservati, lunghezza dai ganci, fino a sei elementi. Nessun renderer/WebGL o asset duplicato. Per sostituire la locomotiva occorre prima rimuovere i rimorchi e la locomotiva esistente, poi scegliere quella nuova; limite intenzionale dell'editor iniziale.

### Verifiche incremento 2

- **PASS:** 245 Node, 9 Python, build e rigenerazione canonico senza differenze. Prove in evidence/M2/ui.
- **PASS:** 13 gruppi funzionali del browser sul bundle minificato `0e644a6d36243e591a75332574eb1bfe0256940548aeeff634ec27ff741d1941`; fixture di autenticazione locale e rendering su richiesta, esplicitamente NON prova runtime continuo.
- Creazione/add/remove/order/flip, due tank identici distinti, massimo cinque rimorchi, anteprima e misura indipendente della lunghezza, zoom/scroll/Fit, conferma senza effetti ferroviari e annullamento: PASS.
- Close/Escape/nuova bozza/Focus3D con modifiche rifiutate, conservazione durante navigazione, nomi resi come testo (payload markup inerte): PASS.
- Copia reale, confronto, sgancio/riaggancio reali esterni con identità ripristinate, reset con riferimenti STALE e bozza conservata, selezione M1/console/scena: PASS.
- Desktop 1440×1000, tablet 1024×768 e 768×1024, tap orientamento/Fit e creazione/conferma Kenney da touch, controlli almeno 44px e nessun overflow: PASS. Screenshot salvati; hardware touch/GPU NOT VERIFIED.
- Zero page errors, richieste fallite e risposte HTTP ≥400 nel test finale.
- Primo tentativo FAIL del solo harness: confronto della misura a 567,25 mm formattato da Python con arrotondamento differente da JS, più metodo Playwright di cleanup non disponibile. Corretto l'oracolo con tolleranza indipendente di 0,051 mm e cleanup browser. Log originale conservato; secondo tentativo PASS; test finale ampliato PASS. Nessun FAIL applicativo dedotto o nascosto.

### Checkpoint

Push Git da CLI indisponibile per assenza credenziali. L'utente ha autorizzato esplicitamente il connettore GitHub dopo il blocco automatico. Primo commit remoto `2743bcddf110b30b2a34dadcdf7bfb6621947c62`: albero `ecd521d1ba7ab1f75af462903aa3bab154fedaf8`, identico al precursore locale `d80082f`, preservato nel solo branch locale `codex/train-management-m2-local-domain`. Il branch di lavoro è stato ricreato dal checkpoint remoto verificato senza reset, rebase o perdita di lavoro. Per i checkpoint successivi si conserva analogamente il precursore locale e si verifica l'identità dell'intero albero prima di usare il commit remoto del connettore. Nessuna modifica a main.

A questo checkpoint UI completata; gate runtime continuo e regressioni browser R1 ancora NOT VERIFIED. Prossima azione: collaudo finale nel perimetro A.

## Incremento 3 — regressioni e lifecycle

Runtime applicativo identico al checkpoint remoto `59f54f1fac0c3a837b4f059d582320ac574b96e8`; questo incremento aggiunge test, documentazione ed evidenze. `evidence/M2/final/invariants.json` confronta tutte le modifiche con la baseline: nessun percorso non autorizzato, app.js identica salvo notifica reset, CSS precedente preservato integralmente con aggiunte del compositore, nessuna modifica a sorgenti ferroviarie, asset, canonico, Auth, Supabase, dipendenze o workflow. SHA-256 canonico invariato `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`.

### Suite browser di regressione

- **PASS R1/5C:** tutti gli undici scenari storici conservati: frontali, composizioni lunghe, sganciati/scambi, inserimento occupato, approccio scambio, aggancio in curva, frequenze frame, circuiti misti, cambio modello e spazio, storia del carro sganciato, riaggancio al giunto. Wrapper riproducibile `tests/run-train-project-regressions.py railway`: sole fixture locali di auth/render, asserzioni e stepping ferroviario storici invariati. JSON di ogni scenario e provenienza sorgente/bundle in evidence/M2/final/regressions/railway.
- **PASS console/deck:** velocità indipendenti, marker reali, identità native/Kenney, quarto treno fuori dalla finestra delle tre console, focus, desktop/tablet/telefono e un solo contesto WebGL. La suite include il suo 404 intenzionale per testare il fallback dell'immagine: non è un asset mancante del prodotto. Wrapper `deck`, prove in final/regressions/deck.
- **PASS Phase Zero:** tre circuiti reali, quarto treno/LRU, guardie scambi, runaround nei due rami, retromarcia, arresto globale, HUD e posizioni canoniche; quattro viewport. Wrapper `phase-zero`, prove in final/regressions/phase-zero.
- **PASS M1:** consultazione, selezione condivisa, stato ferroviario immutato dal browsing, ordine in retromarcia, identità sganciato, focus 3D, Escape e ritorno focus, catalogo di 14, touch sul bundle minificato. Suite esistente senza modifiche; parte desktop sul bundle leggibile ricostruito, touch sul minificato. Prove in final/m1.
- **PASS M1.1:** ganci/scala comuni, ordine, nessun rebuild grafico nei frame/retromarcia, sgancio/riaggancio live, zoom/scroll/Fit, fixture lunga sei elementi, desktop/tablet, un solo WebGL. Script originale invariato; wrapper `tests/run-train-side-regression.py` attende 250 ms di scroll stabile prima del tap Fit. Tutte le asserzioni conservate. Il primo tentativo originale ha avuto timeout su Fit dopo swipe nella sola fixture lunga; prova isolata successiva PASS. La causa precisa del primo timeout non è dimostrata. Conservati log FAIL, probe dei click/scroll e provenienza della ripetizione PASS in final/side* e final/m2-side-*.
- **PASS lifecycle M2:** una bozza sporca e i progetti confermati solo in RAM attivano il guard beforeunload; scartare una nuova bozza rimuove il guard; dispose rimuove handler, dialog e azione del launcher. Venticinque cicli mount/open/dispose senza residui osservabili. `tests/browser-train-project-lifecycle.py`, prova DOM/SVG senza simulatore/Auth/WebGL; evento beforeunload cancelable sintetico, presentazione del prompt nativo specifica del browser NOT VERIFIED.
- **PASS inventario Supabase locale:** `verify-supabase-alignment.py --check-files-only` conferma inventario esatto delle tre migrazioni, checksum, evidenze versionate e token dei gate SQL. Nessun test DB/cloud o modifica Supabase in A.

Queste suite deterministiche con rendering su richiesta non sostituiscono il gate nativo separato sotto. Non certificano accelerazione GPU o touch fisici.

### Gate nativo conclusivo — PASS

Script `tests/browser-train-projects-runtime.py`, bundle minificato reale con hash verificato sia su disco sia dalla risposta HTTP. HTML locale derivato da index.html esclude solo l'avvio Auth, senza cambiare il prodotto. Nessun override di RAF/cancelRAF/timer/tick/render, nessuna pausa o passo diagnostico: tre treni realmente mossi dal clock R1. Profilo Low tramite controllo esistente, Chromium/SwiftShader, 1024×768 e 768×1024.

**11 gruppi PASS, 22 checkpoint, 486 frame nativi osservati in 1.291,7 secondi.**

- Copia e modifica con ordine/orientamento e conferma durante la marcia dei tre treni: PASS; identità fisiche conservate e distanze realmente aumentate.
- Tre cicli chiusura/riapertura conservano il progetto mentre tutti e tre avanzano: PASS.
- Entrambi i comandi R1 reali di aggancio/sgancio rifiutati durante il movimento; messaggi di stop e stato reale immutato: PASS.
- **13 click nativi trusted** registrati con pointerType mouse/touch. Edit/flip/confirm da mouse, edit/flip/confirm/zoom/Fit touch in landscape e portrait durante la marcia: PASS. Per la coesistenza e per i comandi ferroviari il gate usa anche i normali eventi DOM dei pulsanti; i comandi del motore non sono chiamati direttamente dal test. La suite funzionale separata copre inoltre i flussi con input Playwright reali.
- Sgancio e riaggancio effettivi da fermo, altri due treni ancora in moto; carro rimane sul binario, identità e sequenza ripristinate, confronto CHANGED → MATCHING: PASS.
- Selezione, lista M1, console attiva, anteprima e posizioni mondo/3D coerenti: PASS.
- RAF nativo verificato per identità e stringa native-code a ogni checkpoint; contesto WebGL attivo al controllo finale. Zero errori pagina/console, richieste fallite e HTTP ≥400.
- Risorse Three stabili a **348 geometrie / 44 texture** nei 22 checkpoint. Prova osservazionale del carico verificato, non certificazione universale dei leak.

**Limite concreto:** SwiftShader non è fluido: circa **0,375 frame/s**, intervallo mediano 2.533,2 ms, p95 3.316,5 ms. Tempi dell'intera sessione, compresi input e acquisizioni; non benchmark isolato né confronto prestazionale equivalente alla 5D. GPU/tablet fisici e fluidità su hardware reale **NOT VERIFIED**. Questa limitazione era già aperta nella baseline M1-V1; non viene trasformata in un PASS hardware.

### Provenienza dei tentativi runtime

I tentativi precedenti restano intatti, con i loro esiti FAIL/BLOCKED:

1. `final/native-first`: timeout dello screenshot Locator sul canvas, dopo checkpoint con tre treni e RAF nativo.
2. `final/native-second`: screenshot ritagliato riuscito e un ciclo aperto/chiuso; timeout del click Playwright successivo (90 s). Nel gate conclusivo acquisizioni pagina e input CDP evitano tali attese del driver mantenendo il rendering continuo.
3. `final/native-third`: errore dell'harness, che cercava la copia del treno 0 mentre l'impostazione delle velocità tramite console aveva selezionato il treno 2. Corretta con selezione esplicita del treno 0. Nessuna correzione applicativa introdotta per questi tentativi.
4. `final/native`: esecuzione conclusiva completa PASS, stesso hash applicativo; registrati anche mouse/touch nativi CDP trusted. Sorgenti dei tentativi precedenti, risultati e timestamp conservati. I tentativi falliti non sono conteggiati come PASS.

## Consegna e verdetto

**M2 READY FOR REVIEW**, esclusivamente Milestone A. Gli otto gruppi di suite browser conclusive sono PASS, così come 245 Node, 9 Python, build, canonico e controlli locali delle migrazioni. La verifica remota del commit conclusivo resta condizione della consegna; SHA effettivo e coincidenza locale/remoto nella risposta finale. Non è approvazione della Regia né autorizzazione di release.

Nessun problema applicativo riprodotto nei controlli conclusivi. Restano i limiti dichiarati: RAM soltanto, niente applicazione globale dei progetti, orientamento solo progettato, operazioni reali dalle console R1, cambio locomotiva dopo rimozione dei rimorchi, nessuna prova su hardware fisico e presentazione nativa del prompt beforeunload non verificata. Nessun nuovo renderer/dipendenza, nessuna modifica a R1, Auth, permessi/backend, redesign o layout canonico; sola notifica reset in app.js.

Principali file applicativi: `src/train-projects.js`, `src/train-projects-view.js`, `src/train-management.js`, `src/train-side-layout.js`, `src/train-side-view.js`, aggiunte locali a style.css e hook reset in app.js. Test, documenti ed evidenze completano il diff.

### Evidenze principali

- [Matrice finale](evidence/M2/FINAL_GATES.json), [invarianti/hash](evidence/M2/final/invariants.json), [sorgenti testate](evidence/M2/final/sources.json).
- [Browser funzionale M2](evidence/M2/ui/browser.json), [sei veicoli desktop](evidence/M2/ui/six-vehicle-project.png), [tablet portrait](evidence/M2/ui/tablet-portrait.png).
- [Runtime nativo](evidence/M2/final/native/result.json), [frame grezzi](evidence/M2/final/native/frame-observations.json), [progetto nel runtime nativo](evidence/M2/final/native/project-native-portrait.png), [convogli reali](evidence/M2/final/native/real-trains-native.png).
- [Undici scenari R1](evidence/M2/final/regressions/railway/docs/phase-5c-close/acceptance.json), [lifecycle](evidence/M2/final/lifecycle.json).

### Riproduzione

Dalla root, dipendenze già previste dal progetto e Python Playwright/Chromium disponibili: `npm test`, `npm run build`, `python3 -m unittest discover -s tests -p '*_test.py'`. Server `python3 -m http.server 8000`; poi `python3 tests/browser-train-projects.py`, `python3 tests/browser-train-projects-runtime.py`, `python3 tests/browser-train-project-lifecycle.py`, `python3 tests/run-train-project-regressions.py railway` (anche `deck` e `phase-zero`), `python3 tests/browser-train-management.py`, `python3 tests/run-train-side-regression.py`. Script con output selezionabile via env documentata in sorgente; il runtime software può richiedere oltre venti minuti. I wrapper non sovrascrivono le evidenze storiche.

### STOP e proposta M3

Milestone A conclusa tecnicamente e in attesa di audit indipendente della Regia. **M3 e persistenza non iniziate; nessun merge o deploy.** Proposta successiva M3-A: definire identità e stati dell'inventario fuori scena e un contratto approvato per ingresso/uscita fisica. Gli sganciati sul binario rimangono sempre materiale sul plastico. Nessuna materializzazione/rimozione arbitraria; eventuale contratto ferroviario e successiva persistenza Supabase richiedono autorizzazioni distinte.
