# 6B.2-E1-V — verifica funzionale indipendente predisposta

6 novembre 2026. **E1-V: BLOCKED.** Nessuna approvazione E1 e nessun avvio E2.
La verifica eseguibile JS/PostgreSQL non è disponibile in questo ambiente.
Workflow locale predisposto, non pubblicato né eseguito. Non corregge SQL,
fixture o test E1 auditati. Il suo eventuale successo non coprirebbe da solo
tutte le richieste E1-V: lacune dettagliate sotto, da decidere dalla Regia.

## 1. Baseline e file verificati

Cartella `/Users/vincenzo.epifani/Documents/SerieN Codex/SerieN-persistence`.
Branch esatto `codex/6b2e1-semantic-gate`.
HEAD invariato `0a191e30239133067e4dc6598bd01060274d0b3b`.
Fase 1 svolta senza modifiche. Stato iniziale:

```text
 M PROGRESS.md
 M docs/_active/train-persistence-auth/STATUS.md
 M tests/gen-6b2c-fixture.mjs
 M tests/sql/6b2c_cloud_rpc_candidate.sql
?? docs/_active/train-persistence-auth/6B2E1_SEMANTIC_GATE.md
?? tests/sql/6b2e1_semantic_gate.sql
```

I sei file sopra sono stati confrontati con i sei SHA-256 integrali registrati
nell'export precedente di questa chat: tutti identici. Manifest ripetibile in
`evidence/E1-V/audited-files-sha256.json`. Anche dopo il lavoro E1-V i sei file
restano invariati, inclusi PROGRESS e STATUS: nessuna rettifica del pacchetto auditato.
Questo rapporto registra separatamente lo stato operativo E1-V.

Il confronto diretto con lo ZIP Desktop non è stato possibile: il percorso
`/Users/vincenzo.epifani/Desktop/SerieN-6B2-E1-audit.zip` risulta assente adesso
(`FileNotFoundError`). Non è stato ricreato né cercato su servizi remoti.
L'integrità dei sei file è stata verificata sugli hash della chat, non su uno ZIP
che non è più disponibile. Nessuna modifica a main o altri branch.

## 2. Verifiche effettivamente eseguite

Log locali in `docs/_active/train-persistence-auth/evidence/E1-V/`.
`commands.json` riporta argv, exit code e log delle prove locali registrate.

