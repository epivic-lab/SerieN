# SerieN — diagnosi iniziale dell’export RailModeller Pro / JMRI

**Documento storico precedente all’integrazione.** La rete attuale e gli esiti sono in [Consolidamento Fase 0](../consolidation/README.md). [SVG canonico](layout-canonical.svg) · [Grafo operativo completo](canonical-graph.json). Le conclusioni qui sotto descrivono la lettura letterale del solo XML, non lo stato attuale del simulatore.

**Esito: l’export è coerente per i pezzi singoli, ma incompleto per quattro moduli multibinario. Non è ancora un grafo utilizzabile per far circolare i treni sui tre anelli.** Nessun aggiornamento del simulatore o del rendering è stato applicato con questa analisi; nessuna galleria prevista.

[Planimetria interattiva](index.html) · [SVG revisionato](layout-reviewed.svg) · [SVG originale](layout-original.svg) · [SVG per minimappa](minimap-reviewed.svg) · [Grafo JSON](diagnosis.json) · [XML originale](source.xml) · [XML con quarto respingente](with-fourth-buffer.xml)

## 1. Inventario verificato

| Oggetti | XML | Interpretazione |
|---|---:|---|
| `positionablepoint` | 56 | Punti geometrici, di cui 3 `END_BUMPER` |
| `tracksegment` | 53 | 27 archi circolari, 24 rettilinei fisici, 2 connettori di lunghezza zero |
| `layoutturnout` | 6 | Sei deviatoi singoli: tre destri e tre sinistri |
| Moduli WX310 | 0 | Mancano i due elementi presenti nel PDF e nella distinta |
| Allargamenti 20-051 / 20-052 | 0 | Mancano entrambi, con tutti i loro rami |

I 51 segmenti fisici non nulli corrispondono esattamente alle quantità della distinta:

- 9 rettilinei da 248 mm, 1 da 186 mm, 4 da 124 mm, 10 da 62 mm;
- 8 curve R249/45°, 8 R282/45°, 8 R315/45°, 3 R481/15°;
- aggiungendo i 6 deviatoi singoli si ottengono **57 pezzi rappresentati su 61**;
- i quattro pezzi mancanti sono **2×20-210, 1×20-051, 1×20-052**.

I dieci rettilinei da 62 mm comprendono sette pezzi standard/alimentati e tre con respingente. Il solo XML non distingue i quattro S62 normali dai tre S62F. Non è stata inventata questa distinzione.

`T51` collega `TO0:A` a `TO3:B`; `T52` collega `TO0:C` a `TO5:A`. I capi coincidono esattamente: sono connessioni esplicite valide, **non due pezzi fisici o segmenti isolati**. Per un futuro motore che richiede lunghezze positive vanno contratti conservando le identità e i ruoli dei due apparati collegati.

## 2. Geometria e tolleranza

L’unità fisica non è dichiarata nell’XML. La scala **10 mm per unità XML** è confermata indipendentemente dai rettilinei da 24,8 / 12,4 / 6,2 unità e dai raggi dei tre anelli. `panelwidth=312` e `panelheight=312` sono dimensioni della finestra JMRI, non del plastico.

Le coordinate sono arrotondate a 0,1 unità XML, quindi a circa **1 mm sul plastico**. Gli archi SVG passano per gli estremi esportati, rispettando `angle`, `circle` e `flip`; il raggio è ricavato dalla corda e dall’angolo, senza imporre un raggio nominale diverso dai dati. Per questo i raggi ricavati oscillano leggermente attorno a R249/R282/R315/R481.

I tratti viola dentro i sei deviatoi mostrano i collegamenti JMRI A–B e A–C usando le coordinate di porti e centro. **Sono uno schema interno**, non una certificazione del profilo fisico degli aghi o della curva Kato. Per la migrazione fisica andranno applicati i modelli di catalogo, con verifica degli estremi. Il file definisce le coordinate dei porti; non una mesh 3D o l’intera geometria costruttiva dei deviatoi.

Due soli disallineamenti sono stati normalizzati nella copia diagnostica:

| Giunzione | Differenza | Compatibilità tangenti | Intervento |
|---|---:|---:|---|
| A55 ↔ TO0:B | 2,00 mm | 0,00° | Allineamento al porto TO0:B |
| A60 ↔ TO4:B | 2,00 mm | 0,33° | Allineamento al porto TO4:B |

