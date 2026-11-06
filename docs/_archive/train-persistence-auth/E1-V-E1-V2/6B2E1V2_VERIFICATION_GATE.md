# 6B.2-E1-V2 — completamento del gate di verifica

6 novembre 2026. **E1-V2 pronta per autorizzazione CI.** Solo preparazione:
E1 resta BLOCKED e i test JS/PostgreSQL non sono dichiarati PASS.
Nessuna esecuzione remota, commit, push o creazione di branch di verifica.

## Baseline, integrità e stato Git

Cartella `/Users/vincenzo.epifani/Documents/SerieN Codex/SerieN-persistence`.
Branch iniziale e finale `codex/6b2e1-semantic-gate`.
HEAD iniziale e finale `0a191e30239133067e4dc6598bd01060274d0b3b`.
I sei file E1 sono identici ai SHA-256 dell'audit e restano intatti:

1. `PROGRESS.md`
2. `docs/_active/train-persistence-auth/STATUS.md`
3. `docs/_active/train-persistence-auth/6B2E1_SEMANTIC_GATE.md`
4. `tests/gen-6b2c-fixture.mjs`
5. `tests/sql/6b2c_cloud_rpc_candidate.sql`
6. `tests/sql/6b2e1_semantic_gate.sql`

Manifest in `evidence/E1-V2/audited-files-sha256.json`.
Stato iniziale completo in `evidence/E1-V2/initial-status.txt`: copia della
fotografia conclusiva E1-V, corrispondente all'output Git osservato a inizio V2.
Stato finale completo in `evidence/E1-V2/final-status.txt`, inclusi untracked.
I quattro file tracciati già modificati nella baseline restano tali; nessun
nuovo file tracciato è stato cambiato. Il workflow E1-V era già untracked.
PROGRESS/STATUS auditati non sono stati riscritti: questo rapporto separato
registra lo stato E1-V2 senza invalidare il pacchetto originale.

## File E1-V2 aggiunti/modificati

- Nuovo `tests/gen-6b2e1v2-cases.mjs`: 26 casi, due DTO completi con oracolo R1;
  nessun cambiamento al generatore E1.
- Nuovo `tests/run-6b2e1v2.py`: richieste separate e verifica di atomicità per caso,
  senza helper SQL nuovo, grant o bypass RLS.
- Aggiornato il workflow locale untracked `.github/workflows/persistence-e1v-verification.yml`.
- Questo rapporto e otto file di evidenza/inventario in `evidence/E1-V2/`.

Il rapporto E1-V e le sue evidenze storiche restano invariati. Nessun file
applicativo, R1, Capture/Restore, GLB o asset modificato. Cloud save disabilitato.

## Generazione dei controlli e distinzione degli oracoli

Comando previsto in CI:

```sh
node tests/gen-6b2e1v2-cases.mjs /tmp/serien-e1v/cases-v2.json
```

Il generatore esegue quello E1 immutato con `--with-loose`. Il DTO risultante
deve contenere tre convogli e uno sganciato generato da `uncouple` R1.
Passa nuovamente per `validateDocument` e `stageState`, inclusi builder nativi,
controllo manifest e `validateStaging`. Non esiste un JSON manuale sostitutivo.

Secondo controllo completo: ricostruisce il Journey tramite `hydrateJourney`,
estende la storia con il vero `Journey.extend` e router R1 senza spostare il treno,
fino ad avere start negativo e almeno due occorrenze dello stesso edge.
Assert espliciti verificano entrambe le caratteristiche; poi tutto il DTO passa
nuovamente per `validateDocument` e staging. Se il router non può costruire la
storia o R1 la rifiuta, il generatore fallisce: nessuna correzione/fallback silenzioso.

Solo questi due casi sono etichettati `R1_FULL_DOCUMENT`.
I restanti 24 sono `SQL_PREDICATE`: non affermano validità geometrica,
copertura del corpo o location coerente del DTO modificato. Le prove entro/oltre
tolleranza e agli estremi usano anche `hydrateJourney` come oracolo della sola
storia. Le quattro soglie decimali esatte ±1e-6 sono costruite dal runner con
PostgreSQL numeric, mantenendo il JSON testuale risultante; non attribuiscono
equivalenza IEEE-754 universale a R1. Il DTO origine resta quello positivo R1.

## Matrice A–H aggiornata — esecuzione ancora NOT VERIFIED

