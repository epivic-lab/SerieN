# SERIEN — RECOVERY U6 DOPO ESAURIMENTO TOKEN

**Modello: GPT-6 — Reasoning High**

## 1. Mandato

L'esecuzione di **U6 — Train Management Shell, On the Layout & Model Catalog** è stata interrotta per esaurimento dei token, prima della consegna.

Devi recuperare lo stato effettivo, preservare il lavoro valido già svolto e completare esclusivamente U6.

**Questa è una ripresa della fase autorizzata, non una nuova implementazione da zero.**

La Regia ha già approvato U0–U5. U6 è autorizzata ma NON approvata.

Non iniziare U7, U8 o U9.

## 2. Repository e baseline

Repository: `epivic-lab/SerieN`

Workspace previsto: `/workspace/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U5 approvato:

`e6f152c9b5a23347cbbd5aa6898b91a11e2194e0`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

### Verifica indipendente della Regia

Al momento del controllo GitHub:

- Il branch remoto coincideva ancora con U5.
- Nessun nuovo commit U6 era pubblicato.
- `U6_REPORT.md` non era presente sul remoto.
- La main produttiva era invariata.

**Queste osservazioni riguardano esclusivamente GitHub. Non dimostrano che il lavoro locale U6 sia assente.**

Il primo compito obbligatorio è recuperare lo stato locale.

## 3. RECOVERY FIRST — Nessuna modifica prima dell'inventario

Esegui inizialmente, in modalità non distruttiva:

```bash
pwd
git status --short
git branch -vv
git rev-parse HEAD
git remote -v
git log -8 --oneline --decorate
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
git worktree list
```

Verifica anche la HEAD remota con fetch non distruttivo, senza cambiare checkout.

Controlla gli eventuali reflog e stash **soltanto in lettura** se necessari per recuperare lavoro.

Ispeziona:

- File applicativi già modificati per U6.
- File staged e unstaged.
- File non tracciati.
- Eventuali commit U6 locali.
- Test U6 già creati.
- Screenshot ed evidenze.
- Report o note U6 parziali.
- Log di test e build.
- Eventuali failure intermedi.

Non presumere che il workspace sia pulito.

### Divieti durante il recupero

NON eseguire:

- `git reset --hard`
- `git clean`
- `git checkout -- .`
- Force push.
- Rebase distruttivi.
- Eliminazione di file non tracciati.
- Ripristino indiscriminato della baseline U5.
- Sovrascrittura di modifiche locali non comprese.
- Applicazione automatica di stash senza averne esaminato il contenuto.

Non cancellare lavoro valido soltanto perché incompleto o non committato.

Se trovi modifiche non attribuibili con sicurezza a U6, oppure una divergenza Git non risolvibile senza rischiare dati, **STOP e segnala il problema**.

## 4. Classificazione dello stato recuperato

Produci una breve matrice interna:

| Componente | Stato |
|---|---|
| TM Shell | Complete / Partial / Not started / Unknown |
| On the Layout | Complete / Partial / Not started / Unknown |
| Model Catalog | Complete / Partial / Not started / Unknown |
| Side View | Complete / Partial / Not started / Unknown |
| Focus & Guards | Complete / Partial / Not started / Unknown |
| Responsive | Complete / Partial / Not started / Unknown |
| Test U6 | Executed / Partial / Not executed |
| Evidence | Available / Partial / Missing |
| Checkpoint | Local / Remote / None |

Per ogni componente identifica:

- File interessati.
- Funzioni implementate.
- Dipendenze.
- Test già eseguiti.
- Eventuali difetti noti.
- Lavoro residuo.

### Regola di ripresa

Se esiste un'implementazione parziale valida, **continua da quella**.

Se esiste un commit locale U6 non pubblicato, esaminalo e continua soltanto se la sua ancestry è compatibile con U5 e con il branch remoto.

Se il workspace è realmente pulito sulla baseline U5, riprendi U6 secondo il mandato originale.

Non ricostruire componenti già corretti.

Non rieseguire indiscriminatamente tutti i test precedenti.

## 5. Mandato tecnico U6

La microfase autorizzata comprende esclusivamente:

**Train Management Shell, On the Layout & Model Catalog.**

Consulta:

- `AGENTS.md`
- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U5_REPORT.md`
- Pacchetto design V2.1 approvato.

Contratti obbligatori:

A02, A03, A04, A05, A10, A12.

Controlli U6:

