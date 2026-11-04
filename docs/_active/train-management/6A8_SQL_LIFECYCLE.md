# 6A.8 — Capability lifecycle e replay durevole, laboratorio SQL

**6A.6 TECHNICAL PASS — 6A.7 DESIGN APPROVED — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Autorizzata soltanto 6A.8 dalla Regia dopo approvazione del checkpoint `cec3a97042ddd1cbcacc7e50cb99a9f4b76c2afd`. Branch `feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` congelata. Main avanzato indipendentemente a `77b6f642d68a4e05690fc18d90da4708e4c16766`: nessun file importato e nessun merge/rebase. D09=A resta vincolante e il broker resta fidato.

## Artefatti e riproduzione

Nuova proposta additiva: `supabase/migrations/20261104231109_serien_capability_lifecycle.sql`. Nome generato dalla CLI Supabase3.0.0, help/migration-help consultati prima di `migration new`; [evidenza](evidence/6A8/cli-create.txt). Timestamp del nome in UTC, distinto dalla data cliente del5novembre2026 Europe/Rome. Le tre migrazioni approvate6A.3–6A.5 restano byte-identiche. Nessuna applicazione al progetto reale o a staging.

```sh
SERIEN_DB_EVIDENCE=/workspace/work/6A8/results python3 tests/db/6A8/run.py
python3 tests/db/6A8/verify-invariants.py
```

Prerequisiti: Docker locale sul socket Unix, Python3/jsonschema, Node24. Il runner non accetta URL/DSN remoti o credenziali produttive. Immagine PostgreSQL17.11 fissata per digest, rete `none`, nessuna porta pubblicata, data directory tmpfs; container rimosso nel finally. Le operazioni privilegiate sono solo del supervisore fixture. Non è un servizio da distribuire.

Fixtures A/B, più dispositivi, profilo train+loose approvato importato da `tests/db/6A6/profile_fixture.py`, owner Auth sintetico legacy ancora obbligatorio. Le dieci tabelle legacy sono non vuote prima dell'espansione; tutti i loro record vengono confrontati dopo. **Nessun ownerless, serializer generale o validatore DTO più ampio.**

## Confine di fiducia e separazione

- Data plane: login per dispositivo/versione, membership worker, `session_user` fisso. Sei API6A.5 immutate più `claim_nonce(jsonb)`; nessun DML raw/ruolo amministrativo o proprietà tabelle.
- Control plane: gruppi NOLOGIN distinti control/redeemer/provisioner, login di servizio assegnati dall'operatore a workspace precisi in `control_bindings`. Flag approve/redeem/provision e max_scope sono amministrativi, non parametri che il client può impostare. Scope massimo verificato in preparazione, approvazione, redemption, attivazione, revoca e gestione del recovery. Reader/editor non possono ottenere questi gruppi.
- Executor lifecycle: NOLOGIN/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB, non possiede tabelle; funzioni definer private, search_path vuoto e riferimenti qualificati. RLS ENABLE/FORCE e USING/WITH CHECK workspace-scoped. Aggiornamenti limitati alle colonne necessarie; niente DML su snapshot/receipt/head.
- Provisioner SQL API: completa job e registra/riprende fault; **non** crea ruoli né cambia password/LOGIN. Tali DDL restano del job operatore esterno. Nel laboratorio quel job usa postgres esclusivamente nella fixture; non è un'identità trasferibile al worker produttivo.

[Matrice effettiva ACL/RLS](6A8_ACL_MATRIX.md). Il ruolo storico authorizer conserva il suo significato di laboratorio e non viene assegnato al broker/control login. Nessuna GUC o SET ROLE client come autorità. La migrazione non può proteggere da un amministratore che alteri deliberatamente registry o ACL.

## Contratto SQL per il futuro broker6A.9

### Prenotazione nonce

`serien_capability.claim_nonce(c jsonb) → {claimed,deviceId,expiresAt}` è EXECUTE-only per worker. Nessun parametro `signatureVerified`. Il DB autentica il principal, **non verifica P-256** e non tratta il digest come prova di firma.

Contesto chiuso con esattamente queste18proprietà:

```text
audience, bodyDigest, contextVersion, deviceId, domain, epoch, issuedAt,
keyId, keyVersion, layoutId, method, nonce, operation, path,
request_id, version, workspaceEpoch, workspaceId
```

`contextVersion=sql-claim-v1`, `domain=SerieN-capability-v1`, version numerica1, POST, una delle sei operazioni dati6A.5. UUID testuali canonici minuscoli; nonce32hex minuscoli; bodyDigest64hex; issuedAt numero intero epoch-millisecondi a13cifre; epoch/keyVersion/workspaceEpoch interi positivi. Contesto≤4096byte JSONB text; proprietà extra/null/tipi non ammessi respinti. Il parsing del wire originale e il rifiuto di duplicate JSON keys rimangono responsabilità del broker: jsonb è già un valore decodificato, non un parser wire.

