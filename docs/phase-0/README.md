> Archivio della baseline v0.7: rete precedente alla migrazione XML. Per il tracciato corrente vedere [consolidamento](../consolidation/README.md) e [SVG canonico](../jmri-layout/layout-canonical.svg). Il lock storico resta verificato sui sorgenti conservati in `baseline/`.

# Fase 0 — inventario e topologia congelata

Fonte: codice attuale, non geometria dell'immagine artistica. Galleria esclusa su richiesta dell'utente.

[Mappa interattiva](index.html) · [SVG](layout.svg) · [Dati completi](layout.json) · [Confronti e misure](comparison.html) · [Distinta Kato e verifica](KATO-PARTS-AUDIT.md)

## Coordinate

Millimetri del plastico 1500×700, scala 1:160. X verso destra, Z verso il visitatore, Y verticale. Dal brief: x=X; z=700−Y; y=Z. Le quote del ferro restano quelle del rendering (profilo rotaia 3.55…5.95 mm), non una certificazione metrologica Unitrack.

## Stato protetto

33 archi, tre anelli R249/R282/R315, due crossover, quattro estremità terminali (upper/middle/lower/right), runMain e runAround. Sorgenti network.js e simulation.js congelate in network-lock.json e controllate dai test.

## Zone e catalogo

I poligoni sono regioni artistiche sovrapponibili: nessun binario viene spostato. 214 elementi catalogati, 155 alberi, 945 centri candidati filtrati (passo 10 mm; piccoli prop r≤5 mm). I punti non costituiscono superfici edificabili; la sagoma completa va verificata prima di ogni nuovo inserimento. I materiali e l'assetPath null degli elementi originali riflettono geometria procedurale esistente.

| ID | Zona | Stato |
|---|---|---|
| Z1 | Stazione | Elementi esistenti e aree indicative |
| Z2 | Scalo e runaround | Elementi esistenti e aree indicative |
| Z3 | Boschi e pendii | Elementi esistenti e aree indicative |
| Z4 | Ponte e margine destro (senza galleria) | Ponte presente; galleria esclusa |
| Z5 | Campagna futura sul retro | Regione obiettivo; cascina/vigneto attuali fuori dalla fascia posteriore |

## Impronte esistenti da verificare

Controllo conservativo 2D contro un corridoio di 18 mm: segnala candidati da verificare in 3D, non certifica una collisione. Nessun edificio spostato.

| Oggetto | Distanza minima dal binario mm |
|---|---:|
| factory-west | 0.00 |
| factory-north | 12.50 |
| station | 17.00 |

## Dati ancora da risolvere

- Manca l'export RailModeller definitivo: le curve dello scalo sono ricostruite, non certificate CAD Kato.
- Cascina e vigneto sono nella metà anteriore; la campagna sul retro resta un obiettivo, senza spostamenti in fase 0.
- Due respingenti (middle/lower) interferirebbero con i binari vicini; nessuna prolunga inventata.
- I fabbricati industriali precedenti restano in posizione; ruolo e accessi richiedono una fase compositiva successiva.
- Posizione del ponte e accesso al sottopasso sono scenografici e richiedono un riferimento misurato del plastico.

## Archi ferroviari reali del simulatore

| Arco | Lunghezza mm | Da | A |
|---|---:|---|---|
| L0-0 | 62.00 | 378.000,101.000 | 440.000,101.000 |
| L0-1 | 310.00 | 440.000,101.000 | 750.000,101.000 |
| L0-2 | 50.00 | 750.000,101.000 | 800.000,101.000 |
| L0-3 | 12.00 | 800.000,101.000 | 812.000,101.000 |
| L0-4 | 298.00 | 812.000,101.000 | 1110.000,101.000 |
| L0-5 | 12.00 | 1110.000,101.000 | 1122.000,101.000 |
| L0-return | 2313.26 | 1122.000,101.000 | 378.000,101.000 |
| L1-0 | 62.00 | 378.000,68.000 | 440.000,68.000 |
| L1-1 | 310.00 | 440.000,68.000 | 750.000,68.000 |
| L1-2 | 50.00 | 750.000,68.000 | 800.000,68.000 |
| L1-3 | 12.00 | 800.000,68.000 | 812.000,68.000 |
| L1-4 | 298.00 | 812.000,68.000 | 1110.000,68.000 |
| L1-5 | 12.00 | 1110.000,68.000 | 1122.000,68.000 |
| L1-return | 2515.79 | 1122.000,68.000 | 378.000,68.000 |
| L2-0 | 62.00 | 378.000,35.000 | 440.000,35.000 |
| L2-1 | 310.00 | 440.000,35.000 | 750.000,35.000 |
| L2-2 | 50.00 | 750.000,35.000 | 800.000,35.000 |
| L2-3 | 12.00 | 800.000,35.000 | 812.000,35.000 |
| L2-4 | 298.00 | 812.000,35.000 | 1110.000,35.000 |
| L2-5 | 12.00 | 1110.000,35.000 | 1122.000,35.000 |
| L2-return | 2723.12 | 1122.000,35.000 | 378.000,35.000 |
| XA0 | 312.17 | 440.000,101.000 | 750.000,68.000 |
| XA1 | 312.17 | 440.000,68.000 | 750.000,101.000 |
| XB1 | 312.17 | 800.000,68.000 | 1110.000,35.000 |
| XB2 | 312.17 | 800.000,35.000 | 1110.000,68.000 |
| lead | 188.06 | 812.000,101.000 | 642.664,175.401 |
| approach | 257.69 | 642.664,175.401 | 410.000,284.000 |
| upper | 404.27 | 642.664,175.401 | 243.000,231.000 |
| middle | 235.06 | 410.000,284.000 | 177.000,292.000 |
| lower | 298.38 | 410.000,284.000 | 122.000,362.000 |
| runMain | 417.71 | 410.000,284.000 | 825.000,247.000 |
| runAround | 422.60 | 410.000,284.000 | 825.000,247.000 |
| right | 425.00 | 825.000,247.000 | 1250.000,247.000 |

## Riproduzione

`node scripts/phase-zero.mjs` rigenera mappa e catalogo e rifiuta una rete diversa dal lock. `python3 tests/capture-baseline.py docs/phase-0/after` acquisisce viste e misure contro un server locale. Le cartelle before/after usano viewport 960×820, DPR1, Leggera, giorno48, treni fermi; misure Chromium/SwiftShader software, non FPS certificati su GPU o iPad.
