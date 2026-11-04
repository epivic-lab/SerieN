# 6A.7 — Piano minimo di risoluzione dei blocchi

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Design-only, base6A.6 `5d65a32ff392dabf7e57c040981598f5af398e05`. Gli ID6A.8–6A.13 sotto sono **proposte di microfase**, non autorizzazioni. STOP dopo i documenti6A.7 e il loro checkpoint; nessuna nuova migrazione, ruolo, gateway o deploy in questa fase. Tutto il lavoro futuro rimane su `feature/train-management`, con commit atomico, push normale e audit indipendente per ogni microfase.

## 1. Percorso minimo e dipendenze

Approvare [D09=A](6A7_ARCHITECTURE_DECISIONS.md) e [D10](6A7_OWNERLESS_CUTOVER.md). Conservare parser/proof/browser, adapter envelope/history, sei API dati, lock/CAS/RLS principal-based e profilo sintetico approvati. Sostituire in seguito solo i confini di laboratorio necessari: supervisore Docker, registry/ticket/nonce RAM e gestione illimitata delle connessioni; poi rimuovere la dipendenza Auth senza modificare le righe storiche. Nessuna piattaforma IAM nuova o riscrittura6A.1–6A.6.

```text
6A.7: D09/D10 + audit Regia
  → 6A.8 SQL/autorizzazioni/lifecycle privati isolati
  → 6A.9 broker/transport/pool e restart isolati
  → 6A.10 cutover ownerless isolato
  → 6A.11 test avversari/regressioni e dimensionamento
  → 6A.12 staging Supabase, solo con autorizzazione ambiente/costi
  → 6A.13 rapporto finale + gate indipendente macrofase6A
  → STOP; 6B.1 richiede un'altra autorizzazione
```

La prova critica di delegabilità dei custom role può essere anticipata su staging solo con autorizzazione specifica, se la Regia preferisce eliminare presto tale rischio; non autorizza il resto della6A.12. Se fallisce un presupposto di A, il percorso si arresta per riesame D09, non passa a C o a un admin universale.

## 2. Interventi e quality gate

### 6A.8 proposta — Adeguamenti SQL e autorizzativi, solo isolato

**File/componenti:** nuova migrazione additiva futura in `supabase/migrations/`, creata con CLI/help al momento dell'autorizzazione, non modifica delle tre approvate; nuovi harness sotto `tests/db/` in cartella dedicata; specifica D09. Tabelle esistenti replay_nonces/devices/invitations/recovery_verifiers/bindings/locks; eventuale journal provisioning e procedure private di lifecycle. Nessun SQL produttivo.

**Dipendenze:** approvazione D09 e threat model broker fidato; manifest dei privilegi prima/dopo, stesso PG17/profilo6A.6. Separare rigorosamente device worker, broker read-registry/claim, runtime control-plane e provisioner operatore. Non assegnare authorizer ampio al processo pubblico.

**Intervento minimo:** API nonce EXECUTE-only derivata da session_user; consumo in commit autonomo prima della transazione dati. Getter registry minimo; attivazione/revoca/rotazione/pairing/recovery con scope e prova key-bound, coordinatori comuni e job/result durevoli. Preparazione ruolo NOLOGIN da job separato; niente credenziali o autorità di creazione ruoli nel gateway. I vecchi sei entrypoint e l'autorità session_user rimangono. Il controllo nonce dipende dal broker che ha verificato firma, non diventa B.

**PASS obbligatori:** due connessioni reclamano stesso nonce, uno solo ha successo; rollback del save non annulla claim; expiry/epoch/revoca tra claim e save negano dati; invito/kit riusato o fingerprint sostituito non attivano grant; crash a ogni confine DB/secret-store ripreso dallo stesso job; ACL grant/colonne/membership alternate tutte negate; SQL6A.3–6A.5 immutato passa sulle proprie baseline, nuova migrazione passa sul percorso6A.6.

**FAIL bloccanti:** principal dal client/GUC; raw DML o EXECUTE PUBLIC; nonce RAM come fallback; control plane non vincolato a scope/workspace; attivazione prima del commit; job parziale usabile o rotazione che riattiva un grant sospetto. Rischi: job DB/secret non atomico, authorizer troppo largo, cleanup nonce anticipato.

**Rollback:** bloccare nuovi caller, ROLLBACK DDL in rehearsal; dopo dati/job reali conservare ledger/claim/result e disabilitare attivazioni, non cancellarli per tornare indietro. Vecchi percorsi solo se ancora sicuri e mai per grant revocati. **Autorizzazione separata: sì, implementazione SQL locale.**

### 6A.9 proposta — Gateway/broker, transport e pool limitato