| Requisito | Casi predisposti | Metodo |
| --- | --- | --- |
| A continuità | 4 negativi originali ±1 mm; 4 negativi aggiuntivi ±2e-6 | Treno e sganciato, suffisso traslato coordinatamente per conservare lunghezze |
| B position nella storia | 4 negativi originali, fuori di 1e-7 mm | Cambia soltanto position; uno per ciascun estremo e tipo record |
| C tolleranza 1e-6 | 4 positivi ±0.5e-6 con oracolo hydrateJourney; 4 positivi esatti ±1e-6 SQL numeric; 4 negativi ±2e-6 | Sono prove del predicato; round-trip del JSON serializzato per i casi Number |
| D estremi inclusi | 4 positivi position = primo start / ultimo end | Treno e sganciato; hydrateJourney accetta, validità integrale non dichiarata |
| E start negativo legittimo | Secondo DTO completo positivo | Journey.extend R1, assert start<0, validazione completa R1 |
| F edge ripetuto valido | Stesso secondo DTO completo positivo | Router R1, assert duplicazione edge, validazione completa R1 |
| G DTO persistito invariato | Tutti i 14 casi attesi ACCEPT | Save R2 e read R2 nella stessa transazione di prova; confronto con intero DTO inviato |
| H nessuna scrittura residua per rifiuto | Tutti i 12 rifiuti, inclusi gli 8 originali | Nuovo request ID e connessione per ogni caso; head e contenuti integrali snapshot/receipt prima/dopo |

Totale 26: 2 documenti completi, 8 negativi originali, 8 prove Number di
tolleranza, 4 soglie decimali SQL esatte, 4 estremi inclusi. Le soglie negative
±2e-6 sono già comprese negli otto casi Number. Attesi 14 ACCEPT e 12 rifiuti.

Gli otto originali sono riproposti nel nuovo harness, oltre alla probe SQL E1
immutata che continua a essere eseguita in CI:

| Tipo | Gap +1 | Overlap -1 | Position prima start | Position dopo end |
| --- | --- | --- | --- | --- |
| trains[0] | INVALID_JOURNEY_CONTINUITY | INVALID_JOURNEY_CONTINUITY | INVALID_JOURNEY_POSITION | INVALID_JOURNEY_POSITION |
| looseStock[0] | INVALID_JOURNEY_CONTINUITY | INVALID_JOURNEY_CONTINUITY | INVALID_JOURNEY_POSITION | INVALID_JOURNEY_POSITION |

Ogni cella riparte da una copia dello stesso DTO positivo, senza riutilizzare il
documento mutato dal caso precedente. Gli ID delle 26 richieste devono essere
distinti; la traslazione coordinata del suffisso è quella autorizzata dalla Regia.

## Metodo di atomicità per ogni rifiuto

Comando previsto in CI, con il solo ID del container effimero:

```sh
python3 tests/run-6b2e1v2.py /tmp/serien-e1v/cases-v2.json /tmp/serien-e1v/results-v2.json
```

1. Prima della richiesta: acquisisce `serien_read_head` come authenticated,
   incluse revision/snapshotId/digest; acquisisce tutte le righe di snapshot e
   receipt, non i soli conteggi, tramite l'owner di test del container.
2. Esegue la RPC in una nuova connessione con `SET ROLE authenticated` e UID
   sintetico. Non usa il helper che cattura eccezioni: un successo inatteso
   può realmente committare e viene rilevato dai confronti successivi.
3. Richiede exit non zero e il solo errore semantico atteso. Dopo la chiusura
   della connessione, osserva di nuovo head e tabelle con connessioni separate.
4. Confronta l'intero contenuto prima/dopo e con la baseline: revisione invariata,
   nessuna aggiunta o mutazione di snapshot/receipt, nessuna interferenza fra casi.
5. Salva per caso request ID, scope, errore/output, exit code e osservazioni
   prima/dopo nel JSON di evidenza. In caso di anomalia interrompe senza riparare.

L'osservatore amministrativo è solo il proprietario già usato dal replay C/D
nel database effimero: nessun grant o policy aggiunti, nessuna concessione alle
RPC che sono sempre invocate come authenticated. La lettura amministrativa
serve a vedere anche eventuali righe fuori owner, non a far accettare la scrittura.

I positivi salvano/leggono R2 in una transazione esplicita poi rollbackata dal
harness, conservando R1 per concorrenza e revoca C/D. Questo prova il contenuto
dello snapshot transazionale; la prova di COMMIT/save/load, CAS e replay durabile
rimane nel gate C e nei test C/D già previsti. Nessuna cancellazione di storia.
Non si pretende di provare l'assenza di INSERT interni poi rollbackati: si prova
esattamente l'assenza di scritture rimaste persistite dopo ciascun rifiuto.

## Workflow CI corretto, solo predisposto

Trigger `push.branches: [codex/6b2e1-verification]` e job condizionato a
`github.ref == 'refs/heads/codex/6b2e1-verification'`. Rimosso workflow_dispatch.
Il branch è soltanto proposto: non è stato creato né localmente né sul remoto.
Permessi `contents: read`. Nessun repository secret/DSN di produzione.

Runner Ubuntu effimero, Node 22, Python 3.12 e Supabase PostgreSQL
`17.11.0.018`. Password sintetica esclusiva del container effimero, non una
credenziale reale. Nessuna mutazione cloud o migrazione remota.

Ordine previsto:

