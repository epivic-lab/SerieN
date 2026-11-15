# V06 R0.2 — candidato geometrico offline

[Rapporto R0.2](../../R02_WX_GEOMETRY_VALIDATION_REPORT.md). `track.json` versione `serien-v06-r02-candidate-1`, derivata dalla R0.1 `65ec1675510700fef503c16af2cfbe725817568a`.

**Tutti i 79 record `pieces`, i 74 nodi, porte, controller, stati, gap e terminali sono identici a R0.1.** Cambiano soltanto versione, checkpoint padre, stato e metadati della validazione. Il builder non rigenera le correzioni G1/G2/G3. Il digest del candidato padre è incorporato.

Unità PLAN mm, quota ferro 8,4 mm. `points` segue S→E, da destra a sinistra nei WX; `profile.primitives` segue invece la costruzione da sinistra a destra. Lunghezza operativa campionata distinta dalla lunghezza analitica. Le quattro diagonali sono cinque primitive G1, con salti di curvatura, non clotoidi. I nove pezzi con intervalli nascosti restano nel grafo.

Le stesse regole di [R01](../R01/README.md) valgono per transiti, inversioni, terminali e occupazioni. `physical_profile_certified: false` è preservato: la validazione della ricostruzione CAD e l'eccezione locale al master non certificano il profilo esatto Kato. Le vecchie diciture di fedeltà fisica aperta rimangono corrette in questo senso ristretto; il precedente impedimento alla proposta della forma è superato dal mandato R0.2.

[visual-contract.json](visual-contract.json) è un piano verificabile per la futura variante locale e le parti mobili, non un GLB né codice renderer. Nessun import applicativo. La compatibilità runtime, le sagome complete e le parti mobili non sono certificate.

Rigenerazione: `python3 tools/scenario-v06/consolidate-r02.py`. Verifiche: [evidence/R02/README.md](../../evidence/R02/README.md). Dopo la consegna STOP al Quality Gate Regia; nessuna attivazione o avvio R1 automatico.
