# SerieN — 6B.2-C Gate offline: RPC cloud candidate

Data: 2026-11-05. **Esito Regia: PASS SOLO OFFLINE, PRODUZIONE NON AUTORIZZATA.**

## Base ed evidenza indipendente

- Repository: `epivic-lab/SerieN`, branch `feature/train-persistence-auth`; **main al kickoff** `9126788d3c68e43c0687e948db767bfccbbfc774`, R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`.
- Base 6B.1 Capture & Restore approvata, cloud ancora `enabled:false` sul simulatore; 6B.2-A/B schema e CAS precedentemente provati.
- Gate schema reale: [run 42120784522](https://github.com/epivic-lab/SerieN/actions/runs/42120784522), **SUCCESS** su `bada6b6309d60c02b5bf0433de12089b37d1809d`. Fixture JSON prodotta da `captureState()` reale, validata con `pg_jsonschema` in container Supabase PG17; cinque alterazioni respinte. Scoperto e risolto **nella derivazione server** che `format:uuid` non era vincolante: tutte le 17 posizioni UUID ricevono un pattern ancorato. File sorgente schema non alterato.
- Gate RPC definitivo isolato: [run 42122966438](https://github.com/epivic-lab/SerieN/actions/runs/42122966438), **SUCCESS** sul commit `856356630b2f42dfdd05461492eda0fae41b38e7`; log letto direttamente:
  - `PASS: synthetic replica of 3 audited tables + triggers + RLS`
  - `PASS: audited schema RPC candidate — owner, open, full DTO, save/load, replay, conflicts, invalid-input denial`
  - `PASS: 6B.2-C FINAL RPC — two real contending sessions, one R2, one conflict, retry after COMMIT`
- Sono stati utilizzati esclusivamente container DB effimeri e tre identità sintetiche. **Nessun database di produzione raggiunto dai workflow, nessuna credenziale Supabase, nessuna modifica a main o R1.**

## Materiali del checkpoint (non migrazione)

- `tests/sql/6b2c_cloud_rpc_candidate.sql` — **SQL candidato OFFLINE**: quattro RPC specifiche, ruolo `serien_rpc NOLOGIN NOBYPASSRLS`, RLS dedicate, SHA-256 del testo immutabile, serializzazione advisory lock per UID, receipt prima del CAS, snapshot append-only (per superficie di grant), JSON Schema rinforzato, riferimenti item/consist/train/manifest e 75 segmenti R1. NON spostare sotto `supabase/migrations` né applicare senza successivo gate.
- `tests/sql/6b2c_real_schema_fixture.sql` — replica di `layouts`, `layout_snapshots`, `operation_receipts`, indici/constraint e trigger rilevati da catalogo reale in sola lettura, inclusa allowlist sintetica.
- `tests/sql/6b2c_rpc_gate.sql` — bootstrap personale A/B, head=0, save, read, payload esatto, replay, conflitti, divieti CRUD, referenze e DTO invalidi, utente estraneo.
- `tests/run-db-rpc-concurrency-6b2c.sh` — due sessioni PostgreSQL *realmente sovrapposte* con lock concesso/atteso, una sola R2, conflitto e replay dopo commit da nuova connessione.
- `.github/workflows/persistence-db-rpc-6b2c.yml` — esegue le prove unicamente in `supabase/postgres:17.11.0.018` temporaneo.
- `tests/gen-6b2c-fixture.mjs`, `tests/gen-6b2c-strict-schema.mjs`, `tests/db-schema-6b2c.sql`, `.github/workflows/persistence-db-schema-6b2c.yml` — provenienza e test forma.

## Decisioni semplici provate

1. Nessuna nuova tabella/colonna head: `workspaceId = auth.uid()`, primo `layoutId=auth.uid()`, head = `MAX(revision)` sotto lock per UID.
2. Nessuna API SQL generica o `service_role` nel browser: quattro RPC specifiche; `anon/authenticated` senza CRUD diretto sulle tabelle; il ruolo DEFINER NON è tabella-owner né bypass RLS. Prove A/B, outsider e anonimato PASS in DB isolato.
3. Ricevuta `(owner_id,request_id)` verificata **prima** del CAS. Per retry richiedere **identico testo/envelope**, non JSON equivalente con serializzazione diversa. SHA-256 server su envelope testuale versionato, **NON** RFC8785/JCS. Crash/rollback e retry già dimostrati in 6B.2-B; concorrenza e retry dopo commit dimostrati anche nella candidata C.
4. JSON Schema v1 DERIVATO e fissato dal codice già approvato, con pattern UUID espliciti; nessun valore fornito dal client decide lo schema, hash di topologia o lista degli asset. L'utente non può modificare R1 con un salvataggio.
5. Restore continua a usare la 6B.1 con gate `STOPPED`, staging e verifica occupazione, non il DB come motore ferroviario.

## Gate NON superati — prima di qualsiasi produzione

- **Validazione semantica completa**: il candidato verifica schema, unicità/assegnazione identità, consist, manifest digest/revisioni e ID/lunghezze degli edge. NON è una dimostrazione lato server di tutte le connessioni Journey, vincoli geometrici R1, collocazioni, sovrapposizioni, accoppiamenti e geometria/coupler esatta dei modelli. La validazione browser 6B.1 NON sostituisce integralmente quella del server. Definire esplicitamente la superficie di rischio residua e decidere test/politica di accettazione; nessun gate finale PASS prima di chiuderlo.
- **Revoca durante transazione**: check allowlist dopo lock della RPC, ma non è implementato un percorso amministrativo di revoca con lock condiviso, né test di revoca realmente concorrente. Servono ordine di lock e collaudo.
- **Estensione necessaria**: `pg_jsonschema` disponibile su PostgreSQL 17 di produzione, **non installata**. L'eventuale installazione sarebbe una modifica DB distinta da autorizzare; il laboratorio ha dimostrato la compatibilità nella versione container.
- **Migrations/preview Supabase**: `MIGRATIONS_FAILED` segnato nel branch preview `main`, mentre progetto produzione `ACTIVE_HEALTHY` con tre migrazioni registrate. Chiarire prima di altre migrazioni.
- **Secondo account Google**: la composizione dei due login reali è coerente con un login ammesso e un outsider; il secondo indirizzo autorizzato non ha ancora login confermato. Collaudare Sergio senza esporre email.
- **Restano NON provati**: quote/limiti aggregati di spazio (oltre ai 2MiB per richiesta), storicizzazione/paginazione completa, restore con asset reali cloud e rete PostgREST, comportamento su JWT scaduti/revoca, trigger/privilegi su catalogo di produzione dopo migrazione, deployment e UI.
- **Regressione 6B.1**: [run 42122966437](https://github.com/epivic-lab/SerieN/actions/runs/42122966437), **SUCCESS** sul medesimo SHA di codice C `856356630b2f42dfdd05461492eda0fae41b38e7`. Il documento aggiunto dopo non modifica codice applicativo; non confondere PASS DB con copertura completa delle ulteriori condizioni di produzione.
- Il candidato SQL è una *bozza validata in replica*, non una migrazione approvata. Prima dell'uso: audit indipendente riga per riga, migrazione formalizzata/rollback, review dei GRANT/capacità del ruolo, Supabase advisors ed esplicita autorizzazione della Regia.

## Stato e prossima mossa

**6B.1 APPROVATA; 6B.2-A/B PASS isolati; 6B.2-C schema + RPC + concorrenza PASS isolati; cloud di produzione DISABILITATO; gate produzione APERTO.** 

Prossima microfase raccomandata: 6B.2-D audit dei gap reali (revoca concorrente, limiti validazione Journey/asset, immagini/test auth) e piano di migrazione minimo, ancora senza scritture a produzione.

## Evento esterno rilevato durante l'audit finale

**main è avanzato indipendentemente** dopo il kickoff: ora `36711a29aa38f3b60581d4ee01327825cd6fe56c` (merge del 5 novembre 2026 ore 22:36 UTC, autore `epivic-lab`, genitori `cf1fba9f8313af6cfd70ce539a06e4c7ece3b371` e `9126788d3c68e43c0687e948db767bfccbbfc774`). Il ramo di lavoro è `diverged`, avanti 38/indietro 2 rispetto a main all'audit. Questo cambiamento **non è stato eseguito dalla Regia**, che ha scritto soltanto su `feature/train-persistence-auth`. Non rebase/merge/reset automaticamente: fare riconciliazione distinta prima della futura integrazione. La validità del gate RPC **isolato** resta riferita allo SHA del test.
