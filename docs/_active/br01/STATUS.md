# BR 01 animata — BLOCKED (15 novembre 2026)

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
