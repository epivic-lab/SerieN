# Audit e sequenza del nuovo brief — 27 ottobre 2026

Valutazione della v0.4 al commit 0c8ad26, effettuata prima delle nuove modifiche.
I due testi allegati hanno SHA-256 identico. Il riferimento SerieN_reference_render.jpg
non è presente: si conserva plasticoEx.png come riferimento artistico, mai geometrico.

| Area | Stato verificato | Gap / intervento |
| --- | --- | --- |
| Motore | Three.js 0.163, WebGL, build statica, moduli rendering separati dalla simulazione | Riutilizzare il motore, nessuna migrazione indiscriminata |
| Tracciato | Tre circuiti, rete misurata, fascio Bézier, pianta condivisa | Ricostruzione non CAD certificata: conservare rete e topologia, migliorare il profilo visivo delle rotaie |
| Stazione | Fabbricato 3D con tetto e dettagli, banchina semplice | Pensilina, orologio, persone in scala, oggetti e luci effettive |
| Scalo | Tronchini e runaround operativi, pochi tronchi | Respingenti, ufficio, piazzale e carichi con distanze di rispetto |
| Bosco | Terreno 3D e maschere di rispetto, chiome su piani alpha | Gruppi forestali, specie e chiome volumetriche nei profili superiori |
| Opere ferroviarie | Assenti; tutti i binari restano alla stessa quota | Tunnel a corridoio curvo sull'arco esistente; due fornici e terzo anello scoperto. Ponte sotto il binario su piccolo impluvio, senza innalzare le rotaie. Opere scenografiche provvisorie, non prova di corrispondenza al plastico fisico |
| Campagna | Fila di molte case, nessun vigneto | Ridurre la lettura urbana, creare cascina, filari e orti con spazi verificati |
| Rotabili | Sei GLB Kenney CC0, originali procedurali | Non sono modelli realistici tedeschi: fallback, non risultato definitivo. Servono asset realistici con licenza; nessuna fonte disponibile verificata oltre Kenney |
| Luce | Sole, ambiente, finestre, fari; bloom e vignetta opzionali | AO, luci locali limitate, esposizione e contatti coerenti |
| Camera | Orbita/pan/zoom ortografici e Home | Preset, follow annullabile, limiti spaziali |
| Prestazioni | Instancing e batching; profili manuali | Isteresi automatica, LOD, cleanup GPU e misure browser riproducibili |

## Ordine di intervento e controlli

1. Fondamenta: camera, profilo grafico e profilo delle rotaie; test di navigazione e rete invariata.
2. Zone 1/2/5: elementi 3D originali con ingombri e percorsi liberi; test delle distanze.
3. Zona 3/4: foreste a gruppi, tunnel e ponte derivati da campioni della rete;
   test di corridoio e continuità del terreno. Nessuna modifica di src/network.js e src/simulation.js.
4. Asset: mantenere GLB CC0 come fallback, correggere lifecycle/risorse e definire punti gancio.
5. Rifinitura: AO, luci, qualità automatica e risorse riutilizzate.
6. Collaudo: test automatici a ogni fase, controlli browser e fotografie delle viste.
   Un test headless software non certifica 60 FPS su desktop o compatibilità iPad reale.

## Limiti da non nascondere

Non promettere fotorealismo da asset stilizzati. La collocazione di gallerie e ponte non
è quotata nel PDF: la ricostruzione paesaggistica sarà reversibile e separata dai dati
ferroviari. Per una dichiarazione di fedeltà 1:1 occorrono geometrie Kato verificate e
fonte RailModeller. Per il risultato artistico finale occorrono inoltre rotabili realistici
con licenza e una verifica su GPU/dispositivi reali. Il repository first resta escluso.

## Esito dell'incremento v0.5

Rete e simulazione conservate byte per byte (hash di riferimento):

- network.js: 2f1f667f34b31f1b26a57fcfcc0473b50a9c368bfdd943ddbebe6b1de5696cd4
- simulation.js: 2a1616347860546b57f847b045e405f592735c4f35ffef92c65af2c207623532

Sviluppati profilo rotaie, camera prospettica/preset/follow, qualità automatica,
AO selettiva, cinque zone, gallerie curve e ponte a quota invariata. Test incrementali
passati, compresi raycast sui portali, ingombri reali dei rotabili e 20 reset
con geometrie GPU stabili. Dettagli del collaudo e limiti sono nel README.
Restano aperti rotabili realistici, due respingenti interferenti, certificazione
CAD, texture compresse definitive e validazione su dispositivi reali.
