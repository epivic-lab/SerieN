# 6A.3 — Espansione schema PostgreSQL, solo collaudo isolato

R0, 6A.1 e 6A.2 approvate dalla Regia. Baseline Git `f64bdc8291a9c51a29c60076bae303e91e6e1d26`, branch `feature/train-management`; main R1 invariato. Contratti 6A.1 e matrice R0 P01–P18 conservati senza rinumerazioni. Nessuna migrazione applicata al Supabase reale.

## Migrazione e riproduzione

Proposta: `supabase/migrations/20261104165408_serien_workspace_expand.sql`. Nome e versione creati da **Supabase CLI 3.0.0**, mediante `supabase migration new serien_workspace_expand`; help consultato prima dell'uso. La CLI è stata eseguita in un container effimero per non scrivere nel filesystem home di sola lettura dell'esecutore. Nessun link al progetto remoto, push DB o credenziale. I file storici non erano nel repository: le due migrazioni applicate sono state estratte in sola lettura da `supabase_migrations.schema_migrations` e copiate immutabili in `tests/db/6A3/`, come baseline di test, non come nuove migrazioni da applicare a produzione.

Dalla root, con Docker locale disponibile:

```sh
python3 tests/db/6A3/run.py
```

Il runner usa il socket Docker locale esplicito, elimina i selettori di daemon alternativi soltanto nel proprio subprocess e crea un nuovo container con nome casuale. PostgreSQL **17.11**, immagine fissata per digest, rete `none`, nessuna porta pubblicata, dati in tmpfs; rimozione nel finally. Non accetta URL DB o password, non legge credenziali produttive. `SERIEN_DB_EVIDENCE` indica soltanto una directory locale di output. I due login di prova A/B sono creati esclusivamente nel container con auth locale trust: non sono ruoli o account Supabase. Il runner non avvia altri servizi.

Baseline Auth locale: soltanto `auth.users(id)` e stub `auth.uid()` per ricreare le FK/policy storiche. Non rappresenta il servizio Auth o PostgREST. Le dieci tabelle vengono popolate con fixture sintetiche prima dell'espansione. Schema prima/dopo, diff e dati sono nelle [evidenze](evidence/6A3/REPORT.md). La migrazione è una singola transazione DDL; il runner inietta anche un errore prima del COMMIT e confronta schema, ruoli e dati dopo rollback.

## Relazioni e fasi

**Expand eseguito soltanto nel test:** nuovi workspace/registry/head, colonne nullable workspace, FK e indici aggiuntivi. Owner e policy legacy rimangono; nessuna cancellazione o nuova Auth identity, nessuna riscrittura della topologia o dei payload. **Validate:** backfill sintetico con mapping esplicito in transazione e vincoli differiti; confronto dei dati e test avversari. **Cutover futuro:** rimuovere la dipendenza obbligatoria owner/Auth soltanto dopo autorizzazione e migrazione separata, definire API/privilegi di scrittura e test atomici in 6A.4. Non basta applicare questo file per avere un backend senza login funzionante.

Workspace e dispositivi sono indipendenti da auth.users. Le tabelle applicative in questa espansione conservano ancora owner_id NOT NULL e FK legacy: nuovi record applicativi senza owner storico **non sono ancora ammessi**. È una restrizione intenzionale dell'expand, non si creano shadow users per aggirarla. Prima di qualsiasi cutover deve essere approvata la gestione dei dati applicativi nuovi e dei record storici, inclusi i cascades Auth preesistenti. Nessun workspace viene dedotto da auth.uid() browser.