**File/componenti:** futuro transport PostgreSQL parametrizzato accanto a `prototypes/train-management/integration-lab/sql-transport.js`; moduli gateway/broker isolati, lifecycle/secret adapter e nuovo runner sotto `tests/db/`. Riutilizzare `capability-gateway/protocol.js`, `strict-json.js`, `transaction-core/envelope.js`, `history-access/protocol.js` senza ampliare il dominio. La suite6A.6 esistente rimane riproducibile e il suo transport Docker resta chiaramente LAB ONLY.

**Dipendenze:**6A.8, budget iniziale di lease e identità di servizio isolabili. Un solo backend persistente iniziale, ingresso senza segreti/DB, broker con credenziali solo dei propri domini, provisioner fuori banda. Driver nuovo soltanto se necessario, versione fissata e lockfile dedicato al laboratorio; nessuna dipendenza o import nell'app R1.

**PASS obbligatori:** browser→proof originale→broker→login device/password/TLS locale→API→commit→risposta verificata; session_user osservato anche dentro definer; lease sempre fissata al principal/versione; cap aggregato, LRU idle/fairness/deadline e backpressure con molti device; coda limitata; errore/timeout scarta connessione; due istanze e restart non accettano nonce già consumati; riavvio tra commit e ack deduplica; vecchia sessione revocata nega nuove read/write; rotazione nuova credenziale funziona e vecchia non riattiva il grant. TLS locale non equivale al TLS gestito.

**FAIL bloccanti:** Docker/admin/SQL secret nel processo pubblico; ruolo o DSN client; SET ROLE/shared identity; fallback non firmato o plaintext; connessione riusata tra principal; risposte prima COMMIT; perdita del registro replay o ack/job dopo restart; broker con EXECUTE amministrativo generico. Rischi: furto credenziali broker, churn/latenza connessioni, coda e replica moltiplicata.

**Rollback:** fermare listener/caller nuovo e preservare DB/job/receipt; rollback del solo codice alla versione sicura, senza riattivare principal revocati. Riprendere il lab precedente solo su fixture separata, non trasferire lì nuove scritture. **Autorizzazione separata: sì, servizi prototipo isolati.**

### 6A.10 proposta — Cutover ownerless con archivio legacy

**File/componenti:** nuova migrazione futura separata, otto tabelle owner-scoped, registro privato legacy_owners, policy/ACL e funzione creator workspace; harness `tests/db/` dedicato e oracoli di conservazione. Nessuna modifica retroattiva alle migrazioni approvate o agli snapshot.

**Dipendenze:** approvazione D10, inventario reale del clone di test e backup/restore provato,6A.8–6A.9 per il percorso firmato finale. Le prove strutturali possono essere preparate su fixture prima del transport, ma non sostituiscono il gate E2E.

**PASS obbligatori:** tutti gli [O01–O14](6A7_OWNERLESS_CUTOVER.md); legacy non vuoto in tutte le dieci tabelle; owner storici verificati, nuovi workspace senza utenti Auth; eliminare tutti gli utenti Auth nella sola fixture e poi salvare/leggere/recuperare; conservazione esatta di PK/payload/digest/result/context/timestamp e FK; NULL matrix e A/B/legacy adversarial; stessa topologia/regole ferroviarie.

**FAIL bloccanti:** account Auth nuovi/di comodo; DELETE/UPDATE di snapshot/receipt o trigger disattivato; FK domain saltata; residuo cascade Auth; owner_id inventato; backfill che rinomina ID/digest o sostituisce topologia; anticipo validatore generale. Rischi: lock DDL e unique inventory conflittuali, policy Auth residue, script che aggiorna solo parent cambiando domain.

**Rollback:** piano D10§7; prima cutover rollback DDL, dopo prime scritture ownerless forward-fix/read-only o restore+replay verificato e autorizzato. Mai down distruttivo o ritorno ai NOT NULL tramite account fittizi. **Autorizzazione separata: sì, cutover isolato; nessuna autorizzazione cloud inclusa.**

### 6A.11 proposta — Test avversari e regressioni della correzione

**File/componenti:** nuove suite e oracoli separati, evidenze nella directory della microfase; gateway/broker/transport e migrazioni correttive solo se un fix circoscritto è autorizzato. Contratti R0 e DTO non cambiano.

**Dipendenze:**6A.8–6A.10 PASS, budget/SLO di carico proposti da approvare (non estrapolare i p95 con fault intenzionali6A.6). Confronti per scenario prima/dopo sulle dieci tabelle e registry/coordinatori; distinguere ACL, RLS e constraint come ragione del diniego.

