# REL-001 — Release Packaging Gate

**Proposta: READY FOR REGIA RELEASE REVIEW.** Corretto e verificato soltanto il packaging locale. Nessun merge, PR di release, avvio manuale Actions Pages o deploy. L'approvazione del pacchetto e qualsiasi rilascio restano alla Regia. **STOP REL-001.**

## Baseline

- Repository `epivic-lab/SerieN`; unico branch di lavoro/push `codex/ui-v2-integration`.
- U9 approvato nel mandato Regia: **`50d7c744e4b9dbbe20197ec8f959fdccb16edb5b`**, coincidente con HEAD locale e remoto prima della modifica.
- Main produttiva **`184cc9ba93a6b35493f365b2ffcb20ef0645963d`**, verificata sul remoto e antenata di U9.
- Il checkout iniziale era pulito sul branch locale `work` alla main indicata. Recuperato il branch autorizzato senza reset, rebase o riscrittura; `work/` contiene soltanto strumenti temporanei creati per questa verifica.
- Letti AGENTS, PROGRESS, STATUS, U9_REPORT e l'audit release-readiness U9. REL-001 corrisponde al workflow effettivo: `ui/` non veniva copiata.

## Diff esatto

Unica modifica al workflow, nello step `Prepare site`:

```diff
-          cp -R dist assets _site/
+          cp -R dist assets ui _site/
```

Checkout, setup, validatori/test, build, copia documentazione, upload, deploy e trigger invariati. Pages continua a partire soltanto da push su `main` o `workflow_dispatch`; nessuna di queste operazioni è stata eseguita. [Diff integrale](evidence/REL001/workflow-diff.txt).

## Esecuzione e comandi

[Ricetta](evidence/REL001/prepare.py), [comandi con exit code](evidence/REL001/commands.json), [blocco shell estratto dal workflow reale](evidence/REL001/prepare-site.sh). Ogni preparazione parte da `_site` vuoto; nessuna directory di sviluppo viene servita come fallback.

| Comando / controllo | Exit code | Evidenza |
| --- | ---: | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git ls-remote origin ...` | 0 | branch.txt, baseline-head.txt, remote-baseline.txt |
| `git merge-base --is-ancestor <main> <U9>` | 0 | main-ancestor.txt |
| `git diff --exit-code <U9> -- <file protetti>` | 0 | protected-files.txt |
| `npm ls --depth=0` | 0 | esbuild 0.25.12 e three 0.163.0 già presenti; package/lock invariati |
| `npm run build`, con Node 22 nel PATH | 0 | build.txt, versions.txt, bundle.json |
| `bash -euo pipefail -c <Prepare site reale>` | 0 | prepare-site.txt, prepare-site.sh |
| `python3 docs/_active/ui-v21/evidence/REL001/audit-package.py` | 0 | package-audit.json |
| `node docs/_active/ui-v21/evidence/REL001/check-browser.mjs`, prima esecuzione | 1 | browser-first.txt, browser-results-first.json |
| Stesso comando, seconda esecuzione | 1 | browser-second.txt, browser-results-second.json |
| Stesso comando, esecuzione conclusiva | 0 | browser.txt, browser-results.json |
| `python3 docs/_active/ui-v21/evidence/REL001/finalize-package.py` | 0 | artifact-size.json; doppia preparazione e confronto documentazione |
| `git diff --check` e verifica finale del perimetro | 0 | final-checks.json |

Ambiente: Node **22.23.5** per la build corrispondente al major del workflow, Python 3.12.14, Chromium 154. Anche una prima build con Node 24.19.0 era riuscita; il gate conclusivo usa Node 22. Dipendenze applicative già disponibili: non necessario rieseguire `npm ci`. Node 22 e Playwright Core sono strumenti isolati temporanei sotto `work/`, esclusi da package, lock e commit; nessuna nuova dipendenza del progetto. La matrice U9 e i test ferroviari non sono stati rieseguiti, come richiesto.

Bundle produttivo: **1.088.369 byte**, SHA-256 `11085af332a3636cb23e1bcca2b88d669dfd47942fedbff7c183203ce8b66bd2`, **identico al bundle U9 approvato**.

## Contenuto e chiusura dei riferimenti

[Inventario e hash](evidence/REL001/package-audit.json): 67 file sotto `ui/`, `assets/` e `dist/`, confrontati byte per byte con i file da impacchettare. Inclusi anche `index.html`, `style.css`, i due moduli Auth originali, `legacy-v0.1.html`, `.nojekyll` e l'intero albero `docs/`.

- Tutti i **9 CSS** di `ui/css/` presenti; i **5 CSS runtime** collegati da `index.html` sono caricati nell'ordine originale, dopo `style.css`.
- **Cinzel Decorative 700, Federo 400, Cutive Mono 400**: WOFF2 con firma `wOF2`, hash corrispondenti al manifest; **tre licenze OFL** incluse, con testo e hash preservati, oltre al manifest originale.
- Tutte le **6 texture JPG**, compresa `brass-brushed.jpg`, e `serien-sprite.svg` inclusi; il simbolo `emb-maple` esiste nello sprite impacchettato.
- **83 riferimenti** controllati: HTML, URL nei CSS, import locali Auth, risorse letterali del bundle, preview derivate dal manifest/catalogo e sei modelli Kenney. Verificati anche eventuali URI esterni ai chunk JSON dei GLB.
- Riferimenti risolti sotto **`/SerieN/`**: `./ui/...`, `../fonts/...`, `../assets/...`, immagini e collegamenti documentali diretti dell'HTML. **Zero asset runtime referenziati mancanti**, zero percorsi usciti dalla base.
- `app.js`, `src/`, `node_modules/`, `work/` e `.git/` assenti da `_site`; nessun symlink. Il bundle non richiede questi file al caricamento verificato. Le dipendenze incorporate dal bundler restano incorporate.
- **Zero import/richieste Google Fonts runtime**. L'URL remoto preesistente dell'SDK Auth è registrato separatamente nell'audit; non è un font e non viene certificato da questo gate. Provenienza font e vecchi snapshot in `docs/` non sono richieste dell'applicazione.

La chiusura riguarda il runtime applicativo e i suoi collegamenti diretti, non l'eseguibilità di tutti gli esempi o link storici contenuti nella documentazione di audit. La documentazione è comunque copiata integralmente e confrontata byte per byte durante la misura conclusiva.

## HTTP e browser dal pacchetto

[79 richieste HTTP agli asset](evidence/REL001/http-assets.json): **tutte 200**, corpo identico al file in `_site`; **nessun errore HTTP**. Il server della [ricetta browser](evidence/REL001/check-browser.mjs) espone esclusivamente `_site` sotto `http://127.0.0.1:8765/SerieN/`, senza fallback alla root del repository.

