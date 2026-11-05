# SerieN — 6B.2-D | Audit sicurezza e piano di migrazione minimo

**Data:** 2026-11-05. **Decisione della Regia:** controlli DB **PASS offline**, migrazione **NON AUTORIZZATA**, cloud ancora disabilitata. Questo documento non costituisce consenso per una scrittura a Supabase, un merge o un deploy.

## 1. Evidenza osservata, non riferita da Codex

**Baseline:** repo `epivic-lab/SerieN`; solo branch `feature/train-persistence-auth`. Commit del candidato auditato `d24732f07ab5d619bd32d8be0d6e04f5d16a4b13`. Baseline R1 intoccabile `348bfeff12c4005657098d89ea1d3c2ccdda9910`. `main` ora `36711a29aa38f3b60581d4ee01327825cd6fe56c`; i due commit esterni dalla base `9126788d` contengono soltanto `.DS_Store`, immagini e modelli GLB (non file persistence/Auth). Il ramo è divergente; NON effettuare reset, merge, rebase o sovrascrittura dei nuovi asset in questa fase.

**Test indipendenti, SHA IDENTICO:**
- [6B.2-D — tre migrazioni AUTENTICHE + API + rollback, run 42126988843](https://github.com/epivic-lab/SerieN/actions/runs/42126988843): **SUCCESS**, log letto dalla Regia. Contiene test su database Supabase PostgreSQL 17 effimero (nessuna connessione/chiave di produzione): 
  `PASS: actual historical migrations replayed with synthetic Auth`;
  `PASS: audited schema RPC candidate — owner, open, full DTO, save/load, replay, conflicts, invalid-input denial`;
  `PASS: 6B.2-C FINAL RPC — two real contending sessions, one R2, one conflict, retry after COMMIT`;
  `PASS: both revocation races are linearizable, without a new administrative endpoint`;
  `PASS: candidate rollback restores original RPC/policy/role surface without deleting history`.
- [6B.1 regressione ferroviaria, run 42126989235](https://github.com/epivic-lab/SerieN/actions/runs/42126989235): **SUCCESS** sul medesimo commit del codice `d24732f07...`. Il candidato C/D modifica **solo test, SQL non applicato, documenti e workflow**, mai motore R1 o pubblicazione.
- [6B.2-C validazione di uno stato Capture reale, run 42120784522](https://github.com/epivic-lab/SerieN/actions/runs/42120784522): **SUCCESS**, incluso `pg_jsonschema` con `format: uuid` rafforzato in pattern server (17 campi).

**Storia delle migrazioni autentiche**, letta da `supabase_migrations.schema_migrations.statements[1]` tramite SELECT in produzione; copiata byte per byte in `tests/sql/history/`; verificata in GitHub Actions tramite MD5:
- `20261029230530_serien_core_schema` — `6714898735ce079b8848e019d7819c20`;
- `20261029230558_serien_constraints_security` — `0a4b887af0d0703f1250bb15f2ccf2b1`;
- `20261105155420_serien_verified_email_gate` — `ffdc9caaa8818aca5ba413ff179d64f0`.
I tre testi SQL sono soli DDL, senza dati, email reali o INSERT. `tests/sql/6b2d_docker_auth_adapter.sql` adatta **esclusivamente** il container di prova alla tabella Auth ospitata; `tests/sql/6b2d_synthetic_users.sql` crea identità fittizie. Questa prova supera quella manuale di replica 6B.2-C, ma NON è il sistema remoto Auth/PostgREST completo.

**Produzione attuale (sole SELECT):** PostgreSQL 17.11; circa 12,3 MB `pg_database_size`; ZERO `layouts`, ZERO `layout_snapshots`, ZERO `operation_receipts`, ZERO quattro RPC cloud; `pg_jsonschema` disponibile ma **NON installato**. La storia delle migrazioni elenca soltanto i tre ID sopra. Le tabelle RLS restano con CRUD diretto revocato a `authenticated`/`anon`.

## 2. Scelte approvate nel limite della prova isolata

**Nessun nuovo servizio, tabella o colonna head.** `workspaceId = auth.uid()`; layout personale iniziale `layoutId = auth.uid()`. Quattro RPC limitate: `serien_open_workspace`, `serien_read_head`, `serien_read_snapshot`, `serien_save_checkpoint`.

**Difesa in profondità:** ruolo `serien_rpc NOLOGIN NOINHERIT NOBYPASSRLS` senza membership, non proprietario delle tabelle. Funzioni esposte `SECURITY DEFINER` con `search_path=''`, SQL statico, EXECUTE solo a `authenticated`; schemi/helper interni non esposti. RLS owner + allowlist specifiche per il ruolo tecnico; zero accesso CRUD diretto client. Il piccolo helper privato `serien_access_allowed_lock()`, `SECURITY DEFINER` del proprietario della migrazione, restituisce solo booleano e applica `FOR SHARE` alle righe di `auth.users` e `serien_access.allowed_emails`: la revoca amministrativa standard per DELETE/UPDATE attende o precede la transazione. **Testati entrambi gli ordini con DELETE reale concorrente; UPDATE non provato separatamente.** Nessuna API admin aggiuntiva.

**Salvataggio:** advisory transaction lock per proprietario, controllo allowlist *dentro* il lock, snapshot append-only, receipt prima della verifica CAS, digest SHA-256 di testo/envelope immutabile (NON RFC 8785/JCS); retry con lo stesso identico testo e request ID; conflitto esplicito, senza last-write-wins. `resumePolicy=STOPPED`; storia esistente mai mutata. Nuova revisione R+1 solo se head = expected. Doppia scrittura e fault simulati in 6B.2-B/C.

**Antiabuso:** 2 MiB massimi per documento; proposta codificata di limite `64 MiB` complessivi di `payload::text` per proprietario, conteggio sotto lock; errore `OWNER_QUOTA_EXCEEDED`, nessun pruning. Verificata la matematica ai bordi senza riempire artificialmente un database di 64 MiB; carico/saturazione non stress-testati. È una misura conservativa, non equivalenza esatta al consumo fisico PostgreSQL (TOAST, indici e WAL). Supabase Free dichiara 500 MB DB per progetto: https://supabase.com/docs/guides/platform/billing-on-supabase

**Compatibilità R1:** JSON Schema 2020-12 completo, UUID con pattern server; referenze di modelli/item/consist/treni, revisioni/digest asset, identità locomotiva, console/LRU, inventario 6D rifiutato, 75 edge con ID e lunghezze. Nessun cambiamento geometrico. Il server gestisce proprietà/struttura/compatibilità; il restore locale 6B.1 rimane il guardiano delle pose e dell'occupazione.

**Rollback:** `tests/sql/6b2d_rollback_rehearsal.sql` è un esercizio offline riuscito. Elimina solo RPC, funzioni interne candidate, policy e ruolo; lascia le tre migrazioni originali, le tabelle, l'allowlist e `serien_access_allowed()` intatti. Non elimina automaticamente `pg_jsonschema` se l'estensione è condivisa. Il ritorno in produzione richiede uno script riesaminato e una decisione amministrativa separata.

## 3. Rischi residui reali: gate produzione ancora CHIUSO

**A. Semantica ferroviaria completa sul server — aperto.** Oggi il candidato non certifica integralmente connessioni tra segmenti Journey, location/position, occupazione e collisioni R1, parametri di accoppiamento/coupler reali, tutti i vincoli route/guard e compatibilità dettagliata asset/manifest. La 6B.1 li gestisce in staging/browser ma questo NON equivale a validazione lato server. Per non introdurre un *secondo motore geometrico*, la prossima microfase deve definire una prova per gli invarianti server ragionevolmente replicabili e separare gli oracoli R1 client eseguiti solo al restore, esplicitando il rischio residuo. Evitare accettazione silenziosa o riparazioni distruttive.

**B. Integrazione reale OAuth/PostgREST — aperta.** Non provati HTTP/RPC con JWT reale, perdita di connessione al browser, expiry token, salvataggio e recupero cross-device, asset Kenney in una sessione cloud, limiti reali di gateway. `src/persistence/cloud-adapter.js` resta `enabled:false`; gli UUID locali generati da 6B.1 devono essere legati a `auth.uid()` e layout server PRIMA della prima capture cloud. Retry deve conservare exact `p_state_text`.

**C. Accesso del secondo utente autorizzato — aperto.** Due utenti Google confermati, uno matching allowlist, uno escluso; secondo indirizzo autorizzato non ancora registrato come Google in Supabase. Coerente con test utente primario/outsider, ma non prova l'accesso di Sergio. Fare test manuale Sergio + outsider, senza inserire email nel codice né nei log. Non modificare l'allowlist solo sulla base dei conteggi.

**D. Supabase preview metadata — aperta.** API `list_branches` riporta un branch `main` con `MIGRATIONS_FAILED` (metadata ferma al 2026-10-29), anche se il progetto principale è `ACTIVE_HEALTHY` e le tre migrazioni sono presenti e riproducibili. Non effettuare reset, rebase, merge o creazione di branch Supabase. Usare il replay Docker fedele su Free; chiarire il record prima della migrazione.

**E. Conflitti di integrazione GitHub — aperti.** `main` è `36711a29...`, avanzato indipendentemente di 2 commit grafici. Nessun merge automatico o sovrascrittura delle nuove GLB. Fare PR mirata con confronto degli alberi, preservando il deployment/Auth main e R1.

**F. Gestione capacità/retention e rollback reale — aperta.** 64MiB/owner può essere raggiunto; implementare errore comprensibile e possibilità di esportare lo snapshot prima di abilitare salvataggi ripetuti. L'immutabilità vale al ruolo applicativo; le FK su `auth.users` con ON DELETE CASCADE continuano a consentire cancellazione amministrativa account/storico. Confermare comportamento atteso e possibilità di export. 
In produzione `pg_jsonschema` NON è ancora installato; non usare il PASS Docker per dichiararne l'installazione realizzata.

## 4. Piano minimo per una futura migrazione, NON eseguire ora

1. **Freeze ed esame del codice:** Regia approva SHA esatto, SQL riga per riga, differenza con `main` aggiornata, replica locale delle tre migrazioni originali, regressione R1, test JWT/allowlist, gap semantici e piano di rollback. Niente interventi da checkout Codex obsoleto.
2. **Preflight produzione read-only:** confermare progetto, versione PG, tre versioni/MD5 delle migrazioni, tabelle/PK/FK/RLS/grant attuali, zero RPC cloud, dimensioni DB, extension disponibile e Auth allowlist senza rivelare PII. Verificare metadata preview.
3. **Preparare migrazione con Supabase CLI verificato:** creare il nome via `supabase migration new` su checkout pulito, non inventare un ID, e portare solo l'SQL necessario: estensione `pg_jsonschema` se confermata, helper privato di revoca, ruolo senza privilegi, nove policy dedicate e quattro RPC. Una sola applicazione transazionale/atomica, con REVOCHE/GRANT corretti e `search_path=''`; **nessuna modifica alle dieci tabelle** né ai dati esistenti. Verificare la transazionalità reale del runner prima di autorizzarne l'esecuzione.
4. **Autorizzazione separata:** nessuna applicazione su Supabase prima del consenso esplicito. Su consenso futuro, migrare DB con cloud UI ancora disabilitata, verificare metadati/grant/ownership/advisors e RPC tramite sessioni autorizzate ed estranee, registrare audit. Se fail, rollback approvato; non cancellare gli account né lo storico.
5. **Solo dopo:** integrare nello stesso client Auth Google le UI manuali **Salva** e **Carica** con retry e CAS, preflight da due dispositivi, STOPPED dopo restore e protezione da stato corrotto. Autorizzare separatamente merge selettivo su `main` e deploy; niente autosave nella prima release.

**Prossimo passo più piccolo: 6B.2-E** — chiudere i controlli semantici effettivamente richiesti e progettare l'adapter browser su client condiviso, testando offline con le quattro RPC isolate e copie di snapshot reali. Non iniziare migrazione o deploy senza un successivo gate della Regia.

## 5. Stato

| Fase | Esito |
| --- | --- |
| 6B.1 locale Capture/Restore + R1 | PASS |
| 6B.2-A/B ruoli, CAS, idempotenza | PASS isolato |
| 6B.2-C DTO completo, RPC, concorrenza | PASS isolato |
| 6B.2-D revoca concorrente, migrazioni vere, rollback, antiabuso | **PASS isolato con limiti espliciti** |
| Produzione DB/Google multi-account/HTTP/cloud UI | **STOP: NON AUTORIZZATO, NON APPLICATO** |

La Regia ha fatto solo **SELECT su Supabase produzione** e modifiche a `feature/train-persistence-auth`; nessun merge o deploy, nessuna modifica ai dati, agli account e al motore ferroviario.
