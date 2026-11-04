# 6A.7 — Architecture Decision Gate: D09

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Stato: raccomandazione alla Regia, **non decisione approvata né autorizzazione attuativa**. Solo documentazione. Repository `epivic-lab/SerieN`, branch `feature/train-management`, base verificata `5d65a32ff392dabf7e57c040981598f5af398e05`, R1 immutabile `348bfeff12c4005657098d89ea1d3c2ccdda9910`. La Regia attesta approvata la prova tecnica 6A.6, non la chiusura 6A. Questa autorizzazione supera gli STOP storici solo per la progettazione 6A.7.

## 1. Raccomandazione unica D09

**Adottare A: principal SQL distinto per dispositivo/versione di grant, backend persistente con broker verificatore privato e pool applicativo limitato globalmente.** Connessione direct TLS come percorso iniziale; Supavisor session solo alternativa per rete IPv4, subordinata a prove dedicate. Nessun pool universale, `SET ROLE` o workspace in GUC come autorità. Nessuna adozione automatica del transaction pooler.

È il percorso meno invasivo perché mantiene `session_user`, `worker_bindings`, `device_bindings`, RLS e le sei API private già collaudate. Il numero di ruoli cresce con i grant; il numero di backend deve invece essere limitato e indipendente dal numero di dispositivi registrati. Sono due costi diversi. Un dispositivo inattivo non conserva una connessione.

Il broker è una separazione di privilegi del backend esistente da specificare e implementare in una fase autorizzata: riusa verificatore P-256, parser e adapter; non richiede una nuova piattaforma, identità Auth cliente, servizio IAM o algoritmo crittografico. La separazione deve essere effettiva a livello di processo/identità di servizio, accesso ai segreti e rete, non due classi nello stesso processo. All'inizio una sola istanza persistente con backpressure esplicita; scalare repliche richiede budget connessioni aggregato e prove di replay condiviso.

**Rischio accettabile solo previa approvazione:** il broker che possiede credenziali SQL può impersonare i device di cui dispone. Il DB verifica il principal e la capacità corrente, **non la firma browser**. Una compromissione del broker/secret store o dell'operatore resta un compromesso del relativo dominio. A non fornisce resistenza crittografica a un broker malevolo. Se la Regia richiede quella proprietà, questa raccomandazione va respinta e B deve superare prima una prova di fattibilità crittografica; non si sostituisce silenziosamente A con una GUC.

## 2. Base approvata e invarianti

Fonti: [gate 6A.6](6A_INTEGRATION_GATE.md), [contratto integrato](6A6_INTEGRATION.md), [risultati](evidence/6A6/results.json), [riepilogo](evidence/6A6/summary.md), contratti [6A.1](6A1_CONTRACT.md), [6A.2](6A2_PROTOTYPE.md), [6A.3](6A3_SCHEMA.md), [6A.4](6A4_TRANSACTIONS.md), [6A.5](6A5_HISTORY.md). Analizzati anche gateway/transport, SQL 6A.3–6A.5 e le due baseline SQL storiche.

- D01–D08 restano vincolanti. Nessuna modifica a DTO, limiti flotta, STOPPED, freeze/resume, Journey, orientamenti, asset o topologia. Il testo R0 integrale e la formulazione integrale D01–D08 non sono nel checkout: si preservano i contratti approvati senza ricostruire o rinumerare decisioni mancanti. Confronto integrale riservato alla Regia.
- [R0 P01–P18](R0_ACCEPTANCE_MAPPING.md) e relativi esiti nel gate 6A.6 sono immutati. I P01–P17 interni a 6A.1 non sostituiscono gli ID R0.
- Nessun login cliente, shadow user, chiave SQL o privilegiata nel browser, accesso pubblico ai dati o SQL arbitrario HTTP. CORS, UUID, hash e publishable key non autorizzano.
- Il validatore resta il profilo sintetico chiuso `jcs-profile-v1`: train+loose fissi, variazioni solo stateId/day/otto booleani. Non è un serializer generale o il validatore del simulatore.
- Snapshot/proiezioni/head/ricevuta atomici; CAS; deduplica workspace/request_id prima del CAS; retry con nuovo nonce e stesso envelope; recovery crea una revisione. Nessuna modifica a queste semantiche.

## 3. Opzioni confrontate

### A — Login SQL per dispositivo

