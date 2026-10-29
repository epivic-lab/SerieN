# Performance audit 5D — rapporto provvisorio

**Stato: sospesa su richiesta dell’utente; non completata, non pubblicata.**

Baseline 5C `303525c`, branch `performance/phase-5d`. Architettura, interventi candidati e vincoli in [IMPLEMENTATION](phase-5d/IMPLEMENTATION.md); richiesta e protocollo in `phase-5d`; ripresa in [RESUME](phase-5d/RESUME.md).

Profiling reale Chromium/SwiftShader, 650×760, DPR 1. Nessuna GPU fisica né timer GPU disponibile. La scena statica pesa circa 1,88 s/frame in software; conservati qualità e dettagli. Contatori del frame completo baseline: Low 385 draw call/470.692 triangoli, High 680/1.105.086, Cinema 1.367/1.981.385. Non sono misure di memoria GPU o FPS desktop.

Confronto CPU isolato, mediana di tre batch, scenario D strumentato con quattro composizioni da cinque vagoni:

| Componente | 5C ms/chiamata | Candidato ms/chiamata | Riduzione |
|---|---:|---:|---:|
| Simulazione | 4,5640 | 0,3663 | 92,0% |
| Rotabili | 0,2290 | 0,1010 | 55,9% |
| Assistenza scambi | 0,3500 | 0,1333 | 61,9% |

Risultati promettenti, ancora **non accettati**: non equivalgono ad aumento della fluidità del frame completo. Tabelle A–D e campioni grezzi in [COMPARISON_PARTIAL](phase-5d/COMPARISON_PARTIAL.md). Il costo della consolle non è stato ottimizzato e le sue oscillazioni di microbenchmark non vanno attribuite alle modifiche.

Ridotti ricalcoli delle pose, visite delle gerarchie e allocazioni delle ruote; preparazione degli inviluppi riusata entro il singolo passo; escluse solo polilinee inutilizzate dal consumatore interno HUD. Mantiene SAT e rollback della 5C, grafo, distanze ferroviarie, clock, modelli, comandi e rendering. Asset manager già dotato di cache e dispose: nessuna nuova dipendenza, compressione o cache di asset aggiunta senza beneficio dimostrato.

Test iniziali e prove mirate nei log versionati; regressioni finali, confronto visivo esatto e matrice frame/memoria restano aperti. Nessuna conclusione sull’assenza di perdite di memoria prolungate, nessun via libera alla 5E. Prima dell’accettazione completare gli elementi in `RESUME.md`; questo rapporto andrà aggiornato con gli esiti reali.
