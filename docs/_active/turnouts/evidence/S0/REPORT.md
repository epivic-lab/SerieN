# S0 — Baseline Interactive Turnouts

30 ottobre 2026. **PASS — sola baseline; S1 NON INIZIATA e in attesa di autorizzazione.**

## Provenienza e chiusura 5D

Repository `epivic-lab/SerieN`. Stato iniziale pulito: branch `work`, HEAD `f582b1226ccf8a592970b0304d0010e1cc43aa57`, riferimento locale origin/main obsoleto a `618f538`. Il primo fetch nella sandbox non raggiungeva il proxy; con accesso di rete dell'esecutore il fetch è riuscito. Nessun bypass del proxy. Verificata l'ascendenza del checkout, creato il branch locale `main` che segue origin/main a **`6487f61612818c8cd46d882741cfa1ca96ac5a16`**. Nessun lavoro precedente sovrascritto.

Il codice finale 5D `e8d81d3` e la pubblicazione `58bbe62` sono antenati di questa baseline. PR #1 verificata come merged il 30 ottobre 2026 alle 12:34:48 Europe/Rome: merge `6487f61`. Il diff `58bbe62..6487f61` comprende esclusivamente i sette file di handoff. Runtime, asset, dipendenze e workflow coincidono con la pubblicazione 5D.

Letti integralmente AGENTS.md, PROGRESS.md, STATUS.md, SPEC_v3.md; consultati rapporto 5D, RESUME, PUBLICATION, FINAL_GATES, COMPARISON e nota Bloom. PDF allegato consultato, comprese le illustrazioni di glow/frecce: riferimenti concettuali, non sorgenti geometriche e non autorizzazione alle fasi successive.

Il PDF è copiato byte per byte in `../../SPEC_v3.pdf`: 27 pagine A4, SHA-256 `2face5b2eb8b02419b4da92efbfdb5d25ad0adf1dafac95721d6e46e65a9b89d` corrispondente alla specifica. Il PDF e la specifica restano temporanei sino alla chiusura approvata S7.

