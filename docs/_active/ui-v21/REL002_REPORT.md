# REL-002 — Release package optimization

**Verdetto tecnico proposto: READY FOR REGIA RELEASE REVIEW.** Nessun merge, deploy, avvio manuale Pages o PR di release. La decisione sul rilascio resta esclusivamente alla Regia. STOP dopo REL-002.

## Baseline e perimetro

Repository `epivic-lab/SerieN`, unico branch autorizzato `codex/ui-v2-integration`. REL-001 approvato: `06a01c5ae70bfd4147e2c866f06803139904f264`; main produttiva `184cc9ba93a6b35493f365b2ffcb20ef0645963d`. Verificati remoto, ascendenza, HEAD, upstream e working tree pulito prima delle modifiche. Il checkout iniziale era `work` sulla main indicata; recuperato il branch autorizzato e configurato il tracking mancante, senza reset/rebase. [Baseline](evidence/REL002/baseline.json).

Letti AGENTS, PROGRESS, STATUS, rapporti U9/REL001, package-audit, artifact-size e browser-results REL001. La sola modifica funzionale è nello step **Prepare site**, senza altri cambiamenti al workflow. [Diff esatto](evidence/REL002/workflow-diff.txt), [ricetta eseguibile](evidence/REL002/prepare-site.sh). Nessuno script aggiunto alla pipeline: la whitelist esplicita usa `cp --parents` per creare soltanto le directory necessarie. `cp -R dist assets ui _site/` conservato.

La pulizia riguarda solo `_site`, dopo rifiuto di symlink e verifica `realpath` contro la directory temporanea attesa. Tre preparazioni producono manifest identici: residui REL001 completi, residuo artificiale e destinazione assente. Il test separato con symlink verso `/tmp` fallisce prima della pulizia e preserva il link. [Guardia](evidence/REL002/cleanup-guard.json).

## Chiusura documentale e whitelist

[Chiusura e archi](evidence/REL002/document-closure.json), [analizzatore](evidence/REL002/document-closure.py), [whitelist con riferimenti entranti per ciascun file](evidence/REL002/whitelist.json). Analizzati HTML principale e legacy, moduli Auth, bundle reale, CSS, manifest/cataloghi e risorse dinamiche; riutilizzato l'audit REL001 degli 83 riferimenti/79 target e rieseguito sul nuovo artefatto. Il parser aggiuntivo segue HTML `href/src/poster`, `object[data]`, fetch della pagina pubblica, URL CSS e link Markdown transitivi. Nessuna dipendenza locale mancante nella chiusura.

| Categoria | File e motivazione |
| --- | --- |
| Runtime | `docs/jmri-layout/minimap-canonical.svg`, immagine effettiva del dialogo Track plan. |
| Collegamento pubblico della UI | `docs/consolidation/index.html`, aperto dal link reale del dialogo Track plan. |
| Fonti tecniche pubbliche | `source.xml`, `railmodeller-original.pdf`, dossier `SerieN_Dossier_Tecnico_Codex_REV_A.pdf`: link della pagina pubblica e metadati originali incorporati nel bundle. `docs/phase-0/kato-parts.csv` conservato come fonte del modello canonico, anche se non scaricato durante il caricamento ordinario. |
| Dipendenze della pagina pubblica | `layout-canonical.svg`, `canonical-graph.json`, `desktop.png`; grafo caricato con fetch e SVG tramite object, immagine e link relativi preservati. |
| Rapporti pubblici transitivi | `consolidation/FINAL-REPORT.md`, `README.md`, `INTAKE.md`, `phase-1/README.md`; conservati tutti i loro link documentali locali. |
| Evidenze storiche intenzionalmente linkate | `consolidation/node-tests.txt`, `parser-tests.txt`, `browser-result.json`, `smoke-result.json`, `consist/consist-check.json`; `train-deck/browser-result.json`; `phase-1/baseline-ui.json`, `railway-preservation.json`, `browser-result.json`, `node-tests.txt`, `parser-tests.txt`. Restano pubbliche perché raggiungibili, senza copiare intere directory. |
| Solo sviluppo/provenienza | Archivi U0–U9, REL001/REL002, font-staging, screenshot e log non raggiungibili esclusi. Il `source_manifest` di `ui/fonts/manifest.json`, i nomi TTF e i percorsi di codice nei rapporti/JSON sono metadati, non import/fetch o collegamenti browser. WOFF2, licenze e manifest pubblicati integralmente. |

