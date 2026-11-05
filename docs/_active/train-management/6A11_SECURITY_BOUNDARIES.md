# 6A.11 — Privilegi, threat model e proprietà non verificate

D09=A e D10 restano invariati. Broker fidato; SQL deriva autorità da session_user,
non da JWT/GUC né da una verifica autonoma della firma browser. Nessun nuovo
privilegio o migrazione. Perimetro esclusivo: dati sintetici, PG17 isolato,
un broker operativo; secondo processo soltanto diagnostico.

## Matrice privilegi verificata

| Identità | Capacità necessaria e positiva | Dinieghi effettivi / rischio residuo |
|---|---|---|
| Browser |P-256 non esportabile in IndexedDB; pair/read/write firmati; digest snapshot verificato |Nessuna credenziale SQL o chiave privilegiata negli asset serviti; XSS può usare la chiave, non certificato |
| Ingresso10001:10009 |HTTP loopback, config pubblica e Unix socket660 in dir750 |Niente mount secret/journal/Docker o rete SQL; principal inventato nel RPC negato; broker ricalcola wire/proof |
| UID10004 estraneo |Nessuna autorità |IPC EACCES e assenza Docker/secret verificati; non prova isolamento da root host |
| Broker10002:10009 |Config privata700/file400, journal700; verifica firma e deriva binding; pool limitato |Niente Docker o CREATE ROLE/approvazione/finalizzazione; furto broker espone credenziali dei domini assegnati |
| Reader SQL |Head/snapshot/history/receipt propria con scope corrente |Save/Recover FORBIDDEN; receipt altrui404; nessun raw SELECT/DML o controllo altri |
| Editor SQL |Reader+Save/Recover CAS |Invite/revoke/approve/registry/DDL negati; HTTP non offre control-plane device |
| Owner SQL |Dati del proprio workspace, job solo se candidato/fingerprint approvati fuori banda |Non diventa adminSQL; SET ROLE executor/authorizer/altrui/CREATEROLE/BYPASSRLS negati |
| Redeemer |read/redeem job del proprio workspace con ceiling |Owner activation negata con ceiling editor; no prepare/approve/complete o LOGIN/DDL |
| Executor definer |API approvate, grant e RLS limitati, NOBYPASSRLS |Dentro funzione current_user executor, session_user dispositivo osservato da trigger INVOKER fixture |
| Operatore/provisioner fixture |Crea NOLOGIN, approva job, finalizza LOGIN+ACTIVE, seed/cutover/fault |Privilegio solo supervisore fuori banda: non endpoint HTTP né provisioner Supabase certificato |
| Legacy owner/Auth |Provenienza nel ledger senza auth FK |Zero Auth dopo cutover; vecchio JWT/GUC non autorizza; nuovi snapshot ownerNULL |

[Privilegi effettivi](evidence/6A11/effective-privileges.json),
[inventario dopo](evidence/6A11/inventory-after.json),
[prove SQL e session_user](evidence/6A11/results.json),
[A01–A16](6A11_SECURITY_MATRIX.md). I42501 di rawSQL sono distinti da testRLS con
SELECT temporaneo su clone e da23503/23514 di FK/check: niente PASS per inferenza.
SQL restituisce soltanto errori applicativi noti verso il browser; probe raw
fuori banda conserva codici e identità, non password o dettagli PostgreSQL.

## Threat model aggiornato

