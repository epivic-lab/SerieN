# Distinta Kato — confronto della fase 0

Fonte originale: [kato-parts.csv](kato-parts.csv), file con tabulazioni e senza intestazione. [Dati normalizzati](kato-parts.json). 17 codici distinti, 61 elementi; i prezzi a zero non sono una stima economica.

| Verifica | Distinta | Simulatore | Esito |
|---|---|---|---|
| Curve principali | 8×20-100 R249/45°, 8×20-110 R282/45°, 8×20-120 R315/45° | Tre anelli con gli stessi raggi nominali | Raggi e sviluppo angolare coerenti; montaggio non certificato |
| Crossover | 2×20-210, lunghezza310mm, interasse33mm | WX-A e WX-B, stessi ingombri nominali | Quantità coerente; rami ricostruiti con Bézier |
| Deviatoi singoli | #6: 1sinistro+2destri; #4: 2sinistri+1destro | Sei comandi merci Y-* | Quantità coerente; manca l'associazione pezzo→posizione/orientamento |
| Curve di compensazione | 3×20-160 R481/15° | Scalo ricostruito con Bézier | Geometria analitica da ricostruire con export quotato |
| Allargamento | 1×20-051 +1×20-052, 310mm | Deviazione inferiore dell'anello interno | Funzione presente; corrispondenza geometrica da verificare |
| Respingenti | 3×20-046, calcestruzzo, 62mm | Quattro estremità terminali; due respingenti visibili e due sospesi per interferenza | Da chiarire l'assegnazione dei tre respingenti ai quattro terminali; nessuna rimozione o prolunga automatica |

## Inventario originale

| Codice | Descrizione | Quantità |
|---|---|---:|
| 20-000 | Standard Straight, L=248mm | 9 |
| 20-010 | 3/4 Straight, L=186mm | 1 |
| 20-020 | Half Straight, L=124mm | 4 |
| 20-040 | 1/4 Straight, L=62mm | 4 |
| 20-041 | 1/4 Straight Feeder Track, L=62mm | 3 |
| 20-046 | Bumper (Concrete), L=62mm | 3 |
| 20-051 | CT Double Track Widening Section Left, 310mm | 1 |
| 20-052 | CT Double Track Widening Section Right, 310mm | 1 |
| 20-100 | Curve R=249mm, 45° | 8 |
| 20-110 | Curve R=282mm, 45° | 8 |
| 20-120 | Curve R=315mm, 45° | 8 |
| 20-160 | Curve R=481mm, 15° (for #4 turnouts) | 3 |
| 20-202 | Electric #6 Turnout left, R=718mm, 15°, L=186mm | 1 |
| 20-203 | Electric #6 Turnout right, R=718mm, 15°, L=186mm | 2 |
| 20-210 | Electric Double Crossover, L=310mm (33mm Distance) | 2 |
| 20-220 | Electric #4 Turnout left 15°, R=481mm, L=127mm | 2 |
| 20-221 | Electric #4 Turnout right 15°, R=481mm, L=127mm | 1 |

La distinta rende verificabili i pezzi disponibili, ma non certifica da sola la ricostruzione 1:1. Servono pianta quotata o export RailModeller con coordinate, ordine e orientamento dei segmenti, soprattutto per scalo e runaround. La rete corrente resta congelata.
