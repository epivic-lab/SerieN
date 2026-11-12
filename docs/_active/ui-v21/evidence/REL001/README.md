# REL-001 — evidenze essenziali

Baseline e build: `commands.json`, ricevute TXT, `bundle.json`. Pacchetto: `package-audit.json`, `http-assets.json`. Browser conclusivo: `browser-results.json`, `browser.txt` e due crop PNG ispezionati. I risultati `*-first` / `*-second` sono failure dell'harness conservati, non PASS. Misura finale: `artifact-size.json`, inclusiva di tutta docs e delle evidenze presenti.

## Riproduzione locale senza pubblicazione

Dal repository, con Chromium disponibile:

```sh
npm install --prefix work/rel001-tools --cache "$PWD/work/npm-cache" --no-save --package-lock=false node@22 playwright-core
PATH="$PWD/work/rel001-tools/node_modules/.bin:$PATH" python3 docs/_active/ui-v21/evidence/REL001/prepare.py --recheck
python3 docs/_active/ui-v21/evidence/REL001/audit-package.py
node docs/_active/ui-v21/evidence/REL001/check-browser.mjs
python3 docs/_active/ui-v21/evidence/REL001/finalize-package.py
```

Sono strumenti temporanei: nessuna modifica a package.json/lock. `--recheck` consente il commit REL-001 discendente da U9; senza opzione il kickoff pretende HEAD esattamente U9. Lo script finale ricrea `_site` da zero due volte ed esige identità di documentazione e dimensioni. Il server browser espone solo `_site/` sotto `/SerieN/` sulla porta 8765; nessun fallback al checkout. Auth è sostituito soltanto dalla fixture nella risposta browser: OAuth reale NOT VERIFIED. Nessun comando pubblica o avvia Actions.

## Recuperi dell'ambiente

- Il primo fetch ha trasferito gli oggetti ma la sequenza è terminata con exit128 su `git rev-parse origin/codex/ui-v2-integration`: il checkout aveva un refspec ristretto a main. Fetch esplicito verso il remote-tracking ref: exit0.
- `git switch --track -c ... origin/codex/ui-v2-integration`: exit128 perché quel ref non era riconosciuto come branch tracciabile dal refspec. `git switch --no-track -c ... refs/remotes/origin/codex/ui-v2-integration`: exit0. Aggiunti in sola configurazione locale il refspec del branch autorizzato e il suo upstream: exit0. Nessuna riscrittura o cambio di branch remoto.
- Prima installazione isolata di Playwright: exit1 per cache npm predefinita in filesystem di sola lettura. Ripetuta con cache in `work/npm-cache`: exit0. Successiva installazione isolata di Node22/Playwright: exit0. Nessuna dipendenza applicativa aggiunta.
- Prima build Node24: exit0. Gate produttivo ripetuto con Node22: exit0, bundle identico U9.
- Browser primo run: exit1, timeout della screenshot mobile in attesa di stabilità su WebGL software. Secondo run: exit1, opzione timeout di `waitForFunction` nella posizione sbagliata, quindi limite predefinito30s. Recupero nel solo harness: clip dell'header reale e opzione120s corretta, tutte le asserzioni conservate. Run conclusivo: exit0, zero errori HTTP/richieste esterne/pageerror/errori console.

Le misure sono byte decimali a larghezza fissa per evitare che la registrazione delle dimensioni cambi la lunghezza della documentazione misurata. Il tar locale è non compresso, non è un upload Actions e non viene committato. Lo SHA del commit contenente queste prove e il riscontro remoto vengono consegnati dopo il push; non si inserisce nel commit un hash autoreferenziale.
