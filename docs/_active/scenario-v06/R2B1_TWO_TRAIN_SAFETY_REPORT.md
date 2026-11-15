# SERIE N — R2B1: two-train dynamic safety

13 novembre 2026, Europe/Rome. **PASS tecnico di safety numerica nel perimetro
misurato; QUALITY GATE INDIPENDENTE REGIA PENDING.** Il progresso è verificato
nei casi compatibili e dopo liberazione/riarmo; i conflitti frontali e le due
diagonali WX simultanee producono deadlock sicuri. Nessuna policy di priorità.

## Mandato e provenienza

Baseline obbligatoria, parent unico ed esatto del checkpoint:
`9aa9656b1f40dec15215d4df366aae2e2e540904`. Base della Draft: branch
`codex/scenario-v06-r2a-f1-shared-junction-interlocking`, [PR #18](https://github.com/epivic-lab/SerieN/pull/18).
Autorizzazione esclusiva: [Quality Gate Regia 6859221401](https://github.com/epivic-lab/SerieN/pull/18#issuecomment-6859221401),
conservato in [REGIA_GATE.md](evidence/R2B1/REGIA_GATE.md).
Letti AGENTS, PROGRESS, STATUS, rapporti R1C, R2A e R2A-F1, codice effettivo e Gate.

Checkout iniziale `/workspace/SerieN`, branch `work`, HEAD
`f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, pulito; la baseline non era presente.
Fetch esplicito del branch F1: SHA locale, remoto e HEAD #18 coincidenti.
Nuovo branch autorizzato `codex/scenario-v06-r2b1-two-train-safety`, inizialmente
assente dal remoto, creato direttamente dalla baseline. Nessun reset, rebase,
merge o modifica di un altro branch. Baseline **412/412 Node PASS prima del
codice**; build F1 riprodotta identica. SHA atomico, URL Draft e local=remote
nella ricevuta finale, senza aggiungere un commit documentale autoreferenziale.

## Implementazione esclusivamente Node

| File nuovo in `tools/scenario-v06/` | Responsabilità |
| --- | --- |
| `two-train-lab.js` | Unica sessione R1C V06, ammissione preventiva, due owner/Journey, clock e transazione originali, comandi e snapshot |
| `two-train-oracle.js` | Testimone read-only R02/R1A: posa, ganci, giunti, ingombri, occupazioni e sweep conservativo indipendente dal SAT del core |
| `two-train-validation.js` | Asserzioni a ogni tick, scenari effettivi, protezioni, ripartenza e prova negativa UNKNOWN del core |
| `run-r2b1.js` | Matrice deterministica e riproduzione delle tracce |
| `audit-r2b1.js` | Bundle/input, dataset, Legacy, moduli F1, 64 coppie topologiche WX e scansione segreti |
| `check-r2b1-scope.py` | Confronto di tutti i blob baseline e whitelist completa delle aggiunte |

Nuovo `tests/v06-r2b1.test.js`: **65 test** positivi, negativi e di conflitto.
Fra i file preesistenti cambiano solo PROGRESS e STATUS. R2A e R2A-F1, test
storici inclusi, restano byte-identici. Nessun sorgente applicativo modificato.

La factory R1C ammette gli stessi byte V06 verificati, prima di costruire
l'unica rete. Entrambi i convogli possiedono Journey distinti della stessa rete,
ID 0 e 1 coerenti con i comandi originali. Un solo `FixedClock(1/60)` chiama
**una sola `stepRailway(context, dt)` con entrambi i treni per tick**. Il numero
di transazioni deve essere esattamente uguale al tick. Il laboratorio non
avanza singolarmente i treni e non chiama Journey.move per muoverli.

Velocità e STOP sono `createFleetCommands`; routing, guard, reconcile,
collision prevention, SAT, sweep e ricalcolo dopo rifiuto sono quelli originali.
Ogni tick passa le prenotazioni attuali della sessione. Occupazioni e safety
sono ricostruite dagli stati effettivi; ogni richiesta panel/device usa
`session.requestToggle`, che rilegge sincronicamente la safety. Nessuno snapshot
precedente concede movimento o commutazione.

Sette stati espliciti prima dell'ammissione: C07/C12/C13/N07/N14/WX-A/WX-B false,
con sole varianti WX X o C13=true dichiarate per scenario. Nessuna inferenza da
UNKNOWN a false. `runtimeAdmission:false` resta sempre invariato. N07/N14 sono
osservati nei sette stati, **non dichiarati attraversati** dagli anelli normali.

## Ammissione preventiva e topologia

I candidati R1C non vengono considerati permessi operativi: il nuovo ingresso
rivalida dimensioni di ogni rotabile, tail/front, ganci, contenimento completo
nell'arco, percorso attivo, coordinate R02, occupazioni e prenotazioni degli
altri owner, SAT originale e distanza geometrica indipendente fra tutti i
rotabili. Un rifiuto non inserisce il secondo treno. Non estende la storia per
far entrare una composizione troppo lunga. Nessuna ammissione applicativa.

Gli anelli riusano i candidati C/P064, B/P065, A/P056, ma con questa nuova
validazione; gli inseguimenti usano due posizioni libere misurate su P064,
s66/182 mm (s60/188 nelle prove prenotazione/frontale). Sign e dir sono salvati.
Composizioni: loco corpo40×16, ganci22/22; carro30×14, ganci17/17; offset0/39,
tail56, ingombro78 mm secondo consistLayout originale. Nel pianificatore WX si
usa cautelativamente tail61 per scegliere finestre, poi si valida il tail reale.

Per WX, due Journey **disposable di sola pianificazione** interrogano `ensure`
e il router originale all'indietro dai due percorsi attivi, cercando finestre
sugli archi reali con la medesima distanza dal WX. Non muovono i convogli e non
forniscono decisioni al motore. Non esiste un secondo router o collegamento per
vicinanza. Le history di pianificazione e le posizioni di ammissione sono nelle
tracce. Alcuni approcci attraversano l'altro WX o segmenti nascosti già validati
R02: nessuna geometria modificata o scorciatoia.

Prova topologica completa [audit.json](evidence/R2B1/audit.json): **64 coppie
dirette, 16 ammesse e 48 vietate**, confrontate con il testimone R1A congelato e
con le scelte effettive del router ai nodi/porte reali di entrambe le unità.

| Stato di ciascun WX | Collegamenti diretti consentiti, in entrambi i versi |
| --- | --- |
| N / false | UL↔UR, LL↔LR |
| X / true | UL↔LR, UR↔LL |

Le 48 coppie vietate non sono itinerari eseguibili: **NOT VERIFIED come
circolazione**, con impossibilità topologica provata nelle singole righe
`allowed:false`. Non vengono inventati incroci diagonali in N, paralleli in X,
ritorni sulla stessa porta o connessioni interne fra due vie dello stesso WX.
S3 è raggiungibile in entrambi i versi sulla vera sezione P064: non richiede
una connessione supplementare o un'inversione in marcia.

## Oracolo esterno e riproduzione

`two-train-oracle.js` importa solo assert/fs/crypto, nessun modulo src, Journey,
router, collisioni o builder. Verifica i digest delle fonti indipendenti:

- R1A oracle: `56199a3f625fbce25b6e69fcde2357841bc17ccc3c5bfa1f658c7e196132591a`.
- R02 track: `99a5019f6ea4b8a99d18dcf6aff4a9b841ea2c49c5bb4eff9edd36825eead460`.

Rimisura le polilinee e interpola autonomamente centri e ganci; confronta
orientamento, storia metrica e soli giunti R1A con direct_transit:true. Ogni
corpo/gancio occupa un arco allineato, travel è il valore assoluto del delta,
posizione e odometro concordano, direzione non cambia da sola, spostamento
limitato dalla cinematica e salto euclideo non superiore alla strada percorsa.
S1 aggiunge il testimone dei circuiti R0/R02: coordinata origine+segno×odometro,
ordine reale A/B/C e giro completo per ciascun treno, non solo travel accumulato.

A ogni tick si confrontano i rettangoli dei ganci e della larghezza stock con
un algoritmo esterno di intersezione segmenti/contenimento/distanza, senza usare
vehiclesConflict o il flag della guard come expected. Lo sweep esterno usa
almeno17 pose, include i vertici R02, le discontinuità del campionamento tangente
s±0,5 e le frontiere Journey. Fra questi punti il centro è affine e l'angolo
della tangente affine è monotono; **convex hull + disco R×Δangolo +2e-6 mm**
copre la rotazione e la traslazione fra pose. La distanza fra i due hull deve
superare la somma dei dischi. È un limite geometrico conservativo autonomo,
non una nuova regola di movimento o una certificazione fisica.

Le occupazioni attese sono ricostruite dai corpi/ganci sulla history e
confrontate intervallo per intervallo con `collectRailwayState`. Per ogni
prenotazione si verifica owner e assenza di corpo estraneo nell'intervallo.
Ogni snapshot include tutti i sette stati e safety. Le mutazioni negative di
posa, history e occupazione fanno realmente fallire il monitor; una prova con
endpoints separati e sweep che si attraversano calibra il testimone geometrico.

Snapshot iniziale, ogni secondo, a ogni giunto e cambio guard; asserzioni e
SHA256 cumulativo del **JSON di ogni tick** anche per i tick non salvati.
Le tracce gzip non contengono UUID di sessione o chiavi casuali di prenotazione;
essi rimangono privati. Due esecuzioni complete confrontano byte per byte i
55 risultati e la sintesi. Durate dei runner non sono evidenze deterministiche.

## Scenari e misure

[Matrice completa con tutte le righe](evidence/R2B1/SCENARIO_MATRIX.md),
[sintesi numerica](evidence/R2B1/summary.json), [tracce](evidence/R2B1/traces/).
**55 scenari, 60.917 tick ferroviari per esecuzione.**

| Gruppo | Casi | Risultato operativo | Min distanza corpi mm |
| --- | ---: | --- | ---: |
| S1 A/B, A/C, B/C | 15 | 12 combinazioni di verso +3 con loco/carro per entrambi; almeno un giro per treno, zero interventi guard | 15,505111242 |
| S2 inseguimento | 12 | Due versi ×loco/loco+carro ×frenata/STOP/fermo; collisione impedita e ripartenza dopo liberazione, solo con comando | 0,050000000 |
| S3 frontale/divergente | 2 | Frontale sicuro in deadlock; controllo divergente progredisce | 0,975000000 |
| S4 WX e F1 | 19 | 8 N compatibili, 8 X in conflitto, 2 X con carri, 1 arresto F1 con altro treno in marcia | 0,017742613 |
| S5 prenotazioni/condizione fresca/UNKNOWN | 7 | Owner distinto, rilascio fresco, cambio condizione immediato/differito con ID scambiati, UNKNOWN del core | 1,112500000 |

Lunghezze indipendenti: A3468,164116346, B3260,781635120, C2933,790700412 mm.
Nei casi S1 entrambi continuano fino al completamento del più lungo, senza
fermare artificialmente il primo che termina il giro. Nessuna rotta condivisa
viene considerata libera sulla sola identità dell'anello.

Dati diagnostici rappresentativi, riproducibili dalle tracce:

- Frontale S3: primo rifiuto per entrambi tick82, travel41,5125 mm ciascuno,
  gap0,975 mm; restano fermi per399 tick finali. Nessun attraversamento reciproco,
  inversione automatica o autorizzazione implicita dopo STOP.
- WX-A X, versi+1/+1: entrambe le diagonali P012/P013 raggiunte da routing valido;
  primo rifiuto tick538, gap0,018031999 mm; lock approaching tick344, occupied388,
  panel/device rifiutati. I due corpi restano realmente nella protezione WX.
- WX-B X, versi+1/+1: P016/P017, primo rifiuto tick238, gap0,017742613 mm;
  lock approaching59, occupied88, panel/device rifiutati. Nessun overlap nel diamond.
- In tutti i casi WX, la safety deve essere occupied finché **qualunque parte
  dei due ingombri** interseca una protectedRange. Nel caso N completato, STOP
  fuori dall'intera unità consente la commutazione protetta; nel conflitto X
  fermo il comando continua a essere rifiutato. Uscita del solo centro non vale
  come rilascio.
- F1 con secondo treno A: primo intervento C13 tick816, arresto869, gancio
  a31,753263435 mm dal giunto, **+1,753263435 mm fuori fascia**. Correzione device
  protetta consentita, zero ripartenza spontanea, riarmo esplicito; altro treno
  ancora SAFE in moto. I due moduli F1 non sono modificati.
- UNKNOWN diretto: entrambe le fixture negative restano su archi non comandati
  validati, prima del WX-B; primo intervento30, arresto43, ganci a30,377777778 mm
  dal giunto. Il gate ordinario del laboratorio nega invece ammissione e clock
  con tutti i sette stati null: **zero tick e zero transazioni**.

Massimo errore di posa **2,278173318e-13 mm**, massimo eccesso di salto
2,369215935e-13 mm; **702 giunti** effettivi. Minima clearance dello sweep
conservativo indipendente **0,012724691204 mm**, positiva dopo sottrazione dei
margini continui. Hash definitivi nella sintesi e nel manifesto di determinismo. Nessuna
penetrazione, rollback, teleport, movimento fantasma o occupazione stale rilevata.

## Safety, progresso, deadlock ed equità

**11 deadlock osservati**, il frontale e tutte le10 prove WX X. La guard
conserva il pericolo dopo l'arresto: il semplice trascorrere dei tick non concede
un riavvio. Questi casi sono PASS di separazione sicura, **non** di risoluzione
operativa del conflitto. Le prove WX mantengono almeno121 tick consecutivi fermi;
nessuna promessa di risoluzione senza un nuovo comando/decisione esterna.

I quattro casi S5 con entrambe le proposte in moto rigettate verificano che,
se il leader viene riarmato immediatamente nel tick successivo oppure30 tick
più tardi, il suo moto compatibile non sia bloccato dal vecchio probe del follower.
Il secondo non si muove senza riarmo; a strada libera il probe torna SAFE. ID e
ordine fisico scambiati verificano che l'esito non dipenda da un vincitore fisso.

Nessuna starvation nei casi compatibili osservati; **equità o assenza di
starvation per traffico arbitrario/tempo illimitato NOT VERIFIED**. Non esistono
nuovo dispatcher, priorità, instradamento alternativo o recovery automatica.

## Quality Gate e preservazione

| Controllo | Risultato |
| --- | --- |
| Baseline prima del codice | 412/412 Node PASS |
| Nuovi test R2B1 | 65/65 PASS nella regressione completa |
| Regressione Node finale | 477/477 PASS, zero fail/skip/cancelled |
| Matrice ferroviaria finale | 55/55 PASS safety; progresso/deadlock distinti, 60.917 tick |
| Determinismo | 55 tracce +summary confrontati byte per byte, hash di ogni tick |
| JMRI | 9/9 PASS |
| Build/canonico | PASS, quattro artefatti canonici senza diff |
| Preservazione | 4.246 blob protetti identici sui4.248 baseline; sole eccezioni PROGRESS/STATUS |
| Moduli F1 e laboratorio R2A | Byte-identici, test preesistenti conservati |
| Bundle | 1.096.081 byte, identico F1, 85 input, zero V06/laboratorio |
| Rete Legacy | SHA256 ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413, invariata |
| Dataset V06 | SHA256 4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7, ammissione originale PASS_DATASET_ONLY |
| Segreti e ambito | Zero candidati nei nuovi file, incluse tracce decompresse; nessun nuovo input applicativo, dipendenza o egress |

Bundle SHA256 `89d732feafef5914078d5ef83885e5b9b68ff3abe967e8c4863a08e20a3063c7`.
[Audit](evidence/R2B1/audit.json), [preservazione](evidence/R2B1/preservation.json),
[comandi e log](evidence/R2B1/README.md). Node24.19.0, dipendenze del lock già
presenti, nessuna installazione. Il primo test negativo di larghezza100 mm
non aveva geometria in conflitto: i candidati C/B sono separati66,027 mm,
non33 mm. Corretto a150 mm e rieseguito; log63/64 conservato. Non era un difetto
del core e nessun criterio di separazione è stato indebolito. Altri errori di
preparazione e miglioramento conservativo del testimone descritti nei notes.
Nessun difetto del core emerso nel perimetro misurato; nessun fix applicativo.

## Limiti, rischi e STOP

Margine minimo fra corpi di circa0,017743 mm: **non è una tolleranza fisica
certificata**. Le geometrie di fonte sono quelle candidate R02 revisionate,
non misure indipendenti di un impianto reale. Le dimensioni sono stock numerici
corti espliciti, non sagome di asset/rendering o rotabili fisici.

NOT VERIFIED: nuove prove browser Legacy, browser V06, hardware, rendering,
contatto ruote/rotaie, sagome fisiche, profili lunghi, perdita dinamica di un
singolo stato noto tramite un ingresso applicativo (questa sessione non espone
tale API), manovra N07, terminale N16, scalo, coupling dinamico, terzo/quarto treno,
priorità ed equità generale. Le48 coppie WX vietate restano non percorribili.
Le prove numeriche non modificano i flag physical_profile_certified:false,
runtime_circulation_verified:false o runtimeAdmission:false.

Sorgenti/app/core/Journey/routing/guard/collisioni, geometrie/dataset, scambi,
bootstrap/UI/HUD/renderer/asset, Auth/Supabase/backend, dipendenze e workflow
sono preservati integralmente. Nessun merge, deploy o browser V06.

**STOP R2B1: unica prossima azione, Quality Gate indipendente della Regia sulla
Draft con base #18. Nessun avvio R2B2 o avanzamento automatico.**
