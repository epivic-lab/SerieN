# SerieN 6B.2-A — Contratto minimo cloud / Gate Regia (SOLO PROGETTAZIONE)

Data: 2026-11-05. Stato: **specifica proposta per la prossima microfase; nessuna implementazione o autorizzazione a modificare produzione**.
Repository `epivic-lab/SerieN`; branch esclusivo `feature/train-persistence-auth`.
Punto di partenza verificato: `715e86dbea4003f87050e0fdf3e933a3a9ea9ead`.
`main=9126788d3c68e43c0687e948db767bfccbbfc774`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` NON modificabili.
La 6B.1 è approvata **solo** per Capture/Restore locale (CI [42107202499](https://github.com/epivic-lab/SerieN/actions/runs/42107202499): 231 Node, 9 Python, build e 56 controlli browser PASS).

## 1. Fatti accertati direttamente in produzione (letture SQL, zero scritture)

Progetto Supabase `vehfrjgifzjjgamrgwze`, PostgreSQL 17, organizzazione Free.
Dieci tabelle ferroviarie in `public`, tutte RLS on. Proprietario `postgres`, nessuna FORCE RLS.
`anon` e `authenticated` **non** hanno CRUD diretto su queste tabelle.
Policy attuali `TO authenticated`: proprietario e gate email verificata; non si applicano automaticamente a un futuro ruolo tecnico distinto.
Tabelle interessate:
- `layouts`: `id uuid PK`, `owner_id uuid`, `topology_hash`, `schema_version`; nessuna head/revision.
- `layout_snapshots`: `id uuid PK`, `owner_id`, `layout_id`, `revision bigint`, `snapshot_schema`, `payload jsonb`, `saved_at`; `UNIQUE(layout_id,revision)`, FK composta verso `layouts(id,owner_id)`.
- `operation_receipts`: PK `(owner_id,request_id)`, `op_type`, `payload_digest` SHA-256 esadecimale, `result jsonb`, `created_at`.
- Trigger `serien_internal.check_snapshot()`: controlla hash topologia, STOPPED e otto switch; **non** valida integralmente il DTO e non impedisce UPDATE/DELETE.
Non ci sono righe in `layouts`, `layout_snapshots` o `operation_receipts`, né RPC di salvataggio, né Edge Functions.
Tre migrazioni applicate: `20261029230530`, `20261029230558`, `20261105155420`.
La vista dei branch Supabase segnala `MIGRATIONS_FAILED` su un branch preview `main`, mentre il progetto principale è `ACTIVE_HEALTHY`: chiarire prima di qualunque migrazione.

**Gate Auth aperto:** 2 utenti con identità Google confermata, 2 email in allowlist, ma **solo 1 corrispondenza** fra gli account registrati e l'allowlist. Non dedurre quale account sia; non pubblicare dati personali. Il secondo login va riconciliato e testato prima del rollout.

## 2. Decisioni minimali della Regia (da provare prima di implementare)

**Nessuna nuova tabella, nessuna colonna head, nessun servizio.** Riusare soltanto `layouts`, `layout_snapshots`, `operation_receipts`.

- `workspaceId` del DTO v1 è **esattamente `auth.uid()`**, identità del workspace personale. Non è una credenziale. Il server verifica sempre l'uguaglianza; nessun `owner_id` fornito dal browser.
- `layoutId` è `layouts.id`, verificato con `layouts.owner_id = auth.uid()` e `topology_hash` R1 fissato. Per il **layout iniziale** si può usare `layouts.id = auth.uid()` come chiave deterministica: bootstrap concorrente idempotente tramite PK esistente, nessuna tabella di binding. Non creare un layout se ne esiste già uno coerente; mai sovrascrivere uno incompatibile. In futuro il workspace può contenere più layout con UUID differenti senza cambiare `workspaceId`.
- La head è `coalesce(max(layout_snapshots.revision), 0)` per il layout autorizzato. `snapshotId` = ID della revisione massima. Primo save = revisione 1. Nessuna head memorizzata altrove e nessun aggiornamento di `layouts`.
- Serializzare **tutte le operazioni di scrittura dello stesso proprietario** con un unico advisory transaction lock derivato da `auth.uid()`, prima di leggere ricevuta e head. Il throughput previsto è basso e la serializzazione per utente semplifica CAS, replay e bootstrap. Collisioni dell'hash possono solo serializzare utenti diversi, non concedere accesso. Nessun `SELECT FOR UPDATE` che richieda grant UPDATE su `layouts`.
- Dopo lock e controllo d'accesso: verificare prima `operation_receipts(owner_id,request_id)`. Stessa richiesta immutabile => stessa ricevuta; ID già usato con contenuto differente => `IDEMPOTENCY_KEY_REUSED`. Altrimenti confrontare head e `expected_revision`; se differiscono => `REVISION_CONFLICT` senza modifiche. Inserire snapshot R+1 e receipt nella **stessa transazione**. `UNIQUE(layout_id,revision)` resta ultimo presidio.
- Cronologia immutabile per il percorso applicativo: al ruolo RPC concedere solo SELECT e INSERT su snapshot/receipt, **mai UPDATE o DELETE**; a client `anon/authenticated` nessun CRUD. L'eventuale immutabilità assoluta anche per amministratori va valutata separatamente per non rompere FK `ON DELETE CASCADE`/cancellazione account.
- Retry sempre con **stesso request_id e identico envelope serializzato** dopo timeout/risposta persa. Non ritentare autonomamente il CAS usando una nuova revisione. Nessun merge e nessun autosave nella prima release.
- Recupero da revisioni precedenti = nuovo snapshot con nuovo request_id e CAS sulla head corrente; non modificare snapshot storici.

### Riduzione della complessità del digest

Il documento 6B.1 propone RFC 8785/JCS completo, non implementato in PostgreSQL. **Per la prima versione non introdurre una libreria di canonicalizzazione JCS nel database.** Proposta più piccola da verificare con test: la RPC riceve un `state_text` UTF-8 immutabile (non una prova di autorizzazione), misura `octet_length` prima del cast, valida testo/duplicati/JSON, costruisce un envelope server con operazione, UID, layout, revisione attesa e testo, e ne calcola SHA-256 server-side con algoritmo versionato. Lo stesso `request_id` è riutilizzabile solo se l'envelope byte-identico coincide. Il client conserva esattamente il testo iniziale per ogni retry. **Non chiamare questo digest “JCS”**; è un identificatore opaco di ricevuta, non una firma crittografica del client. Testare esplicitamente equivalenza, variazione di un byte, chiavi duplicate annidate e limiti di trasporto. La funzione `pg_catalog.sha256(bytea)` è presente nel DB reale. Se i test non dimostrano validazione sicura del testo, fermarsi e rivedere il contratto, senza downgrade silenzioso.

## 3. Superficie API privata proposta, NON presente in produzione

1. `serien_open_workspace()`: ritorna il contesto personale verificato e crea al massimo il layout canonico iniziale; idempotente e sotto lock proprietario.
2. `serien_read_head(workspace_id uuid, layout_id uuid)`: revisione decimale canonica in **testo**, `snapshotId`/digest/schema o null se vuoto.
3. `serien_read_snapshot(workspace_id uuid, layout_id uuid, revision text)`: DTO v1 e metadati/ricevuta dell'unico proprietario. Storico paginato/UI in microfase successiva, senza allargare subito l'API.
4. `serien_save_checkpoint(workspace_id uuid, layout_id uuid, expected_revision text, request_id uuid, state_text text)`: scrittura atomica + ricevuta. Revisione in input canonica `0..9223372036854775807`; overflow esplicitamente respinto.

Quattro RPC *specifiche*, nessuna funzione SQL generica esposta, nessun client Supabase aggiuntivo, nessuna service key nel browser.

## 4. Modello di privilegi da provare in DB locale

Un ruolo tecnico `NOLOGIN NOBYPASSRLS`, non owner delle tabelle, non membro dei ruoli client o `postgres/service_role`, proprietario delle sole RPC `SECURITY DEFINER` strettamente necessarie. `search_path=''`, SQL statico con identificatori qualificati, `EXECUTE` revocato da PUBLIC/anon e concesso solo a authenticated. Verificare grant schema/colonne minimi e soprattutto **policy permissive e restrittive specifiche per il ruolo tecnico** su `layouts`, `layout_snapshots`, `operation_receipts`: owner = `auth.uid()` e `serien_access_allowed()`. Le policy attuali `TO authenticated` non vengono eliminate né contate come protezione automatica del nuovo ruolo. Occorre EXECUTE controllato sul predicato di allowlist. Zero `BYPASSRLS`, zero GRANT di CRUD alle tabelle pubbliche ai client. Controllare nei test che RLS funzioni *effettivamente* sotto il ruolo DEFINER.

La revoca concorrente necessita un ordine di lock **condiviso dal percorso amministrativo**: stesso lock per UID prima di cancellare dalla allowlist, e controllo allowlist dopo il lock in Save. Finché il percorso amministrativo di revoca non è definito e collaudato, non dichiarare revoca atomica in concorrenza. Niente API admin pubblica in 6B.2.

## 5. Validazione: non affidarsi al browser

Prima dell'INSERT il DB verifica sessione, allowlist, owner, contesto (`state.workspaceId`, `state.layoutId`), topologyHash R1, `schemaVersion=1`, `resumePolicy=STOPPED`, otto switch, limiti di dimensione, JSON senza chiavi duplicate, campi strutturali e riferimenti esistenti nel documento (identità uniche, item/membri/convogli coerenti), asset/manifest v1 permessi. Nessun SQL dinamico o URI di modello assunto dal DTO. Anche un utente autorizzato non può corrompere il proprio storico tramite un payload arbitrario. I controlli di geometria/occupazione *runtime* rimangono nel restore 6B.1, senza portare motore e Three.js nel database; specificare il limite di garanzia sul server. Non fare claim di validazione completa fino al relativo test con fixture reali e manipolate.

## 6. Gate 6B.2-A prima di autorizzare SQL o salvataggi

- [ ] Allineare i due account Google/allowlist e collaudare secondo account e account estraneo, senza pubblicare email.
- [ ] Chiarire `MIGRATIONS_FAILED` del branch preview Supabase; confermare migrazioni produzione.
- [ ] Validare in DB locale effettivo: ruolo DEFINER non bypass, grant, policy, UID originali, RLS e accesso diretto Data API negato.
- [ ] Bootstrap concorrente: un solo layout iniziale; A non vede/scrive B con UUID noti.
- [ ] CAS concorrente con due sessioni stessa R: un solo R+1, un conflitto esplicito.
- [ ] Retry stessa richiesta: stessa receipt; differente envelope: rifiuto; crash prima/ dopo commit e timeout risposta.
- [ ] Documento malformato, chiavi duplicate, >2MiB, riferimento falso, topology/asset errato: nessuna scrittura.
- [ ] Immutabilità dello storico, quote, revoca concorrente, sessione anon/scaduta e advisor sicurezza.
- [ ] Prove DB locale senza raggiungere produzione; test Node/Python/browser 6B.1 e hash R1 invariati.
- [ ] Regia esamina report, SQL completo e differenze del branch **prima** di autorizzare migrazione, RPC in produzione, front-end cloud o merge.

## 7. Prossima consegna a Codex (NON autorizzata all'implementazione)

Prima verificare in un checkout affidabile `git rev-parse HEAD`, `git status --short`, `git branch --show-current` e confronto con SHA remoto attuale. Se checkout rimane al vecchio `5c8f0f5` o mancano i blob binari, **STOP**, non patchare da un albero incompleto, non fare reset/rebase, non inventare file.
Una volta ripristinato il checkout, Codex potrà **solo con distinta autorizzazione Regia** preparare SQL/migrazione e test locali per queste quattro RPC. Nessuna scrittura su Supabase produzione, `main`, geometria o R1. La Regia approva ogni microfase dopo verifica indipendente.

**Stato attuale: 6B.1 PASS; 6B.2-A SPEC DOCUMENTATA, GATE NON ANCORA PASS; 6B.2 cloud NON ABILITATA.**
