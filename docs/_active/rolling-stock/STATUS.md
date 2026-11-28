# Serie N — Stato integrazione rotabili

## L02-H — Big Boy · handoff di rilascio

27 novembre 2026. PASS tecnico: 589/589 test generali, 11/11 cinematici, 9/9 JMRI,
build e pacchetto completo. Prove browser Legacy/V06, STOP, inversione, scambio
occupato e ciclo risorse superati. Nessun cambiamento al runtime in H.

[Rapporto permanente](../../rolling-stock/BIG_BOY_FINAL_REPORT.md) ·
[Audit ed evidenze H](evidence/L02-H/README.md) ·
[PR #29: fonte dello stato finale di merge/deploy](https://github.com/epivic-lab/SerieN/pull/29).
Le sezioni L02-A–G seguenti sono storico delle qualifiche, non gate ancora attivi.

**Prossimo passaggio:** L02-I, verifica e accettazione post-rilascio Regia.

---


## L02-G — Big Boy · catalogo e runtime

27 novembre 2026. Aggiunta tramite Train Management, selezione, marcia, inversione,
STOP, luci e rimozione. Unità fissa motrice+tender, 260 mm; 19 assi animati.
Caricamento su richiesta e sagoma articolata nelle protezioni. Legacy/V06 e prova
frontale con altro treno superate; evidenze e conteggi nel [rapporto L02-G](evidence/L02-G/README.md).
PASS: 588 test generali, 5 dedicati, 11 cinematici, 9 JMRI, build e due cicli aggiunta/rimozione senza crescita GPU.
Tracciato, UI strutturale, Auth e integratore invariati. Distribuzione nominale;
agganci esterni non disponibili; nessun merge o deploy.

**Prossima sottofase: L02-H — audit e rilascio controllato**, previa approvazione Regia.

---


## L02-F — Union Pacific Big Boy · PASS tecnico campionato

27 novembre 2026. Quartatura corretta e biellismo nominale animato sui quattro lati.
Il difetto originale resta documentato come fixture negativa; il candidato supera
la misura indipendente e quella dei vertici renderizzati. Quote visive nominali,
non ricostruzione certificata ALCO né simulazione del ciclo vapore.

PASS: 648 configurazioni BVH, 584 test applicativi, 11 cinematici/geometrici,
8 metrologici, 9 JMRI, build e Chrome Legacy/V06 (420 mm, STOP e inversione).
Le esclusioni dei giunti, le modifiche locali al modello e i limiti della scansione
sono espliciti nel [rapporto](evidence/L02-F/README.md). Produzione e binari invariati.

**Prossima sottofase: L02-G**, integrazione nel catalogo e verifiche operative Big Boy.
STOP per audit e approvazione Regia; nessuna autorizzazione implicita a merge/deploy.

---

## L02-E — Union Pacific Big Boy · banco browser

**27 novembre 2026 · PASS tecnico del banco isolato e della prima animazione.**
Base `239fbfc11dc4e601b977297e460979ed64610e35`, stesso branch dedicato.
19 assi animati dall'odometro firmato, bielle di accoppiamento estratte dal sorgente,
staffe e timone L02-D. Chrome Legacy/V06: 420 mm avanti, STOP, ritorno in retromarcia,
occupazione longitudinale completa, nessun errore JavaScript. Test 584/584 Node,
8/8 cinematici, 9/9 JMRI e build PASS. Pose storiche conservate entro 1e-12.

**Big Boy non ancora integrata nel catalogo operativo.** Biella motrice e
 distribuzione statiche; quartatura, giochi laterali e interferenze in rotazione
NOT VERIFIED. Collisioni multi-treno, agganci e Train Management restano da provare.
Il fallimento sintetico R150 di L02-D resta valido. Nessuna modifica ferroviaria,
UI operativa, cloud o deploy.

[Rapporto, riproduzione, limiti e screenshot](evidence/L02-E/README.md).

**Prossima sottofase proposta: L02-F**, completamento e qualifica del biellismo
prima dell'integrazione nel catalogo. STOP per approvazione Regia.

---

## L02-D — Union Pacific Big Boy

**19 novembre 2026 · Battistrada, ingombri e staffe.** Base `9492ea5a4f03878a6609b5faa13659208a68357b` su `codex/rolling-stock-l02-big-boy`. Prototipo isolato nelle prove di sviluppo. [GLB](evidence/L02-D/prototype/prototype.glb) · [Inventario](../../rolling-stock/INVENTORY.md) · [Attribuzione](evidence/L02-D/prototype/ATTRIBUTION.md).

### Ruote e appoggio proiettato

Le teste delle rotaie renderizzate occupano **4,00–5,00 mm** per lato dal centro del binario in Legacy e **4,50–4,95 mm** in V06. I test rigenerano entrambe le sezioni dell’applicazione e verificano questi limiti. Il rilievo del GLB campiona ogni ruota a **72 angoli** a passi di 5° e ogni sezione trasversale a **0,025 mm**. Il battistrada comune alle fasi è la zona con superficie entro ±0,10 mm dal piano del ferro. La prova proietta questa zona e il bordino sulle teste delle rotaie lungo lo stesso itinerario. [Profili delle ruote](evidence/L02-D/prototype/wheel-profile.json).

Il GLB L02-C, provato con lo stesso movimento, perdeva l’appoggio proiettato di almeno una ruota in tutte le pose. La zona critica di certe ruote anteriori è discontinua fra le fasi. Il nuovo cerchione tornito conserva mozzi e razze e porta il bordino verso il centro. [Confronto prima della riprofilatura](evidence/L02-D/pre-reprofile.json).

| Scenario | Pose | Appoggio laterale minimo su ciascuna testa | Pose senza appoggio su una testa | Pose con bordino proiettato sulla testa |
| --- | ---: | ---: | ---: | ---: |
| Legacy | 3.100 | 1,000 mm | 0 | 0 |
| V06 | 2.990 | 0,401 mm su `V06-P035` | 0 | 0 |

La guida trasversale del carrello posteriore usa al massimo **1,547 mm** dei **±2,5 mm** disponibili, su `V06-P027`. Lo scostamento dei suoi assi scende da **0,782 mm a meno di 0,010 mm**. Il massimo residuo fra tutti gli assi è **0,489 mm** su un asse motore anteriore di `V06-P035`, incluso nella prova di appoggio. Il campionamento a passo massimo di 12 mm copre 71/75 tratti Legacy e 77/79 tratti V06 in entrambe le orientazioni. I sei tratti restanti non hanno pose campionate con spazio per l’intera composizione. [Scansione del percorso](evidence/L02-D/sweep.json).

### Articolazione e fissaggio del timone

Gli interventi geometrici riguardano la forcella sotto la caldaia, il predellino longitudinale e i raccordi sulla zona del cilindro anteriore. La verifica non rileva sovrapposizioni in **117 angoli da −14,50° a +14,50°**, a passi di 0,25°. Il massimo rilevato sulle tratte reali è 14,437°. Nelle 35 verifiche delle interfacce i soli riscontri fra telai sono sui due archi sintetici R150, dove l’angolo relativo supera 20°. [Scansione angolare](evidence/L02-D/hinge-sweep.json) · [Vista articolata R282](evidence/L02-D/r282-articulated.png).

Il timone di L02-C lavora fra **10,183 e 13,265 mm** di distanza fra i perni. Due staffe rigide seguono le rispettive casse e portano l’asse del perno a **1,65 mm** sopra il piano del ferro. Le sedi sulle traverse sono a **5,500 mm** per la motrice e **2,767 mm** per il tender. Le 35 verifiche BVH hanno trovato entrambe le staffe a contatto con la cassa di competenza, senza riscontri con le parti estranee o con guaina e linguetta. Lo scarto massimo perno–occhiello è inferiore a **0,001 mm**. [Vano del timone alla massima estensione](evidence/L02-D/drawbar-extended.png) · [Riscontri](evidence/L02-D/interface-overlap.json).

### Esiti e riproduzione

**PASS** per appoggio laterale proiettato, misure della guida posteriore, fissaggio del timone e caricamento isolato del GLB in Chromium. **PASS** per la qualifica geometrica campionata nell’intervallo dei tracciati reali. **FAIL** per l’arco sintetico R150. **NOT VERIFIED** contatto continuo tridimensionale con scambi e cuori, biellismo in rotazione, marcia con altri rotabili e prestazioni interattive del simulatore. Suite Node 584/584, prove di geometria e cinematica 5/5, JMRI 9/9 e build PASS. Il diff verifica gli invarianti di tracciato, protezioni, UI, Auth e cache. [Esiti](evidence/L02-D/checks.txt) · [Lettura WebGL](evidence/L02-D/browser.json).

```sh
evidence=docs/_active/rolling-stock/evidence/L02-D
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/prepare.py -- \
  /percorso/steam_locomotive_union_pacific_bigboy.glb "$evidence/prototype" L02-D
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/wheel-profile.py -- "$evidence/prototype"
node scripts/big-boy/sweep.mjs "$evidence/prototype" "$evidence/sweep.json"
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/inspect-pose.py -- "$evidence"
node --test scripts/big-boy/kinematics.test.mjs
```

**Prossima sottofase · L02-E.** Integrare in una prova browser isolata l’asset, le staffe e il timone, iniziare l’animazione di ruote e bielle e verificare avanzamento, arresto, inversione e occupazioni sulle tratte esaminate.

---

## L02-C — Union Pacific Big Boy

**19 novembre 2026 · Guida del carrello, interferenze e timone.** Base `da704f5bcce96e212fb620294ae977467f315a57` su `codex/rolling-stock-l02-big-boy`. Il prototipo resta fra le prove di sviluppo. [Inventario](../../rolling-stock/INVENTORY.md) · [GLB](evidence/L02-C/prototype/prototype.glb) · [Quote e attribuzione](evidence/L02-C/prototype/ATTRIBUTION.md).

### Guida e gioco trasversale

- Il nuovo punto di articolazione cade a metà fra i due assi motori più vicini. Il perno del carrello anteriore è al centro dei suoi due assi e scorre trasversalmente al telaio. La rotazione del carrello e la traslazione della guida sono risolte insieme rispetto al centro del binario, con limiti di prova di ±4,5 mm e ±0,35 rad.
- Su `V06-P035` a 83,33 mm, il punto critico di L02-B, la guida usa **3,737 mm** di corsa. Lo scostamento massimo dei due assi del carrello anteriore scende da **3,460 mm a meno di 0,010 mm**. Il massimo per quel carrello resta sotto 0,010 mm sia su V06 sia su Legacy.
- La scansione usa un gioco sperimentale di **±0,45 mm** per ciascun asse motore e per gli assi del carrello posteriore della motrice e del carrello a cinque assi del tender. Il rilievo applica lo spostamento al contorno proiettato delle ruote. La prova riguarda la posizione dei centri degli assi alla fase di riposo. Il gioco con le bielle in movimento e l’appoggio dei battistrada sulla rotaia restano da verificare. [Vista R282](evidence/L02-C/r282-articulated.png) · [Rilievo](evidence/L02-C/sweep.json).

| Scenario | Pose | Tratti | Ingombro laterale massimo | Scostamento residuo massimo |
| --- | ---: | ---: | ---: | ---: |
| Legacy | 3.100 | 71/75 | 24,004 mm su `T20` | 0,552 mm sul carrello posteriore, `T17` |
| V06 | 2.990 | 77/79 | 26,054 mm su `V06-P027` | 0,782 mm sul carrello posteriore, `V06-P027` |

Confronto effettuato a passo massimo 12 mm sui grafi e nelle due orientazioni di L02-B. L’arretramento del tender cambia le occupazioni vicino ai limiti di alcune sezioni. Il rilievo registra anche R315, R282, R249, R216 e R150 ideali nei due versi. Gli scostamenti massimi di tutti gli assi su R315/R282/R249 ideali sono rispettivamente **0,309 / 0,399 / 0,512 mm**. I raggi sintetici non qualificano l’accesso alle tratte del simulatore.

### Interfacce e timone

- Rimontati i dettagli inferiori del pancone sul telaio che li porta e ricavati scarichi nella traversa interna e nel profilo del longherone sotto la caldaia. I riscontri BVH fra telai motori sono scesi da **1.790 a 126** sul rettilineo e da **2.480 a 444** nel caso R282 destro. Restano coppie di triangoli da esaminare nella zona di articolazione e sotto la caldaia. Il conteggio BVH localizza le intersezioni candidate, senza misurarne la profondità.
- L’arretramento del tender di **4,8 mm** elimina i riscontri fra cabina e tender in tutte le verifiche selezionate. La quota di 253,03 mm resta il riferimento dell’asset sorgente. La composizione di prova misura circa **257,83 mm** fra gli estremi in rettilineo con il timone in posizione nominale.
- Il timone usa una guaina e una linguetta prigioniera di **7,75 mm** ciascuna, articolate sui rispettivi perni a **1,65 mm sopra il piano del ferro**. Sui tracciati reali la distanza fra perni è **10,183–13,265 mm** e la corsa richiesta **3,082 mm**. L’innesto resta fra **2,235 e 5,317 mm** a fronte di limiti di **0,95–6,00 mm**. Il margine geometrico minimo calcolato è **0,683 mm** nelle pose reali. La prova BVH di **27 configurazioni (24 pose distinte)** non rileva sovrapposizioni tra i membri, né fra i membri e le casse, i carrelli e gli assi esaminati.
- Il modello del timone è costruito dallo script di prova a partire dalle quote di `rig.json`. I perni sono riferimenti cinematici. Il fissaggio delle staffe alle due casse e la verifica continua degli ingombri restano da completare. [Timone alla massima estensione V06](evidence/L02-C/drawbar-extended.png) · [Riscontri BVH](evidence/L02-C/interface-overlap.json).

### Esiti e riproduzione

**PASS** per guida anteriore, riproduzione del GLB, caricamento Chromium isolato e corsa del timone sulle pose misurate. **BLOCKED per la marcia nel simulatore** per i riscontri residui fra i telai e il gioco da verificare sul carrello posteriore e sul rodiggio. Suite Node 584/584, prove cinematiche 3/3, audit JMRI 9/9 e build PASS. Il diff verifica gli invarianti di tracciato, protezioni, UI, Auth e cache. **NOT VERIFIED** rotazione completa delle ruote con bielle, staffe, sagoma dinamica, interazione con altri rotabili e prestazioni in marcia. [Esiti](evidence/L02-C/checks.txt) · [Lettura WebGL](evidence/L02-C/browser.json).

```sh
evidence=docs/_active/rolling-stock/evidence/L02-C
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/prepare.py -- \
  /percorso/steam_locomotive_union_pacific_bigboy.glb "$evidence/prototype" L02-C
node scripts/big-boy/sweep.mjs "$evidence/prototype" "$evidence/sweep.json"
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/inspect-pose.py -- "$evidence"
node --test scripts/big-boy/kinematics.test.mjs
```

**Prossima sottofase · L02-D.** Verificare il contatto ruota–rotaia e il gioco del carrello posteriore, risolvere le intersezioni residue fra telai, validare le staffe del timone e ripetere la prova geometrica prima dell’attivazione in Train Management.

---

## L02-B — Union Pacific Big Boy

**19 novembre 2026 · Prototipo articolato e rilievo in curva.** Ripresa dal checkpoint `2147f77c55020513406f2c4ab14d5022d900ad9d` su `codex/rolling-stock-l02-big-boy`. [Inventario](../../rolling-stock/INVENTORY.md).

Il prototipo è archiviato tra le prove di sviluppo. Il GLB è sceso da **125,1 a 27,1 MB** (−78,3%) e la geometria del solo rotabile da **800.596 a 176.115 triangoli** (−78,0%). L’asset conserva texture e UV con 24 immagini fino a 1.024 px. Il modello misura **253,02 × 22,06 × 31,39 mm** (lunghezza, larghezza, altezza complessiva). La targa del sorgente riporta **X4015**. La scheda della 4014 fornisce il riferimento dimensionale in scala 1:160. [GLB](evidence/L02-B/prototype/prototype.glb) · [Attribuzione](evidence/L02-B/prototype/ATTRIBUTION.md) · [Profilo con texture](evidence/L02-B/prototype-profile.png).

I sette gruppi rigidi comprendono telaio posteriore con caldaia, telaio anteriore, due carrelli della motrice, cassa del tender e due carrelli del tender. I 19 assi sono nodi ruotabili attorno ai propri centri. Le posizioni sono espresse in millimetri sul plastico. I pivot di articolazione e gli attacchi del timone sono quote del prototipo ricavate dalla disposizione della mesh. Il timone è rappresentato da due punti di misura. Bielle, ruote e tubazioni mantengono la posa di riposo durante il rilievo. [Quote e gerarchia](evidence/L02-B/prototype/rig.json).

### Misure in curva

L’audit orienta il telaio posteriore e il tender sulle corde dei rispettivi appoggi. Il telaio anteriore e i carrelli ruotano sul proprio perno, orientandosi verso le posizioni degli assi lungo l’itinerario. Per ciascun gruppo proietta sul piano l’inviluppo convesso della mesh e misura la distanza dal centro del binario. La misura è un’indicazione geometrica alla fase di riposo delle ruote. Il profilo dinamico completo e il contatto ruota–rotaia richiedono un collaudo separato.

| Raggio di riferimento | Ingombro laterale dal centro del binario, max (mm) | Scostamento asse, max (mm) | Angolo fra i telai (°) | Distanza perni timone (mm) |
| --- | ---: | ---: | ---: | ---: |
| Rettilineo | 11,03 | 0,00 | 0,00 | 5,38 |
| R315 | 22,99 | 0,97 | 11,46 | 6,75 |
| R282 | 24,43 | 1,09 | 12,80 | 7,05 |
| R249 | 26,20 | 1,23 | 14,48 | 7,46 |
| R216 | 28,44 | 1,42 | 16,68 | 8,04 |
| R150 | 35,68 | 2,06 | 23,90 | 10,20 |

I raggi in tabella sono archi ideali nei due versi. R216 e R150 servono come confronto alle curve più strette. La vista R282 usa una guida da 9 mm e colori distinti per telaio posteriore (blu), anteriore (arancione) e tender (verde). [Vista articolata a R282](evidence/L02-B/r282-articulated.png).

La scansione del grafo reale, a passo massimo **12 mm**, usa `Journey` e il routing di SerieN, con entrambe le orientazioni. Copre **3.099 pose Legacy** (71/75 tratti) e **2.984 pose V06** (77/79 tratti), inclusi 20 e 18 rami di scambio rispettivamente. Nei sei tratti senza campioni validi la scansione richiede spazio per tutta la composizione. Il JSON elenca tratti, coordinate, orientazione e configurazioni degli scambi.

- **V06**. Ingombro laterale massimo **28,73 mm** su `V06-P027`. Scostamento massimo **3,46 mm** sul primo asse del carrello anteriore, su `V06-P035` a 83,33 mm. Distanza tra gli attacchi del timone **5,38–9,37 mm**.
- **Legacy**. Ingombro laterale massimo **26,21 mm** su `T21`. Scostamento massimo **2,97 mm** su `WX-A:up`. Distanza tra gli attacchi del timone **5,38–8,57 mm**.
- La verifica BVH ha rilevato coppie di triangoli sovrapposte alle interfacce telaio anteriore–posteriore e cabina–tender, anche sul rettilineo. I conteggi comprendono il materiale sorgente a cavallo delle giunzioni e servono per localizzare le parti da esaminare. La prova non misura la profondità di interferenza né distingue il contatto previsto dalle collisioni fra componenti. [Scansione](evidence/L02-B/sweep.json) · [Sovrapposizioni BVH](evidence/L02-B/interface-overlap.json).

### Esito e riproduzione

**PASS per preparazione del prototipo, riproduzione, build e rilievo. BLOCKED per l’abilitazione in marcia** per gli scostamenti degli assi e le interfacce da risolvere. Chromium ha caricato e disegnato l’asset con Three.js in una pagina isolata. **NOT VERIFIED** la marcia nel simulatore, il contatto a tutte le fasi del rodiggio, il rispetto della sagoma a fianco di altri convogli e le prestazioni interattive. Suite Node 584/584 e audit JMRI 9/9. Il diff certifica gli invarianti di tracciato, protezioni, UI e Auth. [Esiti](evidence/L02-B/checks.txt) · [Lettura WebGL](evidence/L02-B/browser.json).

```sh
evidence=docs/_active/rolling-stock/evidence/L02-B
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/prepare.py -- \
  /percorso/steam_locomotive_union_pacific_bigboy.glb "$evidence/prototype"
node scripts/big-boy/sweep.mjs "$evidence/prototype" "$evidence/sweep.json"
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/inspect-pose.py -- "$evidence"
```

**Prossima sottofase · L02-C.** Correggere la guida del carrello anteriore e verificare il gioco degli assi. Localizzare e correggere le interferenze del telaio articolato e del tender, dimensionare il timone e ripetere il rilievo sugli stessi itinerari prima dell’attivazione in Train Management.

---

## L02-A — Union Pacific Big Boy

**19 novembre 2026 · Rilievo del sorgente e preparazione dell’asset.** Base `148b3d246b36759a8c06072a148a7ab19f24f908`, branch `codex/rolling-stock-l02-big-boy`. [Inventario persistente](../../rolling-stock/INVENTORY.md).

### Sorgente e misure

Il GLB di Footloose (CC BY 4.0) si trova in `01_Locomotive/steam_locomotive_union_pacific_bigboy.glb`. Provenienza, titolo e licenza sono incorporati nel GLB. Il file originale da **125.112.728 byte** si recupera dalla libreria Drive. Lo SHA-256 nel rilievo permette di verificare che sia lo stesso sorgente. [Modello originale](https://sketchfab.com/3d-models/steam-locomotive-union-pacific-bigboy-dff7f4b67c734d4db430d8c47810a6cd) · [Licenza](https://creativecommons.org/licenses/by/4.0/) · [Rilievo](evidence/L02-A/geometry.json).

- Blender 4.3.2 ha importato il GLB. Motrice e tender occupano **39,94842 × 3,47700 × 4,95825** unità sorgente sugli assi longitudinale, trasversale e verticale. Il rilievo riporta i limiti dei vertici in coordinate globali per 17 gruppi.
- Il gruppo `Track_low` contiene l’intero binario dimostrativo, **59.760 triangoli**. Escludendolo, il GLB contiene **43 mesh e 800.596 triangoli** di rotabile. Le 27 immagini incorporate occupano **85.440.589 byte** nel sorgente. Il GLB non contiene clip o skin.
- Il profilo ortografico mostra il tender a sinistra, il rodiggio **4-8-8-4** a destra e identifica le due batterie di assi motori. Il rendering usa un materiale neutro e nasconde `Track_low`. La separabilità delle ruote e delle bielle, i pivot e gli ingombri in moto sono ancora da misurare. [Profilo laterale](evidence/L02-A/profile.png).
- La lunghezza nominale di motrice e tender della 4014 è **253,03 mm** in scala 1:160, utile come riferimento per normalizzare la mesh. Kato dichiara **R282** come raggio minimo del proprio modello in scala N. L’idoneità della mesh su R282, R315, R249, raccordi e scambi di SerieN richiede misure sul modello articolato, anche in retromarcia. [Specifiche Union Pacific](https://www.up.com/about-us/history/steam/big-boy-4014) · [Modello Kato](https://katousa.com/product/union-pacific-big-boy-4014/).

### Riproduzione

```sh
blender -b -t 4 --python-exit-code 1 --python scripts/audit-big-boy.py -- \
  /percorso/steam_locomotive_union_pacific_bigboy.glb \
  docs/_active/rolling-stock/evidence/L02-A
```

### Stato della verifica

Rilievo del GLB, controllo dello SHA-256, conteggi delle mesh e profilo ortografico **PASS**. Test Node 584/584, audit JMRI 9/9 e build di produzione **PASS**. Il confronto con la base verifica che i file ferroviari canonici, V06 e Legacy, il runtime, il catalogo e l’App UI, Auth e cache siano identici. L’audit Blender legge un sorgente locale e non aggiunge dipendenze o richieste di rete al simulatore. [Esiti](evidence/L02-A/checks.txt).

**NOT VERIFIED** per il candidato in browser, compresi prestazioni e ingombri dinamici. Il lavoro di questa sottofase è l’audit offline.

**Prossima sottofase · L02-B.** Preparare un GLB ottimizzato senza binario dimostrativo, ricavare pivot e separare telaio anteriore, telaio posteriore, tender e rodiggio. Misurare l’inviluppo con il prototipo articolato su R282/R315 e caratterizzare R249 e le curve più strette senza presumere la compatibilità. La revisione precede l’attivazione in Train Management.

---

## L01 — Henschel DHG 500 C

Branch: `codex/rolling-stock-l01-henschel`. Baseline `ba26f791e32c7d322da4169bb0b6fe5c4b692a32`.

## Implemented
- Original 272,032-byte GLB, 3,710 triangles, source/license retained under `assets/rolling-stock/henschel-dhg-500-c/`.
- Runtime scale to N 1:160: length 61.875 mm, width 19 mm, height 26.6875 mm.
- Independent wheel segmentation: six original wheel mesh components identified and detached from baked GLB geometry, rotating in sync with Journey odometer. No change to original texture/material.
- Henschel type added to locomotive rendering, Train Management spawn action, Depot catalog, project/side view and real runtime PNG thumbnails.
- Headlamp support, nominal couplers, train creation via existing protected placement, scene rendering, removal, controls and Follow.
- Existing BR 01 remains the default. No canonical track geometry changes.

## Source licence
accessviolation, Sketchfab; **CC BY-NC-SA 4.0**, noncommercial use only with attribution and share-alike of adaptations. Check `ATTRIBUTION.md` before commercialization.

## Verification
Automated CI branch workflow includes `npm ci`, `npm test`, `npm run build`, JMRI Python audit. The initial CI attempt on first commit failed three legacy assertions expecting a fixed two-model catalog / 16-image manifest; corrected in subsequent commit to reflect Henschel inclusion, preserving BR 01 checks. Check latest workflow run for results.

## L01-FINAL — 18 November 2026

**PASS tecnico locale; consegna per revisione Regia.** Resumed from remote
`236ec10c91056cfe9c10d632d34aad4f9d91e14e`. The final checkpoint is the commit
containing this report; remote publication is verified in the delivery receipt.

The browser timeout was caused by the service worker serving the real auth module
without invoking the Playwright route fixture. Reproduced worker enabled → login
screen/timeout, worker blocked in test context → app ready. Production auth remains
unchanged. Tests now retain real rendering and pause only ordinary physics before
explicit diagnostic steps, instead of relying on a minified callback name.

Corrected wheel rotation sign against actual GLB transforms; regression assertions
check ground-contact motion in both directions. Anchored the headlamp lens to the
raycast hood surface, removing the floating sphere. Replaced the schematic with
transparent runtime PNGs (512×231 side at 8 px/mm, 320×160 thumbnail). Added the
Henschel GLB and images to the existing static cache inventory.

### Verified
- Node **584/584**, JMRI **9/9**, production build **PASS**.
- Chrome V06/Legacy: initial BR 01, catalog, protected Henschel spawn, six wheels
  synchronized to signed odometer, forward/reverse and stationary STOP.
- **4,387.5 mm** sampled travel per scenario over **17 V06 / 15 Legacy edges**,
  curves and rendered poses matching Journey; approaching-turnout operation
  rejected by existing protection (`V06-C13` / `WX-A`).
- Follow, headlights command, real thumbnails, Train Management and 390 px mobile
  without horizontal overflow.
- Coupling to a real detached BR 01 tender used only as a fixture: nominal pitch
  **62.247249657 mm**, **734.6875 mm** hauled with matching rendered poses, then
  uncoupling. Diagnostic placement prepares the fixture; ordinary commands perform
  coupling, motion and uncoupling. This is not a proposed diesel train set.
- Real-time forward/reverse/STOP recording, with numeric samples.
- Original GLB, BR 01, canonical rails/network, railway engine, UI styles,
  authentication and production workflow unchanged. Capture provenance is recorded
  in `assets/rolling-stock/henschel-dhg-500-c/captures.json`.

Evidence and reproduction: [L01-final](evidence/L01-final/README.md).
Live OAuth is outside this local-fixture validation. Couplers remain nominal
simulator anchors, not a certified mechanical coupling model.
Next action: independent Regia review, then a separately authorized release.
No merge/deploy on `main` is performed by this checkpoint.
