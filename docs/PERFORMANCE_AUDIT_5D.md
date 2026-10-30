# SerieN — Performance Audit 5D

30 ottobre 2026. **Fase 5D completata; 5E non iniziata. Nessun merge o deployment.** Codice finale: `e8d81d3`, branch `performance/phase-5d`. Baseline 5C `303525c`; checkpoint ripreso `5ae8ee9`. I dati distinguono il confronto principale e la correzione finale di proprietà delle risorse: non sono tutti attribuiti alla stessa revisione.

## Architettura e costi individuati

Un renderer Three.js/WebGL e un solo ciclo RAF coordinano FixedClock a 60 Hz, Journey e grafo canonico, protezione degli inviluppi, pose/animazioni dei rotabili, consolle/minimappe/HUD e scenografia. Il limite preesistente di 0,2 s/frame resta invariato. Static batching per materiale/ombre, vegetazione instanziata e cache GLB erano già presenti.

Il renderer-only della scena con radici dei rotabili rimosse richiede circa 1,88 s/frame sul backend software, vicino ai 2,02 s dell’idle applicativo. È il principale costo residuo osservato; non è una misura del solo tempo GPU. Le misure isolate hanno individuato lavoro ridondante concreto: inviluppi ricostruiti per ogni coppia, visite complete delle gerarchie, pose duplicate e polilinee prodotte ma inutilizzate dal consumatore HUD.

## Ambiente e metodo

Chromium 154.0.8037.57, Linux 6.18.55 x86-64, Node 24.19.0, Three 0.163.0, esbuild 0.25.12. SwiftShader/ANGLE Vulkan, viewport 650×760, DPR 1. Ambiente cloud condiviso; nessuna GPU fisica o estensione timer GPU disponibile. Nessuna stima di watt, byte VRAM o FPS desktop.

CPU: renderer fermato/coda GL drenata, 10 chiamate di warmup, tre batch con stato ripristinato; mediana dei costi per chiamata. Frame: bundle di produzione, clock e RAF reali, tre ripetizioni, tre frame di warmup, 24 frame Low o 16 High/Cinema per run. Totale **39+39 acquisizioni e 1.488 frame misurati**. Scenari A idle, B singolo, C tre convogli, D quattro con comandi, E High/Cinema giorno/notte e overview/follow. La fixture CPU D ha quattro composizioni da cinque carri; la matrice normale usa le composizioni standard e il quarto treno.

La baseline comprende 26 acquisizioni conservate dalla sessione precedente e 13 riprese con le stesse impostazioni; entrambi i metadati sono versionati. Le posizioni dinamiche sono registrate, non forzate in un replay. Le immagini statiche usano seme/vento/camera fissati esclusivamente per confrontare i pixel.

F: tre sessioni di almeno 120 s reali per revisione e sei cicli qualità/reset per sessione, **sei sessioni e 36 cicli**. Bundle diagnostico separato per entrambe le revisioni. Heap CDP dopo GC, backing storage, contatori WebGL, DOM e listener. Gli istanti dell’ultima finestra campionata sono limiti inferiori della durata, che comprende anche le sonde successive.

## Interventi e benefici dimostrati

| CPU, quattro composizioni da cinque carri | Prima ms/chiamata | Dopo ms/chiamata | Riduzione |
|---|---:|---:|---:|
| Passo ferroviario/coordinatore | 4,5640 | 0,3663 | 92,0% |
| Pose e animazioni dei rotabili | 0,2290 | 0,1010 | 55,9% |
| Assistenza agli scambi | 0,3500 | 0,1333 | 61,9% |

1. **Rotabili:** una posa per corpo, riuso di asse/quaternione, binding delle ruote in WeakMap invalidati quando cambiano i figli. Nessuna animazione soppressa fuori camera; carrelli e biellismi conservati.
2. **Simulazione:** inviluppo preparato una volta per veicolo/proposta, invalidato al rollback; parcheggiati riusati solo nel passo. Rifiuto conservativo AABB prima del SAT originale, inclusi margini ai vertici. Nessuna sostituzione delle distanze ferroviarie con distanze euclidee.
3. **HUD:** proiezione fresca senza polilinee superflue; incontri, intervalli, distanze, sicurezza e highlight restano identici. API completa invariata per default; nessuna cache fra letture o throttling dei comandi.
4. **Risorse Cinema:** individuata e corretta una ritenzione preesistente di `materialHighPassFilter` omessa dal dispose di UnrealBloomPass r163. Sonda sulla cache reale: dopo tre uscite da Cinema **1/2/3 materiali trattenuti → 0/0/0**. Un programma GPU residente in meno dopo Low, **54 → 53** nella fixture, senza differenze pixel. Non sono tre programmi diversi né una misura di byte GPU.

