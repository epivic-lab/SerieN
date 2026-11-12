# SERIEN — AUTORIZZAZIONE U8
## Depot Virtuale M3 — UI V2.1

**Modello: GPT-6 — Reasoning High**

### 1. Mandato della Regia

La Regia ha esaminato e **APPROVATO U7** attraverso verifica indipendente del codice, del checkpoint GitHub, delle evidenze funzionali e visuali.

Sei autorizzato a eseguire esclusivamente:

**U8 — Depot Virtuale, Inventory, Reservations & Physical Stock Separation.**

Repository: `epivic-lab/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U7 approvato:

`cca11fb76d36e9688f41392fa1592b9a3514dce9`

Checkpoint U6:

`6f8a28a4fe49875dc499872454d5128b2860bdfc`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica HEAD locale/remoto, branch, upstream, ancestry e working tree prima di intervenire.

**U9 NON AUTORIZZATA.**

Nessun merge, deploy o aggiornamento della main.

### 2. Fonti vincolanti

Consulta:

- `AGENTS.md`
- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U7_REPORT.md`
- Design V2.1 approvato e reference frozen.

Contratti principali:

**A03 — Confirmation Coordinator**

**A11 — Depot Inventory**

**A12 — Progressive CSS Integration**

Controlli autorizzati:

`CTRL-041, CTRL-042, CTRL-043, CTRL-044, CTRL-045, CTRL-059`.

L'autorità visiva è il design Claude; quella funzionale è il dominio M3 esistente.

Non importare script, store o dati mock dalla reference.

### 3. Obiettivo U8

Migrare l'interfaccia Depot alla versione V2.1, preservando integralmente il dominio M3.

Le funzioni richieste sono:

1. Visualizzazione inventario virtuale.
2. Aggiunta di record virtuali.
3. Distinzione Available/Reserved.
4. Prenotazione per slot di progetto M2 confermato.
5. Release di una prenotazione.
6. Rimozione protetta di record disponibili.
7. Visualizzazione dei progetti confermati e relativi slot.
8. Informazioni di riconciliazione e notifiche reali.
9. Separazione esplicita dai rotabili fisici sui binari.
10. Responsive, focus, keyboard e lifecycle.

**Depot rimane esclusivamente virtuale e session-only.**

Non esiste un contratto R1 sicuro per il trasferimento generico Depot↔binari.

Non implementarlo.

### 4. Perimetro tecnico

File prioritariamente autorizzati:

- `src/depot-view.js` — UI e adapter di presentazione.
- `src/train-management.js` — esclusivamente wiring del coordinator condiviso.
- `src/ui/guard-modal.js` — estensione compatibile soltanto se indispensabile.
- `ui/css/serien-ui-integration.css` — appendice scoped U8.
- Test ed evidenze U8.

**File protetti e non modificabili:**

- `src/depot-inventory.js`
- `src/train-projects.js`
- `src/train-projects-view.js`
- `src/train-side-layout.js`
- Catalogo sorgente.
- Motore R1 e dispatcher.
- Topologia e geometria.
- Auth, Supabase, RLS.
- Asset ferroviari.
- Workflow di pubblicazione.

Non aggiungere un secondo inventario o uno store parallelo.

### 5. Identità e separazione dei domini — A11

La UI deve distinguere rigorosamente quattro entità:

**Catalog model**

Definizione immutabile di un tipo di rotabile.

**Virtual inventory record**

Istanza virtuale off-scene creata tramite `inventory.add(modelId)` con propria identità.

**Planned project slot**

Veicolo virtuale appartenente a un progetto M2 confermato, identificato dal proprio vehicleId.

**Physical railway vehicle**

Oggetto reale R1/M1 sui binari, con UUID fisico e posizione ferroviaria.

Queste quattro identità NON sono intercambiabili.

Due record virtuali dello stesso modello devono avere identità differenti.

Un catalog model non rappresenta una quantità posseduta.

Una prenotazione virtuale non crea una locomotiva o un vagone nella scena.

L'uguaglianza dei modelId non autorizza a sostituire identità fisiche o slot M2.

### 6. Aggiunta record virtuale — CTRL-041/059

Riutilizza:

`inventory.add(modelId)`