| Entità | Espansione e vincoli |
|---|---|
| `serien_capability.workspaces` | UUID PK, stato active/suspended, auth_epoch positivo; nessun FK Auth |
| `devices` | Device UUID, FK workspace, public JWK P-256 senza d, key_version, scope reader/editor/owner, epoch, revoked_at ed eventuale expires_at. Le CHECK verificano forma pubblica: la validità della curva/prova di possesso rimane compito del gateway |
| `invitations` | Challenge e invito sono un solo record pending: candidata/device/public key/fingerprint, scope, verifier hash, scadenza, approvazione owner e consumo/revoca. FK dell'approvatore nello stesso workspace; unique verifier; niente token in chiaro |
| `recovery_verifiers` | PK workspace/version, digest del verifier e versione pepper; un solo verifier attivo per workspace, consumo/revoca. Nessun pepper o recovery secret nel DB |
| `replay_nonces` | Device+nonce unici, workspace/device FK, key_version/epoch e scadenza; indice per raccolta scaduti. Scadenza non autorizza il riuso anticipato del nonce |
| `device_locks` | Riga di coordinamento distinta dal registry: workspace/device FK e marker. Worker può aggiornare soltanto il marker del proprio workspace, mai identità, chiavi, scope o revoca |
| `worker_bindings` | Associazione amministrativa tra identità SQL e workspace; il worker può leggere soltanto la propria riga e non può mutarla |
| `stock_items`, `consists`, `layouts` | workspace_id nullable, FK privata e ownership_key generata; unique identità/domain e indici workspace; colonne e vincoli storici preservati |
| `consist_members` | FK consist e item nella stessa ownership_key, oltre alle FK owner storiche; ordine/orientamenti e unicità item preservati |
| `layout_placements` | Consist/layout nello stesso domain; posizioni e segmenti validati dai trigger/FK storici, nessuna geometria nel nuovo layer |
| `loose_stock_placements` | Item/layout stesso domain; nuove journey_state e state_version nullable per non inventare la storia legacy. Prima di usarle per restore occorrerà validarne contenuto e completezza |
| `layout_snapshots` | Layout nello stesso domain, digest aggiuntivo nullable per dati storici; unique tuple workspace/layout/snapshot/revision/digest per riferimenti coerenti. Trigger hash, STOPPED e otto scambi invariati |
| `operation_receipts` | Provenance workspace/layout/snapshot/revision; dati completi obbligatori quando workspace non nullo; deduplica workspace/request_id e FK composita allo stesso snapshot/digest |
| `session_heads` | PK workspace/layout; revisione0 senza riferimenti oppure revisione positiva con snapshot/ricevuta/digest coerenti via FK composite. UPDATE richiede revisione maggiore e identità immutabile; non implementa CAS o SaveCheckpoint |
| `layout_segments` | Nessuna colonna workspace duplicata: ownership e RLS attraverso layout; geometria solo proiezione canonica server |
| `stock_models` | Resta catalogo globale; nessuna ownership cliente o scrittura del catalogo concessa al worker |

`ownership_key` è generata come `legacy:<owner uuid>` oppure `workspace:<workspace uuid>`. Non è fornita dal client e, conservando owner NOT NULL, non è mai nulla. Le FK composite non possono dunque essere saltate inviando workspace NULL. Si mantengono anche tutte le FK legacy: durante l'expand il vincolo è più restrittivo, non più permissivo. Il backfill deve aggiornare coerentemente radici e figli sotto vincoli differiti, non assegnare arbitrariamente dati a un nuovo workspace.

Il head è una riga bloccabile per il futuro CAS. La monotonia non prova atomicità, contiguità delle revisioni o autenticità del digest; tali proprietà richiedono la futura transazione che calcoli/verifichi digest e confermi snapshot, proiezioni, head e ricevuta insieme. Nessun nuovo RPC o funzione transazionale è stato implementato. Le sole nuove funzioni SQL sono trigger invoker di validazione del head, in schema privato con search_path vuoto ed EXECUTE negato al pubblico.

## Privilegi e responsabilità

RLS attiva su tutte le tabelle applicative; RLS ENABLE/FORCE sulle nuove tabelle private. Nessun grant anon/authenticated o PUBLIC sui dati nuovi/applicativi; policy authenticated storiche conservate ma senza grant. Nessuna funzione privilegiata in public e nessun SECURITY DEFINER aggiunto.

