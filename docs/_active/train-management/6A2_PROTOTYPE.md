# 6A.2 — Laboratorio locale di capacità

6A.1 approvata dalla Regia al checkpoint `4c90f1520ce6cd1cc7c1e9a538f819c135c45a82`. Solo 6A.2 autorizzata. Codice isolato in `prototypes/train-management/capability-gateway/`, senza import dal runtime ferroviario, dipendenze nuove o adattatori DB. Il listener ammette esclusivamente `127.0.0.1`, porta effimera, Host esatto. CLI richiede esplicitamente `--local-prototype`; non è un servizio da distribuire. Nessuna configurazione può trasformare il bind in wildcard. Un operatore potrebbe comunque copiare/modificare codice o usare un tunnel: non si pretende di impedirlo crittograficamente.

## Esecuzione dalla root repository

```sh
node prototypes/train-management/capability-gateway/run.js --local-prototype
node prototypes/train-management/capability-gateway/security.test.js
node prototypes/train-management/capability-gateway/browser.test.js
npm test
npm run build
```

Node24 con WebCrypto. Per il test browser occorrono Playwright già installato nell'ambiente di collaudo e Chromium (`/usr/bin/chromium`, override test `CHROMIUM_PATH`). Non sono dipendenze dell'app, non vengono installate automaticamente. In sandbox il listener locale/browser richiede l'accesso rete dell'esecutore; non significa pubblicazione esterna. L'avvio CLI serve una pagina laboratorio priva di registry: non offre bootstrap pubblico. Gli scenari automatizzati creano due workspace e capacità effimere tramite API operatore **in-process**, poi esercitano veri endpoint HTTP. Arrestare il processo cancella tutto. Nessun invito, chiave o recovery material reale va usato.

Output evidenze opzionale: `CAPABILITY_EVIDENCE=<file>` per suite HTTP, `CAPABILITY_BROWSER_EVIDENCE=<file>` per browser. Contengono input descrittivi, esiti e risposte negate; nessuna firma, token o chiave privata. I dati protetti sono solo stringhe fixture. Nessun endpoint diagnostico pubblico legge il registry; `inspect()` è un oracolo in-process disponibile soltanto ai test.

## Protocollo concretamente verificato

ECDSA P-256/SHA-256, WebCrypto genera private CryptoKey con extractable=false; public JWK esportabile. Firma wire: 64 byte IEEE-P1363 r||s, codificati hex minuscolo (128 caratteri), verifica Node con `dsaEncoding:ieee-p1363`. Non confondere con DER ASN.1. Fingerprint SHA256 della JWK canonica condivisa; l'oggetto esatto esportato viene conservato senza riscriverne i campi.

Envelope JSON `{proof,signature,body}` chiuso. Proof: domain `SerieN-capability-v1`, version1, audience esatta, method, path, workspaceId, layoutId, operation, bodyDigest SHA256, deviceId/keyId, epoch, request_id UUID, nonce128 bit, issuedAt millisecondi UTC. Canonicalizzazione JSON condivisa con chiavi ordinate UTF16 e numeri ECMAScript finiti, rifiuto Unicode non ben formato; nessuna dipendenza. Parsing HTTP rifiuta anche chiavi duplicate decodificate/annidate, UTF8 invalido, profondità>64, nonfinite, trailing JSON. Body massimo2MiB; proof con campi extra respinto. Non si accettano path codificati/alias/query o metodi alternativi. BodyDigest viene ricalcolato dal server.

Finestra timestamp ±120s, nonce conservato5min dopo accettazione della firma, massimo10.000 nonce vivi (429 oltre limite). Nonce verificato e inserito sincronicamente senza await; stesso meccanismo per lettura/scrittura/pairing/recovery. Retry di trasporto con la stessa firma è replay e viene negato. **Non è implementata l'idempotenza applicativa request_id**, il salvataggio atomico o la deduplica delle future revisioni: qui una nuova firma con nuovo nonce rappresenta un'altra operazione simulata.

Registry autoritativo: chiave pubblica, workspace, scope reader/editor/owner, epoch, revocato. Nessuno scope del body aumenta i permessi. Accesso read protetto quanto write; editor scrive, owner può invitare/revocare. Layout deve coincidere col layout registrato del workspace. Invito è insieme challenge casuale monouso e approvazione owner della chiave/fingerprint/scope; la candidata firma il redeem con la stessa chiave. Il laboratorio non espone un challenge endpoint anonimo che riveli dati. TTL invito10min, registro contiene solo digest del token. Consumo e registrazione sono una sezione sincrona senza await: il test concorrente prova un solo successo. Per il primo owner, bootstrap è API operatore nel processo, mai HTTP.

Recovery simulata: API operatore genera kit effimero con TTL10min e digest server; POST firmato con la nuova chiave prova possesso kit+chiave e registra owner dopo revoca di **tutti** i vecchi device e inviti del workspace. Consumo monouso, sostituzione kit invalida il precedente. TTL del kit è una restrizione del laboratorio: il kit offline duraturo e la cerimonia di consegna/conferma restano da specificare/collaudare prima di produzione. Nessuna backdoor da solo workspaceId. Rotazione a due fasi non implementata: epoch/revoca sono verificati, recovery non viene presentata come prova di rotazione.

Revoca e operazioni simulati avvengono nella stessa event loop/sezione sincrona; una firma creata prima della revoca e inviata dopo è negata. Non sono lock DB o garanzie tra processi. Dispositivi non hanno scadenza assoluta nel registry simulato: scadono proof e inviti, la scadenza di grant durevoli resta un eventuale requisito da definire. Nessuna richiesta anonima ritorna dati privati.

Origin estraneo negato; Origin assente ammesso per client firmati CLI, Origin corretto non concede accesso. Nessun CORS permissivo, nessuna cookie auth; OPTIONS non autorizza. Host verificato contro origin loopback per limitare rebinding. Pagina pubblica laboratorio e moduli sono statici e non contengono segreti. Chiave privata browser salvata come CryptoKey in IndexedDB; cancellazione/perdita produce stato missing, senza fallback unsigned o rigenerazione automatica di una capacità autorizzata.

## Limiti espliciti

Soltanto HTTP loopback, un processo, memoria volatile, nessun account/login, DB, Supabase, TLS reale, salvataggio relazionale, autosave o connessione Pages. Quote reali, rate budget per identità/IP, DoS di produzione, revoca distribuita, restart durability, transazioni RLS/ownership, multi-process races, rotazione e kit offline definitivo **NOT VERIFIED**. Il limite nonce/corpo e timeout5s/max32connessioni sono protezioni del laboratorio, non un budget di servizio certificato; registry inviti/dispositivi non dimensionato per produzione. Il ruolo amministrativo è in-process, non un'amministrazione autenticata definitiva.

Il browser prova reload nella stessa sessione Chromium, non guasto disco, cancellazione storage, backup OS o tutti i browser. Una CryptoKey non esportabile rimane utilizzabile da XSS nello stesso origin: non promettere isolamento da codice malevolo locale. CSP di laboratorio non viene applicata al sito R1. Test e fixture non implementano le funzionalità future 6B–6E.

[Rapporto ed evidenze](evidence/6A2/REPORT.md). [Tracciabilità R0 originale P01–P18](R0_ACCEPTANCE_MAPPING.md). STOP e review della Regia prima di 6A.3.
