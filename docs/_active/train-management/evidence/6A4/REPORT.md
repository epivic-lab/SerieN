# 6A.4 — Rapporto alla Regia

**PASS tecnico del nucleo transazionale nel profilo sintetico vincolato. Validatore generale e SaveCheckpoint integrato NON IMPLEMENTATI. Approvazione indipendente PENDING.** Checkpoint remoto da verificare dopo commit/push nella consegna finale; nessuna 6A.5 iniziata.

Baseline approvata `558f43b44be08235f6d30b6f18bd3b4ef07a4c53`; branch `feature/train-management`. Fetch riuscito con l'accesso di rete supportato dal sandbox dopo il tentativo iniziale senza rete; il connettore GitHub ha confermato lo stesso SHA e main/R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Nessun reset/rebase/force/merge. AGENTS letto integralmente e contratti, schema DTO, migrazioni, runner, rapporti precedenti e matrice R0 originale esaminati.

## Codice, sicurezza e perimetro

[Contratto completo e gap R0 P09–P15](../../6A4_TRANSACTIONS.md). Nuova migrazione additiva `supabase/migrations/20261104172819_serien_atomic_checkpoint.sql`; nucleo PL/pgSQL privato, adapter `prototypes/train-management/transaction-core/envelope.js`, runner e verificatore in `tests/db/6A4/`. Nessuna modifica retroattiva a 6A.3 o al prototipo 6A.2. Nessun caller browser/HTTP o dipendenza produttiva nuova.

Il salvataggio accetta il DTO sintetico completo provisionato dal server, con variazioni solo di stateId/ui.day/otto scambi. Tutte le altre modifiche sono respinte. Questo delimita rigorosamente la prova transazionale: non è validazione generale del catalogo, Journey, occupazione o stato arbitrario. Le proiezioni train/loose hanno identità e posizione fisse e ricevono insieme la nuova state_version. Non si pretende un funzionamento senza owner Auth: viene riusato l'unico owner Auth già sintetico della fixture legacy isolata, non creato un account di produzione o modificato il vincolo NOT NULL.

