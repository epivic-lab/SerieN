# SERIEN — AUTORIZZAZIONE U7
## Projects, Composer & Compare — UI V2.1

**Modello: GPT-6 — Reasoning Extra High**

### 1. Autorizzazione della Regia

La Regia ha APPROVATO U6 dopo revisione indipendente di repository, sorgenti, checkpoint, contratti, test ed evidenze visuali.

Sei autorizzato a eseguire esclusivamente:

**U7 — Projects Dashboard, Composer, Side Preview & Compare.**

Repository: `epivic-lab/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U6 approvato:

`6f8a28a4fe49875dc499872454d5128b2860bdfc`

Baseline U5:

`e6f152c9b5a23347cbbd5aa6898b91a11e2194e0`

Main produttiva:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Prima di operare, verifica HEAD locale/remoto, ancestry, upstream e working tree.

**U8 e U9 non sono autorizzate. Nessun merge o deploy.**

### 2. Fonti vincolanti

Leggi:

- `AGENTS.md`
- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U6_REPORT.md`
- Design Claude V2.1 approvato, incluse le reference visive frozen.

Contratti principali:

**A03, A04, A05, A10, A12.**

Controlli:

`CTRL-031–040, CTRL-057, CTRL-058`.

Le interfacce visive sono governate dal design approvato.

La logica funzionale resta quella di R1/M1/M2/M3.

### 3. Obiettivo

Integrare la nuova esperienza V2.1 per:

1. Projects Dashboard.
2. Selezione dei progetti confermati.
3. Composer / Project Editor.
4. Scelta dei modelli dal catalogo originale.
5. Riordino e orientamento dei veicoli virtuali.
6. Vista laterale della composizione pianificata.
7. Compare tra progetto e treno reale.
8. Conferme, stato dirty, validazioni ed errori.
9. Keyboard, focus e responsive.

**Projects rimane virtuale e session-only.**

U7 non deve modificare la simulazione ferroviaria.

### 4. File autorizzati

File prioritari:

- `src/train-projects-view.js`
- `src/train-side-view.js`, soltanto presentazione.
- `src/ui/guard-modal.js`, se necessario.
- `src/ui/keyboard.js`, soltanto coordinamento tastiera.
- `ui/css/serien-ui-integration.css`, regole scoped U7.
- Test e documentazione U7.

È consentito esclusivamente un piccolo intervento di wiring UI in `src/train-management.js` se indispensabile per condividere il coordinator della guard U6.

Ogni intervento aggiuntivo va motivato nel rapporto.

**Devono rimanere invariati:**

- `src/train-projects.js` — dominio M2.
- `src/depot-inventory.js` — dominio M3.
- `src/train-side-layout.js` — geometria.
- Catalogo sorgente.
- Motore ferroviario, dispatcher e topologia.
- Auth/Supabase.
- Asset ferroviari.

Non modificare il dominio per adattarlo al design.

### 5. Projects Dashboard — A04

I progetti confermati devono essere rappresentati tramite gli snapshot reali dello store.

La selezione di un progetto confermato è un'operazione di sola vista.

**Selezionare un progetto NON deve eseguire `store.open()`.**

Introduci, se necessario, uno stato locale di presentazione come `selectedProjectId`, separato dal draft autorevole.

La vista confermata deve essere read-only.

L'azione Edit è distinta: soltanto Edit può aprire una bozza con `store.open(projectId)` dopo le guardie necessarie.

Preserva:

- Identità progetto.
- UUID dei veicoli.
- Ordine.
- Modelli.
- Orientamenti.
- Riferimenti fisici della sorgente.
- Progetti confermati durante la navigazione.

Non introdurre cancellazione globale dei progetti o applicazione del progetto ai treni.

### 6. Composer

Il Composer deve utilizzare esclusivamente le API reali di `createTrainProjects()`:

- `begin`
- `copy`
- `open`
- `rename`
- `add`
- `remove`
- `move`
- `flip`
- `link`
- `confirm`
- `cancel`

Non creare un secondo store per la composizione.

Vincoli obbligatori:

- Una locomotiva iniziale.
- Massimo cinque trailer.
- Massimo sei veicoli complessivi.
- Locomotiva sempre nella prima posizione.
- Riordino consentito soltanto ai trailer.
- Ogni slot conserva la propria identità.
- Flip modifica soltanto l'orientamento pianificato.
- Nessuna operazione fisica sul convoglio R1.
- Nessun drag-and-drop obbligatorio.

Il design può utilizzare un rail visivo con card, inspector e tray, ma tutti i comandi devono arrivare alle API dello store.

Non creare ordinamenti fittizi nella UI scollegati dal draft.

### 7. Atomicità delle modifiche

Preserva la semantica attuale dello store:

- Un'operazione invalida non lascia modifiche parziali.
- Il valore precedente rimane valido dopo un errore.
- La UI mostra il messaggio di errore reale.
- Gli UUID rimangono stabili durante reorder/flip.
- La rimozione modifica soltanto il draft.
- Il confirmed rimane invariato fino a `confirm()`.
- Cancel ripristina lo stato confermato secondo il contratto originale.

