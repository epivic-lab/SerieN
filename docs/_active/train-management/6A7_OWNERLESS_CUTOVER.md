# 6A.7 — D10: cutover ownerless senza perdita dello storico

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Specifica proposta, solo progettazione; nessuna migrazione generata o applicata. Base `5d65a32ff392dabf7e57c040981598f5af398e05`, branch `feature/train-management`. Dipende dall'approvazione di [D09](6A7_ARCHITECTURE_DECISIONS.md), non dalla sua implementazione implicita. La produzione resta intatta.

## 1. Raccomandazione unica D10

**Nuove righe workspace con owner_id NULL; vecchi owner conservati come provenienza immutabile, riferiti a un registro privato di identità legacy senza FK ad Auth.** Conservare i due domini di ownership già approvati (`legacy:<owner>` e `workspace:<id>`), rendendo obbligatoria e non nulla la chiave di dominio e tutte le relazioni composite necessarie. Nessuna creazione di utenti Auth, nemmeno nascosti o anonimi.

È più sicuro che azzerare owner_id in massa: i trigger 6A.5 vietano UPDATE/DELETE a snapshot e ricevute e i riferimenti/digest storici non vanno riscritti. Non si disabilitano questi trigger per migrare l'ownership. Le righe workspace già esistenti possono conservare owner_id storico non nullo come provenienza, mai come autorità Auth. Le nuove righe sono prodotte da procedure private che impongono owner_id NULL.

Il cutover minimo non sposta automaticamente gli archivi legacy nel dominio workspace e non promette di rendere restaurabile un vecchio DTO incompleto. Il backfill riguarda il registro di provenienza e il manifest delle dipendenze; tutti gli ID e dati applicativi storici rimangono uguali. Una promozione legacy→workspace che tocchi layout/snapshot immutabili richiederebbe un altro contratto: **non** aggiornare soltanto le radici lasciando figli nel vecchio dominio, non clonare identità o ricalcolare digest per far superare i vincoli.

Questa scelta completa il piano 6A.1 di owner nullable/eventuale provenienza conservata, senza riscrivere i contratti approvati. Non elimina la colonna owner_id: elimina la dipendenza operativa da auth.users e i suoi cascades.

## 2. Inventario verificato sul checkpoint

Fonti: `tests/db/6A3/20261029230530_serien_core_schema.sql`, `20261029230558_serien_constraints_security.sql`, migrazioni `20261104165408`, `20261104172819`, `20261104175236`; evidenze di catalogo 6A.1/6A.3 e gate 6A.6. Non è una nuova osservazione del catalogo reale. Prima di ogni applicazione futura fare inventario aggiornato in staging; non assumere che i vecchi conteggi zero siano ancora veri.

Tutte le **otto** tabelle seguenti hanno oggi owner_id NOT NULL, DEFAULT auth.uid() e FK diretta ad auth.users ON DELETE CASCADE. Tutte hanno workspace_id nullable e ownership_key generata dall'expand.

| Tabella | Dipendenze e indici da coprire | Target D10 |
|---|---|---|
| stock_items | FK model_id RESTRICT; UNIQUE(id,owner_id), UNIQUE(owner_id,inventory_code); UNIQUE(id,ownership_key) | Owner nullable senza default; provenienza privata; unicità inventory nel dominio; modello/ID/orientation/settings invariati |
| consists | UNIQUE(id,owner_id), UNIQUE(id,ownership_key); ready deferred, revision | Owner nullable senza default; nessun cambio a stato/ordine/membri/revisioni |
| consist_members | FK(consist_id,owner_id) CASCADE e (stock_item_id,owner_id) RESTRICT; equivalenti ownership_key; UNIQUE stock_item_id e ordinal | Domain FK sempre operative con ID e ownership_key non nulli; FK owner compatibili col legacy, mai unica protezione |
| layouts | UNIQUE(id,owner_id), UNIQUE(id,ownership_key), UNIQUE(workspace_id,id); topology_hash/schema | Nuovo layout ownerNULL, workspace obbligatorio dal creator; hash canonico invariato |
| layout_placements | FK consist/layout con owner CASCADE e domain; FK(layout_id,edge_id) RESTRICT; ready/location trigger | Owner nullable, domain FK obbligatorie; Journey/s/heading/state_version invariati |
| loose_stock_placements | FK item/layout con owner CASCADE e domain; FK edge; esclusione membro/loose | Come placement; nessun bypass con ownerNULL o workspaceNULL |
| layout_snapshots | FK(layout_id,owner_id) CASCADE e domain; UNIQUE(layout_id,revision); tuple workspace/layout/id/revision/digest; immutabilità6A.5 | Nessun UPDATE delle righe; nuove INSERT ownerNULL; metadata/digest e FK di provenienza preservati |
| operation_receipts | PK receipt_id6A.5; UNIQUE(workspace_id,request_id); indice legacy parziale; FK composita snapshot; completezza contesto | PK/unique/result/auth_context e compatibilità retry invariati; nuove INSERT ownerNULL |

