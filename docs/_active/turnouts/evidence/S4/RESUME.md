# Handoff dopo chiusura tecnica S4

**S4 PASS tecnico. Approvazione grafica/funzionale dell'utente PENDING; S5 NON autorizzata e NON iniziata.**

**Aggiornamento successivo:** la [rifinitura conservativa](refinement/REPORT.md), ripresa da `48a89d1`, corregge soltanto la tangente locale delle punte sui rami curvi e rinnova test/catture/performance. Il rapporto e la galleria della chiusura precedente restano storici. Prima di qualsiasi ripresa leggere il rapporto aggiornato; non rifare S4.

La ripresa dal checkpoint intermedio `c54c8c12d43a07c62228b99b8ffdbd66cedb13a5` è completata: tutte le verifiche che erano rimaste pendenti sono registrate nel [rapporto finale](REPORT.md), nei [comandi/provenienza](commands.json) e nei [risultati browser](tests/regressions.json). Non eseguire di nuovo l'implementazione o trattare il vecchio stato di pausa come corrente. La versione intermedia di questo file resta nel commit c54c8c1.

## Unica prossima azione

Attendere l'approvazione visiva delle [frecce rosse aggiornate](refinement/visual/GALLERY.md) ed eventuali rifiniture. La variante blu B è già approvata e invariata. Il rosso indica un itinerario impostato, non via libera. Nessun lavoro S5, nuova frenata, STOP o audio è incluso.

Il commit finale che aggiorna REPORT.md contiene test/evidenze e chiusura; SHA locale/remoto verificato nella consegna e risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S4/refinement/REPORT.md`. Prima di qualsiasi futura attività verificare branch, HEAD, working tree e remoto; solo feature/turnouts, mai push main automatico.

## Riproduzione delle verifiche

Le ricette versionate [build-profile](recipes/build-profile.mjs) e [build-observer](recipes/build-observer.mjs) creano bundle temporanei fuori da dist. [run-regressions](recipes/run-regressions.py) esegue le cinque suite in sequenza con cwd/output separati per non sovrascrivere i report storici. [check-invariants](recipes/check-invariants.py) verifica sorgenti, funzioni calde, canonico e bundle; i percorsi `/workspace` sono espliciti e vanno adattati se l'ambiente cambia. Il primo collaudo aveva runtime byte-identico a c54c8c1; la rifinitura successiva modifica solo la tangente delle punte. Per i nuovi comandi/output e le baseline leggere [provenienza aggiornata](refinement/commands.json).

Baseline S3 fd32b43, 5D58bbe62; hash e comandi effettivi in commands.json. Se manca lo scratch, ricostruire da git archive in directory temporanee, con node_modules del checkout e gli script storici dei rispettivi checkpoint, senza checkout/reset/rebase. Server locale usato: http://127.0.0.1:8003/; Chromium/SwiftShader. Le misure software non certificano FPS fisici o tutti i dispositivi touch.

L'approvazione richiesta alla chiusura è: «S4 completata e checkpoint remoto verificato. Approvi la resa grafica e funzionale delle frecce rosse? Autorizzi il passaggio a S5 oppure desideri rifiniture?»
