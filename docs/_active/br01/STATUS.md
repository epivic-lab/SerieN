# BR01-A — BLOCKED al Quality Gate della Regia

15 novembre 2026. Base verificata su GitHub e in locale: `b82def8f449980ff1ab3eca1fe129ee1fc34e763`, branch `codex/br01-animated`. Il checkpoint contiene un candidato di sviluppo con difetto di sagoma misurato. L’integrazione resta incompleta.

## Motivo dello stop

Con Chrome sul simulatore V06, dopo 50,325 mm di avanzamento accettato sull’arco V06-P006, 392 vertici delle mesh superavano di oltre 0,05 mm entrambi i rettangoli orientati dei veicoli. Sporgenza massima 1,163 mm sulla cabina. La registrazione conclusiva riproduce il difetto dopo 89,25 mm: 442 vertici, massimo **1,678 mm** sulla cabina, 0,888 mm sul tender. Il controllo usa le trasformazioni world effettive, gli stessi estremi longitudinali degli agganci e le semilarghezze lette dal modello ferroviario. Il massimo è lo scarto orizzontale su un asse locale, minimizzato sui due rettangoli. Il rilievo dimostra una parte di sagoma scoperta; non documenta una collisione fra treni. Le regole e i margini di protezione sono intatti. Il modello attribuisce al giunto cabina–tender una coordinata longitudinale comune, mentre le geometrie originali si estendono oltre questa sezione. In curva i due corpi ruotano separatamente.

[Prima misura](evidence/BR01-A/clearance.json) · [Ripetizione durante la registrazione](evidence/BR01-A/clearance-final.json).

## Implementazione verificata e limiti

- Derivato riproducibile con `python scripts/prepare-br01.py ORIGINALE assets/br01/locomotive.glb` (NumPy e Pillow). Conservato l’originale fuori dal worktree di sviluppo e verificato il suo SHA-256. Rimossi binari e terreno espositivi. Separate le geometrie per veicolo, assi e carrelli. Base colore ricampionata a 1024 px, mappe aggiuntive sostituite da fattori di materiale. [Attribuzione e modifiche](../../../assets/br01/ATTRIBUTION.md).
- Locomotiva e tender usano due veicoli del motore esistente, agganci coincidenti lungo la Journey e lunghezza nominale totale 149,625 mm a 1:160. Un caricamento GLB condiviso per la flotta. Comune asse locale +X in avanti. Angolo delle ruote pari a −odometro/raggio di rotolamento. Manovelle dei lati sfasate di 90°, bielle e cursori calcolati rispetto ai perni. La cinematica usa il delta firmato solo dopo l’accettazione del passo da parte del simulatore. La distribuzione resta una ricostruzione semplificata. Durata GPU e correttezza cinematica completa non qualificate.
- Registrazione MediaRecorder del canvas Chrome con comandi reali della plancia. Il bundle di misura usa il fixture locale di autenticazione del progetto e una camera di ispezione laterale. Clock, render loop, odometro e comandi di marcia sono quelli applicativi. In curva la corsa passa da 0 a 93,5 mm; dopo la frenatura resta a 93,5 mm durante STOP e sosta, poi torna a 3,75 mm in retromarcia. Prova di contatto degli assi limitata al campione acquisito; i minimi di quota in `wheel-contact.json` comprendono i bordini. [Screenshot](evidence/BR01-A/on-track.png) · [Video](evidence/BR01-A/motion.webm) · [Telemetria](evidence/BR01-A/motion.json).
- Nel GLB originale: 123.724.664 byte, 121.942 triangoli, 37 primitive, 12 materiali, 38 immagini. Derivato: 4.458.300 byte (−96,40%), 84.246 triangoli, 23 primitive, 9 materiali, 9 immagini. Stima RGBA8 prima dei mipmap: da 716,0 a 36,0 MiB. Le primitive GLB escludono la distribuzione generata in JavaScript. Nel browser con tre composizioni, qualità Low e registrazione attiva: 288–375 draw call e 2.669.387–3.509.881 triangoli per la scena nelle istantanee, media di 50,1 frame/s tra primo e ultimo campione. Ultimo campione: 180 geometrie e 46 texture della scena. Nessun confronto FPS controllato con l’originale. [Misure asset](evidence/BR01-A/asset-metrics.json).
- Il catalogo attivo espone BR 01 e tender. I vecchi identificativi restano riconoscibili al validatore, che segnala il modello incompatibile conservando i dati. Test di dominio eseguito. Il gestore progetti di questa baseline è di sessione. Recupero di una composizione preesistente e verifica dei percorsi UI di creazione, selezione e rimozione end-to-end: **NOT VERIFIED**. Rimozione di una locomotiva fisica tramite UI non implementata. Non consegnate funzionalità di migrazione persistente. Nessuna carrozza aggiunta.
- Baseline 569/569; candidato 570/570 test Node, 9/9 audit JMRI, build con lo script di package.json tramite pnpm, diff check PASS. I fixture di catalogo sono stati adattati ai due modelli attivi. Nessuna modifica a dati canonici, grafo, binari, scenografia V06, motore di frenatura, conflitti, protezioni, backend o configurazione di produzione. Regressioni browser complete di HUD, minimappe, camera e Train Management, rettilineo e arresto protetto in conflitto tra treni: **NOT VERIFIED**. Nessuna qualifica sicurezza generale. [Suite Node](evidence/BR01-A/node.txt).
- Riproduzione della registrazione e del controllo: servire il worktree compilato in loopback, eseguire `node scripts/verify-br01.cjs` con Playwright disponibile, `CHROME_BIN` e `SERIEN_URL` del server locale. Lo script scrive le acquisizioni nel worktree. Il controllo misura lo scostamento; il gate è FAIL se i vertici fisici escono dai rettangoli. L’attuale candidato riproduce il difetto.