| Verifica / comando | Esito e prova |
| --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git status --porcelain=v1` | PASS baseline richiesta; `branch.txt`, `head.txt`, `git-status.txt` (snapshot durante preparazione evidenze), `final-status.txt` finale |
| SHA-256 Python dei sei file vs manifest della chat | PASS statico; `audited-files-sha256.json` |
| `python3 -m unittest discover -s tests -p '*_test.py'` | PASS: 9 test, 0.032 s, exit 0; `python-tests.txt` |
| `git diff --check` | PASS, exit 0; `diff-check.txt`, controllo conclusivo `final-diff-check.txt` |
| Confronto Python regex/JSON di schema, catalogo e lunghezze embedded vs `git show HEAD:tests/sql/6b2c_cloud_rpc_candidate.sql` | PASS statico; 75 edge; `static-checks.json` |
| `git diff HEAD -- src app.js public assets` | PASS statico: vuoto; `static-checks.json` |
| Ricerca toolchain `command -v` e `shutil.which` | Node/npm/psql/Docker assenti, Python 3.13 presente; `toolchain.json` |
| Parsing YAML del nuovo workflow | NOT VERIFIED: modulo PyYAML assente; non installato |
| Node, build, Capture, SQL e browser | NOT VERIFIED: non avviati, strumenti richiesti assenti |

Non sono stati ripetuti npm/SQL sapendo che gli strumenti mancano. Nessuna
installazione locale/globale, nessun container avviato, nessuna rete, credenziale
reale, accesso GitHub o Supabase. Nessun commit/push/merge/rebase/reset/deploy.

## 3. Prova positiva con sganciato

**NOT VERIFIED eseguibile.** È stata ispezionata la catena reale del generatore,
non è stato inventato né prodotto un DTO JSON sostitutivo:

1. `tests/gen-6b2c-fixture.mjs --with-loose` costruisce tre convogli con builder
   nativi e Journey R1, usando identità sintetiche.
2. Ferma il primo convoglio e usa `createFleetCommands(...).uncouple(0)` R1:
   il carro conserva una copia della storia e la posizione calcolata dal comando.
3. Richiede esattamente uno sganciato; esegue `validateStaging` R1 sulla flotta.
4. Usa `captureState` R1 e `validateDocument`: riferimenti/assegnazioni,
   adiacenza, lunghezza, posizione, location e heading verificati dal codice R1.
5. Solo in caso di successo emette il DTO. La probe SQL salva quel contenuto a R2,
   legge R2 e confronta lo stato con il DTO completo.

`validateStaging` resta responsabile di copertura corporea, conflitti e contatti
leciti. Non si attribuiscono queste capacità ai due assert SQL. La lettura
statica della catena non dimostra che questa particolare fixture passerà.
Nessun aggiustamento della fixture o di Capture/Restore è stato fatto.

## 4. Matrice degli otto negativi esistenti

Tutti richiedono il DTO positivo prodotto dalla catena precedente. Tutti sono
**NOT VERIFIED**; le colonne seguenti descrivono le prove predisposte, non risultati.

| Caso | Record | Mutazione | Rifiuto previsto |
| --- | --- | --- | --- |
| T1 | trains[0] | Trasla start/end dei segmenti dopo il primo di +1 mm | INVALID_JOURNEY_CONTINUITY |
| T2 | trains[0] | Trasla lo stesso suffisso di -1 mm | INVALID_JOURNEY_CONTINUITY |
| T3 | trains[0] | position = primo start - 1e-7 mm | INVALID_JOURNEY_POSITION |
| T4 | trains[0] | position = ultimo end + 1e-7 mm | INVALID_JOURNEY_POSITION |
| L1 | looseStock[0] | Trasla start/end del suffisso di +1 mm | INVALID_JOURNEY_CONTINUITY |
| L2 | looseStock[0] | Trasla start/end del suffisso di -1 mm | INVALID_JOURNEY_CONTINUITY |
| L3 | looseStock[0] | position = primo start - 1e-7 mm | INVALID_JOURNEY_POSITION |
| L4 | looseStock[0] | position = ultimo end + 1e-7 mm | INVALID_JOURNEY_POSITION |

La probe parte sempre da `d` immutato, ricostruisce `bad` a ogni iterazione e
usa il helper di rifiuto con sottotransazione. T3/T4/L3/L4 cambiano il solo campo
position. T1/T2/L1/L2 cambiano più scalari del campo segments per conservare
le lunghezze: questo isola la continuità dal controllo preesistente delle lunghezze,
ma non soddisfa una lettura strettamente “un solo scalare modificato”. La Regia
deve chiarire/approvare il metodo; nessuna modifica automatica applicata.

**Lacuna per caso:** il test non confronta head, snapshot e receipt subito dopo
ciascuno degli otto rifiuti. Controlla head e conteggi totali al termine del gruppo.
Il helper cattura l'eccezione in una sottotransazione, quindi gli eventuali effetti
del tentativo rifiutato sono rollbackati: i conteggi esterni non dimostrerebbero
l'assenza di INSERT tentati e poi annullati internamente. E1-V richiede almeno
snapshot/head/receipt prima e dopo ogni chiamata; non ancora predisposto.

## 5. Copertura richiesta A–H e regressioni

| Richiesta | Copertura predisposta / risultato locale |
| --- | --- |
| A continuità numerica | Quattro negativi; NOT VERIFIED |
| B position nella storia | Quattro negativi; NOT VERIFIED |
| C tolleranza 1e-6 coerente con R1 | Constante coerente staticamente, ma nessun test esatto sotto/sopra soglia; NOT VERIFIED |
| D estremi inclusi validi | Assert SQL usa < e >, ma nessun caso positivo agli estremi; NOT VERIFIED |
| E start negativi legittimi | Possibili nella storia R1; nessuna asserzione esplicita che la fixture li eserciti; NOT VERIFIED |
| F edge ripetuti validi | Nessun caso/assert esplicito; NOT VERIFIED |
| G contenuto persistito invariato | Confronto SQL read.state vs DTO completo presente; NOT VERIFIED |
| H nessuna nuova scrittura dopo ogni rifiuto | Solo controlli aggregati, lacuna sopra; NOT VERIFIED |
| Python/JMRI | 9 PASS ripetuti localmente |
| Node/R1 persistence, CAS/idempotenza, append-only, owner/RLS/allowlist, revoche, concorrenza, rollback | Test esistenti conservati; NOT VERIFIED, Node/PG/Docker assenti |
| Restore STOPPED, consist, sganciati, pose/location | Browser Capture/Restore preesistente e test Node; NOT VERIFIED |

Nessun FAIL funzionale osservato: i test funzionali non sono partiti.
Le lacune statiche impediscono di attribuire alla futura esecuzione dei soli test
esistenti la copertura completa richiesta da E1-V.

## 6. Invarianti e rischi

Sorgenti R1, Capture/Restore, Journey, fisica, scambi, geometria, UI, GLB e asset
non modificati; 75 edge e manifest/schema embedded invariati. L'adapter cloud
rimane `enabled:false`; nessun autosave. Questi sono confronti statici, non nuova
regressione dinamica. Nessuna nuova API, grant/RLS o capacità SQL applicata.

Restano aperti differenze numeric/IEEE-754 ai bordi, adiacenza topologica,
coerenza location, manifest dimensionali e tutte le responsabilità geometriche
di R1 documentate nella matrice E1. Né PASS Python né un eventuale SUCCESS
GitHub autorizzano produzione o validazione geometrica server.

## 7. Piano minimo GitHub Actions, da autorizzare

File nuovo locale: `.github/workflows/persistence-e1v-verification.yml`.
Trigger esclusivamente manuale `workflow_dispatch`; branch proposto
`codex/6b2e1-verification`, non creato. Job limitato esplicitamente a quel ref.
Permessi `contents: read`, nessun secret di repository, nessun deploy.

Riusa Supabase PostgreSQL `17.11.0.018` effimero e le migrazioni storiche C/D
con checksum. Genera DTO default e con sganciato usando R1; esegue schema C,
RPC C, probe E1 esistente, concorrenza, revoche e rollback D, nell'ordine che
preserva le precondizioni delle revisioni. Prevede Node/Python/build e browser
Capture/Restore con rete applicativa bloccata dal harness a loopback.
Carica log, DTO sintetici e risultati browser come artifact, anche su fallimento.
Dipendenze npm e browser sarebbero installate soltanto sul runner effimero dopo
il gate della Regia, mai nell'ambiente globale locale.

Set esatto minimo proposto per una futura pubblicazione, nessuna eseguita:

1. `PROGRESS.md`
2. `docs/_active/train-persistence-auth/STATUS.md`
3. `docs/_active/train-persistence-auth/6B2E1_SEMANTIC_GATE.md`
4. `tests/gen-6b2c-fixture.mjs`
5. `tests/sql/6b2c_cloud_rpc_candidate.sql`
6. `tests/sql/6b2e1_semantic_gate.sql`
7. `.github/workflows/persistence-e1v-verification.yml`

I primi sei sono identici al pacchetto auditato; il settimo è solo il nuovo harness.
Questo rapporto e le evidenze locali non sono necessari all'esecuzione e non
sono inclusi nel set minimo. Nessun asset/main o file di credenziali nel set.

Prima di qualsiasi commit/branch/push/dispatch serve decisione esplicita della
Regia sulle lacune C–F/H e sul metodo di mutazione del suffisso. Modifica minima
eventualmente necessaria: soli test di verifica per soglie/estremi/negativi/repeated
edge e confronti per singolo rifiuto, con oracolo R1. Non è autorizzata da questo
rapporto alcuna correzione del candidato o della fixture. Il workflow predisposto
esegue solo le prove già disponibili, non colma le lacune automaticamente.

## 8. Consegna

Nuovi file E1-V: workflow, questo rapporto e log/JSON in `evidence/E1-V/`.
Stato finale in `evidence/E1-V/final-status.txt`; HEAD resta il checkpoint.
Nessuna modifica dei sei file auditati, nessun commit o pubblicazione remota.

**E1-V: BLOCKED** — toolchain JS/PG/Docker assente e copertura richiesta non
completa nei test predisposti. Attendere la decisione della Regia su piano e lacune.