| Minaccia | Prova/mitigazione locale | Limite esplicito |
|---|---|---|
| Parser coercivo / input ambiguo |D01 nonce rigorosamente stringa nei3gateway; JSON duplicato/UTF8/depth/nonfinite400, no nuova lease |Non è fuzzing esaustivo di Node/V8/PostgreSQL |
| Furto/ripetizione proof |P-256/digest/method/path/audience/tempo, claim COMMIT SQL; stesso nonce su2processi un vincitore |Broker fidato e controllo dell'ordine claim/dati; SQL non verifica P-256 |
| Escalation/principal confuso |Binding privato esatto, ACL/scope SQL corrente; job ceiling/fingerprint/oldSignature, GUC innocue |Broker compromesso può usare le credenziali che possiede; non protezione da hostroot |
| Ingresso compromesso |Non può leggere secret o scegliere principal/RPC; proof verificata dal broker, digest browser |Può negare servizio/intercettare risposte lecite; può alterare JS servito e usare chiavi browser nell'origine compromessa. Nessuna promessa di confidenzialità/integrità generale contro quel controllo |
| Sessione calda revocata/ruotata |Authorize SQL a ogni nuova operazione, epoch/key/workspaceVersion correnti e vecchioNOLOGIN |Revoca non cancella dati già letti o transazioni già committate |
| Duplicato/ack perso |Nonce nuovo+request_id/envelope stabile; receipt immutabile e CAS reale |Non certifica perdita ack COMMIT sul protocolloPG o un restore arretrato |
| Slowloris / abuso |Header5s effettivi, body15s,431header grande,2MiBbody,256KiBresponse,IP/globalRAMbudget; SQLquote |Rate ingress è locale e riparte a restart; attaccante distribuito/hosting/CPU sostenuta non misurati |
| Moltiplicazione pool |Singolo cap16/queue64/2s/idle30s e fairness osservata |**FAIL aggregato con2worker:32**; singolo obbligatorio, no enforcement globale certificato |
| Secret/MITM |UID/mount distinti, SCRAM/TLSv1.3, CA/hostname positivi; negativi password/plaintext/CA/hostname |Adapter file/journal locali, non KMS/secretmanager/HA; HTTP loopback non è TLS browser pubblico |
| Corruzione snapshot / legacy loss |Digest/versioni browser+SQL, manifest48righe+2head, FK/NULL e storico immutabile |Profilo sintetico chiuso; non serializer/hydrator né restore ferroviario generale |

I valori privati generati vengono confrontati contro results, audit, metriche,
load-profiles e contenuto dei4asset effettivamente serviti. Le evidenze finali
sono anche scansionate per pattern di chiavi/token; nessun dump dei config privati.
Una scansione senza riscontri non è una certificazione contro tutte le fughe.
La sola CA pubblica non è un segreto; chiavi CA/server esistono soltanto nello
scratch privato/PG del test, rimosso dal finally.

## NOT VERIFIED e condizioni per un eventuale staging autorizzato

| Proprietà | Perché non provata | Prova dedicata necessaria, senza autorizzarla ora |
|---|---|---|
| Crash host/power loss |Solo SIGKILL processi con volumi conservati |Arresto host/VM mentre claim/job/data attraversano fsync/COMMIT, riavvio e confronto ledger/receipt |
| Perdita volume/journal |Solo chmod/rename ripristinati |Perdita reale volume su clone, backup/restore journal, rifiuto replay e ripresa job senza duplicati |
| Secret store loss |Stesso config ripristinato |Store vuoto o rollback/rotazione versioni, fencing vecchie credenziali, riallineamento job senza riattivare grant |
| Perdita database |Nessun DB-loss della primaria |Restore completo su clone con credenziali/binding/claim/job/receipt coerenti, prove read/write/revoca e integrità storica |
| PITR/replay post-write |Restore locale prima delle scritture soltanto |PITR a istante scelto e replay scritture successive, nessun nonce o kit riutilizzabile, RPO/RTO misurati |
| Supabase principal/DDL delegabile |PG17 locale con operatore postgres |Verificare permessi custom roles/default ACL/authorizer/provisioner sullo staging esplicitamente autorizzato; fallimento→riesameD09, niente fallbackadmin |
| Supavisor/session_user/TLS |TCP diretto locale, TLS CA locale |Pool gestito connessione/transaction-mode, conservazione session_user, revoke su sessione calda, CA/hostname e limiti reali |
| Cap globale hosting |2worker locali superano16; altri servizi non dimensionati |Enforcement singola replica/fencing o decisione separata per budget aggregato; prove doppio avvio e sostituzione fail-closed |
| Provisioning/rotazione gestiti |Supervisore Docker non provisioner operativo |Secretadapter/versioni/durablejob/rotation e compensazioni in infrastruttura dedicata, nessuna shadowAuth |
| Capacità/costi/churn |Piccoli burst locali; nessun tier o budget autorizzato |Ruoli/device/workspace a regime, storage/WAL/egress/backup/secretops, limiti e costo concordati prima di abilitazione |
| Browser/OS/XSS |Chromium Linux headless; key reload soltanto |Firefox/Safari/mobile/profili persistenti, storage eviction/OS/browser crash, CSP/origin/asset trust e threat model client |
| Visuale/performance R1 completa |Suite Node/JMRI e byte invariant, nessuna nuova campagna R1 |Rieseguire matrice completa S0–S7/5C/5D con stesse condizioni hardware/viste/memoria; nessuna modifica in6A.11 |

Staging6A.12 NON AUTORIZZATO: nessun progetto contattato, nessuna CLI remota,
nessuna migrazione/deploy/credenziale reale/frontend privilegiato. Macrofase6A
resta aperta per audit Regia e successivi gate specificamente autorizzati.