Commit documentale S0: il commit che introduce questo rapporto, recuperabile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S0/REPORT.md`. Lo SHA effettivo viene fornito nella consegna; nessuna autoreferenza impossibile nel contenuto del commit. Nessun push o deployment eseguito in S0.

## Verifiche eseguite

| Verifica | Esito / prova |
|---|---|
| `npm test` con capacità di rete dell'esecutore | PASS: 131 test, zero falliti/saltati; [log](node-tests.txt) |
| `python3 -m unittest discover -s tests -p '*_test.py'` | PASS: 9 test JMRI; [log](python-tests.txt) |
| `npm run build` | PASS; [log](build.txt), bundle byte-identico alla 5D |
| `python3 scripts/build-canonical-layout.py` e diff Git | PASS: nessuna differenza in JSON canonico/grafo/SVG |
| `tests/browser-phase-five-close.py` sulla build di produzione | PASS: 11 scenari; [risultato](browser-5c-close/acceptance.json), [log](browser-close.txt) |
| `tests/browser-phase-zero.py` sulla build di produzione | PASS: circuiti, manovre, UI/HUD e quattro viewport; [log](browser-zero.txt), [risultato](browser-production/browser-result.json) |
| Manifest geometrico prima del batching | PASS: 150 rail mesh e 75 letti; [inventario](geometry.json) |
| Integrità runtime/UI rispetto alla 5D pubblicata | PASS: diff vuoto per app.js, src, index.html, style.css, assets, manifesti, workflow; [hash sorgenti](source-hashes.json) |
| Verifica pubblicazione in sola lettura | PASS: bundle live `/SerieN/dist/game.js` identico al locale e alla 5D; [baseline](baseline.json) |
| Sicurezza minima | PASS nel perimetro documentale: [controllo limitato](security.json); nessuna modifica a backend, permessi, dipendenze o chiamate di rete applicative |

Nota d'ambiente: due avvii Node nella sandbox priva di capacità di rete riportavano soltanto 30 file test, senza conteggio dei sottotest; non sono usati come prova dei 131 casi. L'esecuzione completa con capacità dell'esecutore è quella conservata in `node-tests.txt`. Il server/browser locale richiede la stessa capacità per socket e processi Chromium. Non serviva `npm ci`: le dipendenze presenti producono lo stesso hash della build 5D.

Gli undici scenari 5C verificano frontali, composizioni lunghe, sganciato sul giunto, inserimento occupato, blocco dello scambio in avvicinamento, aggancio in curva, frame irregolari, anelli in versi misti, crescita modelli, storia dello sganciato e riaggancio sul giunto. Nessun errore JavaScript o richiesta fallita. La matrice Node esistente degli scambi copre **40 ingressi leciti con attraversamento e ritorno e 12 ingressi bloccati**, su tutti gli otto controlli nei due stati, con oracle esplicito.

## Integrità ferroviaria

Hash `src/canonical-layout.json`: **`e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`**. Sorgente JMRI: `30790d01c370217acc70906cf8887df9038faa5bca149383634cbaeaba590d9e`. Grafo: 70 nodi, 75 archi, una componente, cycle rank 6, quattro terminali. Tre anelli R249/R282/R315 e due WX310 conservati.

`geometry.json` registra ogni rotaia con identità stabile `edge:side`, trasformazione, matrice, bounding box, numero vertici/indici, hash degli attributi/indici e terminali dell'arco; stesso inventario per i 75 letti ferroviari. L'osservatore legge le mesh originali immediatamente prima di `enrich`: il batching statico preesistente le aggrega e rimuove gli oggetti originali. **150 è il numero delle rotaie canoniche prima del batching, non il numero di mesh/draw call della scena finale.** Gli hash non usano UUID casuali. Gli estremi sono quelli dell'arco centrale canonico, non un'approssimazione di nuove connessioni.

Nessuna modifica a geometrie, posizioni, ballast, materiali runtime, scenografia, plancia, HUD, minimappe, locomotive o fisica. L'hash del bundle locale e pubblico coincide con la 5D: **`147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`**.

## Otto controlli e implementazione corrente

| ID | Dispositivo / archi interni | Indice UI corrente |
|---|---|---:|
| Y-IN | TO0:AB / TO0:AC | 2 |
| Y-R1 | TO1:AB / TO1:AC | 5 |
| Y-R2 | TO2:AB / TO2:AC | 6 |
| Y-3 | TO3:AB / TO3:AC | 4 |
| Y-4 | TO4:AB / TO4:AC | 7 |
| Y-2 | TO5:AB / TO5:AC | 3 |
| WX-A | upper / lower / down / up | 0 |
| WX-B | upper / lower / down / up | 1 |

- `src/network.js` legge il JSON canonico. `src/simulation.js:routing` filtra requiredState e impedisce connessioni interne fittizie: WX straight UL↔UR e LL↔LR; crossover UL↔LR e LL↔UR. Il centro X non è un nodo. Nei semplici A↔B oppure A↔C; il ramo inattivo è bloccato dal contratto corrente.
- `app.js:makeSwitch` crea base 12×2×12, sfera r6 e stelo; `controlMarkers` colloca i marker fuori dal corridoio ferroviario. Otto gruppi separati dalle luci sceniche. `src/switch-feedback.js` alterna arancione al passaggio sulla plancia (350 ms acceso / 350 ms spento); materiali verde/oro per la posizione. Non è ancora glow blu conformale.
- Plancia e picking richiamano `app.js:toggle(index)`: guardia `getSwitchAssistance().safetyByControl`, riconciliazione Journey e aggiornamento UI. I pulsanti occupati/protetti sono disabilitati. Il dispatcher usa attualmente un indice interno, non un contratto pubblico validato per controlId.
- Il picking 3D usa `switchHandles` e gruppi locomotive, con soglia di trascinamento 7 px. Non interroga la geometria del deviatoio né tutta la scenografia; non esiste hover bidirezionale sul dispositivo reale. Gestione pointercancel/capture e occlusioni complete da progettare nelle fasi autorizzate, senza correzioni anticipate.
- `src/next-switch.js` costruisce siti dai controller, include archi interni e 30 mm di protezione sulle adiacenze; `traceJourney` legge storia, verso e router senza mutare Journey. `src/railway-state.js` deriva occupazione e assistenza. Conservare `tracePoints:false` introdotto dalla 5D.
- `src/next-switch-view.js` aggiorna HUD/schema e avvisi; preview del percorso temporanea separata dalle future frecce. Sicurezza fisica in Journey/coordinatore/conflitti, non nel renderer. Nessun nuovo cartello, audio, overlay o arresto predittivo implementato in S0.

## Riferimenti visivi e prestazioni

Otto immagini Low a 960×820, DPR 1, seed 516, treni fermi, vento fissato tramite osservatore temporaneo: [overview giorno](overview-48.png), [overview notte](overview-95.png), [semplice giorno](Y-IN-48.png), [semplice notte](Y-IN-95.png), [WX-A giorno](WX-A-48.png), [WX-A notte](WX-A-95.png), [WX-B giorno](WX-B-48.png), [WX-B notte](WX-B-95.png). Camera e target effettivi sono in [capture.json](capture.json). Immagini ispezionate; sono baseline, non proposte estetiche S3/S4. Giorno 48, notte 95. Le immagini responsive della suite di produzione documentano un diverso stato operativo e non vanno usate come coppie pixel a questa camera.

L'osservatore deriva da `scripts/performance/build-profile.mjs`; il bundle diagnostico rimane in `/workspace/work/s0`, mai in dist o nel commit. [build-observer.mjs](build-observer.mjs) e [capture-baseline.py](capture-baseline.py) documentano la ricetta. Da root: `node docs/_active/turnouts/evidence/S0/build-observer.mjs . /workspace/work/s0/profile.js`, servire la build sulla porta 8000 e usare `S0_PROFILE`, `S0_OUTPUT`, `SERIEN_URL` per catturare in una directory separata. Il JSON conservato elimina i ripetuti dettagli dei rotabili dalle snapshot; mantiene camera/render/stato controlli/HUD.

**Metriche storiche 5D**, non rieseguite integralmente in S0: carico CPU D passo 4,5640→0,3663 ms (−92,0%), pose −55,9%, assistenza −61,9%. 39+39 acquisizioni/1.488 frame, nessun superamento budget; 6 sessioni F/36 cicli; 108.000 passi per revisione. Bloom finale 0/0/0 riferimenti trattenuti. Provenienza principale `5ae8ee9`, cleanup finale `e8d81d3`. Riferimenti: `docs/PERFORMANCE_AUDIT_5D.md`, `docs/phase-5d/COMPARISON.md`, `FINAL_GATES.json`, `BLOOM_LIFECYCLE_FIX.md`.

Scenario storico A Low/day48/overview (650×760): p50 finale 1883,25 ms e p95 3149,90 ms su SwiftShader. **Campione S0 distinto**, 12 intervalli RAF reali, Low/day48/overview, 960×820, simulazione in pausa, bundle osservatore: p50 **2124,95 ms**, p95 nearest-rank **2499,90 ms**; campioni grezzi in capture.json. Overview: **367 draw call, 468.812 triangoli, 364 geometrie, 45 texture** nella fixture. Le differenze di viewport, fixture, strumentazione e numerosità impediscono di usare questo campione come confronto di regressione 5D. Il runtime byte-identico preserva le ottimizzazioni; S3/S4 dovranno fare confronti equivalenti. Nessuna certificazione di FPS hardware, byte GPU o assenza universale di leak.

## Criticità, limiti e S1 prevista

- Nessun blocco tecnico emerso per S1. La baseline è riproducibile e il codice è invariato rispetto alla 5D pubblicata.
- Validazione touch su dispositivo reale, GPU fisiche e sessioni browser di molte ore: **NOT VERIFIED**. Il responsive emulato non le sostituisce.
- Indicizzazione del dispatcher, assenza di picking conformale/hover 3D e occlusione scenica sono dipendenze note, non funzionalità già completate. Nessun effetto visivo può diventare autorità di instradamento o sicurezza.
- Audit minimo circoscritto; 5E non iniziata. Nessuna operazione Supabase/API/RLS/backend. Il PDF non autorizza la macrofase completa.
- S1 proposta: contratto puro unico dal router per semplici e WX310, entrambi gli stati, porte/versi/unknown; dispatcher comune validato per controlId con guardie esistenti. Test della matrice e delle non-mutazioni, build e nuovo commit. **Nessuna animazione o modifica del grafo.** Attendere approvazione esplicita S1.
