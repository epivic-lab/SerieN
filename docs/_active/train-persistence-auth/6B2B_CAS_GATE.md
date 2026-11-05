# SerieN — 6B.2-B CAS e idempotenza, gate isolato

Data: 2026-11-05. Stato **PASS limitato al protocollo CAS/idempotenza su PostgreSQL 17 effimero**. NON è un'approvazione di migrazione o di cloud save in produzione.

## Evidenza verificata dalla Regia

- Repository: epivic-lab/SerieN, branch \`feature/train-persistence-auth\`.
- Codice del gate: \`6986027a189a594bd316eb9f501e66a00894031d\`.
- GitHub Actions: [run 42117514119](https://github.com/epivic-lab/SerieN/actions/runs/42117514119), **SUCCESS**, log letto direttamente.
- Dipendenza gate: 6B.2-A [run 42114768839](https://github.com/epivic-lab/SerieN/actions/runs/42114768839), SUCCESS.
- Baseline 6B.1 approvata: \`715e86dbea4003f87050e0fdf3e933a3a9ea9ead\`; R1 \`348bfeff12c4005657098d89ea1d3c2ccdda9910\` intoccabile. La regressione 6B.1 sul commit esatto di questo gate era ancora IN PROGRESS all'ultima lettura: non dichiararne anticipatamente il PASS.

## Materiali di prova (nessun codice da distribuire)

1. \`tests/db-security-6b2a.sql\`: schema/ruoli/RLS simulati con tre utenti **fittizi**.
2. \`tests/db-cas-6b2b.sql\`: RPC **solo di test** \`serien_smoke_save_checkpoint\`, dati fittizi e prove sequenziali; NON è migrazione eseguibile su Supabase reale. Include \`p_test_fault\` esclusivamente per fault injection.
3. \`tests/run-db-cas-6b2b.sh\`: avvia 2 sessioni PostgreSQL indipendenti, osserva un lock advisory **concesso** e un secondo **in attesa**, conferma un solo commit R4 e un conflitto; rigioca receipt in una nuova sessione.
4. \`.github/workflows/persistence-db-cas-6b2b.yml\`: PostgreSQL 17 Docker temporaneo su GitHub Actions, nessuna connessione/chiave Supabase, nessun deploy.

## PASS effettivamente osservati

- A e B isolati da owner/RLS; account estraneo e UID assente respinti.
- Con revisione iniziale R1, primo save produce R2; ritentare stesso \`request_id\` ed envelope restituisce la medesima ricevuta.
- Stesso ID con payload diverso o con **layout diverso dello stesso owner** ⇒ \`IDEMPOTENCY_KEY_REUSED\`, nessun nuovo snapshot.
- Revisione attesa sbagliata ⇒ \`REVISION_CONFLICT\`.
- Revisione non canonica o sopra signed bigint ⇒ rifiuto.
- JSON con chiavi duplicate (anche annidate), payload maggiore di 2 MiB e contesto layout scorretto ⇒ rifiuto prima della scrittura.
- Fault dopo INSERT snapshot e dopo INSERT receipt ⇒ rollback: conteggi snapshot e ricevute invariati.
- Risposta persa DOPO un vero commit ⇒ nuovo collegamento con stesso ID/testo recupera la ricevuta R3 senza revisioni supplementari.
- Due **sessioni DB distinte e sovrapposte** sulla stessa R3: A scrive R4, B aspetta il lock e riceve conflitto. Nessun last-write-wins.
- Replay dopo l'avanzamento di head resta idempotente; payload diverso con ID già consumato viene respinto.
- Solo ruolo RPC dedicato può accedere ai dati fittizi; anon/authenticated non hanno CRUD su tabelle.

Log chiave della [run 42117514119](https://github.com/epivic-lab/SerieN/actions/runs/42117514119):
\`PASS: same request recovered across committed DB sessions\`
\`PASS: two distinct DB sessions contended on advisory lock; one R4 and one CAS conflict\`
\`PASS: CAS, idempotency, fault recovery, and true contention in isolated PostgreSQL 17\`

Le precedenti run RED sono **test falliti durante la costruzione del harness**, per errori SQL/delimitatori e corretti prima della run finale. Non sono evidenza di bug in produzione.

## Decisioni architetturali confermate entro il perimetro testato

- Nessuna nuova tabella e nessuna colonna head: \`MAX(layout_snapshots.revision)\` sotto lock per proprietario.
- Idempotenza prima di CAS: PK \`(owner_id, request_id)\` e digest server dell'envelope testuale byte-stabile, **non JCS**.
- Lock transazionale per UID; storico append-only nella superficie privilegiata prevista; nessun CRUD diretto del client.
- Una singola transazione PostgreSQL per snapshot e ricevuta; nessuna richiesta REST multipla per comporre una falsa transazione.
- Un solo client Supabase Google nel futuro adapter, senza service_role/secret key sul browser.

## STOP: limiti e gate ancora aperti

Questo test usa uno **schema sintetico deliberatamente ridotto** e una RPC di prova, NON il database reale completo. Non sono stati implementati né collaudati:
- RPC definitive open/read/save e bootstrap workspace sul catalogo reale;
- validazione JSON Schema integrale, manifest/asset e riferimenti ferroviari completi (la prova controlla soltanto alcuni campi/limiti);
- revoca allowlist concorrente con un ordine di lock condiviso con il processo amministrativo;
- limiti/quote e gestione di errori transitori e timeout di rete browser;
- migrazione su Supabase, deploy, UI Salva/Carica, autosave o multiutente reale;
- collaudo del secondo account Google (Sergio);
- chiarimento dello stato \`MIGRATIONS_FAILED\` su branch preview Supabase.

**Prossimo passo minimo raccomandato: 6B.2-C** — trasformare il prototipo in una migrazione *candidata, ancora offline*, aderente allo schema reale e al contratto v1, aggiungere validazione del documento e ricontrollare su DB locale creato dalle migrazioni autentiche. PRIMA di qualunque applicazione a Supabase produzione: audit indipendente della Regia, gate di sicurezza, verifica checkout Codex e autorizzazione separata.

Nessuna modifica a \`main\`, geometria, motore ferroviario, Supabase reale o produzione è stata eseguita.
