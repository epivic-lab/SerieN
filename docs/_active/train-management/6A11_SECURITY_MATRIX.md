# 6A.11 — Matrice A01–A16

Criteri originali ripresi integralmente da [6A.7](6A7_EXECUTION_PLAN.md).
Esiti del laboratorio corrente, non approvazioni della Regia o staging.
Setup comune: fixture mista legacy A/B, Auth0, ownerless C/D, owner/editor/reader,
più revisioni/receipt confermate; precondizioni specifiche nel campo setup e negli
oracoli di ogni test. Azioni con firma P-256 e HTTP reali, SQL reale; probe raw
SQL soltanto dal supervisore fuori banda, mai da route pubbliche.

[JSON della matrice](evidence/6A11/security-matrix.json) collega ogni riga a indici
esatti di [results.json](evidence/6A11/results.json), con before/after SQL e
observed. Le mappe states/authorityStates contengono le righe integrali referenziate
per hash. auditMarkers associa request_id firmato a claim/dataCOMMIT. Per ogni
403/errore dati si verifica anche risposta error-only, immutabilità dati e, nei
denied helper, identità autorità/job; il claim nonce o audit di diniego previsto
può crescere e non è confuso con una scrittura applicativa non autorizzata.
I check di controllo/manipolazione fixture descrivono esplicitamente il cambiamento
operatore: non pretendono before=after per revoca, rotazione, CAS o fault orphan.
Gli oracoli sono nelle [estensioni](../../../tests/db/6A11/extensions.js) e
[suite integrata](../../../tests/db/6A11/adversarial.test.js).

