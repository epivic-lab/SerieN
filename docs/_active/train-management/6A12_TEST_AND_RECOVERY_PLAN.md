# 6A.12-P — Piano di collaudo e recovery

**Tutti i test staging sotto sono NOT VERIFIED e NON ESEGUITI.**
Non sono i PASS locali6A.11. Ambiente/costi e permessi AU01–AU10 nel
[gate economico](6A12_COST_AND_APPROVAL_GATE.md); ordine nel
[runbook](6A12_STAGING_RUNBOOK.md). Nessun test usa il progetto reale.

## Classi e formato delle evidenze

N = prove ordinarie non distruttive rispetto a fixture/storico confermato;
comportano comunque mutazioni sintetiche esplicitamente autorizzate e costo.
F = fault controllati di processo, rete, timeout o permessi con dati conservati:
richiedono AU08, finestra e guardie di abort, mai fault ai servizi gestiti di sistema.
D = restore, host/volume/store loss, PITR o rollback di stato: solo clone dedicato,
AU09 distinto, costo e blast radius approvati prima. Non nella prima esecuzione
condivisa. Backup preliminare restore su clone è un gate, non un test distruttivo
implicito sulla primaria staging.

Ogni caso registra: ref/host/release/versione driver e DB, setup/attore/ceiling,
azione firmata effettiva, risultato atteso e osservato, livello del diniego
(HTTP/proof/ACL/RLS/constraint), dati/autorità/job prima e dopo, COMMIT/receipt,
principal/session_user/PID e metriche/risorse ove pertinenti. Denial PASS richiede
anche risposta senza dati e assenza di modifica applicativa non autorizzata;
claim/audit previsto può crescere. Non dedurre RLS da un42501 o FK da un403.
Hash dei manifest rimanda ai record integrali sintetici. Segreti e query sensibili
non vengono conservati. Stato finale per ogni esecuzione: PASS/FAIL/NOT VERIFIED.

## Matrice obbligatoria futura

