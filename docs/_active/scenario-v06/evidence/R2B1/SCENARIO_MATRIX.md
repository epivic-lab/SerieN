# R2B1 — matrice numerica effettiva

Tutte le righe: due treni, unica sessione/rete/clock, una transazione per tick.
Distanze in mm fra poligoni con ganci. Clearance sweep: distanza fra hull meno
i margini conservativi indipendenti di traslazione/rotazione, non soli campioni.
Tracce dei campioni e hash di **ogni tick** in `traces/<ID>.json.gz`.

| ID | Tick | Giunti | Tick con entrambi in moto | Min corpo | Min clearance sweep | Decisioni collisione | Esito/progresso |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| S1-A1-B1 | 2372 | 32 | 2372 | 15.505111242 | 14.250722281 | 0 | PASS safety; PROGRESS |
| S1-A1-B-1 | 2372 | 32 | 2372 | 17.013000000 | 17.012996000 | 0 | PASS safety; PROGRESS |
| S1-A-1-B1 | 2372 | 32 | 2372 | 16.474160126 | 15.819546959 | 0 | PASS safety; PROGRESS |
| S1-A-1-B-1 | 2372 | 32 | 2372 | 15.535142278 | 14.250722079 | 0 | PASS safety; PROGRESS |
| S1-A1-C1 | 2372 | 38 | 2372 | 74.127087423 | 73.431048721 | 0 | PASS safety; PROGRESS |
| S1-A1-C-1 | 2372 | 41 | 2372 | 50.027000000 | 50.026996000 | 0 | PASS safety; PROGRESS |
| S1-A-1-C1 | 2372 | 38 | 2372 | 48.531676803 | 47.831510766 | 0 | PASS safety; PROGRESS |
| S1-A-1-C-1 | 2372 | 41 | 2372 | 82.419175934 | 82.129342325 | 0 | PASS safety; PROGRESS |
| S1-B1-C1 | 2234 | 36 | 2234 | 38.069955079 | 37.288187163 | 0 | PASS safety; PROGRESS |
| S1-B1-C-1 | 2234 | 36 | 2234 | 17.014000000 | 17.013996000 | 0 | PASS safety; PROGRESS |
| S1-B-1-C1 | 2234 | 36 | 2234 | 17.014000000 | 17.013996000 | 0 | PASS safety; PROGRESS |
| S1-B-1-C-1 | 2234 | 36 | 2234 | 49.405175934 | 49.116450319 | 0 | PASS safety; PROGRESS |
| S1-A-B-cars | 2372 | 32 | 2372 | 17.013000000 | 17.012996000 | 0 | PASS safety; PROGRESS |
| S1-A-C-cars | 2372 | 41 | 2372 | 50.027000000 | 50.026996000 | 0 | PASS safety; PROGRESS |
| S1-B-C-cars | 2234 | 36 | 2234 | 17.014000000 | 17.013996000 | 0 | PASS safety; PROGRESS |
| S2-1-false-brake | 840 | 1 | 197 | 1.250000000 | 1.249998000 | 484 | PASS safety; PROGRESS + protected restart |
| S2-1-false-STOP | 840 | 1 | 180 | 1.500000000 | 1.499998000 | 482 | PASS safety; PROGRESS + protected restart |
| S2-1-false-stationary | 840 | 1 | 120 | 1.112500000 | 1.112498000 | 501 | PASS safety; PROGRESS + protected restart |
| S2-1-true-brake | 840 | 1 | 197 | 0.625000000 | 0.624998000 | 512 | PASS safety; PROGRESS + protected restart |
| S2-1-true-STOP | 840 | 1 | 180 | 0.050000000 | 0.049998000 | 519 | PASS safety; PROGRESS + protected restart |
| S2-1-true-stationary | 840 | 1 | 120 | 0.462500000 | 0.462498000 | 533 | PASS safety; PROGRESS + protected restart |
| S2--1-false-brake | 840 | 1 | 197 | 1.250000000 | 1.249998000 | 484 | PASS safety; PROGRESS + protected restart |
| S2--1-false-STOP | 840 | 1 | 180 | 1.500000000 | 1.499998000 | 482 | PASS safety; PROGRESS + protected restart |
| S2--1-false-stationary | 840 | 1 | 120 | 1.112500000 | 1.112498000 | 501 | PASS safety; PROGRESS + protected restart |
| S2--1-true-brake | 840 | 1 | 197 | 0.625000000 | 0.624998000 | 512 | PASS safety; PROGRESS + protected restart |
| S2--1-true-STOP | 840 | 1 | 180 | 0.050000000 | 0.049998000 | 519 | PASS safety; PROGRESS + protected restart |
| S2--1-true-stationary | 840 | 1 | 120 | 0.462500000 | 0.462498000 | 533 | PASS safety; PROGRESS + protected restart |
| S3-frontal | 480 | 0 | 81 | 0.975000000 | 0.974996000 | 798 | PASS safety; DEADLOCK: opposed requests retained, no dispatcher or reversal |
| S3-diverging | 480 | 11 | 480 | 84.025000000 | 83.999996000 | 0 | PASS safety; diverging control |
| S4-WX-A-false-1_1 | 870 | 10 | 870 | 15.973336954 | 15.186515469 | 0 | PASS safety; PROGRESS |
| S4-WX-A-false--1_-1 | 570 | 7 | 570 | 15.968229905 | 15.189479796 | 0 | PASS safety; PROGRESS |
| S4-WX-A-false-1_-1 | 870 | 9 | 870 | 17.014000000 | 17.013996000 | 0 | PASS safety; PROGRESS |
| S4-WX-A-false--1_1 | 870 | 10 | 870 | 17.014000000 | 17.013996000 | 0 | PASS safety; PROGRESS |
| S4-WX-A-true-1_1 | 658 | 6 | 537 | 0.018031999 | 0.013013997 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-A-true--1_-1 | 358 | 4 | 237 | 0.018031999 | 0.013013997 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-A-true-1_-1 | 693 | 6 | 572 | 0.345117014 | 0.340099011 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-A-true--1_1 | 693 | 6 | 572 | 0.345117014 | 0.340099011 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-B-false-1_1 | 570 | 6 | 570 | 15.969316427 | 15.186806373 | 0 | PASS safety; PROGRESS |
| S4-WX-B-false--1_-1 | 870 | 9 | 870 | 15.885617019 | 15.185222998 | 0 | PASS safety; PROGRESS |
| S4-WX-B-false-1_-1 | 870 | 8 | 870 | 17.013000000 | 17.012996000 | 0 | PASS safety; PROGRESS |
| S4-WX-B-false--1_1 | 570 | 6 | 570 | 17.013000000 | 17.012996000 | 0 | PASS safety; PROGRESS |
| S4-WX-B-true-1_1 | 358 | 2 | 237 | 0.017742613 | 0.012724691 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-B-true--1_-1 | 658 | 7 | 537 | 0.017742613 | 0.012724691 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-B-true-1_-1 | 693 | 5 | 572 | 0.345061465 | 0.340043544 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-B-true--1_1 | 393 | 3 | 272 | 0.345061465 | 0.340043544 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-A-X-cars | 358 | 4 | 237 | 0.018031999 | 0.013013997 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-WX-B-X-cars | 718 | 9 | 597 | 0.017742613 | 0.012724691 | 242 | PASS safety; DEADLOCK: incompatible envelopes, no dispatch policy |
| S4-adjacent-F1 | 999 | 12 | 988 | 51.027000000 | 51.026996000 | 0 | PASS safety; PROGRESS |
| S5-UNKNOWN-core | 180 | 0 | 42 | 15.955607237 | 15.929494993 | 0 | PASS safety; UNKNOWN: safe stop, progress withheld |
| S5-reserved-1 | 400 | 2 | 192 | 84.000000000 | 83.112496000 | 0 | PASS safety; PROGRESS + protected restart |
| S5-reserved--1 | 400 | 5 | 169 | 84.000000000 | 83.312496000 | 0 | PASS safety; PROGRESS + protected restart |
| S5-fresh-false-false | 357 | 1 | 206 | 1.112500000 | 0.612496000 | 73 | PASS safety; PROGRESS + protected restart |
| S5-fresh-false-true | 327 | 1 | 206 | 1.112500000 | 0.612496000 | 13 | PASS safety; PROGRESS + protected restart |
| S5-fresh-true-false | 357 | 1 | 206 | 1.112500000 | 0.612496000 | 73 | PASS safety; PROGRESS + protected restart |
| S5-fresh-true-true | 327 | 1 | 206 | 1.112500000 | 0.612496000 | 13 | PASS safety; PROGRESS + protected restart |

Totale: **55 scenari / 60,917 tick**. `collisionStops` conta osservazioni di guard dei due treni, inclusi hazard mantenuti a riposo: non il numero di collisioni né di distinti interventi.

I 15 casi S1 comprendono 12 abbinamenti di verso e tre casi con loco+carro per entrambi.
Le 18 prove WX sono 16 combinazioni unità/stato/versi e due composizioni; la diciannovesima S4 verifica F1 con un secondo treno in moto.
Tutti i treni S1 superano un giro; lunghezze indipendenti A 3468,164116346 mm, B 3260,781635120 mm, C 2933,790700412 mm.

Le 10 righe WX X in deadlock e il frontale S3 sono PASS di safety, **non PASS di risoluzione del conflitto**. Nessun dispatcher o vincitore imposto.
Starvation/equità senza limite di osservazione: **NOT VERIFIED**.
