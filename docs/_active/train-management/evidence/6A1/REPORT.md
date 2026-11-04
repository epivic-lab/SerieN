# 6A.1 — Rapporto tecnico alla Regia

Data 4 novembre 2026. **PASS delle verifiche documentali e dei test correnti; consegna subordinata al checkpoint remoto verificato nella risposta finale.** Nessuna approvazione indipendente implicita, nessuna 6A.2 iniziata.

## Base, perimetro e fonti

Checkout `/workspace/SerieN`, inizialmente pulito su branch work a `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Remote esclusivo `https://github.com/epivic-lab/SerieN.git`. Fetch non distruttivo effettivamente riuscito con accesso rete dell'ambiente; origin/main e ls-remote main allo stesso SHA. Il primo tentativo senza accesso rete falliva sul proxy; nessun aggiramento/configurazione proxy. Connettore GitHub ha confermato main e assenza del branch dedicato; fetch/ls-remote hanno poi confermato via Git. `feature/train-management` inizialmente assente, creato da main remoto; R1 antenato e nessuna differenza iniziale da main. Tracking temporaneo main rimosso prima del lavoro per impedire push impliciti sulla destinazione errata.

Letti AGENTS, PROGRESS, `docs/turnouts/FINAL_REPORT.md`, `docs/releases/R1/REPORT.md`, indice attivo e ritiro turnouts; sorgenti app, simulation/Journey/FixedClock, railway-types/state/step/guard, consist/fleet-commands, rolling-stock/train-assets/asset-placement, train-deck/state, navigation/quality e diagnostici. Non esiste una specifica Train Management più recente nel checkout. La R0 integrale non è stata allegata; decisioni/requisiti D01–D08 riportati dal committente sono il riferimento disponibile, confronto con l'originale integrale **NOT VERIFIED**. R1 pubblicata/approvata è attestazione della richiesta corrente, non una nuova prova Pages di questa sessione.

## Risultato architetturale

- DTO JSON versionato chiuso, con tracciabilità di ogni campo al runtime o a estensioni FUTURE. Identità persistenti distinte dagli indici runtime; Journey completo anche per sganciati, orientamenti e logica accoppiamenti, entrambe le velocità, odometro firmato e guard/probe/horizon. Infinity normalizzato esplicitamente, nessuna istanza viva.
- Gate STOPPED separato dai valori cinematici; restore congelato prima del primo tick, senza catch-up; modelli/revisioni esatte, nessun fallback dimensionale. Inventario fuori scena distinto da normali collocazioni ferroviarie.
- Ownership A workspace+device raccomandata dopo confronto con Auth shadow user; chiave privata non esportabile, pairing monouso con fingerprint, recovery kit offline, revoca/rotazione e matrice scope. Ruolo DB server limitato, zero accesso diretto indiscriminato. Rischio XSS nello stesso origin e perdita totale senza kit dichiarati.
- Save coerente al confine stabile, digest JCS, CAS, request_id immutabile, una transazione snapshot+proiezioni+head+ricevuta; retry dopo commit senza ack, conflitto senza last-write-wins, recovery come nuova revisione. Contratto journal/indicatori locale/cloud, nessuna promessa ultimo frame.
- Mapping di tutte le dieci tabelle con riuso colonne, vincoli, gap, migrazioni soltanto proposte e rollback non distruttivo; 17 casi di test futuri con oracoli. Nessuna nuova authority su moto/topologia.

## Prove attuali riproducibili

Ambiente Node v24.19.0, Python 3.12.14, Linux x64; jsonschema 4.26.0 già presente, nessuna nuova dipendenza app. Tutti i comandi dalla root repository, salvo validator che risolve i file dal proprio percorso.

