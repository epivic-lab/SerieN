# S5 — Handoff dopo chiusura tecnica

**S5 COMPLETATA tecnicamente, revisione utente PENDING. S6/S7 NON autorizzate e NON iniziate.** S4 esplicitamente approvata nella richiesta S5, inclusi glowB e frecce340ms.

## Unica prossima azione

Attendere la revisione del [rapporto e matrice S5](REPORT.md), della [telemetria](browser/browser.json) e del [grafico](plots/braking.png), poi l’autorizzazione esplicita S6. Non rifare l’implementazione o trattare le vecchie note di lavoro come stato corrente.

La richiesta corrente impone solo un commit locale e vieta il push senza ulteriore autorizzazione. **S5 non pubblicata sul remoto**: checkpoint remoto S4a3ace86 preservato. Nessun merge/rebase/reset/deployment. Prima di qualsiasi azione futura verificare branch, HEAD, working tree e remoto, e rispettare questa restrizione finché l’utente non autorizza il push.

Commit: quello che introduce REPORT.md S5, messaggio `feat(safety): prevent invalid turnout traversals`; SHA effettivo nella consegna e risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S5/REPORT.md`. Non usare un falso SHA autoreferenziale nei documenti.

## Risultati e limiti

217Node,9Python/JMRI,build; cinque browser S4/S1/S2/5C/Fase0 e ulteriori6S5 PASS. Guard invariants/prove di arresto/UNKNOWN/riarmo e occupazione persistente verificati. Benchmark **finale** attivo5D/S4/S5 entro soglie. Dati precedenti al mantenimento occupazione esclusi. Le evidenze storiche S3/S4 restano intatte. Non c’è ancora codice S6 per segnaletica o suono.

Grafica B/rosso340ms,150rotaie/75letti, massicciata, asset, router e Journey invariati.65file bloccati e5funzioni calde exactS4; source map del profilo safety confrontata ai quattro moduli finali. Guardia nel core indipendente dal rendering. Dopo arresto automatico completo serve riarmo; STOP manuale/STOP ALL mantengono autorità. Prenotazioni: solo adattatore interno testato, nessun servizio esistente collegato. Physics in mm del simulatore, cap elapsed0,2s; hardware GPU/touch e matrice completa5D NOT VERIFIED.

## Riproduzione

Comandi e hash effettivi in [commands.json](commands.json). Ricette S4 build-profile/build-observer creano bundle temporanei dal checkout corrente, fuori da dist. [Driver regressioni S5](recipes/run-regressions.py) conserva output separati per evitare sovrascritture storiche; [invarianti](recipes/check-invariants.py) controlla i file e gli hot path autorizzati. Test integrato e benchmark in `tests/browser-railway-guard*.py`, test deterministici in `tests/railway-guard.test.js`. Eseguire benchmark senza altre suite/browser/CPU concorrenti.

Scratch usato `/workspace/work/s5`; server8003 localhost. Baseline S4 `/workspace/work/s4-refine/s4-profile.js` verificata contro il commit approvato,5D `/workspace/work/s3/phase5d-profile.js` da58bbe62. Se persi, ricostruire sorgenti con git archive in directory temporanee e node_modules del progetto, usando la ricettaS4 perS4 e `scripts/performance/build-profile.mjs` per5D. Registrare nuovi hash senza reset/rebase/checkouts distruttivi. Nessun bundle temporaneo nel prodotto/commit. Matplotlib è soltanto lo strumento dell’ambiente per il grafico, non una nuova dipendenza dell’app.

Domanda finale: «S5 è pronta per la tua revisione. Approvi il passaggio a S6 — Cartello STOP scenico e campanello?»