Il broker futuro deve:

1. Verificare firma P-256/P1363 e chiave approvata sul wire originale con il protocollo6A.2; ricalcolare il digest del corpo effettivo e controllare metodo/path/audience/dominio/nonce/tempo/scope. Nessun booleano client sostituisce questa verifica.
2. Costruire il contesto dal proof verificato, aggiungendo contextVersion e versioni attese del binding. Se un epoch non è rappresentabile nel protocollo browser, fallire senza arrotondamento. Usare esclusivamente il login associato al dispositivo/versione; niente ruolo/DSN dal body.
3. Eseguire il claim come **transazione autonoma del caller**, attendere COMMIT confermato, quindi eseguire la transazione dati. In questo laboratorio il claim è un SELECT autocommit in un nuovo processo psql; il runner ne aspetta l'uscita riuscita prima del Save. Il SELECT iniziale di PID/session_user è solo metadata.
4. Non racchiudere claim e Save nello stesso BEGIN: il rollback cancellerebbe il claim. Una funzione PostgreSQL non può creare da sola una transazione autonoma; non c'è un COMMIT nascosto nel PL/pgSQL. Questo confine è un requisito del broker fidato approvato D09, verificato nel driver locale; non una garanzia contro un caller SQL malevolo.
5. Dopo claim fallito non eseguire l'operazione dati. Dopo timeout/errore o risposta persa ritentare con nuova proof/nonce/timestamp e medesimo request_id/envelope. Il DB rilegge capacità durante Save/read/recover; un claim non immunizza da revoca o cambi di epoch.

Authorize deriva device/workspace dal binding di session_user e acquisisce workspace→device; confronta i campi del contesto con quel binding e il registry corrente. Audience è configurata dall'operatore per workspace; path deve coincidere esattamente con workspace/layout/operation. Orologio DB, skew±120s. La PK esistente `(device_id,nonce)` serializza e rifiuta il riuso anche attraverso key version diverse; è più restrittiva della sola unicità per dominio, che qui ammette un unico dominio v1.

Il digest del contesto è SHA256 del suo JSONB text, **solo diagnostica interna**: non è JCS, una firma, o l'envelope digest del Save. Le sei API approvate non cambiano firma e non richiedono un handle di claim: il broker fidato deve rispettare la sequenza. Rubare le credenziali del dispositivo o compromettere il broker resta nel rischio D09, non risolto da questa funzione.

### Retention, quote e errori

Expiry del record calcolata dal server almeno5min dopo il claim e non prima del limite di validità della proof. Cleanup soltanto di righe scadute del workspace autorizzato, all'inizio di un claim che poi committa. Un diniego fa rollback anche del cleanup; non accorcia la finestra. Nessuna API worker di cancellazione o di scelta del tempo/expiry. Le righe di dispositivi inattivi possono restare dopo expiry fino a una nuova operazione autorizzata; non esiste un GC periodico in6A.8.

Default nonce_limits:1000nonce vivi/device,10000/workspace;60claim/device e120/workspace per60s. Rate windows separate da quelle dati6A.5; subject derivati dai binding, non stringhe libere client. Lock workspace evita race di conteggio; quote e policy configurabili solo dall'operatore, con CHECK di range. Il diniego non incrementa un contatore durevole: il futuro ingresso broker deve limitare anche richieste negate e tentativi prima della verifica costosa. Non sono quote o benchmark di produzione.

Codici semantici nuovi: INVALID_NONCE_CONTEXT, NONCE_EXPIRED, REPLAY, NONCE_QUOTA, NONCE_RATE_LIMITED, LIMITS_NOT_PROVISIONED, UNSAFE_PRINCIPAL; autorizzazione FORBIDDEN. Nessun rilascio di dati al fallimento. Il futuro broker deve mappare solo una allowlist e redigere gli errori PostgreSQL, mai esporre statement/DETAIL o verifiers.

## Lifecycle minimo

| API privata | Caller e risultato |
|---|---|
| prepare_device_job(job,workspace,device,principal,kind,key,scope,ticketVerifier,recoveryVersion) | Control approver entro max_scope; manifest immutabile e principal NOLOGIN sicuro; PREPARED. Stesso job/manifest restituisce esito corrente, altro manifest nega |
| approve_device_job(job,key,scope) | Control approver del workspace e scope sufficienti; key/scope devono coincidere esattamente; APPROVED |
| redeem_device_job(job,key,ticketVerifier,recoveryVerifier) | Redeemer autorizzato; stessa chiave e ticket, nessuna elevazione; registro/binding predisposti ma dispositivo non utilizzabile; ACTIVATING |
| complete_device_job(job) | Provisioner API entro workspace/scope; richiede principal LOGIN già predisposto dal job operatore e binding/epoch coerenti; attivazione e stato ACTIVE nello stesso commit |
| revoke_device(workspace,device) | Control approver entro scope del target; revoca registry/incremento epoch e job REVOKED sotto coordinatore, anche su sessioni calde |
| set_recovery_verifier(workspace,version,verifier,pepperVersion) | Control con ceiling owner; versione monotona e verifier distinto, niente secret in chiaro; nessuna sostituzione di kit riservato a un job in corso |
| transition_failed_job(job,action) | Provisioner API: fault→RECOVERABLE, resume→stato memorizzato, fail→FAILED; ACTIVE/REVOKED/FAILED non sono riattivabili da resume |
| read_device_job(job) | Caller control/redeemer/provisioner assegnato al workspace; stato e riferimenti compatti, nessun verifier/manifest segreto |