Autorizzazione: il broker verifica la proof effettiva P-256 e usa un binding amministrativo immutabile `(workspace, device, epoch, key_version, workspace_epoch) → principal/versione secret`. Il DB deriva l'identità da `session_user`, ricontrolla registro, scope, expiry e revoca sotto i lock workspace→device→head. RLS e FK rimangono indipendenti dal workspace proposto dal client. `current_user` cambia nel definer; `session_user` non va sostituito con esso.

Provisioning e rotazione richiedono ruoli/credenziali forti, inventario e cleanup. Le credenziali non sono la CryptoKey browser e non hanno lo stesso lifecycle. Il furto di una password SQL aggira la firma se consente una connessione: limitarne rete, segreti e privilegi è parte della sicurezza. Password change/NOLOGIN impediscono nuove connessioni, non revocano i backend già aperti: il controllo autoritativo DB resta obbligatorio a ogni transazione.

Non è sicura se il worker ha CREATEROLE, proprietà tabelle, BYPASSRLS, gruppi ereditati aggiuntivi, grant raw o accesso al socket Docker. Non è sostenibile se ogni device conserva indefinitamente un backend o ogni replica crea il proprio pool illimitato.

### B — Pool limitato, verifica indipendente della capacità nel DB

Per offrire questa proprietà il DB deve verificare **la proof browser originale**, non un booleano del gateway. Ingresso SQL privato unico con wire versionato: dominio/audience/metodo/path/operation/workspace/layout/device/key/epoch/request_id/nonce/issuedAt/bodyDigest, firma P1363, corpo reale. Il DB deve ricalcolare la canonicalizzazione e il digest, validare la curva/chiave e la firma P-256, derivare scope dal registro privato e consumare il nonce con unicità atomica. Controlla epoch, expiry, revoca e layout sotto gli stessi coordinatori della transazione dati.

Un ruolo pool EXECUTE-only, senza DML o helper di contesto accessibili, chiama il solo entrypoint verificatore. RLS usa un contesto verificato non scrivibile dal ruolo pool: ad esempio record privato per transazione/backend, creato esclusivamente dal verificatore, cancellato/fuori validità al termine, con controllo di identità transazione e operazione. Nessun `SET LOCAL workspace_id` considerato prova. Nessun contesto valido nella transazione successiva, in un'altra connessione o dopo errore. Revocare l'EXECUTE diretto alle vecchie API/helper che potrebbero saltare il verificatore è indispensabile.

Il nonce deve essere prenotato durevolmente prima della transazione che può fallire, oppure un protocollo separato deve impedire il riuso dopo rollback. Un INSERT nonce che viene annullato insieme al save non dimostra consumo permanente. Handle di prenotazione legato a tutti i campi firmati, uso controllato e retry applicativo con nuovo nonce; non un bearer riutilizzabile per altro corpo. Cleanup dopo finestra proof+skew, non prima.

**Fattibilità non dimostrata:** pgcrypto documenta hash/HMAC e cifratura, non un verificatore WebCrypto P-256/P1363/JCS pronto per questo protocollo. pgsodium è sconsigliato per nuovi usi da Supabase [S07]; algoritmi diversi non verificano automaticamente le chiavi P-256 approvate. Nessuna funzione crypto inventata, codice C personalizzato o estensione installabile sul gestito è assunto disponibile. Una firma server al posto di quella browser sarebbe C. In più il codec SQL approvato è chiuso sul DTO e non un JCS generale per proof arbitrarie: servirebbero vettori e un nuovo contratto.

Se realizzata correttamente, una sola credenziale pool rubata non consente di forgiare nuove proof. Il gateway compromesso può trattenere dati, negare servizio e inoltrare una richiesta valida intercettata, non creare nuove autorizzazioni. Compromissione DB/verificatore, XSS e firma da browser compromesso restano rischi. Maggiori cambiamenti a confine autorizzativo, API e RLS rispetto ad A; nessun PASS attuale per B.

### C — Attestazione server e SQL strettamente privato

Un verificatore privato, separato dall'ingresso pubblico, verifica integralmente proof browser e autorizzazione. Emette un'attestazione chiusa con issuer, audience DB/progetto, versione/kid, workspace/layout/device, scope massimo, device/workspace epoch, key_version, operation, request_id, digest di corpo/envelope, nonce/jti, issuedAt e scadenza breve (proposta ≤30s). Il DB deve autenticarla: ad esempio HMAC-SHA256 su encoding binario/length-prefixed fissato, tramite pgcrypto documentato [PG05], con chiave diversa per ambiente/dominio custodita privatamente. Non è una capacità client né un JWT Auth.