| ID / classe | Setup e azione | Oracolo di accettazione / arresto |
|---|---|---|
| T01 N |PG17 gestito, attributi e ruoli piattaforma inventariati |Versione completa, limiti/ACL/estensioni noti, nessuna assunzione di superuser; ref corretto |
| T02 N |Operatore consentito crea principal NOLOGIN, worker senza ADMIN, tenta varianti unsafe |safe_device_role positivo solo per grant esatto; NOCREATEROLE/NOBYPASSRLS/ownership nulla; varianti respinte |
| T03 N |DDL LOGIN+complete in transazione dopoACTIVATING, errore prima COMMIT |Rollback di entrambi o ACTIVE+LOGIN completi; nessun dato durante fase incompleta; se atomico non disponibile NO-GO |
| T04 N |Direct per due role, fuori/dentro definer, due transazioni distinte |session_user fisso dispositivo; current_user executor previsto,2COMMIT reali; nessun cambio identità o uso di postgres nel broker |
| T05 N |Password/TLS validi e negativi CA/hostname/password/plaintext |SCRAM/TLS effettivi, verifica hostname/CA; negativi negano prima dei dati; niente password/hash nei report |
| T06 N |Due utenti Auth sintetici e legacy non vuoto, A/B, D10 e Auth delete controllato |Tutte le righe storiche/ID/payload/digest/context/version/timestamp/FK uguali; Auth0 e ledger2; nessun trigger storico disabilitato |
| T07 N |Creator C/D privato, ownerNULL/head0; tentativi FK/NULL nel clone strutturale |Nuovi dati senza Auth;7domain FK sempre valide, NULL bypass negato, nessuno snapshot/receipt fittizio |
| T08 N |Browser P-256, pairing key-bound, reader/editor/owner e API consentite |Head/snapshot/history/propria receipt; Save/Recover solo scope ammessi; digest verificato; non è serializer generale |
| T09 N |Client senza proof, key/firma/body/path/audience/nonce/tipi falsi; A→B/C/D |Error-only; zero accessi/modifiche trasversali e nessuna lease per input anonimo invalido |
| T10 N |Expiry/epoch/key_version/workspace_epoch/scope mutati con connessione calda |Dopo cambio/revoca COMMIT nessuna nuova operazione; cache non amplia autorità |
| T11 N |Stessa proof duplicata concorrente e dopo restart conservativo |Un claim durevole e replay negato; per due host si testa **rifiuto avvio**, non un secondo pool operativo |
| T12 N/F |Due device/backend veri, stesso expectedRevision; lock breve solo conAU08 |Un CAS vincitore/409, nessun parziale; backend distinti osservati, head avanza una volta |
| T13 N/F |Ack HTTP perso dopo COMMIT, stesso request_id/envelope con nonce nuovo, head avanzato/quota piena |Receipt identica, nessuna revisione extra; digest diverso409, receipt storica non aggiornata |
| T14 N |Job/invito/kit ripetuti, fingerprint/scope sostituiti, recovery e rotazione approvate |Un consumo, nessuna elevazione; nuovo principal funzionante, vecchio negato, storico e auth_context immutati |
| T15 N |RawSQL/helper/SET ROLE/GUC/grant ereditati, test RLS e vincoli separati |42501 ACL; RLS controllata con visibilità limitata nel clone; FK/check con SQLSTATE corretto, nessun privilegio aggiunto al runtime |
| T16 N |ACL/default privileges per ogni creator e Data API/GraphQL |Schema privato non esposto, PUBLIC/anon/authenticated/service roles senza accesso non previsto; helper non pubblici. Data API disabilitata non sostituisce verifica grant/RLS |
| T17 N |Bordo HTTPS reale: JSON rigoroso, body/header grandi, slow header/body, rate |Limiti5s/15s e2MiB/256KiB effettivi anche sul proxy;400/403/413/431/408/429 senza parziali, niente queryerror completo |
| T18 N |CryptoKey non esportabile e reload, receipt e snapshot verificati da client |Stessa chiave su reload e firma valida; risposta alterata rifiutata; XSS/OS/crash storage non dichiarati coperti |
| T19 N |Profilo ordinario24read C/D a concorrenza2 |Tutti gli esiti/dati coerenti, latenza senza fault/lock separata; risorse e costo misurati |
| T20 N/F |Picco singolo fino a96richieste, molti principal; lock artificiale soloAU08 |Cap broker16 inclredeemer/closing, queue≤64,2s wait/backpressure e progressi D; veri backend PG e RSS/coda, nessun p95 sabotato venduto come produzione |
| T21 N |Tentare seconda unità/host/service prima del rilascio secret e della SQL connect |Rifiuto preventivo, zero nuova sessione; provider/policy/lock dimostrati. Launcher locale non conta come prova hosted |
| T22 F |Sostituzione broker/ingresso, SIGKILL di soli processi propri, drain e fence |Stop→zero vecchi backend→start unico, nonce durevoli e kit già consumati negati; nessuna riattivazione di grant |
| T23 F |Restart dopo put secret, prepare, redeem, activation e prima ack |Stesso job ripreso, nessun doppio binding/secret/grant; ACTIVE solo al COMMIT; mismatch o irreperibilità fail-closed |
| T24 F |Secret store negato/time-out, journal illeggibile, rete SQL interrotta |503/error-only anche warm, nessun vecchio secret fallback; ritorno servizio solo dopo riconciliazione e test positivo |
| T25 N |Misura servizi Supabase/operatori/osservatori/connessioni residue e crescita |Ctotale con riserva approvata sotto budget reale, pool per user/db/mode contati; CPU/RSS/storage/WAL/retention e quote osservate |
| T26 N |Session mode: custom user/ref, due role intercalati, churn/idle/revoke/rotate/cache |session_user esatto a ogni txn, nessun cross-role, deadline client e backend totali rispettati; altrimenti nessun fallback da direct |
| T27 N, gate separato |Transaction mode sperimentale su scratch, solo se richiesto |BEGIN→COMMIT pinned e identità a ogni transazione, dueCOMMIT/rollback/retry; no named prepared/stateful session authority. Non abilita deploy automatico |
| T28 N |Regressioni applicabili e inventario finale |Rieseguire A01–A16/O01–O14 tramite adapter staging approvato; lab originali distinti, R1/source invarianti. Ogni prova non portabile èNV con motivo |

A07 concorrente su due broker e il picco aggregato A16 non vengono rieseguiti
sullo staging condiviso che deve impedirne il secondo avvio. Le evidenze locali
6A.11 restano ereditate (replay PASS, budget globale FAIL); tali proprietà gestite
multi-broker restanoNOT VERIFIED, senza cambiare i criteri originali. T21 verifica
l'esclusione preventiva, non sostituisce un collaudo di multi-broker supportato.

T16 richiede anche prova negativa d'esposizione. Ingresso chiuso e nessuna chiave
al browser; se per testare il percorso REST serve abilitare temporaneamente Data
API sullo staging, occorrono AU03/AU05 espliciti, dump ACL prima/dopo e ripristino
verificato. Non usare un token service_role nel browser come «test RLS».
Test RLS con SELECT temporaneo e fault di constraint avvengono nel clone strutturale,
non allargando i grant della primaria o modificando archivi confermati.

