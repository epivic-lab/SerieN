# 6B.2-E1 — consolidamento semantico cloud offline

Data: 6 novembre 2026. **Raccomandazione: STOP E1 / BLOCKED per verifica eseguibile mancante.**
Patch preparata per audit della Regia, non approvata. Nessun PASS tecnico SQL dichiarato.

## Perimetro e checkpoint

Cartella verificata: `/Users/vincenzo.epifani/Documents/SerieN Codex/SerieN-persistence`.
HEAD iniziale e finale: `0a191e30239133067e4dc6598bd01060274d0b3b`.
Worktree iniziale pulito, detached HEAD; creato soltanto il branch locale autorizzato
`codex/6b2e1-semantic-gate`. La prima creazione è stata negata dal sandbox;
la stessa operazione locale è poi riuscita con escalation per i metadati Git condivisi.
Nessun checkout del worktree principale. Nessun commit, fetch, push, merge, rebase,
reset, accesso GitHub/Supabase, migrazione o deploy. Il divieto specifico E1
prevale sul protocollo ordinario di commit/checkpoint remoto di AGENTS.md.

Letti il rapporto D, STATUS, schema operativo completo, `validate.js`, Capture,
fixture e gate SQL C, candidato SQL e procedura di replay D. Le evidenze remote
di C/D sono contesto storico, non test rieseguiti in E1.

## Matrice degli invarianti

“Già server” indica controlli presenti nel candidato al checkpoint e collaudati
storicamente in C/D; non implica un nuovo PASS eseguibile locale.
“Deterministico scoperto” indica verificabile con assert/dati canonici, senza
necessità di un motore geometrico. Solo le due righe E1 sono implementate qui.

| Invariante | Stato al checkpoint / responsabilità | E1 e limite |
| --- | --- | --- |
| DTO chiuso, tipi, enum, UUID, quantità, engine R1, STOPPED, otto controller | Già server: schema completo rafforzato | Invariato |
| Owner/layout/topology; inventario vietato fino a 6D | Già server | Invariato |
| ID unici, riferimenti item/modelli, revisioni/digest, identità native/Kenney | Già server | Invariato; non certifica dimensioni/coupler |
| Consist ordinato locomotiva/vagoni, orientamento +1, assegnazione unica e completa, train/consist/locomotiva | Già server | Invariato |
| Console/LRU, selected e cardinalità; insieme runtimeSlot 0..N-1 | Già server | Invariato; ordine array/slot ancora scoperto |
| Ogni segmento usa uno dei 75 edge, end-start = lunghezza con tolleranza 1e-6 mm | Già server | Dati canonici incorporati invariati |
| Fine segmento precedente = inizio successivo, tolleranza 1e-6 mm | Deterministico scoperto: `hydrateJourney` | **Selezionato E1**, solo continuità delle coordinate, non dei nodi |
| Position inclusa fra primo start e ultimo end | Deterministico scoperto: `hydrateJourney` | **Selezionato E1**, estremi inclusi senza epsilon, come R1 |
| Connessione orientata dei nodi, assenza di inversione interna nella stessa unità turnout | Deterministico scoperto con grafo canonico | Non selezionato: servirebbe estendere il manifest server a nodi/unità e provarne la derivazione |
| Location coerente con Journey (edge, s, heading, scelta del segmento ai giunti) | Deterministico scoperto con localizzazione R1 | Non selezionato: evitare seconda implementazione di locate e delle convenzioni ai giunti |
| Laps coerenti con travel/lunghezza loop; section esistente | Deterministico scoperto | Non selezionato; lunghezze loop/lookup da versionare se portati al server |
| Reset seed: alternativa fraction vs edge/s e range edge | Deterministico scoperto | Non selezionato |
| Guard: coppia probeKind/probeDelta, delta non zero, distanza nulla solo SAFE/available | Deterministico scoperto | Non selezionato; non equivale a validità dinamica della guardia |
| LastBlock edge/node e boundary string/oggetto validi e nei range | Deterministico scoperto | Non selezionato; alcuni lookup richiedono nodi canonici |
| runtimeSlot = indice array; sganciati solo vagoni | Deterministico scoperto | Non selezionato; insieme slot e riferimento item non bastano |
| Couplers/couplingMode/legacyRearExtent realmente conformi a builder e asset | Confronto possibile con manifest completo fidato, oggi scoperto server | R1 staging: builder/dimensioni effettivi; nessun valore inventato in SQL |
| Copertura della storia per tutto il corpo del convoglio/sganciato | Necessariamente restore R1 nel disegno attuale | `validateStaging`, layout/coupling reali; non portato in SQL |
| Pose, ingombri, collisioni e contatti di aggancio consentiti | Necessariamente restore R1 nel disegno attuale | `validateStaging`, vehiclePositions/conflicts/coupling; nessun secondo motore |
| Routing/guardia/permesso effettivi, asset caricati e staging prima del commit | Necessariamente restore/runtime R1 | Non certificati da E1; salvataggio server accettato non significa stato ferroviario sicuro |

La scelta minima chiude due buchi numerici con le lunghezze già fidate,
senza nuovi helper, tabelle, costanti topologiche, privilegi o API. Tutti i
Journey di `trains` e `looseStock` passano nello stesso ciclo. Nessuna riparazione
dei documenti. Gli errori sono `INVALID_JOURNEY_CONTINUITY` e
`INVALID_JOURNEY_POSITION`, SQLSTATE P0001, prima di receipt/CAS e scritture.