Il worker ha solo EXECUTE sull'entrypoint attestato; non legge la chiave HMAC, non chiama il firmatario senza proof e non accede alle vecchie API. Confronto MAC resistente a timing da progettare/testare, limiti prima della verifica, rotazione kid con sovrapposizione non oltre TTL, scadenza non dipendente dall'orologio client. Il DB ricalcola digest, ricontrolla scope/epoch/revoca attuali e prenota jti/nonce durevolmente, poi usa un contesto privato per transazione come B. Un'attestazione non rende affidabile una GUC impostabile dal ruolo pool.

Se il gateway pubblico contiene la chiave attestante, può impersonare ogni device nell'ambito della chiave: il MAC dimostra solo che il gateway ha firmato. Separare il verificatore limita questo rischio, ma il verificatore compromesso può comunque emettere attestazioni false. Il DB deve limitare ciascun issuer a domini espliciti, vietare DDL, raw DML e API amministrative; non fidarsi dello scope nell'attestazione oltre il registro. Pool limitato e niente ruoli per-device, ma nuovo protocollo, segreti MAC, replay store, entrypoint e RLS da verificare. Il supporto HMAC documentato non prova l'intera architettura. Non raccomandata per questa correzione minima.

### Matrice comparativa

Le qualifiche sono valutazioni progettuali, non benchmark o certificazioni. Costi relativi; nessun preventivo Supabase reale disponibile.

| Criterio | A: principal/device | B: proof browser nel DB | C: attestazione server |
|---|---|---|---|
| Sicurezza | Binding/RLS già provati; broker fidato, rischio furto credenziali | Potenziale separazione dal gateway più forte; crypto/contesto non provati | Dipende da isolamento e integrità del firmatario; MAC non prova browser al DB |
| Complessità | Media: lifecycle ruoli, secret e admission | Alta: P-256, canonicalizzazione, contesto RLS, ingress unico | Medio-alta: firmatario, chiavi, protocollo, contesto RLS |
| Scalabilità | Ruoli O(grant); backend O(cap), churn connessioni | Backend O(cap), verifica crypto DB e lock restano | Backend O(cap), verifica MAC e servizio fidato restano |
| Costo indicativo | Backend persistente, secret/ruoli e nuove connessioni; niente estensione crypto nuova | Sviluppo/audit più alti; CPU DB e staging estensioni | Servizio/identità firmataria e gestione chiavi; sviluppo intermedio |
| Manutenzione | Riusa codice; onere provisioning/retirement | Forte onere crittografico/versionamento | Rotazione attestazioni, issuer, retry e contesto |
| Reversibilità | Fermare percorso nuovo conservando le API e i principal precedenti non revocati | Richiede mantenere due confini verificati o fermare scritture | Richiede mantenere due confini verificati o fermare scritture |
| Impatto approvato | Basso sul nucleo; transport/provisioning/replay da sostituire | Alto su authorize/RLS/firme/ACL e ingress | Alto su authorize/RLS/ACL; proof browser riusabile nel firmatario |
| Evidenza | 72 E2E e regressioni locali al checkpoint; hosting assente | Solo progetto | Solo progetto + primitiva HMAC documentata |

## 4. Specifica operativa minima di A

```text
Browser CryptoKey → HTTPS ingresso pubblico → canale privato autenticato
  → broker: verifica proof originale + ammissione durevole nonce
  → lease pool fissata al principal/device/versione
  → SQL private 6A.5: session_user → binding → authorize/lock → CAS/transazione
  → COMMIT → risposta limitata → verifica browser

Operatore/provisioner separato → manifest approvato → ruoli/secret/binding
  nessun accesso amministrativo dall'ingresso pubblico o dalle API dati
```

### 4.1 Confini e privilegi

| Componente | Permessi ammessi | Esclusioni obbligatorie |
|---|---|---|
| Browser | Firma P-256, richieste consentite, verifica risposta | SQL credentials, service keys, ruoli/DSN, admin API |
| Ingresso pubblico | TLS/limiti/IP, inoltro wire e contesto HTTP effettivo | DB/secrets/Docker; non può scegliere principal o approvare pairing |
| Broker verificatore | Lettura registry pubbliche chiavi tramite API privata minima; pool di device assegnati; claim nonce e sei API | CREATEROLE/BYPASSRLS, catalogo write, raw checkpoint DML, registry mutate |
| Login device | USAGE/EXECUTE delle sole API necessarie; solo membership worker approvata | Membership executor/authorizer, ADMIN/GRANT OPTION, ownership, CREATE/TEMP dove revocabile |
| Executor NOLOGIN | Grant colonna/tabelle minimi già provati, RLS | Ownership tabelle, BYPASSRLS, registry/secret/ruoli mutate |
| Control plane | Sole procedure lifecycle approvate, manifest e audit | SQL arbitrario da HTTP pubblico, dati ferroviari ordinari |
| Provisioner privilegiato | Job operatore revisionato per ruoli/grant e secret | Non esposto HTTP; mai credenziale nel gateway/broker |

