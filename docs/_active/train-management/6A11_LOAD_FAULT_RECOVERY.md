# 6A.11 — Carico, multiistanza e recovery

Perimetro supportato: un solo broker fidato D09=A su PostgreSQL17 isolato.
[Campioni e log per profilo](evidence/6A11/load-profiles.json),
[derivazione numerica](evidence/6A11/load-summary.json),
[metriche HTTP](evidence/6A11/metrics.json),
[log broker/pool](evidence/6A11/broker-audit.json).
I tempi HTTP sono wall time Playwright/loopback e includono orchestrazione test;
non sono SLO o capacità produttiva. Nessun test di throughput prolungato.

## Tre profili distinti

La tabella numerica finale è in [load-summary.json](evidence/6A11/load-summary.json).
Ogni record conserva status, latenza e workspace per richiesta; gli eventi del
pool conservano queued/open/waitMs/rejected/timeouts/evictions, il campione SQL
raggruppa le connessioni effettive per application_name in pg_stat_activity.

| Profilo | Traffico e precondizioni | Oracolo e risultato |
|---|---|---|
| Ordinario |12batch×2letture C/D, concorrenza2, nessun lock/fault |24/24 HTTP200;2connessioni SQL; nessuna stima produttiva |
| Picco singolo |96richieste con16principal già caldi, C bloccato dal supervisore per1.5s; D intercalato |PG peak16, queued≤64;83HTTP200/13HTTP503 nel primo run completo; D6successi; conteggi finali nel JSON, possono variare per scheduling |
| Doppio diagnostico |2processi Node/pool indipendenti,16richieste ciascuno, lock C/D2.7s |32connessioni SQL effettive,16per application_name; cap globale16 FAIL, limite locale rispettato; nessun PASS globale |

Misure del run finale (ms e KiB RSS):

| Profilo |200/503 |p50/p95 HTTP |Picco PG |Coda/wait max |RSS broker / ingresso |
|---|---|---|---|---|---|
|Ordinario |24/0 |14.20/51.97ms |2 |1/32.86ms |76352/66500KiB |
|Picco singolo, lock1.5s |83/13 |1700.92/1933.72ms |16 |64/1707.62ms |80128/74276KiB |
|Doppio, lock2.7s |32/0 |2634.49/2731.77ms |32 |Non misurata globalmente |89108+75580/75956KiB |

Per il doppio gli eventi nel profilo sono del secondario e includono anche la
precedente gara sullo stesso nonce: queue/wait e denial log non sono statistiche
aggregate del batch32. Il log completo del primario è conservato separatamente.
La latenza del batch32 usa solo i suoi32campioni. Nessun throughput/SLO derivato.

Il secondo broker è un **secondo processo Node nel container privato esistente**,
con PID/socket/application_name/pool propri e stesso UID/cgroup/volumi. Non è una
seconda macchina o una prova di isolamento fra broker. Si alterna la destinazione
socket attraverso config pubblica **operatore**, non da input del client. Prima
si osservano16backend del primo in attesa sul lock, poi16del secondo. Il nodo
primario e quello secondario non condividono il loro contatore del pool.

Una prova separata nello stesso profilo manda **la stessa proof** simultaneamente
ai due socket e osserva due backend distinti in attesa: un200, un409REPLAY,
esattamente una riga nonce committata. Sicurezza replay PASS, cap aggregato FAIL.
Il processo secondario viene terminato e si osservano zero sue sessioni SQL prima
di tornare al socket primario. Nessun coordinatore o privilegio aggiunto.

Le risorse sono campionate via /proc e pg_stat_activity: RSS primario/secondario
sommato sotto256MiB nel test; ingresso separato sotto256MiB. Non è memoria fisica
unica/cgroup peak, né memoria PostgreSQL o limite host. I valori effettivi, PID e
backend sono conservati nel JSON. Spike con lock artificiali e ordinario restano
separati anche nel calcolo p95. Fairness dimostrata come progresso di D con C
bloccato e alternanza delle lease eleggibili; nessuna garanzia di latenza per ogni
workspace o fairness distribuita.

La suite verifica inoltre davvero idle30s (attesa31s), LRU idle e riconnessione
con lo stesso principal, code piene503,4timeout di coda2s nel test dedicato,
chiusura/discard su errore e credenziale ritirata, graceful shutdown→zero sessioni.
Niente SET ROLE o connessione condivisa fra principal/versioni. I contatori dei
log sono cumulativi: non interpretarli come incremento di ogni singolo profilo.

## Fail-closed operativo proposto

Il launcher del nuovo laboratorio rifiuta `--replicas 2` **prima** di creare
risorse: [prova](evidence/6A11/unsupported-multi-plan.txt). La diagnostica doppia è
esplicita nella suite e non abilita supporto operativo. Il launcher non coordina
altri processi o un database condiviso, né impedisce un avvio manuale esterno.