Il server usa numeric, R1 usa Number IEEE-754: confronto ai bordi esatti della
tolleranza e corpus esteso restano da provare. E1 non certifica equivalenza
numerica universale, adiacenza ferroviaria, location o sicurezza del restore.

## File modificati

- `tests/sql/6b2c_cloud_rpc_candidate.sql`: i soli due assert E1 nel candidato offline.
- `tests/gen-6b2c-fixture.mjs`: opzione `--with-loose`, usa `uncouple` R1,
  Capture reale, `validateDocument` e `validateStaging`; percorso default C/D conservato.
- `tests/sql/6b2e1_semantic_gate.sql`: probe transazionale separato, dopo il gate C.
  Controllo positivo Capture integrale via save/read R2; otto mutazioni negative:
  gap +1 mm, overlap -1 mm, position 1e-7 mm prima/dopo storia, per treno e sganciato.
  Le mutazioni di continuità spostano l'intero suffisso, preservando ID/lunghezze.
  Verifica head e assenza di snapshot/receipt aggiuntivi; ROLLBACK finale per
  preservare le precondizioni R1 dei gate concorrenza/revoca/rollback C/D.
- Questo rapporto, `PROGRESS.md` e `STATUS.md`: stato e unica azione successiva.

## Verifiche eseguite e risultati

| Comando / verifica locale | Risultato effettivo |
| --- | --- |
| pwd, git status, rev-parse HEAD, branch iniziale | PASS: percorso/SHA richiesti, detached e pulito |
| `python3 -m unittest discover -s tests -p '*_test.py'` | **PASS: 9 test, 0.029 s**, exit 0; audit JMRI, non SQL E1 |
| Confronto Python delle costanti `$schema$`, `$catalog$`, `$edges$` con HEAD e parsing JSON | PASS statico: byte invariati, JSON valido, 75 edge |
| Verifica diff dei sorgenti runtime/asset | PASS statico: nessuna modifica a src, app, GLB, geometria, fisica, Journey o R1 |
| `npm test` | **BLOCKED**, exit 127: `command not found: npm` |
| `npm run build` | **BLOCKED**, exit 127: `command not found: npm` |
| `command -v node/npm/psql/docker` e percorsi standard Homebrew/usr-local | Strumenti non trovati; node_modules assente |
| Generazione/esecuzione Capture R1 E1, SQL/pg_jsonschema, replay, concorrenza, rollback | **NOT VERIFIED**: Node/PostgreSQL/Docker non disponibili |
| Browser, visual/performance, restore finale | **NOT VERIFIED**; nessuna nuova evidenza grafica o prestazionale |

Questi risultati sono registrazioni dei comandi effettivamente eseguiti;
non sono allegati log SQL o screenshot perché non sono stati prodotti.
`git diff --check` passa. Il working tree finale contiene soltanto i sei percorsi
elencati sopra, intenzionalmente non committati per audit.

## Riproduzione richiesta alla Regia, solo database effimero offline

Usare il replay autentico e le versioni già fissate nel workflow D
`.github/workflows/persistence-db-history-6b2d.yml`, su strumenti/dipendenze
già disponibili, senza collegamenti produzione né nuove installazioni globali.
Nessun workflow è stato modificato o avviato da E1.

1. Eseguire `npm test`, build, generatore default e replay/gate C/D preesistenti
   come baseline del candidato modificato.
2. Generare `node tests/gen-6b2c-fixture.mjs --with-loose` in un file temporaneo.
   Il comando deve prima superare la validazione R1; il suo stdout è il DTO sintetico.
3. Dopo `6b2c_rpc_gate.sql` (due owner a R1) e nella stessa istanza effimera,
   eseguire `6b2e1_semantic_gate.sql` tramite psql con `ON_ERROR_STOP=1` e
   variabile `state` uguale al contenuto completo del nuovo file, secondo la
   stessa convenzione `-v state=...` già usata dal workflow D.
4. Verificare successo del controllo positivo, otto rifiuti con errori attesi,
   conteggi e rollback della probe; poi rieseguire concorrenza/revoca e rollback D.
5. Provare separatamente estremi inclusi e limiti di tolleranza IEEE-754/numeric,
   native/Kenney e corpus reale più ampio prima di sostenere equivalenza completa.

## Sicurezza, invarianti e decisione

Nessun segreto o dato utente introdotto: DTO e request ID sintetici. Nessuna
dipendenza, infrastruttura, grant/RLS/Auth, tabella o API aggiunta/modificata da E1.
Cloud adapter ancora `enabled:false`, autosave non abilitato. UI, camera/HUD,
scambi, rete e asset preservati staticamente; regressione eseguibile JS/browser
non verificata. Nessuna operazione di produzione o modifica a main.

**STOP E1.** Il blocco è la mancanza della toolchain locale, non un FAIL SQL
osservato. La Regia deve auditare patch e matrice e far eseguire le prove su
ambiente offline idoneo. Non committare prima dell'audit. E2 non iniziata e
non autorizzata; nessuna richiesta di passaggio a E2 finché il gate E1 resta aperto.