Sono coppie di estremi aperti reciprocamente più vicini, entro 2,5 mm e con tangenti compatibili. Nessuna linea parallela distante 33 mm e nessuna interruzione da 310 mm è stata unita. Le rettifiche sono esplicite in `diagnosis.json`; modificano di 2 mm l’estremo di T41 e di circa 1,86 mm la lunghezza geometrica ricavata di T44. Lo SVG originale conserva tutte le coordinate originali.

## 3. Grafo, anelli e parti isolate

Per l’analisi si usano 56 punti più 18 porti A/B/C dei deviatoi, con 53 collegamenti esterni e 12 percorsi interni A–B/A–C.

| Stato | Vertici | Archi | Componenti connesse | Rango ciclico |
|---|---:|---:|---:|---:|
| XML originale | 74 | 65 | 9 | 0 |
| Con connettori nulli contratti e due piccole giunzioni normalizzate | 70 | 63 | 8 | 1 |

**I tre contorni degli anelli sono riconoscibili geometricamente, ma nessuno dei tre è chiuso topologicamente nell’XML.** Dopo la piccola correzione J2 compare il ciclo topologico del runaround. Non è un anello di circolazione continua: durante le manovre restano necessarie le inversioni e le transizioni ammesse dai deviatoi.

Non risultano riferimenti a punti o segmenti inesistenti, identificatori duplicati o nodi del tutto isolati. La connettività è ricostruita dai due capi dei `tracksegment`: per esempio A1 è condiviso da T0/T1 anche se il punto dichiara soltanto `connect1name`. Gli attributi D presenti nei deviatoi singoli non sono stati trattati come un quarto porto: per i tipi 1/2 valgono solo A/B/C. I numeri saltati negli identificatori non dimostrano pezzi mancanti. `T34` e `T35`, invece, sono due componenti isolate di un solo segmento ciascuna: sono i due S124 centrali, rimasti separati perché mancano gli allargamenti alle loro estremità.

Le otto componenti normalizzate sono: semicirconferenza destra dell’anello centrale; semicirconferenza sinistra centrale; scalo più parte destra dell’anello interno; anello esterno interrotto al WX310 est; semicirconferenza sinistra interna; rettilineo superiore centrale T32/T33; S124 T34; S124 T35.

### Quattro moduli assenti

Le posizioni sono confermate dal PDF del tracciato fornito in precedenza e dalla distinta, oltre che dagli estremi dell’XML. I riquadri ambra nella planimetria indicano i porti dei moduli, **non nuovi binari**.

| Modulo | Estremi aperti nell’XML | Regione nel mondo 3D, mm |
|---|---|---|
| WX310 ovest, 20-210 | A7, A43, A25, A8 | X 378…688; Z 68…101 |
| WX310 est, 20-210 | A40, A30, A42, A32 | X 812…1122; Z 35…68 |
| Allargamento sinistro, 20-051 | A28, A44, A3, A46 | X 378…688; Z 566…632 |
| Allargamento destro, 20-052 | A45, A23, A47, A2 | X 812…1122; Z 566…632 |

I WX310 sono lunghi 310 mm, con interasse 33 mm. Gli allargamenti occupano 310 mm longitudinali, con interasse da 33 a 66 mm. Non sono stati aggiunti percorsi interni a questi quattro moduli.

## 4. I quattro tronchini e il runaround

| Terminale | Collegamento effettivo | Stato esportato |
|---|---|---|
| A67 | TO5:C → T49 → A65 → T50 → A67 | ANCHOR, manca il respingente |
| EB39 | TO5:B → T29 → A37 → T48 → A38 → T30 → EB39 | END_BUMPER |
| EB49 | TO1:A → T38 → A48 → T37 → EB49 | END_BUMPER |
| EB52 | TO4:C → T47 → A63 → T46 → A51 → T39 → EB52 | END_BUMPER |

Il ramo principale del runaround collega **TO1:B–T40–A54–T42–TO2:B**. Il ramo di aggiramento collega **TO1:C–T43–TO4:A–B–A60–T44–TO2:C**; la giunzione A60/TO4:B è J2. TO4 presenta inoltre la diramazione verso EB52.

