# SerieN · Autumn Railways v0.3

Simulatore ferroviario web indipendente in scala N. [Gioca](https://epivic-lab.github.io/SerieN/).
Non dipende dal repository `first` e non invia comandi alla centralina Z21 reale.

## Gioco

Tre locomotive indipendenti (BR 055, BR 216, BR 260), tre circuiti R249/R282/R315,
quattro tronchini, due crossover e un runaround con due rami. Comandi di marcia,
retromarcia, arresto, luci, aggancio e sgancio; quattro missioni introduttive.
Camera orbitale, pianta generata dal tracciato 3D, ciclo giorno/notte,
fari direzionali e profilo grafico leggero per mobile. Spazio arresta il treno
selezionato quando il focus non è su un controllo. La retromarcia include frenata
prima del cambio di verso; aggancio e sgancio richiedono un convoglio fermo.

## Avvio e verifiche

Richiede Node.js 22 o successivo e Python 3 per il server di sviluppo:

```sh
npm ci
npm test
npm start
```

Aprire http://localhost:8000. `npm start` compila il bundle e serve i file statici.
Non aprire direttamente `index.html` tramite `file://`.

`npm run build` genera `dist/game.js`, comprendente Three.js 0.163.0 e gli addon
usati. Il gioco corrente non richiede CDN, font remoti, account o un backend.
Esbuild e dipendenze sono fissati nel lockfile. Il prototipo `legacy-v0.1.html`
resta conservato e può avere requisiti differenti.

## Architettura

- `src/network.js`: geometria misurata, nodi, archi e campionamento comune.
- `src/simulation.js`: itinerari, storia del percorso della composizione e clock
  a passo fisso di 1/60 s; indipendente da Three.js e dal DOM.
- `src/scenery.js`: materiali originali procedurali, ambiente, dettagli e batching
  degli oggetti statici per materiale.
- `app.js`: scena WebGL, rotabili procedurali, interazione, protezione e missioni.
- `index.html` / `style.css`: interfaccia responsive e messaggio di errore iniziale.
- `tests/network.test.js`: continuità dei crossover, reversibilità, chiusura dei
  circuiti, quattro terminazioni e indipendenza della simulazione dagli FPS.

La pianta nel gioco deriva dalle stesse polilinee dei binari; il precedente SVG
negli asset è conservato solo come documento storico. Lo stato non viene salvato:
ricaricare la pagina riavvia la sessione.

## Precisione e qualità visiva

Il riferimento ferroviario è il PDF «3 anelli 4 tronchini 1 run around» fornito
dall'utente; il riferimento artistico è `plasticoEx.png`. Il PDF Fleischmann
precedentemente fornito per errore è escluso.

Sono rappresentati raggi nominali, crossover e disassamento inferiore dell'anello
interno. Il fascio e le geometrie interne degli scambi sono ancora ricostruzioni
tramite curve: **non è una conversione CAD millimetrica certificata dei pezzi Kato**.
Occorrono verifica delle geometrie di catalogo e confronto con il file RailModeller.
La protezione considera vicinanza dei veicoli e blocca scambi prossimi ai convogli;
non costituisce un sistema completo di interblocco o di dinamica ferroviaria.
Le ruote sono animate; carrelli, bielle, fumo e ganci fisici non sono simulati in dettaglio.

I modelli e i materiali del gioco sono procedurali originali. Nessun asset è stato
scaricato da Sketchfab, Free3D, CGTrader o Meshy: l'accesso è bloccato e le licenze
non sono state verificate. **La qualità non equivale a Train Station 3 o al rendering
artistico di riferimento**. Servono asset dedicati, ulteriore lavoro artistico e
misure su dispositivi reali. Il profilo leggero riduce risoluzione e ombre; i test
headless con renderer software non sono benchmark di una GPU desktop o mobile.

## Pubblicazione

Il workflow `.github/workflows/pages.yml` esegue `npm ci`, test, build e prepara
`_site` includendo solo pagina, CSS, bundle, asset e prototipo precedente. Non
pubblica `node_modules`, documenti di lavoro o l'immagine di ispirazione.
Un push su `main` avvia GitHub Pages. La versione precedente è recuperabile dal
commit `40b1fdd` (codice del gioco al commit `d3c3801`).

Three.js e addon: licenza MIT, mantenuta nel bundle generato. Il progetto è
amatoriale, senza affiliazione a Kato, Roco o ai titoli citati come riferimento.