I miglioramenti CPU superano il budget del 10% sui componenti bersaglio. Nei carichi B/C la simulazione migliora del 59,0%/78,2%; assistenza del 49,5%/70,1%. Il componente DOM `deck` è invariato: le sue oscillazioni di microbenchmark non vengono rivendicate come ottimizzazione.

## Frame prima/dopo

Valori mediani delle tre statistiche per run, ms. Budget: ripetere se mediana peggiora oltre 10% o p95 oltre 15%. **Nessuno dei tredici scenari supera le soglie.** Per 16 campioni il p95 del run coincide col massimo; dati grezzi, p95 pooled, FPS effettivi, picchi, long task e CDP ScriptDuration sono in [COMPARISON](phase-5d/COMPARISON.md) e nel JSON. ScriptDuration non è tempo CPU hardware e include la diagnostica successiva alla finestra.

| Scenario/qualità/giorno/camera | Mediana prima → dopo | P95 prima → dopo |
|---|---:|---:|
| A/low/48/overview | 2024.85 → 1883.25 | 2966.60 → 3149.90 |
| B/low/48/overview | 1858.25 → 1725.00 | 3349.90 → 2099.90 |
| C/low/48/overview | 1933.30 → 1808.25 | 4966.50 → 2616.60 |
| D/low/48/overview | 2008.25 → 1774.85 | 4149.80 → 2850.00 |
| C/low/95/overview | 2558.20 → 1683.20 | 4533.20 → 1833.30 |
| E/high/10/overview | 2974.95 → 2516.65 | 9466.20 → 5849.80 |
| E/high/10/follow | 2299.90 → 2149.95 | 3233.10 → 3683.20 |
| E/high/95/overview | 3083.25 → 2658.20 | 5683.10 → 4583.10 |
| E/high/95/follow | 2533.20 → 2141.55 | 9083.00 → 2683.20 |
| E/cinema/10/overview | 2033.20 → 2041.60 | 3833.20 → 2833.30 |
| E/cinema/10/follow | 2208.30 → 2241.55 | 3049.90 → 2583.30 |
| E/cinema/95/overview | 2041.60 → 2116.60 | 3033.20 → 2766.60 |
| E/cinema/95/follow | 2374.95 → 2558.25 | 3483.20 → 3333.20 |

Le variazioni del frame software non dimostrano un’accelerazione della GPU: il valore della CPU ottimizzata e quello della fluidità complessiva sono distinti. Mediana dei gestori sincroni dei comandi D: 6,1 → 6,2 ms, sostanzialmente invariata. Non è latenza puntatore→schermo. STOP ALL resta immediato nello stato motore nei test; nessun ritardo intenzionale aggiunto.

## Memoria, caricamento e durata

Dopo l’inizializzazione delle combinazioni qualità/illuminazione, heap F nell’ordine di 30–31 MiB e backing storage circa 94,4 MiB, comparabili nelle due revisioni. Nessun incremento progressivo di geometrie/texture a ogni ciclo: Low passa inizialmente da 402/50 a 404/51, poi si stabilizza; High 404/51, Cinema 405/69. Reset: 901 nodi e 120 listener (una lettura candidata a 902 nodi), marcia circa 904–905 nodi e 120 listener. Non si rivendica una riduzione generale della memoria residente.

La sola stabilità dei contatori non ha nascosto il difetto Bloom: una sonda aggiuntiva ha dimostrato i riferimenti forti trattenuti e il loro rilascio dopo la correzione. Sul codice finale: altri tre cicli e **138,9 s reali con tre convogli in moto**, cache HighPass vuota e 118 listener costanti nella fixture a tre treni. Dettagli e provenienza in [BLOOM_LIFECYCLE_FIX](phase-5d/BLOOM_LIFECYCLE_FIX.md). L’heap di questa sonda supplementare include allocazioni diagnostiche e non sostituisce il confronto GC principale.

Endurance logica separata: **108.000 passi/1.800 s simulati per revisione**, tre convogli e due carri ciascuno, versi misti. Dieci checkpoint e stato finale identici alla 5C; storie limitate a **6/6/7 segmenti**. È una prova del motore Node, non mezz’ora reale di rendering. Heap Node dopo GC circa 5,9 MB nelle due revisioni; campioni e hash in `phase-5d/regression/logical`.

