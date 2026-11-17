# CACHE-1 — misurazione e perimetro

Data: 17 novembre 2026 (Europe/Zurich). Stato complessivo: **BLOCKED** al gate di riproducibilità locale del canonico; analisi cache completata, implementazione non iniziata.

Autorizzazione: risposta «ok» alla proposta CACHE-1 (misurazione e definizione del perimetro), con branch dedicato e checkpoint remoto secondo AGENTS.md. Nessuna autorizzazione a merge, main, deploy o CACHE-2.

## Base e isolamento

- Checkout iniziale: `codex/train-management-m1`, `b895049d8d067f7422ccfc4872d0a1aba5c07917`, modifiche preesistenti a due `.DS_Store` e due percorsi untracked; preservato.
- Base verificata con fetch e ls-remote: `origin/main` = `6a0b617db503c267573f94c8367db63218284179`.
- Worktree separato: `/private/tmp/serien-browser-cache`, branch `codex/browser-cache`; branch remoto inizialmente assente.
- Soli file modificati: PROGRESS.md e questa directory (rapporto, proposta, script di misura, evidenze). Nessun codice runtime, asset, dipendenza, pipeline o configurazione modificato.
- Il commit di questo rapporto costituisce checkpoint diagnostico, non PASS di fase. SHA effettivo e confronto remoto sono consegnati nella risposta e risolvibili con `git log -1 --format=%H -- docs/_active/browser-cache/STATUS.md`.

## Risultato misurato sul sito pubblico

26 risorse pubbliche, 218.593.730 byte non compressi; 216.744.852 byte appartengono ai 12 moduli scenici effettivamente selezionati dal loader. Tutti gli hash pubblici corrispondono alla base locale, incluso il bundle ricostruito.

| Misura | Cache vuota | Secondo passaggio |
|---|---:|---:|
| Resource Timing transferSize (byte) | 182.553.627 | 167.459.113 |
| CDP encodedDataLength (byte) | 182.652.861 | 167.551.237 |
| Risorse con transferSize zero | 0 / 26 | 18 / 26 |
| HTTP 200 e hash attesi | 26 / 26 | 26 / 26 |

Riduzione trasferimento: **8,27%**. Gli otto GLB riscaricati sono mountain, railway_service_buildings, sawmill, station_platform, terrain, tunnels_portals, vegetation, village_buildings. Interfaccia, bundle e manifest sono invece riutilizzati. Risposte pubbliche osservate con `Cache-Control: max-age=600`, ETag e Last-Modified. Nessun service worker nel sorgente esaminato o nelle risposte misurate. I numeri CDP e Resource Timing hanno contabilizzazione diversa degli header: non sommarli.

Metodo: Chrome headless con profilo nuovo non autenticato; apertura della pagina pubblica, screenshot della schermata d'accesso; svuotamento della cache HTTP tramite CDP; fetch sequenziale con modalità default dello stesso elenco, ripetuto subito nella stessa scheda. Nessuna intercettazione delle richieste, nessun parametro anticache, nessun accesso al profilo personale. Download e SHA-256, senza esecuzione del simulatore. Script: [measure.mjs](measure.mjs); elenco e hash: [inventory.json](evidence/inventory.json); risposte/metriche: [browser-cache.json](evidence/browser-cache.json); sintesi: [summary.json](evidence/summary.json); [screenshot verificato](evidence/public-entry.png).

Questo prova il riscaricamento nel campione, non la causa interna della politica cache di Chrome né lo stesso comportamento su ogni browser. Nessuna stima di miglioramento FPS o tempo finale di avvio. NOT VERIFIED: avvio autenticato, visite dopo riavvio/scadenza, Safari/mobile, storage eviction, modalità privata, quota e cache futura. Miniature/texture UI/rotabili opzionali non inclusi nella misura dei 26 file; inclusi nel perimetro proposto in SPEC.md.

## Test e invarianti

- **PASS** `npm test`: 576/576 ([log](evidence/node-tests.txt)).
- **PASS** `npm run build` ([log](evidence/build.txt)).
- **PASS** JMRI unittest: 9/9 ([log](evidence/jmri-tests.txt)).
- **FAIL** rigenerazione canonico su macOS/Python 3.13.5: due JSON non byte-identici, 1.059 valori diversi per JSON (esempi nelle ultime cifre decimali); entrambi gli SVG identici. [Evidenza](evidence/canonical-reproduction.json).
- **FAIL** ripetizione con Python 3.12 del runtime: stessi due percorsi diversi, SVG identici ([esito](evidence/canonical-python312-result.json)). Non dimostrata la causa esatta; nessuna correzione al generatore o tolleranza introdotta.
- I due file generati sono stati ripristinati esattamente da HEAD del worktree isolato. **PASS** diff finale vuoto per sorgenti, UI, asset, auth, pipeline e dipendenze rispetto alla base: geometrie, topologia, 150 mesh legacy, controller, camera, fisica e UI preservati per identità dei file. Nessuna nuova prova visuale del simulatore 3D.

Ambiente: Node/npm temporanei per eseguire le dipendenze esatte del lockfile (`npm ci`, audit 0 vulnerabilità riportate); npm non presente nel PATH iniziale. Nessuna dipendenza aggiunta al progetto. Playwright già disponibile nel runtime host. I log registrano le prove effettive, non una nuova matrice hardware.

## Sicurezza e consegna

Solo risorse statiche pubbliche same-origin nella misura. Nessuna credenziale, cookie, token, risposta Auth o dato utente salvato; profilo Chrome temporaneo. Lo script registra solo header HTTP statici selezionati. Non modificati Auth, database, SQL/RLS, API o servizi esterni. Nessun nuovo codice eseguibile dall'app o service worker distribuito. Il futuro caching deve lasciare il controllo d'accesso online e non memorizzare risposte autenticate.

Checkpoint remoto previsto sul solo `codex/browser-cache`; verifica finale SHA/files e working tree nella consegna. La pipeline Pages risponde solo a main o workflow_dispatch: questo checkpoint non pubblica il sito.

**Prossima azione unica proposta: CACHE-1R**, verifica mirata della riproducibilità nella piattaforma CI di riferimento e chiusura del gate, senza cambiare geometrie. Richiede approvazione esplicita. CACHE-2 (implementazione) non avviata e non autorizzata. STOP secondo AGENTS.md: un gate fallito non può essere dichiarato PASS.
