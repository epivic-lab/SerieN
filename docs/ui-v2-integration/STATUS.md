# UI V2.1 — Fase 0 / acquisizione definitiva

**READY FOR UI V2.1 IMPLEMENTATION GATE — STOP per approvazione della Regia.** Nessuna microfase applicativa autorizzata/eseguita.

Due ZIP ricevuti integri; segmenti `.aa` (24.000.000 byte) e `.ab` (12.752.894 byte) ricomposti in ordine: originale **36.752.894 byte**, CRC PASS, SHA-256 `9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d`. Manifest tecnico 197/197 e design 143/143 PASS; inventario completo 198 file. Risolti i precedenti blocchi di allegato/Drive.

Presenti **dossier tecnico Codex + design V2.1 2.1.1-design + V1 congelato**. Mappa verificata: 66 controlli, 31 schermate, tutte le quattro sezioni incluse M2/M3. V1 incluso identico al branch design (40 file). Testo tecnico revisionato come materiale di gate, non come autorizzazione a eseguire i prompt.

Branch effettivo `codex/ui-v2-integration`, baseline `91722fbdf6671e69deebf645c3d8bf389212f421` già completa di M3 approvata; riferimenti alternativi del dossier `codex/ui-v21`/`a67e0de`/M3 provvisoria superati dal mandato. Nessun nuovo merge/rebase/branch necessario.

[Rapporto corrente §13](REPORT.md), [evidenze](evidence/final-package/), [mapping 66 controlli](evidence/final-package/CONTROL_COMPATIBILITY.csv). Smoke nuovo reference quattro tab PASS (fallback font, non accettazione interattiva completa). Vecchi test baseline non ripetuti: diff applicativo vuoto e bundle/canonico invariati.

Da risolvere nelle microfasi autorizzate: adapter session summary/launcher, guard asincrone, DOM/ID selezionato, cascade CSS, font self-hosted con licenze (non inclusi), gate visivo/font e collaudo interattivo completo. Nessuna modifica necessaria a R1/store/backend per questi adattamenti.

Checkpoint solo documentale sul branch dedicato, SHA/confronto remoto nella consegna. Nessuna modifica UI/R1/Supabase/Auth/main/V1, merge o deploy. **Prossima azione unica: gate Regia sul dossier e sugli adattamenti del §13, poi autorizzazione esplicita della microfase nominata.**