Altre due tabelle: `stock_models` è catalogo globale senza owner_id, non va trasferito al workspace; `layout_segments` eredita il dominio dal parent layout, FK layout CASCADE e PK(layout_id,edge_id), nessun owner proprio. La policy storica segments_owner_all dipende da layouts.owner_id e va ritirata dal percorso applicativo; le lunghezze/geometrie non cambiano.

Nel privato: workspaces/devices/invitations/recovery_verifiers/replay_nonces/locks/bindings/candidate_profiles/session_heads/api_limits/api_windows/audit_events non dipendono da Auth. Conservare tutte le FK workspace/device e head→snapshot→receipt, auth_epoch/key_version e gli ACL; non convertire l'applicativo owner scope in un LOGIN SQL owner.

## 3. Modello di provenienza e constraints target

### 3.1 Registro legacy, senza un secondo sistema di account

Una tabella privata proposta `serien_capability.legacy_owners` conserva soltanto gli UUID owner storici necessari e metadata di provenienza della migrazione (versione manifest/istante), senza email/password/JWT o nuove identità. PK id, niente FK ad auth.users, nessun DELETE/UPDATE runtime, nessun grant browser/broker/worker. Non è un account utilizzabile per autorizzare o creare workspace. Ruolo manutenzione separato per lettura del manifest.

Backfill: unione DISTINCT degli owner_id non nulli delle otto tabelle, con verifica della risoluzione Auth **prima** di togliere le FK, sotto freeze. Ogni UUID copiato deve provenire da dati verificati, non da valori inventati. Se non risolve il catalogo/manifest approvato, FAIL: niente placeholder. Non copiare indiscriminatamente tutti gli utenti o dati Auth.

Sostituire le otto FK dirette owner_id→auth.users con owner_id→legacy_owners(id) **ON DELETE RESTRICT**. Nella stessa migrazione transazionale aggiungere/validare i nuovi riferimenti prima di rimuovere i vecchi; nessuna finestra esterna senza vincolo. La referenza può essere nulla per righe ownerless. Gli owner storici rimangono presenti nel registro anche dopo eliminazione Auth. La FK è conservazione referenziale della provenienza, non membership/autorizzazione.

I CHECK e FK owner storici tra tabelle possono rimanere per le righe legacy; i loro parent continuano ad avere gli stessi owner_id e UNIQUE composite. Non devono essere usati per autorizzare nuove righe. Le azioni CASCADE interne al grafo non partono più dalla cancellazione Auth; il runtime non riceve DELETE parent e gli archivi immutabili impediscono cancellazioni a cascata. Una politica di erasure/retention futura necessita decisione separata: non è implicita nell'eliminazione di un account Auth.

### 3.2 Ownership totale e generated ownership_key

Espressione generata **conservata** su tutte le otto tabelle:

```text
CASE WHEN workspace_id IS NULL
     THEN 'legacy:' || owner_id::text
     ELSE 'workspace:' || workspace_id::text END
```

Vincoli target, pseudocodice dichiarativo non applicabile come migrazione:

```text
owner_id: nullable, nessun DEFAULT auth.uid()
workspace_id: FK privata ON DELETE RESTRICT, nullable solo per archivio legacy
CHECK (workspace_id IS NOT NULL OR owner_id IS NOT NULL)
ownership_key: GENERATED STORED, NOT NULL
ID di parent/child nelle relazioni domain: NOT NULL
```

| workspace | owner | Risultato strutturale | Percorso consentito |
|---|---|---|---|
| NULL | NULL | FAIL, CHECK e ownership_key NOT NULL | Nessuno |
| NULL | Owner storico valido | legacy:owner | Solo archivio preesistente; nessuna INSERT dal worker |
| Workspace valido | NULL | workspace:id | Nuovi workspace/proiezioni/snapshot/receipt |
| Workspace valido | Owner storico valido | workspace:id | Provenienza di righe workspace già esistenti; non autorizza Auth |
| Workspace inesistente | Qualsiasi | FAIL FK | Nessuno |

