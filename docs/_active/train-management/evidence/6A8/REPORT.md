# 6A.8 — Rapporto SQL e sicurezza alla Regia

**6A.6 TECHNICAL PASS — 6A.7 DESIGN APPROVED — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

## Esito e perimetro

**PASS tecnico locale:97controlli nuovi.** Consegna soggetta ad audit indipendente; non chiude6A e non autorizza6A.9. Base approvata `cec3a97042ddd1cbcacc7e50cb99a9f4b76c2afd`, HEAD/branch/remoto/ascendenza e working tree pulito verificati prima delle modifiche. Solo `feature/train-management`; nessuna importazione dal main indipendente77b6f64, merge/rebase/reset o force-push.

Prodotti: nuova migrazione additiva `20261104231109_serien_capability_lifecycle.sql`, runner `tests/db/6A8/`, [contratto SQL per broker futuro](../../6A8_SQL_LIFECYCLE.md), [matrice effettiva ACL/RLS](../../6A8_ACL_MATRIX.md), questo rapporto/evidenze, PROGRESS/STATUS. Le migrazioni6A.3–6A.5, codice/test6A.2–6A.6, contratti/matrice R0 ed evidenze precedenti sono conservati. Nessun nuovo broker/pool/secret store reale, ownerless, simulator integration, UI o asset.

La Regia approva D09=A condizionatamente: il broker verifica P-256 e resta fidato, il DB autentica session_user e capacità corrente. Le nuove API SQL non resistono alla compromissione del broker/operatore e non verificano P-256. Invito e recovery sono legati alla chiave approvata tramite uguaglianza SQL; proof of possession e cerimonia offline definitiva restano6A.9.

## Risultati realmente rieseguiti

| Suite | Esito | Evidenza |
|---|---|---|
| Nuovo laboratorio6A.8 |97PASS, zero FAIL finali | [results.json](results.json), [log](lifecycle-tests.txt), [summary](summary.json) |
| SQL6A.3 |51PASS, proprie baseline immutate | [risultati](regression-6A3.json), [log](regression-6A3.txt) |
| SQL6A.4 |45PASS, proprie baseline immutate | [risultati](regression-6A4.json), [log](regression-6A4.txt) |
| SQL6A.5 |141PASS, proprie baseline immutate | [risultati](regression-6A5.json), [log](regression-6A5.txt) |
| Browser/HTTP/SQL6A.6 dopo upgrade6A.8 |72PASS | [risultati](integration-results.json), [audit](integration-audit.json), [log](integration-regression.txt) |
| HTTP capability6A.2 |48PASS | [JSON](capability-security.json), [log](capability-security.txt) |
| Chromium capability6A.2 |5PASS | [JSON](capability-browser.json), [log](capability-browser.txt) |
| Adapter6A.4 e boundary6A.5 |12+25PASS | [log](adapter-tests.txt) |
| npm test |37file PASS, zero fail/cancel/skip | [log](npm-test.txt); nessun conteggio interno inventato |
| Python/JMRI |9PASS | [log](python-tests.txt) |
| npm run build |PASS, hash bundle R1 | [log](build.txt), [invarianti](invariants.json) |
| Scope/segreti/canonico/sorgenti |PASS nel controllo delimitato | [invariants.json](invariants.json), [input/hash](inputs.json) |

Le regressioni3/4/5 riproducono le proprie migrazioni originali; la6A.6 applica anche il nuovo file perché il runner legge le migrazioni20261104 in ordine. L'[input manifest](inputs.json) documenta esattamente i file/hash e l'ordine. Il gateway6A.6 rimane il prototipo approvato con nonce RAM: questi72PASS provano compatibilità della nuova espansione e transazioni/fault reali, **non** l'integrazione browser→nuovo claim/lifecycle, riservata6A.9.

## Corrispondenza dei24test obbligatori

Prefissi numerici nei97casi SQL mantengono gli ID della richiesta; casi multipli per uno stesso criterio. PASS indica il perimetro effettivo qui specificato, non la piattaforma gestita.

