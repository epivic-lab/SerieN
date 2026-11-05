# 6A.12-P — Provisioning, segreti e lifecycle

**Progetto operativo futuro, non implementazione.** Base e fonti nel
[readiness](6A12_STAGING_READINESS.md); D09/D10 e SQL approvati invariati.
L'adapter `/secrets/config.json` e il journal6A.9 sono soltanto laboratorio.

## Separazione delle identità

| Identità | Permesso previsto | Esclusioni |
|---|---|---|
| Browser/ingresso |Proof P-256 e inoltro wire; ingresso ha solo identità TLS del canale |SQL/secret store/provisioning/registro revoche/Docker |
| Broker |Secret di device/versioni e redeemer assegnati; binding privato approvato; claim e API |CREATEROLE, owner oggetti, BYPASSRLS, prepare/approve/complete generici, secret amministrativi |
| Agente secret host A |Identità macchina temporanea, Get delle sole risorse staging assegnate, verifica manifest |Scrittura versioni, revoca/rollback, wildcard su altri ambienti; credenziali mai al processo pubblico |
| Control approver fuori banda |Procedure6A.8 per workspace/ceiling approvati |Data-plane e DDL; nessun authorizer DML ampio |
| Provisioner API |Complete/read/transition dei job assegnati |Non crea ruoli, non imposta password o LOGIN; questo è già il contratto6A.8 |
| Operatore DDL |Cerimonia separata per creare/alterare principal inerti e attivare col job |Non gira sul broker/ingresso; accesso MFA, temporaneo, per target staging approvato |
| Custode secret/revoche |Pubblica versioni/manifest, registra intent ed esiti; backup verificabile |Non approva scope o chiavi per conto del browser; niente accesso indiscriminato al dato storico |
| Osservatore |Contatori/sessioni/inventory minimi per fencing |Nessuna password/hash/query text; non termina servizi Supabase |

Nell'opzione A, instance profile temporaneo è custodito dall'agente host isolato;
IMDS bloccato a ingress e processi dati, accesso IPC solo al PID/cgroup autorizzato.
Non basta assegnare la stessa IAM role a una VM: H01 consente di riusarla altrove.
Nell'opzione B, subject OIDC esatto del private service, senza wildcard di workspace;
service ingresso e build non hanno autorità di leggere i secret del broker.
Un file protetto tmpfs può essere un canale transitorio verso un tool operatore,
non il sistema di verità o un backup di password. Niente password in argv/env dump,
Git, telemetry, screenshot, SQL trace o log del provider.

## Percorso DDL: fattibilità, non privilegio presunto

Il gruppo SQL `serien_tm_provisioner` è NOCREATEROLE e chiama solo le API approvate.
CREATE ROLE/ALTER ROLE richiedono un attore distinto. D09 permette inizialmente
un job operatore fuori banda, manuale a basso volume. Un eventuale `postgres`
gestito si usa **solo** nell'ambiente amministrativo di migrazione/DDL autorizzato,
mai come identità del broker, per risolvere un diniego dati o come fallback.

Prima del primo job, provare custom role NOLOGIN, password SCRAM, sola membership
worker senza ADMIN OPTION, ownership nulla e safe_device_role. Verificare anche
le opzioni INHERIT/SET di PG17 e privilegi PUBLIC effettivi, non solo i grant diretti.
NOINHERIT non impedisce da solo una membership o un SET ROLE autorizzato.
Il creator può acquisire diritti di amministrazione sul ruolo creato: inventariare
anche tali archi, non confonderli con un grant del device verso l'operatore.

La documentazione S05/S06 non garantisce che ogni attributo, ALTER OWNER o delega
ristretta al namespace sia disponibile. Se il ruolo operatore consentito non può
eseguire esattamente il DDL necessario, fermarsi: **ARCHITECTURE BLOCKED** per quel
percorso. Non assegnare CREATEROLE/pg_signal_backend al data plane e non creare
una funzione definer amministrativa generica per aggirare il diniego.
Un'eventuale automazione DDL con wrapper chiusi richiederebbe specifica, review e
autorizzazione distinta; non è una modifica già approvata alle migrazioni.
Se solo l'operatore manuale è praticabile, la Regia deve accettare esplicitamente
staging a provisioning manuale e relativa disponibilità, senza dichiarare completa
una delega automatica non provata.

