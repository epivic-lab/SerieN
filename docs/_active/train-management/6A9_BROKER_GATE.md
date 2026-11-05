# 6A.9 — Broker integration gate

**PASS tecnico nel laboratorio isolato; audit Regia PENDING. Macrofase6A BLOCKED;
6A.10 e6B non iniziate.** Data5novembre2026 (Europe/Rome).

Base approvata6A.8 `d6aa13001ae10d23b2b3c8c6e45e1dcf8f4e3764`, branch esclusivo
`feature/train-management`, R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` intoccabile.
L'audit della ripresa conferma lavoro parziale conservato nello stesso filesystem:
HEAD/remoto6A.8, nessuno stash o commit WIP, nuovi sorgenti/test presenti. Nessuna
ricostruzione, reset, clean, checkout forzato o sostituzione del lavoro. Sono state
valutate e corrette le implementazioni già presenti, conservando anche i tentativi
diagnostici in `/workspace/work/6A9/`. `main` remoto è avanzato indipendentemente
(fino a `5c8f0f59a5914a4105a45ceef104e1e24f38163f` durante la ripresa); non importato.
AGENTS, contratti6A.1–6A.8, D09/D10/piano, SQL e mappingR0 restano riferimenti immutati.

## Risultato e percorso effettivo

Nuovi sorgenti isolati in `prototypes/train-management/broker-lab/`; runner in
[tests/db/6A9/README.md](../../../tests/db/6A9/README.md). **50 controlli integrati
PASS**, con15 sottoprove password/TLS/privilegi. Non sono i72 test del vecchio gateway.
[Risultati](evidence/6A9/results.json), [audit broker](evidence/6A9/broker-audit.json),
[secondo broker](evidence/6A9/second-broker-audit.json),
[metriche HTTP](evidence/6A9/metrics.json), [log suite](evidence/6A9/broker-tests.txt),
[cleanup verificato](evidence/6A9/cleanup.json), [confini/threat model](6A9_SECURITY_BOUNDARIES.md).

Chromium crea una CryptoKey P-256 non esportabile in IndexedDB e firma la richiesta
originale. L'ingresso HTTP10001 è separato dal broker10002, non ha rete SQL o mount
segreti/Docker e inoltra soltanto method/path/wire. Il broker sul socket Unix660
verifica struttura, P-256/P1363, body digest, audience, metodo/percorso effettivi,
tempo, nonce, dispositivo, workspace/layout ed epoch. Il binding deriva dalla
manifestazione privata operatore, non da principal/DSN/scope client.

Il driver **pg8.23.1**, dipendenza e lock isolati dal package/bundle R1, apre TCP con
SCRAM e TLS verificando CA e DNS:db. Il pool custom mantiene session_user fisso per
principal/versione: nessun SET ROLE e nessun pg.Pool nascosto. Query parametrizzate:
BEGIN→claim_nonce(sql-claim-v1)→**COMMIT confermato**; poi nuovo BEGIN→API privata
6A.5→**COMMIT confermato**→HTTP. Milestone e PID reali nei log distinguono le due
transazioni. La verifica digest/compatibilità della risposta usa il client6A.6
immutato. Il DB non verifica P-256: D09=A considera fidato il broker e le API SQL
immutate non rendono obbligatorio il claim contro un broker compromesso.

Il normale percorso dati non usa Docker/psql. Solo il supervisor fuori banda crea
principal NOLOGIN, prepara/approva job e finalizza LOGIN+complete_device_job nello
stesso commit. Broker/redeemer non hanno approvazione, DDL, CREATEROLE o BYPASSRLS.
Pairing/recover/rotate richiedono possesso della chiave prevista; rotate dimostra
anche possesso della vecchia chiave. Scope e workspace sono del job approvato.
Una nuova proof dello stesso job può recuperare lo stesso esito senza secondo grant.

**Distinzione lifecycle:** i candidati iniziali non possono LOGIN e claim_nonce6A.8
accetta solo sei operazioni dati. Per i tre endpoint lifecycle il ticket/job SQL
monouso è affiancato da un journal privato di laboratorio, creazione esclusiva e
fsync file/directory, condiviso fra processi e conservato al restart. Non è un
fallback RAM né una modifica a claim_nonce o D09. Il suo cap10000 è un limite lab
con conteggio non serializzato fra processi; esattezza del cap distribuito,
filesystem distribuito, crash host e perdita volume NOT VERIFIED. Un journal
illeggibile/incompleto resta fail-closed. Nessuna dichiarazione di servizio nonce
produttivo o di recovery dopo perdita del secret store.

## Test avversari e fault matrix

Ogni check E2E registra atteso, osservato, hash SQL iniziale/finale, nonce count e
stati job. Cinque stati applicativi e14 stati autorità sono deduplicati nei risultati:
dieci tabelle pubbliche legacy non vuote più head; autorità redatta con epoch,
keyVersion, expiry/revoca, binding e flag LOGIN/privilegi dei ruoli. Operazioni negate
e fault devono lasciare identico l'hash applicativo; nonce committati e revoche sono
variazioni intenzionali di autorità. Le righe sotto mappano i27 criteri autorizzati
ai check nominati nel JSON, senza rinumerare R0.

| # | Atteso | Osservato e prova | Esito |
|---|---|---|---|
| 1 | Proof valida dopo pairing e reload | Owner/editor/reader ACTIVE dopo commit; ReadHead200, CryptoKey non esportabile conservata | PASS |
| 2 | Firma falsa negata, dati intatti | P1363 alterata→403 | PASS |
| 3 | Stessa proof consumata una sola volta | Secondo invio→409 REPLAY | PASS |
| 4 | Restart non cancella nonce | SIGKILL e start del broker con PID host diverso; stessa proof409 | PASS |
| 5 | Nonce condiviso fra processi | Secondo broker sullo stesso origin→409; due sessioni aggregate misurate dopo letture valide | PASS |
| 6 | Revocato non legge/scrive | Save in-flight dopo claim e ReadHead successivo403 | PASS |
| 7 | Epoch/keyVersion vecchie negate | Epoch firmata99→403; key_version cambiata dopo claim→Save403 | PASS |
| 8 | Reader non scrive | SaveCheckpoint403; history firmata reader200 | PASS |
| 9 | A non legge B | Proof A su dominio B403, dati A/B invariati | PASS |
| 10 | Richiesta effettiva vincolata alla firma | Body/audience/operation403, path404, epoch403 | PASS |
| 11 | Ingresso non sceglie principal | RPC con campo principal rifiutata400 prima della lease | PASS |
| 12 | Solo canale autorizzato | UID estraneo EACCES; servizi UID distinti, secret/Docker non montati nell'ingresso | PASS |
| 13 | Binding e identità SQL obbligatori | Manifestazione A→principal B403; mismatch session_user FORBIDDEN; password/TLS/ACL reali | PASS |
| 14 | Save/letture e receipt integre | Revisione1, snapshot verificato, receipt694byte senza envelope, history reader; altro attore receipt404 | PASS |
| 15 | Ack HTTP perso non duplica | Abort dopo dataCommitted; nuova proof stesso request_id/envelope→stessa revisione2 | PASS |
| 16 | CAS ha un solo vincitore | Due connessioni SQL realmente osservate in lock:200/409, sola revisione3 | PASS |
| 17 | Recovery non distrugge storico | RecoverRevision CAS→nuova revisione4, sorgente1 ancora verificabile | PASS |
| 18 | Corruzione rilevata dal browser | Risposta ReadSnapshot modificata nel gateway reale→INTEGRITY_ERROR client | PASS |
| 19 | Revoca fra claim e Save prevale | Hook privato dopo COMMIT claim; revoke SQL; Save403, nessuna revisione | PASS |
| 20 | Timeout/kill non confermano parziali | Statement timeout4s e pg_terminate_backend dopo INSERT snapshot→503, hash dati invariato | PASS |
| 21 | Cap/coda/deadline finiti | Batch96 su18dispositivi più B: peak16, queue64,81successi/15backpressure;4timeout attesa2s | PASS |
| 22 | Eviction e riconnessione sicure | Attesa reale31s→idle eviction;25LRU e nuova lettura con principal fisso200 | PASS |
| 23 | Vecchio principal inutilizzabile dopo rotazione | Nuova chiave/principal ACTIVE; vecchia sessione già aperta403, vecchio ruolo NOLOGIN | PASS |
| 24 | Processo nuovo non accetta nonce vecchio | Restart reale sia per replay dati sia per job incompleto; proof lifecycle originale409 | PASS |
| 25 | Quote proteggono checkpoint | Storage quota→429 QUOTA_EXCEEDED; nonce rate→NONCE_RATE_LIMITED, dati intatti | PASS |
| 26 | Niente credenziali/token in bundle/log | Scan di tutti i valori segreti generati negli artefatti/audit e scan sorgenti; R1 byte-identico | PASS nel perimetro dello scan |
| 27 | Chiusura libera risorse | Stop broker→0sessioni servizio; tutti4container/2network/5volumi propri assenti dopo finally | PASS |

Ulteriori prove: claim confermato e risposta persa prima dei dati→503, proof
identica409; CAS errato dopo claim→409 conservando nonce; rete SQL del broker
scollegata realmente→503 senza fallback; invito falsificato, chiave diversa, scope
iniettato e ceiling editor su job owner negati; ACTIVATING sopravvive al restart,
ack ACTIVE abortito recuperabile con proof nuova; recovery kit consuma un solo job
e revoca predecessori; session_user dispositivo/current_user executor osservati
nel trigger fixture delle API definer.

I fault/hook sono montaggi privati operatore, mai endpoint amministrativi. Le attese
CAS osservano backend realmente distinti; restart cambia processo host. Nessun mock
è usato come prova di questi esiti. I tentativi diagnostici precedenti hanno corretto
bootstrap TLS, permessi dei bind mount, pubblicazione HTTP su Docker28 e propagazione
errata dei metadati del vecchio job nella fixture ROTATE. Non sono suite PASS e non
sostituiscono l'esecuzione finale completa.

## Misure e limiti

[Campioni e aggregati](evidence/6A9/measured-summary.json):238risposte HTTP misurate,
p50 latenza239.34ms, p953060.78ms, massimo4015.97ms; includono blocchi e fault deliberati,
non sono un benchmark di throughput. Body risposta p50288byte, p95372, max4808;
69211byte complessivi campionati. Solo73campioni espongono il wire size della richiesta,
massimo1178byte: non rappresentano la dimensione dei Save e non includono framing/TLS.
La ricevuta compatta è694byte; snapshot JSON di laboratorio fino a4808byte.

Pool di una istanza: cap16, coda64, attesa2000ms, idle30000ms, peak osservato16,
queue peak64. Tutti i contatori open rispettano il cap; sessioni reali controllate
anche in pg_stat_activity. Il batch96 produce81HTTP200 e15HTTP503, una richiesta B è
servita durante il carico A. Una prova separata produce4POOL_TIMEOUT. Idle test31s
reali; LRU solo connessioni libere. Finestre nonce/API sono invecchiate nella fixture
fra batch per separare rate limiting da pool, non si dichiara trascorrere tempo reale.

Con due broker si misurano **2connessioni aggregate** durante replay/letture minime.
La seconda istanza viene rimossa prima del carico. Coordinamento cap globale
multiistanza **NOT VERIFIED**: non si moltiplica16 per istanza dichiarando un cap globale.
TLS positivo osservato TLSv1.3/AES256GCM; password errata28P01, plaintext28000,
CA errataUNABLE_TO_VERIFY_LEAF_SIGNATURE, hostnameERR_TLS_CERT_ALTNAME_INVALID,
privilegi insufficienti42501. CA e chiavi sono generate per ogni run; chiavi private
eliminate e mai incluse nelle evidenze. Adapter file privato non equivale a secret manager.

## Regressioni e preservazione

Le suite elencate nella consegna sono **rieseguite durante6A.9**: SQL6A.3(51),
6A.4(45),6A.5(141),6A.8(97); gateway6A.6(72) sullo schema aggiornato; capability6A.2
48HTTP e5Chromium; adapter6A.4/6A.5(12+25assert); npm37file; Python/JMRI9; build.
I72 del gateway precedente sono regressione distinta dai50 del nuovo broker.
Gli invarianti storici/evidenze6A.1–6A.8 sono conservati, non presentati come nuove
prove di hosting. Indice/log effettivi in [summary.json](evidence/6A9/summary.json).

[Controllo scope/hash/segreti](evidence/6A9/invariants.json): tutti i file della base
approvata, eccetto PROGRESS/STATUS, byte-identici. Nessuna nuova migrazione; SQL,
contratti e matriceR0 intatti. Nuove dipendenze soltanto nel broker, non nel simulatore.
Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`;
bundle R1 SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`.
Il validatore resta il profilo sintetico chiuso6A.4–6A.5, con train/loose fissi e
sole variazioni ammesse; non è un serializer generale o test restore del simulatore.

## Matrice originale R0 P01–P18

Criteri da [mapping approvato](R0_ACCEPTANCE_MAPPING.md), non modificato. PASS qui è
solo nel perimetro specificato; il criterio completo resta NOT VERIFIED se richiede
runtime futuro. Nessun FAIL occultato o approvazione implicita della macrofase.

| R0 | Esito | Prova attuale / residuo |
|---|---|---|
| P01 identità | NOT VERIFIED | ID fixture preservati; save/load del runtime generale assente |
| P02 composizione | NOT VERIFIED | Nessun restore ordine/orientamento/geometrie operativo |
| P03 detached | NOT VERIFIED | Nessun hydrate edge/Journey/giunti |
| P04 locomotive | NOT VERIFIED | Nessun restore dinamica/odometro/lights/safety |
| P05 scambi | NOT VERIFIED | Otto stati sintetici validati; hydrate/zero eventi runtime non provati |
| P06 missioni/UI | NOT VERIFIED | UI ferroviaria invariata, persistenza futura |
| P07 tempo | NOT VERIFIED | Nessuna chiusura10min/24h e resume del simulatore |
| P08 round-trip | NOT VERIFIED | Snapshot letto/verificato; manca capture/hydrate/capture runtime |
| P09 atomicità | PASS nel laboratorio | Timeout/kill/abort reali e regressioni sub-step/deferred; crash host/PITR non certificati |
| P10 idempotenza | PASS nel laboratorio | Ack perso, nonce nuovo/stesso ID/envelope senza revisione extra; digest diverso negato nelle regressioni |
| P11 concorrenza | NOT VERIFIED completo | CAS due dispositivi200/409 PASS; due tab/outbox/UI conflitto non implementati |
| P12 offline | NOT VERIFIED | Retry HTTP PASS; journal client/outbox/reconnect non implementati |
| P13 corruzione | NOT VERIFIED completo | Risposta corrotta rilevata, storico integro PASS; restore/asset live assenti |
| P14 autorizzazione | NOT VERIFIED hosting | Nuovo broker/replay restart/TLS/rotazione e regressioni expiry PASS locali; hosted non provato |
| P15 quote/abuso | NOT VERIFIED hosting | Limiti, cap/coda/timeout e quota locali PASS; budget globale/hosting non certificati |
| P16 asset | NOT VERIFIED | Nessuno switch grafico/asset6C |
| P17 ricovero | NOT VERIFIED | Nessun park/release operativo6D |
| P18 regressioni R1 | NOT VERIFIED completo | Hash/sorgenti/Node/JMRI/build PASS; matrice visuale/performanceS0–S7/5C/5D non rieseguita integralmente |

## Proprietà non certificate e checkpoint

Zero query o modifiche a Supabase reale, zero staging, Auth/RLS/ruoli/configurazione
cloud/Edge/deploy/Pages/main. Per il futuro hosting restano NOT VERIFIED: provisioning
principal gestiti, rete/CA/Supavisor, costo/churn dei ruoli, secret manager durevole e
recovery dopo sua perdita, cutover ownerless D10, coordinamento cap multiistanza,
crash host/PITR, browser diversi e sicurezza OS/XSS. Nessun owner Auth produttivo o
shadow user creato; i dati sono sintetici e usano il legacy owner non vuoto della
fixture approvata. Nessuna UI persistenza, serializer/hydrator/autosave/offline,
asset/motore/Journey/WX310 o6B.

Unico checkpoint atomico: commit che introduce questo rapporto; identificabile con
`git log -1 --format=%H -- docs/_active/train-management/6A9_BROKER_GATE.md`.
Push normale solo feature/train-management e SHA locale/remoto/working tree sono
verificati nella consegna dopo il push, non anticipati da questo documento.
**STOP6A.9. Prossima azione unica: audit indipendente Regia. Nessuna6A.10 avviata.**

**Approvi il passaggio alla sottofase 6A.10?**
