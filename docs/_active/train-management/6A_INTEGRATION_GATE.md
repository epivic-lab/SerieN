# 6A — Integration gate alla Regia

**Chiusura macrofase: BLOCKED.** Il laboratorio 6A.6 verifica il percorso browser/firma/gateway/login SQL/PostgreSQL17/transazione/risposta/verifica browser nel solo profilo sintetico. Persistono due decisioni architetturali: provisioning/connessioni del futuro hosting e cutover delle tabelle che richiedono owner Auth. Nessuna chiusura 6A o autorizzazione 6B è dedotta dai PASS locali.

Baseline approvata6A.5 `ef36596224133f19ceebeb4de889456c78959515`; branch esclusivo `feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Fetch riuscito dopo concessione rete Codex; SHA remoto atteso e ascendenza di entrambi i checkpoint verificate prima del checkout. Configurazione Git locale ampliata con refspec del solo branch richiesto per il tracking; nessuna modifica proxy, tunnel o ricostruzione di commit. AGENTS, PROGRESS/STATUS, contratti/report6A.1–6A.5, schema e mappingR0 esaminati. L'autorizzazione corrente supera i vecchi STOP documentali per la sola6A.6.

## Artefatti e riproduzione

- [Contratto del laboratorio/comandi/limiti](6A6_INTEGRATION.md).
- `prototypes/train-management/integration-lab/`: gateway loopback separato, client IndexedDB, transport SQL a principal distinti.
- `tests/db/6A6/`: fixture chiusa, orchestratore effimero, scenari automatici Chromium/HTTP/PG e oracoli SQL.
- [Risultati integrati con stati SQL](evidence/6A6/results.json), [metriche grezze](evidence/6A6/metrics.json), [audit redatto](evidence/6A6/audit.json), [ambiente](evidence/6A6/environment.json), [log](evidence/6A6/integration.txt).

Gli stati database sono catture effettive, deduplicate tramite SHA256; ogni caso collega prima/dopo e osservato. Il confronto copre tutte le dieci tabelle applicative e session_heads. Ogni diniego confronta inoltre devices, binding e workspace autoritativi (hash dei valori realmente letti), senza dati privati nella risposta. Audit e rate windows di letture riuscite cambiano per progetto e non vengono spacciati per checkpoint. Dati esclusivamente sintetici. SQL actor/pid osservati sono negli esiti: non sono impersonazioni postgres via SET ROLE.

## Risultati e matrice autorizzazioni

I conteggi effettivi e le statistiche sono generati nel [riepilogo](evidence/6A6/summary.md) dai file finali; non dai tentativi incompleti. Le prove storiche sono rieseguite sulle rispettive migrazioni immutate. Il risultato locale non certifica produzione.

| Attore / caso | Lettura | Scrittura / effetto | Osservazione |
|---|---|---|---|
| Owner A, pairing approvato | PASS | PASS | Firma Chromium e login A reale |
| Editor A, secondo device | PASS | PASS | Principal diverso dall'owner, CAS409 al perdente |
| Reader A | PASS | Negata PASS | Save e Recover403, nessun checkpoint mutato |
| Owner B | PASS | PASS isolato | Stesso request_id/owner legacy di A, risultato B indipendente |
| Device sconosciuto | Negata PASS | Nessuna autorità | Zero dati/cambi |
| Device revocato nel DB, gateway ancora stale | Negata PASS | Negata PASS | Connessione già aperta non aggira authorize; poi chiusa da ON_ERROR_STOP |
| Device epoch stale / expires_at passato | Negata PASS | Negata PASS | Controllo SQL distinto dal timestamp proof |
| Workspace epoch stale | Negata PASS | Negata PASS | Nessuna autorità dal solo registry RAM |
| Firma falsa/replay/audience/metodo/path/digest errati | Negata PASS | Nessuna esecuzione | Proof controllata sulla vera richiesta HTTP |
| Workspace diverso / ruolo SQL nel body | Negata PASS | Nessuna escalation | Connessione derivata dal binding operatore |
| Pair scope falsificato / kit riutilizzato | Negata PASS | Nessun nuovo grant | Token legato a chiave/scope/device e consumo singolo |
| Chiave persa | Nessuna richiesta | Nessun fallback | IndexedDB missing dopo cancellazione/reload |

ReadHead/ReadSnapshot/ListHistory/ReadReceipt/SaveCheckpoint/RecoverRevision attraversano tutti HTTP e database reali. Ricevuta leggibile solo dall'attore: altro attore riceve404 NOT_FOUND, senza rivelarne esistenza. Browser verifica snapshot e hash anche su risposta realmente corrotta dopo il commit SQL (hook test prima dell'invio HTTP): errore INTEGRITY_ERROR, non un mock di verifica crittografica.

Save iniziale, save successivo, retry identico dopo head avanzato e dopo risposta HTTP persa, concorrenza di due contesti browser, recovery nuova revisione, storico conservato, pagina keyset, corruzione e topology incompatibile, quote revisioni/storage, limiti request/response/pagina, rate SQL e ingresso: oracoli automatici negli esiti. CAS include due sessioni osservate entrambe in attesa del lock SQL, non soltanto due Promise concorrenti. Nessun serializer/hydrator del simulatore.

## Fault, revoca e limiti delle prove

| Guasto | Prova osservata | Limite |
|---|---|---|
| Eccezione SQL dopo INSERT snapshot | HTTP503 redatto, tutte le componenti precedenti identiche | Hook amministrativo test, non crash macchina |
| pg_terminate_backend dopo INSERT | Backend reale terminato, rollback identico | Connessione SQL, non interruzione HTTP |
| Statement timeout | Timeout reale4s, nessun parziale | Non inventa una risposta di successo |
| HTTP AbortController dopo COMMIT | Connessione browser abortita, retry nuovo nonce/stesso ID restituisce stessa revisione | L'operazione committata non viene annullata dal disconnect |
| Chiusura pagina dopo COMMIT | Nuova pagina usa CryptoKey IndexedDB e deduplica stessa richiesta | Non è crash del processo |
| SIGKILL Chromium dopo COMMIT | Processo browser reale terminato, head e singola ricevuta confermati dal DB | Incognito: durabilità della CryptoKey dopo crash processo NOT VERIFIED |
| Revoca durante HTTP prima di SQL | Revoca committa; richiesta in corso403 senza modifiche | Non garantisce ritiro di dati già consegnati |
| Read SQL già autorizzata/revoca concorrente | Revoca osservata bloccata sul coordinatore; read200 prima del revoke; nuove read/write403 dopo commit | Punto di linearizzazione esplicito, non «zero risposte dopo avvio revoca» |

Cleanup: chiusura pool e zero sessioni lab osservate; container eliminato nel finally. Anche test regressivi6A.4/6A.5 riprovano fault in sei sub-step e vincoli deferred. CrashOS, disco, WAL/PITR, restart gateway/multiistanza, TLS, Safari/Firefox/mobile e hardware restano NOT VERIFIED. Incognito IndexedDB passa reload nella sessione, non backup/eviction del browser.

## Threat model aggiornato

| Confine / minaccia | Difesa verificata | Rischio residuo / decisione |
|---|---|---|
| Browser ostile / IDOR / scope inventato | Firma P-256 su proof/corpo, scope server, schema chiuso, binding SQL, RLS/authorize | XSS nello stesso origin può usare la CryptoKey; non-esportabilità non lo impedisce |
| Replay / vecchi grant | Nonce one-use RAM, TTL proof, epoch/version/expiry/revoca SQL per ogni chiamata | Nonce/ticket volatili: restart e multiistanza richiedono registro atomico durevole |
| Pair/recovery concorrenti | Ticket esatto/key/scope; sezione pending per workspace; consumo dopo commit; recovery revoca vecchi device/inviti | Kit offline, delivery e durabilità crash tra SQL e registry non implementati; retry può richiedere intervento operatore |
| Worker che sceglie altro ruolo/workspace | Percorso dati senza SET ROLE; principal fisso per binding; nessuna DML raw | Il supervisore Docker del laboratorio può amministrare tutto. Vietato distribuirlo come worker produttivo |
| Errori SQL / segreti / logging | Codici allowlist, gateway log solo operation/outcome, client statico senza DB/token/password, bundle R1 invariato | Non è audit anti-admin; supervisore/oracoli test vedono dati sintetici |
| Sovraccarico / pool / memoria | Byte/timeout/connections/nonce/ticket cap, ingress budget negazioni, SQL quote e pagine, queue per principal | Rate RAM non distribuito; registry non durevole; numero principal/connessioni va dimensionato prima di hosting |
| Corruzione / risposta incompatibile | Hash stato/envelope separati, versioni/engine/topology/manifest, browser ricalcola | Hash non autentica contro amministratore che riscrive dati e hash; serve HTTPS reale |
| Disconnessione / retry | Commit prima risposta; nonce nuovo/ID stabile; receipt e CAS | Outbox/offline/autosave UI non implementati |

CORS/Origin non sono autenticazione. Nessun endpoint pubblico privilegiato o bind wildcard; le API operatore sono in-process. Il test non prova isolamento da un altro processo locale con accesso al socket Docker. Nessuna nuova dipendenza applicativa; Playwright resta strumento esterno versionato.

## Praticabilità del modello principal/device su Supabase

**BLOCKED per produzione; non concluso che sia impossibile, ma non verificato né approvato per l'hosting futuro.** Nel laboratorio il modello conserva session_user distinto e revoca immediata tra transazioni; questo prova le interfacce SQL, non il servizio gestito.

1. **Provisioning:** componente separato con sola autorità di provisioning controllato, cerimonia key-bound, ACL/grant audit e lifecycle dei ruoli; nessun CREATEROLE/superuser/Docker nel worker HTTP. Il laboratorio usa un operatore postgres esclusivamente sintetico. Non usare la sua callback amministrativa come architettura produttiva.
2. **Selezione connessione:** binding immutabile (workspace/device/grant/epoch/key_version)→secret/principal; mai ruolo o DSN dal client. Un worker con tutte le credenziali può comunque impersonare tutti i device assegnati: segregare broker/worker per workspace o dominio limitato, autorizzare lookup e imporre egress/secrets isolation. Questo richiede decisione della Regia.
3. **Pooling:** nel lab un backend persistente per device attivo; numero connessioni cresce con device attivi×pool per device×istanze. Per1000device attivi anche un backend/device richiede1000backend prima dei servizi Supabase: esempio aritmetico, non capacità/costo misurato. Servono cap globale, pool lazily-open/LRU/idle expiry, backpressure e fairness; evitare moltiplicazione per replica. Non è un pool universale con SET ROLE.
4. **Revoca:** il DB rilegge registry e coordinatore in ogni transazione anche su connessione calda. Revoke committa dopo le operazioni autorizzate che già tengono il lock. Servono anche chiusura pool e disabilitazione nuove connessioni; NOLOGIN/password change da soli non invalidano backend già aperti. Non rimappare vecchi login a nuovi device.
5. **Rotazione:** nuovo principal/secret/binding di versione nuova, attivazione con prova key-bound, revoca vecchia versione sotto lock e drain/chiusura backend, disable login e retirement solo dopo inventario sessioni. Rollback non deve riattivare grant compromessi. Credenziali cifrate in secret manager, mai nel browser/log; non implementato qui.
6. **Servizio reale:** documentazione corrente Supabase distingue direct IPv6 (o add-onIPv4), Supavisor session IPv4 e transaction, limiti client/backend e costo compute. Supporto custom-role, conservazione effettiva di session_user e pool partitioning per principal devono essere verificati su staging autorizzato per ogni modo candidato, con TLS/certificato e grant reali. Nessun PASS Supavisor/PostgREST dedotto dal PostgreSQL vanilla. Connection string, tier/quote effettivi e networking del progetto reale non letti né modificati in6A.6.
7. **Costi/scalabilità:** costo ruoli/secret lifecycle, rotation/audit, connessioni per-device e capacità compute, coordinatore workspace che serializza anche read, crescita snapshot/audit e WAL richiedono misure di carico e budget approvato. Non si vende il tmpfs o il Docker psql come benchmark cloud. Hosting Pages statico richiede comunque un servizio gateway HTTPS separato, non creato qui.

Fonti consultate via search_docs: [connessioni](https://supabase.com/docs/guides/database/connecting-to-postgres), [gestione connessioni](https://supabase.com/docs/guides/database/connection-management). Fetch changelog.md403 anche con rete autorizzata: NOT VERIFIED per quel canale, nessun bypass. Nessuna nuova funzionalità Supabase distribuita.

**Alternative da sottoporre alla Regia, non implementate:** conservare principal/device con gateway persistente e broker isolato, dopo staging di pool e costi; oppure progettare un verificatore capability dentro il DB con proof firmata, nonce atomico e scope verificato indipendentemente, permettendo un pool limitato senza fidarsi di GUC/body. Quest'ultima cambia il confine di fiducia e richiede contratto/migrazione/audit nuovi; non si sostituisce automaticamente il modello con SET ROLE o ruolo condiviso universale.

## Cutover minimo senza owner Auth — piano, non migrazione

**Persistenza nativa ownerless: NOT VERIFIED/NON IMPLEMENTATA.** Tutte le fixture A/B riusano l'unico owner Auth legacy sintetico già approvato; l'utente non vede login/password, ma il DB continua a richiedere quel FK. Non è dimostrazione della persistenza di un workspace privo di owner Auth. Nessun shadow user produttivo creato.

1. Inventariare schema/grant/policy/trigger/FK/cascade e conteggi attuali in staging autorizzato e, solo in lettura, nel reale. Non assumere ancora zero dati dagli audit precedenti. Backup con restore provato e mappa approvata legacy owner→workspace; congelare scritture durante il passaggio e annotare head/digest/ricevute.
2. Per le otto tabelle con owner_id (stock_items, consists, consist_members, layouts, layout_placements, loose_stock_placements, layout_snapshots, operation_receipts), rimuovere NOT NULL e default auth.uid solo nel cutover separato. Mantenere vincolo di proprietà totale: workspace valorizzato per ogni nuova riga oppure legacy owner valido in modalità legacy; mai entrambi null. ownership_key deve restare non nulla e derivata, con FK composite sul domain. Catalogo e segmenti mantengono il loro modello attuale.
3. Verificare helper/trigger/policy che confrontano owner, FK composite legacy che con NULL diventano inattive (MATCH SIMPLE), indici unique nullable e cascades auth.users. Trasferire l'autorità dei dati migrati a workspace: mantenere un vecchio owner FK ON DELETE CASCADE può ancora cancellarli alla rimozione Auth. Separare provenance legacy dal FK operativo o rimuovere tali dipendenze sui record migrati con un disegno approvato, senza cancellare né falsificare utenti.
4. Confermare che Save/Recover derivino identità solo dal binding e dal layout; nullable owner non deve saltare i vincoli ferroviari/domain. Testare nuovi workspace con **zero righe auth.users**, entrambe le proiezioni e API, head/receipt, recovery e rollback, oltre a dataset legacy non vuoto. Conservare PK receipt_id, UNIQUE(workspace_id,request_id) e unicità legacy parziale. Snapshot passati e digest immutati.
5. RLS/ACL private e read/write per scope devono restare efficaci con ownerNULL. Rieseguire test adversarial A/B, scope/epoch/revoca, grant diretti negati, schema exposure e default privileges; nessun grant anon o policy true temporanea.
6. Vincoli ferroviari da conservare e riprovare: locomotive0/carri successivi, ordine contiguo ready deferred, esclusività member/loose, FK edge/layout e range s, heading, Journey/verso, hash topologia, STOPPED, otto ID booleani, proiezioni stessa revisione, CAS e provenance composite. Nessuna modifica a topologia/motore per adattarsi al backend.
7. Rollback prima del primo ownerless commit: disabilitare percorso nuovo e ripristinare schema/grant sotto manutenzione solo se tutti i dati soddisfano i vincoli precedenti, lasciando expand inattivo se sufficiente. Dopo nuovi dati ownerless non è lecito reimporre NOT NULL o inventare owner: preferire forward-fix/servizio read-only, oppure restore verificato conservando export e replay validato di tutti i checkpoint successivi, con approvazione esplicita. Mai down distruttivo o perdita silenziosa dei salvataggi.

Decisioni richieste: architettura broker/pool e hosting; lifecycle/rotazione/principal e segreti; procedura staging Supabase; semantica eliminazione owner legacy; autorizzazione separata a una microfase correttiva di cutover ownerless. Nessuna di queste è una concessione implicita a modificare il reale.

## Matrice R0 P01–P18 — perimetro effettivo

PASS indica il solo criterio effettivamente collaudato nel profilo chiuso. Quando il criterio R0 completo eccede il laboratorio, l'esito complessivo resta NOT VERIFIED pur riportando sottoprove PASS. Identificativi originali da [R0_ACCEPTANCE_MAPPING.md](R0_ACCEPTANCE_MAPPING.md).

| R0 | Esito criterio completo | Prova corrente / residuo |
|---|---|---|
| P01 identità | NOT VERIFIED | ID/referenze fixture DB preservati PASS; save/load runtime generale assente |
| P02 composizione | NOT VERIFIED | Proiezioni chiuse e vincoli SQL PASS; orientamenti/compositore6D assenti |
| P03 detached | NOT VERIFIED | Loose sintetico/Journey conservato PASS; restore operativo a WX/giunti non implementato |
| P04 locomotive | NOT VERIFIED | Stato sintetico persistito; quattro loco e motion restore non implementati |
| P05 scambi | NOT VERIFIED | Otto booleani e hash invariati, Node R1 PASS; zero eventi/audio su hydrate non verificabile senza hydrator |
| P06 missioni/UI | NOT VERIFIED | DTO chiuso conservato, nessun restore di missioni/console/HUD |
| P07 tempo | NOT VERIFIED | Nessun test10min/24h freeze/restore operativo |
| P08 round-trip | NOT VERIFIED | JSON DB letto identico PASS; capture/hydrate/capture runtime assente |
| P09 atomicità | PASS nel laboratorio | Fault SQL6sub-step/deferred/kill e HTTP/browser distinti; OS/PITR fuori perimetro NOT VERIFIED |
| P10 idempotenza | PASS nel laboratorio | Stesso ID/envelope/digest stesso esito, nonce nuovo; cambio digest negato, A/B indipendenti |
| P11 concorrenza | NOT VERIFIED | Due browser→SQL CAS un vincitore/409 e recovery PASS; due tab con journal condiviso/UI conflitto assenti |
| P12 offline | NOT VERIFIED | Retry/risposta persa PASS; outbox durabile/reconnect/backlog e indicatori non implementati |
| P13 corruzione | NOT VERIFIED | DB/trasporto/hash/topology rifiutati e storico integro PASS; restore runtime/asset reale assenti |
| P14 autorizzazione | NOT VERIFIED per hosting | Scope/firma/replay/revoca/expiry/epoch/A-B e segreti laboratorio PASS; broker/rotazione/TLS/restart multiistanza non certificati |
| P15 quota/abuso | NOT VERIFIED per hosting | Byte/pagine/storage/revisioni/rate e assenza adminHTTP PASS; throughput/quote/distribuzione reali non misurati |
| P16 asset | NOT VERIFIED | Manifest sintetico confrontato; asset switch live e checksum reali6C assenti |
| P17 ricovero | NOT VERIFIED | Nessun park/release/restore operativo6D |
| P18 R1 | NOT VERIFIED per matrice completa | Identità sorgenti/canonico/bundle, Node/JMRI/build e smoke corrente; suite visuali/performanceS0–S7/5C/5D completa non ripetuta |

Nessun FAIL progettuale dedotto dall'iniziale proxy non disponibile. Nessun device revocato ha ottenuto nuove read/write dopo commit della revoca nei test riusciti. Se una verifica finale fallisce, il suo log prevale su questa descrizione e il gate tecnico non è PASS.

## Checkpoint e STOP

Commit atomico che introduce questo rapporto: SHA ricavabile con `git log -1 --format=%H -- docs/_active/train-management/6A_INTEGRATION_GATE.md`. Checkpoint remoto è parte della consegna e va verificato **dopo** push normale sul solo feature/train-management; SHA effettivo nella risposta finale. Il testo non anticipa il successo di una mutazione futura.

Zero query al Supabase reale in questa microfase; nessuna migrazione nuova o modifica alle approvate6A.3–6A.5. Nessun app.js, autosave, serializer/hydrator, main, Pages, deploy, merge, reset, force-push o6B. Invarianti/scan e hash finali nel riepilogo. **STOP: audit indipendente della Regia e decisione sui blocchi.**
