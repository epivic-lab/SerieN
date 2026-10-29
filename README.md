# SerieN · Autumn Railways v0.12

Simulatore ferroviario web in scala N su base 150×70 cm. [Gioca](https://epivic-lab.github.io/SerieN/?v=0.12.0) · [Planimetria tecnica](docs/jmri-layout/layout-canonical.svg) · [Grafo completo](docs/jmri-layout/canonical-graph.json) · [Report Fase 0](docs/consolidation/README.md).

Tre anelli R249/R282/R315, due WX310, quattro tronchini, runaround e fascio merci diagonale. La Fase 0 è chiusa e accettata sulla baseline v0.8 (`d118de0`). La Fase 1 introduce la plancia con altezza più che dimezzata, miniature affiancate e interfaccia inglese: [misure e collaudo](docs/phase-1/README.md). Il simulatore integra l'export JMRI nel motore e nel rendering: **la topologia è operativa e collaudata; i profili interni WX310 e le quote utili del plastico fisico richiedono ancora verifica**. Non è una dima esecutiva certificata. Nessuna galleria. Progetto indipendente: non invia comandi Z21 reali e non dipende da altri repository.

La v0.12 integra la **Fase 4 — Materiale rotabile**: studi dimensionali originali BR 055 e V60, cinque famiglie di carri/carrozze, ruote e bielle legate alla distanza, carrelli sul grafo canonico, aggancio ravvicinato e lunghezza dei convogli nelle consolle. Non sono repliche certificate; Kenney resta un'alternativa stilizzata CC0. [Audit, collaudi e limiti](docs/phase-4/README.md).

La v0.11 completa la **Fase 3 — Paesaggio e integrazione**: boschi con ingombri delle chiome verificati, rilievi e sottobosco, piazzali livellati e scalo organizzato, dettagli di stazione e campagna sul retro con cascina, vigneto e accesso agricolo. Geometria ferroviaria, motore, HUD e plancia sono conservati. [Confronto e collaudo](docs/phase-3/README.md).

La v0.10 introduce la **Fase 2 — Fondamenta grafiche**: terreno, luce, materiali ferroviari, ombre e camera. La vista Home contiene l'intero tavolato; la plancia mantiene l'altezza della v0.9 con nome, locomotiva, mappa e stato sulla stessa riga e minimappe più grandi. Passando il mouse sui comandi scambi lampeggia in arancione il rispettivo indicatore 3D, anche quando il comando è protetto per occupazione. [Confronto visivo e verifiche](docs/phase-2/README.md).

## Avvio

Node.js 22+ e Python 3:

```sh
npm ci
npm test
npm start
```

Aprire `http://localhost:8000`. `npm start` compila `dist/game.js` e serve il sito; non usare `file://`. Three.js 0.163.0 ed esbuild 0.25.12 sono fissati nel lockfile; il gioco non richiede backend, account, CDN o font remoti.

## Comandi

- Ogni consolle ha velocità, direzione, arresto, luci, aggancio e sgancio indipendenti. Le tre consolle seguono la recenza di selezione; `＋ Add train` aggiunge una quarta locomotiva ferma nel tronchino est. Un convoglio nascosto continua la simulazione. Bordo ambra per quello selezionato.
- **STOP ALL** arresta tutti i convogli, inclusi quelli nascosti. Spazio arresta il selezionato quando il focus non è su un controllo. Pausa sospende la simulazione; Reset ripristina la sessione.
- Le miniature sono PNG ricavati dai modelli realmente utilizzati. Le minimappe condividono il tracciato canonico e mostrano il centro della rispettiva locomotiva; un clic centra la camera.
- Otto comandi scambi, con protezione per occupazione e avvicinamento. Le manovre nel runaround richiedono inversioni reali sui rami comuni; i convogli troppo lunghi non entrano nel breve tronchino ovest.
- Next Switch HUD minimizzabile: scambio successivo, distanza lungo i binari, schema reale, stato e destinazione quando determinabile. Il pulsante **Route** nella barra camera mostra per 15 secondi il percorso previsto; un secondo clic lo spegne. Il rosso non indica via libera.
- Mouse/touch per ruotare o trascinare, rotellina/pinch e +/− per zoom; Home ripristina il panorama, Follow insegue la locomotiva selezionata. Un gesto manuale interrompe l'inseguimento.

I rotabili Kenney si selezionano a lato: hanno spaziatura calcolata dai rispettivi ganci e dimensioni, non dal passo dei modelli DB. Il cambio di modelli viene rifiutato quando i veicoli più lunghi non entrano nel percorso disponibile. Giorno/notte, missioni, stazione e campagna autunnale sono conservati. I profili Alta/Cinema aggiungono ombre e postproduzione; Leggera riduce il costo grafico.

## Architettura

| Componente | Responsabilità |
|---|---|
| `docs/jmri-layout/source.xml`, PDF RailModeller e distinta | Fonti originali e calibrazione; il PDF Fleischmann ricevuto per errore è escluso |
| `scripts/analyze-jmri-layout.py` | Parser/audit XML, riferimenti, porte, archi, giunzioni compatibili, diagnostica senza modificare il sorgente |
| `scripts/build-canonical-layout.py` | Rete generata con ID originali, geometria analitica, provenienza, connessioni inferite, SVG e limiti fisici espliciti |
| `src/canonical-layout.json`, `src/network.js` | Unica geometria operativa, adiacenze, campionamento e tre circuiti principali |
| `src/simulation.js`, `src/consist.js` | Journey dei convogli e carri, router bidirezionale, clock fisso 1/60 s, ingombri e accoppiamenti; nessun DOM/Three.js |
| `src/next-switch.js` | Visita dello stesso grafo/router, distanza ferroviaria, schemi e protezione degli otto scambi |
| `src/train-deck*.js`, `src/next-switch-view.js` | Presentazione e comandi; nessuna copia autonoma dello stato ferroviario |
| `src/locomotive-thumbnails.js` | Sei immagini in cache e acquisizione diagnostica tramite il renderer esistente |
| `src/navigation.js`, `src/view-controls.js` | Camera, focus, inseguimento e gesti |
| `src/graphic-foundations.js`, `src/switch-feedback.js` | Superfici PBR originali, inquadratura ombre e feedback visivo senza mutare gli scambi |
| `src/scenery.js`, `src/landscape.js`, componenti stazione/opere | Ambientazione e distanze dai binari canonici |
| `app.js` | Unico stato della sessione, scena WebGL, comandi, protezione, missioni e singolo ciclo principale |

La vecchia rete a 33 archi è conservata soltanto come baseline storica in `docs/phase-0/baseline` e verificata contro il lock originale. Non è usata nel gioco. I report precedenti sono contrassegnati come archivi.

## Verifiche

```sh
python3 scripts/build-canonical-layout.py
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm test
npm run build
```

Per i test browser opzionali servono Python Playwright, Chromium e il server locale attivo:

```sh
python3 tests/browser-phase-four.py
python3 tests/browser-phase-three.py
python3 tests/browser-phase-two.py
python3 tests/browser-phase-one.py
python3 tests/browser-phase-zero.py
python3 tests/browser-train-deck.py
python3 tests/browser-consist.py
python3 tests/browser-smoke.py
```

`SERIEN_URL` e `CHROMIUM_PATH` permettono server/browser diversi. La diagnostica esiste soltanto con `?diagnostics=1`; usa gli stessi treni e lo stesso motore dell'applicazione. Il test Fase 0 avanza deterministicamente la simulazione reale e verifica i tre anelli nei due sensi, comandi, quarto convoglio, minimappe, HUD, manovra sul runaround, arresti, modelli e risoluzioni responsive. I test aggiuntivi verificano fallback immagini, accoppiamento, reset e strumenti camera. Risultati e schermate: [consolidamento](docs/consolidation/README.md), [plancia](docs/train-deck/browser-result.json).

I test software non certificano FPS su GPU desktop/tablet né gesti su un dispositivo touch reale. Il [report tecnico](docs/consolidation/README.md) distingue le verifiche eseguite dai punti ancora manuali: profilo dei WX310, piccoli fit dei pezzi speciali, origine sul tavolato, punti di fouling e lunghezze utili. Questi riscontri restano limiti noti per attività successive; la chiusura software della Fase 0 è stata accettata dall’utente.

## Pubblicazione e ripristino

Il workflow `.github/workflows/pages.yml`, attivato da push su `main`, verifica la rigenerazione deterministica del grafo, parser, test Node e build; pubblica pagina, CSS, bundle, asset e documentazione tramite GitHub Pages. I sorgenti e l'archivio ZIP originale Kenney non vengono distribuiti nel bundle del gioco. I test browser richiedono l'ambiente di collaudo descritto sopra e sono eseguiti separatamente.

Baseline Fase 0 pubblicata e accettata: `d118de0` (v0.8). Punto di ripristino della ripresa: `b7de605`, branch `restore/phase-zero-intake`. Stato iniziale e pulizia: [audit](docs/consolidation/INTAKE.md). Ricaricare la pagina riavvia la sessione; non esiste persistenza dello stato dei convogli.

## Asset e limiti visivi

Sei modelli locali **Kenney Train Kit 1.1, CC0**, di Kenney, Guus Vermeulen e Tony Schaer; licenza/provenienza in `assets/kenney`. Sono stilizzati e non repliche delle locomotive DB. I modelli procedurali originali hanno proprie miniature e geometrie. Non sono stati scaricati asset senza licenza dai portali commerciali citati nella discussione.

Terreno, vegetazione istanziata, texture originali e illuminazione mantengono il diorama autunnale. Il rendering non è fotorealistico né equivalente a Train Station 3. Carrelli, bielle e ganci non hanno una simulazione meccanica completa. Il simulatore non è un interblocco di sicurezza per un impianto reale.