Il selettore modello è soltanto stato di presentazione.

Preserva le definizioni di `PROJECT_CATALOG`.

Ogni inserimento valido deve produrre un nuovo record con l'identità generata dal dominio M3.

Verifica:

- Stesso modello aggiunto più volte.
- Identità uniche.
- Codice virtuale progressivo originale.
- Stato iniziale Available.
- Nessuna posizione ferroviaria.
- Nessuna mutazione di treni, detached, scene o progetto.
- Nessuna quantità fittizia riferita al catalogo.

Non alterare la generazione degli ID.

### 7. Prenotazione — CTRL-042

Usa soltanto:

`inventory.assign(itemId,projectId,vehicleId)`

I target devono provenire da:

`projectSlots(projects.snapshot.confirmed)`

Non includere gli slot esclusivamente presenti nel draft.

Una prenotazione è lecita soltanto se:

- Il record è disponibile.
- Il progetto è confermato.
- Lo slot esiste ancora.
- Il modelId coincide.
- Lo slot non è già riservato da un altro record.
- Il record non possiede un'altra prenotazione.

Il modello uguale non equivale all'identità dello stesso slot.

Non assegnare automaticamente record a uno slot diverso quando cambia un progetto.

Le opzioni di selezione devono derivare dallo stato M3 corrente.

In mancanza di target compatibili, il controllo di prenotazione deve risultare disabilitato e fornire una spiegazione leggibile.

Non introdurre fake stock, matching arbitrario o prenotazioni di bozza.

### 8. Available, Reserved e notices

Presenta gli stati originali:

- Available for planning.
- Reserved for planning.

Le card devono mostrare dati reali:

- Codice virtuale.
- Modello e immagine.
- Identità record.
- Stato.
- Progetto e slot di prenotazione, quando esistono.
- Eventuale notice originale di riconciliazione.

Il messaggio di una prenotazione rilasciata automaticamente deve corrispondere all'effettivo risultato del dominio M3.

Non inventare eventi ferroviari.

Non trasformare una notice virtuale in un allarme R1.

### 9. Release reservation — CTRL-043

Riutilizza:

`inventory.release(itemId)`

La Release deve:

- Agire esclusivamente sul record virtuale interessato.
- Rimuovere la sua prenotazione.
- Conservare identità e modelId del record.
- Portare il record in Available.
- Preservare gli altri record e le altre prenotazioni.
- Non modificare alcun oggetto ferroviario fisico.

Integra il coordinator di conferma dove previsto dal contratto A03/A11.

Prima dell'esecuzione rivalida che l'identità del record e la prenotazione siano ancora quelle per cui è stato chiesto consenso.

Un consenso obsoleto non deve rilasciare una nuova prenotazione eventualmente assegnata nel frattempo.

### 10. Remove virtual record — CTRL-044

Riutilizza:

`inventory.remove(itemId)`

**La rimozione deve essere protetta da consenso UI.**

Prima dell'esecuzione verifica nuovamente:

- Esistenza del record.
- Identità del record.
- Stato Available.
- Assenza di prenotazione.
- Coerenza del contesto oggetto della conferma.

Cancel, Escape e backdrop non devono modificare l'inventario.

Confirm esegue la rimozione una sola volta.

Doppio click o doppio Enter non devono produrre una seconda operazione.

Se il record è Reserved, Remove rimane disabilitato e il dominio continua a rifiutare la rimozione.

Non aggirare la protezione eseguendo implicitamente Release+Remove.

L'utente deve prima rilasciare la prenotazione, mediante l'azione distinta.

### 11. Coordinator e lifecycle — A03

La fase U7 ha già integrato un coordinator condiviso fra Shell e Projects.

**Riutilizza il medesimo coordinator anche per Depot.**

Non creare una terza finestra di conferma concorrente nella normale istanza Train Management.

Le fixture standalone possono usare un coordinator locale soltanto se necessario e con cleanup esplicito.

Per ogni intento protetto:

1. Acquisisci l'azione desiderata.
2. Memorizza il riferimento al record e lo snapshot pertinente.
3. Presenta il consenso senza mutare l'inventario.
4. Su Confirm rivalida record, assegnazione, target e stato richiesti.
5. Applica una sola mutazione.
6. Su Cancel conserva tutto.
7. Su dispose elimina pending e listener.