Sono **24 documenti**. Non si eliminano documenti Git né link intenzionali. [3.465 esclusioni individuali con hash, dimensione e motivo](evidence/REL002/excluded-files.json): tutte esterne alla chiusura, tutte sotto `docs/`, nessuna esclusione per soglia di dimensione. Le evidenze REL002 restano in Git e sono assenti da Pages.

I PDF inclusi sono autosufficienti: 11 e 1 pagine, nessuna azione URI/GoToR nelle annotazioni o OpenAction. [Ispezione PDF](evidence/REL002/pdf-dependencies.json). L'XML originale contiene una PI stylesheet JMRI preesistente e malformata e uno schema descrittivo remoto; il browser non richiede né XSL né XSD. [Probe separato](evidence/REL002/xml-probe.json): solo XML200; il favicon automatico `/favicon.ico`404 è una richiesta accessoria di quella navigazione isolata, già assente in REL001, non una dipendenza XML o una regressione dell'app. Il file XML resta byte-identico e non è una pagina HTML da trasformare; nessuna promessa di rendering JMRI o accesso allo schema remoto.

## Integrità e regressioni

[Manifest REL001](evidence/REL002/manifest-rel001.json), [manifest REL002](evidence/REL002/manifest-rel002.json), [73 hash applicativi](evidence/REL002/application-hashes.json). Ogni file incluso è identico al file corrispondente REL001; esclusi soltanto documenti non necessari. Tutti i 67 file sotto dist/assets/ui, 9 CSS, font/OFL, texture, sprite, modelli e manifest preservati. I sei file della root applicativa sono anch'essi identici.

Build locale Node24.19.0/esbuild0.25.12 PASS, senza reinstallare dipendenze già corrette. Il risultato è identico alla build Node22 REL001 e al bundle U9 approvato: **1.088.369 byte**, SHA-256 **`11085af332a3636cb23e1bcca2b88d669dfd47942fedbff7c183203ce8b66bd2`**. Node22 resta invariato nel workflow. Nessun delta a lockfile o dipendenze.

[269 identità U9](evidence/REL002/u9-reuse-identity.json): sorgenti, test, CSS e asset verificati nuovamente per SHA-256. Le suite U9 approvate sono riusate come risultati storici ai medesimi byte; non sono nuove esecuzioni. Nessuna riesecuzione indiscriminata della matrice R1/M1/M2/M3, nessun test ferroviario modificato. Motore, dispatcher, topologia, auth, dominio, shell, targa, CSS e asset invariati. Il workflow Pages è escluso intenzionalmente dal confronto U9 perché REL001/REL002 ne correggono il packaging.

## Artefatto, HTTP e browser

[Browser conclusivo](evidence/REL002/browser-results.json), [HTTP e hash dei corpi](evidence/REL002/http-assets.json), [harness](evidence/REL002/check-browser.mjs): **PASS**. Tutti i 79 target REL001 più 18 nuovi documenti della chiusura: **97 HTTP200**, corpo uguale al file impacchettato. Tutti i **3.465 percorsi esclusi** restituiscono404 nelle probe negative separate; `/app.js` fuori base restituisce404, nessun fallback. Questi404 attesi non sono errori runtime.

