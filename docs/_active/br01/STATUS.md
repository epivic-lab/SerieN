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
