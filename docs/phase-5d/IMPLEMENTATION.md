# Scelte 5D e vincoli di equivalenza

Baseline `303525c`. Nessun nuovo pacchetto, worker, clock, semplificazione geometrica o cambio ai profili grafici.

## Rendering e animazioni

`renderVehicles` calcolava due volte la posa del corpo e visitava per intero ogni gerarchia ad ogni frame. Ora calcola una posa per veicolo e la passa ad `animateStock`; conserva i calcoli separati necessari ai carrelli. Il modulo `rolling-stock-animation` riusa asse/quaternione costanti e riferimenti alle ruote. La cache è un WeakMap: non rende viva una radice rimossa. Il caricatore monta/smonta sottogerarchie complete alla radice; variazioni dei figli, inclusa sostituzione a pari cardinalità, invalidano i binding. Il raggio importato viene ancora letto ad ogni animazione. Nessuna soppressione di animazioni per veicoli fuori camera.

Il costruttore dei modelli nativi, biellismi e formule cinematiche rimangono invariati. La manifest delle miniature aggiorna solo il digest della sorgente inclusa nella provenienza; le immagini non sono rigenerate.

## Simulazione

Una composizione lunga partecipava a molti confronti fra coppie: lo stesso inviluppo spazzato veniva ricostruito ripetutamente. Preparazione pigra una volta per veicolo e proposta del singolo passo; invalidazione obbligatoria quando la proposta viene arrestata e verifiche iterative dei convogli seguenti. Inviluppi dei parcheggiati riusati solo nello stesso passo. Nessuna cache tra passi.

Il filtro AABB è esclusivamente un rifiuto conservativo prima del SAT originale. I limiti comprendono l'espansione dei piani di supporto, inclusi i miter dei vertici acuti: il solo padding assiale non sarebbe sufficiente. Valori degeneri non consentono il rifiuto veloce. La soglia SAT, la verifica endpoint precedente, il rollback atomico e tutte le decisioni ferroviarie della 5C restano autorevoli. Nessuna distanza ferroviaria viene sostituita con una distanza euclidea.

Oracle congelati della 5C in `tests/fixtures`, oltre alla suite esistente: confronto di pose casuali riproducibili, tolleranze ai vertici, contatti e traiettorie complete su rete canonica; includono quattro composizioni da cinque vagoni.

## Interfaccia

Consolle già aggiornate selettivamente; nessun throttling aggiunto. L'assistenza calcolava polilinee campionate che né HUD né highlight usano: questi consumano intervalli canonici, incontri, distanze e stato di sicurezza. Il chiamante interno richiede una proiezione senza i punti superflui. API completa mantiene default e risultato precedenti. Niente cache persistente che possa diventare obsoleta dopo STOP, inversioni, sgancio o scambio. I test confrontano la traccia completa con l'oracle 5C e la proiezione con tutti i campi utili e i punti effettivi dell'highlight.

## Scena, asset e memoria

Audit: vegetazione e pietre già instanziate; batching statico per materiale/ombre in `scenery`, esclusi i gruppi dinamici; ombre, trasparenze e postprocessing Cinema sono costi reali conservati. Il renderer e la camera rimangono unici. La geometria statica non viene ricostruita per frame. Nessun LOD, atlante, nuovo instancing o congelamento generalizzato delle matrici senza un confronto visivo e un beneficio dimostrati.

Il gestore GLB già deduplica le richieste con una cache di Promise per nome, riusa geometrie/materiali dei template e gestisce release, caricamenti tardivi, errori e dispose idempotente. Bundle Three.js unico e asset locali con URL relativi compatibili con Pages. Il collo di bottiglia osservato sui frame è soprattutto la scena renderizzata in software, non la trasmissione di pochi GLB locali. Non aggiungere compressori/decoder, nuove texture, preload o una seconda cache in assenza di prove. Una PMREM precalcolata richiederebbe un nuovo asset e verifica di equivalenza tra backend; non implementata senza misure che giustifichino l'intervento.

Il controllo F deve distinguere heap JavaScript dopo GC, contatori residenti WebGL e byte GPU non disponibili. Un plateau nei reset/qualità verificati non certifica ogni durata o browser. Nuove cache legate al passo non sopravvivono al passo; cache dei binding non mantiene ownership forte delle radici.