Un CHECK che restituisce NULL non rifiuta una riga in PostgreSQL [PG01 in D09]: usare test IS NOT NULL espliciti e NOT NULL, non `CHECK(ownership_key <> '')` come unica difesa. Il client non può fornire ownership_key generata. Aggiungere protezione di identità/domain per le righe mutabili: niente cambio di workspace/owner/PK da API runtime; i trigger immutabili già esistenti proteggono snapshot e ricevute. Ruolo manutenzione non condiviso con i login device.

### 3.3 FK composite e bypass NULL

Autorità relazionale rimane `(id,ownership_key)`, non `(id,owner_id)` né un workspace opzionale inviato dal client. Le relazioni domain già presenti coprono membri→consist/item, placement→consist/layout, loose→item/layout e snapshot→layout (sette FK in totale). I campi ID e ownership_key obbligatori rendono MATCH SIMPLE efficace anche quando owner_id è NULL. Non sostituire tali FK con `(id,workspace_id)` nullable sui dati legacy.

Per workspace attivo, FK workspace→workspaces obbligatoria e parent/child stesso domain. Per legacy entrambi devono avere lo stesso legacy owner; un figlio workspaceNULL non può collegarsi a parent workspace A. Provare tutti i mix parent/child di A/B/legacy e owner NULL/nonNULL. Le vecchie FK owner possono saltare su NULL: è atteso, ma non deve saltare nessuna domain FK. MATCH FULL non è una soluzione generale: su `(id,owner_id)` impedirebbe righe ownerless con ID non nullo; su tuple interamente NULL consente comunque il bypass.

Ricevute workspace: il CHECK6A.3 obbliga layout_id/snapshot_id/revision quando workspace è presente; digest è già NOT NULL. Conservare e testare quelle completezze e le FK a snapshot. Head: revisione0 ammette solo tutti i riferimenti NULL; revisione>0 li richiede tutti non nulli. Conservare FK composite complete e head→receipt deferred, con SET CONSTRAINTS ALL IMMEDIATE prima del commit. Nessuna nuova testa appesa a uno snapshot legacy incompleto.

Inventory_code: prima verificare duplicati per ownership_key, anche fra righe con diversi owner legacy nello stesso workspace. Se esistono, FAIL con manifest del conflitto, niente rinomina automatica. Proporre UNIQUE(ownership_key,inventory_code) per inventory_code non nullo e rimuovere l'unicità globale `(owner_id,inventory_code)` solo dopo validazione della nuova, affinché due workspace con stessa provenienza siano indipendenti. UNIQUE(id,owner_id) restano finché le FK legacy le referenziano. Nessuna variazione alla deduplica receipt6A.5.

## 4. Policy, privilegi e API

- I nuovi workspace sono creati soltanto da procedura control-plane separata e approvata. Il gateway dati non sceglie workspace/owner né scrive registry/layout/catalogo raw.
- Ritirare dal percorso dati tutte le policy legacy `*_owner_*`, `segments_owner_all` e `stock_models_signed_in_read`, senza dare grant anon/authenticated. Non basta ownerNULL: una riga workspace con owner storico potrebbe altrimenti tornare leggibile da Auth se venisse concesso un grant. Legacy archive è negato al ruolo worker; eventuale lettura di manutenzione usa un ruolo privato non pubblico.
- Conservare RLS enable e FORCE dove già presente, executor NOLOGIN/NOBYPASSRLS non proprietario delle tabelle, predicati `session_user` e binding coerenti. SELECT del parent protegge layout_segments. USING e WITH CHECK separati per modifiche. Nessuna policy true temporanea; il catalogo globale resta immutabile per il worker.
- Verificare grant tabella, colonna, schema, sequenza, funzione, membership e default privileges per **ogni creator**, non soltanto postgres. Nuove funzioni private con search_path vuoto e nomi qualificati, revoca EXECUTE PUBLIC nella stessa transazione, solo grant necessari. Schema privato non esposto da Data API; esposizione di public non deve concedere accesso ai ruoli browser.
- `save_checkpoint`6A.5 deriva own da layouts e lo inserisce in snapshot/receipt: il codice letto non rifiuta ownNULL. Non assumere tuttavia che basti togliere NOT NULL: provare tutti i trigger e i percorsi read/recover/receipt. Non ampliare il validatore e non scrivere un owner inventato per soddisfare una INSERT.
- Le funzioni di creazione devono imporre ownerNULL per nuovi layout/item/consist/figli e creare tutti i dati del solo profilo approvato, con head0 e senza snapshot/receipt di successo inesistenti. Nessuna API pubblica di generazione geometrie o DTO arbitrari.

## 5. Procedura di cutover da autorizzare

