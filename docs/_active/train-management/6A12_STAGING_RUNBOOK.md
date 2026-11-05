# 6A.12-P — Runbook futuro di staging

**NON ESEGUIRE in 6A.12-P. Ogni accesso remoto richiede nuova autorizzazione.**
Questo è un piano revisionabile, non uno script da lanciare dal checkout collegato.
Nessuna riga sotto è stata eseguita contro Supabase. [Gate](6A12_STAGING_READINESS.md),
[approvazioni AU01–AU10](6A12_COST_AND_APPROVAL_GATE.md),
[test T01–T28 e recovery R01–R06](6A12_TEST_AND_RECOVERY_PLAN.md).

## 0. Scheda di esecuzione obbligatoria

Prima della creazione, approvare organizzazione/nome/regione/owner e limite di
spesa. Dopo la creazione, congelare il nuovo ref nella scheda prima di ogni SQL.
Campi oggi **NON ASSEGNATI**: organization_id, project_name, project_ref,
region, billing_owner, host_instance/service_id, release_digest, origin HTTPS,
secret_namespace, CA/endpoint, finestra, responsabile e riferimenti autorizzativi.
Nessun placeholder è un valore operativo o un'autorizzazione.

Guardia obbligatoria per ogni operazione, compresa lettura inventario/backup:
ref esatto nella allowlist firmata, diverso da `vehfrjgifzjjgamrgwze`; host SQL,
origine, secret prefix e account devono riferirsi allo stesso staging. Verificare
la destinazione **prima di aprire il socket**, usando la scheda, non una query al
progetto vietato. Un DSN risolto da env/link di un'altra attività è NO-GO.
Non consultare il progetto reale per determinare com'è fatto lo staging.

Usare postazione/working directory amministrativa separata senza link al progetto
reale, secret temporanei protetti e CLI fissata dopo `--version`/`--help` correnti.
S11: CLIv3 è local-by-default e richiede consenso alle mutazioni hosted; non
interpretare un db push locale riuscito come applicazione staging. Non copiare
vecchi flag o usare --yes indiscriminato. Per i SQL approvati può essere usato un
servizio psql nominato, con target verificato e TLS verify-full; password solo da
adapter/PGPASSFILE0600 temporaneo, mai argv/commit. Nessun comando è precompilato
con un ref o credenziale reale in questi documenti.

## 1. Ordine e punti di arresto

