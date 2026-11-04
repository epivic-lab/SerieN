# 6A.3 — Schema PostgreSQL isolato: rapporto alla Regia

**PASS tecnico nel perimetro locale verificato; approvazione indipendente PENDING. Nessuna applicazione al Supabase reale autorizzata o effettuata.** Il checkpoint remoto va verificato dopo commit/push nella consegna finale. 6A.4 non iniziata.

## Base e consegna

Branch `feature/train-management`, baseline approvata `f64bdc8291a9c51a29c60076bae303e91e6e1d26`; working tree iniziale pulito. Fetch esplicito del branch, ls-remote e ascendenza R1 verificati; main ancora `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Letti AGENTS, PROGRESS, STATUS, contratti 6A.1, schema DTO, rapporto 6A.2 e matrice R0 originale P01–P18. L'autorizzazione corrente approva 6A.2 e autorizza esclusivamente 6A.3.

Proposta versionata `supabase/migrations/20261104165408_serien_workspace_expand.sql`, generata con CLI 3.0.0 (`migration new`, dopo help). [Specifica relazioni/privilegi e rollback](../../6A3_SCHEMA.md). Baseline storiche estratte senza modificarle dal catalogo remoto in `tests/db/6A3/`; fixture, stub Auth minimo e runner riproducibile nello stesso percorso. Non è stata usata una connessione al servizio reale per eseguire DDL o dati sintetici. Non esistono nuove API/RPC/SaveCheckpoint/autosave o integrazioni nel simulatore.

## Modifiche effettivamente collaudate

Workspace indipendenti da Auth; registry privato device/chiave pubblica/scope/version/epoch/revoca, challenge-inviti bound alla candidata, verifier recovery e nonce; lock marker separato dall'autorità. Nuove ownership_key generate distinguono dominio legacy e workspace e alimentano FK composite, senza nullable-bypass. Le otto tabelle owner-scoped ricevono workspace nullable; catalogo globale e segmenti canonici conservano il proprio ruolo. Aggiunti Journey/version allo sganciato e provenance snapshot/receipt. Head revisionato ha riferimenti compositi a layout/snapshot/ricevuta/digest e trigger monotono invoker.

Owner_id e tutte le FK/colonne storiche restano obbligatori nell'expand: il cutover a record applicativi senza owner Auth è futuro. È un limite intenzionale, non un login cliente introdotto né una soluzione con shadow user. Il mapping sintetico lascia invariati ID, payload, posizioni e valori di dominio. RLS/privilegi sono descritti nella specifica; worker non scrive registry/snapshot, authorizer non scrive snapshot. La scelta di binding a identità SQL distinte non attiva una configurazione produttiva di connessioni.

## Test riproducibili ed evidenze

| Comando dalla root | Esito osservato | Prove |
|---|---|---|
| `python3 tests/db/6A3/run.py` | **51 PASS**, PostgreSQL 17.11 reale x86_64 in Docker effimero, rete none, nessuna porta | [results.json](results.json), [log](db-test.txt), [advisor locale](local-advisor.json) |
| Suite HTTP capability con UUID rigorosi | **48 PASS**, zero FAIL/skip; quattro nuovi input UUID invalidi rifiutati senza dati/mutazioni | [esiti/input attesi e osservati](uuid-security.json), [log](uuid-security.txt) |
| Suite browser capability | **5 scenari PASS**, Chromium 154.0.8037.57 reale | [esiti](browser.json), [log](browser.txt) |
| `npm test` | PASS, 37 file, zero FAIL/skip | [npm-test.txt](npm-test.txt) |
| `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` | PASS, 9 test | [python-tests.txt](python-tests.txt) |
| `npm run build` | PASS, bundle R1 identico | [build.txt](build.txt), [invarianti](invariants.json) |

Per le suite capability usare i comandi del contratto 6A.2; `CAPABILITY_EVIDENCE` e `CAPABILITY_BROWSER_EVIDENCE` abilitano la scrittura dei JSON. I soli cambiamenti del prototipo sono la verifica UUID canonica condivisa, applicazione a workspace/layout e quattro test negativi. Non sono stati ampliati pairing, gateway o cerimonia di recovery.

L'immagine PostgreSQL è fissata per digest in runner e results. Lo schema baseline ricrea le due migrazioni `20261029230530` e `20261029230558`; tutte le dieci tabelle sono non vuote prima dell'espansione. [Schema prima](schema-before.sql), [dopo](schema-after.sql), [diff reale](schema.diff). [Valori legacy prima](legacy-before.json) e [dopo il solo expand](legacy-after-expand.json) sono identici, timestamp inclusi. Gli stub Auth non sono una copia del servizio Supabase.

Tra i 51 controlli: DDL fallito prima COMMIT lascia schema/ruoli/dati identici; tutte le FK validate e indici validi; positivi di backfill e head; assenza di lettura/scrittura per anon/authenticated; connessioni reali A/B con lettura del proprio workspace e nessuna lettura dell'altro, anche con GUC forgiata; impossibilità worker di leggere chiavi, cambiare registry, assumere authorizer, disabilitare RLS o scrivere snapshot. Lock marker aggiornabile senza alterare identità. Cross-workspace e workspace NULL respinti dalle FK; esclusività membro/loose, limiti posizione, ordine/tipo membri, STOPPED/hash/otto scambi ancora applicati. Chiavi private nel JWK, curve mancanti, nonce duplicati e nonce associati a device di altro workspace respinti. Nessun nuovo SECURITY DEFINER o EXECUTE pubblico nel nuovo schema privato.

Rollback: il fallimento della migrazione è testato sull'intera transazione. Il backfill inverso è provato scollegando head→receipt→snapshot e ripristinando workspace NULL sotto FK differite. I valori semantici legacy rimangono invariati; `updated_at` avanza per effetto dei trigger touch già esistenti sulle righe aggiornate. Non si dichiara ripristino byte-identico di questi timestamp dopo backfill, né rollback distruttivo post-cutover. La specifica definisce preservazione/export dei nuovi riferimenti prima di un eventuale annullamento reale.

I tentativi iniziali hanno corretto soltanto il collaudo: pg_isready vedeva il server temporaneo di init, psql stampava i tag SET e sceglieva il nome DB dal login, e l'ordine inverso iniziale receipts/snapshot era respinto dalla FK. Il runner finale attende init completo, usa output quiet e database esplicito, connessioni worker effettive e ordine di rollback corretto. È stata rieseguita integralmente la suite sul file di migrazione finale; nessun errore di isolamento è stato ignorato.

## Letture remote, advisor e documentazione

Supabase reale PostgreSQL 17.11 aarch64: sole letture di tabelle, migrazioni, vincoli, funzioni, indici, policy, grants, trigger e advisor. [Osservazione](remote-observation.json), [trigger](remote-triggers.json), [advisor sicurezza](remote-security-advisor.json), [advisor performance](remote-performance-advisor.json). Nessuna operazione Auth, DDL, DML, migration, Edge Function o deploy sul progetto reale. Gli output sono metadati, non contenuti di record utente.

Advisor sicurezza reale: WARN preesistente «Leaked Password Protection Disabled». [Riferimento Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); non modificato, il futuro accesso senza login cliente non elimina automaticamente una configurazione Auth da valutare. Advisor performance reale: nove FK senza indice covering e nove indici mai usati, tutti riferiti allo schema storico, non al nuovo expand locale. [FK](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [indici inutilizzati](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). Non si rimuovono indici sulla base dell'inattività di un database attualmente poco usato e non si corregge produzione senza autorizzazione.

Controlli equivalenti locali: RLS/FORCE sulle tabelle private, ruoli non-superuser/NOBYPASSRLS/NOCREATEROLE, separazione dei grant, nessun SECURITY DEFINER, nessun indice invalido o FK non validata; indici delle nuove relazioni inclusi nella proposta. Non è un esito «advisor Supabase clean» del database modificato né un benchmark di query su carichi reali. I nove suggerimenti remoti rimangono da valutare in un piano prestazionale separato.

Consultate le skill Supabase/Postgres e documentazione corrente RLS mediante search_docs: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). Il fetch del changelog è stato negato HTTP403 dalla rete: **NOT VERIFIED** per quel canale, nessun bypass. Non sono state introdotte feature SDK/deploy basate su una versione presunta. CLI 3.0.0 interrogata realmente e PostgreSQL 17.11 collaudato realmente.

## Invarianti, rischi e gate

Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; bundle `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`, identici R1. App, geometrie/150 rail/75 bed, motore/routing/Journey/guardia/occupazione/collisioni, asset, otto scambi, console/HUD/minimappe e lifecycle invariati. Non sono nuovi test prestazionali o hardware del simulatore; tale matrice resta futura secondo R0 P18. Non cambiano package o workflow.

NOT VERIFIED: applicazione reale, backup/PITR e restore Supabase, piattaforma Auth/PostgREST/grants esterni al baseline, connessioni produttive per workspace, verifica crittografica DB di chiavi/fingerprint, consumo monouso transazionale, revoca distribuita, CAS/idempotenza/atomicità SaveCheckpoint, cutover senza owner, carichi reali/retention/DoS. Nessuno di questi risultati è dedotto dai 51 test locali. La Regia deve approvare strategia dei principal SQL/provisioning, piano cutover e preservazione dei cascades Auth storici, semantica di backfill/updated_at e privilegi della futura 6A.4 prima di qualsiasi applicazione reale.

Commit identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A3/REPORT.md`. Push solo feature/train-management, confronto remoto e working tree nella consegna finale. In caso di errore checkpoint: BLOCKED. Nessuna PR/main/Pages/Supabase deploy. **Unica prossima azione: attendere audit della Regia e autorizzazione esplicita 6A.4. STOP.**