1. **Preflight:** congelare tutte le scritture applicative e control-plane; drenare transazioni/lease. Inventariare pg_constraint/pg_depend, trigger/funzioni/policy/ACL/view/default privileges e dipendenze esterne sul catalogo effettivo. Verificare esattamente le otto FK Auth attese e ogni eventuale dipendenza aggiuntiva: differenze bloccanti, nessun DROP CASCADE. Non dedurre zero utenti o zero dati dai rapporti precedenti.
2. **Backup/manifest:** dump schema+dati+ACL e mapping owner storico→registro; inventario ruoli e segreti solo tramite riferimenti sicuri. Ripristino provato su copia isolata. Annotare tutti i PK, head/revision, snapshot payload/digest/metadata, receipt result/context/timestamp e proiezioni legacy. Non pubblicare dati reali nel repository. Freeze resta fino a verifica completa.
3. **DDL transazionale:** creare/backfill registro legacy, validare nuove FK, togliere le sole FK Auth inventariate; togliere default/NOT NULL owner, imporre ownership totale e NOT NULL generated, validare domain FK e inventory uniqueness; aggiornare ACL/policy e protezione del domain. Tutto in una transazione con lock ordinati e timeout. Nessun UPDATE di righe applicative storiche o disabilitazione trigger. ROLLBACK su qualunque differenza; indici non-concurrent nel primo rehearsal sotto manutenzione, tempo di lock da misurare prima di un'applicazione gestita.
4. **Verifica prima apertura:** comparare ogni riga storica al manifest, incluse snapshot/receipt e timestamp; dimostrare zero FK residue ad auth.users nelle tabelle SerieN e nessun percorso transitivo Auth→dati. Verificare query/read-receipt/recovery del profilo workspace esistente e dinieghi legacy/cross-workspace. Commit di schema non significa ancora riaprire scritture.
5. **Prima scrittura ownerless:** creazione operatore di nuovo workspace con ownerNULL, catalogo/topologia già approvati; pairing key-bound e grant D09, API firmate read/save/recover. Verificare snapshot/proiezioni/head/receipt atomici. Annotare la prima revisione ownerless durevole: cambia il piano di rollback.
6. **Apertura limitata:** solo dopo PASS locali e staging separatamente autorizzato e audit Regia. Monitorare dinieghi, storage, code e rate senza payload/firme/secret. Nessun deploy o uso cloud autorizzato da questo documento.

Non è previsto un backfill che assegni indiscriminatamente un workspace per auth user. Le identità e il materiale storico si conservano nella loro ownership originale. Per i dati già workspace-scoped dell'expand si conserva il medesimo workspace e owner di provenienza senza UPDATE. Eventuale catalogo reale più complesso o legacy da importare nel simulatore resta fuori dalla correzione minima.

## 6. Collaudo obbligatorio: legacy non vuoto e zero Auth per nuovi workspace

Tutti i casi seguenti sono **NOT VERIFIED, piano futuro**. Estendere gli harness isolati, non eseguire SQL sul Supabase reale. Fixture sintetiche; nessun nuovo utente Auth per aggirare i vincoli.

