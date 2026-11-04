# 6A.5 — Rapporto alla Regia

**PASS tecnico del layer storico/recovery nel PostgreSQL isolato, con il profilo sintetico 6A.4 invariato. Approvazione indipendente PENDING.** Nessuna produzione o 6A.6 avviata. Checkpoint remoto da verificare dopo commit/push nella consegna finale.

Baseline approvata `6bf92bf6f100e1c74567dd2b1ed898874e50e66a`, branch `feature/train-management`; main/R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Working tree iniziale pulito; fetch non distruttivo e ls-remote hanno confermato entrambi gli SHA e l'ascendenza. Letti AGENTS, PROGRESS/STATUS, contratti e migrazioni/test approvati; identificativi R0 P01–P18 preservati. Nessun reset/rebase/force/merge/deploy.

## Implementazione e obblighi C1–C3

[Contratto completo, quote, privilegi e gap R0 P09–P15](../../6A5_HISTORY.md). Nuova proposta `supabase/migrations/20261104175236_serien_history_integrity.sql`; adapter/budget/backoff in `prototypes/train-management/history-access/`; runner/evidence utilities in `tests/db/6A5/`. Le migrazioni 6A.3/6A.4, i relativi test, il prototipo 6A.2 e l'adapter 6A.4 restano byte-identici.

**C1:** rimossi i grant diretti public/registry del gruppo worker **e** dei login provisionati, inclusi grant colonna. La migrazione rifiuta ownership/ruoli aggiuntivi/privilegi amministrativi dei worker invece di lasciare un bypass ereditato. ReadHead, ReadSnapshot, ListHistory e ReadReceipt ricontrollano workspace/device, scope, epoch/key_version, expiry/revoca e stato workspace sotto coordinamento transazionale. Il test mostra che una connessione già aperta legge prima della revoca e riceve FORBIDDEN nella richiesta successiva dopo commit; nessuna SELECT diretta residuale. Una race read/revoke osserva realmente l'attesa del revoke sul coordinatore e il diniego delle nuove letture.

**C2:** tre vere ricevute workspace prodotte prima della migrazione dal codice 6A.4 vengono verificate e compattate, rimuovendo envelope/state dalla ricevuta. Request_context è solo metadato; state_digest è distinto da envelope digest. I retry delle vecchie ricevute ricostruiscono il JSON originario dallo snapshot e lo confrontano esattamente con il risultato pre-migrazione. I nuovi risultati v2 sono compatti, con attore/contesto/digest/revisione/snapshot/data/provenance/auth epoch. Non si inventano gli epoch storici mancanti della 6A.4.

**C3:** PK receipt_id additiva, UNIQUE workspace/request_id conservata, unicità owner/request_id solo per righe legacy workspaceNULL. Lo stesso owner Auth sintetico e lo stesso request_id producono due checkpoint indipendenti in A/B, con ricevute lette soltanto nel proprio contesto; retry e reuse diversi nello stesso workspace conservano le regole idempotenti. Non è stato aggiunto alcun account Auth per aggirare il vincolo.

Gli entrypoint privati hanno owner executor non-superuser/NOBYPASSRLS/NOLOGIN senza tabelle proprie, search_path vuoto e ACL esplicite; tutti i helper sono invoker senza EXECUTE pubblico/worker. Non c'è DML diretto dei worker, service key o endpoint HTTP esposto. Il modello di provisioning per dispositivo/grant e il gateway proof/DB restano futuri; non è un backend produttivo completo.

## Risultati riproducibili

| Comando / verifica | Esito osservato | Prove |
|---|---|---|
| `python3 tests/db/6A5/run.py` | **141 PASS**, PostgreSQL17.11 reale isolato | [log](db-test.txt), [casi/stati](results.json), [stato finale](final-state.json) |
| `node prototypes/train-management/history-access/protocol.test.js` | **25 PASS**, zero fail/skip | [log](protocol-test.txt) |
| `python3 tests/db/6A3/run.py` | **51 PASS**, baseline approvata immutata, altro container | [log](regression-6A3.txt), [esiti](regression-6A3.json) |
| `python3 tests/db/6A4/run.py` | **45 PASS**, baseline approvata immutata, altro container | [log](regression-6A4.txt), [esiti](regression-6A4.json) |
| `node prototypes/train-management/transaction-core/envelope.test.js` | **12 PASS** | [log](regression-envelope.txt) |
| `npm test` | **37 file PASS**, zero fail/skip | [log](npm-test.txt) |
| `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` | **9 PASS** | [log](python-tests.txt) |
| `npm run build` | **PASS**, bundle R1 identico | [log](build.txt) |
| `python3 tests/db/6A5/verify-invariants.py` | **1472 file baseline invariati** esclusi i tre documenti di gate; scan credenziali e scope PASS | [invarianti](invariants.json) |