Non introdurre Promise in chiamate che si aspettano booleani sincroni.

Non creare doppi callback.

Non chiamare `onChange` come segnale di successo prima della mutazione effettiva.

Preserva focus return, Escape, gestione del top-dialog e gli handler U2/U5/U6/U7.

### 12. Coerenza con Projects M2

Le prenotazioni dipendono esclusivamente dai progetti confermati.

Preserva il contratto già verificato in U7:

- Modificare un draft non libera una prenotazione valida.
- Cancel del draft lascia intatte le prenotazioni.
- Confirm di un progetto invariato conserva le prenotazioni.
- Riordino, nome e orientamento dello stesso slot mantengono la prenotazione quando resta compatibile.
- Se uno slot viene eliminato o cambia modelId, la riconciliazione può rilasciare la prenotazione diventata invalida.
- Un nuovo slot dello stesso modello non eredita automaticamente la prenotazione del vecchio UUID.

La riconciliazione deve restare quella del dominio M3.

Non aggiungere riconciliazioni anticipate che alterino le prenotazioni sulla base di una bozza.

Non modificare `projectSlots` o `reconcile`.

### 13. Reset ferroviario e session-only

Il reset R1:

- Modifica generation e riferimenti fisici.
- Può rendere STALE un link M2 verso un convoglio fisico.
- Non cancella inventario virtuale M3.
- Non cancella progetti virtuali confermati.
- Non annulla prenotazioni virtuali ancora compatibili.

Il Depot rimane in RAM e viene perso al reload, secondo il contratto originale.

Non introdurre LocalStorage, IndexedDB, Supabase o altra persistenza.

La gestione di eventuali pending al reset deve seguire la validità effettiva dei riferimenti dell'intento. Non applicare operazioni catturate su un contesto divenuto obsoleto.

### 14. Physical stock separation — CTRL-045

Presenta una sezione separata dedicata ai veri rotabili fisici.

Usa:

`railwayInventoryView(getTrains(),getDetached(),getGeneration())`

Distingui:

- Veicoli agganciati ai treni.
- Vagoni detached presenti sui binari.
- Record virtuali off-scene.

La lista fisica è read-only.

Nessuna azione di Depot deve alterare posizione, Journey, velocità, coupler o scene object.

I controlli Place on Layout e Withdraw from Layout sono **funzioni non disponibili**.

Secondo il contratto A11, rappresentali come informazione non interattiva o targa esplicativa, non come comandi operativi.

Non implementare nuovi dispatcher o trasferimenti.

### 15. UI V2.1 e responsive — A12

Applica il design frozen alle sole regioni U8.

Usa:

- Materiali enamel/brass.
- Font locali.
- Card virtual inventory.
- Stati Available/Reserved.
- Catalog picker.
- Confirmed project slots.
- Notices.
- Separazione visuale da physical railway.
- Empty e no-compatible-slot states.

CSS esclusivamente scoped U8.

Mantieni intatte le regole U2–U7 e il foglio integration come ultimo.

Verifica i sette viewport:

- 1920×1080.
- 1440×900.
- 1280×800.
- 1024×768.
- 820×1180.
- 768×1024.
- 390×844.

Acquisisci screenshot di:

- Depot vuoto.
- Record Available.
- Due record dello stesso modello con ID differenti.
- Record Reserved.
- Nessuno slot compatibile.
- Release consentita.
- Remove pending e Cancel.
- Notice di riconciliazione.
- Draft aperto con prenotazioni intatte.
- Sezione physical stock.
- Detached on track.
- Layout mobile completo.

Controlla scroll, overflow, font, target touch, focus e accessibilità.

Non anticipare la fase U9.

### 16. Gate funzionale G-U8

Implementa il gate previsto da `TEST_GATES.json`.

Verifica almeno:

