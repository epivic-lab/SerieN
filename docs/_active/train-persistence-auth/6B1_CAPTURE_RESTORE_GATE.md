# 6B.1 — Capture & Restore Gate

**PASS tecnico, in attesa del collaudo indipendente della Regia.**
5 novembre 2026. Branch esclusivo `feature/train-persistence-auth`, dalla baseline
main `9126788d3c68e43c0687e948db767bfccbbfc774`. Nessun merge/rebase dal branch
storico, nessun deployment, nessuna query o modifica a Supabase produzione.
Il checkpoint è il commit atomico che contiene questo report; SHA e verifica
remota sono riportati nella consegna. Ricavabile con `git log -1 --format=%H --
docs/_active/train-persistence-auth/6B1_CAPTURE_RESTORE_GATE.md`.

## Implementazione e utilizzo locale

Moduli in `src/persistence/`: capture, identità/catalogo versionati, schema e
validazione, hydrate/staging, integrazione runtime e adapter cloud disabilitato.
Nessun framework o dipendenza aggiunta. Riutilizzati Journey, costruttori,
asset manager, ingombri/collisioni e controlli R1.

API di laboratorio disponibile soltanto con `?persistenceTest=1` dopo il normale
gate Auth: `window.__serienPersistence.capture()` e
`await window.__serienPersistence.hydrate(documento)`. Il secondo restituisce
`READY_STOPPED`. La pagina resta ferma fino al pulsante **Riprendi**, mantenendo
speed/requestedSpeed/velocity originali; anche i comandi diagnostici di movimento
sono bloccati. Nessun controllo di salvataggio cloud è stato aggiunto alla UI.
`?diagnostics=1` è necessario solo per le operazioni della suite di collaudo.

La cattura è sincrona al confine degli eventi/RAF e rifiuta asset pendenti.
Hydrate copia e valida il documento, congela gli ingressi durante gli await,
ricostruisce gruppi fuori scena con revisioni verificate, controlla riferimenti,
Journey e ingombri e poi applica lo stato. Non chiama reset, initializeJourney,
updateModels o comandi di scambio. Una candidata invalida viene smaltita; errori
nell'applicazione UI ripristinano i riferimenti e lo stato precedente. Il
riferimento al tempo reale viene aggiornato al thaw e al comando Riprendi.

`collectRailwayState()` resta una vista derivata: non è il serializer.
La struttura JSON Schema 6A.1 è conservata senza rinominare/inventare campi.
La validazione copre tutto il vocabolario dello schema fissato, senza coercizioni
né default. Il profilo operativo R1 rifiuta -1 e inventario fuori scena.

## Campi effettivamente conservati

| Gruppo | Contenuto |
|---|---|
| Documento | schemaVersion, stateId, workspaceId/layoutId, topologyHash, engineRevision R1, resumePolicy STOPPED |
| Modelli/esemplari | ID durevoli distinti da mesh.uuid, revisione/digest, modello effettivo e costruttore nativo, ganci, modalità legacy/explicit, nome e orientamento +1 |
| Convogli | ID consist, membri ordinati, locomotive e carri, slot contigui e nomi/descrizioni nativi ed effettivi |
| Movimento | Journey completo, occorrenze ripetute/sign/start/end, position/travel/lastBlock, location verificata, speed/requestedSpeed/velocity/dir/odometer/lights |
| Sicurezza | Guard, lookahead, latch e probe; +Infinity normalizzato a null solo in guard.distance e ricostruito lì |
| Contesto | loop, previousLane, mode, section storica, laps verificato e resetSeed |
| Sganciati | Identità, Journey e location completi; animationDistanceMm firmato per fase ruote |
| Scambi | Otto ID canonici e booleani; applicazione diretta, zero comandi/eventi impliciti |
| Missioni/tempo | Missione e tutti i flag/progresso; tickCount, step 1/60, accumulatore frazionario e preferenza wasPaused |
| UI | Selezione, tre console e LRU completo, giorno, modello, qualità, camera/preset/target/zoom/fov, minimizzazione HUD e mute campana |