| Step | Azione futura, sempre sul nuovo target | Autorizzazione necessaria | Evidenza / STOP |
|---|---|---|---|
| S00 |Validare scheda, allowlist/denylist, account e preventivo |AU01–AU02 prima di ogni costo; nessuna operazione se incompleti |Verbale di destinazione, quota residua e scadenza |
| S01 |Creare secondo progetto vuoto soltanto nell'organizzazione approvata |AU01–AU02: provisioning remoto e costo |Nuovo ref registrato; se corrisponde al reale, STOP prima di qualunque collegamento |
| S02 |Inventario gestito read-only: versione PG17, database/ruoli, ACL, estensioni, settings e limiti |AU04: accesso remoto esplicito |Manifest schema/ruoli/default ACL/policy; applicativo e Auth utenti inizialmente vuoti, altrimentiSTOP; niente password/hash/query payload |
| S03 |Configurare restrizioni SQL, SSL/enforcement e Data API chiusa; mantenere broker assente |AU03: rete/segreti/configurazione e downtime, incluso possibile reboot SSL |Readback delle sole impostazioni staging; no apertura globale della rete |
| S04 |Backup iniziale del target vuoto, inventario ruoli/ACL senza password; restore rehearsal su clone separato |AU04 per backup; AU09 per clone/restore/costo e operazione distruttiva sul clone |Confronto normalizzato gestito, non restore di auth/storage/schema di sistema su primaria |
| S05 |Probe minimi su principal sintetici di scratch: create/NOLOGIN/worker/ownership/TLS/session_user/finalizzazione atomica |AU04: DDL di probe espressamente incluso, non sola lettura |T01–T05; se manca delega/privilegio necessario, ARCHITECTURE BLOCKED prima dell'integrazione |
| S06 |Applicare baseline storica SerieN, poi fixture legacy iniziale e quattro migrazioni6A.3–6A.8 nell'ordine sotto |AU05: DDL applicativo e fixture sintetica |Ogni fase confrontata al manifest atteso; errore→STOP, non patch on the fly |
| S07 |Generare A/B già workspace-scoped e checkpoint sintetici confermati, due owner storici distinti e dieci tabelle non vuote |AU05: popolamento sintetico e due Auth iniziali |Manifest integrale iniziale48righe applicative+2head come forma attesa; conteggi esatti dipendono dall'adapter approvato |
| S08 |Backup/manifest prima di D10, freeze completo; applicare solo migrazione ownerless approvata |AU05 per DDL; AU09 se restore rehearsal aggiuntivo su clone |FK Auth sostituite senza UPDATE snapshot/receipt; nessuna differenza storica |
| S09 |Eliminare esclusivamente i due Auth sintetici della fixture dopo distacco, verificare Auth0 |AU05 include questa cancellazione sintetica; ogni altra cancellazione vietata |Zeroauth e manifest uguale, ledger storico risolto,7domain FK ancora valide |
| S10 |Creare C/D dal job privato workspace, ownerNULL/head0 senza snapshot inventati |AU05 |Nessuna INSERT Auth, nuova ownership e vincoli corretti |
| S11 |Preparare principal NOLOGIN, secret/job/approvazione, pairing e complete transazionale |AU06: adapter/packaging approvati e cerimonia operatore; AU03 servizi |Ruoli e secret versionati, nessun privilegio amministrativo al broker |
| S12 |Attivare unico host/broker e solo poi ingresso HTTPS; fare smoke signed C/D |AU03/AU06: deploy/configuration e downtime espliciti |T06–T18 e fencing; READY solo dopo tutti i gate precedenti |
| S13 |Carico e fault di processo controllati, errori/quote, Data API negativi |AU07 per profili e AU08 per fault/downtime |Separare ordinario/lock/fault, veri PGbackend e costo; nessun secondo pool attivo |
| S14 |Manifest finale dati/schema/ACL/ruoli/defaults, report limiti e spesa |AU04 per letture finali |Tutti i test eseguiti identificati, FAIL/NV non nascosti; audit Regia prima di estendere |
| S15 |Chiudere ingresso/nuove attivazioni, export evidenze/backup, sospendere o eliminare solo risorse elencate |AU10: cleanup remoto/costo/retention; eliminazione dati richiede autorizzazione esplicita |Inventory di risorse residue e costi ancora attivi, conferma finale del billing owner |

S04/S08 sono gate restore preliminari. La loro autorizzazione **non è inclusa**
nella prima esecuzione condivisa: si svolgono prima su clone dedicato dopo AU09.
Se il clone o il costo non sono approvati, fermarsi prima di modificare lo schema;
non saltare il rehearsal per dichiarare staging pronto. R01–R06 post-write/host
richiedono ulteriori scenari AU09, non seguono automaticamente S13.

## 2. Baseline e migrazioni, ordine esatto

| Ordine | File immutabile / intervento | Prerequisito |
|---|---|---|
| 0 |Inventario piattaforma; NON `tests/db/6A3/bootstrap.sql` |Auth/anon/authenticated sono quelli gestiti, nessuno stub o superuser simulato |
| 1 |[Core storico](../../../tests/db/6A3/20261029230530_serien_core_schema.sql) |Tabelle SerieN assenti; dipendenze gestite verificate |
| 2 |[Constraints storici](../../../tests/db/6A3/20261029230558_serien_constraints_security.sql) |Core presente; applicazione amministrativa controllata, transazione dove compatibile |
| 3 |Fixture legacy sintetica validata, due owner iniziali distinti |Adapter nuovo revisionato, niente dati reali; ancora nessuna D10 |
| 4 |[Expand6A.3](../../../supabase/migrations/20261104165408_serien_workspace_expand.sql) |Schema storico completo, worker/authorizer non precreati in conflitto |
| 5 |[Atomic checkpoint6A.4](../../../supabase/migrations/20261104172819_serien_atomic_checkpoint.sql) |Expand completo |
| 6 |[History/integrity6A.5](../../../supabase/migrations/20261104175236_serien_history_integrity.sql) |Atomic completo |
| 7 |[Lifecycle6A.8](../../../supabase/migrations/20261104231109_serien_capability_lifecycle.sql) |Grant/creator/owner e ACL verificati |
| 8 |A/B e prime revisioni, limiti/profili sintetici e manifest pre-D10 |Procedure/provisioning fuori banda validati |
| 9 |[Ownerless6A.10](../../../supabase/migrations/20261105090212_serien_ownerless_cutover.sql) |Backup/restore preliminare verificato, legacy non vuoto e freeze |
| 10 |Auth0 poi C/D e principal/browser |Nessuna riscrittura dei record storici |