**PASS obbligatori:** matrice A01–A16 sotto, O01–O14, regressioni6A.2–6A.6 reali; npm test, Python/JMRI, build e identità canonico/runtime/asset; prove due istanze e crash job/secret-store; nessun dato restituito/modificato nei dinieghi; quote anche su input negato e memoria/code limitate. Conservare HTTP reali, session_user/pg_stat_activity, SQL prima/dopo e log redatti senza token/firme/password. Fault attraverso gateway reale, non mock; clock controllato non spacciato per tempo reale.

**FAIL bloccanti:** una lettura/scrittura illegittima, modifica legacy, replay dopo restart, CAS doppio, errore che mostra secret, parziale dopo fault, crescita connessioni/code oltre cap o SLO approvato non rispettato. Rischi: test soltanto felici, stato aspettato confuso con osservato, mock al confine critico, misure tmpfs presentate come hosting.

**Rollback:** non aprire servizio; fermare nuove scritture, conservare stati/log e correggere in microfase autorizzata. Nessun cambio a R0 per far risultare PASS. **Autorizzazione separata: sì, collaudo/fix locale delimitato.**

### 6A.12 proposta — Validazione Supabase staging

**File/componenti:** runbook ed evidenze di un progetto staging **distinto** da quello reale; configurazioni di connessione e secret tramite ambiente approvato, mai repository/browser; eventuali migrazioni correttive solo su staging espressamente autorizzato.

**Dipendenze:**6A.11 PASS e permesso esplicito a progetto/ref staging, DDL/DML sintetico, provisioning ruoli, rete, costi/tier e cleanup. Nessun progetto viene creato o scelto tacitamente. READ-ONLY produzione rimane invariato. Verificare changelog e documentazione/versioni nuovamente: il changelog6A.7 non era accessibile via proxy.

**PASS obbligatori:** custom login e delegabilità del provisioner senza admin nel worker; direct TLS CA/hostname e diniego certificato errato/plaintext; session_user corretto con definer e bind persistente; eventuale Supavisor session con due principal distinti, nessun riuso errato e rotazione/password-cache; cataloghi ACL/default creator/role membership/RLS/schema exposure effettivi; nuove API non esposte da Data API, prove anon/authenticated negative; ownerless+legacy dopo Auth delete sintetico; cap/client/backend e carico con margine ai servizi, SLO e costo approvati; backup/restore/recovery dopo nuovi checkpoint su staging. Inventario passivo produzione, se necessario, richiede solo letture ed evidenze redatte; nessuna applicazione reale.

**FAIL bloccanti:** dover usare postgres/service_role nel data path; identità custom persa dal pooler; TLS senza verifica; schema/API privilegiati pubblici; quota/backend/SLO/costo non sostenibile; ownerless solo con shadow user; impossibilità di conservare checkpoint nel restore. Rischi: differenze vanilla/gestito, servizi che consumano connessioni, costo di molti ruoli e rotazioni, default ACL in evoluzione.

**Rollback:** chiudere caller staging, revocare lease/grant staging, conservare export/evidenze sintetiche; cleanup solo delle risorse staging identificate e autorizzate. Nessuna azione sul reale. **Autorizzazione separata: sì, obbligatoria e specifica per ambiente/costi/operazioni.**

### 6A.13 proposta — Gate finale della macrofase6A

**File/componenti:** nuovo rapporto finale, stato/progress ed evidenze delle correzioni; aggiunta/aggiornamento dichiarato del gate dopo autorizzazione, mantenendo la storia del rapporto6A.6. Nessun serializer/hydrator o codice6B.

**Dipendenze:** approvazione indipendente D09/D10 e PASS verificati6A.8–6A.12, checkpoint remoti coincidenti. Ogni NOT VERIFIED residuo deve essere elencato con impatto; nessun presupposto obbligatorio sostituito da una nota.

**PASS obbligatori:** risolti hosting/lifecycle/pool e ownerless su staging autorizzato; matrice R0 P01–P18 aggiornata soltanto con prove effettive, senza modificare criteri; gate infra6A distinto dalla futura accettazione simulatore6B–6E; canonico/UI/motore/asset intatti. SHA/evidenze riproducibili e revisione Regia.

**FAIL bloccanti:** uno dei due blocchi aperto, test critico non eseguito/fallito, claim di serializer generale, macrofase dichiarata approvata da Codex, richiesta di6B eseguita automaticamente. **Rollback:** conservare6A BLOCKED e servizio disabilitato/read-only; nessun deploy. **Autorizzazione separata: sì, poi decisione finale Regia; 6B.1 separata.**

## 3. Matrice autorizzazioni e prove avversarie future

Tutti gli esiti seguenti sono **NOT VERIFIED in6A.7**. I PASS6A.6 ereditati sono riferiti soltanto al laboratorio originale, non alla futura correzione. R0P14/P15 restano NOT VERIFIED per hosting fino a staging e audit.