TickCount è registrato nel callback del clock applicativo, senza cambiare
FixedClock o la fisica. La fase ruote viene registrata allo sgancio e applicata
una volta durante hydrate: nessun nuovo aggiornamento per-frame degli sganciati.
I test diagnostici che avanzano direttamente il motore rimangono strumenti di
debug, non una misura del tempo del clock applicativo.

Non sono persistiti DOM, Three.js, texture, mesh, cache/GPU, hover, notifiche,
preview timer, animazioni degli effetti, audio context, interpolazione/damping,
wall time o performance.now. Pose/assistenza/HUD/miniature sono ricostruiti.
La qualità Auto si riadatta al dispositivo. L'audio non viene sbloccato dal restore.

## Risultati e criteri R0

**30 controlli browser PASS**: [risultati](evidence/browser-results.json),
[log](evidence/browser-gate.txt), [schermata](evidence/ready-stopped.png),
[documento a quattro treni](evidence/four-train-snapshot.json).
Capture → hydrate → capture è uguale **per tutti i campi**, normalizzando soltanto
stateId (nuova identità della cattura). Nessuna tolleranza numerica nasconde
perdite nei dati. La prova con frame controllati ha rilevato e corretto anche
una deriva della camera di circa 3e-13 dovuta al damping.

| R0 pertinente | Esito 6B.1 |
|---|---|
| P01 identità | PASS: ID/assegnazioni conservati, anche su pagina/browser context nuovo con stesso documento |
| P02 composizione | PASS profilo R1: ordine, ganci, tre/quattro convogli; -1 respinto in attesa 6D |
| P03 detached | PASS: storia/posizione/fase ruote; contatto esatto lecito riconosciuto con ganci R1; regressione giunto e riaggancio PASS |
| P04 locomotive | PASS: cinematica e campi operativi completi; guard/probe conservati dal DTO |
| P05 scambi | PASS: otto stati e changes identici, nessun dispatch durante hydrate; audio inattivo prima di Riprendi |
| P06 UI/missioni | PASS: DTO completo, LRU del quarto treno e viste conservati |
| P07 tempo | PASS: salti virtuali di 600 e 86400 s, zero tick/movimento prima di Riprendi; primo frame senza catch-up |
| P08 round-trip | PASS: native e Kenney, browser effettivo e classi Journey/stock reali nei test Node |
| P09 atomicità | PASS locale per tutte le costruzioni interrotte e rifiuti browser non distruttivi; atomicità DB NON TESTATA |
| P10/P11/P12 | Protocollo idempotenza/CAS/multisessione documentato; nessun cloud/journal/sync operativo e nessun PASS DB anticipato |
| P13 corruzione | PASS locale: versione/topologia/storia/orientamento/geometria/vista/collisione rifiutati; GLB con checksum errato non produce fallback |
| P14/P15 accesso | Adapter chiuso e test getUser+allowlist; zero richieste esterne durante il gate locale. Isolamento RLS di produzione NON RICOLLAUDATO |
| P16 asset | PASS restore Kenney e pin/digest; nessuna estensione a nuovi modelli o librerie |
| P17 ricovero | Inventory vuoto R1; funzionalità di ricovero rinviate a 6D |
| P18 regressioni | PASS per le suite pertinenti sotto; benchmark completo 5D/hardware NON RIPETUTO |

La matrice originale è conservata in `reference/R0_ACCEPTANCE_MAPPING.md`, senza
rinumerare P01–P18. Il contratto integrale R0 non è disponibile oltre alle fonti
storiche indicate; non si dichiarano coperti requisiti non presenti.

## Regressioni e invarianti

- Baseline prima del codice: npm test **38 file PASS**, build e **9 Python PASS**.
- Finale: `npm test` **39 file PASS**; esecuzione senza isolamento **231 test,
  zero fallimenti**; `npm run build` PASS; **9 test Python PASS**. Log in evidence.
