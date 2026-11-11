# SERIEN — AUTORIZZAZIONE U5
## Train Dock, Four-Train Carousel, Global Commands & Reset

**Modello consigliato: GPT-6 — Reasoning High**

### 1. Mandato della Regia

La Regia ha APPROVATO U4 dopo revisione del rapporto, del checkpoint Git, del codice e delle evidenze.

Sei autorizzato a sviluppare esclusivamente:

**U5 — Train Dock, Carousel, Global Commands & Reset.**

Repository: `epivic-lab/SerieN`

Branch: `codex/ui-v2-integration`

Checkpoint U4 approvato:

`1d591bbc914f74cf066666522c6692be4132a614`

Checkpoint U3 precedente:

`907a9ec4a9d570f03af9ab77d39269ff49787256`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica HEAD locale/remoto, upstream, ancestry e working tree prima di intervenire.

Non ricominciare le fasi già approvate.

**U6–U9 NON AUTORIZZATE.**

### 2. Fonti vincolanti

Consulta:

- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U4_REPORT.md`
- Il design V2.1 approvato e le reference frozen.

Adapter prioritari:

- A03 — Dialog/confirmation.
- A07 — Train Dock e quattro treni.
- A10 — Keyboard/focus.
- A12 — CSS progressive integration.

Controlli da integrare:

`CTRL-016–CTRL-026`, `CTRL-050`, `CTRL-053`, `CTRL-054`.

Il design Claude ha autorità visiva; R1 e i controller reali hanno autorità funzionale.

### 3. Obiettivo

Trasformare il Train Dock legacy nella versione V2.1 approvata, introducendo la presentazione a carousel di quattro convogli e integrando i comandi globali.

Il risultato deve offrire:

- Accesso a tutti e quattro i treni.
- Selezione affidabile del convoglio attivo.
- Comandi reali di velocità, stop, reverse, lights, coupling/uncoupling.
- Stato operativo e composizione reale.
- Distinzione grafica tra throttle e velocità effettiva.
- STOP ALL momentaneo.
- Pause/Resume.
- Add Train con le protezioni originali.
- Reset protetto da conferma.
- Preservazione di M2/M3 session-only e della generation.

Non trasformare U5 in una revisione del motore ferroviario.

### 4. Perimetro tecnico

File prioritariamente autorizzati:

- `src/ui/dock.js` — nuovo adapter, se necessario.
- `src/ui/keyboard.js` — solo se richiesto per interazione/accessibilità.
- `src/train-deck.js` — esclusivamente presentazione e callback UI.
- `src/train-deck-state.js` — esclusivamente logica di presentazione.
- `app.js` — binding, mount/update/dispose, eventuale sola estrazione della conferma reset.
- `index.html` — hook/regioni U5.
- CSS integration, con regole circoscritte U5.
- Test e documentazione U5.

Conserva i moduli e i controller ferroviari.

Evita nuovi controller quando è possibile riutilizzare quelli esistenti.

Non creare store paralleli per treni, velocità, composizioni o selezione.

### 5. Quattro treni e carousel — A07

L'applicazione gestisce fino a quattro treni reali.

Attualmente il Train Deck usa `RecentConsoles(3)` per la presentazione delle tre console recenti.

**Tre console LRU non significano tre treni.**

Il design U5 deve permettere di raggiungere e comandare tutti e quattro i convogli attraverso il carousel.

Requisiti:

1. Una card per ciascun treno effettivamente presente, fino a quattro.
2. Le card devono usare identità, immagini, descrizioni, composizioni e stati reali.
3. La selezione deve chiamare il percorso originale `onSelect`.
4. I convogli non visualizzati contemporaneamente nel viewport del carousel devono continuare a muoversi.
5. Nessuna ricreazione del treno per selezionarlo.
6. Nessun reset di velocità o direzione causato dalla navigazione del carousel.
7. Mantenere compatibilità con gli altri consumer della selezione e delle console recenti.

La struttura LRU può essere adattata per la nuova presentazione senza alterare il modello ferroviario e senza far perdere l'accesso a nessun convoglio.

Non costruire un secondo array di treni autorevole.

### 6. ID DOM e selezione

Il vecchio Train Deck assegna dinamicamente alla console selezionata ID come:

- `speed`
- `stop`
- `reverse`
- `lights`
- `uncouple`
- `couple`

Il nuovo design deve preservare la compatibilità con i consumer originali.

**Non duplicare mai gli ID DOM critici.**

Quando cambia il treno selezionato, assicurati che:

- Ogni ID controllabile rimanga univoco.
- I comandi si riferiscano all'identità corretta.
- La selezione non lasci callback obsolete.
- La quarta locomotiva sia comandabile come le altre.
- Il cambio card non produca due comandi ferroviari.

Preserva la pulizia degli handler e delle risorse.

### 7. Speed, throttle e gauge

Il comando di velocità originale è espresso come percentuale 0–100.

La velocità effettiva del treno è un dato distinto, derivato dal motore.

Il design deve distinguere chiaramente:

**Throttle:** velocità richiesta, 0–100%.

**Actual speed:** valore effettivo derivato da `train.velocity`.

Per l'indicatore grafico della velocità usa:

- Il valore assoluto della velocità reale.
- Unità layout/s, oppure una normalizzazione dichiarata e fondata sulla scala reale del motore.
- La costante `MOTION.speedScale` soltanto dopo verifica del suo significato effettivo.

Non inventare km/h.

Non usare lo slider throttle come misura della velocità effettiva.

Rispetta inerzia, frenata, reverse e interventi Guarded Stop originali.

L'indicatore deve restare coerente durante accelerazioni, arresti, pause e inversioni.

### 8. Comandi ferroviari individuali

Riutilizza i callback esistenti:

- `onSpeed`
- `onReverse`
- `onStop`
- `onLights`
- `onUncouple`
- `onCouple`

Preserva l'autorità di `fleetCommands` e `applyConsistCommand`.

Non introdurre operazioni alternative sui treni.

In particolare:

- Stop individuale arresta soltanto il treno interessato.
- Reverse conserva l'ordine dei vagoni.
- Lights cambia lo stato reale.
- Uncouple rispetta il requisito di arresto e i controlli R1.
- Couple rispetta distanze, direzione, allineamento, route history e limite vagoni.
- Le operazioni rifiutate non mostrano un successo fittizio.

La UI mostra lo stato risultante dal motore, non uno stato previsto ottimisticamente.

### 9. STOP ALL e Pause/Resume

STOP ALL continua a chiamare il percorso ferroviario esistente.

**STOP ALL È MOMENTANEO, SENZA LATCH.**

Deve fermare tutti i treni, compreso quello non visibile nel carousel.

Non introdurre RELEASE, lock permanente o un nuovo stato globale di emergenza.

Pause/Resume è distinto da STOP ALL.

Preserva:

- Stato `paused` originale.
- Comportamento ferroviario alla ripresa.
- Gestione della Bell durante la pausa.
- Aggiornamento delle console e degli overlay.

Nessuna doppia invocazione dei callback.

### 10. Add Train

Preserva integralmente `addTrain()`.

Vincoli:

- Massimo quattro treni.
- Inserimento soltanto quando il punto originale è libero.
- Il rifiuto usa il messaggio e la logica esistente.
- Nessuna quinta locomotiva.
- Nessuna collisione introdotta dalla UI.
- Nessuna modifica alla selezione o ai convogli già in movimento in caso di rifiuto.

Dopo un inserimento consentito, la nuova card deve comparire nel carousel ed essere raggiungibile.

### 11. Reset — A03

È autorizzata esclusivamente l'integrazione della conferma di reset V2.1.

Puoi estrarre la conferma dalla funzione originale, ma il corpo ferroviario del reset deve rimanere invariato.

**Non convertire il reset in una Promise senza un contratto esplicito e verificato.**

Requisiti:

- Cancel = nessuna mutazione.
- Escape/backdrop = nessuna mutazione.
- Confirm = una sola esecuzione.
- Doppio click = nessun doppio reset.
- Validazione del contesto prima della mutazione.
- Nessuna invalidazione prematura.
- Generation incrementata solo dopo conferma.
- Riferimenti fisici precedenti marcati STALE secondo la logica originale.
- Treni, scambi, missioni e vagoni detached gestiti dal reset originale.
- Projects M2 e Depot M3 conservati in RAM.
- Nessuna trasformazione dei record virtuali in treni o vagoni fisici.

Non confondere il reset ferroviario con il Sign out U2.

Riutilizza il coordinamento dei dialoghi esistente dove compatibile, senza alterare i contratti della guard Sign out.

### 12. Keyboard e focus — A10

Mantieni un solo handler autorevole per Space.

Space deve fermare soltanto il treno selezionato quando l'utente non sta interagendo con campi editabili o dialoghi che catturano il comando.

Verifica:

- Focus su slider e pulsanti.
- Focus in dialoghi.
- Input, textarea, select e contenteditable.
- Navigazione tastiera del carousel.
- Escape dei dialoghi.
- Ritorno del focus dopo conferme.
- Nessuna doppia azione da keydown/click sintetico.

Non sacrificare accessibilità per imitare l'animazione del design.

### 13. Integrazione con U2/U3/U4

Devono rimanere invariati:

- Header, Menu e Sign out U2.
- Camera, Route, HUD, Bell e Log U3.
- Sidebar, dispatcher, daylight, missioni e mappa U4.
- Auth e gate Google.
- M1/M2/M3.
- Renderer e canvas unici.
- Pointer picking degli scambi e dei treni.
- Topologia e identità dei convogli.

La mappa U4 e il carousel U5 devono condividere la selezione reale.

Un click di focus non deve alterare velocità, direzione o composizione.

Non anticipare le viste interne Train Management U6–U8.

### 14. CSS e visual

Usa il design frozen V2.1, font locali e materiali già integrati.

Attiva CSS soltanto sulle regioni U5.

Il foglio integration rimane ultimo.

Verifica:

- Desktop 1440×900.
- Tablet 1024×768.
- Mobile 390×844.

Screenshot richiesti:

- Uno, tre e quattro treni.
- Carousel con quarta locomotiva selezionata.
- Stato movimento/arresto.
- Throttle differente da actual speed.
- STOP ALL e Pause.
- Insert train consentito e rifiutato.
- Reset confirmation.
- Reset cancel/confirm e stato successivo.
- Layout completo con componenti U2–U4.

Controlla che dock e carousel non occultino viewport, HUD, Log, Bell o controlli della sidebar.

Target principali almeno 44×44 px ove applicabile.

Non anticipare la revisione responsive globale U9.

### 15. Test e regressioni

Implementa il gate G-U5 di `TEST_GATES.json`.

**Nuove verifiche U5**

1. Quattro treni reali e tutte le card raggiungibili.
2. Identità selezionata sempre corretta.
3. Nessuna duplicazione ID DOM.
4. LRU non limita la flotta.
5. Space ferma soltanto il selezionato.
6. STOP ALL arresta anche i treni fuori viewport del carousel.
7. STOP ALL non crea un latch.
8. Pause/Resume conserva il comportamento originale.
9. Slider richiesto e actual velocity divergono correttamente durante accelerazione/frenata.
10. Reverse/Lights/Couple/Uncouple rispettano R1.
11. Add Train bloccato quando occupato.
12. Quinta locomotiva impossibile.
13. Reset Cancel zero mutazioni.
14. Reset Confirm esattamente una mutazione.
15. Incremento generation e riferimenti STALE corretti.
16. M2/M3 session-only conservati dopo reset.
17. Focus e keyboard non duplicano comandi.
18. Assenza di mock e store paralleli.

**Regressioni**

Esegui le suite specificate in G-U5, con gli harness originali corretti:

- Fleet Commands.
- Train Deck.
- Browser Train Deck.
- Railway R1/5C pertinente.
- Phase Zero, quando necessario.
- U2/U3/U4 regression smoke pertinente.

Esegui un gate RAF nativo con treni realmente in movimento, verificando selezione e arresti.

Non sostituire la verifica ferroviaria nativa con solo rendering on-demand.

Non usare benchmark software per dichiarare prestazioni GPU hardware.

Non rieseguire inutilmente le suite complete dei moduli M2/M3 immutati; verifica invece i contratti reset/generation/session-only interessati.

I test storici possono richiedere adattamenti selettore quando cambia il DOM, ma nessuna asserzione semantica ferroviaria deve essere indebolita.

### 16. Evidenze

Salva tutto in:

`docs/_active/ui-v21/evidence/U5/`

Prodotti obbligatori:

- Results JSON.
- Log e comandi con exit code.
- Hash sorgenti e bundle.
- Verifica dipendenze del bundle.
- Screenshot desktop/tablet/mobile.
- Selector delta e callback mapping.
- Invarianti Git.
- Test reset/generation.
- Test controllo quattro treni.
- Test native RAF.
- Eventuali failure/recovery.
- Limiti NOT VERIFIED.

Non sovrascrivere evidenze precedenti.

Distingui esplicitamente:

- PASS eseguito.
- PASS documentato da fasi precedenti.
- NOT VERIFIED.
- FAIL.

### 17. Sicurezza e condizioni STOP

Blocca U5 se compare uno dei seguenti:

- ID DOM critico duplicato.
- Quarta locomotiva non raggiungibile.
- Perdita o reset accidentale di treni durante navigazione carousel.
- Doppia esecuzione di un comando.
- STOP ALL trasformato in stato latched.
- Space ferma un treno diverso dal selezionato.
- Reset prematuro o doppio.
- Generation non coerente.
- Perdita di record M2/M3 al reset.
- Mutazioni improprie del motore o del dispatcher.
- Regressioni critiche U2/U3/U4.
- Modifica necessaria fuori perimetro autorizzato.

Nessun reset Git distruttivo, clean, rebase, force push, merge o deploy.

Se necessario, fermati e documenta il blocco.

### 18. Checkpoint e rapporto finale

Se tutti i gate pertinenti passano:

1. Crea checkpoint atomico e reversibile.
2. Esegui push sul solo branch autorizzato.
3. Verifica corrispondenza HEAD locale/remoto.
4. Riporta SHA completo.
5. Produci `docs/_active/ui-v21/U5_REPORT.md`.
6. Consegna evidenze, rischi e proposta READY FOR REGIA REVIEW oppure BLOCKED.

**STOP DOPO U5.**

Non iniziare U6.

Non effettuare merge in main.

Non pubblicare GitHub Pages.

Non modificare Supabase.

L'approvazione di U5 spetta esclusivamente alla Regia.

Procedi con l'implementazione controllata di U5.