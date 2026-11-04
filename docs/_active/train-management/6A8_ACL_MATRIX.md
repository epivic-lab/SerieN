# 6A.8 — Matrice ACL/RLS effettiva

**6A.6 TECHNICAL PASS — 6A.7 DESIGN APPROVED — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Solo PostgreSQL17 isolato. Fonte effettiva: [before](evidence/6A8/privileges-before.json), [after](evidence/6A8/privileges-after.json), [test/osservazioni](evidence/6A8/results.json). I cataloghi includono grant tabella/colonna, ACL funzioni/schema, membership e opzioni ADMIN/INHERIT/SET, default privileges per creator e policy. Le sezioni effectiveTables/Functions/Schemas/Sequences usano has_*_privilege, includendo l'ereditarietà: non si deduce un diniego dal solo ACL nullo.

## Prima/dopo

| Principal/gruppo | Prima6A.8 | Dopo6A.8 | Limite effettivo |
|---|---|---|---|
| anon/authenticated | Zero dati e API private6A.5 | Zero EXECUTE in serien_capability, zero grant nuovi | Mancanza USAGE/ACL, nessuna policy aperta; nessun login/Auth cliente |
| serien_tm_worker e login device | USAGE + sei API save/read/recover; zero grant raw | Come prima + EXECUTE claim_nonce | Nessun table/column SELECT/DML, CREATE schema, CREATEROLE, BYPASSRLS o membership amministrativa |
| serien_tm_control | Assente | EXECUTE prepare/approve/revoke/set_recovery/read_job | Zero grant raw; control_bindings session_user/workspace, can_approve e max_scope |
| serien_tm_redeemer | Assente | EXECUTE redeem/read_job | Zero grant raw, niente approvazione o completamento; can_redeem e ceiling |
| serien_tm_provisioner | Assente | EXECUTE complete/transition_failed/read_job | Zero grant raw e zero CREATEROLE; can_provision e ceiling; nessun ALTER ROLE disponibile dal gruppo |
| serien_tm_executor | NOLOGIN, NOBYPASSRLS, non proprietario tabelle, grant limitati6A.5 | Aggiunti SELECT/INSERT/DELETE replay_nonces, SELECT nonce_limits, SELECT/INSERT/UPDATE nonce_windows, EXECUTE helper safe_device_role | Solo entrypoint claim_nonce nuovo, RLS workspace del binding; DELETE usato esclusivamente dal suo codice per righe scadute |
| serien_tm_lifecycle_executor | Assente | Owner delle nuove funzioni lifecycle/helper, NOLOGIN/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB; grant minimi sotto | Nessuna proprietà tabelle o membership nei login di servizio; nessun accesso applicativo a snapshot/receipt/head |
| serien_tm_authorizer storico | Registry/coordinatori6A.3–6A.5 | Nessun nuovo endpoint o assegnazione ai caller | Rimane autorità ampia di laboratorio, non modello di credenziale del broker |
| postgres fixture | Amministrazione isolata | Creazione ruoli/credenziali, fixture/oracoli/fault, ALTER LOGIN + complete in una transazione | Non è data plane e non è proposta di distribuzione produttiva |

I login operatori/redeemer della fixture ereditano solo il gruppo pertinente. Ogni device eredita worker senza ADMIN OPTION. safe_device_role rifiuta super/bypass/createrole/createdb/replication, membership aggiuntive o parent ereditati da worker, proprietà di relazioni/schema/funzioni, CREATE schema e qualsiasi grant raw tabella/colonna nelle due aree applicative. È eseguito in prepare, redeem, complete e claim. Testati sia extra membership sia SELECT(payload) esplicito.

## Grant colonne executor lifecycle

| Oggetto | Grant necessari | Operazioni escluse |
|---|---|---|
| control_bindings/lifecycle_limits | SELECT, filtrato per session_user/workspace | INSERT/UPDATE/DELETE, modifica flags o ceiling |
| lifecycle_jobs | SELECT/INSERT; UPDATE state,resume_state,approved_by,consumed_at,activated_at | Cambiare manifest, key, scope, principal, workspace, epoch target o ticket di un job esistente |
| lifecycle_events e sequenza identity | SELECT/INSERT e USAGE sequenza | UPDATE/DELETE, anche tramite trigger immutable_checkpoint; nessun valore secret nell'evento |
| worker_bindings/device_bindings | SELECT/INSERT | UPDATE/DELETE/rebinding di principal già esistenti |
| devices | SELECT/INSERT; UPDATE public_key,scope,epoch,key_version,revoked_at,expires_at | UPDATE id/workspace, DELETE; registry mutate consentito solo al codice delle procedure ristrette |
| device_locks | SELECT/INSERT/UPDATE(marker) | Cambiare workspace/device o cancellare coordinatori |
| workspace_locks | SELECT/UPDATE(marker) | Cambiare workspace/cancellare |
| workspaces | SELECT(id,status,auth_epoch), UPDATE(auth_epoch) | Cambiare identità/stato, crearli o cancellarli |
| recovery_verifiers | SELECT/INSERT, UPDATE consumed_at,revoked_at,reserved_job | Riscrivere version/pepper/verifier storico o cancellare; reservation vincolata alla stessa workspace via FK composta |
| invitations storiche | SELECT(workspace_id,revoked_at), UPDATE(revoked_at) | Leggere verifier/key o creare/approvare vecchie invitations tramite il nuovo executor |
| Tabelle public e session_heads/candidate_profiles | Nessun grant al lifecycle executor | Salvataggio/checkpoint/catalogo/topologia e modifiche ferroviarie |

Il maggiore potere del ruolo executor è contenuto da NOLOGIN, assenza di membership dei caller e assenza di SQL dinamico negli entrypoint. I caller non ricevono quel ruolo: ricevono solo le singole funzioni. Una compromissione dell'owner amministrativo o del codice fidato non viene dichiarata prevenuta.

## Policy e default privileges

- ENABLE/FORCE sulle nuove tabelle private. control_bindings espone all'executor solo le righe con role_name=session_user. control_scope usa tali righe per USING/WITH CHECK di job, registry, binding e coordinatori; workspaces usa id invece di workspace_id.
- Le policy nonce dell'executor dati si basano su worker_bindings/session_user; authorize6A.5 aggiunge device, scope, expiry, epoch, key_version, workspace stato ed epoch sotto lock.
- Probe RLS solo fixture: login temporaneo che eredita lifecycle_executor con binding A. SELECT/UPDATE di B non trovano righe; INSERT in B è negato da WITH CHECK. Il probe viene eliminato e non compare come ruolo distribuito. Queste prove separano RLS dal diniego ACL o dal controllo preventivo delle API.
- Nuove funzioni create e ACL revocati nella stessa transazione, owner executor appropriato, search_path vuoto, zero EXECUTE PUBLIC/anon/authenticated. Nuove sequenze e tabelle revocano esplicitamente i grant ai caller; l'executor non possiede tabelle. I default per ogni creator sono catturati, non assunti equivalenti a quelli del servizio gestito.
- I ruoli possono impostare una GUC arbitraria senza cambiare l'autorità: test A→B resta FORBIDDEN. SET ROLE authorizer e GRANT ruolo amministrativo dal device sono realmente negati. Nessuna API HTTP SQL è stata creata.

Il progetto Supabase reale non è stato interrogato né alterato. Default ACL gestiti, schema exposure, delegabilità di creazione/rotazione ruoli e isolamento dei servizi richiedono staging autorizzato; non sono certificati dai cataloghi vanilla qui raccolti.
