# SerieN — UI V2.1 | AUTORIZZAZIONE REGIA U2

## VERDETTO

La Regia ha esaminato il rapporto U1, le evidenze pubblicate e la fixture grafica 1440×900.

**U1 APPROVATA.**

Autorizzo esclusivamente:

**U2 — Shell, Header, Dialogs & Train Management Launchers**

Questa è la prima microfase di integrazione applicativa reale della UI V2.1.

U3–U9 NON sono autorizzate.

## 1. Repository e baseline

Repository: `epivic-lab/SerieN`

Branch:

`codex/ui-v2-integration`

Checkpoint U1 approvato:

`74a8d91c2feafcb826ee316862ec2e8bf7d12a56`

Baseline ferroviaria:

`91722fbdf6671e69deebf645c3d8bf389212f421`

Main di produzione:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica HEAD remoto, working tree e ancestor prima di intervenire.

Non creare nuovi branch, non eseguire merge/rebase e non modificare main.

## 2. Autorità dei contratti

Utilizza i documenti approvati in:

`docs/_active/ui-v21/`

In particolare:

- `CONTROLS.json`
- `SCREENS.json`
- `SOURCE_DOM_CALLBACK_TEST.csv`
- `ADAPTERS.md`
- `CONTRACT_RESOLUTIONS.md`
- `MIGRATION_PLAN.md`
- `TEST_GATES.json`
- `ASSET_INVENTORY.md`

Utilizza gli asset approvati in `ui/`.

Il design V2.1 congelato e le reference di Claude sono la fonte visiva.

Il codice R1/M1/M2/M3 è invece l'autorità funzionale.

Non importare JavaScript mock nel simulatore.

## 3. Obiettivo U2

Integrare realmente nella pagina applicativa le seguenti parti del design V2.1:

- Shell generale.
- Header SerieN.
- Menu principale.
- Dialoghi Menu, Help e Track Plan.
- Controlli qualità grafica.
- Login gate: solo skin, boot e comportamento invariati.
- Sign out con protezione dei dati di sessione.
- Exit to title visibile ma disabilitato.
- Accessi al Train Management.
- Struttura minima per dialoghi e focus.
- Predisposizione del responsive della shell.

Non convertire ancora sidebar, dock, HUD, overlay e viste interne del Train Management: appartengono alle microfasi successive.

Le aree non migrate devono restare pienamente operative e senza regressioni visuali non autorizzate.

## 4. CSS e integrazione grafica

Utilizza i file U1 secondo l'ordine approvato:

1. Legacy necessario.
2. Tokens V1.
3. CSS V1.
4. Tokens TM.
5. CSS TM.
6. Integration CSS ultimo.

Attiva le nuove regole soltanto per le regioni U2.

Evita collisioni globali con deck, HUD, canvas 3D, scambi, missioni e management attuale.

Inserisci esclusivamente gli override indispensabili, con indicazione del motivo e dei controlli interessati.

Tutti i font devono essere locali.

Non introdurre richieste Google Fonts o altre dipendenze remote.

Non alterare i file frozen né le texture/materiali del renderer.

## 5. Sign out e protezione sessione

Il listener esistente di autenticazione utilizza `addEventListener`.

Non duplicarlo e non sostituire `auth-gate.js`.

Implementa l'adapter A01 e il summary minimo A02.

Condizione reale per avvisare della perdita dei dati RAM:

`projects.dirty || projects.hasProjects || inventory.size > 0`

Il messaggio deve distinguere bozza, progetti e record Depot quando presenti.

Requisiti:

- Nessun logout prima della conferma.
- Cancel lascia autenticazione e sessione intatte.
- Conferma produce esattamente un logout.
- Doppi click non provocano due logout.
- Nessuna ricorsione tra modale e handler originale.
- Nessun secondo store TM.
- Cleanup di tutti i listener.
- Nessuna modifica alle credenziali o a Supabase.

`Exit to title` resta disabilitato, con spiegazione accessibile. Non deve effettuare logout o reload.

## 6. Train Management Launchers

Predisponi gli ingressi previsti dal design V2.1.

Tutti devono utilizzare la stessa istanza di Train Management e gli stessi store M2/M3.

Implementa soltanto i getter read-only e l'API minima necessaria per apertura, vista iniziale e ritorno del focus.