## Secret adapter proposto

Identificatore logico: ambiente/progetto/workspace/device/job/principal/versione.
Password casuale generata server-side, distinta dalla CryptoKey browser. Secret
manager versionato (proposta AWS Secrets Manager), cifratura e ACL per ambiente,
con version ID immutabile e manifest di pubblicazione separato dal valore.
Il nome del secret o il suo label CURRENT non è un'autorizzazione sufficiente.

Il manifest lega esattamente fingerprint, device/scope, workspace/layout,
epoch/key_version/workspace_epoch, principal e versione del secret al job SQL.
Broker riceve soltanto una vista coerente, verifica integrità/versione e rifiuta
versioni mancanti, ritirate o con mismatch. Pool ritira lease della vecchia versione;
non reimpiega una connessione per un principal diverso. SQL rilegge sempre il
grant corrente: la cache non concede diritti oltre il database.

Indisponibilità/timeout del secret store o del controllo di revoca: fail-closed,
503 senza dati e senza usare una vecchia configurazione «last known good» per
nuove richieste, anche se esiste una connessione calda. Richieste già committate
possono avere esito incerto e si riconciliano tramite receipt. Per limitare il
costo API si può pubblicare una vista in memoria soltanto dopo aver definito e
provato la sua invalidazione; **nessun TTL permissivo viene approvato qui**.
Manifest e conferme di lettura devono avere semantica di consistenza adeguata:
label/versioni tornati indietro o frontier non verificabile impediscono READY.

Il ruolo reader del broker non può ripubblicare versioni precedenti, cambiarne
label, eliminare secret o leggere il prefix amministrativo. Il custode writer è
fuori banda. Dopo compromise, revoca/nuovo epoch prima di qualsiasi rotazione:
mai riattivare una password sospetta in nome della disponibilità.

## Saga del job e confini di commit

Database e secret manager **non sono una transazione unica**. Si riusano stati,
lock e API6A.8, senza introdurre un servizio di coordinamento distribuito.

| Passo | Operazione futura | Fault / ripresa sicura |
|---|---|---|
| Prepare secret |Creare una versione pending per lo stesso job, poi principal NOLOGIN con sola membership worker |Orfano non utilizzabile; retry trova versione/ruolo di quel job, non genera altra identità |
| PREPARED/APPROVED |prepare/approve tramite control limitato, manifest/fingerprint/scope esatti |Mismatch nega; mai dedurre approvazione dal solo possesso di token |
| Redemption |Broker verifica candidato, consuma nonce lifecycle durevole, redeem SQL |ACTIVATING non dà accesso dati; retry con nuova proof allo stesso job |
| Activation |Solo dopo ACTIVATING committato: transazione operatore ALTER LOGIN + complete_device_job, COMMIT |Dati e ACTIVE visibili insieme; se ack COMMIT è perso leggere stato, non ripetere ciecamente DDL |
| Publish |Pubblicare manifest coerente con ACTIVE e secret disponibile |ACTIVE non ancora pubblicato resta indisponibile, non permissivo; riavvio riprende lo stesso job |
| Ack |Risposta200 solo dopo esito SQL confermato e binding pubblicato;202 durante attivazione |Nuova proof stesso job/ticket ottiene stato stabile; nonce identico resta replay |
| Fault permanente |transition_failed_job secondo stato e decisione operatore |FAILED/REVOKED terminali, nessun resume di grant revocato; mantenere tracce |

LOGIN non viene abilitato prima di un lifecycle committato. Durante la transazione
finale può essere impostato prima del SELECT complete, ma entrambi diventano
visibili solo al COMMIT. Questa atomicità con il ruolo gestito va provata: non si
sostituisce con LOGIN anticipato e una promessa di completamento futuro.
Una indisponibilità del secret store dopo SQL ACTIVE sacrifica disponibilità,
non autorizzazione; non comporta la cancellazione di snapshot, receipt o job.

## Revoca e rotazione