La geometria rivela **due accessi distinti all’anello interno**:

- TO0 alimenta TO5 e i due tronchini occidentali A67/EB39;
- TO3 alimenta TO2, il runaround e i tronchini EB49/EB52.

La ricostruzione corrente del simulatore collega invece lo scalo attraverso un accesso comune e nodi aggregati. Questa differenza è topologica, non una semplice correzione estetica o uno spostamento di coordinate.

### Quarto respingente

La distinta contiene esattamente tre 20-046, coerenti con i tre `END_BUMPER` esportati. Il quarto terminale A67 appartiene a un tratto S248, non a un S62 con respingente: **non è soltanto un’etichetta persa durante l’export**.

Come richiesto, nella copia `with-fourth-buffer.xml` A67 è stato marcato `END_BUMPER`, mantenendo ID, coordinate e T50. Nessun segmento è stato aggiunto o allungato. È l’unica modifica di quella copia XML; i due piccoli agganci sono documentati separatamente nello SVG/JSON normalizzato.

Per realizzare materialmente il terminale con un ulteriore Kato 20-046 da 62 mm, la distinta va aggiornata. Una possibilità da valutare è sostituire l’ultimo S248 con S186 + 20-046, conservando la stessa lunghezza nominale; **questa sostituzione non è stata applicata**. Non è stato esteso arbitrariamente il tronchino.

## 5. Sei deviatoi XML e otto comandi attuali

JMRI distingue RH=1 e LH=2; A è il porto comune, A–B la via normale, A–C la deviata, B–C una transizione vietata. I tipi e le quantità coincidono con la distinta:

| XML | Mano / famiglia | Codice coerente con distinta | A–B misurato |
|---|---|---|---:|
| TO0 | Sinistro #6 R718 | 20-202 | 186,00 mm |
| TO1 | Destro #4 R481 | 20-221 | 125,16 mm |
| TO2 | Sinistro #4 R481 | 20-220 | 125,16 mm |
| TO3 | Sinistro #4 R481 | 20-220 | 126,00 mm |
| TO4 | Destro #6 R718 | 20-203 | 185,59 mm |
| TO5 | Destro #6 R718 | 20-203 | 186,29 mm |

La distinta indica 127 mm per i #4; le coordinate danno circa 125,2–126 mm. Il profilo e la precisione della libreria vanno verificati prima di imporre una lunghezza fisica; non sono stati scalati i deviatoi per nascondere lo scostamento.

La seguente è una **proposta di mappatura logica, non applicata**. Il file non contiene nomi di apparato o indirizzi DCC che rendano automatica la corrispondenza.

| Comando attuale | Destinazione proposta | Esito |
|---|---|---|
| WX-A, WX310 ovest | 20-210 fra A7/A43/A25/A8 | Apparato mancante nell’XML; recuperare dal catalogo/PDF |
| WX-B, WX310 est | 20-210 fra A40/A30/A42/A32 | Apparato mancante nell’XML; recuperare dal catalogo/PDF |
| Y-IN, Accesso merci | TO0 | Accesso occidentale riconoscibile; aggiornare i porti reali |
| Y-2, Tronchino nord | TO5 | Bivio dei due tronchini occidentali; chiarire il nome del gruppo |
| Y-3, Tronchini ovest | TO3 | Nessuna equivalenza diretta: riutilizzabile come “Accesso merci est”, con rinomina esplicita |
| Y-R1, Runaround ovest | TO1 | Ruolo coerente |
| Y-R2, Runaround est | TO2 | Ruolo coerente |
| Y-4, Tronchino est | TO4 | Ruolo coerente |

Gli otto comandi hanno quindi una corrispondenza fisica plausibile **6 singoli + 2 WX310**, ma gli attuali significati di Y-2/Y-3 e i collegamenti dello scalo richiedono revisione. Non è corretto associare i comandi semplicemente per vicinanza sul vecchio disegno.

Anche le posizioni dei crossover differiscono: WX-A passa dall’attuale X 440…750 a X 378…688; WX-B da X 800…1110 a X 812…1122. Il nuovo registro dovrà conservare otto apparati distinti e i ruoli A/B/C, evitando transizioni B–C e falsi nodi a cinque rami.