Il ruolo authorizer attuale ha DML ampio sul registry: **non va assegnato al broker o a endpoint pubblici**. Un eventuale runtime control-plane deve ricevere solo EXECUTE su procedure nuove con vincoli e lock; le callback amministrative Docker restano fixture. Il provisioning iniziale può essere un job operatore fuori banda, a volume limitato: niente self-service anonimo o infrastruttura IAM nuova. La possibilità di creare/alterare i ruoli necessari con privilegi delegabili sul gestito è un gate staging, non una proprietà dedotta dal postgres locale.

Il broker controlla la firma nuovamente sul wire originale; audience/path/metodo derivano da configurazione e richiesta effettiva, non da header forwarded non autenticati. Cache chiavi indicizzata per key_version; stato capacità sempre ricontrollato dal DB. Il canale ingresso→broker è Unix socket con ACL o mTLS tra identità isolate, nessun listener broker pubblico. Lo stesso ingresso compromesso non ottiene password né può chiedere una lease per device arbitrario senza proof valida. Può intercettare risposte/negare servizio: niente riservatezza end-to-end promessa.

### 4.2 Pool limitato e scelta connessione

Una lease contiene un solo principal/versione; massimo una transazione simultanea per principal, una connessione aperta al massimo per device sul singolo broker iniziale. Lazy-open, LRU solo su connessioni **idle**, TTL idle proposto30s, healthcheck senza rilascio dati, chiusura obbligatoria su errore/timeout o risultato session_user inatteso. Una connessione non si ricicla per altro principal: si chiude e si autentica di nuovo. Query parametrizzate; niente DSN/SQL/ruolo dal payload.

Budget: `C_app <= C_db - C_servizi_peak - C_admin - C_margine`, includendo tutti i backend direct/pooler e le repliche. Valori reali del tier e picco servizi vanno rilevati in staging. Esempio puramente dimensionale: se il budget applicativo approvato fosse16 e ci fossero1000 device registrati, il broker terrebbe ≤16 backend; altri device attendono o ricevono503, non acquisiscono un ruolo condiviso. Proposta di prova: coda globale64, attesa lease≤2s, fairness per workspace, nessuna coda illimitata. Cap finale subordinato a carico e SLO approvati; 16/64/2s/30s non sono quote Supabase garantite.

Ruoli registrati e password restano O(device×versioni non ritirate); il cap non risolve il costo del catalogo, provisioning e rotazione. Apertura connessioni frequente può dominare la latenza; se fallisce il budget, ridurre ammissione/carico o riaprire D09, non moltiplicare pool per replica. Il coordinatore workspace serializza anche read: resta invariato finché una misura non autorizza una modifica.

Direct TLS è adatto al backend persistente [S01]; usare verifica CA+hostname equivalente a `verify-full`, no fallback plaintext/`rejectUnauthorized:false` [S04/PG04]. Credenziali per servizio, endpoint allowlist e rete limitata ai broker/operatori. TLS, ACL e firewall proteggono accesso e trasporto: non sostituiscono authorize. La configurazione reale non è stata letta o cambiata.

Supavisor session è solo fallback IPv4: provare custom login, `session_user` dentro/fuori definer, isolamento per principal, connessioni calde, rotation/cache credenziali e limiti aggregati. Non ricavare la dimensione totale moltiplicando ingenuamente un pool-size per numero utenti, né assumere che il pooler unisca identità diverse. Transaction mode non mantiene stato di sessione e non supporta prepared statement secondo S01: nessuna sua adozione prima di una prova specifica con lo stesso ruolo e una transazione intera sullo stesso backend. Non passare automaticamente al login postgres se un custom role fallisce.

### 4.3 Lifecycle, replay e gestione crash

