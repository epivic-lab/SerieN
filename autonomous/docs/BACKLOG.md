# Backlog per fasi — Serie N Autonomous
Nessuna di queste attività è stata avviata; è una roadmap, non una dichiarazione di lavoro implementato.

## P0 — Fondazioni documentali (attuale)
- [x] Definire charter, requisiti, galleria a tre anelli, sicurezza, scambi, fluidità.
- [x] Creare spazio documentale persistente.
- [ ] Creare **repository GitHub separato** `SerieN-Autonomous` (non supportato dal connector corrente); migrare poi i Markdown.
- [ ] Confermare limiti operativi e metodologia di test.

## P1 — Audit in lettura, nessun codice
- [ ] Topologia V3 effettiva, identificatori e zone scambi / WX310.
- [ ] Mappare state API: treni, lunghezze, velocità, accelerazione, stop, turnout e feedback.
- [ ] Identificare punti in cui nascondere ground truth in galleria.
- [ ] Valutare dati riproducibili e regressioni esistenti; inventario test.
- [ ] Proporre schema versionato sensori/comandi e modello risorse.

## P2 — Kernel deterministico e sicurezza (simulatore)
- [ ] Tracciamento OCCUPIED/RESERVED e conflitti; 3 blocchi galleria distinti.
- [ ] Estimator OBSERVED/ESTIMATED/LOST e replay con ground truth segreta.
- [ ] Interlocking con zona critica, coda, ritardo di attuazione, conferma posizione.
- [ ] Safety supervisor, GLOBAL_STOP e restart guidato.
- [ ] Test automatici di mancate riemersioni, ritardi, scambi, convergenza e stop.

## P3 — Fluidità e traffico automatico
- [ ] Dispatcher con predizione di conflitti e itinerari; rampe velocità.
- [ ] Equidistanza 3 convogli su A nei limiti cinematici.
- [ ] Regole precedenza configurabili; spiegazioni decisioni.
- [ ] Demo con seed, scenari e metriche (stop, frenature, throughput).

## P4 — Chat
- [ ] Parser di comandi critici in locale senza LLM.
- [ ] Adattatore Ollama con modello leggero, JSON validato e fallback.
- [ ] UI chat, interpretazione richieste, motivazioni e audit log.
- [ ] Test senza Ollama e disconnessioni.

## P5 — Preparazione plastico reale (se e quando richiesta)
- [ ] Protocollo unico con OpenCV observer e adattatore Z21/Swift.
- [ ] Local runner persistente e indipendente dal browser.
- [ ] Verifica fisica turnouts, sgombero coda, sensori galleria e fail-safe.
- [ ] Prove con una locomotiva poi scenari progressivi; nessuna autonomia non supervisionata prima dei gate hardware.

**Priorità:** prima safety, poi fluidità, poi AI. Nessuna data o costo stimati senza audit.