Gestore GLB già dotato di cache Promise, template condivisi, release/cancellazione e dispose idempotente: verificato con sostituzioni, caricamenti tardivi e GLB reali. Nessun decoder, nuovo preload o cache speculativa introdotto. Bundle baseline **984.495 byte**, candidato CPU **985.240**, finale con cleanup **985.297**: **+802 byte, +0,081%** rispetto alla 5C. Nessuna nuova dipendenza o asset. UI ready osservato nel benchmark normale 23,56 → 20,67 s: singoli avvii, comprensivi di inizializzazione/rendering, insufficienti per rivendicare un miglioramento di caricamento.

## Regressioni eseguite e provenienza

- **131 test Node finali**, zero fallimenti/saltati; **9 Python**, build completa.
- **Cinque suite browser esistenti** passate, inclusi undici scenari della chiusura 5C, tre anelli nei due sensi, scambi/crossover, quattro terminali, runaround, aggancio/sgancio, composizioni lunghe, conflitti/rollback, frame irregolari, consolle/minimappe/HUD e quattro viewport.
- **Otto coppie di immagini finali pixel-identiche**: nativo Low/High/Cinema giorno/notte, Kenney Low giorno/notte. Stato e trasformazioni delle gerarchie coincidenti nei due versi. Anche le due immagini della sonda Bloom coincidono.
- **Build finale servita sotto `/SerieN/`**, con GLB e miniature reali: nessun errore JavaScript, richiesta fallita o risposta HTTP d’errore. Nessun deployment necessario per questa prova.
- **Gate automatico di completezza** passato su entrambi gli insiemi: 39 run, tre ripetizioni per condizione, campioni attesi, rendering non vuoto, sessioni F/cicli e nessun errore. [FINAL_GATES](phase-5d/FINAL_GATES.json).

Il confronto principale CPU/frame/F è su `303525c` e `5ae8ee9`. La successiva correzione Bloom `e8d81d3` modifica solo la distruzione del compositore quando si lascia Cinema; il metodo di rendering è byte-identico. Nelle finestre normali Low/High precedono Cinema e gli ultimi scenari restano in Cinema: l’istruzione aggiunta non è percorsa. Si conservano quelle misure; sul codice finale sono ripetuti suite Node, immagini complete, proprietà della cache, durata aggiuntiva e Pages. Motore, animazioni e interfaccia non cambiano nel cleanup. Le cinque suite operative restano riferite agli stessi percorsi applicativi invariati. Questa distinzione evita di attribuire misure precedenti a esecuzioni mai fatte.

La prima sonda della cache è stata interrotta per un aggancio errato della strumentazione al modulo Three; log conservato. Il test del materiale è stato prima osservato fallire e poi passare. Nessuno dei due risultati viene nascosto come successo iniziale.

## Vincoli, rischi residui e conclusione

Geometria canonica, tre anelli, quattro tronchini, runaround, instradamenti, FixedClock, regole della 5C, plancia/HUD, scenografia senza gallerie, shader, ombre, texture e dettaglio conservati. Immagini delle miniature invariate; aggiornato solo il digest della sorgente animata. `first` e `SerieN Control` non modificati.

Rimane da misurare la fluidità su GPU fisiche e dispositivi rappresentativi, insieme a sessioni browser di molte ore, consumo GPU effettivo e startup ripetuto su rete reale. I contatori non sono VRAM e un plateau limitato non prova assenza universale di leak. Questi limiti non annullano i guadagni CPU o la correzione di proprietà dimostrati; non costituiscono una certificazione di prestazioni per il prodotto pubblico.

Le aree senza beneficio dimostrato, come nuovi LOD/atlanti o semplificazioni della scena, sono rimaste invariate. Prima di ulteriori interventi grafici serve profiling su hardware reale. **5D chiusa con vantaggi misurati, regressioni passate e ritenzione Bloom corretta. Tecnicamente pronta per una futura 5E, da avviare soltanto su nuova istruzione.**

GitHub `main` osservato a `f582b12`: i due commit remoti successivi alla base pubblica aggiungono asset-library e file di sistema, non codice runtime. Preservati senza merge. Il risultato 5D è destinato al branch dedicato `performance/phase-5d`; nessuna modifica automatica alla versione pubblicata. Tutti i checkpoint e le prove sono recuperabili tramite Git.