| ID | Prova effettiva | Esito / limite |
|---|---|---|
|01 | PREPARED→APPROVED→ACTIVATING→ACTIVE con principal NOLOGIN, approvazione e commit operatore |PASS; operatore postgres solo fixture |
|02 | Due connessioni same-device bloccate contemporaneamente sul coordinatore, un solo claim |PASS; secondo REPLAY; backend reali |
|03 | Claim autocommit, Save CAS fallito, replay da altro processo |PASS; claim non annullato dal rollback dei dati |
|04 | Nuovo psql/processo e nuovo backend dopo claim |PASS; PID/session_user osservati nei risultati, nessun broker riavviato perché non implementato |
|05 | Nonce malformed, proof expired, wrong device/audience/path/domain |PASS; contesto chiuso e clock SQL |
|06 | Claim poi revoke e Save |PASS, FORBIDDEN e dati invariati |
|07 | Epoch/key/workspace epoch del contesto stale, rotazione con nuovi binding, vecchio principal negato |PASS; nuovo principal accettato |
|08 | Reader→Save |PASS, diniego SQL effettivo; reader/editor/owner coperti anche dalla6A.6 aggiornata |
|09 | Scope falso, rotazione reader→owner, ceiling editor in prepare/approve/redeem/complete/recovery/revoke |PASS; nessun grant superiore al ceiling |
|10 | Approvazione/redeem con altra JWK |PASS, nessuna mutazione autoritativa |
|11 | Due redeem simultanei dello stesso job |PASS; risposta idempotente e un solo device/binding, non due grant |
|12 | Invito già usato per altro job, ticket scaduto, kit per altro job o versione riemessa |PASS; stesso job può rileggere il proprio esito senza nuova attivazione |
|13 | Risposta attivazione/recovery persa simulata scartando il risultato; nuovo processo ritenta job identico |PASS; identità e stato non duplicati; trasporto HTTP perso provato separatamente6A.6 |
|14 | Fault nei punti descritti sotto, RECOVERABLE/resume e FAILED terminale |PASS; fault SQL reali ed eccezione adapter sintetica distinti |
|15 | NOLOGIN preparato; anche LOGIN amministrativo fuori ordine con registry non attivo |PASS, zero dati; non una difesa contro superuser |
|16 | Stesso backend read riuscita, revoke committata durante pg_sleep, successiva read negata |PASS, PID effettivo e prima risposta osservata |
|17 | Control/data A→B, job B, RLS USING/WITH CHECK e FK reservation recovery A→job B |PASS; oracoli separati API/ACL/RLS/FK |
|18 | SET ROLE authorizer, GUC A→B, GRANT admin, DML registry/head, extra parent e SELECT(payload) nel principal |PASS; nessuna elevazione data plane |
|19 | Cataloghi has_function_privilege per anon/authenticated |PASS, zero funzioni private eseguibili |
|20 | Quote live device/workspace, rate, retention/cleanup, cancellazione limite/raw negata; quota device ricontrollata al redeem |PASS; aging fixture esplicito, nessun clock client fidato o GC periodico |
|21 | Errore prima COMMIT migrazione |PASS; schema/ruoli/dati prima e dopo confrontati |
|22 | Save/retry dopo head avanzato, ricevuta compatta, ID diverso di digest, invalid state, recovery; regressione5 e CAS/fault HTTP6 |PASS nel profilo sintetico chiuso |
|23 | Dieci tabelle legacy inizialmente non vuote |PASS; tutte le righe originali presenti e identiche dopo; [baseline](legacy-before.json) |
|24 | Canonico/bundle/R1 e diff |PASS sorgenti/hash/JMRI/build; visuale/performance/hardware completi non rieseguiti |

Ogni caso salva hash prima/dopo delle undici componenti dati (dieci tabelle+head), con5stati applicativi deduplicati e valori effettivamente letti. Ogni diniego pertinente confronta anche il registry, binding, job, nonce, limiti e recovery: riassunto redatto più digest SQL di **tutte** le righe autoritative, senza esportare verifiers o password. Errori osservati registrano la prima riga ERROR PostgreSQL, exit code e hash dell'output, non il solo esito atteso.

## Fault matrix e recovery dei job

| Confine | Guasto/risultato osservato | Ripresa sicura |
|---|---|---|
| Secret put→prima di SQL | Eccezione adapter sintetica; un oggetto per job, nessun principal creato | Retry stesso job riusa il valore in memoria; durabilità dopo crash dello store NOT VERIFIED |
| CREATE ROLE→prima di prepare | Retry del provisioner fixture trova lo stesso ruolo NOLOGIN sicuro | Nessuna seconda identità; il ruolo orfano inerte richiede inventario operatore |
| INSERT lifecycle_jobs | Trigger fixture AFTER INSERT solleva LAB_LIFECYCLE_FAULT | Rollback senza job/grant, ruolo ancora NOLOGIN; retry dopo rimozione del fault |
| INSERT devices | Fault SQL dopo staging | Zero device/binding/consumo parziali |
| INSERT worker_bindings | Fault SQL dopo device preparato | Registry e job identici al prima |
| INSERT device_bindings | Fault SQL dopo worker binding | Nessun binding parziale o device attivo |
| INSERT lifecycle_events | Fault SQL al termine del redeem | Tutto il redeem torna allo stato approvato |
| ALTER LOGIN + complete→prima COMMIT | Divisione per zero nello stesso BEGIN | Rolcanlogin, job e registry tornano ai valori iniziali; risposta provvisoria non dichiarata successo |
| Stato incompleto recuperabile | fault→RECOVERABLE, resume→stato registrato | Stesso job e manifest; nessuna nuova identità |
| Stato FAILED o REVOKED | resume/complete negati | Non riabilitare credenziali; nuovo percorso autorizzato o revoca/kit appropriati |
| Recovery prima attivazione | Verifier riservato al job, non ancora consumato; consume/revoke altri/epoch/ACTIVE atomici | Retry stesso job; kit riutilizzato altrove negato; FK vieta reservation cross-workspace |
| Dati6A.5 dopo upgrade | Eccezione SQL, backend kill, statement timeout, HTTP abort/pagina/SIGKILL Chromium nel runner6A.6 | Atomicità e retry ricevuta verificati; non host crash/disco/PITR |