Gli helper sono invoker privati e non chiamabili da worker/control/redeemer/provisioner. Tutte le funzioni pubblicamente eseguibili sono negate ad anon/authenticated. Le tabelle lifecycle non sono una nuova API pubblica.

```text
operatore: secret adapter.prepare(job) → ruolo NOLOGIN
  → PREPARED → APPROVED → redeem key-bound → ACTIVATING
  → transazione operatore: ALTER ROLE LOGIN + complete_device_job → COMMIT → ACTIVE

PREPARED/APPROVED/ACTIVATING → RECOVERABLE → ripresa dello stesso stato
stati incompleti → FAILED (terminale)
device revocato / recovery confermato → REVOKED (terminale)
```

La forma della JWK pubblica è limitata (P-256, x/y, nessun d, dimensione e campi ammessi). Validità del punto sulla curva e prova di possesso rimangono compiti del broker futuro: la uguaglianza SQL alla chiave approvata non è una prova crittografica.

La tabella lifecycle_jobs è anche il ticket/challenge operatore key-bound e monouso, non un secondo ticket non associato alla chiave. Le invitations6A.3 legacy rimangono intatte; sono revocate insieme ai job precedenti durante recovery. Non si rappresenta una riga prepared come approvazione owner firmata: tale cerimonia deve essere integrata in6A.9.

Per PAIR/RECOVER, redemption crea device revocato e binding; per ROTATE il nuovo binding ha epoch/key_version futuri. La connessione nuova non ottiene dati finché complete non committa. Una abilitazione LOGIN amministrativa fuori ordine continua a trovare capacità revocata o binding non valido. Questo non impedisce a un superuser di cambiare manualmente le protezioni: il test prova il diniego dati con il registry normale, non sicurezza contro admin.

ROTATE conserva device e scope e usa un nuovo principal/key, incrementando epoch/key_version; i vecchi binding non vengono riassegnati. Recovery riserva la versione del verifier al job durante ACTIVATING, la consuma solo nel commit ACTIVE, revoca gli altri device/inviti/job e incrementa workspace auth_epoch. Un retry identico del medesimo job restituisce il risultato; un job diverso non può riutilizzare invito o kit. Un FAILED di recovery invalida la reservation senza riattivare il verifier. Eventuale drain/NOLOGIN dei vecchi principal e pool è lavoro esterno futuro; il diniego DB è già autoritativo.

## Fault, rollback e limiti

L'adapter secret sintetico è soltanto un dizionario in memoria idempotente per job; il test interrompe dopo put e ripete senza nuovo oggetto. Nessun secret store reale, cifratura/distribuzione segreti, credenziale persistente dopo crash del suo processo, o atomicità DB+secret store è dimostrata. Le password sintetiche sono inviate solo su stdin all'operatore e non raccolte nelle evidenze. Connessioni locali Unix trust: password authentication/TLS/Supavisor restano NOT VERIFIED.

Job/eventi hanno quote conservative256job/4096eventi/workspace e64device, senza GC distruttivo. Gli eventi append-only documentano le transizioni registrate; le revoche bulk restano nello stato durevole dei job/registry, non sono un audit completo anti-admin o un registro dei dinieghi. Le quote nonce non certificano crescita/storage fisico di tutti gli oggetti di autorizzazione, WAL o costo hosting.

Errore prima COMMIT della migrazione: rollback schema/ruoli/dati verificato. Dopo utilizzo: disabilitare i nuovi caller e conservare job/claim; nessuna down che cancelli tracce o riabiliti capacità revocate. Per job incompleto usare read/status, RECOVERABLE/resume dopo verifica operatore o FAILED terminale. Non rieseguire un vecchio job per riattivare una credenziale compromessa. Host crash, disco/PITR, multiistanza broker, TLS e segreti produttivi non sono collaudati.

Test, fault matrix e copertura dei24punti richiesti nel [rapporto sicurezza](evidence/6A8/REPORT.md); ACL effettivi in [matrice](6A8_ACL_MATRIX.md). Nessun broker/pool6A.9, ownerless D10, simulatore/UI/asset o6B implementati. **STOP6A.8 per audit Regia.**