1. Checkpoint CI e diff check, npm ci sul runner.
2. Python, Node e build con log distinti.
3. Capture default, Capture E1 con sganciato, schema e generatore dei 26 casi.
4. Tre migrazioni storiche autentiche con MD5, adapter Auth e utenti sintetici.
5. Schema C, candidato, RPC C (save/load, CAS/idempotenza, owner, RLS/allowlist).
6. Probe E1 originale, poi runner V2: entrambi lasciano head a R1.
7. Concorrenza C, revoche D, rollback offline D.
8. Browser Capture/Restore R1 (STOPPED, round-trip e fault di rollback), harness
   che blocca traffico applicativo diverso dal loopback.
9. Artifact con SHA effettivo, DTO sintetici, casi, risultati per caso, log e prove
   browser, caricato anche in caso di errore. Nessuna pubblicazione Pages.

## Verifica locale eseguita

Evidenze in `evidence/E1-V2/`. Nessun nuovo test funzionale dichiarato PASS.

| Controllo | Risultato |
| --- | --- |
| Sei SHA E1, branch e HEAD | PASS statico, identici alla baseline auditata |
| `ast.parse` e `compile` in memoria di `tests/run-6b2e1v2.py` | PASS sintassi Python, nessuna esecuzione del runner e nessun pycache generato |
| `/usr/bin/ruby -rjson -ryaml` per parsing YAML | PASS sintassi, assert su trigger push, ref job e contents:read; Psych YAML 1.1 tratta on come true, normalizzato nel controllo |
| `/bin/bash -n` su ognuno dei sette blocchi run estratti dal YAML | PASS sintassi shell, nessun comando del workflow eseguito |
| `python3 -m unittest discover -s tests -p '*_test.py'` | PASS: 9 test, 0.029 s, exit 0; log python-tests.txt |
| `git diff --check` e controllo whitespace dei nuovi file | PASS statico |
| Sintassi/esecuzione nuovo generatore Node, build, Capture e stage R1 | NOT VERIFIED: Node/npm assenti |
| SQL/pg_jsonschema, runner, C/D, rollback, browser | NOT VERIFIED: PG/Docker e toolchain JS assenti |

Il controllo dello schema storico ha rilevato durante la scrittura del nuovo
runner che le receipt non hanno colonna id: l'osservazione ordina correttamente
per PK owner_id/request_id. È un adattamento del solo test nuovo, nessun file
E1 o candidato corretto. Nessuna installazione globale o accesso remoto.

## Rischi residui e decisione

La sintassi JS/SQL, il router per il caso ripetuto, il round-trip effettivo e la
compatibilità delle toolchain devono ancora essere verificati in CI. Il generatore
fallisce se l'oracolo R1 rifiuta un caso completo; non c'è fallback. Le soglie
decimali esatte SQL non dimostrano equivalenza Number universale. SQL non
certifica collisioni o geometria dei casi SQL_PREDICATE. Nessuna modifica
applicativa o autorizzazione di produzione deriva dalla preparazione.

## Set esatto proposto per un futuro commit temporaneo

Nessun commit è stato eseguito. Da pubblicare solo dopo gate Regia, sul branch
proposto `codex/6b2e1-verification` dalla baseline indicata, senza interventi su main.
Set completo proposto di 18 file (nove essenziali all'esecuzione e nove di audit):

```text
PROGRESS.md
docs/_active/train-persistence-auth/STATUS.md
docs/_active/train-persistence-auth/6B2E1_SEMANTIC_GATE.md
tests/gen-6b2c-fixture.mjs
tests/sql/6b2c_cloud_rpc_candidate.sql
tests/sql/6b2e1_semantic_gate.sql
tests/gen-6b2e1v2-cases.mjs
tests/run-6b2e1v2.py
.github/workflows/persistence-e1v-verification.yml
docs/_active/train-persistence-auth/6B2E1V2_VERIFICATION_GATE.md
docs/_active/train-persistence-auth/evidence/E1-V2/audited-files-sha256.json
docs/_active/train-persistence-auth/evidence/E1-V2/initial-status.txt
docs/_active/train-persistence-auth/evidence/E1-V2/final-status.txt
docs/_active/train-persistence-auth/evidence/E1-V2/static-checks.json
docs/_active/train-persistence-auth/evidence/E1-V2/python-tests.txt
docs/_active/train-persistence-auth/evidence/E1-V2/diff-check.txt
docs/_active/train-persistence-auth/evidence/E1-V2/commands.json
docs/_active/train-persistence-auth/evidence/E1-V2/delivery-manifest.json
```

Il manifest elenca percorso, stato Git e SHA-256 dei primi 17 file; esclude
sé stesso per evitare un hash autoreferenziale. Gli untracked E1-V storici
non fanno parte del set proposto e non vanno aggiunti implicitamente.

**E1-V2 pronta per autorizzazione CI.** È prontezza del collaudo predisposto,
non PASS funzionale e non approvazione E1. Attendere il gate della Regia.
