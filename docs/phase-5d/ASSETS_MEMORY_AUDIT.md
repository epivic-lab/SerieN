# 5D.5 — Asset, caricamento e risorse

## Interventi e decisioni

Nessuna nuova dipendenza, compressione, texture o modello. Bundle minificato baseline 984.495 byte, candidato CPU 985.240: +745 byte (+0,076%). Finale con cleanup Bloom: 985.297 byte, +802 (+0,081%) rispetto alla baseline. La dimensione è il file esbuild locale, non traffico compresso su rete pubblica. Asset locali, URL relativi e pipeline Pages invariati.

Il gestore `train-assets` già conserva una Promise per nome asset, con template condivisi e gestione dei target attivi. I clone condividono geometrie/materiali; release rimuove il registro del target e l’importato; dispose idempotente rilascia i template anche se arrivano dopo la cancellazione. Non è stato aggiunto un secondo livello di cache. I binding delle ruote usano WeakMap, senza mantenere vive le radici rimosse; le preparazioni degli inviluppi vivono soltanto nel passo ferroviario.

Test realmente passati: venti sostituzioni con risorse condivise e registry rilasciato; release durante caricamento asincrono; dispose globale con template tardivi liberati una sola volta; fallback e retry dopo caricamento fallito; miniature coerenti col modello effettivo. Browser `consist` con GLB reali passato attraverso cambio modello, reset, ripristino e manovre.

Il benchmark preriscalda i sei GLB prima delle acquisizioni, poi ripristina il nativo: i confronti principali hanno cache calda e non confondono un primo caricamento con il costo continuativo dei frame. Tempi e dimensioni Resource Timing, avvio e ambiente sono nei JSON. `firstReadyWallSeconds` comprende l’avvio UI osservato dal runner e può comprendere rendering/compilazione; un campione per processo non dimostra una regressione o un miglioramento della rete. Non è un benchmark su connessioni mobili o CDN.

La generazione PMREM e le inizializzazioni shader possono contribuire all’avvio software. Una PMREM precalcolata richiederebbe un nuovo asset e una verifica di equivalenza tra backend: non introdotta senza misure specifiche di beneficio e senza sacrificare l’aspetto. Il costo statico del rendering domina i frame misurati; non sono giustificati decoder, nuovi preload o lazy loading che rischino scatti durante le manovre.

Gli asset aggiunti sul remoto `origin/main` in `asset-library` non sono referenziati dalla build attuale e il workflow Pages copia `assets`, non `asset-library`. Non sono stati integrati, convertiti o cancellati da questa fase. Le storie locali e remote restano preservate.

## Verifica F

Sessioni reali di almeno 120 s, tre ripetizioni per revisione; sei cicli reset/qualità per ripetizione (Low/High/Cinema due volte, giorno/notte alternati). Un browser alla volta. GC esplicita prima di leggere l’heap CDP. Non cambiare il clock della simulazione per simulare una durata maggiore.

Registrare nel rapporto conclusivo le durate effettive, campioni heap, geometrie e texture residenti, confronto delle stesse qualità tra cicli, eventuali crescite e rallentamenti. I contatori `renderer.info.memory` non sono byte GPU, l’heap JavaScript non include tutta la memoria del browser e il timer GPU non è disponibile. Non dichiarare assenza universale di leak in base a poche sessioni.

**Questo documento registra audit e protocollo; l’esito delle acquisizioni F va letto nel rapporto finale e nei dati, non inferito dalla presenza del codice di dispose.**

## Esito conclusivo

Sei sessioni F e 36 cicli acquisiti. Ritenzione Bloom preesistente confermata nella cache reale e corretta (`BLOOM_LIFECYCLE_FIX.md`); tre cicli aggiuntivi e 138,9 s sul codice corretto passati. Otto coppie di immagini finali identiche e Pages reale sotto prefisso verificato. Dati e limiti, incluso il diverso perimetro dell’heap delle sonde, nel rapporto conclusivo.