- Browser 5C: **11 scenari PASS**, frontali, convogli lunghi, sganciati/scambi,
  inserimento occupato, approccio scambi, aggancio in curva, frame rate, tre
  anelli, modelli/ingombri, storia detached e riaggancio al giunto.
- Browser Fase 0: circuiti reali, quarto treno/LRU, runaround, inversione,
  STOP ALL, HUD e quattro viewport PASS, zero errori JS/asset mancanti.
- Sei miniature ricatturate: **hash immagine e bounds identici** per native e
  Kenney. Aggiornato soltanto nativeModelSha256 del manifest per i nuovi hook.
- [Invarianti](evidence/invariants.json): layout, rete, Journey/FixedClock,
  step/guard/conflicts/consist e costruttori ferroviari byte-identici alla baseline;
  sezione binari/scenografia di app.js identica. Topologia SHA-256
  `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`.
  Restano gli stessi 150 rail mesh/75 beds della baseline: nessuna geometria nuova.

Il gate finale usa Chromium/SwiftShader e un scheduler di test che invoca il
**vero callback tick/RAF** con wall time controllato; non sostituisce motore,
Journey o renderer. Una precedente esecuzione con RAF browser e Playwright clock
ha passato gli stessi 26 controlli iniziali (prima dell'aggiunta dell'oracolo sul
primo resume e della collisione). Le regressioni 5C/Fase 0 usano RAF ordinario.
Il bypass Auth è esclusivamente un'intercettazione Playwright su loopback: nessun
bypass nel prodotto e nessuna chiamata a Supabase reale.
La suite S6 dedicata richiede un observer/profiling bundle e porta 8003, assenti:
il tentativo di avvio è NOT VERIFIED per quel harness. Guardia e campana sono
coperte dai test Node e dalle altre prove indicate; nessun PASS S6 integrale.

## Sicurezza, cloud e limiti

[Proposta SQL/RPC e privilegi minimi](SUPABASE_SAVE_PROPOSAL.md): proprietà da
`auth.uid()`, allowlist/RLS sempre applicate, transazione, CAS, request_id e storico.
L'assenza dei GRANT applicativi authenticated è una condizione attestata dalla
Regia: non è stata aggirata o ricontrollata sul DB reale. Nessuna migrazione,
service_role, nuovo login, Edge Function, broker, autosave o pagamento.
Adapter disabilitato anche se gli si passa un client; save/load non inviano rete.
La futura integrazione deve passare il client Google esistente, non duplicarlo.

Gli UUID di workspace/layout del laboratorio sono locali, non provano proprietà.
Per importare su pagina nuova il test usa `bindLocalContext` esplicito, che non
concede accesso cloud. In futuro il binding viene letto dal server autenticato.
Nessun journal durevole, UI file import/export o recupero automatico da crash in
questa microfase. L'API hydrate accetta oggetti JSON già analizzati: un futuro
parser/trasporto dovrà respingere chiavi JSON duplicate prima del parsing.

Catalogo locale fissato ai builder baseline e ai sei GLB, con verifica geometrica
in staging e checksum dei GLB; approvazione/validazione server del catalogo resta
al futuro gate cloud. Sono rifiutati asset pendenti, nonfinite, DOM/classi/cicli,
proprietà sconosciute e payload oltre 2 MiB, senza troncamento. Nessun adattamento
significativo di geometria, topologia o motore è stato necessario. Orientamenti
-1 e ricovero restano fuori profilo; nessuna migrazione silenziosa.

Touch/GPU fisici, benchmark completo 5D, crash DB, concorrenza reale tra due
sessioni, revoca concorrente e secondo account Google autorizzato restano
**NOT VERIFIED**. La persistenza cloud **non è operativa**.

**STOP 6B.1.** Unica prossima azione: collaudo indipendente della Regia prima di
qualunque autorizzazione DB o primo salvataggio cloud.
