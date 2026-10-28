> Analisi storica del 27 ottobre 2026. Lo stato attuale e le rettifiche sono nel [report di consolidamento](docs/consolidation/README.md); questo documento viene conservato per tracciabilità.

# Revisione architetturale di SerieN

Revisione statica del 27 ottobre 2026. Documento di progetto: le soluzioni
descritte non sono ancora implementate. Nessuna pubblicazione eseguita.

## Fattibilità del rendering web

Un diorama ferroviario di queste dimensioni può avere rendering e animazioni
di qualità elevata nel browser. Three.js con WebGL2 è una base adeguata;
WebGPU è un'evoluzione possibile, da introdurre dopo verifiche sui dispositivi
di destinazione. Non occorre un backend per geometria, simulazione o rendering.
GitHub Pages può continuare a distribuire i file statici.

La somiglianza qualitativa a Train Station 3 è un obiettivo artistico, non una
garanzia del motore. Servono asset originali o con licenza, modellazione,
texture, animazioni e una direzione artistica coerente. Non sono state misurate
le prestazioni del gioco di riferimento né della presente applicazione.

## Problemi verificati nel codice

| Priorità | Posizione attuale | Problema e conseguenza |
| --- | --- | --- |
| P0 | `app.js:117–138` | Fascio merci definito da spline disegnate a mano, senza catalogo di elementi Kato, orientamenti o fonte CAD. Non dimostra fedeltà geometrica. |
| P0 | `app.js:373–380` | Il cambio anello modifica immediatamente `loop` e `p`: la locomotiva salta lateralmente di 33 mm senza percorrere il crossover disegnato. |
| P0 | `app.js:350–360`, `443` | La posizione dei carri dipende dal segno della marcia. Invertirlo trasferisce immediatamente la composizione all'altro lato della locomotiva. |
| P0 | `app.js:350–354`, `395–410` | Tutti i carri vengono proiettati sul solo segmento della locomotiva. Ai limiti del fascio vengono bloccati agli estremi; manca una storia dei segmenti attraversati. |
| P0 | `app.js:423–433` | I carri sganciati condividono le mesh con la composizione originale. Il riaggancio incrementa un contatore anziché trasferire l'identità del carro: proprietà e rappresentazione possono divergere. |
| P1 | `app.js:152–164` | L'orientamento laterale usa l'indice normalizzato dei campioni come distanza normalizzata. I campioni non sono equidistanti: le normali non corrispondono necessariamente alla posizione della rotaia. Una seconda spline delle rotaie introduce ulteriore scostamento dal percorso dei veicoli. |
| P1 | `app.js:391–409` | Le connessioni sono condizioni specifiche per nome; non esiste un grafo con porte e itinerari dello scambio. Il ramo `upper` non ha una transizione di ritorno all'anello quando `next < 0`. |
| P1 | `app.js:415–420` | Protezione limitata alla distanza fra locomotive sul medesimo anello. Ignora carri, fascio, conflitti dei crossover e distanze di frenata. |
| P1 | `app.js:475–501` | Simulazione legata al frame di rendering, con delta troncato; velocità cambia istantaneamente. Non ci sono passo fisso, accelerazione o frenatura. |
| P1 | `assets/schema-ricostruito.svg`, `app.js` | Pianta e vista 3D hanno geometrie indipendenti. L'SVG è dichiarato indicativo e non costituisce una fonte di misura. |
| P2 | `app.js:1–501` | DOM, regole ferroviarie, stato, geometria e grafica condividono un modulo. La simulazione non può essere verificata senza inizializzare il browser e il renderer. |
| P2 | costruzione scenografia e rotabili | Asset costituiti soprattutto da primitive, materiali a colore uniforme e oggetti separati. Mancano carrelli articolati, ruote animate, texture PBR, LOD e gestione centralizzata delle risorse. |

Le posizioni fanno riferimento alla versione esaminata, precedente alla riscrittura.

## Architettura proposta

Flusso dati: fonte del tracciato → modello geometrico validato → grafo operativo.
Dal medesimo modello si generano pianta 2D e mesh 3D; il simulatore produce
posizioni e orientamenti che il renderer visualizza. Il renderer non decide
quale binario percorre un treno.

```text
src/
  layout/       catalogo pezzi, istanze, porte, geometria, importazione, validazione
  simulation/   grafo, itinerari, veicoli, composizioni, occupazione, clock
  rendering/    scena, binari, rotabili, ambiente, effetti, qualità, risorse
  ui/           comandi, stato visualizzato, pianta, missioni
  main.ts       inizializzazione e collegamento dei componenti
assets/
  layouts/      tracciato versionato e provenienza delle misure
  models/       GLB dei rotabili e della scenografia
  textures/     texture e mappe ambiente con licenze
tests/          geometria, itinerari, manovre e regressioni visive
```

Scelta consigliata: TypeScript, Vite e Three.js. Build statica con dipendenze
bloccate nel lockfile, senza dipendere da un importmap remoto per il motore.
Nessuna necessità iniziale di React, di un motore fisico generalista o di un
worker; introdurli soltanto con una necessità concreta e misurata.

### Tracciato come unica fonte di verità

- Coordinate del plastico in millimetri; conversione esplicita in metri al
  confine con il renderer e gli asset. Scala dei modelli documentata.
- Ogni elemento ha identificativo, codice di catalogo, trasformazione e porte
  con posizione e tangente. Rette e archi circolari restano analitici.