La fixture carica l'`index.html` impacchettato e sostituisce soltanto la risposta del modulo Auth con un bootstrap di test locale. Tutti i CSS, font, asset e **il vero `dist/game.js` approvato** arrivano dal pacchetto via HTTP. Non viene modificato alcun file Auth o applicativo. Le richieste esterne sono intercettate e farebbero fallire il controllo; il risultato finale ne registra **zero**, con zero request failure, zero page error e zero errori console.

Chromium conferma fogli CSS con regole effettive e i tre FontFace `loaded` dopo decodifica. Per la targa, Chrome DevTools Protocol conferma **Federo-Regular, font custom locale, 15 glifi renderizzati**: la verifica non si limita al nome della famiglia dichiarata.

**Autumn Railways PASS**, 1440×900 e 390×844: targa presente, testo intero, altezza 46/44px, Federo 400, incisione/text-shadow, texture brass dal percorso `/SerieN/ui/assets/textures/brass-brushed.jpg` e foglia dal vero sprite locale. Catture ispezionate direttamente: [desktop](evidence/REL001/autumn-railways-desktop.png), [mobile](evidence/REL001/autumn-railways-mobile.png). Non è una nuova accettazione del design.

I due fallimenti intermedi sono dell'harness: prima timeout durante la stabilizzazione della screenshot mobile su WebGL software; poi timeout predefinito di 30s perché l'opzione `waitForFunction` era passata come argomento anziché opzione. Recupero limitato al test: clip diretto dell'header renderizzato e timeout esplicito di 120s nella posizione corretta. Asserzioni conservate e tutte superate nell'esecuzione conclusiva; nessun sorgente applicativo modificato per ottenere PASS.

## Dimensione complessiva

[Misura finale](evidence/REL001/artifact-size.json), byte decimali con zeri iniziali per mantenere stabile la lunghezza del rapporto incluso nel pacchetto:

```text
siteFiles: 000000003562
siteBytes: 000718776848
docsFiles: 000000003489
docsBytes: 000716008486
uiBytes: 000000495688
assetsBytes: 000001113948
distBytes: 000001088369
tarBytes: 000721807360
```

`siteBytes` comprende **tutta la documentazione, il presente rapporto e le evidenze REL-001 finali**. `tarBytes` misura un archivio GNU tar locale non compresso dell'intero `_site`, inclusa `.nojekyll`, creato con `tar --format=gnu --dereference --hard-dereference -cf work/rel001-pages.tar -C _site .`. Entrambe le misure sono inferiori a **1 GiB**. Non è una misura di un upload Actions remoto, che non è stato eseguito. Due preparazioni fresche verificano gli stessi conteggi/dimensioni dopo l'inserimento delle misure e l'identità di tutta `docs/`. `_site` e tar generati sono esclusi dal commit.

## Invarianti, limiti e checkpoint

Nessuna modifica a UI V2.1 approvata, motore R1/dispatcher, M1/M2/M3, Auth/Supabase, layout, asset originali, CSS frozen Claude, design, test ferroviari, dipendenze o altri step workflow. Il confronto Git con U9 e il bundle identico documentano l'invarianza; non vengono dichiarati nuovi PASS ferroviari. PROGRESS e STATUS aggiornati soltanto per registrare questo gate e lo STOP.

**NOT VERIFIED:** provider OAuth reale, SDK/Auth remoto, Supabase live, sito Pages pubblicato, upload/deploy Actions, prestazioni o resa su GPU fisica, altri browser. La fixture Auth locale non certifica OAuth. Non è stata consultata la vecchia directory di sviluppo come prova della completezza di Pages.

**Nuovo commit SHA:** è il commit atomico che contiene questo rapporto; SHA completo effettivo e uguaglianza HEAD locale/remoto sono allegati nella consegna Regia dopo il push normale. Come nel rapporto U9, il file incluso nel commit non contiene un hash autoreferenziale. Il checkpoint è ricavabile senza ambiguità con:

```sh
git log -1 --format=%H -- docs/_active/ui-v21/REL001_REPORT.md
git rev-parse HEAD
git ls-remote origin refs/heads/codex/ui-v2-integration
```

Il push è consentito esclusivamente a `codex/ui-v2-integration`, dopo controllo del remoto ancora alla baseline U9 e dell'ascendenza fast-forward. La consegna è completa soltanto quando la verifica remota coincide. **READY FOR REGIA RELEASE REVIEW è una proposta tecnica, non autorizzazione al rilascio. STOP obbligatorio dopo il checkpoint; nessuna fase ulteriore avviata.**
