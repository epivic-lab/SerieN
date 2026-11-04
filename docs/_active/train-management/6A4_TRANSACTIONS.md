# 6A.4 — Nucleo transazionale in laboratorio

Autorizzazione del committente: sola 6A.4 da `558f43b44be08235f6d30b6f18bd3b4ef07a4c53`. La 6A.3 è approvata; la presente consegna resta soggetta ad audit indipendente. Non è un backend produttivo o un'integrazione con il gateway.

Proposta additiva `supabase/migrations/20261104172819_serien_atomic_checkpoint.sql`, creata con CLI Supabase 3.0.0 (`migration new` dopo `--help`) in container senza rete. Il file 6A.3 e tutte le baseline sono immutati. Nessuna migrazione applicata al servizio reale. Owner Auth e FK legacy restano obbligatori; si riusa esclusivamente l'owner della fixture sintetica. Nessun cutover autorizzato.

## Riproduzione e confine del validatore

Dalla root, con Node, Python/jsonschema e Docker locale:

```
node --test prototypes/train-management/transaction-core/envelope.test.js
python3 tests/db/6A4/run.py
```

`SERIEN_DB_EVIDENCE` sceglie solo una directory di output. Nessun URL, token o password DB accettati. Runner: immagine PostgreSQL17 fissata per digest, socket Docker locale, rete none, nessuna porta, dati tmpfs, cleanup finally. Le connessioni psql del salvataggio usano realmente i LOGIN di dispositivo A/A2/reader/B, non impersonazione postgres. Solo bootstrap, osservazioni e fault hook sono amministrativi. I trigger `tm_fault` **non** fanno parte della migrazione proposta.

Il nucleo prova una transazione per **un profilo DTO sintetico completo, chiuso e immutabile**, validato con STATE_SCHEMA prima del provisioning. Sono ammesse soltanto variazioni di stateId, ui.day e degli otto booleani degli scambi. Ogni altro cambiamento viene rifiutato: non passa un Journey/catalogo/movimento arbitrario. Il profilo server è provisionato dal laboratorio, non dal body del client. Non è un registro di asset approvati per il simulatore.

Le proiezioni ferroviarie restano quelle del profilo: identità/composizione/posizione/Journey non possono cambiare; in transazione si aggiorna state_version delle proiezioni placement interessate. Switch, UI, time e missioni restano nello snapshot, secondo 6A.1. Entrambi i workspace hanno una composizione attiva e un loose sintetico non membro, con Journey completo. Entrambe le proiezioni sono revisionate insieme; sono provati anche fault durante ciascun UPDATE. La fixture legacy non vuota include loose e rimane intatta. La validazione generale e la sostituzione arbitraria di tutte le proiezioni non sono implementate; non si dichiara SaveCheckpoint generale completato.

`envelope.js` è un adapter server isolato: parsing rigoroso (duplicate decoded keys/nonfinite/limite byte), confronto con contesto verificato ricevuto separatamente, revisioni decimali bigint, canonicalizzazione JCS e SHA256. Riusa le utility 6A.2 senza modificarle. Il DB ricalcola SHA256 del wire canonico prima di usarlo e confronta il digest. Il DB non implementa un secondo parser JCS: l'ingresso SQL privato è il confine server dopo l'adapter, non un endpoint client. Non si deve collegare un body grezzo direttamente alla funzione. Nessun HTTP server o SQL arbitrario esposto. Firma/nonce/proof gateway non sono integrati nel DB in questa fase.

## Transazione e autorizzazione

Una chiamata alla funzione privata sulla stessa connessione, READ COMMITTED:

1. Workspace/device derivano dai binding amministrativi di **session_user**; workspace/layout dell'envelope devono coincidere. Scope editor/owner, stato workspace, revoca ed expiry device sono ricontrollati dentro i lock.
2. Lock workspace coordinator → device coordinator → head. Il lock workspace serializza anche layout differenti e rende univoca la deduplica workspace/request_id. È deliberatamente conservativo, non un benchmark throughput.
3. Ricevuta cercata prima del CAS. Stesso attore, digest ed envelope restituiscono il JSON originale, incluso timestamp/snapshot/revision; il head può essere già avanzato. Riutilizzo diverso → IDEMPOTENCY_KEY_REUSED.
4. Head atteso esatto; candidata confrontata con profilo server; trigger snapshot controlla hash, STOPPED e otto switch booleani.
5. INSERT snapshot → UPDATE revisioni proiezioni → UPDATE head di esattamente uno → INSERT receipt → SET CONSTRAINTS ALL IMMEDIATE → commit della chiamata/connessione → risposta.

Le FK head→receipt sono rese deferred in una nuova migrazione; quelle snapshot rimangono immediate. Non ci sono quattro chiamate REST. Nessuna ricevuta/snapshot è modificabile o cancellabile dal worker. Il worker può chiamare più volte la funzione in una transazione esplicita: la durabilità e la risposta applicativa richiedono il commit esterno prima della consegna al client; il runner usa autocommit psql per ciascuna chiamata.