Smoke dell'app a **1440×900 e 390×844**: shell, cinque CSS V2.1 runtime, tre font decodificati e Federo custom effettivamente renderizzato, brass e SVG maple, canvas WebGL2, tre card Train Dock, apertura/chiusura Menu e link Track plan PASS. Da entrambe le UI il link reale apre la pagina pubblica; SVG object disponibile, quattro righe terminali ricavate dal fetch JSON e tutti i link della pagina HTTP200. Le catture della pagina pubblica identificano il viewport dell'app chiamante; il popup usa il viewport predefinito del contesto (1440×900). Zero richieste Google Fonts o esterne, zero request failure, page error o console error; zero404 runtime o sulle dipendenze HTML pubbliche.

Catture ispezionate: [shell desktop](evidence/REL002/shell-1440.png), [shell mobile](evidence/REL002/shell-390.png), [targa desktop](evidence/REL002/autumn-railways-desktop.png), [targa mobile](evidence/REL002/autumn-railways-mobile.png), [documento da desktop](evidence/REL002/public-doc-1440.png), [documento da mobile](evidence/REL002/public-doc-390.png). La matrice ferroviaria non è ricertificata da questo smoke. Il server del test espone esclusivamente `_site` sotto `/SerieN/`, senza fallback di sviluppo. Il modulo Auth viene sostituito solo nella risposta della fixture browser con bootstrap locale: nessun file Auth modificato, nessuna prova OAuth reale. Bundle, HTML, CSS e asset sono quelli impacchettati.

## Dimensioni

[Misure](evidence/REL002/artifact-size.json), byte decimali, tar GNU non compresso con gli stessi flag REL001.

| Misura | REL001 | REL002 |
| --- | ---: | ---: |
| Sito | 718.776.848 | **4.491.628** |
| Documentazione | 716.008.486 | **1.723.266** |
| Numero file | 3.562 | **97** |
| Documenti | 3.489 | **24** |
| Tar locale | 721.807.360 | **4.577.280** |

Riduzione **714.285.220 byte, 99,375101%**. Baseline ricostruita con la ricetta originale prima di aggiungere evidenze REL002: coincide esattamente con dimensioni e conteggi approvati REL001. `_site`, tar, strumenti temporanei e residui restano non committati. Per riprodurre la baseline dopo questo checkpoint usare i file `docs/` del commit REL001, non l'albero corrente che contiene nuove evidenze; lo script `verify-package.py` richiede esplicitamente quel pacchetto iniziale e controlla i suoi conteggi prima di procedere. L'artefatto REL002 è riproducibile direttamente con `bash -euo pipefail docs/_active/ui-v21/evidence/REL002/prepare-site.sh` dopo la build.

## Comandi, rischi e checkpoint

[Verifica packaging e comandi/exit code](evidence/REL002/commands.json), [harness](evidence/REL002/verify-package.py), [audit](evidence/REL002/package-audit.json). `npm run build`, preparazioni reali e `git diff --check` PASS. Strumenti di verifica isolati dall'app: Playwright già installato nell'ambiente, Chromium/SwiftShader, Python/pypdf. Nessuna dipendenza aggiunta al progetto.

**NOT VERIFIED:** OAuth/SDK Auth/Supabase live, hardware GPU/fluidità e altri browser, sito Pages pubblicato, upload/deploy Actions. Non necessari interventi all'applicazione. Rischio manutentivo: futuri link/risorse documentali richiedono aggiornare whitelist e rieseguire la chiusura; i documenti esistenti intenzionalmente pubblici sono preservati.

Il commit atomico contiene soltanto workflow, questo rapporto, evidenze REL002 e aggiornamenti PROGRESS/STATUS. Lo SHA non viene inserito nel proprio contenuto autoreferenziale; si ricava con `git log -1 --format=%H -- docs/_active/ui-v21/REL002_REPORT.md`. Push normale esclusivamente sul branch autorizzato dopo controllo remoto/fast-forward; uguaglianza HEAD locale/remoto verificata nella consegna. Nessun merge/main/deploy/PR release o fase successiva. **STOP REL-002; attesa review indipendente Regia.**