## 6. Un’unica trasformazione per 3D e minimappe

Si adotta la base già prevista di 1500×700 mm, centrata sul tracciato. Il suo angolo posteriore sinistro corrisponde alla coordinata XML **(30,3; 99,3)**. È una scelta di allineamento, non un dato di bordo tavola dichiarato dall’XML.

```text
world.x = 10 × (xml.x − 30.3)
world.z = 10 × (xml.y − 99.3)
world.y = quota ferroviaria del simulatore

minimap.x = world.x
minimap.y = world.z
viewBox   = "0 0 1500 700"
preserveAspectRatio = "xMidYMid meet"
```

Esempi: A0 → (1404; 350) mm; A67 → (260; 231) mm; EB49 → (155; 343) mm. L’anello esterno occupa circa X 63…1437 e Z 35…665 mm, già allineato ai grandi ingombri del mondo 3D esistente. La Y XML aumenta verso il fronte del plastico, come la Z del mondo. Se si usa il sistema del brief con asse verso il retro: `Y_brief = 700 − world.z`.

Lo SVG per minimappa conserva questa trasformazione e tutti i vuoti dell’export. È pronto come artefatto di geometria, **non va ancora inserito nelle consolle al posto di un grafo completo**. Le tre minimappe dovranno condividere la stessa geometria e trasformazione una volta risolti i quattro moduli mancanti.

## 7. Limiti e sequenza della migrazione

1. Conservare l’XML originale e il confronto con il PDF/CSV come fonti.
2. Recuperare i quattro moduli multibinario dai profili Kato corretti, alle posizioni documentate: niente raccordi Bézier o giunzioni per prossimità da 33/310 mm.
3. Costruire un adattatore con segmenti circolari, porti dei deviatoi, due connessioni nulle contratte e due piccoli agganci tracciati. Verificare chiusura dei tre anelli, quattro terminali e runaround.
4. Approvare la mappatura dei sei deviatoi e i nomi dei comandi, aggiornando l’HUD e le regole di instradamento senza transizioni vietate.
5. Solo allora usare lo stesso grafo nel moto dei treni, nel 3D e nelle tre minimappe. Rivalutare sagome dei rotabili, arresto prima del respingente ed edifici vicini, adattando lo scenario al tracciato.

Le posizioni scenografiche non sono specificate nell’XML: in particolare il ponte provvisorio attuale, centrato a X416/Z68, ricade nella regione del WX310 ovest e va rivalutato prima della migrazione dello scenario. Nessuna modifica scenografica è stata applicata.

L’XML usa un solo blocco “RM Block” e non assegna indirizzi ai deviatoi. `continuing=2` definisce il senso della via normale, non lo stato reale del comando o l’autorizzazione di marcia. Questi dati non consentono di dedurre un percorso libero.

La bozza della nuova plancia, realizzata prima dell’arrivo di questo XML, è conservata separatamente e non pubblicata. Non sono stati modificati `network.js`, `simulation.js` o il repository `first`.

## Riproducibilità e fonti

```sh
python3 scripts/analyze-jmri-layout.py "percorso/3 anelli 4 tronchini 1 run around.xml"
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
```

I sette controlli automatici dell’analisi sono superati. SHA-256 dell’originale e dati completi sono in `diagnosis.json`. I controlli verificano inventario, riferimenti, componenti, due soli piccoli agganci, connettori nulli, quattro terminali nella revisione, geometria SVG e modifica unica di A67 nell’XML.

Convenzioni JMRI verificate sul sorgente pubblico della versione 4.26:

- [LayoutTurnout.java](https://github.com/JMRI/JMRI/blob/v4.26/java/src/jmri/jmrit/display/layoutEditor/LayoutTurnout.java): mano destra/sinistra, porti A/B/C e transizioni vietate.
- [TrackSegmentView.java](https://github.com/JMRI/JMRI/blob/v4.26/java/src/jmri/jmrit/display/layoutEditor/TrackSegmentView.java): raggio da corda/angolo e inversione `flip`.

Il PDF precedente conferma visivamente i due WX310 e la posizione sinistra/destra di 20-051/20-052. L’analisi non usa il vecchio PDF Fleischmann, erroneamente fornito all’inizio.
