# SerieN · Autumn Railways v0.4

Simulatore ferroviario web indipendente in scala N. [Gioca](https://epivic-lab.github.io/SerieN/).
Non dipende dal repository `first` e non invia comandi alla centralina Z21 reale.

## Gioco

Tre locomotive indipendenti (BR 055, BR 216, BR 260), tre circuiti R249/R282/R315,
quattro tronchini, due crossover e un runaround con due rami. Comandi di marcia,
retromarcia, arresto, luci, aggancio e sgancio; quattro missioni introduttive.
Camera orbitale, pianta generata dal tracciato 3D, ciclo giorno/notte,
fari direzionali e profilo grafico leggero per mobile. Il profilo Cinema aggiunge bloom selettivo e vignettatura. Spazio arresta il treno
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
- `src/scenery.js`: materiali, ambiente e batching degli oggetti statici.
- `src/diorama.js` / `src/landscape.js`: terreno, vegetazione con maschere alpha,
  sottobosco e rocce con distanze di rispetto da binari ed edifici; regole deterministiche.
- `src/presentation.js`: postproduzione opzionale del profilo Cinema.
- `src/train-assets.js`: caricamento locale dei GLB Kenney, scala e scelta dei modelli,
  con ripiego automatico sugli originali in caso di errore.
- `src/rolling-stock-art.js`: dettagli aggiuntivi dei rotabili originali e vapore animato.
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
Le ruote originali e le ruote individuali della locomotiva Kenney sono animate; il vapore è un effetto a particelle. I carrelli Kenney rimangono rigidi; bielle e ganci non hanno una simulazione fisica dettagliata.

Il gioco include **sei modelli Kenney Train Kit 1.1, CC0**, con texture condivisa,
licenza e provenienza in `assets/kenney`. L'archivio originale fornito dall'utente
rimane nel repository; il deploy distribuisce soltanto i modelli selezionati.
Kenney, Guus Vermeulen e Tony Schaer sono accreditati anche nella guida.
I modelli sono stilizzati: il selettore «Rotabili» li distingue dagli originali
DB, senza presentarli come repliche delle BR 055/216/260. L'asset geometrico si
adatta all'ingombro ferroviario tramite trasformazioni in fase di caricamento.
I binari Kenney non sostituiscono la geometria del tracciato esistente.

La scenografia usa texture originali generate localmente, terreno modellato,
vegetazione istanziata con silhouette alpha e lieve vento, rocce, sottobosco,
recinzioni e dettagli della stazione. Le ombre sono disponibili nei profili Alta
e Cinema; Leggera riduce risoluzione e ombre. Cinema aggiunge bloom e vignettatura
senza imporre il costo della postproduzione al profilo mobile.
**Non è rendering fotorealistico né equivalente a Train Station 3.** I test browser
con renderer software verificano avvio e comportamento; non sono benchmark di
una GPU desktop o mobile.

## Pubblicazione

Il workflow `.github/workflows/pages.yml` esegue `npm ci`, test, build e prepara
`_site` includendo solo pagina, CSS, bundle, asset e prototipo precedente. Non
pubblica `node_modules`, documenti di lavoro o l'immagine di ispirazione.
Un push su `main` avvia GitHub Pages. La versione v0.3 è recuperabile dal commit `6e050e9`; la versione iniziale
del gioco è conservata al commit `d3c3801`.

Three.js e addon: licenza MIT, mantenuta nel bundle generato. Il progetto è
amatoriale, senza affiliazione a Kato, Roco o ai titoli citati come riferimento.