La directory root contiene cinque migrazioni additive, non i due file iniziali.
Un db push su un nuovo progetto vuoto non è quindi sufficiente. Registrare hash,
creator, transazione, esito e applicazione una sola volta per ogni file; non
registrare una migrazione come applicata se è stato fatto solo il seed locale.
Nessun apply automatico di un file fallito; ROLLBACK della sua transazione e review.
I due SQL storici senza wrapper esterno non si presumono atomicamente applicati:
preparare la cerimonia transazionale, verificare DDL non transazionale e dipendenze.
Non usare CREATE OR REPLACE o DROP CASCADE per sopprimere un conflitto di piattaforma.

## 3. Adattamento della fixture, non dei contratti

I runner6A.3–6A.11 creano PG isolato e non accettano DSN remoto; non modificarli per
puntarli allo staging. `fixture.seed` invoca bootstrap Auth fittizio e login locali
senza il percorso gestito: non eseguirlo così com'è sul nuovo servizio.

Serve un **nuovo adapter staging**, da implementare soltanto con incarico specifico:
crea esclusivamente i due utenti iniziali sintetici tramite percorso Auth gestito
approvato, senza email reali/invii; usa gli UUID restituiti per generare i record
prima del manifest. Se richiede una chiave amministrativa Auth, custodirla solo
sulla postazione fixture e rimuoverla dal percorso dati; mai nel frontend/broker.
Se nessun percorso Auth sintetico sicuro è approvato, fermarsi prima del seed.

Riprodurre stessa forma di grafo, profilo chiuso, snapshot/receipt validi e A/B
compatibili, senza cambiare ID/payload di record già confermati. Non pretendere che
UUID/timestamp di una nuova fixture coincidano byte per byte con un altro run:
il confronto rigoroso è **prima/dopo nello stesso target**, con identità/payload/
digest/versioni/result/auth_context/timestamp e relazioni conservati. Conteggi
non bastano; ogni differenza di forma attesa va spiegata e approvata prima del seed.
Dopo D10 eliminare solo i due account della fixture; qualsiasi utente inatteso è
STOP, non invito a `DELETE FROM auth.users` indiscriminato sul gestito.

Default ACL e ownership vanno inventariati per ogni creator prima e dopo ciascuna
fase, includendo ruoli piattaforma. Schema serien_capability non esposto; ingresso
chiuso e Data API disabilitata finché il gate di esposizione non è completo.
Qualunque adattamento DDL necessario al gestito deve essere proposto separatamente:
nessuna modifica retroattiva alle migrazioni approvate per far passare il test.

## 4. Artefatti della futura esecuzione e rollback

Conservare: scheda approvata, versioni/help, hashes dei file, inventory normalizzati,
manifest dati integrali sintetici, diff schema/ACL, principal/session_user/PID,
request_id e status redatti, COMMIT/receipt, metriche reali per profilo, preventivo
vs consuntivo, manifest dei backup/restore e cleanup. Niente password/hash, token,
kit/pepper, chiavi private o dump dei secret; niente SQL completo con valori sensibili.
Le password non si recuperano da pg_dumpall: sono versioni nel secret manager.
Non ripristinare ruoli gestiti o ownership platform da un dump vanilla senza review.

Prima COMMIT DDL: rollback transazionale e confronto catalogo/ruoli/dati.
Dopo Auth0 o prime scritture ownerless: contenimento/read-only/forward-fix; mai
ricreare Auth per soddisfare una FK, ripristinare NOT NULL owner o riscrivere archivi.
Restore post-write solo su clone dopo AU09 e riconciliazione; auditlog compatto non
contiene payload sufficienti a ricostruire checkpoint. Mancanza di replay completo
significa NO-GO alla riapertura, non perdita silenziosa accettata da questo runbook.

Cleanup: elenco esatto di ref/host/service/volume/IP/secret/log/backup e retention,
nessun wildcard, nessun DROP OWNED o operazione su altri ambienti. Stop compute
non implica stop di EBS/IP/backup/log/subscription. Non cancellare evidenze prima
dell'audit; residui conservati hanno proprietario, scadenza e costo autorizzato.