`CTRL-014, CTRL-028, CTRL-029, CTRL-030, CTRL-040, CTRL-051, CTRL-055, CTRL-056, CTRL-063, CTRL-065, CTRL-066`.

Il design Claude è autorità visiva. Il codice R1/M1/M2/M3 è autorità funzionale.

## 6. Perimetro autorizzato

File prioritari:

- `src/train-management.js`
- `src/train-management-state.js`, solo proiezione/UI.
- `src/train-side-view.js`, solo presentazione.
- `src/ui/guard-modal.js`, estensioni compatibili.
- `ui/css/serien-ui-integration.css`, soltanto U6 scoped.
- Binding e hook strettamente necessari.
- Test ed evidenze U6.

Non modificare i domini Projects, Composer, Depot, catalogo sorgente o layout ferroviario.

Non intervenire su Supabase, Auth, dispatcher, motore R1, topologia o scenografia.

Se per correggere una guard fosse indispensabile modificare un modulo di dominio fuori perimetro, fermati e documenta il delta minimo richiesto alla Regia.

## 7. Requisiti da completare

### A. Unica istanza Train Management

Preserva `mountTrainManagement()` e le sue API esistenti.

Header, Menu e Stock/mobile devono aprire la stessa istanza.

Non ricreare Projects/Depot quando la finestra viene chiusa e riaperta.

La navigazione tra tab mantiene draft, progetti e inventario virtuale.

Reset ferroviario non cancella la sessione M2/M3.

### B. On the Layout

Mostra i veri treni fisici usando `getTrains()` e `compositionView()`.

Preserva:

- Identità reali.
- Ordine locomotiva/vagoni.
- UUID e source reference.
- Lunghezze e dimensioni N reali.
- Selezione condivisa con Dock e mappa.
- Focus in 3D tramite callback originale.
- Copy to Project tramite API reale.
- Elenco Detached read-only.

Nessuna applicazione globale dei progetti virtuali.

Nessun trasferimento fisico da o verso il Depot.

### C. Side View

Riutilizza `createTrainSideView()`.

Mantieni:

- Zoom 1–6.
- Fit.
- Scroll.
- Keyboard e touch.
- Asset native/Kenney.
- Fallback immagini.
- Geometria `compositionSideLayout`.
- Coupler, ordine e lunghezze reali.

`setZoom()` è una closure interna, non un'API pubblica già disponibile.

Non ricreare la geometria dalle immagini.

### D. Model Catalog

Usa esclusivamente `PROJECT_CATALOG`.

Mantieni identità, ruolo, provenienza e dimensioni originali.

Filtri solo di presentazione.

Non inventare quantità, disponibilità, prezzi o prenotazioni.

Il Catalog è una raccolta di definizioni di modelli, non inventario Depot.

### E. Guard, Dirty Draft e Focus

È un gate critico.

Verifica i call site reali prima di cambiare il flusso delle conferme.

Proteggi:

- Close con draft dirty.
- Close pulito.
- Escape.
- Backdrop.
- Focus con draft dirty.
- Copy to Project con draft dirty.
- Ritorno focus al launcher originario.
- Doppio consenso.
- Stato pending divenuto obsoleto.
- Dispose.

Nel codice pre-U6 `projects.discard()` utilizza una conferma sincrona nativa.

**Non convertirla ingenuamente in Promise e non invocare cancellazioni prima del consenso.**

Se è necessario mantenere temporaneamente il comportamento legacy per rispettare il contratto, documentalo esplicitamente; non introdurre un coordinatore incompleto o una doppia conferma.

Cancel = nessuna mutazione distruttiva.

La generation e gli identificatori fisici devono essere rivalidati dove necessario.

### F. beforeunload

Mantieni esattamente la condizione reale:

`projects.dirty || projects.hasProjects || inventory.size > 0`

Non usare un falso `hasSession`.

Non aggiungere persistenza locale o cloud.

Non dichiarare verificata la visualizzazione del prompt nativo se hai verificato soltanto il listener.

## 8. Protezione delle fasi approvate

Non introdurre regressioni in:

- U2: Header/Menu/Sign out e Auth.
- U3: Camera/Route/HUD/Bell/Log.
- U4: Sidebar/Scambi/Daylight/Missions/Map.
- U5: Train Dock/Carousel/Comandi globali/Reset.

Restano inderogabili:

