# Train Management — M1-V1

**M1-V1 PASS CON LIMITI**, in attesa della review Regia sul rapporto.
M1 e M1.1 approvate dalla Regia per questa verifica conclusiva.

Branch `codex/train-management-m1`, Draft PR [#3](https://github.com/epivic-lab/SerieN/pull/3).
Codice testato: `318aaf89da5a5a12e249c2d5c72d5252c4fb3431`, inizialmente coincidente con il remoto.

Build minificata reale, identica per hash a M1.1, rendering continuo e RAF nativo non intercettato. PASS funzionali: tre treni in movimento e apertura/chiusura, sincronizzazione, aggancio/sgancio, zoom/Fit/scroll desktop/tablet touch, catalogo e assenza di errori/richieste fallite.

**Limite aperto: fluidità su GPU reale NON verificata.** Nel worker solo SwiftShader, circa 0,4–0,6 frame/s in Low: resa software non fluida. Nessuna prova sostitutiva con rendering bloccato. Dettagli, due errori del solo harness corretti e provenienza delle tre sessioni nel [rapporto M1-V1](M1-V1_REPORT.md).

Suite Node/Python/browser già superate non ripetute. Nessuna modifica al prodotto/R1/Supabase/autenticazione; nuovo commit soltanto test/documentazione/evidenze. Checkpoint remoto verificato nella consegna.

Nessun merge/deploy o M2/M3. **STOP dopo M1-V1; unica prossima azione: review del rapporto da parte della Regia.**
