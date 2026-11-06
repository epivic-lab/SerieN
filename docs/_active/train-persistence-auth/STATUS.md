# Train Persistence Auth — stato 6B.1

## Stato corrente — checkpoint E1 PASS OFFLINE (6 novembre 2026)

**6B.2-E1 APPROVATA dalla Regia: PASS OFFLINE. E2 NON AVVIATA.**
Codice/test verificati: `5bb447a0f614a5f68e26fcde73b19586c136d62b` sul branch
`codex/6b2e1-verification`. [Run 42139742357](https://github.com/epivic-lab/SerieN/actions/runs/42139742357)
SUCCESS, primo tentativo secondo audit Regia. Risultati e limiti nel
[rapporto E1 aggiornato](6B2E1_SEMANTIC_GATE.md).

Chiusura autorizzata solo come commit locale su `codex/6b2e1-semantic-gate`;
nessun push autorizzato. Main, motore ferroviario R1, Capture/Restore, UI e asset
NON MODIFICATI dalla fase; Supabase produzione NON MODIFICATO; cloud save
NON ABILITATO; nessun deploy. Nessuna prova OAuth/PostgREST o cloud reale è
implicita nei test PostgreSQL effimeri.

Custodia da completare: archiviazione permanente di artifact e log CI, attualmente
con retention 14 giorni e scadenza artifact il 20 novembre 2026. Nessun artifact
è incluso nel commit. Sessione chiusa; attendere decisione Regia, E2 non avviata.
Le sezioni successive conservano lo stato storico 6B.1.

Percorso corrente: Supabase Auth Google, `auth.uid()` e allowlist server. Le
sperimentazioni ownerless/D09/D10 del branch storico non sono l'architettura
operativa. Baseline main `9126788d3c68e43c0687e948db767bfccbbfc774`, R1 `348bfeff`.

6B.1: **PASS REGIA locale dopo 6B.1-F**, Capture & Restore verificato; cloud disabilitato.
231 Node, 9 Python, build, 30 controlli browser, regressioni 5C/Fase 0 e sei
miniature identiche: PASS. Verifica del checkpoint remoto nella consegna finale. Nessuna migrazione,
nessun merge o deploy. Consegna e risultati nel `6B1_CAPTURE_RESTORE_GATE.md`.
Collaudo indipendente della Regia superato per il perimetro locale:
[GitHub Actions run 42107202499](https://github.com/epivic-lab/SerieN/actions/runs/42107202499).
231 Node, 9 Python, build e 56 controlli browser PASS. Nessun primo
salvataggio cloud o cambiamento DB autorizzato da questa consegna.

I documenti in `reference/` provengono esattamente dal checkpoint storico
`be2ce0322f31cf3ee6c8e92f3e58a4501c386a1b` (lettura via GitHub, senza merge).
Il documento prodotto non esisteva su main al kickoff. Sono riferimenti di
contratto: le precedenti sezioni Auth/capacità/ownerless sono superate dalla
richiesta 6B.1 e da SUPABASE_SAVE_PROPOSAL.md. Lo schema operativo v1 mantiene
immutata la struttura di STATE_SCHEMA; orientamento -1 e ricovero richiedono 6D.

## 6B.1-F — recovery GitHub remoto (Regia, 2026-11-05)
Il checkout Codex obsoleto work/5c8f0f5 non era idoneo. La Regia ha preparato una correzione diretta sul branch GitHub utilizzando il tree originale, lasciando invariati gli asset binari. Il rollback dei pulsanti/flag e commitOverrides è stato ristretto in un unico confine. Test di fault injection browser e workflow CI sul branch. Il PASS definitivo richiede l'esito dei test sul nuovo commit; niente deploy o modifica DB.

**Gate 6B.1-F finale — PASS Regia.** R1 rollback pausa/UI e R2 commitOverrides
corretti. Recupero dal tree GitHub completo; test nuovi su 3 fault point × 2
condizioni di pausa, 56 controlli browser, 231 Node, 9 Python, build PASS.
Branch e workflow dedicati, nessun deploy o modifica Supabase. Il checkout
Codex obsoleto rimane un limite dell'ambiente Codex, non dei file sul remoto.