| Test | Preparazione/azione | PASS obbligatorio / FAIL bloccante |
|---|---|---|
| O01 dataset misto | Prima del cutover: due owner storici, dieci tabelle non vuote, loose/membri/ready, snapshot e ricevute legacy; anche A/B già workspace-scoped6A.5 | Manifest di ogni riga/constraint/ACL; nessun dataset vuoto presentato come conservazione |
| O02 backfill provenienza | Applicare il solo piano su PostgreSQL17 isolato | Registry contiene gli owner effettivi, zero account aggiunti; righe applicative byte/valore identiche |
| O03 nessuna dipendenza Auth | Eliminare **solo nella fixture** tutte le righe auth.users dopo distacco, quindi creare nuovi workspace C/D con ownerNULL | COUNT(auth.users)=0 mentre legacy e A/B rimangono non vuoti; nessuna FK/transitive cascade Auth residua |
| O04 schema ownerless | Tutte le otto tabelle nuove C/D con ownerNULL; segments/models invariati | Inserimenti/checkpoint ammessi senza default auth.uid; owner mancanti non compensati da account fittizi |
| O05 NULL matrix | Tutte le combinazioni della tabella§3.2, ID/FK incompleti, generated override | NULL/NULL e tutti i bypass respinti atomicamente; nessun FK silenziosamente evitato |
| O06 graph A/B/legacy | Parent e child incrociati per ogni domain FK, ownerNULL incluso | Zero collegamenti trasversali; test diretto sotto ruolo di manutenzione per non confondere un diniego ACL con vincolo effettivo |
| O07 railway | Locomotiva ordinal0, wagon dopo, ready contiguo deferred, member/loose esclusivi, edge/layout/s/heading, topology/STOPPED/otto booleani | Stessi errori/rollback6A.3–6A.6; Journey e posizione sintetici preservati; nessun nuovo test restore generale dedotto |
| O08 atomicità | Fault in sei sub-step, deferred failure, backend kill e timeout; commit con risposta persa | Snapshot/proiezioni/head/receipt precedenti o nuovi interi; nessuna modifica legacy |
| O09 CAS/idempotenza | Due device C, due workspace C/D stesso request_id, retry dopo head avanzato e risposta persa; ID cambiato di digest/layout/attore | Un CAS vincitore; una receipt/request_id/workspace; mismatch rifiutati; receipt_id e indice legacy preservati |
| O10 storico/recovery | Read/history/receipt, fonte integra/corrotta, recovery nuova revisione | Payload, digest, result, request_context, auth_context e timestamp storici invariati; nessuna UPDATE archivio |
| O11 Auth delete | Eliminazione utenti storici nella fixture e tentativo DELETE su legacy_owners referenziato | Auth delete non tocca SerieN; ledger delete RESTRICT; nessun trigger immutabile disabilitato |
| O12 autorizzazione | Anon/authenticated/worker/revoked device, reader/editor/owner, grant raw e helper alternativi, default ACL nuovi oggetti | Zero accesso pubblico/legacy/cross-workspace; revoca anche su sessione calda; nessun broad authorizer nel worker |
| O13 unicità inventario | Stesso codice in due workspace e due volte nello stesso; legacy con stesso owner | Cross-workspace indipendente; duplicato nello stesso domain rifiutato; preflight non corregge i dati |
| O14 rollback/recovery | Errore a ogni punto DDL; poi errore dopo prima scrittura ownerless | Prima: schema/ruoli/dati identici. Dopo: read-only/forward-fix o restore+replay approvato, nessun owner Auth fittizio |

O03 è più forte di mantenere semplicemente un utente Auth legacy: prova contemporaneamente legacy non vuoto, nuovo workspace funzionante e **zero utenti Auth nell'intero DB isolato**. Un conteggio zero prima di caricare i dati non basta.

## 7. Rollback e recovery

**Prima del commit DDL:** rollback transazionale dell'intero cambio, inclusi ledger/ACL; confrontare manifest schema/ruoli/dati. Nessuna modifica a credenziali live fino a PASS del rehearsal.

**Dopo DDL ma prima delle nuove scritture ownerless:** lasciare il percorso disabilitato e lo schema espanso se sicuro. Un ritorno allo schema precedente richiede che tutti gli owner risolvano ancora Auth e che tutti i vecchi NOT NULL/unique/FK siano soddisfatti. Se Auth è già stato eliminato, il ritorno non è una semplice down: forward-fix o restore approvato. Non ricreare account per far passare FK.

**Dopo la prima scrittura ownerless o eliminazione Auth:** non reimporre owner NOT NULL o vecchie cascades, non azzerare nuovi workspace. Fermare scritture, conservare lettura/esportazione e applicare forward-fix. Se serve restore: backup verificato più export durabile di tutti i checkpoint/ricevute confermati dopo il backup, inventario idempotenza e replay validato su copia con catena CAS; conservare snapshot originali e riconciliare tutte le ricevute prima della riapertura. Se replay/durabilità non sono dimostrati, restare read-only e chiedere decisione Regia; nessuna perdita silenziosa.

Il log tecnico6A.5 non contiene payload sufficienti a ricostruire checkpoint: non spacciarlo per un WAL applicativo. PITR e durabilità storage richiedono test e autorizzazione staging specifici. Nessuna procedura di recovery autorizza un restore reale in questa microfase.

## 8. Approvazioni e limiti

Richiesta D10: approvare provenienza privata non Auth, conservazione legacy nel proprio dominio e policy di ritiro dell'autorità Auth; non è ancora approvata una politica di cancellazione/retention o una promozione dei backup legacy. Accettare il costo di una tabella di provenienza e delle FK/ACL nuove in cambio di zero riscritture di snapshot/ricevute.

Fasi SQL, creazione workspace, test avversari e staging richiedono autorizzazioni successive nel [piano](6A7_EXECUTION_PLAN.md). D10 è solo specificata: **ownerless PASS non dichiarato**. Nessun serializer/hydrator, catalogo generale, simulatore, geometria o 6B implementati.
