# 6A.5 — Storico privato, integrità e recovery in laboratorio

R0 e 6A.1–6A.4 approvate dalla Regia. Baseline `6bf92bf6f100e1c74567dd2b1ed898874e50e66a`, branch esclusivo `feature/train-management`; main/R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` immutabile. Autorizzata soltanto 6A.5; nessuna produzione o 6A.6.

## Artefatti e riproduzione

Proposta `supabase/migrations/20261104175236_serien_history_integrity.sql`, generata con Supabase CLI 3.0.0 dopo help, in container senza rete. Le migrazioni 6A.3/6A.4 sono immutate. Viene applicata esclusivamente al PostgreSQL17 effimero del runner, mai al Supabase reale. Il laboratorio conserva owner Auth/FK legacy; l'unico owner sintetico preesistente è condiviso intenzionalmente da A/B, senza introdurre shadow users.

Dalla root con Docker locale, Node e Python/jsonschema preinstallati:

```
python3 tests/db/6A5/run.py
node prototypes/train-management/history-access/protocol.test.js
python3 tests/db/6A3/run.py
python3 tests/db/6A4/run.py
```

`SERIEN_DB_EVIDENCE` indica soltanto una directory locale. Runner senza URL/credenziali di produzione: Docker socket locale esplicito, PostgreSQL17 fissato per digest, rete none, nessuna porta, dati tmpfs e rimozione nel finally. Le operazioni positive e negative usano login SQL effettivi A/A2/reader/B; postgres è solo provisioning/oracolo/fault. Gli stub Auth sono quelli della fixture approvata, non un'implementazione Supabase Auth.

Il profilo DTO resta quello della 6A.4: template sintetico completo con train/loose in ciascun workspace; variabili solo stateId, ui.day e otto booleani. Nessun validatore generale, serializer/hydrator, nuovo catalogo, UI o autosave. Le proiezioni train/loose mantengono la geometria/Journey fissa del profilo e avanzano insieme di revisione.

## C1 — Un solo percorso di lettura, revocabile

Il worker perde tutti i grant diretti sulle tabelle public/serien_capability, inclusi i precedenti grant colonna. La migrazione elimina anche grant espliciti dei login già presenti in worker_bindings; rifiuta provisioning con ruoli aggiuntivi ereditati, ownership applicativa o privilegi amministrativi. Non dichiara sicuro un principal che conserva un altro percorso privilegiato. Il provisioning futuro deve ripetere tali verifiche; non esiste un provisioning cloud implicito.

Restano USAGE schema ed EXECUTE delle sole funzioni private save/read/recover. I helper sono invoker senza EXECUTE worker/PUBLIC. Gli entrypoint definer hanno search_path vuoto e owner executor NOLOGIN/NOBYPASSRLS/non-superuser senza tabelle proprie, con gli stessi grant applicativi limitati 6A.4 e grant limitati su budget/audit. Nessuna service_role o funzione privilegiata pubblica.

`authorize` deriva workspace/device da session_user e binding amministrativi. Blocca workspace→device coordinators; confronta stato active, scope, revoked_at, expiry, device epoch, key_version e workspace auth_epoch. Gli epoch/version attesi sono fissati nel binding, non in un GUC/body modificabile dal client. Reader può leggere; solo editor/owner scrivono/recuperano. Workspace/layout estranei o inesistenti producono FORBIDDEN senza dati protetti.

Sono provati grant preesistenti al gruppo, grant tabella a un login e SELECT(payload) a un altro: dopo migrazione sono negati, anche con device revocato. Una sessione SQL già aperta viene revocata tra due richieste e la seconda lettura fallisce. La race read/revoke osserva il revoke bloccato dietro la lettura autorizzata, poi nuove letture negate: il punto di linearizzazione è il coordinatore transazionale. Una risposta già autorizzata prima del commit della revoca non può essere ritirata dal destinatario.

Non è revoca distribuita/gateway: firma, nonce e proof non sono integrati nel DB. Il futuro provisioning deve emettere principal/credenziali distinti per i grant e disattivare quelli vecchi; aggiornare in-place il binding di un login condiviso con vecchie sessioni non è una rotazione sicura. Un pool universale con SET ROLE non conserva session_user distinto. Nessun piano produttivo di ruoli/pool è implicitamente approvato.

## API SQL private e coerenza

| Operazione | Contratto |
|---|---|
| `read_head(workspace,layout)` | Head0 o metadati del checkpoint corrente; verifica integrità del suo snapshot e coerenza riferimenti |
| `read_snapshot(workspace,layout,revision)` | Payload verificato + stateDigest distinto da envelopeDigest + versione canonica/schema/engine/topologia/manifest refs |
| `list_history(workspace,layout,after,page_size,through)` | Keyset crescente, massimo20 di default; horizon fissato alla prima pagina e riportato al caller; nessun OFFSET/duplicato. Stato VALID/CORRUPT/INCOMPATIBLE senza rilasciare payload corrotto |
| `read_receipt(workspace,layout,request_id)` | Soltanto all'attore corrente della ricevuta, dopo nuova autorizzazione e verifica checkpoint associato |
| `recover_revision(workspace,layout,expected,source,request_id)` | Fonte dello stesso workspace/layout integra e compatibile; nuova revisione CAS, nessuna sovrascrittura o applicazione al simulatore |
| `save_checkpoint(request_id,canonical_envelope,digest)` | Firma SQL esistente conservata; authorize→budget→head→dedup prima CAS→profilo→snapshot/proiezioni/head/ricevuta→quota→audit→vincoli deferred |

Gli entrypoint eseguono una sola transazione SQL. Il caller deve committare prima di confermare/consegnare dati; il runner usa autocommit psql. Tutte le operazioni prendono il coordinatore workspace, scelta conservativa che serializza anche letture. Non è un benchmark di concorrenza produttiva.

Gli errori sono codici semantici SQL (FORBIDDEN, NOT_FOUND nel proprio layout, REVISION_CONFLICT, IDEMPOTENCY_KEY_REUSED, INTEGRITY_ERROR, INCOMPATIBLE_SNAPSHOT, PAYLOAD_TOO_LARGE, RESPONSE_TOO_LARGE, INVALID_PAGE, RATE_LIMITED, QUOTA_EXCEEDED). Non sono risposte HTTP: mapping futuro 403/404/409/413/429 e UI competono all'integrazione successiva. L'adapter locale espone solo codici allowlist e redige errori di trasporto sconosciuti.

## C2 — Ricevuta compatta e compatibilità 6A.4

`result` non contiene più envelope o payload. La ricevuta v2 include request_id, attore, workspace/layout, operation/expectedRevision/recovery source, envelope digest, state digest, revisione/snapshot, committedAt, schema/canonical version e contesto epoch/key. `request_context` conserva solo i cinque campi dell'envelope senza state; `auth_context` conserva i soli epoch/version verificati. Il payload esiste una volta nel proprio snapshot.

Migrazione di dati 6A.4: prima di compattare, verifica che envelope/state, digest e snapshot coincidano. Dati non verificabili bloccano l'intera migrazione. I metadati/digest di integrità sono calcolati solo dopo tale verifica; non si benedice un payload corrotto con un nuovo hash. Le righe legacy senza workspace restano immutate nei valori originali.

Per ricevute workspace 6A.4 (`receipt_version=1`), la funzione ricostruisce **in risposta** l'envelope originale dallo snapshot immutabile + request_context. Il JSON originale di retry rimane identico senza conservarne una seconda copia nella ricevuta. Non si inventano gli epoch storici non registrati: auth_context rimane null per quelle righe. I nuovi risultati sono compatti v2. Nessun dato storico è cancellato. Un futuro ritiro della risposta legacy richiederebbe un altro contratto/versionamento.

La deduplica confronta request_id nel workspace, attore, envelope digest e contesto originale, prima del CAS e delle quote di nuovi checkpoint. Retry dopo avanzamento head o risposta persa restituisce la medesima ricevuta, senza revisione extra. Un retry recovery già committato può recuperare la propria ricevuta dal nuovo snapshot anche se la fonte storica è stata successivamente corrotta artificialmente; non rilegge inutilmente la fonte prima della deduplica.

## C3 — Dominio idempotenza

Nuova PK surrogata `receipt_id` senza eliminare righe o cambiare i riferimenti composite head/snapshot/receipt esistenti. La UNIQUE(workspace_id,request_id) resta l'autorità per workspace. Un indice UNIQUE parziale `(owner_id,request_id) WHERE workspace_id IS NULL` conserva la semantica legacy, mentre consente lo stesso owner/request_id a workspace differenti. Il test usa intenzionalmente lo stesso UUID in A/B con il medesimo owner Auth sintetico: due snapshot/ricevute indipendenti e retry intra-workspace deduplicato. Nessun account Auth aggiunto per aggirare la PK.

## Versioni e integrità riproducibile

Le colonne storiche `payload_digest` e il digest head continuano a significare **SHA256 dell'envelope**, non del solo snapshot. `state_digest` è SHA256 del solo stato canonico. Gli hash sono distinti e confrontati separatamente.

Protocollo metadata `jcs-profile-v1`: per il profilo chiuso già ammesso, JavaScript usa il JCS 6A.2 immutato (sort UTF-16 e serializzazione ECMAScript). PostgreSQL ricostruisce gli stessi byte con `profile_canonical_v1`, ordinando chiavi ASCII in collazione C, array per ordinalità, stringhe JSON senza normalizzazione e numeri decimali fissi del template. Sono rifiutati nomi di proprietà fuori dal dominio ASCII e numeri non nulli fuori `[1e-6,1e21)`, prima di poterli spacciare per JCS. Il codec SQL **non è un'implementazione JCS generale**: non va riutilizzato per nuovi template/numeri arbitrari. Tutti i numeri variabili esterni allo stato (revisioni) sono stringhe decimali, i valori numerici del profilo sono fissi e confrontati con il template.

I vettori SQL/Node verificano uguaglianza byte-per-byte dell'envelope e dei digest su valori realmente ammessi; le varianti autorizzate day/switch/stateId non introducono numeri liberi. Il DB rifiuta wire non canonico/chiavi duplicate, non usa `jsonb::text` come se fosse JCS. L'adozione di profili ulteriori o JCS completo richiederebbe nuova implementazione/versione e vettori di conformità, non una modifica silenziosa del formato.

In lettura: schema1, engine revision del profilo, topology del layout, versione canonica, UUID workspace/layout, revisione e riferimenti receipt/snapshot devono coincidere. Ricalcolo dello state digest dal payload; ricostruzione dell'envelope da request_context + state e confronto col digest originale; confronto dei riferimenti versionati model/asset (sintetici, non un catalogo produttivo). L'adapter Node verifica indipendentemente il solo payload/digest/versioni/manifest refs senza avere l'envelope nella ricevuta.

Un hash rileva corruzione accidentale/trasporto, non autentica contro un amministratore capace di riscrivere coerentemente payload e tutti i digest. Nessuna promessa anti-admin o di backup autenticato. Snapshot incompatibili o corrotti sono rifiutati, non riparati modificando Journey/topologia. Lo storico segnala candidati integri precedenti; la scelta di recovery resta esplicita. Nessuna UI o applicazione automatica al simulatore.

## Retention, quote, audit e retry

Snapshot, ricevute e audit sono append-only, con trigger che rifiutano UPDATE/DELETE accidentali. V1 non esegue GC automatico né compattazione degli snapshot. Quota piena rifiuta nuove operazioni interessate preservando i checkpoint confermati. Eventuale archivio/retention/compattazione è proposta futura da approvare; disabilitare il caller non elimina lo storico.

Budget **provvisori di laboratorio**, configurati dall'operatore in api_limits e non dal worker:

| Limite | Default | Verifica |
|---|---|---|
| Richiesta | 2MiB UTF-8 | Adapter prima del parse; DB prima di jsonb |
| Risposta | 256KiB | Byte di JSONB text nel DB (misura conservativa), byte JSON nel boundary Node; niente troncamento |
| Pagina storico | 20 revisioni | Rifiuto di 0/negativo/oltre limite, cursor stabile |
| Checkpoint per workspace | 100 | Conteggio di tutte le revisioni; nessuna eliminazione per liberare quota |
| Storage checkpoint/ricevute | 16MiB logici | Somma byte UTF-8 JSON payload, refs, result, contesto e auth +256 byte di allowance per ciascuna riga; non è pg_database_size/TOAST/indici/backup |
| Audit per workspace | 5000 eventi | Limite di crescita; al raggiungimento si rifiutano nuove operazioni con QUOTA_EXCEEDED, senza cancellare log/checkpoint |
| Richieste SQL riuscite | 60/device e120/workspace ogni60s | Contatori transazionali sotto lock workspace; periodo fisso |
| Boundary locale | stessi default, massimo1024 subject | Conta anche tentativi malformati/negati; memoria limitata e scadenza finestre |

Lo storage audit è separato dal budget logico dei checkpoint: massimo5000 righe dello schema chiuso a7colonne, registrate nelle evidenze; i contatori hanno un subject workspace e uno per dispositivo provisionato. Non si rappresenta il budget logico come occupazione totale di disco. Storage reale, indici, overhead, WAL e backup richiedono misure e quote di hosting prima della pubblicazione.

I rifiuti SQL fanno rollback anche dei contatori/audit della propria transazione: non esiste un audit durevole dei dinieghi SQL autonomo qui. Il boundary locale conta tali tentativi e offre callback di audit redatti, ma non è un servizio distribuito né una persistenza dei dinieghi. Il DB registra solo operazioni committate: evento, workspace/device, request_id/revisione quando pertinenti, data e UUID evento. Nessun payload ferroviario, firma, JWK, token o secret nei log. Il worker non legge audit/budget raw.

`requestWithRetry` mantiene lo stesso testo/envelope/request_id e contesto per tutti i tentativi. Riprova solo RATE_LIMITED/RETRYABLE_UNAVAILABLE, rispetta retryAfter e backoff250/500/... fino10s, massimo3tentativi di default. Conflitti, quota, corruzione e autorizzazione non vengono ritentati automaticamente. Il test usa clock/wait controllati senza fingere un'attesa reale o un rate limiter distribuito. La finestra DB viene fatta scadere amministrativamente solo nella fixture, non tramite un'API worker.

## Matrice privilegi e gap R0

| Principal | Prima | Dopo |
|---|---|---|
| worker/login | SELECT workspace/catalogo + marker, save privato | Solo EXECUTE save/read/recover; nessun table/column grant public/registry, incluso quello esplicito simulato pre-migrazione |
| reader | SQL workspace read più save negato per scope | API read autorizzate; save/recover sempre negati |
| executor | Grant limitati 6A.4, soggetto RLS | Come prima + lettura api_limits e audit, INSERT/UPDATE contatori, INSERT audit; nessun potere authorizer/catalogo/DDL o ownership tabelle |
| authorizer | DML registry/coordinatori | Invariato; niente API dati o modifica delle quote via ruolo authorizer |
| anon/authenticated/PUBLIC | Nessun dato privato | Invariato; EXECUTE nuovi entrypoint/helper negato |

[Privilegi effettivi](evidence/6A5/privileges.json). Nessuna certificazione di configurazione PostgREST/Supabase reale; nessun advisor o SQL remoto eseguito. I nuovi grant vanno valutati prima di qualsiasi futura applicazione produttiva.

| R0 originale | Copertura 6A.5 locale | Gap residuo |
|---|---|---|
| P09 | Rollback migrazione/cutover PK, quota dopo staging completo, fault sub-step e kill backend post-upgrade | Crash OS/storage, PITR e fault gateway/trasporto end-to-end |
| P10 | Ricevute compatte, compatibilità retry6A.4, idempotenza intra-workspace e isolamento same-owner/same-id A/B | Journal browser/retention produttiva e protocollo client integrato |
| P11 | Recovery CAS concorrenti reali, retry identici e provenance, storico preservato | Due tab/browser, UI conflitto e sessioni distribuite |
| P12 | Backoff locale con stesso ID/envelope | Offline/outbox/reconnect/autosave non implementati |
| P13 | Stato/envelope digest distinti, metadati schema/engine/topology/manifest, ricerca revisione integra senza applicazione automatica | Validatore generale/catalogo reale/restore/hydrator |
| P14 | Revoca/expiry/epoch su letture, vecchia sessione, grant raw rimossi, RLS A/B e reader | Proof+DB end-to-end, rotazione/provisioning/pool/TLS e revoca distribuita |
| P15 | Byte request/response, pagine, quote checkpoint/storage/audit, budget SQL e locale e niente endpoint pubblico | Budget/load test distribuiti, hosting, Data API e osservabilità produttivi |

R0 P01–P18 originali e tutte le specifiche approvate restano immutati. La 6A.6 dovrà verificare il sistema end-to-end nel laboratorio; non è iniziata. Niente 6B, main, Pages o deploy.
