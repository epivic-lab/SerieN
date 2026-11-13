# SERIE N — R1C: session readiness e consumer ferroviari

13 novembre 2026, Europe/Rome. **PASS tecnico del laboratorio R1C; Quality Gate
indipendente della Regia pending. Non è un PASS di circolazione V06.**

## Mandato, baseline e concorrenza

Baseline esatta `b8f4f3cb98a3c5f49aa8713a96d2c10b445fb67b`, branch sorgente
`codex/scenario-v06-r1b-turnout-domain`, [Draft #15](https://github.com/epivic-lab/SerieN/pull/15).
Decisione prevalente: [Quality Gate R1B / autorizzazione esclusiva R1C](https://github.com/epivic-lab/SerieN/pull/15#issuecomment-6856806189).
Letti AGENTS, PROGRESS, documentazione M01/addendum e contratti R0/R01/R02/R1A/R1B,
con particolare riferimento a consumer, terminali, UNKNOWN e limiti del triangolo.
Le autorizzazioni storiche al rilascio in AGENTS non si applicano a questo mandato.

Ingresso: `/workspace/SerieN`, branch `work`, HEAD
`f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, working tree pulito, unico worktree.
Fetch esplicito necessario perché il refspec ordinario recuperava soltanto main.
Baseline locale, branch remoto e head della PR #15 coincidenti. Creati worktree
separato `/workspace/work/SerieN-r1c` e nuovo branch
`codex/scenario-v06-r1c-session-readiness` dalla baseline esatta; branch remoto R1C
prima assente. Nessun reset/rebase/modifica degli altri branch. Nessun altro
processo locale di sviluppo osservato. La ricerca delle PR aperte restituisce
#7 e la catena #10–#15, senza R1C concorrente; ciò non esclude lavori esterni non
pubblicati. Base remota ricontrollata prima della pubblicazione.

## Architettura implementata, esclusivamente Node

La nuova factory è `tools/scenario-v06/railway-session.js`; non è in `src/`, non
è importata dal bootstrap e non introduce flag URL/UI/ambiente. L'app continua a
chiamare `createNetwork()` e rimane legacy. Nessun sorgente applicativo esistente
è stato modificato. La suite riusa le logiche ferroviarie, senza riscriverle.

```text
selezione esplicita legacy | v06
  → copia byte → ammissione V06 hash + schema + lineage + semantica R1A
  → dati privati immutabili → createNetwork → validateNetwork
  → identità {sessionId, profileId, schema, version, datasetSha256, networkVersion}
  → UNICA rete della sessione
      ├─ registry → switchSpecs → router esistente con barriera UNKNOWN
      ├─ modello scambi/cache propria → topologia/protezioni esistenti
      ├─ Journey/fixture flotta e carri parcheggiati della stessa rete
      ├─ occupazioni, approcci, prenotazioni → siteSafety/comandi/guard esistenti
      └─ cache diagnostica, callback, timer, cleanup → dispose/reset da zero
```

| Contratto | Comportamento effettivo |
| --- | --- |
| Ammissione | `profile` obbligatorio; solo `legacy` o `v06`. V06 usa `validateArtifact(bytes)` **prima** di `createNetwork`. Copia dei byte, nessuna injection di oggetti/registri/reti/router/safety esterni, nessun fallback silenzioso |
| Versione rete | `networkVersion = profileId@SHA256(bytes)`; versione/schema separati; UUID diverso per ogni sessione anche sul medesimo dataset. Il digest è stabile, l'UUID no |
| Legacy | File canonico locale, versione 1, SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; validazione rete/registro esistenti. Nessuna nuova certificazione del legacy |
| V06 | Schema `serien-v06-operational-1`, `V06-R1A`, versione 1, SHA256 `4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7`; 79 archi/74 nodi/7 controller/3 terminali |
| Ownership | JSON riletto/copiato per ogni sessione; metadata, controller, punti e rete congelati ricorsivamente. Registro associato alla medesima rete; topologia con mappe esposte in sola lettura. Nessuna cache globale di layout attivo |
| Controller | 8 legacy; 7 V06: C07, C12, C13, N07, N14, WX-A/B. ID e ordine derivati dal registro. Nessun alias fra semplici; WX omonimi distinti per istanza |
| Stati | False iniziale legacy, **null iniziale per tutti i sette V06**. Snapshot pubblici immutabili. `configureLabStates` richiede l'intera configurazione di booleani propri, prima di inserire fixture/prenotazioni; nessuna configurazione parziale o coercizione |
| Router | Il router originale rimane invariato. La funzione della sessione lo delega solo se viva, con stati tutti booleani e riferimenti di flotta coerenti. Altrimenti restituisce null/UNKNOWN; `Boolean(null)` non concede un percorso nel laboratorio |
| Safety | Nessuna safety esterna iniettata. Ogni richiesta ricostruisce occupazioni/approcci con `collectRailwayState`, unisce le prenotazioni della sessione, poi usa `siteSafety`. Comando protetto R1B originale; WX protetto su tutti i suoi archi, anche inattivi |
| Guard/preview | Wrapper read-only su `assessRailwayGuard` e `traceJourney` originali; rifiuto Journey estranei. Stato sconosciuto dà guard UNKNOWN/distanza zero. Dati di movimento invalidi bloccano safety e guard |
| Journey/flotta | Fixture Node statiche con dimensioni esplicite, Journey creato sulla sola rete posseduta, nessuna mesh. Controlli d'identità anche contro sostituzione del Journey. Posizione/storia/velocità non trasferite al reset |
| Occupazioni/prenotazioni | Occupazioni ricalcolate, nessuno snapshot persistente usato per autorizzare. Prenotazione ammessa solo per un owner posseduto e intervallo finito entro un arco locale; non è un dispatcher |
| Cache/lifecycle | Cache diagnostica JSON copiata e congelata, cache del modello per sessione, listener e timer posseduti. Cleanup espliciti; errori registrati senza interrompere rilascio delle altre risorse |
| Readiness | `labReady` significa dati/ownership utilizzabili nel laboratorio. **`runtimeAdmission:false` sempre**, anche con sette stati noti e safety unlocked. Non esiste un'API di avanzamento della flotta |

Il wrapper è una barriera di composizione/readiness, non un nuovo motore
ferroviario. `ROUTABLE`, `unlocked`, e il fit statico non concedono circolazione.
Le fixture negative possono occupare uno scambio per verificare un rifiuto:
`createLabTrainFixture` non è un punto di spawn operativo. I Journey restituiti
sono oggetti del laboratorio: non si pretende una sandbox contro codice JS che
chiami direttamente le loro API; gli ingressi della sessione controllano sempre
ownership e lifecycle. Nessun riferimento vecchio viene importato nella nuova
sessione.

Esempio riproducibile, da root repository, senza movimento:

```js
import {createRailwaySession,replaceRailwaySession} from './tools/scenario-v06/railway-session.js';
const legacy = createRailwaySession({profile:'legacy'});
const v06 = replaceRailwaySession(legacy,{profile:'v06'});
v06.readiness(); // labReady:false, runtimeAdmission:false, unknown-control
v06.configureLabStates(Object.fromEntries(v06.registry.ids.map(id=>[id,false])));
v06.checkSpawn({target:'C',scope:'laboratory',vehicles:[
  {length:40,width:16,front:22,rear:22}
]}); // static-lab-fit-only, runtimeAdmission:false
const rollback = replaceRailwaySession(v06,{profile:'legacy'});
rollback.dispose();
```

## Matrice dei consumer residui

Inventario del codice alla baseline R1B, ricontrollato sul candidato. **C =
configurabile ora mediante API già presenti**, provata solo nel laboratorio se
indicato; **F = adattamento futuro**, nessuna modifica in R1C; **B = blocco** prima
dell'attivazione. La classe non è un'autorizzazione a modificare l'app. Rischio
alto = possibile incoerenza ferroviaria/safety; medio = presentazione/lifecycle.
Le prove future sono requisiti, non test dichiarati eseguiti.

| File / funzione o simbolo | Dipendenza residua e intervento richiesto | Classe / rischio | Test richiesto o prova R1C |
| --- | --- | --- | --- |
| `app.js:144` bootstrap `network`, `loops` | Default canonico unico ma selezione assente; futura costruzione atomica del contesto e injection a ogni consumer | F / alto | Bootstrap separato dei due profili, nessuna doppia rete; ora build legacy identica |
| `app.js:285` `controlOrder`, `switchSpecs`, `turnoutModel` | Otto ID hardcoded, tutti false; usare registry/stati per profilo e ordine UI verificato | F / alto | 8 legacy/7 V06, UNKNOWN iniziale, zero controller placeholder |
| `app.js:472` `route`, `turnoutCommands`, `fleetCommands` | Closure globali e comando con fallback legacy implicito; iniettare registry esplicito e callback della stessa sessione | F / alto | WX omonimi, callback stale, safety fresca; contratti isolati PASS R1C |
| `src/network.js` `createNetwork`, `loopPosition`, `mainLoops` | Injection dati già R1A; algoritmo presuppone tre lane e circuiti in assetto false, non è pathfinding globale | C / alto | R1C identità/versione/factory; R1A circuiti e chiusure invariati |
| `src/turnout-registry.js` default/export legacy | Import diretto canonico; `TURNOUT_IDS` e `getLegacyTurnoutRegistry` sono compatibilità legacy, quest'ultimo crea una rete propria | C / alto | Registro esplicito nel contesto; nessun fallback implicito V06; R1C PASS |
| `src/turnout-routes.js` `createTurnoutModel` | Accetta registro per istanza; cache di percorsi per modello, mai trasferire | C / medio | Cache isolate e letture UNKNOWN PASS R1C/R1B |
| `src/turnout-commands.js` `createTurnoutCommands` | API R1B parametrica; registry opzionale significa soltanto legacy | C / alto | Comando, spec e Journey coerenti; safety/occupazione/prenotazioni PASS R1C |
| `app.js:349–366` startup e `initial` | Loop 2/1/0 e frazioni .22/.65/.45, tre composizioni legacy | B / alto | Configurazione spawn per composizione e profilo; candidati statici R1C non sostituiscono quelle frazioni |
| `app.js:490` `initializeJourney` | Frazione di default .45 o edge esplicito; `ensure(tail)` non gestisce un rifiuto come ammissione upfront; manca verifica front completa nel punto iniziale | B / alto | Lunghezza reale di tutti i veicoli, front/tail, protezioni, occupazioni prima di commit |
| `app.js:575` `reset` | Riusa controller/closure/mesh, tutti false e spawn originali; invalida TM ma non è reset di profilo | F / alto | Nuova sessione completa a riposo, nessuna eredità; contratto Node PASS R1C |
| `app.js:618` `addTrain` | Quarto su T47 s80, controllo locale 120 mm, id=trains.length; nessun equivalente V06 approvato | B / alto | Rifiutare slot sconosciuto; R1C rifiuta id≥3 anche su un anello candidato |
| `app.js:422` `statuses`, `missionUI` | Quattro obiettivi fissi: giro, WX, runaround, sgancio/riaggancio | B / alto | Mapping obiettivi effettivamente disponibili, indisponibilità esplicita runaround/terminali non equivalenti |
| `app.js:530` `advanceFleet` | lane/previousLane, role runaround, t.loop, laps=travel/loop.length; cambi di anello e yard impliciti | F / alto | Nuove transizioni/versi/contatori; non dichiarare runaround il triangolo |
| `src/simulation.js` `routing`, `Journey`, `FixedClock` | Algoritmi riusabili; router storico ha Boolean(state), storia e limiti propri. Clock accumulato va ricreato in futura app | C / alto | R1C delega e barriera UNKNOWN; prove dinamiche future su storia, reversal e clock, senza riscrittura |
| `src/next-switch.js` `createSwitchTopology`, `traceJourney` | Dati da controller, WX completi; lead protetto fino a 30 mm sul solo arco vicino, limiti scansione | C+B / alto | Topologia/preview PASS R1C; fouling reale e segmenti corti da certificare dinamicamente |
| `src/next-switch.js` `destinationFor` | Nomi Inner/Middle/Outer e lane/fromLane/toLane; destinazioni dipendono dal dataset, V06 non fornisce ogni label storica | F / medio | C/B/A e terminali corretti nei due versi; nessuna destinazione inventata |
| `src/railway-state.js` `collectRailwayState`, `deriveSwitchAssistance` | Snapshot parametrico; derive richiede un treno selezionato valido, non gestisce flotta vuota | C+F / alto | R1C riusa collect+siteSafety anche a flotta vuota; futura app deve gestire assenza selezione senza falso consenso |
| `src/railway-guard.js` `assessRailwayGuard`, WeakMap topologies | Regole/frenatura invarianti; cache per identità network, prenotazioni su archi locali | C / alto | Nuova rete → nuova cache; guard UNKNOWN/distanza zero PASS R1C, prove di arresto dinamico future |
| `src/railway-step.js`, `src/railway-conflicts.js` | SAT/sweep planare riusabile, conflitti fra ID diversi; `app.js` non passa prenotazioni a step | C+B / alto | Fit statico R1C con stesso SAT; future collisioni WX/approcci/stop. Nessuna nuova circolazione eseguita |
| `src/fleet-commands.js`, `src/consist.js` | Velocità/inversione/coupling su array e route catturati; dimensioni/coupler necessarie | C+B / alto | API da ricostruire per sessione; coupling e lunghe composizioni V06 richiedono gate dinamico |
| `src/next-switch-view.js` `mountNextSwitchHUD`, ribbon/schema | Riceve network/state; quota ribbon 8,4 e label straight/diverging, horizon e cache UI | F / medio | Quota sopra ferro V06, etichette Y, refresh e disposal; nessuna modifica HUD R1C |
| `app.js:643` `updateRouteHighlight` | Cache tempi/preview globale e riferimenti al vecchio Journey | F / medio | Invalidazione completa su uscita di sessione, nessun ribbon stale |
| `src/guarded-stop-view.js`, `src/guarded-stop-scene.js`, `src/guarded-stop-bell.js` | Osservatori del core; terreno legacy per nome/texture, base fissa, segni e timer audio per treno | F / alto | Segnale non collocabile non disabilita stop; dispose segnali/audio, bind terreno selezionato |
| `app.js:669` `mapSVG`; `src/train-deck-state.js` `railwayMapPath`, `locomotivePoint`, MAP_VIEWBOX | Geometria parametrica ma viewBox1500×700 e riferimenti fisici dei Journey | C+F / medio | Un solo network, marker senza storia precedente; base V06 compatibile, test browser futuro |
| `src/train-deck.js` `mountTrainDeck`, RecentConsoles/cards | Route label LOOP n/RUNAROUND/FREIGHT YARD; cache card e selezioni dipendenti da id | F / medio | Stesso layout V2.1, label da profilo e nuova cache/selezione al reset |
| `src/ui/sidebar.js` `mountSidebar`, tiles/minimap | controlOrder da app, data-switch a indice, label Straight/Diverging, marker e mappa catturati | F / alto | 7 tile reali/8 rollback, tutti comandi sul confine protetto, UNKNOWN disabilitato |
| `src/ui/overlays.js`, dock/shell/keyboard e callback in `app.js` | Nessun import ferroviario alternativo; catturano comandi/selection/missioni dell'app | F / medio | Rimontaggio/invalidation di callback e focus, parità V2.1; nessun redesign |
| `src/turnout-picking.js` `createTurnoutPicking` | TURNOUT_IDS legacy per mesh e priorità; quota6,08/larghezza12,3, occlusori scena | F / alto | 7 hit target, path corretti, niente mesh/device fantasma, touch/occlusioni |
| `src/turnout-interaction.js` `createTurnoutFocus`, mount | isTurnoutId legacy; controlIds da app, pointer state/touchTimer | F / alto | Registry coerente, priorità UI e comandi protetti; cancel/listener/timer al dispose |
| `src/turnout-glow.js` `createTurnoutGlow` | TURNOUT_IDS/isTurnoutId legacy; offset/materiali/mesh per device | F / medio | Geometria Kato completa per 7, nessuna influenza sulla safety, risorse isolate |
| `src/turnout-arrows.js` `createTurnoutArrows` | TURNOUT_IDS, height6,08 e cache unit/path/state | F / medio | Nuove geometrie/stati/quote, due percorsi WX e reset cache, nessun via libera implicito |
| `src/turnout-arrow-view.js` `turnoutArrowView` | Whitelist isTurnoutId legacy su ID e approcci | F / alto | Registry specifico, UNKNOWN e vicini adiacenti senza promozione a permesso |
| `src/turnout-arrow-approaches.js` | Già parametrico network/topology/train/choose; lookahead600 | C / medio | Ingressi/direzioni reali e Journey della stessa sessione; regressione futura visuale |
| `src/train-management.js` `mountTrainManagement`, `invalidateReferences` | generation locale, pending intent, closure getTrains/getDetached, progetti/depot per mount | F / alto | Profilo nuovo invalida confronti/intenti; nessun UUID o trainId trasferisce una posizione |
| `src/train-management-state.js` `compositionView`, `detachedView` | Composizione neutra ma detached espone edge del punto fisico | C+F / medio | Edge locale/versionato, nessuna posizione stale in liste/preview |
| `src/train-projects.js` `realComposition`, `compareProject`, store | Progetti confrontano trainId/UUID/generation; catalogo neutro non è ammissione ferroviaria | F / medio | Nuova generation/store o riferimenti invalidati, nessun apply implicito su V06 |
| `src/depot-inventory.js`, `src/depot-view.js`, `src/train-projects-view.js` | Slot virtuali e pending intent non sono occupazioni del grafo | C+F / alto | Non convertirli in prenotazioni binario; rebuild/invalidation delle intenzioni fisiche |
| `app.js:146` `railPaths`, `addRail`; `src/rail-profile.js` | Renderer procedurale legacy, ±4,5 e rail top5,95, 150 mesh iniziali; nessuna selezione di profilo visuale | B / alto | Mandato visuale separato, assi/quote/partizione e contatto corretti, niente doppia ferrovia |
| `app.js:508` `renderVehicles`; `src/rolling-stock.js`, `src/train-assets.js`, `src/asset-placement.js` | Pose sul network ma quote gruppo/ruota legacy e fit Kenney; manager asincrono singleton | B / alto | Contatto ruota/rotaia per tipo, risultati async tardivi scartati, manager/target disposti per uscita |
| `src/scenic-plan.js` `SWITCH_LANDMARKS`, `createScenicPlan` | **Import diretto canonico**, landmark8; ruoli runaround e coordinate edifici/zone legacy | B / alto | Confinamento legacy o dati del profilo; nessuna rete V06 con clearance del vecchio canonico |
| `src/landscape.js` `forestSites`, `clearance` | **Import diretto canonico** per esclusioni intorno agli scambi; terreno/road/hardstanding fissi | B / alto | Landmark/maschere del profilo, sagome scenografiche indipendenti da collision prevention |
| `src/zone-layout.js` `switchPoints`, `buildZoneLayout` | **Import diretto canonico**; genera un tampone su ogni dead-end, mentre N16 V06 è aperto | B / alto | Terminal kind esplicito; non inventare tampone/arresto N16 o landmark legacy |
| `src/scenery.js` `enrich`, batching | Stazione/zone/diorama legacy e fusione statiche per materiale senza confine di profilo | B / alto | Ownership esclusiva rotaie/parti mobili/GLB prima del batching, cleanup GPU distinto |
| `src/diorama.js`, `src/zones.js`, `src/station-building.js`, `src/station-platform.js` | Assembly scenica e posizioni/riserve legacy, dipendenze transitive landscape/zone-layout | B / alto | Variante/scelta scenica autorizzata e sagome; non adattarle in R1C |
| `src/structure-layout.js`, `src/railway-works.js`, `src/navigation.js` | BRIDGE/valle/opere e preset camera fissi, base1500×700 | F+B / medio | Dati scenic/camera del profilo e nessun ostacolo sul nuovo tracciato, gate separato |
| `app.js:737` pagehide, `tick`, materialCache, clock | Cleanup oggi applicativo, RAF e accumulatori globali; non esiste uscita/cambio profilo a riposo | F / alto | Arresto verificato, teardown completo, nuovo clock/cache/callback; R1C copre solo risorse Node |
| `app.js:869` diagnostica; script performance/fixture browser | ID/spawn T47 e scenari legacy; non possono diventare V06 per sostituzione indiscriminata | F / alto | Tenere suite legacy e aggiungere testimoni V06 indipendenti autorizzati |
| `scripts/build-canonical-layout.py`, workflow Pages/alignment | Generatore/pipeline del canonico legacy; non devono sovrascrivere V06 | C+F / alto | Canonico rigenerato senza diff PASS R1C; pipeline V06 futura distinta, workflow qui intatti |

La ricerca esaustiva degli import diretti del canonico nei moduli applicativi
restituisce **cinque file**: network, turnout-registry e i tre moduli scenografici
indicati. `evidence/R1C/audit.json` conserva file/linea/sorgente e gli altri
riferimenti a TURNOUT_IDS, isTurnoutId, T47, runaround, mainLoops, previousLane e
controlOrder. L'inventario comprende anche i consumer già parametrici: la loro
presenza in tabella non implica un difetto né una riscrittura necessaria.

## Spawn, reset e missioni: ciò che è verificato

`session-spawn-plan.js` deriva un candidato per ciascun anello dalla **rete
selezionata**: arco non comandato/non nascosto, maggiore finestra libera dalle
fasce protette esistenti, tie-break deterministico per ID, punto medio della
finestra. Nessuna vecchia frazione, T47 o nearest-edge è usata per V06.

| Anello V06 | Lane | Lunghezza anello mm | Candidato statico | Finestra di laboratorio mm | Verso |
| --- | ---: | ---: | --- | --- | ---: |
| C interno | 0 | 2933,790700 | V06-P064, s124,0505 | 0…248,101 | -1 |
| B medio | 1 | 3260,781635 | V06-P065, s124,0505 | 0…248,101 | -1 |
| A esterno | 2 | 3468,164116 | V06-P056, s124,0505 | 0…248,101 | -1 |

Queste finestre sono misure geometriche per **fixture statiche Node**, non
capacità utili certificate o punti di arresto. `stopAnchor:null`,
`usefulCapacityMm:null`, `foulingCertified:false`, `runtimeAdmission:false` sono
espliciti anche sui tre anelli. I punti e i versi derivano dal grafo, non vengono
scritti nel dataset approvato.

Per il laboratorio si richiedono lunghezza/larghezza/front/rear finite e positive
per **ogni** veicolo; consistLayout originale calcola tail e offset. L'intero
ingombro deve rimanere strettamente nella finestra di un solo arco. Nessuna
estensione automatica attraverso giunti per far entrare una composizione lunga.
Poi si verificano occupazioni/prenotazioni e SAT originale fra tutti i veicoli,
anche su archi distinti. I tre posizionamenti statici corti sono compatibili;
secondo spawn sovrapposto, prenotazione e veicolo largo su anello vicino rifiutati.
Non si certificano sagoma fisica, spazzamento curvo o frenatura con questa prova.

N07, N16, scalo, quarto treno e triangolo non hanno anchor/capienza/fouling
approvati: rifiuto esplicito, anche richiedendo lo slot quarto su un anello
configurato. Dimensioni mancanti o composizioni lunghe non compatibili rifiutate.
Ogni richiesta operativa è rifiutata, anche se il fit statico passa. Le startup
legacy reali da più carri **non** sono ricollocate né dichiarate pronte su V06.

Il triangolo conserva le due tratte R1A, `requiredEvent`, `stopAnchor:null` e
`runtimeAdmission:false`. N07.C↔B diretto è vietato con entrambi i booleani. Una
futura manovra richiede ingresso nel comune, liberazione dell'intera unità,
arresto verificato, commutazione protetta e inversione: non è un giro automatico.
I circa250,101mm geometrici del comune verso N10 non sono capacità disponibile.
N16 resta fine aperta. Scalo e missione runaround richiedono decisioni funzionali;
nessuna equivalenza inventata con i quattro tronchini legacy.

## Lifecycle, reset e rollback

`replaceRailwaySession(current, options)` ammette solo una sessione di questa
factory, viva, con owner/Journey integri e **speed, velocity e requestedSpeed
finiti ed esattamente zero** per ogni fixture mobile o parcheggiata. Pausa o
solo throttle zero non sono autorizzazione allo hot swap. Dati sconosciuti e
movimento rifiutano sia replacement sia dispose; nessun arresto forzato implicito.

La nuova sessione è costruita e validata prima di dismettere la vecchia. Se il
digest/schema non passa, il vecchio contesto rimane intatto e nessun cleanup è
eseguito. Se passa, la vecchia sessione revoca subito i propri ingressi, cancella
timer e listener, svuota occupazioni/riferimenti flotta/prenotazioni/cache,
rilascia il modello, invoca tutti i cleanup. Un cleanup che fallisce non trattiene
le altre risorse: l'errore rimane visibile in `cleanupErrors` e va esaminato prima
di una futura integrazione applicativa.

La prova Legacy → V06 → Legacy crea tre reti, registri, modelli, topologie,
Journey e callback distinti. V06 riparte con sette null; il terzo legacy ha gli
stessi valori originari, controller false, zero prenotazioni/cache e storia
nuova. I vecchi ingressi di comando/preview/route/cache non agiscono sulla nuova
sessione; callback e timer precedenti non scattano dopo disposal. Dispose è
idempotente. L'identità per istanza impedisce il riuso di WX-A/B omonimi.

**Rollback attuale:** chiudere il laboratorio a riposo e creare un nuovo legacy.
Nel gioco il default è già legacy e il bundle è identico: non è necessario
alcun cambio di profilo in produzione. Non sono stati eseguiti revert su main,
merge o deploy. Per una futura attivazione serviranno smontaggio UI/scene,
invalidazione TM e async asset, nuovo clock e consumer coerenti della matrice;
questa procedura è soltanto progettata, non implementata nel bootstrap.

## Modifiche, verifiche e prove

| File nuovo / aggiornamento | Contenuto |
| --- | --- |
| `tools/scenario-v06/railway-session.js` | Factory/ownership/readiness/safety/lifecycle Node |
| `tools/scenario-v06/session-spawn-plan.js` | Candidati e ammissione delle sole fixture statiche |
| `tests/v06-r1c.test.js` | 35 nuovi test di integrazione e negativi |
| `tools/scenario-v06/audit-r1c.js` | Build/legacy/dataset invariati, profili/candidati/import diretti e riferimenti consumer |
| `tools/scenario-v06/check-r1c-scope.py` | Confronto di ogni blob della baseline |
| Rapporto, `evidence/R1C/`, PROGRESS/STATUS | Consegna, log, riproduzione e unico prossimo gate |

| Verifica eseguita | Risultato |
| --- | --- |
| Baseline prima delle modifiche | **336 Node / 9 JMRI / build PASS** |
| Finale suite completa | **371/371 Node PASS = 336 precedenti +35 R1C**, zero fail/cancelled/skipped |
| Test dedicati R1C | **35/35 PASS**; nessun test preesistente modificato |
| Finale JMRI e build | **9/9 PASS**, build PASS; Node24.19.0/npm11.9.0, npm ci con lock invariato |
| Integrità/versione | Artifact alterato, schema/versione/default/geometria mutati non ammessi; nessun fallback. Validazione semantica indipendente R1A e suoi negativi preservati |
| Controller/UNKNOWN | Registri completi 8/7, tutte le sette V06 null; configurazione parziale/non booleana rifiutata, route/throw/spawn/guard fail-closed |
| Riuso motore | Parità router su 150 arrivi orientati legacy/158 V06; preview e guard originali, Journey immutato dalle osservazioni |
| Safety/comandi | Occupazione unità completa WX, carri parcheggiati, nuove prenotazioni, superfici consecutive e dati di movimento invalidi |
| Ownership | Profili e istanze dello stesso profilo, Journey/spec/registry/owner estranei, WX-A/B omonimi e sostituzione del Journey rifiutati |
| Spawn | Tre candidati/versi statici, ingombri completi, SAT tra archi, sovrapposizione/prenotazione/dimensioni sconosciute/composizione lunga/quarto slot rifiutati |
| Lifecycle | Legacy→V06→Legacy, no eredità, ingressi stale revocati, timer cancellati, callback isolate, cleanup anche con errore, replacement invalido conserva il vecchio |
| No hot swap | Velocità, throttle, requestedSpeed non nulli o non finiti rifiutati; nessuna simulazione di movimento introdotta nel nuovo harness |
| Triangolo | Metadati/evento preservati; C↔B vietato nei due stati; spawn/manovra automatica rifiutati |
| Canonico | Rigenerazione con script esistente, quattro artefatti senza diff |
| Preservazione | **4.168 blob preesistenti protetti identici**, sole due eccezioni documentali PROGRESS/STATUS; tutti src/app/asset/test precedenti/workflow/deps immutati |
| Bundle | **1.095.990 byte**, SHA256 `9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66`, identico R1B; **85 input, zero V06/laboratorio** |
| Rete legacy serializzata | **533.232 byte**, SHA256 `ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413`, identica prima/dopo il laboratorio |

La prima esecuzione del nuovo harness aveva due aspettative errate: una chiamata
su Journey estraneo attendeva UNKNOWN anziché l'eccezione fail-closed prevista;
il test N07 presumeva B/C sempre in `toPort`, mentre le direzioni sorgente sono
preservate. Corrette le fixture/asserzioni usando entrambi gli estremi; log
iniziale conservato. Nessuna regola ferroviaria o test precedente indebolito.

[Evidenze e comandi di riproduzione](evidence/R1C/README.md),
[audit](evidence/R1C/audit.json), [preservazione](evidence/R1C/preservation.json).
La suite completa riesegue anche i test storici R1A/R1B prescritti; i loro testimoni
di attraversamento restano regressioni preesistenti, non nuove prove R2. Il nuovo
harness non chiama `stepRailway` né `Journey.move` per far circolare V06.

Sicurezza di ambito: nessuna credenziale, nuova chiamata backend o dipendenza;
nessun accesso/modifica Supabase, Auth/RLS o persistenza. UI V2.1, renderer, asset,
geometrie/dataset R1A/R02/canonico, core, frenatura e collision prevention
preesistenti byte-identici. Nessuna modifica al comportamento applicativo legacy.

## Rischi residui e proposta del prossimo gate

`physical_profile_certified:false` e `runtime_circulation_verified:false` restano
immutati. **NOT VERIFIED:** nuova prova browser legacy, browser V06, circolazione
completa V06, arresti reali ai terminali, manovre, fouling fisico, sagome dinamiche,
contatto ruote/rotaie, async/GPU/lifecycle applicativo e performance hardware.
L'identità del bundle dimostra preservazione del codice distribuito, non una
nuova prova visuale o dinamica. La matrice contiene blocchi reali all'attivazione,
ma nessuno richiede di uscire dal perimetro per consegnare questo laboratorio.

**Proposta R2, solo dopo nuovo mandato Regia:** circuito dinamico isolato Node
con selezione esplicita e nessuna attivazione browser. Prima definire composizioni
ammesse, confini protetti/fouling e input mancanti; poi provare A/B/C nei due
versi, trasferimenti WX/adiacenze, storia e inversioni, preview coerente,
UNKNOWN durante avvicinamento, collisioni sweep tra archi e carri sganciati,
frenatura/stop e rollback a riposo. N07/N16/scalo restano rifiutati finché non
sono approvati arresti/capacità; il triangolo richiede gate di manovra distinto,
mai una connessione diretta. Variazioni a core, bootstrap, UI o renderer devono
avere autorizzazione separata. Gate di accettazione: nessun transito o throw
illecito, nessun overlap, rifiuto UNKNOWN, nessun leak al ritorno legacy e suite
storica preservata; le evidenze devono distinguere verifica numerica da fisica.

Pubblicazione prevista con **un commit atomico e push normale sul solo branch
R1C**, nuova Draft PR contro il branch R1B collegata alla #15. La ricevuta finale
riporta URL/branch/SHA effettivi e verifica local=remote; il rapporto non anticipa
un hash autoreferenziale. **STOP R1C: unica prossima azione, Quality Gate Regia
sulla consegna. Nessun merge, deploy, avvio R2 o autorizzazione alla circolazione.**
