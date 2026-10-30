# Stato conclusivo e ripresa

**5D completata il 30 ottobre 2026. 5E non iniziata: richiede una nuova istruzione.** La sospensione del checkpoint serale `5ae8ee9` è superata dalla richiesta di completamento e dalla chiusura documentata.

- Repository autorizzato `epivic-lab/SerieN`; `first` e `SerieN Control` non modificati. Branch `performance/phase-5d`, baseline 5C `303525c`, codice finale `e8d81d3`.
- Leggere `docs/PERFORMANCE_AUDIT_5D.md`, `FINAL_GATES.json`, `COMPARISON.md/json` e `BLOOM_LIFECYCLE_FIX.md`. Non ripetere fasi già concluse né presentare la 5E come avviata.
- Prima di nuovo lavoro: controllare HEAD/branch/working tree e remoto, conservare ogni modifica successiva. Il remoto `main` è stato osservato a `f582b12`, con due commit di soli asset/file di sistema rispetto alla base comune `618f538`; non sono stati cancellati o integrati automaticamente.
- Provenienza: confronti principali CPU/RAF/F su `303525c` e `5ae8ee9`; ritenzione Bloom corretta dopo osservazione e prova della cache, con nuove verifiche sulla build finale. Il render attivo resta byte-identico; dettagli nel rapporto.
- Risultati: 131 Node, 9 Python, build, cinque suite browser, otto coppie finali pixel-identiche, 39+39 acquisizioni normali, sei sessioni F/36 cicli, 108.000 passi logici per revisione, cache Bloom e sessione finale di 138,9 s, Pages sotto `/SerieN/`. Nessun merge o deployment.
- I dati sono nel repository. `/tmp/serien-5d` contiene solo copie di lavoro, server e bundle temporanei rigenerabili: non sono l’unico salvataggio. I bundle di profiling non vanno in `dist` né pubblicati.
- Per riprodurre quando richiesto: archiviare la baseline Git in directory temporanea, installare/verificare le dipendenze bloccate, compilare; servire baseline/candidato su porte distinte. Usare `build-profile.mjs`, `browser-benchmark.py`, `visual-regression.py`, `finish-validation.py`, `quality-retention.py`, `long-simulation.mjs` e `pages-smoke.py` con un browser per volta e output separati dalle prove storiche. `summarize.py --require-complete` controlla il dataset A–F.
- Il vecchio `checkpoint-evidence/planned-run-rest.py` documenta una sequenza preparata alla sospensione, non un’autorità da eseguire automaticamente. Gli output effettivi sono `VALIDATION_RUN.json` e `regression/`.
- Rimangono prove di prodotto su GPU fisiche/dispositivi reali e sessioni di molte ore. Non reinterpretare FPS SwiftShader come FPS desktop, contatori WebGL come byte GPU o heap limitato come prova universale di assenza di leak.
- Recupero: tutti i checkpoint sono conservati nella storia; preferire revert mirati, senza reset distruttivi. Non rimuovere i contributi remoti aggiunti nel frattempo.
