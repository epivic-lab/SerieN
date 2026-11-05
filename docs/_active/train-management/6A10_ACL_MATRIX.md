# 6A.10 — privilegi, RLS e creator controllato

D09=A e principal/session_user restano il confine di autorizzazione del dato. Il
broker6A.9 e i suoi sorgenti non cambiano. Il DB continua a non verificare P-256;
il browser non sceglie owner/principal o approvazioni di workspace.

| Ruolo/componente | Provenienza legacy | Creazione workspace | Dati applicativi |
|---|---|---|---|
| anon / authenticated / PUBLIC | Nessun grant | Nessun EXECUTE | Nessun grant; policy Auth ritirate anche da catalogo e segments |
| worker / login device | Nessun raw SELECT/DML | Nessun EXECUTE | Sei API limitate e claim_nonce6A.8; scope/epoch/version/revoca e RLS precedenti invariati |
| control / redeemer / provisioner6A.8 | Nessun grant nuovo | Nessun EXECUTE | Solo lifecycle approvato; nessun nuovo potere dal cutover |
| serien_tm_executor6A.5 | Nessun grant ledger | Nessun EXECUTE creator | API definer proprietarie limitate, non table-owner/NOBYPASSRLS, nuova ownerNULL nei checkpoint |
| serien_tm_workspace_operator | Nessun raw grant su ledger o job | Solo EXECUTE create_ownerless_workspace(job_id) | Nessun raw INSERT workspace/catalogo; nessun CREATEROLE/BYPASSRLS |
| serien_tm_workspace_executor | Nessun grant ledger; ownerNULL non richiede lettura del ledger | NOLOGIN/NOBYPASSRLS/non table-owner; possiede solo il creator | SELECT/INSERT strettamente job-bound, UPDATE status consist e id stock per lock; niente snapshot/receipt, device/lifecycle/grant o catalogo DML |
| Supervisor operatore fixture | Backfill/manifest e job approvati fuori banda | Prepara job e SQL principal del control plane | Privilegi di sola fixture, mai mount/credential nel data plane |
| n10_maintenance (solo clone test) | SELECT/DELETE per test FK RESTRICT | Nessun potere amministrativo | Non-superuser/non-owner/NOBYPASSRLS, grant/policy fixture espliciti per distinguere vincoli da ACL |

[ACL effettivi](evidence/6A10/effective-privileges.json) e cataloghi before/after
riportano grant tabella/colonna/schema/funzione, ruoli policy e default ACL. Ledger e
job hanno RLS ENABLE+FORCE. Nessun grant nuovo ad anon/authenticated, nessuna policy
USING(true) introdotta. Le policy globali preesistenti approvate non sono ampliate.

Il collector registra gli ACL raw e quelli effettivi: pg_dump può rappresentare un
ACL owner-only esplicito con il default NULL equivalente. Nel confronto restore
restano verificati i privilegi effettivi, senza confondere la rappresentazione con
un grant pubblico. Sul clone si concede SELECT ad authenticated in transazione e
si usa l'effettiva session authorization Auth con claim UUID dell'owner storico:
**zero righe visibili in tutte le dieci tabelle**, poi ROLLBACK dei grant. Non è un
SET ROLE del pool né una capacità consegnata al browser. Anon/authenticated non
sono LOGIN nel bootstrap: il solo supervisor imposta la session authorization per
queste prove negative; i broker mantengono principal fisso su connessione propria.

Il creator accetta un solo job UUID. La riga privata, scritta da operatore fuori
banda, contiene operator SQL role, target workspace/layout, source profile e audience,
approvazione e risultato. L'esecutore controlla membership del gruppo operatore,
assenza di poteri amministrativi, session_user corrispondente e job approvato, con
lock/idempotenza. L'operatore non può autoapprovare via raw UPDATE/INSERT. Job non
approvato, di altro operatore o inesistente sono FORBIDDEN. Nessuna API HTTP del
creator viene aggiunta.

La funzione copia solo il profilo sintetico certificato train+loose, rimappa gli ID
applicativi nuovi e conserva modelli/topologia/Journey. Non accetta DTO arbitrario,
owner, SQL o scope dal client. Crea layout, oggetti figli e head0, limiti/locks e
candidate profile, senza snapshot/receipt di successo inventati. Il risultato
idempotente è l'esito iniziale della creazione, non una lettura della head corrente;
per quest'ultima si usa ReadHead. Pairing e grant device avvengono poi esclusivamente
tramite il lifecycle6A.8 già approvato.

RLS del creator deriva target/source solo dai job autorizzati di session_user, senza
workspace GUC. Gli statement sulle proiezioni e i constraint deferred terminano
prima di marcare il job completo. Catalogo solo SELECT; le credenziali dispositivo/
redeemer del broker non ereditano il gruppo operatore o l'executor del creator.
Il test di read-only dopo nuove scritture revoca Save/Recover sul solo clone: letture
preservate e nessun dato cancellato. Non è un recovery gestito dopo perdita del
secret store, che rimane NOT VERIFIED insieme a Supabase/Supavisor/hosting.
