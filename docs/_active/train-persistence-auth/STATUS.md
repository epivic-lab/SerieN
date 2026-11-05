# Train Persistence Auth — stato 6B.1

Percorso corrente: Supabase Auth Google, `auth.uid()` e allowlist server. Le
sperimentazioni ownerless/D09/D10 del branch storico non sono l'architettura
operativa. Baseline main `9126788d3c68e43c0687e948db767bfccbbfc774`, R1 `348bfeff`.

6B.1: **PASS tecnico**, Capture & Restore locale verificato; cloud disabilitato.
231 Node, 9 Python, build, 30 controlli browser, regressioni 5C/Fase 0 e sei
miniature identiche: PASS. Verifica del checkpoint remoto nella consegna finale. Nessuna migrazione,
nessun merge o deploy. Consegna e risultati nel `6B1_CAPTURE_RESTORE_GATE.md`.
Prossima azione unica: collaudo indipendente della Regia; nessun primo salvataggio
cloud o cambiamento DB autorizzato da questa consegna.

I documenti in `reference/` provengono esattamente dal checkpoint storico
`be2ce0322f31cf3ee6c8e92f3e58a4501c386a1b` (lettura via GitHub, senza merge).
Il documento prodotto non esisteva su main al kickoff. Sono riferimenti di
contratto: le precedenti sezioni Auth/capacità/ownerless sono superate dalla
richiesta 6B.1 e da SUPABASE_SAVE_PROPOSAL.md. Lo schema operativo v1 mantiene
immutata la struttura di STATE_SCHEMA; orientamento -1 e ricovero richiedono 6D.

## 6B.1-F — recovery GitHub remoto (Regia, 2026-11-05)
Il checkout Codex obsoleto work/5c8f0f5 non era idoneo. La Regia ha preparato una correzione diretta sul branch GitHub utilizzando il tree originale, lasciando invariati gli asset binari. Il rollback dei pulsanti/flag e commitOverrides è stato ristretto in un unico confine. Test di fault injection browser e workflow CI sul branch. Il PASS definitivo richiede l'esito dei test sul nuovo commit; niente deploy o modifica DB.
