# SERIEN — AUTORIZZAZIONE U6
## Train Management Shell, On the Layout & Model Catalog

**Modello: GPT-6 — Reasoning High**

### 1. Mandato

La Regia ha APPROVATO U5 dopo verifica indipendente del codice, del checkpoint GitHub, delle evidenze e dei test documentati.

Sei autorizzato a eseguire esclusivamente:

**U6 — Train Management Shell, On the Layout & Model Catalog.**

Repository: `epivic-lab/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U5 approvato:

`e6f152c9b5a23347cbbd5aa6898b91a11e2194e0`

Checkpoint U4:

`1d591bbc914f74cf066666522c6692be4132a614`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica lo stato remoto, l'ancestry, HEAD, upstream e working tree prima di intervenire.

**U7, U8 e U9 NON SONO AUTORIZZATE.**

### 2. Autorità

Leggi preventivamente:

- `AGENTS.md`
- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U5_REPORT.md`
- Pacchetto di design V2.1 e reference frozen approvate.

Contratti principali: **A02, A03, A04, A05, A10, A12**.

Controlli U6:

`CTRL-014, CTRL-028, CTRL-029, CTRL-030, CTRL-040, CTRL-051, CTRL-055, CTRL-056, CTRL-063, CTRL-065, CTRL-066`.

Il design Claude è autorità visiva. R1/M1/M2/M3 sono autorità funzionale.

### 3. Obiettivo

Realizzare l'interfaccia Train Management V2.1 per:

1. Shell principale di Train Management.
2. Navigazione e tab.
3. On the Layout.
4. Dettaglio di un convoglio reale.
5. Vista laterale completa.
6. Model Catalog.
7. Apertura, chiusura, focus, Escape e gestione delle conferme necessarie.
8. Responsive e accessibilità delle regioni U6.

Le viste interne **Projects/Composer U7 e Depot U8 non devono essere ridisegnate adesso**.

Devono però rimanere accessibili e funzionanti, preservando sessione, draft, progetti confermati, inventario e prenotazioni.

### 4. Perimetro tecnico

File prioritariamente autorizzati:

- `src/train-management.js` — shell, layout, catalog e gestione UI.
- `src/train-management-state.js` — soltanto proiezioni/UI.
- `src/train-side-view.js` — DOM, zoom, layout presentation e relativi adapter.
- `src/ui/guard-modal.js` — eventuale estensione compatibile del coordinator.
- `ui/css/serien-ui-integration.css` — appendice scoped U6.
- Eventuali hook strettamente necessari nel markup o binding applicativo.
- Test U6, rapporti ed evidenze.

Nessun intervento ai moduli di dominio, motore ferroviario, store Projects/Depot o catalogo sorgente.

Se una conferma UI richiede necessariamente una nuova API nella vista Projects esistente, esamina prima il call site reale. Non cambiare silenziosamente l'API `discard()` o la semantica dello store. Se non è possibile un adattamento strettamente di presentazione senza alterare il perimetro, segnala BLOCKED e proponi il delta minimo alla Regia.

### 5. Unica istanza Train Management — A02

Preserva la singola istanza prodotta da `mountTrainManagement()`.

Tutti gli ingressi già disponibili devono usare esattamente la stessa istanza:

- Header.
- Menu.
- Stock/mobile.
- Qualsiasi launcher già autorizzato.

La chiusura della finestra non deve smontare lo store.

Il cambio tab non deve ricreare Projects/Depot.

Il reset ferroviario non deve distruggere gli oggetti virtuali in RAM.

Il reload continua a perdere i dati session-only, secondo il contratto attuale.

Preserva `open(initialView,origin)`, `sessionSummary`, `invalidateReferences`, `sync`, `update` e `dispose`.

Non creare una seconda istanza di Train Management.

### 6. Shell e tab

Applica il linguaggio V2.1 approvato:

- Titolo e intestazione.
- Navigazione delle quattro viste.
- Pulsante Close.
- Stato tab selezionato.
- Focus visibile.
- Layout responsive.
- Tipografia e materiali locali.

Le quattro viste restano:

- On the Layout.
- Model Catalog.
- Projects.
- Depot.

In U6 migra visivamente le prime due.

Projects e Depot devono continuare a funzionare con le proprie implementazioni approvate.

Il cambio tab conserva i draft M2.

Non introdurre il discard automatico quando si passa da una vista all'altra.

### 7. On the Layout — CTRL-028/029/030

Mostra esclusivamente i convogli fisici attualmente presenti.

Utilizza `getTrains()`, `compositionView()` e gli snapshot reali.

Per ogni convoglio:

