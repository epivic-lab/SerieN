# 6A.9 — confini, privilegi e threat model

Base approvata6A.8: `d6aa13001ae10d23b2b3c8c6e45e1dcf8f4e3764`.
D09=A rimane il modello: il broker verifica P-256 ed è fidato. PostgreSQL autorizza
session_user/binding/versioni; non verifica la firma browser. Nessuna modifica
alle migrazioni, D09/D10 o ai sei contratti API approvati.

| Identità | Canale e segreti | Poteri consentiti | Divieti verificati / limite |
|---|---|---|---|
| Browser Chromium | HTTP loopback, CryptoKey P-256 non esportabile in IndexedDB | Firmare solo richieste con la propria chiave; verifica digest snapshot | Nessuna password SQL, chiave privilegiata o API amministrativa; non certifica resistenza XSS/OS |
| Ingresso10001:10009 | Bridge HTTP separato; socket privato660 tramite gruppo; mount IPC e config pubblica | Quattro static path, sei API dati e tre lifecycle; inoltra wire originale | Nessun mount secret/Docker, nessuna rete SQL, nessun principal RPC; socket disponibile solo al gruppo autorizzato |
| Broker10002:10009 | Rete SQL interna, socket privato, CA pubblica e file credenziali privato | Verifica proof, deriva binding, claim COMMIT, API COMMIT; redeem dei job approvati | Nessun CREATEROLE/BYPASSRLS/SET ROLE né modifica catalogo/capacità; compromissione del broker resta compromissione del suo dominio |
| Principal dispositivo/versione | SCRAM, TLS CA/hostname, una connessione fissa per principal/versione | EXECUTE delle API autorizzate e claim_nonce | Raw SELECT snapshot/capacità, UPDATE autorità, CREATE ROLE e SET ROLE authorizer negati |
| Principal redeemer per workspace | Stesso pool/cap e TLS; credenziale distinta dal dispositivo | read_device_job, redeem_device_job con ceiling SQL | Non prepara/approva/finalizza job né crea LOGIN; ceiling editor nega job owner |
| Operatore fixture fuori banda | Supervisor host/Docker/local psql; mai accessibile via HTTP | Crea NOLOGIN con password, prepara/approva, LOGIN+complete in transazione, configura test | È privilegiato nel solo laboratorio e non è un modello di provisioner gestito certificato |
| Executor SQL definer | Funzioni approvate, NOBYPASSRLS, non proprietario tabelle | Grant colonna/RLS già6A.8; session_user rimane il dispositivo | Trigger fixture osserva session_user dispositivo e current_user serien_tm_executor |
| UID estraneo10004 | Nessuna appartenenza al gruppo IPC | Nessuno | Connessione al socket EACCES; secret e Docker assenti |

La configurazione privata è una manifestazione **operatore**, non un input del
browser: dispositivo, chiave, workspace/layout, principal/versione e scope devono
corrispondere ai job preparati. Il server SQL ricontrolla autorità attuale. Una
manifestazione erroneamente associata al principal di B non permette accesso A.
Il broker non fa DDL e non approva nuovi domini. Il redeemer è distinto dal control
e dal provisioner; il supervisor conferma LOGIN e ACTIVE nello stesso commit.

Il pool applicativo non usa pg.Pool: apertura lazy, cap16 complessivo per processo
inclusi redeemer, coda64, attesa2s, idle30s, una lease alla volta per connessione,
LRU solo idle, alternanza workspace fra richieste eleggibili. Ogni connessione
controlla session_user all'apertura e ogni transazione; niente cambio ruolo.
Errori chiudono la connessione, manifest/versioni rimosse ritirano connessioni idle
e quelle attive al rilascio; revoche SQL negano la richiesta successiva anche su
sessione aperta. La chiusura precede la liberazione dello slot nel cap.
L'ingresso limita body2MiB, risposta256KiB, 256 connessioni, header5s/body15s,
1000 richieste/IP e2000 aggregate/60s con massimo1024 soggetti. Sono valori di
laboratorio:256 lascia spazio ai keepalive dei contesti Chromium e al batch96.
Il broker limita RPC4.4MB/128connessioni e attesa hook12s; SQL statement4s/lock3s.

| Minaccia | Mitigazione e prova reale | Rischio residuo |
|---|---|---|
| Proof contraffatta/manomessa, replay | Parsing JSON chiuso, P-256, digest, method/path/audience/tempo/nonce/epoch; SQL claim separato prima dei dati; restart e secondo processo | Broker fidato; API SQL immutate non impongono da sole l'ordine claim/dati |
| Furto ticket o escalation pairing | Job/chiave approvati, proof candidato, ticket hash, ceiling SQL; old-key possession nella rotazione | Browser compromesso può usare la sua chiave; distribuzione inviti reale non certificata |
| Candidato non ancora SQL LOGIN | Job monouso SQL e journal lifecycle esclusivo/fsynced sul volume privato | Non è claim_nonce dati; crash host, perdita volume e filesystem distribuito NOT VERIFIED |
| Confusione workspace/principal/sessione | Derivazione privata, identità fissa, SQL binding; A→B e binding sbagliato negati | Broker compromesso dispone delle credenziali dei domini assegnati |
| Risposta persa/commit parziale | Due COMMIT confermati; request_id idempotente, nonce nuovo; kill/timeout/abort reali | Crash host/PITR e perdita ack COMMIT sul link PG non certificati |
| Revoca/rotazione durante richiesta | Lock e controlli SQL correnti; prove dopo claim con connessione precedente aperta | Revoca non è annullamento di una lettura già committata prima della revoca |
| Saturazione/ruoli numerosi | Cap locale, queue/backpressure/timeouts, LRU/idle, chiusura errori; batch reale | Coordinamento globale multiistanza, costo provisioning e capacità hosting NOT VERIFIED |
| Secret leak o MITM | Volumi privati/UID separati, niente Docker nei servizi; SCRAM/TLS con negativi password/CA/hostname/plaintext; scan valori generati | Adapter file è solo laboratorio; nessuna certificazione secret manager/rotazione backup/compromissione host |
| Risposta corrotta | Verifica browser digest e compatibilità sul profilo chiuso | Non è serializer/hydrator generale né restore ferroviario |

Il journal lifecycle non sostituisce o aggira claim_nonce dati: quel claim accetta
solo sei operazioni e richiede il principal già attivo. Nessuna estensione nascosta
alla6A.8. Una nuova proof dello stesso job/token può ottenere lo stesso esito ACTIVE;
la stessa proof è replay. Journal e segreti persistono solo rispetto ai processi
riavviati nel test. Il loro stato dopo perdita host/volume è NOT VERIFIED.

Supabase reale/staging/Supavisor, principal SQL gestiti, CA/rete/rotazione credenziali
ospitata, budget globale, provisioning operativo e recovery senza secret store
rimangono NOT VERIFIED. Zero query al servizio reale. D10 ownerless è6A.10 e non è
implementato: fixture legacy non vuota con owner Auth sintetico condiviso. Nessuna
chiusura della macrofase6A e nessuna autorizzazione6B deriva da questo laboratorio.
