# Ripresa S4 — checkpoint intermedio

L'utente ha chiesto esplicitamente di fermarsi, committare e riprendere domani prima di esaurire il contesto. **Non considerare S4 conclusa. Non iniziare S5.** S3 B è approvata ufficialmente.

1. Leggere AGENTS, PROGRESS, STATUS, questo file e [rapporto](REPORT.md); verificare branch/HEAD/working tree e checkpoint remoto. Il commit intermedio introduce questo file; SHA nella consegna e risolvibile con git log sul rapporto. Origin/main deve restare intatto.
2. Codice runtime attuale già compilato e testato: 194 Node + 9 Python PASS. Nessun errore runtime rilevato nelle acquisizioni. Tutte le immagini richieste sono in [galleria](visual/GALLERY.md), con metadati e confronti PASS. Rileggere i tre moduli nuovi e il [contratto](../../S4_ROUTES.md) prima di modificarli.
3. **Prima cosa operativa: eseguire la suite browser S4 interrotta**, poi S1/S2, 5C e Phase0. Sono ancora NOT VERIFIED per questa revisione. Correggere eventuali difetti e ritestare quanto interessato. Non dedurre PASS dalle suite S3. Controllare in particolare il test di posizionamento WX, i versi dai quattro accessi, richieste accettate/rifiutate, B contemporaneo, reduced motion, occlusione e GPU cleanup/materiali runtime.
4. Eseguire il confronto prestazionale isolato con 5D/S3; **non ancora iniziato**. Uno solo browser, senza test CPU concorrenti. Campione breve esplicito; niente promesse FPS fisiche.
5. Se il runtime cambia, rigenerare i bundle e ripetere le evidenze interessate. Completare report/status, poi commit finale S4 e checkpoint remoto verificato. Fermarsi per approvazione grafica S4, senza S5.

## Ambiente e ricette

Checkout `/workspace/SerieN`; scratch `/workspace/work/s4`. Server già attivo su `http://127.0.0.1:8003/` (verificarlo). Chromium `/usr/bin/chromium`, Playwright/PIL già disponibili. Comandi browser/Node possono richiedere permesso di rete dell'ambiente anche per localhost e subtest Node; senza, il runner Node può mostrare soltanto il file come un test, risultato non sufficiente. Attesi **194 test effettivi**.

Bundle temporanei attuali, NON committati né da copiare in dist:
- S4: `/workspace/work/s4/s4-profile.js` e `s4-observer.js`.
- S3: `/workspace/work/s3/s3-profile.js`, baseline `fd32b43fe9438980bde798fd76773f8af2f3f5fc`.
- 5D: `/workspace/work/s3/phase5d-profile.js`, archivio `58bbe62bffb37f19125ddb38513502b5ca306821`; bundle minificato verificato SHA-256 `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`.

Ricostruire S4 dalla radice con:

```sh
node docs/_active/turnouts/evidence/S4/recipes/build-profile.mjs . /workspace/work/s4/s4-profile.js
node docs/_active/turnouts/evidence/S4/recipes/build-observer.mjs . /workspace/work/s4/s4-observer.js
python3 docs/_active/turnouts/evidence/S4/recipes/run-regressions.py
```

Il driver conserva cwd/output temporanei delle suite storiche per non sovrascrivere prove precedenti. Contiene percorsi `/workspace` espliciti da adattare se l'ambiente cambia. Copia in `regressions.json` gli esiti; si ferma al primo errore. Il driver in esecuzione è stato terminato con i suoi processi figli alla richiesta di pausa; **nessuna suite del driver aveva ancora prodotto un esito finale**.

Per ricostruire i baseline se lo scratch manca, estrarre `app.js` e `src` da `git archive` dei commit indicati in directory temporanee, collegare node_modules del checkout, usare il builder S3 storico per S3 e `scripts/performance/build-profile.mjs` per 5D. Nessun checkout/reset/rebase necessario.

Performance:

```sh
SERIEN_URL=http://127.0.0.1:8003/ S4_5D_BUNDLE=/workspace/work/s3/phase5d-profile.js S3_BASELINE_BUNDLE=/workspace/work/s3/s3-profile.js S4_BUNDLE=/workspace/work/s4/s4-profile.js S4_PERF_OUTPUT=/workspace/work/s4 python3 tests/browser-turnout-arrows-performance.py
```

Quattro contesti sequenziali: 5D, S3 B configurata senza hover, S4 rosso persistente, S4 rosso + B attivo. 16 intervalli RAF dopo tre di riscaldamento; in più costo CPU di 1600 proiezioni forzate con tre treni osservati in movimento. Nessuna misura di questa nuova suite è stata acquisita al checkpoint.

Acquisizione definitiva già PASS:

```sh
SERIEN_URL=http://127.0.0.1:8003/ S3_BASELINE_BUNDLE=/workspace/work/s3/s3-profile.js S4_BUNDLE=/workspace/work/s4/s4-profile.js S4_OUTPUT=/workspace/work/s4/visual-final python3 tests/capture-turnout-arrows.py
python3 tests/check-turnout-arrows-captures.py /workspace/work/s4/visual-final
```

Le immagini consegnate non richiedono una nuova acquisizione se non cambia il runtime. Scartata la prima fixture con punto fuori dal raccordo 62 mm; quella finale percorre 120 mm a ritroso con Journey e usa il punto reale trovato. Le provenienze opposte osservano lo stesso percorso WX nei due versi. I metadati vengono salvati dopo ogni immagine.

Al termine effettivo della S4 usare la domanda dell'utente: «S4 completata e checkpoint remoto verificato. Approvi la resa grafica e funzionale delle frecce rosse? Autorizzi il passaggio a S5 oppure desideri rifiniture?» **Non usarla per questo checkpoint incompleto.**