| ID | Attore/azione originale | Atteso originale | Osservato | Livello del diniego | Esito |
|---|---|---|---|---|---|
| A01 | Pubblico senza proof/chiave, UUID noto, Origin valido | Zero dati/effetti; gateway/broker non aprono una lease autorizzata | 400/403 solo error, dati/autorità/job immutati, zero nuove lease; Origin valido e nessuna chiave. | HTTP/parser e proof, prima del pool | PASS |
| A02 | Reader A | ReadHead/Snapshot/History e proprie receipt sì; Save/Recover/pair altri no; DB e HTTP concordano | Reader legge head/snapshot/history e receipt propria dopo downgrade; Save/Recover403; invite404. Oracoli SQL reader anche nella suite185. | HTTP/proof; SQL authorize scope | PASS |
| A03 | Editor A | Letture, Save/Recover CAS sì; inviti/revoca altri no; niente registry/catalogo/SQL raw | Editor firma Save e recovery CAS; invito pubblico404, revoca/approve raw42501; receipt altrui404. | HTTP route; SQL scope e ACL | PASS |
| A04 | Owner A | Stessi dati, control-plane solo proprio workspace e fingerprint approvato; nessun privilegio SQL amministrativo | Owner attivato solo da job privato key-bound; redeem ceiling editor nega job owner; nessuna route admin né privilegio DDL. | SQL lifecycle ceiling, ACL; HTTP | PASS |
| A05 | Device A su B, URL/body/DTO discordi | 403/404 non enumeranti, zero dati B e stato B identico; anche con owner storico condiviso | A→B403 senza dati B; binding principal errato403. SQL185 distingue84FK fra domini e parent discordi, inclusi legacy/NULL. | HTTP proof/binding; SQL authorize; domain FK23503 | PASS |
| A06 | Firma/key/version/epoch/workspace epoch/expiry falsi o stale | Diniego HTTP/SQL; connessione già calda e cache vecchia non aggirano authorize | Firma/nonce/versione/key_id/tempo/epoch negati; sessione calda con expiry/epoch mutate403; trusted config stale workspaceEpoch/keyVersion403; downgrade SQL nega anche con scope cache owner. | Proof prima pool oppure authorize SQL corrente | PASS |
| A07 | Due istanze, stessa proof, restart, SQL rollback dopo claim | Un solo claim; replay sempre negato nella finestra; prova di claim persistito nel DB | Gara due processi/distinti backend:200+409, una sola riga nonce; SIGKILL/restart e rollback Save non annullano claim committato. | Unicità/claim SQL durevole; REPLAY409 | PASS |
| A08 | Retry dopo risposta persa, head avanzato, quota piena | Nuovo nonce/stesso request_id/envelope; medesima ricevuta, nessuna revisione extra; mismatch409 | 8stesse proof:1successo+7replay;8nonce diversi stesso request_id:una receipt/revisione; ack perso e quota piena/head avanzato retry identico; digest diverso409. | Claim SQL vs idempotenza API separati | PASS |
| A09 | Due device concorrenti stesso expectedRevision | Backend osservati concorrenti, un CAS vincitore e un409; perdente senza parziali | Due browser/backend contemporanei sotto lock:200(rev3)+409REVISION_CONFLICT; head avanza una volta e nessun parziale. | CAS/lock/transazione SQL | PASS |
| A10 | Revoca durante read/save, nonce già reclamato | Ordine dei lock osservato; operazioni precedenti possono completare, zero nuove dopo commit revoca | Save sospeso dopo claim, revoca COMMIT, poi403;9letture concorrenti sospese dopo claim tutte403 dopo revoca. Nessun dato protetto nelle risposte. | Lock/authorize SQL dopo revoca | PASS |
| A11 | Nuovo principal/password, poi rotazione key, ack perso | Binding esatto, vecchio grant negato quando revocato; nessun rebinding di vecchie sessioni; receipt storiche immutate | Nuovo principal/password e vecchia sessione negati; SIGKILL durante rotazione ripreso dallo stesso job; vecchio ruolo NOLOGIN, vecchia read in-flight403; receipt precedente identica. | SQL binding/key_version e lifecycle; proof old-key | PASS |
| A12 | Invito/kit duplicato, scope editor→owner, chiave sostituita | Un consumo atomico; nessuna elevazione, job recuperabile, niente perdita del recovery dopo crash | Job candidato/fingerprint/token/scope manipolati negati; crash prima/dopo activation risposte503 poi202/200,1binding; kit consumato resta negato dopo ulteriori crash. | HTTP schema/proof; ceiling SQL; journal job durevole | PASS |
| A13 | Ingresso pubblico compromesso, chiamata broker con principal scelto | Firma ricalcolata nel broker; richiesta inventata negata; ingresso senza DB/secrets; risposta intercettabile esplicitamente nel threat model | RPC principal arbitrario negato; UID/mount/socket/nessuna rete SQL ingresso verificati; admin/static path404, risposta alterata bloccata dal browser; segreti assenti nei4asset serviti. | Broker ricalcola proof; Unix ACL/UID/mount; verifica browser | PASS |
| A14 | SQL device raw SELECT/DML, helper, SET ROLE/GUC, inherited grant | Negati o nessun aumento di autorità; scope derivato solo dal principal; prover separato ACL/RLS/FK | Owner/editor raw SELECT/DML/CREATE/ALTER/GRANT/helper/revoke/approve42501; SET ROLE authorizer/executor/altrui negato. GUC JWT/workspace e ROLE worker non cambiano session_user, foreign read FORBIDDEN. Provisioning con membership addizionale respinto. RLS e7domain FK testate separatamente nei185. | ACL42501; RLS risultato vuoto; constraint23503/23514 | PASS |
| A15 | Fault SQL/kill/timeout, abort HTTP, kill browser/broker dopo commit | Atomicità reale e retry ricevuta; digest/versioni browser verificati, nessun successo prima COMMIT | Timeout/kill backend dopo INSERT rollback; ack HTTP perso dopo COMMIT retry identico; kill broker/ingresso e SIGKILL Chromium dopo Save COMMIT nella fixture ownerless, digest alterato rifiutato. Config secret assente503 anche warm; journal000 lifecycle503/jobAPPROVED, dati indipendenti. Nessuna prova host/storage loss. | SQL transazione; error mapper; processo e store conservato | PASS |
| A16 | Molti device, burst negato, limite body/response/pagina/storage/audit | Cap/code/rate/quote misurati; backpressure e fairness; zero troncamenti o crescita illimitata | Singolo:PG16,queue64,timeout2s,LRU/idle30s,workspaceB6successi nel picco; body413/header431/408,burst429,quote/page/response/audit senza parziali. Doppio:PG32, cap globale16 FAIL; diagnostica esclusa dai PASS. | HTTP limit; pool; quote SQL; multiistanza non supportata | FAIL |

Le185prove [SQL ownerless](evidence/6A11/ownerless-sql.json) separano ACL, RLS e
constraint: non si deduce una RLS efficace da un solo42501. Il supervisore concede
SELECT temporaneo esclusivamente nel clone per dimostrare l'assenza di righe con
GUC legacy; nessun ampliamento permanente né modifica alle migrazioni. Tutte7FK
domain hanno84negativi fra12combinazioni, anche ownerNULL. Scope reader/editor,
CAS, recovery/immutabilità e ownerless compatibilità esercitati su SQL.

A07 sicurezza replay **PASS anche su due broker**; A16 budget globale **FAIL**.
I111PASS e la diagnostica separata non diventano un PASS di disponibilità multi.