- Quattro treni massimi.
- Tre console recenti LRU indipendenti dalla flotta.
- STOP ALL momentaneo.
- Space ferma soltanto il selezionato.
- Otto scambi governati dal dispatcher.
- Next Switch HUD read-only.
- Guarded Stop Bell separata da UI Sound.
- Reset con una sola conferma e generation corretta.
- Projects/Depot session-only.
- Un solo canvas e renderer.
- Nessun mock o KPI inventato.

## 9. Test dopo il recupero

Prima di eseguire nuove suite, verifica le evidenze locali già presenti.

Considera valida una prova precedente soltanto se:

- Si riferisce alla versione di codice pertinente.
- Il test è effettivamente terminato.
- L'exit code è documentato.
- Non sono cambiati i file o le dipendenze interessate.
- Il test copre davvero il contratto dichiarato.

Per il risultato finale U6 verifica:

1. Una sola istanza TM e tutti i launcher.
2. Sessione conservata a close/reopen.
3. Tab senza perdita draft.
4. Selezione e focus condivisi.
5. Copy virtuale senza mutazione fisica.
6. Close/Escape/backdrop dirty e clean.
7. Nessuna doppia conferma.
8. STALE/generation.
9. Identità, ordine e dimensioni.
10. Zoom/Fit/scroll 1–6.
11. Native/Kenney e fallback.
12. Catalog ruolo/provenienza.
13. Detached read-only.
14. beforeunload reale.
15. Focus e keyboard.
16. Nessuna regressione U2–U5.
17. Build, canonico e invarianti Git.
18. Assenza di mock nel bundle.
19. Lifecycle e cleanup.

Esegui le suite pertinenti previste da G-U6, incluse le verifiche browser necessarie.

Non indebolire le asserzioni ferroviarie per ottenere un PASS.

Non eseguire l'intera suite M2/M3 senza una ragione fondata sul delta.

## 10. Evidenze visuali

Verifica ai viewport:

- 1440×900.
- 1024×768.
- 820×1180.
- 768×1024.
- 390×844.

Acquisisci o recupera screenshot validi di:

- Shell TM.
- On the Layout.
- Convoglio selezionato.
- Side View zoom/Fit/scroll.
- Catalog completo e filtrato.
- Fallback.
- Detached.
- Dialoghi dirty.
- Ritorno focus.

Controlla contrasto, leggibilità, dimensioni dei controlli, overflow e comportamento responsive.

Non anticipare la revisione globale U9.

## 11. Evidenze e documentazione

Lavora in:

`docs/_active/ui-v21/evidence/U6/`

Riutilizza le evidenze U6 già prodotte quando valide.

Non sovrascriverle senza motivo.

Non copiare intere cartelle storiche U2–U5.

Registra:

- Stato recuperato dopo l'interruzione.
- File validi già presenti.
- Modifiche completate nella ripresa.
- Comandi, exit code e risultati.
- Hash sorgenti/bundle.
- Screenshot pertinenti.
- Selector/callback delta.
- Invarianti Git.
- Failure e recuperi.
- Rischi e limiti NOT VERIFIED.

Crea o completa:

`docs/_active/ui-v21/U6_REPORT.md`

La relazione deve distinguere PASS eseguiti, PASS storici, FAIL e NOT VERIFIED.

## 12. Checkpoint remoto

Se U6 è completa e i gate pertinenti sono soddisfatti:

1. Verifica nuovamente il diff rispetto a U5.
2. Accertati che nessun file fuori perimetro sia stato modificato.
3. Crea un checkpoint atomico reversibile sul branch autorizzato.
4. Esegui push normale, solo fast-forward, su `codex/ui-v2-integration`.
5. Verifica HEAD locale e remoto.
6. Riporta SHA completo.
7. Consegna rapporto e riferimenti alle evidenze.

Non pubblicare uno stato parziale come U6 conclusa.

Se la fase non può essere completata in sicurezza, consegna BLOCKED con lo stato recuperato e le verifiche ancora mancanti.

## 13. STOP obbligatorio

**STOP alla conclusione di U6.**

Non iniziare U7.

Non iniziare U8 o U9.

Non effettuare merge in main.

Non pubblicare GitHub Pages.

Non modificare Supabase, Auth o RLS.

Non introdurre persistenza.

Non interpretare il completamento tecnico come approvazione della Regia.

### Istruzione esecutiva finale

**Inizia recuperando il lavoro locale U6. Non ricominciare l'implementazione finché non hai stabilito cosa esiste già. Poi completa soltanto le attività mancanti, verifica il risultato e consegna U6 alla Regia.**