| ID | Attore/azione | Esito atteso e oracolo |
|---|---|---|
| A01 | Pubblico senza proof/chiave, UUID noto, Origin valido | Zero dati/effetti; gateway/broker non aprono una lease autorizzata |
| A02 | Reader A | ReadHead/Snapshot/History e proprie receipt sì; Save/Recover/pair altri no; DB e HTTP concordano |
| A03 | Editor A | Letture, Save/Recover CAS sì; inviti/revoca altri no; niente registry/catalogo/SQL raw |
| A04 | Owner A | Stessi dati, control-plane solo proprio workspace e fingerprint approvato; nessun privilegio SQL amministrativo |
| A05 | Device A su B, URL/body/DTO discordi | 403/404 non enumeranti, zero dati B e stato B identico; anche con owner storico condiviso |
| A06 | Firma/key/version/epoch/workspace epoch/expiry falsi o stale | Diniego HTTP/SQL; connessione già calda e cache vecchia non aggirano authorize |
| A07 | Due istanze, stessa proof, restart, SQL rollback dopo claim | Un solo claim; replay sempre negato nella finestra; prova di claim persistito nel DB |
| A08 | Retry dopo risposta persa, head avanzato, quota piena | Nuovo nonce/stesso request_id/envelope; medesima ricevuta, nessuna revisione extra; mismatch409 |
| A09 | Due device concorrenti stesso expectedRevision | Backend osservati concorrenti, un CAS vincitore e un409; perdente senza parziali |
| A10 | Revoca durante read/save, nonce già reclamato | Ordine dei lock osservato; operazioni precedenti possono completare, zero nuove dopo commit revoca |
| A11 | Nuovo principal/password, poi rotazione key, ack perso | Binding esatto, vecchio grant negato quando revocato; nessun rebinding di vecchie sessioni; receipt storiche immutate |
| A12 | Invito/kit duplicato, scope editor→owner, chiave sostituita | Un consumo atomico; nessuna elevazione, job recuperabile, niente perdita del recovery dopo crash |
| A13 | Ingresso pubblico compromesso, chiamata broker con principal scelto | Firma ricalcolata nel broker; richiesta inventata negata; ingresso senza DB/secrets; risposta intercettabile esplicitamente nel threat model |
| A14 | SQL device raw SELECT/DML, helper, SET ROLE/GUC, inherited grant | Negati o nessun aumento di autorità; scope derivato solo dal principal; prover separato ACL/RLS/FK |
| A15 | Fault SQL/kill/timeout, abort HTTP, kill browser/broker dopo commit | Atomicità reale e retry ricevuta; digest/versioni browser verificati, nessun successo prima COMMIT |
| A16 | Molti device, burst negato, limite body/response/pagina/storage/audit | Cap/code/rate/quote misurati; backpressure e fairness; zero troncamenti o crescita illimitata |

## 4. Budget, manutenzione e reversibilità

Prima di abilitare servizio: concordare dispositivo/workspace massimi, picco richieste e intervallo autosave futuro (senza implementarlo), SLO p95/errore, cap backend e coda, tempo massimo di provisioning/rotazione e costo mensile accettabile. Formula di costo: compute/tier+storage/WAL/backup+egress+hosting backend+secret operations+tempo operatore. Il numero di ruoli e il churn devono essere misurati; nessun prezzo del tier o throughput è stato inventato.

Un aumento di scala non autorizza un nuovo confine di fiducia o l'adozione di B/C. Se A non soddisfa il budget, fermare l'ammissione e riportare il limite alla Regia. Retirement dei ruoli solo dopo inventario sessioni, grant e dipendenze, senza DROP OWNED/CASCADE indiscriminato. Retention snapshot/ricevute e promessa di recupero invariati.

## 5. Consegna corrente6A.7 e approvazioni richieste

Prodotti soltanto documenti D09/D10, questo piano, [rischi/evidenze](6A7_RISKS_AND_EVIDENCE.md), [rapporto verifiche](evidence/6A7/REPORT.md), aggiornamenti PROGRESS/STATUS. Evidenze npm/Python/build e controllo del diff confermano il perimetro documentale; non sono prove di A corretto o ownerless implementato.

La Regia deve approvare o respingere: D09=A con broker fidato e cap; rischio del dominio credenziali e dimensionamento iniziale; D10 con provenienza privata e archivio legacy invariato; protocollo di rotazione/recovery e relativi test; sequenza correttiva proposta. Poi potrà autorizzare **la sola6A.8 isolata**. Staging, produzione, chiusura6A e6B.1 non sono inclusi. **STOP dopo6A.7.**