- `serien_tm_authorizer`: NOLOGIN/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB, DML soltanto sul registry e righe di coordinamento. Non può scrivere snapshot/head/catalogo. È un ruolo server privilegiato per l'autorizzazione, mai assegnabile al browser.
- `serien_tm_worker`: NOLOGIN/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB, SELECT su proiezioni del workspace assegnato e catalogo globale; UPDATE solo del marker lock. Nessun DML applicativo/head/snapshot ancora concesso, nessuna lettura chiavi/verifier o modifica registry. I privilegi futuri per il salvataggio devono essere un'altra consegna reviewable.
- Nei test, due login SQL distinti ereditano worker e hanno binding A/B. RLS deriva da **current_user e binding amministrativo**, non da GUC. Connessioni effettive come A/B provano che SET ROLE authorizer è negato; usare una connessione postgres che impersona A con SET ROLE non sarebbe una prova sufficiente di questa proprietà.

È una strategia di isolamento SQL del laboratorio da decidere per la futura configurazione di connessioni/provisioning; non implica ruoli per workspace già configurati in Supabase. Un gateway con accesso a tutte le identità rimane una frontiera privilegiata. Il futuro gateway verifica firma, scope, epoch, revoca, scadenza e approvazione prima di scegliere la connessione autorizzata. La riga di binding non sostituisce la prova crittografica e non implementa ancora revoca del device. Un SET LOCAL scelto dal client non concede alcun accesso nei test. Consumo inviti/recovery, monotonia epoch e verifica fingerprint/curve devono essere implementati dalla futura cerimonia sotto lock: queste strutture non la certificano.

## UUID e osservazione dell'audit

Correzione minima del prototipo 6A.2: una funzione condivisa accetta solo la rappresentazione canonica testuale minuscola `8-4-4-4-12` di caratteri esadecimali, e il gateway la applica anche a workspace/layout firmati. UUID è un tipo di identificatore, non una capacità. Non si impone arbitrariamente una sola versione UUID a dati storici.

Aggiunti quattro casi HTTP negativi con workspace firmato: 36 trattini, 36 esadecimali senza separatori, separatori in posizioni sbagliate, carattere non esadecimale. Risultato: 403 o 404 prima di dati protetti, zero mutazioni. PostgreSQL usa tipo uuid e rifiuta input impossibili, ma accetta alcune forme abbreviate valide per il suo parser: **il cast SQL non è il contratto wire rigoroso**. Nessun'altra funzionalità del prototipo modificata.

## Rollback e recovery

Prima di un'applicazione reale: dump verificato schema/dati/grants/ruoli e inventario dipendenze, conteggi correnti, lock di manutenzione e mapping owner→workspace approvato. Mai assumere ancora zero righe. Nessuna applicazione reale autorizzata qui.

1. Errore durante expand: ROLLBACK dell'intera transazione; test con divisione per zero prima COMMIT prova schema, ruoli e tutti i valori legacy esattamente identici al baseline.
2. Expand riuscito ma cutover non eseguito: fermare il nuovo percorso e lasciare colonne/registry inattivi. Non occorre distruggere schema o dati per tornare al runtime R1, che non li usa.
3. Annullamento del backfill: conservare head e provenance in export di manutenzione, bloccare le scritture, scollegare head, poi receipts, quindi azzerare workspace dei figli/radici con FK domain differite. L'ordine receipts→snapshot è necessario perché la FK provenance non è differita. Il test ripristina gli stessi valori semantici legacy. I trigger storici touch_updated_at fanno avanzare timestamp delle righe aggiornate: non si dichiara una identità byte-per-byte del backfill inverso né si disabilitano trigger per simularla. L'expand DDL invece conserva esattamente anche quei timestamp.
4. Dopo un cutover futuro o dati applicativi senza owner: questo percorso non è sufficiente. Serve forward-fix o restore controllato con salvataggio dei checkpoint successivi, mai reset distruttivo o creazione fittizia di utenti Auth.

Non è inclusa una down migration automatica che elimini record, colonne o ruoli: sarebbe distruttiva dopo uso del nuovo schema. La reversibilità verificata riguarda l'expand fallito e il mapping senza cutover. Snapshot immutabili, gestione retention e recovery transazionale restano 6A.4/6B.