Non inventare un sistema parallelo di undo/redo.

Non modificare `validateProject()`.

### 8. Conferme e dirty state — A03

Questo è il gate più importante di U7.

La fase U6 ha introdotto il coordinator `createGuardModal()` e l'API di presentazione `discardAfterConsent(expected)`.

Riutilizza tali contratti dove appropriato.

Devi esaminare e migrare i call site Projects che oggi usano conferme native, in particolare:

- New project con draft dirty.
- Open/Edit altro progetto.
- Copy da composizione reale.
- Cancel changes.
- Passaggio da una bozza a un'altra operazione incompatibile.
- Close/Focus gestiti dalla shell U6.

Evita conferme duplicate.

**Non trasformare `discard()` in una Promise lasciando chiamanti che lo interpretano come booleano.**

Per ogni intento distruttivo:

1. Identifica il contesto e l'azione desiderata.
2. Se serve conferma, presentala prima di mutare lo store.
3. Memorizza il riferimento e lo stato atteso.
4. Su Confirm rivalida generation, progetto, draft e identità pertinenti.
5. Applica la mutazione una sola volta.
6. Su Cancel non modificare nulla.
7. Su Dispose annulla l'intento.

Un intento obsoleto non deve applicarsi silenziosamente a una nuova bozza o generazione.

Le conferme clean devono mantenere il comportamento originale, senza nuovi passaggi inutili.

Mantieni il focus sul controllo appropriato.

### 9. Compare — cinque stati reali

La vista Compare deve utilizzare esclusivamente `compareProject()` e `realComposition()`.

Deve distinguere correttamente:

1. **Unlinked** — progetto indipendente, nessun treno collegato.
2. **Matching** — corrispondenza completa.
3. **Different** — differenze fra piano e composizione attuale.
4. **Changed** — composizione fisica mutata rispetto allo snapshot di origine.
5. **Stale** — riferimento fisico invalidato.

Non ridurre questi stati a un semplice indicatore uguale/diverso.

Visualizza le differenze reali per posizione, modello, identità e orientamento quando disponibili.

**Stesso modello non significa stesso veicolo fisico.**

Un progetto STALE non può essere collegato automaticamente a un nuovo treno.

Link/Re-link è consentito soltanto nella bozza.

Il confirmed resta read-only.

Non confermare automaticamente un progetto dopo Link.

La modifica del convoglio reale non deve essere simulata per produrre una differenza visiva.

### 10. Relazione con Depot M3

U8 non è autorizzata.

Tuttavia, U7 modifica i progetti confermati da cui dipendono le prenotazioni virtuali M3.

Preserva la logica reale:

- Ogni prenotazione è associata allo slot del progetto confermato.
- Il modello uguale non sostituisce l'identità dello slot.
- Modifiche al draft non modificano prenotazioni confermate.
- Cancel non rilascia prenotazioni.
- Confirm aggiorna lo store e richiama la riconciliazione esistente.
- Una prenotazione compatibile e ancora valida resta valida.
- Una prenotazione che non corrisponde più allo slot viene rilasciata secondo la logica M3.
- Nessuna assegnazione automatica di inventario.
- Nessun trasferimento Depot↔binari.

Non modificare `createDepotInventory()`.

Le eventuali notifiche devono descrivere il risultato reale, senza allarmi inventati.

### 11. Side View — A05

Riutilizza `createTrainSideView()` e `projectSideLayout()`.

Preserva:

- Immagini native/Kenney.
- Manifest reale.
- Dimensioni N 1:160.
- Coupler.
- Ordine e orientamento.
- Zoom 1–6.
- Fit.
- Scroll.
- Fallback immagini.
- Unico renderer 3D dell'applicazione.

La preview pianificata non modifica il treno fisico.

Non usare asset grafici per ricalcolare le dimensioni ferroviarie.

Non assumere che `setZoom()` sia una funzione pubblica esportata.

### 12. Keyboard e focus — A10

Sono autorizzate scorciatoie locali al Composer, coerenti con il design:

- Alt+Left / Alt+Right: riordino del trailer selezionato, se valido.
- F: inversione dell'orientamento pianificato.
- Delete: rimozione del veicolo pianificato selezionato, se valida.

Queste scorciatoie devono agire soltanto in un contesto Composer attivo, con un veicolo effettivamente selezionato.

Non devono agire quando il focus è su:

- Input.
- Textarea.
- Select.
- Contenteditable.
- Dialogo di conferma.
- Altri controlli che possiedono il comando da tastiera.

Non installare un secondo handler globale Space.

Mantieni i pulsanti accessibili come alternativa completa alle scorciatoie.

Conserva Escape, focus trap e ritorno al launcher della TM U6.

### 13. UI V2.1 e responsive

Implementa le superfici approvate:

- Dashboard progetti.
- Project rail.
- Inspector del veicolo.
- Tray catalogo.
- Controls di orientamento/ordine.
- Compare.
- Messaggi di errore e conferma.

