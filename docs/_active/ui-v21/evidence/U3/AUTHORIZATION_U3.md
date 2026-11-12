# SERIEN — AUTORIZZAZIONE U3: REAL VIEWPORT OVERLAYS

**Modello: GPT-6 — Reasoning High**

## 1. Autorizzazione della Regia

La Regia ha esaminato U2 e l'ha **APPROVATA** con rilievi non bloccanti.

Sei autorizzato a eseguire esclusivamente:

**U3 — Viewport Overlays, Camera, Next Switch HUD, Guarded Stop Bell & Operations Log.**

Repository: `epivic-lab/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U2 approvato:

`48a7c4d48b118877ec7edf7f4c61fba090e460b8`

Commit applicativo U2:

`19a84092131a81ee95a869218d77357723abf3a4`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica i riferimenti correnti prima di modificare i file.

**U4–U9 NON SONO AUTORIZZATE.**

## 2. Fonti di autorità

Consulta prima di implementare:

- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U2_REPORT.md`
- Design V2.1 approvato e relativo archivio frozen.

I contratti prioritari per U3 sono:

**A06 — Guarded Stop Bell**

**A08 — Next Switch HUD**

**A09 — Operations Log**

**A10 — Keyboard / Focus**

**A12 — CSS Cascade & Progressive Integration**

Il design Claude è autorità visiva. Il codice ferroviario R1 rimane autorità funzionale.

Non importare codice mock, dati fittizi o controller dimostrativi dalla reference.

## 3. Obiettivo U3

Integrare il linguaggio visivo V2.1 nelle superfici realmente associate al viewport 3D, mantenendo integralmente il comportamento ferroviario esistente.

Componenti interessati:

1. Camera toolbar.
2. Route preview.
3. View presets, Zoom, Pan, Orbit, Home e Follow.
4. Next Switch HUD.
5. Guarded Stop status.
6. Controllo Bell.
7. Operations Log.
8. Indicazione di caricamento/startup collegata al viewport.

Controlli del registro U0:

`CTRL-004, CTRL-007, CTRL-008, CTRL-009, CTRL-010, CTRL-011, CTRL-046, CTRL-047, CTRL-048, CTRL-049, CTRL-052, CTRL-062, CTRL-064`.

Preserva gli ID DOM critici e i controller reali.

## 4. Perimetro tecnico

File prioritariamente autorizzati, secondo il piano U3:

- `src/ui/overlays.js` — nuovo adapter di presentazione, se necessario.
- `src/next-switch-view.js` — solo DOM/presentazione.
- `src/guarded-stop-scene.js` — solo posizionamento e interoperabilità dello status UI.
- `src/view-controls.js` — solo binding di presentazione.
- `app.js` — esclusivamente integrazione UI.

Sono consentiti interventi strettamente necessari in CSS di integrazione e markup, e un piccolo adapter in `src/ui/shell.js` per esporre il controllo Bell nel Menu U2, senza modificare il comportamento delle funzionalità già approvate.

Evita nuovi file o modifiche quando quelli esistenti consentono un'integrazione pulita.

Non modificare moduli ferroviari per ottenere effetti grafici.

## 5. Requisiti funzionali inderogabili

### A. Camera e viewport

Preserva il renderer e il canvas unici.

I controlli devono continuare a utilizzare il sistema reale di navigazione e OrbitControls.

Mantieni:

- Preset Overview, Station, Freight Yard, Follow e modalità manuale.
- Zoom e gesture mouse/touch.
- Pan e Orbit.
- Home.
- Follow train.
- Interruzione del Follow da gesto manuale.
- Route preview della durata reale di 15 secondi.

Non duplicare i controller.

La nuova UI non deve introdurre overlay invisibili che intercettano pointer, selezione treni o click sugli scambi 3D.

### B. Next Switch HUD — A08

Riutilizza la proiezione ferroviaria esistente.

Preserva:

- Scambio successivo reale.
- Distanza e percorso previsti.
- Diagramma SVG derivato dalla topologia effettiva.
- Stato reale dello scambio.
- Warning e condizioni di assenza di percorso.
- Minimize/expand.

Il Next Switch HUD deve essere **rigorosamente read-only**.

Nessuna chiamata a `requestToggle`, nessun nuovo dispatcher, nessuna topologia ricostruita dalla reference grafica.

Il diagramma non deve mai essere sostituito da uno schema mock.

### C. Guarded Stop e Bell — A06

Esiste un solo controller ferroviario Bell.

Tutti i controlli visuali devono riferirsi allo stesso snapshot e alla stessa funzione reale di mute.

Il chip Bell nel viewport e l'eventuale controllo Bell nel Menu devono rimanere sincronizzati.

**UI Sound e Railway Warning Bell restano indipendenti.**

Disattivare UI Sound non deve silenziare Bell.

Disattivare Bell non deve nascondere lo stato di rischio.

Preserva il comportamento esistente di unlock audio, timer, visibilità, pagehide e cleanup.

Non ricostruire hazards, guardie o logiche di sicurezza.

### D. Operations Log — A09

Il log deve continuare a mostrare il messaggio reale completo.

L'ultima operazione resta visibile fino all'operazione successiva.

I rifiuti ferroviari e i messaggi di blocco devono mantenere contenuto e significato originali.

Non introdurre:

