# 6A.12-R — Piano minimo di migrazione della produzione

**SOLO PIANO — nessun DDL/DML, deploy, configurazione o backup reale eseguito.**
5 novembre 2026, Europe/Rome. Destinazione unica futura: Supabase SerieN
`vehfrjgifzjjgamrgwze`; nessun progetto/branch staging, nessun import di main.
Base Git `55d6bd6ef8211e9f136468090ff195f4ac791bde`, `feature/train-management`.

## Audit reale eseguito in sola lettura

Strumenti autorizzati Supabase: get_project/get_organization/list_migrations,
list_tables/list_edge_functions/get_advisors e SELECT su cataloghi/conteggi.
Nessuna lettura di email, password, JWT, chiavi, payload utente o valori segreti.
Una sessione esplicitamente READ ONLY per cataloghi/policy; gli altri statement
sono sole SELECT, senza funzioni applicative con effetti collaterali.

| Osservazione reale | Risultato al 5 novembre | Implicazione |
|---|---|---|
| Progetto/organizzazione | SerieN ACTIVE_HEALTHY, regione eu-west-3, organizzazione piano free | Free confermato, consumo mensile e disponibilità futura non certificati |
| PostgreSQL | 17.11.0.003, release GA | Rehearsal locale sulla stessa major; non inventare superuser gestito |
| Migration history | Solo 20261029230530_serien_core_schema e 20261029230558_serien_constraints_security | Le cinque migrazioni6A.3–6A.10 nel repo NON sono applicate |
| Dati pubblici | Dieci tabelle, conteggio esatto0 per ognuna | Nessuna conclusione su dati futuri o dipendenze Auth esterne |
| Auth | COUNT(auth.users)=1, senza identificare l'utente | Preservare; non eseguire pulizia Auth |
| Storage |0bucket/0oggetti | Ripetere prima del deploy e includere eventuali oggetti nel backup |
| DB size |12.031.667 byte, misura fisica pg_database_size | Indicativo, non lettura della metrica di fatturazione o quota residua |
| Edge Functions |Nessuna | Non esiste un gateway hosted operativo da migrare |
| RLS |Abilitata su tutte le dieci tabelle | RLS presente non equivale a nuovo confine capability approvato |
| FK Auth |Otto owner_id→auth.users ON DELETE CASCADE | Blocca qualunque cancellazione Auth senza inventario e distacco verificati |
| Policy |13policy public, prevalentemente owner/auth.uid e catalogo signed-in read | Non riutilizzarle come isolamento workspace senza revisione |
| ACL tabelle |SELECT role_table_grants: nessun grant tabella anon/authenticated,70 grant service_role sulle10tabelle | Non confondere policy esistenti con accesso attivo; inventario colonna/PUBLIC/membership resta necessario |
| Funzioni custom |9funzioni serien_internal, invoker, ACL postgres; nessuna custom public osservata | Nessun ingresso capability attuale; non esporre helper per comodità |
| Trigger |Vincoli ferroviari/touch/check_snapshot iniziali, nessuna immutabilità6A.5 distribuita | Immutabilità target va installata e verificata prima dell'apertura |
| Advisors security |1WARN leaked password protection disabled | Annotato; nessuna impostazione cambiata, nessuna promessa di assenza di altre vulnerabilità |

Conteggi esatti0: `stock_models`, `stock_items`, `consists`, `consist_members`,
`layouts`, `layout_segments`, `layout_placements`, `loose_stock_placements`,
`layout_snapshots`, `operation_receipts`. Schemi non di sistema osservati:
auth/extensions/graphql/graphql_public/public/realtime/serien_internal/storage/
supabase_migrations/vault. serien_internal non contiene tabelle applicative.
Il risultato è una fotografia, **non un backup né un inventario completo delle
dipendenze di tutti gli schemi/servizi**. Impostazioni exposed schemas/Data API,
Auth providers/rate limits, SSL enforcement, pooler, quote correnti e credenziali
runtime non lette: NOT VERIFIED. Tutto va riletto prima dell'azione produttiva.