- Gli scambi hanno connessioni interne esplicite e geometria di ogni itinerario;
  un incrocio geometrico non crea automaticamente una connessione ferroviaria.
- Posizione del veicolo come `edgeId` e distanza in millimetri sull'arco;
  campionamento e tangente derivano dalla medesima geometria dei binari.
- Chiusure, scartamento, raggi, tangenti, ingombri e connessioni verificati con
  tolleranze dichiarate. Le tolleranze devono seguire la precisione della fonte,
  senza attribuire precisione millimetrica a un'immagine non quotata.
- Provenienza e stato per ogni elemento: verificato, ricostruito o da confermare.
  Un report incompleto impedisce di dichiarare il tracciato fedele.

Manca il file RailModeller originale, un export CAD utilizzabile o una
planimetria quotata con distinta dei pezzi. Il repository contiene solo lo
schema ricostruito. Non si può ottenere una certificazione geometrica da questo
materiale. Formato e dati dell'importazione vanno definiti dopo aver visto la fonte.

### Simulazione e animazione

Passo fisso proposto di 1/60 s con accumulatore, limite dei sottopassi e politica
esplicita di pausa al ritorno da una scheda inattiva. Interpolazione dei soli
stati visivi fra due aggiornamenti; nessuna dipendenza delle regole dagli FPS.

Ogni veicolo mantiene identità e ganci; la composizione conserva l'ordine fisico.
La retromarcia modifica velocità e verso del movimento senza cambiare quell'ordine.
Il percorso occupato dalla composizione conserva la sequenza degli archi del
grafo, anche dopo il passaggio della locomotiva su uno scambio. Gli scambi sotto
un convoglio rimangono vincolati finché non è transitata la coda.

Posa di cassa e carrelli ricavata dai punti di appoggio sul percorso. Rotazione
delle ruote da distanza percorsa e raggio; bielle da cinematica dedicata, fumo da
particelle con limite di emissione. Frenatura e accelerazione graduate. Aggancio
basato su distanza e orientamento dei ganci, con trasferimento del veicolo reale.

Occupazione degli archi per l'intera lunghezza dei veicoli, con zone di conflitto
per deviatoi e incroci. Distinguere collisioni, protezione automatica e regole
di missione: un obiettivo completato non prova la correttezza della simulazione.

### Rendering e contenuti

1. Rotabili GLB con proporzioni verificabili, carrelli e ruote separati,
   materiali PBR e dettagli coerenti con la distanza di osservazione.
2. Binari generati dalla geometria validata, profilo delle rotaie, massicciata
   con texture e instancing di traverse e fissaggi. Nessuna spline artistica
   aggiuntiva sul percorso di marcia.
3. Ambiente con texture albedo/normal/roughness, luce ambiente da HDRI
   prefiltrata, ombre direzionali curate, luce precalcolata sugli elementi statici.
4. Postproduzione selettiva: occlusione ambientale, bloom limitato alle sorgenti
   luminose, antialiasing finale e color grading. Valutare costo e artefatti su
   mobile; la profondità di campo resta un effetto opzionale della camera.
5. Vegetazione con istanze, LOD e atlas; terreno e fabbricati con linguaggio
   artistico comune. Condivisione di materiali e geometrie, compressione KTX2
   delle texture e compressione dei modelli quando vantaggiosa.
6. Profili di qualità e risoluzione adattiva con isteresi; indicatori di costo
   CPU/GPU, draw call e memoria per sessioni di misura. Gestione degli errori
   di caricamento e della perdita del contesto grafico.

Obiettivi iniziali da validare: 60 FPS desktop a 1080p (16,7 ms/frame) e 30 FPS
su un dispositivo mobile di riferimento (33,3 ms/frame). Modello del dispositivo,
browser, risoluzione, qualità e composizione della scena devono accompagnare
ogni misura. Questi numeri non sono risultati già ottenuti.

## Ordine di realizzazione e criteri di accettazione

1. **Fonte e geometria.** Acquisire la planimetria originale e la distinta;
   costruire modello e grafo. Report di corrispondenza, raccordi continui,
   planimetria e 3D generati dagli stessi dati.
2. **Esercizio ferroviario.** Estrarre simulazione pura e sostituire i salti di
   percorso. Test di tutti gli itinerari nei due versi, con convogli più lunghi
   dei raccordi, retromarcia, arresti e aggancio. Nessuna traslazione istantanea,
   perdita di distanza residua o sovrapposizione ai limiti degli archi.
3. **Campione visivo rappresentativo.** Un rotabile completo, uno scambio e
   una zona di stazione con asset definitivi, luce diurna/notturna e animazioni.
   Confronto visivo su inquadrature concordate e misura delle prestazioni sui
   dispositivi scelti prima di estendere lo stile all'intero plastico.
4. **Estensione e regressioni.** Completare asset, scenografia e missioni;
   verificare pianta sovrapposta alla fonte, sessioni lunghe, caricamento,
   prestazioni e controlli touch. Pubblicazione separata, solo se richiesta.

## Limiti della revisione

È stata letta l'applicazione corrente, la pagina, lo schema SVG e il workflow
di pubblicazione. Nessun benchmark o test browser eseguito; nessun accesso al
codice interno o agli asset di Train Station 3. La revisione identifica difetti
staticamente e definisce la sostituzione architetturale; non dichiara già
riscritta, corretta o graficamente equivalente l'applicazione.