**STOP per Quality Gate della Regia.** Da riesaminare l’articolazione e la geometria al giunto cabina–tender prima della qualifica successiva. Nessun merge o deploy.

---

# BR 01 — baseline PASS, locomotiva ancora da integrare

Al 15 novembre 2026 il GLB locale di 123.724.664 byte ha SHA-256
`39551a52be63db4e85973f5586b5f6d4b23c229e9c158d7376904766b73df086`.
Il controllo sul Mac (arm64, Node v24.22.1) inizialmente falliva sulla
serializzazione JSON di createNetwork() nella copia storica di Fase 0.

Confrontando in ordine tutti i punti con docs/phase-0/layout.json, la prima
differenza è L0-return.points[35].z: 236.95636556485283 contro
236.95636556485286. Le altre quattro sono le ordinate 35 e 65 di L1-return
e L2-return. La formula è 350 + r * Math.sin(a); gli scarti osservati sono
di un valore binary64 adiacente (massimo 5,685e-14 mm). Ne derivano cinque
distanze cumulative diverse su L0-return e 22 su L1-return. Nodi e incidenze
coincidono anche nell’ordine. Ricalcolando le distanze sui punti archiviati
si riproduce esattamente il digest storico 87b2d7a0…a45971a.

Il test verifica prima le distanze e lunghezze grezze, poi riconduce solo
le cinque esatte varianti osservate ai corrispondenti valori archiviati.
Nessuna tolleranza generale. L’hash finale copre ancora l’intero grafo,
inclusi ordine, connessioni, metadati e geometria. Invariati hash dei
sorgenti protetti, digest atteso e conteggi di 33 archi e quattro terminali.

Test mirato PASS; suite completa 569/569, nessun salto; audit JMRI 9/9;
build PASS (script di package.json eseguito con pnpm). Solo test e documenti
modificati. Nessuna modifica a runtime, ferrovia, UI o sicurezza.

Ripetizione Linux NOT VERIFIED. Il log storico BR 01 registra comando e
risultati ma non la versione Node, V8, flag o immagine. I workflow indicano
Node 22 e altri log V06 riportano v24.19.0; nessuno identifica il processo
BR 01. Il lockfile fissa three 0.163.0 ed esbuild 0.25.12; createNetwork e
JSON.stringify non usano tali dipendenze. Nessun runner Linux corrispondente
disponibile nella sessione. La differenza numerica è dimostrata, la sua
attribuzione a una specifica combinazione di V8 e sistema operativo no.