Il runner crea PostgreSQL con digest immagine fissato, rete none, nessuna porta, tmpfs e cleanup finally; nessun URL DB/token/password produttivo accettato. Le chiamate effettive usano LOGIN A/A2/reader/B; postgres è solo bootstrap, letture-oracolo e fault. I 141 controlli includono anche il bootstrap/regressione del rollback 6A.4 e gli extra di sicurezza; non sono presentati come 141 criteri R0 distinti.

Ogni caso registra input/operazione, atteso, osservato e stato checkpoint iniziale/finale. I riferimenti SHA256 nel campo databaseStates di results.json deduplicano senza perdita le osservazioni reali di snapshot, receipt, head, train e loose projections. Audit e contatori cambiano nelle letture riuscite per progetto; non sono inclusi nel confronto «checkpoint invariati». [Audit committato](audit.json), [legacy non vuoto](legacy.json), [snapshot restituito](snapshot-response.json), [privilegi gruppo/login/colonna prima e dopo](privileges.json).

### Corrispondenza dei 22 scenari obbligatori

| ID richiesta | Prova nel runner / risultato |
|---|---|
| 1–3 | Head e revisione1 autorizzati; pagine da1elemento con horizon stabile, sequenza1/2 senza duplicati |
| 4 | Tutte le letture private trasversali e workspace sconosciuto negati senza dati |
| 5–6 | Revoca, expiry, device epoch, key_version e workspace epoch; connessione persistente e race read/revoke; grant raw chiusi |
| 7–8 | Reader legge head/snapshot ma non salva/recupera; tutte le dieci tabelle applicative e registry/helper raw negati; anche grant login/colonna espliciti preesistenti |
| 9 | Payload, state_digest, asset refs e contesto compatto dell'envelope manomessi causano rifiuto; head corrotto non viene consegnato |
| 10 | Schema snapshot/engine/topologia incompatibili rifiutati senza correzione; versione canonica sconosciuta rifiutata dal boundary e vincolata nel DB |
| 11–13 | Revisione2 corrotta segnalata, revisione1 integra individuata e recuperata come3; fonti inesistenti/trasversali/corrotte negate |
| 14–15 | Due connessioni recovery realmente bloccate su lock: un solo CAS vincente; richieste identiche stesso risultato; retry dopo risposta scartata nessuna revisione extra |
| 16 | Origine e revisioni intermedie conservate; solo i fault amministrativi del test manomettono/ripristinano righe, mai l'API |
| 17–18 | Stesso owner/request_id in A/B, lettura propria ricevuta e dedup intra-workspace; vecchio risultato6A.4 identico ricostruito, nuovi risultati senza envelope |
| 19 | Richiesta2MiB+1 respinta prima parse; wire SQL non canonico/duplicato respinto; page21 negata; cap risposta ridotto causa errore senza troncamento e rollback del save |
| 20 | Quote revisioni/storage (anche il prossimo record che supererebbe il budget esatto corrente) e crescita audit, budget device/workspace e reset finestra; nessuna perdita dei checkpoint; retry sotto quota di nuove revisioni preservato |
| 21 | Errore prima COMMIT della migrazione: schema, dati e grant identici; provisioning con ruolo ereditato extra blocca la migrazione |
| 22 | Tutte le righe e colonne originali delle dieci tabelle legacy non vuote ritrovate identiche, timestamp inclusi |

I runner storici vengono rieseguiti senza modificarli, sulle rispettive migrazioni approvate. **Anche dopo l'upgrade 6A.5** la nuova suite ripete gli oracoli 6A.4: errori SQL in sei punti (prima/dopo snapshot, durante train/loose projections, prima head, prima receipt), constraint ferroviario deferred e terminazione reale del backend dopo INSERT snapshot. Ogni fallimento lascia esattamente tutte le componenti checkpoint precedenti. Questi fault hook sono esclusivamente fixture di test, assenti dalla migrazione proposta.

Le race sono osservate con pg_stat_activity: due psql effettivi attendono lock prima del rilascio; due invocazioni sequenziali non vengono spacciate per concorrenza. Nel fault reale il backend viene individuato in pausa e terminato con pg_terminate_backend; negli altri sei punti si tratta di eccezioni SQL simulate, esplicitamente distinte.

## Integrità, quote, retention e storage osservato