## Delta minimo proposto, subordinato alla scelta W

Non applicare in blocco la cartella migrations: le cinque proposte locali
comprendono assunzioni D09 ora in revisione. Le due migrazioni iniziali sono già
reali e non vanno rieseguite. Preparare in una fase autorizzata migrazioni nuove,
versionate, con inventario precondizioni e help CLI corrente.

| Pacchetto futuro | Riutilizzo e aggiunte | Rischio/condizione |
|---|---|---|
| M1 Expand | Workspace/device/lock/head, domini ownership, catalogo compatibilità, archivi e vincoli6A.3–6A.5 | Solo additive prima; nessun seed fittizio Auth né modifica a ID/storico |
| M2 Confine W | Nuovi ruoli NOLOGIN/executor e login runtime minimo, issuer/kid/claim/contesto, API chiuse v1, RLS legata a contesto verificato | Sostituisce dipendenze session_user/device; niente SET ROLE/GUC come prova, PUBLIC EXECUTE revocato nella stessa transazione |
| M3 Ownerless | Ledger provenienza, owner nullable senza auth.uid, generated domain NOT NULL e sette FK composite, nuovi inserimenti ownerNULL | Add-before-remove delle otto FK: validare RESTRICT sul ledger prima del solo distacco Auth atteso; nessun DROP CASCADE |
| M4 Lifecycle | Bootstrap limitato, pairing/recovery/rotazione key-bound e registry transazionale | Nessun provisioning ruoli/password per device, niente approvazione pubblica generica o authorizer ampio |
| M5 Apertura | Funzione Edge v1, segreti gestiti, flag server/client chiusi, compatibilità/ref/build | Nessuna feature pubblica finché gate dedicato non passa |

Le rimozioni mirate M3 di vincoli/default e l'eventuale ritiro policy non sono
puramente additive: eccezione minima motivata all'indipendenza ownerless, con
lista esatta di oggetti revisionata e rehearsal/rollback. Prima aggiungere e validare
le protezioni sostitutive; fermarsi su qualsiasi drift. Non aggiornare owner_id dei
dati storici, non disabilitare trigger, non ricalcolare digest/receipt/result/timestamp.
Nessuna copia cieca delle policy legacy o grant service_role alla nuova identità.

## Gate prima di qualsiasi modifica reale

1. **Decisione Regia sul modello**, inclusi D09/trust/L01 e D10. Specifica eseguibile
   di M1–M5 con diff e minacce, senza fasi implicite o costi non autorizzati.
2. **Inventario fresco e freeze:** tabelle/PK/conteggi/hash, pg_depend/FK/trigger,
   funzioni/view/owner/search_path, RLS ENABLE/FORCE, ACL colonna/schema/sequence,
   membership/default privileges di ogni creator, esposizione Data API, Auth e
   dipendenze esterne, Storage e integrazioni. Solo ref esatto; se differisce dal
   manifest, STOP e nuova revisione. Feature flag non sostituisce freeze delle
   scritture di integrazioni preesistenti.
3. **Backup esportabile e leggibile:** dump consistente schema+dati+ACL più ruoli
   custom non segreti, manifest PK/hash/head/receipt e confini transazionali.
   Inventariare esplicitamente Auth, storage metadata/oggetti e configurazioni non
   coperte dal dump standard: non dare per incluso uno schema escluso dalla CLI.
   Proteggere cifratura e permessi, checksum, conservare copia fuori dal DB e dal
   repository pubblico. Segreti solo riferimenti/versioni, mai valori nel manifest.
4. **Verifica backup:** listare archivio e leggerne schema/dati; restore su PostgreSQL17
   effimero locale con ruoli/schema Supabase necessari e confronto righe/constraint/
   ACL. Nessun progetto remoto clone/staging. L'eventuale dump Auth reale rimane
   privato e va gestito con accesso minimo. Se il restore completo non è possibile,
   gate BLOCKED; conteggi o dump vuoto non equivalgono a backup verificato.