| Comando / verifica | Esito reale | Evidenza |
|---|---|---|
| `npm test` | PASS, 37 file / zero fallimenti | [npm-test.txt](npm-test.txt) |
| Esecuzione `node <file>` per ciascun `tests/*.test.js` | PASS, 220 test / 220 pass / zero fail / zero skip; espone conteggi interni che il runner npm corrente sintetizza per file | [totali per file](direct-tests.json), [log completo](direct-tests.txt) |
| `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` | PASS 9 test | [python-tests.txt](python-tests.txt) |
| `npm run build` | PASS, bundle SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b` uguale al bundle R1 documentato | [build.txt](build.txt), [invarianti](invariants.json) |
| `python3 docs/_active/train-management/evidence/6A1/validate-schema.py` | PASS meta-schema, fixture e 16 rifiuti; 151 proprietà annotate e 27 ref locali risolti | [validator](validate-schema.py), [fixture sintetica](schema-fixture.json), [esiti](schema-validation.json) |
| Ispezione Supabase via connettore e SELECT cataloghi/conteggi | PASS osservazione in sola lettura: 10 RLS, tutte zero righe, migrazioni storiche e nessuna Edge Function | [db-metadata.json](db-metadata.json), [accessi/conteggi](db-access-counts.json) |
| `python3 docs/_active/train-management/evidence/6A1/verify-invariants.py` / scope Git | PASS nessuna modifica a file applicativi, canonico/asset/test/dipendenze/workflow; nessuna mutazione DB | [invariants.json](invariants.json) |

Ricetta equivalente per i conteggi diretti: `for test_file in tests/*.test.js; do node "$test_file" || exit 1; done`. Il log aggiunge i percorsi per rendere riconoscibile ogni suite. Una diagnostica volontariamente fallente del runner, eseguita fuori dalle suite, ha restituito exit1 come previsto; non è un fallimento del repository. Le suite effettive sono tutte riuscite. Il [verificatore invarianti](verify-invariants.py) confronta i file non documentali con la baseline, verifica perimetro, link locali e pattern credenziali; non modifica runtime o database. Le prove storiche S7 non sostituiscono questi nuovi risultati.

La fixture schema è **sintetica**, non un catalogo approvato né prova di restore/round-trip; i digest del suo modello non attestano un asset distribuibile. Il validator controlla struttura e metadati del contratto, non implementa il serializer o la validazione ferroviaria/API. Cross-reference, ownership e topologia richiedono i test P01–P17 futuri.

## Invarianti e sicurezza

Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; runtime intero e asset R1 identici, bundle finale identico. Per identità sono preservati 150 rail mesh/75 letti, tre anelli, 2 WX310/6 semplici, Kato/routing/Journey bidirezionale, collisioni/occupazione/guardia/STOP ALL, glow/frecce/STOP/campanello, tre console/minimappe/HUD, camera/scena e ottimizzazioni5D. Le suite attuali coprono i contratti ferroviari applicabili. Nessuna nuova acquisizione browser, manifest mesh runtime, performance o prova hardware: **NOT VERIFIED** in questa microfase, senza riciclare screenshot o benchmark vecchi come nuove prove.

Nessuna chiamata di scrittura Supabase, migration/deploy Edge, Auth, RLS, GRANT o config. Niente credenziali privilegiate/capacità reali negli artefatti; esiti e query riguardano metadati e conteggi. Le future protezioni sono una proposta verificabile, **NOT VERIFIED** contro un gateway operativo che non esiste. Impostazioni Dashboard Data API/backup/quote/Auth non osservate. La policy stock_models authenticated=true non implica accesso: grant effettivo negato osservato; zero anon write proposte.

## Gate, rischi e checkpoint

La Regia deve valutare ownership A, pairing/recovery e perdita totale, limiti payload/record, conservazione ricevute/snapshot e protocollo CAS. Quote/rate numerici, host gateway, CSP compatibile Pages, browser CryptoKey, pool isolation e backup/recovery operativo richiedono specifica/verifica prima dell'abilitazione futura. Orientamenti -1 e tempo simulato cumulativo non esistono ancora nel runtime: non viene dichiarato supporto attuale. Nessuna discrepanza con D01–D08 risolta cambiando la R0; confronto col testo R0 integrale resta aperto alla Regia.

Il checkpoint è l'unico commit atomico che introduce questo rapporto: `git log -1 --format=%H -- docs/_active/train-management/evidence/6A1/REPORT.md`. SHA e stato remoto si verificano dopo commit e push normale **solo** `feature/train-management`; la risposta finale riporta i valori reali. Se il push o il confronto SHA fallisce lo stato consegna è **BLOCKED**. Il rapporto non incorpora il proprio SHA e non anticipa l'esito di una mutazione futura. Nessuna PR automatica, main/merge/deploy, force-push o reset.

**Unica prossima azione: attendere audit della Regia e autorizzazione esplicita alla 6A.2. STOP.**