[Matrice grant effettivi prima/dopo e colonne executor](privileges.json), [disegno precedente all'implementazione](privilege-design-before.md). Il worker mantiene SELECT workspace-scoped e marker, ottiene solo EXECUTE del save; non ha DML raw per saltare il protocollo. La funzione SECURITY DEFINER è privata, non pubblica, search_path vuoto, posseduta da un NOLOGIN/NOBYPASSRLS/non-superuser senza tabelle proprie. L'esecutore ha grant limitati e RLS USING/WITH CHECK basata su session_user; nessun GUC conferisce autorità. UPDATE(id) stock_items è necessario solo a SELECT FOR UPDATE del trigger loose storico e non viene usato per cambiare ID. Le chiamate di salvataggio reali usano LOGIN distinti legati a workspace **e device**, con test contro SET ROLE/SESSION AUTHORIZATION e falsi GUC. Il futuro piano di provisioning/pooling non è approvato implicitamente.

## Risultati effettivi

| Verifica | Risultato | Evidenza |
|---|---|---|
| Runner `python3 tests/db/6A4/run.py` | **45 controlli PASS**, PostgreSQL17.11 reale, immagine fissata per digest | [log](db-test.txt), [casi e stati DB](results.json), [stato finale](final-state.json) |
| Regressione schema approvato `tests/db/6A3/run.py` | **51 PASS** in un diverso container effimero | [log](regression-6A3.txt), [risultati](regression-6A3.json) |
| `node prototypes/train-management/transaction-core/envelope.test.js` | **12 PASS**, zero fail/skip | [log](envelope-test.txt) |
| `npm test` | **37 file PASS**, zero fail/skip | [log](npm-test.txt) |
| `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` | **9 PASS** | [log](python-tests.txt) |
| `npm run build` | **PASS**, bundle R1 identico | [log](build.txt), [invarianti](invariants.json) |
| `python3 tests/db/6A4/verify-invariants.py` | **1451 file baseline immutati**, esclusi i tre documenti di gate autorizzati | [invarianti](invariants.json) |

`results.json` registra per scenario operazione, atteso, osservato e riferimenti SHA256 allo stato iniziale/finale completo nel campo `databaseStates`. `compact.py` elimina soltanto duplicati di evidenza senza perdere valori. Tutte le tabelle snapshot/receipt/head/train placement/loose placement sono osservate realmente prima/dopo ogni scenario. Il runner verifica anche sequenza contigua 1..head, conteggio ricevute uguale a snapshot e revisione di entrambe le proiezioni uguale al head finale in ciascun workspace.

I 24 scenari obbligatori sono coperti: primo/secondo checkpoint; retry immediato e dopo avanzamento; reuse di digest/envelope/attore diversi; race CAS e identica; fault SQL in tutti i sub-step previsti; risposta post-commit scartata e recuperata identica; topology, otto switch, resume/version/profilo invalidi; cross-workspace, reader, anon/authenticated, contesto SQL falso; constraint ferroviario deferred; legacy non vuoto e rollback migrazione. Ulteriori controlli includono digest ricalcolato, recovery come nuova revisione e fonte inesistente/trasversale, expiry/revoca locali e serializzazione di save/revoke.

Concorrenza **reale**: due processi psql con login workspace sono avviati mentre un terzo trattiene il head. Il test osserva entrambi attivi e bloccati su lock in `pg_stat_activity`, poi un solo avanzamento. Le richieste diverse producono un solo successo e un REVISION_CONFLICT esplicito; quelle identiche due copie della ricevuta originale. Non sono due invocazioni sequenziali presentate come race.

Fault **SQL simulati**: prima snapshot, dopo snapshot, durante train projection, durante loose projection, prima head, prima receipt. Ogni errore lascia tutte le componenti esattamente precedenti. Il fault railway cancella via hook di test l'unico membro di un consist ready; SET CONSTRAINTS ALL IMMEDIATE intercetta il vincolo deferred e annulla anche snapshot/head/proiezioni/ricevuta. **Terminazione reale**: pg_terminate_backend sul backend osservato in pausa dopo INSERT snapshot; connessione effettivamente terminata e stato durevole identico al precedente. Non sono kill reali tutti i sei fault point.

Risposta persa: il driver scarta il risultato di una chiamata committata e ritenta lo stesso envelope/request_id; il DB restituisce JSON originale e nessuna revisione extra. Non è una chiusura HTTP tra gateway e browser, che qui non esistono. PostgreSQL usa i default fsync/synchronous_commit; dati tmpfs del laboratorio: nessuna prova di durabilità dopo perdita dell'host o crash storage.

Preservazione [legacy](legacy-before-and-after.json): tutte le dieci tabelle hanno dati sintetici prima dell'expand; ogni riga originale è ritrovata con tutti i valori originali, inclusi timestamp. Due nuovi workspace indipendenti hanno ciascuno loco/consist/train placement e wagon loose, oltre a catalogo sintetico e Journey completi. Nessun backfill delle righe legacy. Errore della nuova migrazione prima COMMIT: dump schema identico, ruolo executor assente e dati invariati. Il rollback provato non è una down migration distruttiva dopo nuove scritture.

## Correzioni emerse durante il collaudo

Il primo tentativo di save ha evidenziato SELECT su consists necessario al trigger placement; la fixture loose ha richiesto anche SELECT stock_items e il solo privilegio colonna per il lock storico. Il fault deferred ha evidenziato EXECUTE del helper assert_ready_consist necessario al contesto executor. Aggiunti soltanto questi grant e le rispettive policy workspace; nessun allargamento amministrativo. Il trigger di coordinamento condiviso doveva usare rami IF separati per i campi OLD diversi di workspaces/devices: corretto e riprovata la race di entrambe le revoche. Tutti gli esiti finali si riferiscono al file SQL corretto e alla fixture con train **e** loose.

Il comando CLI host non poteva scrivere nella home read-only; eseguito correttamente in container senza rete e senza cambiare HOME. Nessun risultato positivo attribuito ai tentativi falliti. Il changelog Supabase è stato negato HTTP403 (NOT VERIFIED per quel canale); documentazione RLS/SECURITY DEFINER corrente consultata con search_docs. Non è stato eseguito alcun advisor/migrazione contro il progetto reale.

## Invarianti, residui e checkpoint

Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; bundle SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`. App, 150 rail/75 bed, geometrie/topologia, otto scambi, motore/Journey/routing/guardia, asset, UI/HUD/minimappe/camera, package e workflow byte-identici alla baseline. Non sono nuove misure GPU/prestazioni o nuove prove browser integrate R1: NOT VERIFIED, nessun runtime modificato.

**Zero operazioni sul Supabase reale**: niente credenziali produttive, DDL/DML/Auth/RLS/grant/Edge/config/deploy. Nessuna modifica main/Pages o altri repository. Le sole funzioni privilegiate amministrative tm_fault sono fixture temporanee, mai nella migrazione proposta. Le prove positive avvengono col ruolo limitato; postgres serve al provisioning, agli oracoli e ai fault.

NOT VERIFIED / NON IMPLEMENTATI: SaveCheckpoint generale con validazione semantica integrale e riscrittura arbitraria proiezioni; proof/epoch end-to-end con gateway; revoca distribuita e read path revocabile; provisioning SQL per dispositivo/pool/TLS; cutover senza owner e lifecycle Auth legacy; autosave/journal/offline/reconnect browser; quote/throughput/storage/rate; crash OS/storage/PITR/backup; piattaforma Supabase/PostgREST e configurazione esposizione reale. Nessuno è dedotto PASS dai test locali. Tracciabilità dettagliata R0 P09–P15 nel contratto, identificativi originali P01–P18 conservati.

Commit atomico identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A4/REPORT.md`. Push normale soltanto feature/train-management, verifica SHA remoto/locale e working tree nella consegna. Il checkpoint è parte di DONE; in caso di mancata verifica la consegna è BLOCKED. **STOP per audit indipendente della Regia; non iniziare 6A.5.**