5. **Rehearsal locale completo:** ricreare lo schema remoto osservato e applicare
   esattamente le migrazioni candidate; fixture mista legacy non vuota e nuovi
   workspace A/B/C/D. Tutti i casi6A.3–6A.11 pertinenti, crypto/isolamento/replay/
   claimCOMMIT/datiROLLBACK, RLS/pool leakage, revoca calda, CAS/receipt/history,
   fault ogni substep e restore verificato. Test Chromium/Firefox/WebKit oltre a
   npm test, JMRI e build. Nessun requisito hardware dichiarato verificato da hash.
6. **Piano operativo concreto:** window, backup verificato, artifact SHA, versioni,
   target/ref, timeout lock/statement, comandi esatti da help CLI, checklist SQL
   pre/post, soglie e operatore di contenimento/forward-fix. CLI3 cambia target e
   conferma mutazioni: pin versione, niente `latest` o comandi copiati alla cieca.
7. **Approvazione della Regia sulla specifica modifica produttiva** dopo i risultati
   precedenti. Solo allora DDL controllato, funzione chiusa, segreti e verifiche
   gestite del nuovo confine. Nessuna autorizzazione attuale a quella esecuzione.

Il deploy futuro può provare l'integrazione sul solo progetto reale con flag
server spento per il pubblico e workspace canary isolato, dopo backup e approvazione
esatta di quelle scritture/test. Non si definisce questo un progetto staging.
Niente kill/fault distruttivi sui dati reali: fault injection rimane locale.

## Attivazione e contenimento futuri

Flag persistente server `DISABLED → CANARY → ENABLED` controllato fuori data plane;
lettura autoritativa SQL ad ogni operazione con default DISABLED anche su errore.
Il client nasconde i comandi incompleti ma non abilita permessi server. Bootstrap,
claim e dispatch devono rispettare il flag; nessun rollback del frontend lo bypassa.
Durante canary isolare scope/workspace approvati, verificare nonce/revoca/SQL-session
identity e cap aggregato senza saturare servizi condivisi. Apertura generale solo
con ulteriore gate di esito, recupero e budget misurati.

| Momento del guasto | Azione sicura | Condizione per riprendere |
|---|---|---|
| Prima COMMIT DDL |ROLLBACK e confronto schema/ACL/righe al manifest |Stato esattamente precedente, nessun secret/flag attivato |
| DDL committato, nessuna scrittura nuova |DISABLED; lasciare expand sicuro o down mirato solo se precondizioni verificate |Nessun riferimento ownerNULL incompatibile, vecchi owner ancora validi; revisione del down |
| Prima scrittura ownerless o nuova revisione |Disabilitare nuove ammissioni, drenare, conservare claim/receipt e dati; forward-fix preferito |Nessun ritorno a NOT NULL/Auth fittizio o riscrittura storica |
| ACK perso |Stesso envelope/request_id, nuova proof/nonce; read receipt dopo autorizzazione |Receipt e COMMIT verificati; mai doppia revisione |
| Secret/issuer compromesso |DISABLED, revoca kid/login e verifica sessioni, rotazione fuori banda, audit |Nessuna riabilitazione di chiavi compromesse per rollback |
| Restore necessario dopo scritture |Freeze completo, export delta e ledger, restore+replay revisionato come operazione separata |Confronto ogni revisione/receipt e nonce; nessun rollback a vecchi nonce ancora accettabili |

Il restore non deve riaprire revoche/epoch o rendere riutilizzabili proof vecchie:
invalidare generazione issuer e ammettere solo chiavi/epoch correnti prima di
READY. RPO/RTO vanno dichiarati e provati; Free non include garanzia PITR o backup
giornaliero scaricabile. Un backup pre-migrazione non garantisce recupero senza
perdita dei commit successivi. Nessun RPO0 o disaster recovery completo rivendicato.

`main` e `.github/workflows/pages.yml` restano immutati: push su main pubblica Pages.
Un'eventuale integrazione frontend richiede autorizzazione distinta. Questo piano
non esegue alcuno dei suoi passi mutanti. **STOP6A.12-R.**