## Risorse, quote e abort

Proposta di collaudo limitato: due workspace C/D, fino a18device attivi (owner/
editor/reader), massimo32principal device/versione registrati più servizi minimi;
40oggetti secret come tetto del preventivo. I gruppi NOLOGIN e ruoli della piattaforma
sono inventariati a parte. Rotazioni aumentano il catalogo anche senza connessioni.
Non si alzano automaticamente le quote SQL6A.8; limiti o dati eccedenti fermano
la prova. Due redeemer partecipano allo stesso pool locale16.

Misurare `pg_stat_activity` e SSL insieme al pool, includendo closing e backend
residui dopo client.end. Proposta conservativa per Micro pubblicamente indicato a
60connessioni [S15]: broker≤16, operatori+osservatori≤2 durante il carico,
riserva10 **proposta**, non numero di connessioni riservate garantito dal provider.
I servizi devono lasciare margine per quei18client e la riserva. La quota disponibile
reale/superuser_reserved_connections si osserva in T01: se inferiore, ridurre carico
o sottoporre un nuovo budget, senza cambiare max_connections o tier tacitamente.

Abort prima di esaurimento quota, storage/WAL/retention sconosciuti, budget spesa
in dubbio, metriche mancanti, broker>16 o secondo broker ammesso. Chiudere ingresso,
fermare nuove attivazioni e preservare dati/receipt; niente retry a raffica.
Le soglie storage/WAL e costo devono essere riempite nella scheda prima di T19:
non sono zero o illimitate perché il listino non è noto. Niente prova pubblica DDoS.

## Recovery su clone: seconda autorizzazione AU09

| ID / classe | Guasto dedicato | PASS necessario prima di dichiarare quella proprietà |
|---|---|---|
| R01 D |Restore logico preliminare su clone nuovo e separato, senza password nei dump |Schema/dati/ACL/ruoli applicativi comparati, creator ricostruiti con least privilege, nessuna sovrascrittura dei ruoli gestiti; restore non equivale a HA |
| R02 D |Host power-loss mentre claim/job/save attraversano fsync/COMMIT |Vecchio host fenced, nuove connessioni sospese, ack confermati e catene head/snapshot/receipt integri; RPO/RTO misurati |
| R03 D |Perdita journal/volume e restore di backup vecchio |Nessuna proof ancora valida non registrata accettata; job/kit non riusati; assenza di frontier affidabile mantiene il sistema chiuso |
| R04 D |Secret store vuoto/arretrato con DB corrente e poi DB arretrato |Registro revoche/intents esterno impedisce vecchie credenziali; nuove versioni e binding coerenti, nessun rollback permissivo |
| R05 D |Perdita DB/PITR scelto prima di scritture già confermate |Inventario completo dei COMMIT successivi al backup; restore+replay senza alterare receipt originali, ordine CAS e nonce/job/revoche riconciliati; gap non ricostruibile→NO-GO |
| R06 D |Ritorno dell'host/secret/DB precedente dopo il subentro |Fence reale, nessuna connessione vecchia, nessun kit/grant reanimato; gate di readiness nega le generazioni precedenti |

R01 deve essere autorizzato e superato **prima** delle modifiche al primo staging
condiviso. R02–R06 sono una campagna ulteriore: non inclusa automaticamente in R01.
Ogni clone ha ref/host/volumi/prefix propri, nessun secret del servizio condiviso,
quota e scadenza. Il test non provoca fault a Auth/Storage/Realtime di piattaforma.
Restore è distruttivo sul clone scelto e mai autorizzato dalla sola voce «backup».

Per R05 l'audit compatto6A.5 e un registro delle revoche non sono un export dei
payload: non bastano per ricostruire checkpoint persi. Occorre una fonte completa
e verificata dei dati post-backup oppure una diversa politica RPO esplicitamente
accettata dalla Regia. Finché manca, la proprietà restaNOT VERIFIED e il sistema
non riapre scritture dopo restore con perdita di conferme. Nessuna cancellazione,
rinumerazione revisioni o riscrittura digest per far tornare verde la prova.

## Client e gate successivi

Browser iniziale Chromium fissato; Firefox/Safari/mobile, eviction IndexedDB,
profilo persistente e crash OS/browser richiedono campagna client successiva.
In6A.11 il SIGKILL Chromium prova integrità del Save committato, non durabilità
della chiave in incognito. Non convertire reload riuscito in resistenza XSS/OS.
Matrice R1 visuale/prestazionale completa restaNOT VERIFIED; nessun hydrate,
autosave/offline/outbox o funzionalità6B viene collaudato o introdotto qui.