Non modificare composizioni, UUID, progetti, prenotazioni o stato ferroviario.

La chiusura non deve distruggere progetti confermati o inventario virtuale.

I dati M2/M3 rimangono Session only.

Non eseguire ancora la migrazione visiva delle quattro sezioni TM: quella appartiene a U6–U8.

## 7. Dialoghi e conferme

Prepara il coordinator A03 senza alterare indiscriminatamente il comportamento dei call site sincroni esistenti.

In U2 integra solamente le conferme effettivamente necessarie ai controlli U2.

Non sostituire `window.confirm` con una Promise che venga poi interpretata come booleano.

Requisiti:

- Nessuna mutazione prima del consenso.
- Cancel privo di effetti.
- Conferma applicata una volta sola.
- Intenti pendenti invalidati quando diventano obsoleti.
- Nessuna callback dopo dispose.
- Focus restituito al launcher corretto.
- Escape/backdrop gestiti senza bypassare guardie.

Le conferme reset/composer/depot saranno integrate nelle rispettive microfasi future, salvo adapter strettamente necessario e autorizzato in U2.

## 8. Funzioni da preservare

Verifica esplicitamente:

- Autenticazione e boot originali.
- Quattro modalità Auto/Low/High/Cinema.
- Menu rolling stock e relativi rollback.
- Help e Track Plan reali.
- Chiudi/Escape/backdrop.
- Camera e renderer sempre attivi.
- Picking e OrbitControls non intercettati da overlay invisibili.
- Fino a quattro treni in simulazione.
- STOP ALL momentaneo.
- Space ferma il treno selezionato.
- HUD reale read-only.
- Bell Guarded Stop indipendente dal suono UI.
- Nessuna mutazione diretta agli scambi.
- Projects e Depot ancora indipendenti da R1.

Non modificare gli algoritmi ferroviari per adattarli al design.

## 9. Gate U2

Esegui i test esistenti pertinenti e aggiungi test specifici per U2.

Sono obbligatori:

**Funzionali**
- Login gate e avvio.
- Logout cancel/confirm/doppio evento.
- Session summary reale.
- Aperture TM multiple senza duplicazione store.
- Focus ed Escape.
- Menu e qualità grafica.
- Help/Track Plan.
- Integrità dei comandi ferroviari accessibili durante l'uso della shell.

**Visuali**
- Desktop 1440×900.
- Tablet 1024×768.
- Mobile 390×844.
- Screenshot di shell, Menu, Help, Plan e stato di conferma.
- Confronto con la reference V2.1.
- Verifica delle regioni legacy non migrate.

**Tecnici**
- `npm test`.
- Test Python.
- Build e canonical diff.
- Regressioni browser pertinenti.
- Nessun import mock.
- Nessun errore console/pageerror.
- Nessun asset mancante.
- Nessun leak evidente di listener e overlay.
- Nessuna modifica Auth/Supabase/R1/store.

Non indebolire le asserzioni storiche per far passare i test.

Valuta la leggibilità dei testi secondari e i target touch: la fixture U1 mostrava alcune microetichette piccole. Qualunque correzione deve essere circoscritta alla shell U2 e documentata, senza alterare arbitrariamente il design approvato.

## 10. Evidenze

Conserva i risultati in:

`docs/_active/ui-v21/evidence/U2/`

Produci:

- `U2_REPORT.md`
- File modificati e motivazioni.
- Delta dei controlli e dei selettori.
- Risultati dei test con exit code.
- Screenshot.
- Confronto funzionale prima/dopo.
- Hash degli invarianti protetti.
- Problemi residui.
- Checkpoint Git verificato.

Distingui PASS, FAIL e NOT VERIFIED.

## 11. Vincoli di release

NON modificare main.

NON eseguire deploy.

NON iniziare U3.

NON modificare Supabase o Auth.

NON alterare il motore ferroviario.

NON riscrivere i domini M2/M3.

NON introdurre persistenza cloud.

NON trasformare mock in logica reale.

NON ampliare autonomamente il perimetro U2.

Se emerge una dipendenza che richiede modifiche fuori perimetro, documentala e fermati sul relativo gate.

## 12. Consegna

Verdetto finale:

**U2 READY FOR REGIA REVIEW**

oppure

**U2 BLOCKED**, con evidenze precise.

STOP dopo U2.

Attendi approvazione della Regia prima di U3.