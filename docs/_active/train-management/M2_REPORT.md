# M2 — Milestone A, compositore

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

## Stato

Milestone A IN CORSO. Nessun verdetto READY finché integrazione e collaudo non sono completati.

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
