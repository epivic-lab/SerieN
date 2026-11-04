# S5 — Guardia ferroviaria nel core

S4 approvata esplicitamente nella richiesta S5: glow B e frecce rosse340ms invariati. S5 non introduce segnaletica, audio o altri effetti. La protezione opera anche senza renderer, HUD e overlay.

## Unica autorità e API

`src/railway-guard.js` espone `assessRailwayGuard(train, journey, route, dt, reservations=[])` e `guardDecision(assessment, delta, velocity, dt)`. La valutazione è di sola lettura: riusa `traceJourney` e il router approvato, senza appendere storia o aggiungere nodi. La sola cache è la topologia canonica immutabile, indicizzata debolmente per rete. Non esiste una seconda tabella delle route.

`stepRailway` conserva la transazione 5C: proposte su copie di Journey, controllo di ammissione, controllo delle collisioni e commit sincrono. Nessuna callback asincrona può cambiare gli scambi fra valutazione e commit. La guardia viene applicata prima di `Journey.move`; le protezioni 5C contro collisioni e occupazione fisica rimangono autoritative e invariate.

`routing.controlState` espone solo la lettura dello stato grezzo. Il corpo di selezione del router, la Journey e il grafo non cambiano. Uno stato mancante non viene autorizzato sfruttando il precedente fallback booleano `false`.

## Classificazione e osservazione

| Campo | Significato |
|---|---|
| risk SAFE | Nessun impedimento nel tratto necessario alla proposta corrente e alla frenata; non è prenotazione né via libera globale |
| risk UNSAFE | Incompatibilità/no-route/terminale, prenotazione altrui incompatibile o conflitto fisico verificato5C |
| risk UNKNOWN | Stato grezzo non booleano, ambiguità/discontinuità/storia non risolvibile, dato cinematico o prenotazione invalido |
| state GUARDED_STOP | Frenata o limite rigido imposti dal core; il treno può essere ancora in decelerazione |
| distance | Distanza ferroviaria residua dal respingente che precede il movimento al limite ammesso, già esclusi ingombro e tolleranza; SAFE senza confine imminente usa Infinity, serializzato null |
| boundary / reason | Percorso/porta o intervallo che motivano il vincolo; mai una nuova connessione al centro WX |
| leadingExtent / direction | Ingombro reale e verso effettivo lungo Journey; in retromarcia guida l’ultimo veicolo |
| stoppingDistance / lookahead | Frenata del modello e orizzonte osservato; trattenuto a treno guarded fermo fino a liberazione o inversione |
| requestedDelta / delta / velocity | Spostamento proposto prima della guardia, spostamento effettivamente ammesso dalla transazione e velocità effettivamente applicata |

Per un conflitto d’ingombro, distance0 rappresenta il rifiuto conservativo dell’intera proposta5C: non è una distanza euclidea né un nuovo punto topologico al centro WX.

`train.guard` è un’osservazione congelata, sostituita a ogni tick; non è un comando del view-model. UNKNOWN prevale su un’ipotesi UNSAFE alla stessa prima frontiera, anche fra due scambi direttamente adiacenti.

## Distanze, frenata e limite rigido

Unità esistenti: millimetri del layout e secondi. Comando0–100, fattore1,5, velocità massima150mm/s, accelerazione45mm/s², frenata100mm/s²: stessi numeri della5C, centralizzati in `MOTION`. Non sono prestazioni fisiche certificate di una locomotiva in scala.

Il core usa `v²/(2×100)` e un intero tick di reazione comprensivo dell’accelerazione semi-implicita: `|v|dt +45dt²`. Ingombri da coupler/consist layout, non da distanze euclidee ai deviatoi. Il limite conserva due tolleranze numeriche da1e−6mm della topologia, senza creare un margine fisico arbitrario.

Per uno scambio incompatibile il punto di arresto riusa l’inizio dell’area operativa protetta già esistente (normalmente30mm prima della porta). Così un normale stop predittivo lascia la manovra correggibile dal dispatcher senza indebolire il lock di occupazione. Se una prova inizia già dentro tale area, il core ammette zero avanzamento verso il pericolo; può essere necessario arretrare prima di manovrare.

La frenata semi-implicita non supera la distanza continua di arresto; quando è già troppo tardi, `min(spostamento_frenato, distanza_ammessa)` impone comunque il limite. Sono rivalidati tutti i giunti attraversabili nel tick, anche se la storia Journey li conteneva prima del cambio scambio. Una previsione non occupata in conflitto viene riconciliata soltanto sulla copia candidata; la storia fisica valida non viene potata a ogni tick.

Il clock esistente divide i frame in passi≤1/60s e limita a0,2s l’elapsed recuperato: la simulazione non recupera integralmente il tempo trascorso in background. Il core rifiuta atomicamente dt fuori contratto; velocità non finite o oltre l’intervallo del motore generano UNKNOWN e zero movimento. La geometria di sweep5C conserva così il suo passo cinematico previsto.

## Occupazione, lock e prenotazioni

Un lock alla **manovra** non vieta il transito lecito: non si ferma il treno perché occupa correttamente il proprio deviatoio. Il dispatcher S1/S2 e `siteSafety` restano invariati. Dopo uno stop per occupazione, un controllo di sola lettura riprova l’ultimo spostamento rifiutato contro gli ingombri correnti (e le intenzioni reciproche ancora osservate). Riusa esattamente i predicati5C, senza inserire questi probe nelle proposte della flotta: non riserva spazio e non può fermare un altro convoglio. Il rischio resta visibile a treno fermo e si libera su rimozione, partenza compatibile o inversione; `probeDelta`/`probeKind` identificano l’ultimo tentativo ricordato. La5C controlla ingombri reali e sweep fra proposte; per i WX anche un conflitto fisico fra diagonali non crea una connessione ferroviaria centrale. I due binari paralleli restano indipendenti.

Il progetto non ha un servizio di prenotazione itinerari. Il solo adattatore interno opzionale `reservations:[{edge,min,max,trainId}]` vieta intervalli canonici di altri proprietari. Non crea prenotazioni, tabelle globali o servizi; lo stesso proprietario è ammesso, dati non validi falliscono UNKNOWN. L’app corrente non produce tali intervalli: la capacità è verificata nei test del core, non dichiarata come integrazione con un servizio inesistente.

## Rilascio e autorità utente

Lo stato viene rivalutato: allineamento lecito, conflitto risolto o inversione effettiva che allontana dal pericolo liberano il movimento compatibile. Fino all’esaurimento della velocità precedente, una richiesta di inversione non equivale a essersi già allontanati.

Come nella5C, un arresto automatico completo azzera il comando attivo `speed`. `requestedSpeed` conserva separatamente l’ultima richiesta come osservazione; non viene ripristinata dal motore. **Serve un nuovo comando di velocità per ripartire.** Questo riarmo conservativo evita ogni ripartenza inattesa. STOP manuale, velocità0 e STOP ALL azzerano anche la richiesta; reset e posizionamento diagnostico eliminano la vecchia guardia. La notifica applicativa avviene all’arresto effettivo e sincronizza i controlli esistenti.

## Prove e gate

[Rapporto S5](evidence/S5/REPORT.md), [osservazioni deterministiche](evidence/S5/tests/scenarios.json), [browser integrato](evidence/S5/browser/browser.json). Risultati finali, limiti hardware e comandi nel rapporto. La master spec resta invariata. S6 richiede un’autorizzazione separata.