- Identità e nome reali.
- Miniatura originale.
- Numero di veicoli.
- Lunghezza N effettiva.
- Stato selezionato.
- Ordine locomotiva → vagoni.
- Eventuale orientamento reale.
- Accesso al dettaglio.

La selezione utilizza `onSelect()` originale.

**Focus in 3D** usa `onFocus()` e deve rispettare la guardia draft esistente prima di chiudere il dialogo.

**Copy to Project** usa la funzione reale `projects.copy(train)` e la generation corrente.

La copia crea un progetto virtuale: non modifica il treno reale, non applica una composizione globale e non sposta materiale tra Depot e binari.

Preserva gli ID dei veicoli, l'ordine e le misure effettive.

Non sintetizzare UUID o identità persistenti.

### 8. Vista laterale — CTRL-040 / A05

Riutilizza `createTrainSideView()`.

Il componente dispone già di:

- Vista SVG laterale.
- Asset e manifest reali.
- Zoom 1–6.
- Slider.
- Zoom +/−.
- Fit.
- Scroll orizzontale.
- Dimensioni e orientamento dei veicoli.
- Fallback per immagini mancanti.

Il metodo `setZoom()` è interno, non un'API pubblica.

Non invocare funzioni inesistenti.

Preserva la geometria derivata da `compositionSideLayout()` e il manifest attuale.

Le dimensioni 1:160, i coupler, l'ordine e le identità devono restare invariati.

Le immagini non devono determinare le dimensioni ferroviarie.

Non introdurre un secondo renderer né ricostruire una composizione da asset grafici.

### 9. Model Catalog — CTRL-066

La fonte del catalogo è `PROJECT_CATALOG`.

Mantieni tutte le identità canoniche, gli attributi e le dimensioni.

È autorizzata una migliore presentazione con:

- Card.
- Miniature.
- Nome.
- Ruolo locomotive/trailer.
- Provenienza SerieN/Kenney.
- Dimensioni N.
- Filtri esclusivamente di presentazione.
- Fallback immagini.

I filtri non devono modificare il catalogo, i modelli, i Projects o i treni fisici.

Il catalogo descrive **modelli disponibili come definizioni**, non quantità fisiche possedute.

Non mostrare disponibilità inventate, stock fittizio, prezzi, prenotazioni o disponibilità Depot.

Nessun duplicato del catalogo e nessuna copia delle definizioni mock Claude.

### 10. Detached Rolling Stock — CTRL-065

La lista deve essere generata dalla proiezione reale `detachedView()`.

Mostra identità, traccia e caratteristiche effettive.

I vagoni detached rimangono fisicamente sui binari.

Visualizzare la lista non deve:

- Spostarli.
- Agganciarli automaticamente.
- Creare record nel Depot.
- Rimuoverli dalla simulazione.
- Alterarne la Journey.

La lista è read-only.

### 11. Guard, Escape e Focus — A03/A10

Verifica ogni call site prima di introdurre modifiche.

Situazioni critiche:

- Close con draft pulito.
- Close con draft dirty.
- Escape.
- Backdrop.
- Focus in 3D con draft dirty.
- Copy to Project con draft dirty.
- Navigazione tab.
- Doppio click e consenso ripetuto.
- Intento divenuto obsoleto dopo reset.
- Dispose con richiesta pendente.

Il codice corrente usa in alcuni punti `projects.discard()`, che può invocare una conferma sincrona e cancellare la bozza.

**Non sostituirlo ingenuamente con una Promise.**

Un eventuale coordinator asincrono deve separare:

1. Verifica dell'intento.
2. Presentazione del consenso.
3. Rivalidazione dei riferimenti.
4. Mutazione soltanto dopo consenso.
5. Cleanup.

Cancel, Escape e backdrop devono lasciare intatti i dati quando l'utente rifiuta una modifica distruttiva.

Non introdurre doppie conferme native + custom.

Mantieni il focus sul launcher corretto alla chiusura.

Nessun secondo handler Space.

La tastiera della finestra TM non deve interferire con i comandi ferroviari globali.

### 12. Session-only e beforeunload — CTRL-063

Mantieni la condizione reale:

`projects.dirty || projects.hasProjects || inventory.size > 0`

Nessuna euristica basata soltanto sull'apertura di Train Management.

Non aggiungere persistenza locale o Supabase.

Preserva i dati virtuali dopo chiusura della finestra o reset ferroviario.

I riferimenti fisici obsoleti restano STALE.

Non tentare di convertire automaticamente gli STALE in riferimenti validi.

Il prompt nativo `beforeunload` va distinto dai test della condizione JavaScript; non dichiararne verificata la presentazione senza prova browser effettiva.

### 13. Protezione delle fasi precedenti

Conserva integralmente:

