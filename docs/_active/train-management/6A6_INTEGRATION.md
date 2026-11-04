# 6A.6 — Contratto del laboratorio integrato

Autorizzazione esclusiva del committente, dopo approvazione 6A.5 `ef36596224133f19ceebeb4de889456c78959515`. Branch `feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` intoccabile. Questo contratto supera il gate storico «6A.6 non iniziata» per il solo incarico corrente. Nessuna 6B, modifica del simulatore o migrazione/deploy remoto.

## Riproduzione

Prerequisiti: Node24, Python3/jsonschema, Docker sul socket locale, Chromium `/usr/bin/chromium`, Playwright1.56.1 in una directory di strumenti esterna al progetto. In questa sessione:

```
npm ci
npm install --prefix /workspace/work/6A6/tools --cache /workspace/work/6A6/npm-cache --no-audit --no-fund --save-exact playwright@1.56.1
SERIEN_DB_EVIDENCE=/workspace/work/6A6/results python3 tests/db/6A6/run.py
```

`PLAYWRIGHT_MODULE` può selezionare il percorso assoluto del modulo di test già installato; `CHROMIUM_PATH` il browser. Non sono dipendenze dell'app. Il runner non accetta un DSN remoto. Immagine PostgreSQL17 fissata allo stesso digest 6A.5, rete none, nessuna porta, tmpfs; cleanup nel finally anche su errore. Per scaricarla occorre l'accesso rete autorizzato dell'ambiente, senza modificare proxy. Per avviare HTTP/Chromium locale usare le autorizzazioni di esecuzione supportate. Non usare credenziali produttive.

`profile_fixture.py` conserva il grafo sintetico chiuso 6A.5: un train e un loose per workspace, stesso owner Auth legacy sintetico. Lo schema completo viene validato con STATE_SCHEMA.json. Non è cattura/serializzazione dello stato del simulatore. Nessun import dei nuovi moduli dal runtime R1.

## Percorso effettivo

1. Chromium genera P-256 non esportabile e salva CryptoKey+identità in IndexedDB.
2. Operatore test approva esattamente workspace/layout/device/chiave/scope; ticket casuale monouso10min conservato solo come digest in RAM. Candidata firma il redeem; scope extra rifiutato. Il provisioning SQL viene committato prima dell'ack. Primo owner e successivi dispositivi seguono lo stesso percorso, senza login cliente.
3. Ogni POST contiene proof 6A.2, firma P1363 e body. Parser6A.2 rigoroso riusato immutato. Server verifica i valori realmente ricevuti: domain/version/audience/method/path/workspace/layout/operation/bodyDigest/device/keyId/epoch/request_id/nonce/timestamp.
4. Binding server sceglie il login SQL fisso. Il browser non sceglie ruolo o connessione. Nessun SET ROLE nel percorso dati; session_user reale viene osservato dopo ogni query riuscita. Un psql persistente per principal, coda seriale per connessione, ruoli distinti anche tra due dispositivi A. Nessuna riassociazione del binding di una sessione aperta.
5. Funzioni private6A.5 con RLS controllano device/scope/revoca/expiry/epoch/version e workspace, sotto lock; CAS e snapshot/proiezioni/head/ricevuta in una transazione. Il driver bufferizza SELECT fino al marker psql emesso **dopo COMMIT**. Errori/timeout/connessione persa non rilasciano risultati parziali.
6. HTTP restituisce solo il risultato dell'API o un codice allowlist, senza errori SQL grezzi. Browser verifica versione, identità e metadati; per Save verifica indipendentemente digest envelope e stato; per ReadSnapshot ricalcola hash e confronta engine/topology/manifest. ReadReceipt non include lo stato: integrità contenuto verificabile legandolo allo snapshot/digest, non indovinando il payload da una ricevuta compatta. Nessuna promessa anti-amministratore.

Endpoint dati ammessi: ReadHead, ReadSnapshot, ListHistory, ReadReceipt, SaveCheckpoint, RecoverRevision. `/v1/pair` e `/v1/recover` servono solo i ticket approvati in-process. Nessun endpoint di provisioning, SQL arbitrario, revoca amministrativa o ispezione registry. Statiche servite soltanto `/`, `/client.js`, `/protocol.js`; bind127.0.0.1 e Host esatto. Origin è difesa aggiuntiva: non concede autenticazione, anche assente occorre la firma.

## Limiti e fault

Richiesta HTTP2MiB (include proof), risposta256KiB; nonce10.000 vivi/5min, ticket/device64 nel laboratorio, timeout request/header5s,32connessioniHTTP. Budget ingresso200 richieste/IP e1000 globale per60s, massimo1024subject; dinieghi contati prima del parse. Budget SQL6A.5:60/device e120/workspace per60s,100revisioni,16MiB logici,5000audit, pagina20. Il rate limiter RAM è **solo monoproc­esso**; riavvio lo azzera. SQL conserva contatori delle sole transazioni riuscite. Non si certificano antiabuso distribuito, storage fisico o throughput produttivo.

Sessione SQL: statement timeout4s, lock timeout3s, deadline subprocess8s; psql ON_ERROR_STOP chiude su errore, connessione ricreata col medesimo principal alla richiesta successiva. Nessun retry automatico indiscriminato. Retry applicativo conserva request_id/envelope ma genera nuovo nonce/firma; riusare la stessa proof è replay. Il backoff dell'adapter6A.5 è testato separatamente, senza presentarlo come outbox browser implementata.

Fault distinti: eccezione SQL dopo INSERT; pg_terminate_backend reale; statement timeout; AbortController interrompe HTTP mentre risposta postcommit è trattenuta; chiusura pagina; SIGKILL del processo Chromium. Non equivalgono a crashOS/disco/PITR. Una risposta autorizzata prima della revoca può completare; revoca coordinata aspetta la transazione. Dopo commit della revoca, zero nuove letture/scritture. È provata anche revoca mentre HTTP attende prima dell'ingresso SQL.

**Confine di laboratorio:** Docker exec con autenticazione Unix trust non prova password/TLS, Supavisor o isolamento del worker ospitato. Il supervisore del test può amministrare l'intero container; non è un gateway produttivo sicuro. Registry/ticket/nonce RAM, provisioning/recovery operatore e pool non sono distribuiti né durevoli. Il gateway non implementa il recovery kit offline definitivo o la rotazione delle credenziali. Safari/Firefox, eviction/power loss, persistenza chiave dopo crash del processo, host crash e configurazione Supabase reale restano NOT VERIFIED.

Rapporto e decisione di gate: [6A_INTEGRATION_GATE.md](6A_INTEGRATION_GATE.md). Un laboratorio PASS non approva il modello di hosting né chiude automaticamente la macrofase.