Per un futuro ambiente: manifest/orchestratore deve permettere una replica sola,
stop ingress/drain o503 durante sostituzione; terminare/fence il vecchio broker,
verificare zero suoi backend SQL, poi avviare il nuovo con DB/journal/store
conservati. In dubbio mantenere ingresso chiuso, senza overlap o fallback RAM.
Il restart effettivo del test verifica zero vecchie sessioni prima del nuovo
PID. L'enforcement di tale policy su hosting, l'esclusione di doppio deploy e il
budget totale degli altri servizi **NOT VERIFIED**. Multi-broker bloccato fino a
nuova decisione/gate; nessun lock globale «simulato» dalla guardia del launcher.

## Fault matrix

Tutte le righe PASS sotto sono prove reali del laboratorio; HTTP usa il vero
ingresso/broker, non un mock. Hook e trigger di fixture stabiliscono soltanto il
punto del guasto; transazioni, segnali, rete, permessi e risposte sono reali.
[Before/after e observed](evidence/6A11/results.json),
[fault SQL strutturali](evidence/6A11/ownerless-sql.json).

| Fault | Confine e osservazione | Stato/recovery | Esito |
|---|---|---|---|
| Broker SIGKILL |SegnaleKILL container, PID cambiato; vecchie sessioni0 prima di start |Nonce committato ancoraREPLAY; nessun fallback RAM |PASS processo |
| Ingresso restart |PID cambiato, stessa porta/origin; header408 e successivo read valido |CryptoKey già memorizzata ancora utilizzabile, nonceSQL non perso; rate RAM locale riparte |PASS processo |
| Claim ack perso |Dopo claim COMMIT, prima DATA,503 |Stessa proof409, nessuna read/write dati; nuovo nonce necessario |PASS |
| Ack HTTP perso |Abort browser dopo dataCOMMIT, prima consegna |Stesso request_id/envelope e nonce nuovo stessa receipt anche dopo head avanzato/quota piena |PASS |
| Save timeout |statement_timeout4s durante operazioneSQL |503error-only; INSERT snapshot/head/receipt rollback, claim resta |PASS |
| Backend terminato |pg_terminate_backend dopo INSERT snapshot prima COMMIT |503, nessuno snapshot/receipt parziale; stato confermato intatto |PASS |
| Rete SQL interrotta |Broker disconnesso dalla rete SQL della fixture |503, niente fallback; rete ripristinata fuori banda, prova positiva successiva |PASS indisponibilità, non DB-loss |
| Activation interrotta |KILL broker dopo redeem COMMIT e poi dopo activation COMMIT prima ack |JobACTIVATING ripreso202→ACTIVE200, binding1, vecchia proofREPLAY |PASS processo/store conservato |
| Rotation interrotta |KILL duranteACTIVATING, poi vecchia connessione ferma dopo claim |Stesso job ripreso, nuovo grant, vecchioNOLOGIN e403; receipt storica identica |PASS processo/store conservato |
| Secret adapter assente |Rename temporaneo config; richiesta su connessione già calda |503, nessun dato; stesso file ripristinato e read positivo |PASS indisponibilità, non perdita store |
| Journal illeggibile |chmod000 nella sola fixture |Lifecycle503/jobAPPROVED, dati già attivi indipendenti; restore700 |PASS indisponibilità, non perdita journal |
| Revoca concorrente |Save e9read sospesi dopo claim, revocaCOMMIT prima di rilascio |403/error-only, nessuna nuova operazione dopo revoca; vecchie letture già committate non annullabili |PASS |
| Snapshot corrotto |Nuova riga orphan999 a digest falso, nessun UPDATE storico |422, head confermato intatto; browser nega anche risposta alterata |PASS |
| Constraint/deferred/DDL |SQL185:6substep Save, deferred FK, kill/timeout,14punti DDL |Rollback completo dati/catalogo/ruoli; NULL/domain FK distinti daACL |PASS |
| Chromium SIGKILL |Vero processo browser terminato dopo Save COMMIT; eseguito anche nella regressione6A.6 |Una receipt, revisione intera, snapshot verificabile; nessun claim di durabilità key dopo crash incognito |PASS processo; key crash NOT VERIFIED |

Non sono prove di perdita host/volume/database. Il backup/restore logico di un
clone locale è PASS solo per il rehearsal prima delle scritture successive:
[manifest dump](evidence/6A11/backup-manifest.json), inventory-restored e SQL185.
Recovery dopo crash host/store loss o restore che arretra claim/job/receipt,
PITR e replay delle scritture successive rimangono NOT VERIFIED. Nessun ripristino
ha cancellato o riscritto dati della primaria per far tornare verde il test.