Usa il CSS integration con regole scoped U7.

Non modificare il design delle fasi U2–U6.

Verifica sette viewport, secondo il gate G-U7 e i riferimenti approvati, includendo desktop, tablet landscape/portrait e mobile.

Acquisisci screenshot almeno di:

- Dashboard vuota e con progetti.
- Confirmed read-only.
- Composer vuoto.
- Composizione a sei veicoli.
- Reorder e flip.
- Preview zoom/Fit.
- Draft dirty.
- Validazione errata.
- Confronti Matching/Different/Changed/Stale/Unlinked.
- Guard di Cancel/Edit/New.
- Layout mobile completo.

Controlla dimensioni, testi, overflow, scroll, touch target e accessibilità.

Non anticipare la revisione complessiva U9.

### 14. Test funzionali G-U7

Implementa il gate `G-U7` presente in `TEST_GATES.json`.

Verifica almeno:

1. New project valido.
2. Unica locomotiva iniziale.
3. Massimo cinque trailer.
4. UUID stabili dopo riordino e flip.
5. Identità degli slot preservata.
6. Errori atomici senza mutazioni parziali.
7. Confirmed read-only.
8. Edit esplicito.
9. Cancel e guard dirty.
10. Nessuna doppia conferma.
11. Copy da treno reale.
12. Link solo su draft.
13. Nessun relink silenzioso.
14. Tutti i cinque stati Compare.
15. STALE dopo reset.
16. Confronto fra draft e treno fisico modificato.
17. Inventario virtuale e prenotazioni preservati o riconciliati soltanto quando previsto.
18. Nessuna mutazione ferroviaria da Composer.
19. Scorciatoie locali senza interferenza con input/Space.
20. Zoom/Fit/scroll e fallback.
21. Session-only dopo close/reopen e reset.
22. Lifecycle e dispose.
23. Assenza di mock nel bundle.
24. Regioni U2–U6 senza regressioni critiche.

### 15. Regressioni

Consulta G-U7 e usa le suite pertinenti già presenti:

- Train Management M1.
- Train Projects M2.
- Project lifecycle.
- Projects runtime.
- Project Side View.
- Train Side Layout.
- Integrazione U6.
- Smoke U5, soprattutto reset/generation.
- Comandi R1 soltanto dove il test modifica davvero composizioni fisiche.

Esegui Node, Python, build produttiva e verifica canonico/invarianti.

Non riscrivere asserzioni di dominio.

Gli adattamenti selettore devono essere documentati e limitati al nuovo DOM.

Non ripetere indiscriminatamente tutte le vecchie suite ferroviarie su file immutati.

Un test visuale non sostituisce la verifica funzionale dello store.

### 16. Evidenze e rapporto

Salva in:

`docs/_active/ui-v21/evidence/U7/`

Includi:

- `results.json`.
- Comandi ed exit code.
- Hash dei sorgenti.
- Hash del bundle finale.
- Metafile e verifica dell'assenza di mock.
- Invarianti Git.
- Delta dei controlli/callback.
- Matrice delle guardie.
- Matrice dei cinque stati Compare.
- Test sulle prenotazioni Depot.
- Screenshot rappresentativi.
- Failure intermedi e recuperi.
- Limiti NOT VERIFIED.

Evita di duplicare le cartelle storiche U2–U6: riutilizza riferimenti e hash validi.

Prepara:

`docs/_active/ui-v21/U7_REPORT.md`

Distingui rigorosamente:

- PASS eseguito.
- PASS storico documentato.
- NOT VERIFIED.
- FAIL.

### 17. Condizioni BLOCKED

Interrompi U7 se:

- Il design richiede una modifica del dominio M2.
- Un confirmed viene modificato senza Edit/Confirm.
- La guard elimina dati prima del consenso.
- Un consenso produce una doppia mutazione.
- Un riferimento STALE viene riattivato silenziosamente.
- Una prenotazione M3 valida viene persa a causa di modifiche non confermate.
- Reorder/flip cambiano UUID.
- Il Composer modifica treni fisici.
- Vengono introdotti Apply, Delete Project o trasferimenti fisici non autorizzati.
- Compare presenta dati inventati.
- U6 perde sessioni o focus.
- Il lavoro richiede modifiche al motore o al backend.

Non aggirare i vincoli per ottenere il PASS.

### 18. Checkpoint e STOP

Se U7 supera i gate:

1. Verifica il diff rispetto al checkpoint U6 approvato.
2. Verifica l'assenza di file fuori perimetro.
3. Crea checkpoint atomico reversibile.
4. Esegui push normale, fast-forward, sul solo branch autorizzato.
5. Verifica HEAD locale/remoto.
6. Comunica SHA completo.
7. Consegna U7_REPORT e le evidenze.

**STOP DOPO U7.**

Non iniziare U8.

Non iniziare U9.

Non effettuare merge in main.

Non pubblicare GitHub Pages.

Non modificare Supabase, Auth o RLS.

Non introdurre persistenza.

L'approvazione della microfase resta esclusivamente della Regia.

Procedi ora con U7.