1. Manifest operatore immutabile: workspace/device/fingerprint/scope/epoch/key_version/principal/versione secret, approvatore e job ID. Identificatori SQL generati dal provisioner, non input SQL client. Validare ACL/grant effettivi, default privileges di ogni creator, role memberships e ownership prima di attivare.
2. Prepare: generare password casuale in secret store, creare principal **NOLOGIN** e binding non attivo; non concedere dati prima della prova di possesso/approvazione. Journal di job durevole coordina DB e secret store (non sono una transazione unica). Stato orfano rimane inutilizzabile; il retry del job non crea un secondo grant.
3. Activate: consumo ticket key-bound + registro device/coordinatori/binding e attivazione del principal sotto controllo operatore, con risultato di attivazione durevole. Pubblicare ack solo dopo commit. Per ack perso usare nuova proof della chiave candidata e rileggere l'esito dello stesso job; mai riutilizzare token per un'altra chiave. API operative pairing/recovery richiedono procedure dedicate, non DML authorizer generico.
4. Nonce: riusare `replay_nonces`, con nuova API privata minimale che deriva device dal principal e valida scope/epoch/expiry; INSERT unico `(device_id,nonce)` **in autocommit prima** della transazione dati. Proof TTL±120s e conservazione almeno5min; cancellare solo quando non può più passare la finestra temporale. Broker verifica firma prima del claim; DB non pretende di verificarla. Claim già committato sopravvive a rollback/save fallito, restart e due broker. Nessun ripiego sul solo set RAM. Consumi e dinieghi vanno limitati e auditati separatamente, senza firme/token nei log.
5. Crash dopo claim/prima save: retry con nuova proof e stesso request_id/envelope. Crash dopo commit dati/prima risposta: nuova proof restituisce stessa ricevuta. Il DB rilegge revoca anche dopo un claim valido. La reservation non concede accesso se epoch o scope cambiano.
6. Revoca: transazione autoritativa coordinata workspace→device; poi invalida cache/lease, drena/chiude connessioni del principal e disabilita LOGIN. Il diniego dati dipende già dal commit del registro, non dall'arrivo del messaggio di invalidazione. Save/read linearizzate prima possono completare; nessuna nuova dopo. Non rimappare mai un vecchio principal a un altro device.
7. Rotazione password SQL: nuovo principal/versione secret per lo **stesso** device e medesimi epoch/key; verificare connessione, switch di lease, NOLOGIN/drain del vecchio, retirement dopo inventario sessioni e dipendenze. Sovrapposizione breve solo per rotazione ordinaria; credenziale sospetta impone revoca autoritativa/epoch e sospensione, non overlap fidato. Nessun rollback che riabiliti credenziali compromesse.
8. Rotazione CryptoKey: protocollo prepare/confirm della 6A.1, prova vecchia+nuova chiave, epoch/key_version nuovi e nuovi binding/principal, esito durevole consultabile dalla nuova chiave se ack perso. I receipt storici conservano auth_context originale. Il retry di un salvataggio dello stesso device confronta il contratto storico, senza riscrivere ricevute; il comportamento attraverso cambio epoch è da testare. Recovery totale crea nuovo device: nessun accesso automatico a ricevute private del vecchio attore.
9. Recovery kit: verifier versionato, consumo+revoca vecchi device/inviti+nuova registrazione atomici; preparare il nuovo principal inerte prima della transazione. Job ritentabile e cerimonia di consegna/conferma del kit offline da completare prima di servizio. Non equiparare il ticket RAM10min al kit definitivo. Nessun recovery via solo nome/workspaceId.

## 5. Evidenze e gate

| Proprietà | Dimostrata in 6A.6 | Confermata dalla documentazione | Da provare separatamente |
|---|---|---|---|
| Login distinti e authorize/RLS | Sì: session_user reale, read/write, A/B, scope, revoca/expiry/epoch | Ruoli custom, RLS e invoker/definer [S03/S05/S06/PG01/PG02] | Password/TLS e privilegi effettivi gestiti |
| Connessioni | Un psql persistente per principal, coda seriale | Direct/session/transaction, client vs backend limits [S01/S02] | Cap/LRU/fairness/churn, tier/costo, custom-role pooler |
| Replay | Set RAM monoproc­esso, TTL | Unicità SQL/transazioni [PG01] | Claim durevole e due istanze/restart |
| Provisioning/rotazione | Supervisore Docker sintetico, non servizio | CREATE ROLE e credenziali servizio [S03/PG03] | Delegabilità, secret store, crash e cleanup |
| Privati/default ACL | API private e zero raw grant nel lab | Default EXECUTE PUBLIC; creator ACL e Data API [S05/S08/PG02] | Catalogo/grant/esposizione effettivi staging |
| Ownerless | No, tutte le fixture dipendono da owner legacy | FK NULL/CHECK/azioni referenziali [PG01] | [D10](6A7_OWNERLESS_CUTOVER.md), dataset misto e zero Auth |