- Severity fittizie nel motore.
- KPI inventati.
- Allarmi mock.
- Messaggi di successo ottimistici.
- Reset automatici del log dopo un timeout.

Sono ammessi trattamenti grafici conservativi, senza modificare la semantica del dominio.

### E. Tastiera e focus — A10

Non creare nuovi handler globali duplicati.

Preserva Space sul treno selezionato quando il focus non è in un campo editabile.

Preserva Escape e focus management delle modali U2.

Evita che l'interazione con overlay o campi di input avvii comandi ferroviari accidentali.

### F. CSS — A12

Attiva il design esclusivamente nelle regioni U3.

Conserva i CSS U1 frozen e le regioni U2 già approvate.

Mantieni il foglio integration come ultimo livello della cascade.

Non applicare selettori generici che modifichino Train Dock, sidebar o finestre M1/M2/M3 ancora legacy.

Font sempre locali e licenze intatte.

## 6. Divieti assoluti

Non modificare:

- Motore R1, movimento, collisioni e dispatcher.
- Topologia ferroviaria.
- Regole di sicurezza degli otto scambi.
- STOP ALL momentaneo o Space.
- Flotta quattro treni e console LRU tre.
- Domini M1/M2/M3.
- Progetti e Depot session-only.
- Auth, Supabase, RLS e API.
- Scenografia e asset ferroviari 3D.
- Workflow di deployment.

Non anticipare sidebar U4, Train Dock U5 o Train Management U6–U8.

Non introdurre alcun secondo renderer.

Non effettuare merge, deploy o release.

## 7. Verifiche richieste

Prima di intervenire verifica branch, HEAD, upstream, working tree e delta U2.

Dopo l'implementazione esegui controlli proporzionati al rischio.

**Test nuovi U3**

- Pointer picking reale su treni e scambi.
- Orbit/Pan e gesture dopo apertura/chiusura overlay.
- Camera preset, Home e Follow.
- Route preview 15 secondi.
- HUD in stati reali differenti.
- Nessuna azione ferroviaria provocata dal solo HUD.
- Bell viewport/Menu sul medesimo snapshot.
- UI Sound indipendente da Bell.
- Warning visibili anche con Bell muted.
- Operations Log persistente e messaggi di rifiuto identici.
- Focus, Escape, keyboard e cleanup.
- Assenza di mock nel bundle.

**Regressioni**

Consulta `TEST_GATES.json` per le suite pertinenti U3.

Esegui quelle coinvolte dalle dipendenze effettivamente modificate, incluse le verifiche ferroviarie necessarie per picking, Next Switch e Guarded Stop.

Non lanciare indiscriminatamente tutti i vecchi browser test: alcuni richiedono i rispettivi harness e fixture originali.

Non indebolire asserzioni ferroviarie per ottenere il PASS.

Non ripetere l'intera certificazione M2/M3 quando i moduli e i contratti non sono cambiati.

**Verifiche visuali**

Screenshot dell'applicazione reale:

- Desktop 1440×900.
- Tablet 1024×768.
- Mobile 390×844.

Includi stati diversi del Next Switch HUD, Guarded Stop attivo/muted, camera toolbar, Route e Operations Log.

Controlla accessibilità dei controlli, leggibilità, overflow e touch target.

Le funzionalità U4–U8 non migrate possono conservare l'aspetto legacy.

La fluidità hardware GPU rimane NOT VERIFIED in assenza di prova effettiva.

## 8. Evidenze e checkpoint

Salva tutte le nuove evidenze in:

`docs/_active/ui-v21/evidence/U3/`

Includi:

- `results.json`.
- Comandi eseguiti ed exit code.
- Hash sorgenti e bundle.
- Screenshot.
- Delta dei selettori.
- Invarianti Git.
- Regres­sioni e relative prove.
- Eventuali failure/recovery.
- Limiti NOT VERIFIED.

Non sovrascrivere evidenze U0, PRE-U1, U1 o U2.

Documenta il delta rispetto al checkpoint U2 approvato.

Se U3 è completa, crea un checkpoint atomico e reversibile sul branch autorizzato, esegui push senza force e comunica il nuovo SHA completo.

Produci `U3_REPORT.md` con stato, implementazione, test, evidenze, rischi residui e proposta di READY FOR REGIA REVIEW oppure BLOCKED.

## 9. Condizioni di blocco

Interrompi U3 se:

- Next Switch HUD può modificare scambi.
- Compare un secondo controller Bell.
- UI Sound influenza il mute ferroviario.
- Overlay bloccano il canvas o il pointer picking.
- Operations Log perde messaggi o ne altera il significato.
- Regressioni R1 non sono risolvibili nel perimetro.
- Il design richiede modifiche di dominio non autorizzate.
- Il workspace non è recuperabile senza operazioni distruttive.

Non usare reset, clean, force push o rebase distruttivi per risolvere problemi.

Se necessario, presenta il blocco e chiedi una decisione della Regia.

## 10. STOP finale

Alla conclusione di U3:

**STOP. NON INIZIARE U4.**

Non effettuare merge in main.

Non pubblicare GitHub Pages.

Non modificare Supabase.

Non dichiarare U3 approvata autonomamente.

La prossima attività consentita sarà esclusivamente la revisione indipendente della Regia.

Procedi con U3 nel perimetro specificato.