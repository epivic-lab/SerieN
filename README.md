# SerieN · Autumn Railways v0.6.1

Simulatore ferroviario web indipendente in scala N. [Gioca](https://epivic-lab.github.io/SerieN/).
Non dipende dal repository `first` e non invia comandi alla centralina Z21 reale.

## Gioco

Tre locomotive indipendenti (BR 055, BR 216, BR 260), tre circuiti R249/R282/R315,
quattro tronchini, due crossover e un runaround con due rami. Comandi di marcia,
retromarcia, arresto, luci, aggancio e sgancio; quattro missioni introduttive.
Camera prospettica orbitale, pianta generata dal tracciato 3D, ciclo giorno/notte,
fari direzionali e profilo grafico leggero per mobile. Il profilo Cinema aggiunge occlusione ambientale, bloom selettivo e vignettatura. Spazio arresta il treno
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

## Revisione del brief in cinque zone (v0.5)

L'audit prodotto prima delle modifiche e la sequenza concreta sono in
[docs/RENDERING-BRIEF-AUDIT.md](docs/RENDERING-BRIEF-AUDIT.md).
Il riferimento `SerieN_reference_render.jpg` non è presente nel repository;
resta disponibile `plasticoEx.png`.

- Stazione: pensilina, orologio, persone statiche in scala, bagagli e lampioni
  con due luci reali, oltre all'edificio 3D esistente.
- Scalo: ufficio merci, piazzale e carichi disposti fuori dall'ingombro ferroviario.
- Bosco: macchie forestali e radure, specie/rotazioni differenti e chiome volumetriche
  nei profili superiori; chiome alpha come livello leggero.
- Opere: due brevi gallerie curve seguono gli anelli interno e centrale; il terzo
  resta scoperto. Il piccolo ponte ha un vero avvallamento sotto il binario.
  Nessuna quota, connessione o percorso ferroviario è stato modificato.
- Campagna: cascina e vigneto; ridotta la precedente fila urbana di abitazioni.

Vista Panorama/Stazione/Scalo/Segui convoglio; il primo gesto manuale interrompe
l'inseguimento. La camera rimane sopra un inviluppo conservativo di terreno ed
edifici: non è un sistema di collisioni poligonali completo. Automatica riduce la
qualità dopo finestre di frame lente e la ripristina con isteresi; Alta, Leggera e
Cinema restano selezionabili manualmente. Il contatore FPS usa il tempo reale,
indipendente dal clock della simulazione.

La nuova rotaia ha una sezione sagomata sul percorso misurato, senza una seconda
spline decorativa. Ganci dei modelli, scala uniforme e dimensioni effettive sono
registrati nei metadati; mantenere le proporzioni Kenney entro il limite di
larghezza produce locomotive stilizzate più corte. I Kenney e i modelli originali
restano **fallback/prototipi**, non rotabili tedeschi realistici validati.

### Eccezioni ancora aperte

- I respingenti su `middle` e `lower` sono esclusi: il loro ingombro finirebbe sugli
  anelli adiacenti. Il motore corrente arresta il centro del rotabile all'endpoint;
  un arresto basato sull'ingombro frontale richiede una correzione operativa dedicata.
  Sono visibili soltanto i due respingenti per cui la verifica volumetrica passa.
- Ponte e gallerie sono collocazioni scenografiche reversibili, non opere quotate
  nella planimetria originale. Per certificarne la posizione fisica serve un riferimento
  misurato. Non sono state introdotte pendenze o nuove connessioni.
- Mancano asset realistici con licenza per soddisfare interamente l'obiettivo
  fotografico del brief. Il risultato resta procedurale: non è fotorealismo certificato.
- Texture KTX2/Draco e verifica su iPad reale restano da affrontare con gli asset
  definitivi e i dispositivi disponibili; nessun test headless certifica 60 FPS.

### Collaudo riproducibile

`npm test` include controlli su rete, terreno, layout delle zone, ponte, curve
scoperte, camera, isteresi e lifecycle degli asset.
Per il collaudo browser opzionale installare Python Playwright e Chromium, avviare
`npm start`, poi eseguire `python3 tests/browser-smoke.py`. `CHROMIUM_PATH` e
`SERIEN_URL` permettono di scegliere browser/server. Il flag `?diagnostics=1`
espone soltanto diagnostica per i test, senza aggiungere controlli tecnici al gioco.

Esito nella sessione di sviluppo: i volumi dei rotabili originali superano il
controllo dei due fornici; 20 reset mantengono 286 geometrie GPU → 286 sul profilo
Leggera testato; preset, Cinema/AO, notte e layout mobile non producono errori
JavaScript. Compatibilità Safari/iPad e prestazioni GPU reali non sono certificate.

Dalla v0.6.1 i convogli Kenney usano i punti gancio derivati dalle dimensioni
dei singoli modelli; le coppie originali mantengono il passo storico di 64 mm. La protezione camera riguarda l'occhio e le impronte,
non il volume continuo dell'obiettivo. Il ponte può mostrare una piccola cucitura
sul bordo del terreno triangolato; non cambia il percorso ferroviario.

## Stazione e navigazione v0.6

La stazione è ora un edificio originale articolato in corpo centrale a due piani
con due ali più basse. Ha aperture reali, infissi e vani arretrati, soglie, cornici,
plinti in pietra, tetti a tegole tridimensionali istanziate, gronde, pluviali e camini.
Undici texture condivise originali gestiscono albedo, bump e rugosità; la scala UV
è espressa in millimetri del plastico. Non sono stati acquistati o importati nuovi
asset esterni. La stazione è un modello originale di ambientazione, non la replica
certificata di un fabbricato reale.

La banchina è stata sostituita con lastre smussate, bordo consumato, pensilina a
struttura metallica, panchine a doghe, orologio bifacciale, insegna, fioriere,
bagagli e personaggi arrotondati. Le due luci locali illuminano la banchina di notte.
I vecchi elementi della stazione sono rimossi per evitare duplicazioni.

Nel riquadro Vista sono disponibili sei comandi da almeno44px: Zoom+/−,
Trascina, Ruota, Standard e Segui. Trascina usa mouse sinistro/un dito per il pan;
Ruota ripristina l'orbita; restano rotellina e pinch. Standard ripristina il panorama,
Segui insegue il treno selezionato. Un gesto manuale interrompe l'inseguimento.
La strada di servizio arretra localmente dietro la stazione; binari e logica
ferroviaria non cambiano.


## Fase 0 e rotabili v0.6.1

La galleria è rimossa integralmente: portali, pareti, copertura, riserva scenica,
vincolo camera e soppressione del fumo. Le tre curve restano scoperte, con il terreno
ordinario; il ponte resta. Network e simulazione non cambiano.

[Mappa, inventario e dati della fase0](docs/phase-0/README.md): 33archi, tre anelli,
due crossover, quattro tronchini e runaround, cinque regioni scenografiche con ID
stabili, catalogo e centri candidati per piccoli arredi. Gli edifici precedenti
condividono le definizioni con la mappa senza spostamenti. Cascina e vigneto sono
ancora nelle posizioni attuali; la loro futura collocazione sul retro è segnalata.
La mappa è disponibile anche su Pages in `docs/phase-0/`, accessibile da Planimetria.

Le distanze Kenney sono calcolate per ogni coppia dagli ingombri del modello
visibile e dai punti gancio, lasciando1.5mm complessivi fra gli ingombri misurati.
Locomotive e carri si compattano anche quando i GLB finiscono di caricarsi;
rendering, coda del convoglio, scambi occupati, protezione, sgancio e riaggancio
usano gli stessi offset lungo la Journey. Il passo originale resta64mm quando
entrambi i veicoli sono procedurali. Un cambio a modelli più lunghi viene rifiutato
se la coda non trova spazio sul percorso. I carrelli restano rigidi: questa fase
non introduce biellismi o articolazione indipendente.

Per rigenerare la mappa: `node scripts/phase-zero.mjs`. Un lock SHA-256 e i test
rilevano cambiamenti alla rete o al motore di simulazione. Screenshot e misure
riproducibili sono in `docs/phase-0/before` e `after`; vedere lo script
`tests/capture-baseline.py`. Sono misure di un renderer software, non benchmark
di una GPU desktop o di un iPad.

Esito fase 0: 15 file di test automatici superati; browser con GLB effettivi,
passaggio fra modelli, sgancio/riaggancio, avanzamento e retromarcia, reset riusciti.
Il convoglio vapore passa da offset `[0,64,128,192]` a circa
`[0,31.10,61.21,90.00]` mm. Gli screenshot della fase 0 usano la stessa build
verificata, identificata dal relativo SHA-256 nel JSON delle misure finali.
L'audit segnala impronte conservative di `factory-west`, `factory-north` e stazione
vicine al corridoio ferroviario: da verificare sui volumi reali nelle fasi seguenti.

La distinta Kato fornita dall'utente è conservata nella fase0: 17codici, 61pezzi,
con audit di corrispondenza. Conferma raggi principali, due WX310 e sei deviatoi
singoli; indica tre respingenti per quattro terminali, associazione da chiarire.