Prossimo risultato: prova articolata di ruote, bielle e pistoni in funzione
della distanza; integrazione e verifica in simulazione ancora da eseguire.

---

## Checkpoint storico — BLOCKED (15 novembre 2026)

Mandato: preparazione del modello originale, integrazione e verifica in un unico
intervento; nessun merge o deploy. Branch dedicato `codex/br01-animated`, base
`a266068d72bf42974b1829723996fe9566d341d4` (main remoto acquisito con fetch).
Questo checkpoint documenta un impedimento di accesso, non un'implementazione.

## Stato reale del rilascio

V06 è già integrato: PR #21, merge `298e7fc52a07b6206dda2cf5bce89ecdd7b89d00`.
Main successivo `a266068` imposta V06 predefinito e mantiene Legacy selezionabile.
Il workflow Pages preesistente [43695610489](https://github.com/epivic-lab/SerieN/actions/runs/43695610489)
risulta completed/success sullo stesso SHA; non è stato avviato in questo incarico.
La pubblicazione è verificata a livello workflow, non tramite browser live.
Il checkout iniziale era `work` a `f33377c`; working tree pulita, preservata.

## Impedimento verificato

La cartella Drive indicata contiene `br_01_german_steam_locomotive.glb`, ID
`1yN79n9eStjlgErbeAO3bY87ZOe0nxLDe`, MIME `model/gltf-binary`,
123.724.664 byte, `can_download: true` nei metadati del connettore.
Due richieste autenticate `google_drive.fetch(download_raw_file=true)` terminano
con `Transport closed`, senza file materializzato. Il tentativo HTTP diretto
tramite proxy verso Drive termina con `CONNECT tunnel failed, response 403`.
La policy di rete dell'ambiente non include Drive. Nessun tentativo di aggirarla.

Nessuna BR 01 o rapporto preliminare individuati nel workspace. I percorsi Mac
forniti non sono disponibili su questo host Linux. Non sono stati letti i byte
del modello: autore/licenza, parti, rig, triangoli, texture e possibilità di
articolazione restano NOT VERIFIED. I dati preliminari dell'utente non vengono
presentati come misure confermate.

## Riscontri sul codice della baseline

- `src/railway-step.js`: `train.odometer += p.delta` nel solo ramo accettato,
  dopo aggiornamento della Journey; un rifiuto ferma velocità e movimento.
- `app.js`: la posa passa Journey/coordinata/odometro alle animazioni esistenti.
- `src/train-assets.js`: cache di promesse, clonazione e rilascio risorse condivise
  già esistenti; fallback nativo e adattamento dimensionale Kenney richiedono
  una revisione specifica per la BR 01, non un semplice cambio di URL.
- `src/rolling-stock.js`, `src/train-projects.js`, `src/fleet-commands.js`,
  `src/locomotive-thumbnails.js`: punti da integrare insieme ai percorsi di
  inserimento e migrazione. Nessun vecchio asset rimosso in assenza del sostituto.

## Verifica e limiti

**PASS baseline:** `npm test` (569 test, zero fallimenti/saltati),
`python3 -m unittest discover -s tests -p jmri_audit_test.py` (9 test),
`npm run build` ed `git diff --check`. I log in `evidence/` riguardano
esclusivamente la baseline acquisita, non una BR 01 integrata.
Nessuna modifica a runtime, layout, scenografia, protezioni, UI, backend,
dipendenze o workflow. Gli invarianti sorgente sono verificabili con
`git diff a266068d72bf42974b1829723996fe9566d341d4 -- app.js src assets ui .github package.json package-lock.json`.
Animazione BR 01, migrazione, dimensioni, errori del nuovo asset, confronto
peso/triangoli/draw call, screenshot e video: NOT VERIFIED / non prodotti.
Nessuna misurazione di FPS o GPU fisica.

Unica prossima azione: rendere il GLB originale disponibile nel workspace
(allegato diretto o trasferimento autenticato funzionante), poi riprendere
il mandato già autorizzato sul medesimo branch. Nessuna ulteriore approvazione
di ambito richiesta; restano vietati merge e deploy.
