# CACHE — implementazione e rilascio autorizzati

Il 17 novembre 2026 l’utente ha chiesto esplicitamente «finisci tutto e fai il deploy».
Questa autorizzazione copre il completamento, PR/merge normale e Pages per questa sola attività,
superando gli stop intermedi precedenti. Nessuna altra macrofase avviata.

## Risultato prima del merge

Implementazione completata sul branch `codex/browser-cache`, dalla base `6a0b617` e checkpoint CACHE-1 `2018256`.
Service worker generato in build: 62 risorse consentite, 11 file essenziali precaricati;
asset su richiesta conservati per SHA-256. Aggiornamenti senza skipWaiting, con riuso dei
file invariati e pulizia delle sole voci obsolete di SerieN dopo la chiusura delle vecchie schede.
Nessuna API server necessaria. Nessun download preventivo degli originali V06 duplicati.

- **PASS** 581/581 Node, incluse 5 nuove prove cache; **PASS** build; **PASS** 9/9 JMRI.
- **PASS** Chrome reale: 62/62 file con hash corretti, secondo passaggio **0 byte trasferiti** e **0 richieste HTTP locali**.
- **PASS** reload con controllo SW; accesso resta bloccato senza login. Il test locale avvia separatamente
  il bundle per verificare il rendering V06: solo harness locale, nessuna modifica/bypass nel gate distribuito.
- **PASS** aggiornamento reale con due schede: entrambe restano sulla release 1; dopo la loro chiusura
  la release 2 si attiva e riusa il modello invariato senza rete.
- **PASS** test errore HTTP/hash, quota/storage indisponibile, installazione fallita con vecchia shell preservata,
  richieste simultanee, esclusione API/origini esterne/query sconosciute/Range/POST.
- **PASS** invarianti per identità dei file: nessuna modifica a src, app.js, geometrie/asset, UI/CSS,
  auth-gate, auth-gate-core, lockfile. Bundle app identico: `cbaf2fbfb8a3b89f3c4cd490384af8b21c5998a9f301e74ff0fd6e70d9d3d818`.
- Cache locale del browser non garantita: può essere eliminata per spazio o impostazioni; fallback alla rete.
  Nessun cambiamento a sessioni, progetti, database, RLS o controllo d’accesso. Richieste salvate senza credenziali,
  solo risposte statiche con hash/dimensione attesi. Nessuna cache di token o risposte Auth/API.

Evidenze: [release/](evidence/release/), [Chrome](evidence/release/local-browser.json),
[scena V06](evidence/release/local-scene.png), [invarianti](evidence/release/invariants.json).
Riproduzione: `npm test`, `npm run build`, `PLAYWRIGHT_MODULE=<modulo disponibile> node scripts/cache/browser-check.mjs`.
Il comando browser accetta anche l’URL pubblico come argomento per verifica post-deploy senza avvio autenticato.

## Chiusura del gate e pubblicazione

La rigenerazione macOS fallita in CACHE-1 rimane documentata sotto. Nessun file canonico è stato modificato.
La stessa base ha già completato con successo il workflow Linux/Python 3.12
[43775508471](https://github.com/epivic-lab/SerieN/actions/runs/43775508471).
Il nuovo workflow PR `Validate browser cache` ripete il confronto byte-identico, JMRI, Node e build sulla
piattaforma di riferimento **prima del merge**. Al momento di questo commit il suo nuovo esito è PENDING,
così come merge, deploy e verifica pubblica; non sono anticipati come PASS.
SHA, esiti CI, PR e verifica effettiva pubblica saranno indicati nella consegna finale.

File di implementazione: `cache-client.js`, bootstrap in `index.html`, `scripts/build-cache.mjs`,
`scripts/cache/worker.js`, `package.json`; distribuzione SW root in `.github/workflows/pages.yml`,
workflow PR, test Node e harness browser. Nessuna dipendenza aggiunta.

Aggiornamenti: la verifica SW usa `updateViaCache: none`. La prima visita scarica e conserva;
le successive usano CacheStorage. Una release nuova aspetta che siano chiuse tutte le schede SerieN
esistenti; alla riapertura usa la release nuova e rimuove solo risorse obsolete. Nessun reload a simulazione attiva.
NOT VERIFIED: Safari/mobile fisici, sopravvivenza a eviction del sistema operativo e avvio autenticato pubblico.
Quota/errore storage coperti da test controllati, non da saturazione del disco reale.

---

# Registro storico CACHE-1 (superato dall’autorizzazione di completamento)

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
