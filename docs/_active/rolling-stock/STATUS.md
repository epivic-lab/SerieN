# Serie N — Stato integrazione rotabili

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