Revoca: registrare un intent durevole nel registro operativo esterno, poi revoca
SQL sotto coordinatori approvati; appendere conferma con epoch/job. Intent
incompleto si tratta come sospensione fino a riconciliazione. Ack di revoca solo
quando il percorso dichiarato è durevole. SQL è autoritativo per le operazioni
correnti; il registro esterno serve a impedire un ritorno a uno stato precedente
in recovery. Non sostituisce i controlli SQL o la proof browser.

Il registro append-only di revoche/frontier deve sopravvivere al backup DB cui si
riferisce, con IAM writer distinto e copie/versioni protette. Non viene usato per
assegnare lease ai broker e non è un nuovo coordinatore multiistanza. Persistenza,
ordine intent→SQL→conferma e riconciliazione sono interventi futuri da implementare
e testare: non proprietà del file locale o di S3 assunte per sola documentazione.

Dopo revoca SQL: impedire nuove lease, NOLOGIN del vecchio principal e drain/fence
sessioni. NOLOGIN/password cambiata non terminano quelle già aperte. Vecchi binding
non si rimappano a un altro device. Password rotate ordinaria usa nuovo principal/
versione dello stesso device senza alterare receipt; CryptoKey rotate richiede
vecchia+nuova possessione e gli epoch previsti; recovery kit riservato/consumato
solo dal job approvato revoca i predecessori. Nessun vecchio secret riabilitato
per «rollback». Nel primo staging si usa il percorso ROTATE già approvato
(chiave+principal); una rotazione password-only automatica non è dedotta dalle
API esistenti e richiede specifica/review separata prima di essere supportata.
Il kit offline e il pepper hanno versioni/custodi separati;
cerimonia di consegna non via log o chat e non sostituita da workspaceId.

## Journal lifecycle e perdita dei volumi

Dati: nonce PostgreSQL committato prima della transazione dati, immutato.
Lifecycle candidato:6A.9 usa file esclusivo per hash(device:nonce), fsync file e
directory, retention almeno5min. La durabilità locale già provata riguarda crash
processo **con volume conservato**, non hostloss o restore di una copia vecchia.

Proposta minima: journal su volume cifrato persistente, backup coerente fuori host,
manifest di generazione/hash/orologio, nessuna compressione/GC che accorci la
finestra; restore solo a broker fermo. Backup periodico non significa RPO0.
Se il volume è perso o arretrato, restare fail-closed: riconciliare job/token/
revoche/secret, provare l'assenza di proof ancora valida non registrata. Attendere
un intervallo nominale da solo non basta con clock incerto o job ripristinati.
Eventuale quarantena temporale deve derivare da finestra±120s, retention5min e
ultima generazione affidabile; se tali limiti non sono dimostrabili, invalidare
pending challenge secondo contratto e chiedere una decisione, non ricreare un
journal vuoto e accettare traffico.

Una sostituzione del journal con store durevole sincrono o nuova tabella SQL
richiederebbe specifica e migrazione separatamente approvate; non viene scelta o
implementata qui. Finché il recovery post-loss non passa su clone, nessun claim
di HA/RPO0 e nessun riavvio automatico da backup dopo perdita host.
Il fix Supabase S14 non riconcilia automaticamente i nostri secret/job.

## Retirement e log

NOLOGIN/revoca, zero sessioni, nessun binding attivo o job riprendibile, dipendenze
inventariate, retention/audit approvati: solo allora DROP ROLE mirato. Mai
DROP OWNED/REASSIGN OWNED indiscriminati o cancellazione dei ledger per liberare
quota. Ruoli device non devono possedere oggetti: ownership inattesa è un incidente.
Secret vecchi si ritirano senza rendere recuperabile un grant; mantenere tombstone
non segreto e version frontier per bloccare restore. Cleanup non equivale a
cancellazione dello storico applicativo o reset di un workspace.

Consentiti nei log: ID job/request, principal pseudonimo, evento/esito, conteggi e
tempi. Vietati password/hash/verifier/pepper, kit/token/proof/signature, headerAuth,
SQL statement completi e payload snapshot. Inventariare anche log DDL del provider
e pg_stat_statements/pg_stat_activity: non esportare query text sensibile. Se non
si può escludere una fuga nel percorso di provisioning, è NO-GO, non eccezione.
