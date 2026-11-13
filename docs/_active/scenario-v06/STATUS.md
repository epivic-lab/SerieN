# Scenario V06 — R0.2

**PASS GEOMETRICO/OFFLINE. CONDITIONAL GO R1 — QUALITY GATE REGIA PENDING.** Nessuna attivazione, certificazione manifatturiera o prova di circolazione runtime.

Branch `codex/scenario-v06-r02-wx-validation`, baseline esatta R01 `65ec1675510700fef503c16af2cfbe725817568a`, collegamento alla [Draft #12](https://github.com/epivic-lab/SerieN/pull/12). [Rapporto R02](R02_WX_GEOMETRY_VALIDATION_REPORT.md), [dataset separato](candidate/R02/README.md), [prove](evidence/R02/README.md).

Scelta confermata: ricostruzione G1 R583,184 mm e centro17,924429 mm. Tutti i 79 record pezzo, nodi, porte, sette controller, stati, tre terminali e G1/G2/G3 identici a R01; A/B/C chiusi. La Regia ammette l'eccezione locale WX dal master, misurata più finemente in 3,334762 mm. Confronto letterale XTrackCAD: residui di arrotondamento del catalogo misurati e fit continuo verificato. TRAX indica centro11,6 mm: confronto numerico limitato e sensibilità esplicitamente ipotetica, record completo non acquisito. Dati nominali Kato confermati; profilo esatto del produttore non certificato.

64 casi WX,90 semplici,128 configurazioni/17.920 arrivi,tre terminali e manovra nel triangolo PASS offline. Nove mutanti rifiutati fra checker originale e controlli analitici nuovi. Baseline/finale 254 Node,9 JMRI e build PASS, bundle invariato.

Metadati GLB verificati, binario non trasferibile oltre32MiB e download raw negato dal proxy; nessuna ispezione triangoli dichiarata. Contratto visuale per successiva variante locale: partizione esclusiva dei WX negli aggregati, unione rotaie comuni, frog e quattro gruppi mobili N/X. Nessuna modifica asset/renderer. Profilo ruote/rotaie e sagome esaminati solo preliminarmente.

Prima di R1: Quality Gate e mandato Regia sul candidato e sul lock. Prima di visuale/circolazione: mapping binario, parti mobili, gauge/contatto, protezioni, anchor/capienze e prove runtime. Provenienza AS-BUILT ancora distinta dal lock candidato.

**STOP R0.2. Unica prossima azione: Quality Gate Regia. R1 non iniziata; nessun merge/deploy.**