[Vettori SQL/JavaScript](canonical-vectors.json): uguaglianza byte-per-byte del wire JCS accettato e digest coerenti. La serializzazione è **jcs-profile-v1**, solo per il profilo sintetico chiuso già ammesso; il codec SQL non è JCS generale e non serializza silenziosamente numeri arbitrari come JSONB text. Nessun nuovo stato ferroviario generale è stato abilitato. Il verifier Node ricalcola il digest dello stato senza conservare l'envelope nella ricevuta.

Schema1, engine R1, topology canonica, revisione e FK receipt/head/snapshot e riferimenti manifest devono coincidere. Si confrontano separatamente state digest e envelope digest ricostruito da metadati compatti + payload. Manifest/asset refs sono ancora sintetici, non un catalogo produttivo. Gli hash non autenticano contro un amministratore capace di riscrivere coerentemente tutti i record.

[Metriche ricostruite dalle osservazioni SQL](metrics.json): a fine prova A ha6snapshot/6ricevute e36342byte logici di checkpoint; B2/2 e11959byte. Audit committato: A19eventi/5207byte JSON, B2/601byte. Le tre vecchie ricevute passano da14280byte di result duplicati a1554byte di result+request_context, conservando le risposte originali ricostruibili. Sono misure JSON UTF-8 con allowance esplicita, non pg_database_size, indici/TOAST/WAL o una stima di costo produttivo.

Snapshot/ricevute/audit append-only; nessuna cancellazione automatica. Limiti provvisori: request2MiB, response256KiB, pagine20,100checkpoint/workspace,16MiB logici snapshot/ricevute,5000eventi audit,60richieste riuscite/device e120/workspace per60s. Budget SQL transazionali; i dinieghi fanno rollback dei propri contatori/audit. Il boundary locale separato conta anche tentativi malformati/negati, limita memoria a1024subject ed emette solo audit redatti. Non è un rate limiter o un audit distribuito/durevole dei dinieghi.

Il retry driver mantiene lo stesso testo/request_id/contesto, verifica backoff250/500ms e retryAfter; niente retry automatico per quota, conflitto, corruzione o autorizzazione. Le attese test sono controllate, non tempi reali inventati. Qualunque budget produttivo richiede misure di carico e hosting. Una futura compattazione/retention distruttiva richiede un'altra proposta approvata.

## Invarianti, sicurezza e limiti

Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; bundle SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`. Sorgenti R1,150rail/75bed,topologia,otto scambi,motore/Journey/routing/guardia/collisioni,asset,UI/HUD/minimappe/camera,dipendenze eworkflow identici alla baseline. Non sono nuove prove visive/GPU/prestazionali R1; queste restano NOT VERIFIED, senza modifiche runtime.

Zero query o mutazioni contro il Supabase reale: nessun DDL/DML/Auth/RLS/grant/Edge/credenziale/deploy/configurazione. Consultate le skill Supabase/Postgres e documentazione corrente [funzioni/ACL/search_path](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Fetch changelog HTTP403: NOT VERIFIED per quel canale, nessun bypass. Nessun advisor remoto eseguito o dichiarato clean. CLI3.0.0 usata solo per generare il file locale; nessun link/push DB.

Correzioni durante il collaudo: parentesi esplicite nell'estrazione JSONB prima dell'operatore sottrazione; grant per colonna revocati oltre a quelli tabella; database postgres esplicito nei subprocess delle sessioni persistenti. I tentativi iniziali falliti non sono riportati come PASS; i risultati finali provengono dalla suite completa sul file corretto e da login SQL reali.

Restano **NOT VERIFIED/NON IMPLEMENTATI**: integrazione proof/nonce/gateway/DB end-to-end della6A.6, revoca distribuita, provisioning/rotazione credenziali/pool/TLS reale, configurazione Data API/Supabase, validatore DTO generale, serializer/hydrator eUI/autosave/offline/coda browser, catalogo manifest reale, cutover senza owner Auth, load/rate/storage produttivi, crash OS/storage/PITR/backup. Il tmpfs non prova la sopravvivenza alla perdita dell'host. L'API SQL non applica nulla al simulatore. Dettaglio comparativo R0P09–P15 nel contratto; P01–P18 originali preservati.

Commit atomico identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A5/REPORT.md`; push normale solo feature/train-management, verifica SHA remoto/locale e working tree nella consegna finale. Nessun main/Pages/merge/deploy. Se il checkpoint non è verificato, consegna BLOCKED. **STOP per audit indipendente della Regia, nessuna6A.6 iniziata.**