1. Add virtual record.
2. Duplicati dello stesso modello con identità uniche.
3. Available iniziale.
4. Assign su slot confermato compatibile.
5. Rifiuto modelId diverso.
6. Rifiuto slot già riservato.
7. Rifiuto record già riservato.
8. Draft non assegnabile.
9. Release senza modifiche fisiche.
10. Remove con conferma e validazione.
11. Remove Reserved rifiutato.
12. Cancel/Escape/backdrop senza mutazioni.
13. Doppio consenso una sola operazione.
14. Pending obsoleto rifiutato.
15. Confirm/Cancel M2 con corretta riconciliazione.
16. Reorder same-slot mantiene prenotazioni valide.
17. Replacement same-model/new UUID non eredita prenotazioni.
18. Reset/generation con inventario conservato.
19. Physical stock read-only.
20. Detached remain on track.
21. Zero trasferimenti fisici.
22. Session-only dopo close/reopen e reset.
23. Cleanup/dispose.
24. Assenza di mock nel bundle.
25. Nessuna regressione critica U2–U7.

### 17. Regressioni obbligatorie

Consulta G-U8 e utilizza le suite pertinenti:

- `tests/depot-inventory.test.js`
- `tests/browser-depot.py`
- `tests/browser-depot-lifecycle.py`
- `tests/browser-depot-runtime.py`
- Nuova `tests/browser-ui-v21-U8.py`
- Projects U7, per i contratti di prenotazione.
- U6, per shell/sessione.
- U5, per reset, generation e quattro treni, quando pertinente.

Esegui inoltre Node, Python, build produttiva e canonico.

Richiedi almeno una prova RAF nativa con treni realmente in movimento, usando input reali per le operazioni Depot. Confronta lo stato fisico prima/dopo le operazioni virtuali, tenendo conto dell'avanzamento temporale ordinario.

Non sostituire il movimento ferroviario con soli step manuali.

Non dichiarare fluidità hardware da risultati SwiftShader.

Non indebolire le asserzioni di dominio dei test esistenti.

Non ripetere matrici estese immutate se le verifiche pertinenti sono sufficienti.

### 18. Evidenze e documentazione

Salva in:

`docs/_active/ui-v21/evidence/U8/`

Includi:

- `results.json`.
- Comandi ed exit code.
- Hash sorgenti e bundle.
- Metafile della build.
- Invarianti Git.
- Mapping DOM/callback.
- Matrice guard Release/Remove.
- Matrice prenotazioni per UUID slot.
- Evidenza della separazione fisico/virtuale.
- Screenshot dei sette viewport.
- Failure/recovery.
- Limiti NOT VERIFIED.

Non copiare intere cartelle storiche U2–U7.

Riutilizza i risultati precedenti quando i file e i relativi contratti non sono cambiati.

Produci:

`docs/_active/ui-v21/U8_REPORT.md`

Distingui PASS eseguiti, PASS storici, FAIL e NOT VERIFIED.

### 19. Condizioni BLOCKED

Interrompi U8 se:

- Un'operazione Depot crea o muove rotabili fisici.
- Un record virtuale viene scambiato per un UUID fisico.
- Una prenotazione può essere assegnata a un draft.
- Un target viene sostituito silenziosamente con un modello uguale.
- Una prenotazione valida viene persa prima del Confirm M2.
- Remove elimina un record Reserved.
- Release/Remove avvengono prima del consenso.
- Un consenso scaduto produce una mutazione.
- I dati session-only vengono persi al reset.
- Compare/Composer U7 regrediscono.
- Sono necessarie modifiche al dominio M2/M3, motore R1 o backend.

Non aggirare i blocchi con modifiche non autorizzate.

### 20. Checkpoint e STOP

Se U8 supera tutti i gate pertinenti:

1. Verifica il diff rispetto al checkpoint U7 approvato.
2. Verifica gli invarianti.
3. Crea un commit atomico reversibile.
4. Esegui push normale fast-forward sul solo branch autorizzato.
5. Verifica la corrispondenza HEAD locale/remoto.
6. Comunica SHA completo.
7. Consegna U8_REPORT, risultati e prove.

**STOP DOPO U8.**

Non iniziare U9.

Non effettuare merge in main.

Non pubblicare GitHub Pages.

Non modificare Supabase, Auth o RLS.

Non introdurre persistenza.

Non dichiarare U8 approvata autonomamente.

L'approvazione spetta esclusivamente alla Regia.

Procedi ora con U8.