Hook fault definer con owner amministrativo presenti **solo nel runner**, su schema fault6a8 del container effimero. Non fanno parte della migrazione. Sono strumenti di sabotaggio controllato/oracolo, mai un modello di funzione produttiva.

La prima esecuzione esplorativa si è fermata in una query ausiliaria dell'oracolo legacy che assumeva un ID layout e riceveva NULL. Rimossa quella query, il comparatore usa tutte le righe/identità effettive della baseline. In revisione sono stati ristretti i grant colonna e aggiunti ceiling a ogni operazione control-plane, FK recovery composta e quota al redeem. I risultati consegnati provengono dalla suite finale completa sulla migrazione finale; i tentativi intermedi non sono riportati come PASS retroattivi.

## Sicurezza verificata e limiti

Zero grant raw ai gruppi worker/control/redeemer/provisioner; executor NOLOGIN/NOBYPASSRLS e senza tabelle possedute; EXECUTE/USAGE espliciti, default ACL catturati; scope da session_user e control_bindings, mai GUC. Nessuna funzione definer owner postgres nella migrazione. Il probe RLS temporaneo della fixture viene eliminato prima della matrice finale. Credenziali, token di invito/recovery o chiavi private assenti dalle evidenze; i verifiers restano soltanto nei dati privati del container.

Il claim è committato dal driver in una transazione separata. PL/pgSQL non effettua un commit autonomo; un caller che unisse claim e Save nello stesso BEGIN violerebbe il contratto. Le vecchie API restano compatibili e non impongono una reservation contro un broker malevolo. È il confine di fiducia D09=A, non una verifica crittografica DB o un'architettura B/C.

NON VERIFICATI/NON IMPLEMENTATI: broker6A.9 e pool, verifica P-256 nel nuovo percorso end-to-end, gestione segreti durevole/distribuita, provisioning custom role e TLS/Supavisor gestiti, password authentication (fixture Unix trust), carico/costo/limiti reali, lifecycle dopo crash del secret store, kit offline definitivo, host/storage crash/PITR, ownerless D10, serializer/hydrator/autosave/UI e6B. Alcune revoche aggiornano lo stato durevole dei job senza evento separato per ciascuna riga: non è un audit completo anti-admin o dei dinieghi. Quote nonce non equivalgono a quota totale di storage/WAL/registry.

Nessuna query al progetto Supabase reale `vehfrjgifzjjgamrgwze`, nessuna azione staging. Consultata solo documentazione pubblica Supabase sulle funzioni e i riferimenti PostgreSQL già raccolti in6A.7; changelog diretto ancora403 tramite proxy, NOT VERIFIED. CLI eseguita in container effimero senza rete dopo che il tentativo locale aveva incontrato home read-only; nessun cambio di HOME/proxy o configurazione produttiva. Dipendenze di test Playwright1.56.1 esterne al progetto, nessuna dipendenza app nuova.

## Checkpoint e STOP

Commit atomico della sola6A.8, normale fast-forward su feature/train-management e confronto SHA/file remoti dopo push nella consegna finale; questo rapporto non anticipa l'esito del push. Se pubblicazione/verifica falliscono, lavoro preservato e stato BLOCKED, mai overwrite del remoto. SHA risolvibile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A8/REPORT.md`.

Regia: verificare soprattutto il contratto di commit separato, deleghe/ceiling, privilegi effettivi, finalizzazione del LOGIN e limite del secret adapter. L'approvazione di6A.8 non dimostra provisioning produttivo, ownerless o chiusura6A. **STOP. Prossima eventuale autorizzazione: sola6A.9.**