Revoca: trigger invoker obbligatori su UPDATE/DELETE devices e workspaces acquisiscono lo stesso coordinatore. I test osservano davvero revoke bloccata dietro un save, poi diniego di nuove scritture. Le letture SQL preesistenti del worker rimangono workspace-scoped e non sono una API revocabile per dispositivo. Non è PASS di revoca distribuita/gateway. Provisioning e reset di binding sono operazioni amministrative separate, non API del worker.

## Matrice privilegi e minima elevazione

Disegno dei grant stabilito prima dell'implementazione; verifica effettiva in [privileges.json](evidence/6A4/privileges.json), con grant a livello colonna.

| Principal | Prima 6A.3 | Dopo 6A.4 |
|---|---|---|
| anon/authenticated | Nessun grant applicativo/registry | Invariato; nessun EXECUTE del save |
| worker | SELECT del proprio workspace/catalogo; UPDATE(marker) device_locks | Come prima + EXECUTE della sola funzione privata; nessun DML diretto checkpoint/head/proiezioni, binding o registry |
| authorizer | DML registry/coordinamento | Aggiunto coordinamento workspace; nessun save/snapshot/head DML |
| executor nuovo | Assente | NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, NOCREATEDB; nessuna tabella posseduta; SELECT dati necessari e sole colonne di stato autoritativo, senza public_key/verifier; INSERT snapshot/receipt; UPDATE soli riferimenti head/state_version proiezioni/marker lock e UPDATE(id) stock_items per consentire il SELECT FOR UPDATE del trigger loose storico (nessun ID viene modificato); EXECUTE helper ferroviari necessari |

La sola funzione save è SECURITY DEFINER **privata**, di proprietà executor, con search_path vuoto; PUBLIC/anon/authenticated/authorizer senza EXECUTE. Non usa SQL dinamico. L'elevazione evita di concedere al worker DML raw con cui saltare CAS/atomicità. Executor è soggetto a RLS USING/WITH CHECK e non possiede tabelle; il predicato legge il binding di session_user, che non cambia dentro definer. Worker non è membro di executor e non può alterare session authorization. Il ruolo autoritativo di laboratorio non è una service_role. I fault hook definer amministrativi esistono esclusivamente nel runner per provocare rollback.

Per produzione serve un piano esplicito: il laboratorio associa ogni login a workspace **e dispositivo**, con credenziali distinte; non suppone che un gateway possa creare/selezionare liberamente ruoli. Un pool universale con SET ROLE non conserva questo modello, perché session_user sarebbe quello del pool. Nessun provisioning di produzione implementato o autorizzato.

## Rollback e gap R0 originali

Rollback provato: errore SQL prima del COMMIT della nuova migrazione lascia schema, ruoli e dati esattamente precedenti, incluse le definizioni 6A.3 sostituite transazionalmente. Non esiste down distruttivo post-utilizzo; per ritirare il percorso si ferma il caller e si preservano snapshot/ricevute. Nessuna modifica retroattiva alla 6A.3.

| R0 | Copertura di laboratorio | Residuo |
|---|---|---|
| P09 | Errori SQL in sei punti, deferred railway e backend terminato dopo snapshot: rollback esatto | Crash OS/storage, energia, tutti i fault come kill reale, PITR/backup produttivi |
| P10 | Retry, head avanzato, risposta scartata, envelope/digest/attore diversi, concorrenza identica | Integrazione gateway/journal/retention e dominio legacy owner/request_id durante futuro cutover |
| P11 | Connessioni SQL realmente sovrapposte, unico CAS vincente, recovery locale nuova revisione | Due tab/browser, journal condiviso, UI409 e recovery generale |
| P12 | Nessuna duplicazione su retry DB | Offline/reconnect/backoff/coda browser non implementati |
| P13 | Digest/topology/switch/resume/version/profilo errati respinti | Validator generale catalogo/Journey/occupazione e restore/quarantena/asset |
| P14 | RLS A/B e recovery trasversale negati; reader, revoca/expiry locali e forgery SQL negati | Proof/epoch end-to-end, revoca distribuita e read gateway, provisioning/pool/TLS reali |
| P15 | Limite payload adapter+SQL, nessuna funzione privilegiata pubblica, privilegi limitati | Budget throughput/storage/rate e carichi reali, configurazione Data API/advisor produttivi |

P01–P18 originali preservati in R0_ACCEPTANCE_MAPPING.md. Nessuna fase 6B–6E iniziata. Il corpus completo di regressioni visive/prestazionali R1 non è rieseguito: runtime/assets/bundle sono identici e le suite Node/JMRI pertinenti passano. PostgreSQL usa fsync e synchronous_commit predefiniti; il tmpfs non prova sopravvivenza a perdita dell'host. Il test after-commit scarta una risposta già ricevuta nel driver, non uccide il trasporto HTTP/gateway (assente).