- U2 Header/Menu/Sign out.
- U3 Viewport/Camera/HUD/Bell/Log.
- U4 Sidebar/Missions/Map/Switches.
- U5 Train Dock/Carousel/Global Commands/Reset.
- Dispatcher R1.
- Quattro treni e tre console LRU.
- STOP ALL momentaneo.
- Space sul selezionato.
- Generation e reset.
- Projects/Depot session-only.

Il redesign interno di Projects/Composer appartiene a U7.

Il redesign interno del Depot appartiene a U8.

### 14. Visual e responsive

Applica le specifiche V2.1 alle sole regioni U6.

Usa font locali e CSS integration come ultimo foglio.

Viewport obbligatori:

- 1440×900.
- 1024×768.
- 820×1180.
- 768×1024.
- 390×844.

Acquisisci screenshot di:

- Shell TM.
- On the Layout.
- Convoglio selezionato.
- Vista laterale 1× e zoom.
- Fit e scroll.
- Catalogo completo e filtrato.
- Miniatura mancante/fallback.
- Detached rolling stock.
- Close e guard dirty.
- Stato tab e ritorno focus.

Verifica overflow, testo leggibile, target touch, navigazione tastiera e proporzioni delle miniature.

Non anticipare U9.

### 15. Test funzionali U6

Implementa `G-U6` secondo `TEST_GATES.json`.

Verifica almeno:

1. Tre launcher, una sola istanza TM.
2. Stesso store dopo close/reopen.
3. Tab multipli senza perdita del draft.
4. Selezione reale condivisa con Dock e mappa.
5. Focus camera reale.
6. Copy to Project senza mutazione fisica.
7. Close/Escape/backdrop con draft dirty e clean.
8. Nessun doppio consenso.
9. Generazione e riferimenti STALE.
10. Identità e ordine dei veicoli.
11. Lunghezze/dimensioni canoniche.
12. Vista laterale Zoom/Fit/scroll 1–6.
13. Native e Kenney con fallback.
14. Catalogo ruolo/provenienza senza quantità.
15. Detached list read-only.
16. beforeunload sulla condizione reale.
17. Keyboard e focus.
18. Assenza di regressioni U2–U5.
19. Assenza di mock nel bundle.
20. Lifecycle/dispose.

### 16. Regressioni e prove

Esegui:

- Node e Python pertinenti.
- Build produttiva e canonico.
- Test M1 / Train Management.
- Train Side View e layout.
- Contratti Projects coinvolti dalla guard Copy/Close.
- Browser U6.
- Smoke mirato U2–U5.
- Gate ferroviario se modifiche UI coinvolgono selezione o comandi.

Non rieseguire inutilmente tutte le suite M2/M3 se i rispettivi moduli non cambiano.

Non indebolire asserzioni di dominio per far passare test grafici.

Mantieni la distinzione fra PASS eseguito, PASS storico e NOT VERIFIED.

### 17. Gestione evidenze

Salva in:

`docs/_active/ui-v21/evidence/U6/`

Includi:

- Results JSON.
- Comandi ed exit code.
- Hash sorgenti e bundle.
- Metafile del bundle.
- Invarianti Git.
- Delta DOM/callback.
- Screenshot rappresentativi.
- Failure e recuperi rilevanti.
- Limiti NOT VERIFIED.

**Evita di ricopiare intere cartelle di evidenze U2–U5** quando i file sono immutati: usa riferimenti e hash. Conserva le prove necessarie ma non moltiplicare inutilmente i file.

### 18. STOP e checkpoint

STOP se:

- La TM viene rimontata perdendo la sessione.
- Copy/Focus/Close eliminano dati prima del consenso.
- Un draft cambia durante la navigazione tab.
- Dimensioni o ordine dei convogli derivano dalle immagini anziché dal dominio.
- I progetti virtuali modificano i treni fisici.
- La lista detached produce trasferimenti fisici.
- I riferimenti STALE vengono resi validi artificialmente.
- Le viste U7/U8 vengono migrate anticipatamente.
- U2–U5 regrediscono.
- Occorrono modifiche al dominio non autorizzate.

Se i gate sono soddisfatti:

1. Crea checkpoint atomico e reversibile.
2. Esegui push sul solo branch autorizzato, senza force.
3. Verifica HEAD locale/remoto.
4. Comunica SHA completo.
5. Produci `docs/_active/ui-v21/U6_REPORT.md`.
6. Consegna READY FOR REGIA REVIEW oppure BLOCKED.

**STOP DOPO U6. NON INIZIARE U7.**

Nessun merge in main.

Nessun deploy GitHub Pages.

Nessuna modifica Supabase/Auth/RLS.

Nessuna nuova persistenza.

L'approvazione resta esclusivamente della Regia.

Procedi con U6 nel perimetro approvato.