[Matrice rischi/evidenze](6A7_RISKS_AND_EVIDENCE.md) e [piano di esecuzione](6A7_EXECUTION_PLAN.md) fissano i PASS obbligatori. Nessuna prova futura sopra è eseguita in 6A.7. Raccomandazione A non è un PASS hosting. Occorrono approvazione D09, D10, rischio broker, limiti/SLO e autorizzazioni isolate/staging specifiche. Se il provisioning a privilegio limitato o il costo non risultano sostenibili, **FAIL bloccante**, ritorno alla Regia senza fallback amministrativo.

## 6. Fonti pubbliche consultate il 4 novembre 2026

Supabase consultato tramite `search_docs`, senza accesso a progetti/account. Pagina PostgreSQL via sorgenti ufficiali `REL_17_STABLE` su GitHub: il fetch HTTPS dei siti Supabase/PostgreSQL e del changelog riceve403 dal proxy dell'ambiente. Nessun aggiramento del proxy. Il changelog completo rimane **NOT VERIFIED**; S08 segnala il cambiamento dei default grant, per cui il piano impone inventario ACL effettivo e non assume alcun default.

| ID | Fonte | Uso |
|---|---|---|
| S01 | [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) | Direct IPv6/IPv4 add-on, session5432, transaction6543, prepared statement, limiti client/backend |
| S02 | [Connection management](https://supabase.com/docs/guides/database/connection-management) | Riserva per servizi, pool e monitoraggio; percentuali indicative non sono budget del progetto |
| S03 | [Postgres roles](https://supabase.com/docs/guides/database/postgres/roles) | Custom LOGIN, credenziali per servizio, privilegi e ruoli gestiti |
| S04 | [Postgres SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement) | CA/hostname, verify-full; enforcement non assunto attivo |
| S05 | [Database functions](https://supabase.com/docs/guides/database/functions) | Definer/invoker, search_path, EXECUTE e default privileges |
| S06 | [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | RLS distinta dai grant, USING/WITH CHECK, bypass |
| S07 | [pgsodium, pending deprecation](https://supabase.com/docs/guides/database/extensions/pgsodium) | Nessun nuovo uso raccomandato; non fondare B su disponibilità implicita |
| S08 | [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) | Schemi non esposti, grant/default ACL, possibilità di disabilitare Data API in futuro |
| PG01 | [PostgreSQL17 DDL](https://www.postgresql.org/docs/17/ddl.html), [sorgente ufficiale](https://github.com/postgres/postgres/blob/REL_17_STABLE/doc/src/sgml/ddl.sgml) | CHECK NULL, MATCH SIMPLE/FULL, NOT NULL, FK/cascade e RLS |
| PG02 | [CREATE FUNCTION17](https://www.postgresql.org/docs/17/sql-createfunction.html), [sorgente](https://github.com/postgres/postgres/blob/REL_17_STABLE/doc/src/sgml/ref/create_function.sgml) | Definer non implica bypass per ogni owner; search_path/temp schema, EXECUTE PUBLIC, ACL atomiche |
| PG03 | [Database roles17](https://www.postgresql.org/docs/17/user-manag.html), [sorgente](https://github.com/postgres/postgres/blob/REL_17_STABLE/doc/src/sgml/user-manag.sgml) | LOGIN, membership e limiti privilegio |
| PG04 | [libpq SSL17](https://www.postgresql.org/docs/17/libpq-ssl.html), [sorgente](https://github.com/postgres/postgres/blob/REL_17_STABLE/doc/src/sgml/libpq.sgml) | Verifica certificato e hostname |
| PG05 | [pgcrypto17](https://www.postgresql.org/docs/17/pgcrypto.html), [sorgente](https://github.com/postgres/postgres/blob/REL_17_STABLE/doc/src/sgml/pgcrypto.sgml) | HMAC documentato; nessun verificatore P-256/P1363 dedotto dalla cifratura PGP |

Non sono stati letti connessioni, chiavi, password, tier o configurazioni del Supabase reale. Le fonti confermano primitive e modalità, non certificano la configurazione del progetto.
