# SERIE N — M0.1: audit di integrazione scenario V06

> **Aggiornamento prevalente M0.1-R — 13 novembre 2026.** La Regia ha stabilito che il masterplan AS-BUILT V06 sostituirà anche geometria e topologia operative. L'**addendum §15** prevale sulle raccomandazioni precedenti: l'opzione B con vecchi assi attivi, il vincolo del canonico immutabile per V06 e la sequenza scenografia-prima/ferrovia-dopo sono superati. Le sezioni 1–14 restano come verbale storico delle verifiche M0.1; misure, checksum e limiti osservati rimangono validi per le versioni esaminate. **Esito vigente: NO-GO all'avvio dell'implementazione con i soli dati attualmente verificati; percorso di migrazione proposto in §15, da approvare.** Nessun codice modificato e nessuna M0.2 iniziata.

Data: **13 novembre 2026**, Europe/Rome. Modalità: audit tecnico e architetturale, senza implementazione.

Repository: `epivic-lab/SerieN`. Baseline analizzata: **`f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`**, branch locale **`work`**.

**Esito storico M0.1, superato per strategia e roadmap dal §15: CONDITIONAL GO**, esclusivamente per proporre alla Regia un esperimento M0.2 controllato con ferrovia canonica esistente. **L'allineamento ferroviario del pacchetto corrente non passa il confronto con il simulatore.** Non è autorizzata alcuna integrazione, sostituzione dei binari, correzione geometrica o fase successiva.

## 1. Executive summary

Le etichette seguenti si applicano all'intero rapporto:

- **VERIFICATA**: riscontro diretto nel checkout, nelle risposte Drive, nei byte campionati o in una verifica eseguita in M0.1. Una dichiarazione dell'esportatore è verificata come contenuto documentale, non automaticamente come comportamento del gioco.
- **INFERITA**: conseguenza architetturale, rischio prevedibile o proposta, ancora da provare nell'applicazione.
- **NON VERIFICABILE**: evidenza non acquisita in questo audit, con limite e verifica necessaria esplicitati. Comprende prove browser/hardware non eseguite, senza affermare che siano impossibili in assoluto.

| Domanda di completamento | Risposta ed evidenza |
| --- | --- |
| Compatibilità tecnica? | **VERIFICATA, parziale**: Three.js 0.163.0 dispone di GLTFLoader e dell'estensione di instancing; quattro GLB campione sono strutturalmente leggibili e conformi ai rispettivi SHA. Il parser reale ricostruisce 643 istanze dei massi. **NON VERIFICABILE** la resa dell'intero pacchetto nel gioco. **VERIFICATA** incompatibilità geometrica fra gli assi esportati e quelli canonici (§5). |
| Strategia contro duplicazioni e disallineamenti? | **INFERITA, raccomandata B**: mantenere rendering e logica ferroviaria attuali; escludere completamente `railway_visual.glb`. Verificare comunque terreno, banchina, portali e ingombri contro il grafo canonico. A e l'ibrido con mesh di rotaia sono sospesi. |
| Problemi prestazionali e misure? | **VERIFICATA nei metadati**: 18.626.762 triangoli espansi, 148.824 istanze, 364.451.464 byte per i 12 moduli ordinari. **INFERITI**: costo di triangoli/ombre, texture decodificate, raycasting su istanze, picchi di memoria e caricamento sincrono. Protocollo di misura in §7. Nessuna promessa di FPS. |
| Integrazione disattivabile? | **INFERITA**: selezione al bootstrap, default legacy, root scenografica separata, whitelist dei moduli game, rollback mediante ricaricamento legacy; core e UI rimangono gli stessi. Non esiste già un interruttore V06 (§8–9). |
| Minimo intervento sicuro M0.2? | **INFERITA**: prima riconciliare il contratto di integrità; poi una sola prova opt-in di `mountain.glb` nel simulatore, con conversione metri→millimetri, binari canonici e verifica degli ingombri. Estendere progressivamente a portali, terreno, stazione soltanto dopo i rispettivi gate. Nessuna mesh ferroviaria importata (§11). |

Tre ostacoli richiedono decisioni esplicite: **geometria non coincidente**, **hash incoerenti del manifest e del rapporto**, **scenografia legacy non separabile dopo il batching attuale**. Il caricamento glTF è plausibile; la composizione completa non è pronta per l'attivazione. CONDITIONAL GO non significa PASS ferroviario o approvazione della Regia.

## 2. Repository, working tree e stato UI V2.1

### 2.1 Stato effettivamente osservato

| Verifica | Risultato |
| --- | --- |
| Branch e HEAD | **VERIFICATA**: `work`, `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`. Commit di merge PR #8, genitori `d77b8aa…` e `217629c…`. |
| Working tree iniziale | **VERIFICATA**: `git status --porcelain=v1` vuoto, nessuna modifica preesistente o file non tracciato. |
| Worktree locali | **VERIFICATA**: un solo worktree elencato, `/workspace/SerieN` su `work`. Nessun checkout/reset/merge/rebase eseguito. |
| Remoto effettivo | **VERIFICATA**, lettura `git ls-remote`: `refs/heads/main = f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`; `refs/heads/codex/ui-v21-visual-parity = 217629c970c691c201ee8b1778b49c24bcff684d`. Coincidenza HEAD/main osservata, senza fetch o aggiornamenti delle refs. |
| Tracking locale | **VERIFICATA**: `origin/main` locale punta ancora a `618f538`; è obsoleto e non viene usato per dedurre lo stato remoto. `work` non è il branch di sviluppo scenografico già autorizzato. |
| Concorrenza | **VERIFICATA** assenza di modifiche locali visibili ai checkpoint; **NON VERIFICABILE** assenza assoluta di collaboratori, processi futuri o lavoro remoto non pubblicato. Nessun lock editoriale è stato acquisito. |
| Dipendenze | **VERIFICATA**: `three 0.163.0`, `esbuild 0.25.12`; package e lock coerenti. Node locale `v24.19.0`, npm `11.9.0`. CI dichiara Node 22. Nessuna installazione/variazione. |

Le regole `AGENTS.md` sono state lette. La richiesta specifica limita questa fase ad analisi e report, vieta push e interventi sulla UI: perciò **non si aggiornano PROGRESS/UI STATUS, non si crea un commit, non si pubblica un checkpoint e non si avvia la fase successiva**. La baseline SHA sopra non è un nuovo commit M0.1.

### 2.2 UI: codice integrato e documenti storici

**VERIFICATA**: il checkout include la UI V2.1 e il coordinamento HUD/camera mobile del commit `217629c`, confluiti nel merge #8. Gli entry point attivi sono `mountDock`, `mountShell`, `mountSidebar`, `mountViewportOverlays`, `mountTrainDeck`, `mountTrainManagement`: `app.js:1`, `app.js:693`, `app.js:698`, `app.js:839`.

**VERIFICATA**: `docs/_active/ui-v21/STATUS.md:3` e `README.md:3` riportano ancora PR #8 Draft/review pending e main precedente. Sono documenti anteriori al merge osservato, non una descrizione aggiornata delle refs. Non sono stati corretti in questa fase.

Report disponibili: `FONT_PREFLIGHT_REPORT.md`, `U1_ASSET_STAGING_REPORT.md`, `U2_REPORT.md`–`U9_REPORT.md`, `REL001_REPORT.md`, `REL002_REPORT.md`, `RC_PREMERGE_REPORT.md`, `VISUAL_PARITY_REPORT.md`, oltre a `STATUS.md` e `README.md`; il filesystem contiene inoltre piani, inventari, contratti e ricevute. Per lo stato attuale sono stati consultati PROGRESS, STATUS/README, il rapporto Visual Parity e le ricevute dell'hotfix; non è stata ripetuta una revisione integrale di tutte le microfasi storiche. Il riferimento più recente per l'hotfix è `evidence/HUD_CAMERA_HOTFIX/README.md`, con 254 test Node, 9 JMRI e 11 gruppi browser **storici** documentati. Non si trasforma quel PASS tecnico in un'approvazione estetica o un test V06.

**VERIFICATA**: la build M0.1 produce 1.092.265 byte, SHA-256 `1ac2022b781311ca3fcc03e6373a55fc56c45eabd714c56694e7107d12352378`, identico alla baseline documentata dell'hotfix. **NON VERIFICABILE in M0.1**: stato del sito pubblicato, esito deploy, accettazione indipendente Regia e comportamento UI sul browser corrente; non sono state eseguite nuove prove visive.

## 3. Architettura attuale e autorità ferroviaria

### 3.1 Rendering e caricamento

| Responsabilità | Implementazione verificata | Implicazione per V06 |
| --- | --- | --- |
| Bootstrap scena | `app.js:45` crea Scene, camera prospettica, fog, WebGLRenderer; `app.js:51`–`59` configura ombre, colore, tone mapping e presentazione. OrbitControls a `app.js:60`. | Riutilizzare scena, camera e renderer. Non serve un viewer separato. |
| Scena procedurale | Base 1500×700 a `app.js:126`; `addRail` a `app.js:164`; edifici legacy a `app.js:250`; `enrich()` a `app.js:693`. | La scena non proviene da un unico GLB o da un manifest configurabile. |
| Scenografia estesa | `src/scenery.js:57` costruisce stazione/banchina, `:66` zone, `:68` diorama; `src/diorama.js:104` costruisce terreno e vegetazione; `src/railway-works.js:3` opere/ponte. | La selezione V06 deve intervenire sui punti di costruzione, non nascondere indiscriminatamente l'intera scena. |
| GLB attualmente usati | `src/train-assets.js:2`, `:12`, `:29`: GLTFLoader per sei modelli Kenney in `assets/kenney/`, cache Promise, fallback, release/dispose. | È un manager per rotabili, non uno scene loader generico. Gli asset in `asset-library/` non sono automaticamente caricati dal runtime. |
| Trasformazioni rotabili | `src/train-assets.js:121`–`139`: clone, ricentraggio, fit dimensionale, rotazione Y π/2, quota; `src/asset-placement.js:1`. | Non usare `attachTrainAsset()` per la scenografia: altererebbe origini e misure del masterplan. Riutilizzabile il GLTFLoader, non questa pipeline di adattamento. |
| Batching statico | `src/scenery.js:69`–`97`: traversa tutta la scena, esclude instancing/dynamic/switchId/trainId; trasforma in world space e non-indexed, raggruppa per materiale/ombre, rimuove gli originali. | Rischio verificato per visibilità, ID e memoria. Il batching può comprendere i binari statici insieme ad altri oggetti; non è disponibile un gruppo ferroviario completo da spegnere a posteriori. Non applicarlo ai moduli V06. |
| Profili grafici | `src/quality.js:1`–`58`; `app.js:710`–`720` imposta DPR, ombre e `scenic.setQuality`; `src/diorama.js:255`–`263` commuta chiome/conifere. | Non esistono LOD/profili specifici per V06; la sola riduzione DPR non riduce 18,6 milioni di triangoli. |
| Presentazione | `src/presentation.js:33`–`67`: rendering diretto ordinario, Cinema con SSAO/bloom/output e pass aggiuntivi. | Costi multipass da misurare; niente Cinema come primo profilo di prova. |
| Lifecycle | `app.js:737`–`774` dispone controlli, effetti, train assets e risorse GPU deduplicate. | Un futuro loader scenografico deve integrarsi con questa uscita e gestire anche risultati asincroni tardivi. |

### 3.2 Railway Core: punti da preservare

**VERIFICATA**: il grafo autoritativo deriva da `src/canonical-layout.json:1`, importato da `src/network.js:1`. `createNetwork()` (`:18`) ricostruisce archi, nodi, controller e tre circuiti; `validateNetwork()` (`:58`) verifica geometria e connessioni. Il JSON registra trasformazione XML, riconciliazioni, fonti JMRI/PDF, 75 archi, 70 nodi, 4 terminali. Il sorgente geometrico è `docs/jmri-layout/source.xml`; rigenerazione descritta in `scripts/build-canonical-layout.py`. Nessun dato V06 può sostituirlo in questa fase.

**VERIFICATA**: 75 percorsi × due profili di rotaia generati da `app.js:184`–`203` danno le **150 mesh ferroviarie di costruzione** protette dalle regole. Il batching successivo può accorparle: 150 non è una misura dei draw call o degli oggetti rimasti nel renderer.

| Funzione operativa | File e simboli verificati |
| --- | --- |
| Posizione e orientamento | `src/simulation.js:2` `Journey`; `:10` `locate()` interpola l'arco e deriva `angle = -atan2(...)`. `src/railway-state.js:7` `layoutFor()` e `:13` `vehiclePositions()` mantengono offset/identità di ogni veicolo. |
| Scambi e due WX310 | `app.js:285`–`286` crea otto stati; `src/turnout-routes.js:3` elenca Y-IN, Y-R1, Y-R2, Y-3, Y-4, Y-2, WX-A, WX-B. `createTurnoutModel()` (`:8`) legge porte/percorsi canonici. Ogni WX ha upper/lower/down/up, non una singola diagonale grafica. |
| Itinerari | `src/simulation.js:60` `routing()` filtra requiredState/unit e rifiuta ambiguità; `Journey.extend/ensure/move/reconcile` (`:20`, `:31`, `:42`, `:49`) conserva storia e ammissione. `src/next-switch.js:14` `createSwitchTopology()` e `:56` `traceJourney()` osservano gli stessi percorsi. Non si deducono itinerari dalla mesh GLB. |
| Azionamento protetto | `app.js:458` `requestToggle()` → `src/turnout-commands.js:8`: ID/origine/stato validati, sicurezza riletta per richiesta, blocco se dati mancanti/occupazione, riconciliazione Journey solo dopo azione ammessa. |
| Collision prevention e movimento | `src/railway-step.js:18` `stepRailway()` prepara proposte sincrone a 1/60 s, guard e swept envelopes; `:61`–`89` confronta treni e carri sganciati. `src/railway-guard.js:6` esplicita unità mm/secondi. `src/railway-conflicts.js` contiene le predicate geometriche. **Non è un sistema di collisione con edifici/terreno/portali.** |
| Manovre | `src/fleet-commands.js:7` mantiene velocità, inversione, stop individuale/globale, luci; `:27` e `:39` sgancio/aggancio a treno fermo, matching sul percorso e ingombro. Cablaggio `app.js:564`–`565`. |
| Aggiornamento grafico | `app.js:508` `renderVehicles()` applica pose canoniche, quote esistenti, animazione ruote e veicoli sganciati. `:530` `advanceFleet()` invoca il core; RAF `:777`–`827` aggiorna core, UI, scena e render. `FixedClock` a `src/simulation.js:83`. |
| Mouse/touch | `src/turnout-interaction.js:42` monta pointer intent, soglie drag, cattura/cancel, distinzione HUD/canvas (`:65`), selezione treno e comandi protetti (`:106`). Nessuna nuova scorciatoia che aggiri i guard. |
| Picking e occlusioni | `src/turnout-picking.js:42` crea superfici CPU indipendenti non aggiunte alla scena; `:68`–`75` raycast ricorsivo della scena per occlusioni e treni; `:29` ignora superfici invisibili/pickThrough. Mesh scenografiche possono coprire comandi e appesantire questo percorso. |
| HUD e minimappe | `app.js:475`–`488` legge `deriveSwitchAssistance`; `:698`–`709` collega deck/TM/HUD; `:840` sidebar. `src/train-deck-state.js:31`–`38` deriva mappa e marker da network/Journey; `src/train-deck.js:13` e `src/ui/sidebar.js:83`–`88` usano quella geometria. |

**INFERITA**: l'isolamento esistente del core rende possibile cambiare presentazione scenica senza riscrivere simulazione e UI. **NON VERIFICABILE** che l'intero pacchetto sia innocuo: il core evita collisioni fra veicoli ma non impedirebbe a un treno di attraversare una montagna importata fuori allineamento. Servono controlli di sagoma separati, senza introdurre nuova fisica.

## 4. Pacchetto: accessibilità, inventario, integrità

### 4.1 Accesso effettivo e limiti

**VERIFICATA**: Google Drive è accessibile tramite il connettore autenticato. Cartella fornita: `https://drive.google.com/drive/folders/1jtxcuVzYZ2EESRySKLBVzEB0r7Sj6wT3`, nome restituito `SERIE_N_V3_SCENARIO_V06_V1`.

Sono stati letti integralmente i sei JSON richiesti e il rapporto; per i JSON i byte recuperati dal connettore sono stati decodificati senza riscrivere la formattazione. Il rapporto è stato anche recuperato raw per controllarne il checksum esatto.

| Documento | Drive ID | Verifica effettuata |
| --- | --- | --- |
| `scene_manifest.json` | `1wjpWfFwvorgs8H4LcJrJ1EiwEV0kzHe4` | 14.262 byte; inventario, dipendenze e SHA letti; auto-checksum incoerente (§4.3). |
| `coordinate_system.json` | `15BhqV_p_UMHSPLacZbV9ZOTQC4pLUVzZ` | 2.167 byte, hash concordante. |
| `object_inventory.json` | `1nwaU09WPDZ5HL3fYAkrchkll5LU7ClnH` | 118.236 byte, hash concordante; 41 oggetti game, 12 record source-resolution, 462 alberi. Gli ID ripetuti fra profili sono alternative, non duplicati da caricare. |
| `railway_alignment.json` | `14Hb5zkGRUZaQMSbqGTCEVdAQe5hEW7DP` | 85.535 byte, hash concordante; 79 pezzi, 615 vertici d'asse, 5 scambi semplici, 2 WX, 3 paraurti. |
| `asset_dependencies.json` | `1aPZbEPEsHcrlu-izWyfMEwe6Ctwic1W6` | 52.640 byte, hash concordante; 56 immagini sorgenti dichiarate esistenti, nessuna linked library. I percorsi del computer dell'esportatore non sono percorsi presenti in questo ambiente. |
| `validation_report.json` | `1nOu_KXw5Zp0lsjsUxkPKWbxrZf8n2kVy` | 28.912 byte, hash concordante; 19 statistiche GLB. È validazione dell'esportatore contro il proprio sorgente, non contro questo checkout. Il confronto visivo reimport riporta `NON_VERIFICABILE`. |
| `EXPORT_REPORT.md` | `1Kjl3s5rgrXrzZ59CWDhk83Q7SjmF0HyB` | 28.926 byte raw; contenuto letto, hash differente dal manifest (§4.3). |

**VERIFICATA**: elenco diretto della cartella `modules/` con 13 file e dimensioni coerenti con il manifest. Nessun V06 era presente nel checkout prima dell'audit. I soli binari materializzati per campionamento sono montagna, massi, portali e riferimenti tecnici: **40.491.528 byte complessivi**, in area di lavoro/allegati, mai in `assets/` né nella scena applicativa. Non sono stati scaricati full scene, varianti source-resolution o l'intero pacchetto da 1,19 GB.

**Limite esplicito — NON VERIFICABILE**: il binario `railway_visual.glb` da 40.139.988 byte supera il limite di materializzazione del tool (32 MiB). È stato ottenuto il riferimento raw e tentato un prelievo limitato al prefisso, terminato con `URLError`; nessun byte GLB ferroviario locale ispezionato. Sono analizzati inventario, statistiche, nodi dichiarati e allineamento, non il suo buffer binario. Non si dichiara un checksum ferroviario verificato. La lettura binaria resta un gate prima di qualunque uso futuro A/C.

### 4.2 Inventario dei moduli game

Dimensioni **VERIFICATE** fra Drive e manifest. Triangoli/istanze **VERIFICATI come valori del `validation_report.json/statistiche`**, non come misure nel renderer. Solo per i massi il conteggio espanso è ricalcolato anche dal parser reale.

| Modulo | Byte | Triangoli espansi dichiarati | Istanze | Contenuto e controllo binario M0.1 |
| --- | ---: | ---: | ---: | --- |
| `terrain` | 41.022.828 | 583.765 | 0 | Quattro tiles e base; solo metadati. |
| `mountain` | 16.779.656 | 360.761 | 0 | Fixed+C1/C2/C3; **binario e SHA verificati**. |
| `mountain_rocks` | 6.179.932 | 3.179.222 | 643 | **Binario, SHA, EXT e parser verificati**. |
| `tunnels_portals` | 17.432.076 | 125.000 | 0 | P1/P2/P3, pareti, volta, setto; **binario e SHA verificati**. |
| `station_platform` | 16.690.996 | 24.874 | 0 | E1/E2; solo metadati. |
| `village_buildings` | 91.596.468 | 1.093.527 | 0 | E3/E5/E6/E7/E8; solo metadati. |
| `railway_service_buildings` | 36.688.380 | 476.467 | 0 | S1/S2/S3; solo metadati. |
| `sawmill` | 59.400.628 | 1.567.363 | 0 | E4 e piazzale; solo metadati. |
| `scenery_details` | 5.005.664 | 28.732 | 0 | Muri/recinzioni/arredi; solo metadati. |
| `gardens_allotments` | 5.601.128 | 1.353.606 | 9.282 | Orti/fiori/siepi; solo metadati. |
| `vegetation` | 27.913.720 | 8.863.252 | 138.899 | Include **137.931** istanze di erba, non 138.899 di sola erba; solo metadati. |
| `railway_visual` | 40.139.988 | 970.193 | 0 | Rotaie/traverse/massicciata/dettagli; nessuna logica; limite binario sopra. |
| `technical_reference` facoltativo | 99.864 | 3.182 | 0 | Assi nascosti/vano/accesso; **binario e SHA verificati**. |

Totali ricalcolati **VERIFICATI sui metadati**: 12 moduli ordinari **364.451.464 byte**, **18.626.762 triangoli espansi**, **148.824 istanze**; con il riferimento tecnico **364.551.328 byte** e 18.629.944 triangoli. Distinguere MB decimali e MiB. Il manifest elenca 39 file, 1.188.903.406 byte complessivi; la somma fisica completa non è stata riscaricata/verificata. `scene/full_scene.glb` è alternativa di QC; le cinque varianti source-resolution sono mountain/railway_visual/sawmill/terrain/village_buildings. Nessuna va sommata alla variante game equivalente. `roads_paths.glb` non esiste: strade e sentieri sono nelle texture di terreno/montagna, come documentato dall'export.

### 4.3 Struttura GLB, dipendenze e versionamento

**VERIFICATA sui quattro campioni**: header GLB versione 2, lunghezza coerente, chunk JSON+BIN completi, bufferView entro buffer dichiarati, nessun URI esterno di immagine/buffer, generator `Khronos glTF Blender I/O v5.2.41`. Non è una validazione completa Khronos: non sono stati controllati tutti gli invarianti di ogni accessor/materiale dell'intero pacchetto.

**VERIFICATA**: `MOD_mountain`, `MOD_tunnels_portals`, `MOD_technical_reference` e `MOD_mountain_rocks` hanno trasformazione root identità; gli oggetti montagna hanno geometria in coordinate globali, i portali hanno traslazioni locali già esportate. P1 ad esempio è a `[1.125715…, 0, 0.071520…]` metri: non riapplicare l'origine dell'inventario al nodo. I campioni conservano `extras.sn_id`, categoria/modulo e riferimenti C/P.

**VERIFICATA**: `mountain_rocks` usa `EXT_mesh_gpu_instancing` su due nodi TRS, 310 e 333 istanze, senza dichiararla in `extensionsRequired`. Il caricamento con un loader che la ignorasse potrebbe mostrare solo prototipi: vietata degradazione silenziosa. La disponibilità dell'estensione va validata anche a runtime (§7).

**VERIFICATA nei documenti; NON VERIFICABILE globalmente nei byte**: immagini PBR metallic-roughness incorporate PNG/JPEG, nessuna dipendenza esterna dichiarata; le immagini del `.blend` sono descritte come presenti sul sistema sorgente, non nuovamente verificate lì. Esistenza di `previous_manifest.json` osservata nel listing; contenuto non usato come baseline corrente.

**VERIFICATA**: il manifest include dipendenze `load_together` fra terrain/mountain/mountain_rocks/tunnels_portals/railway_visual e fra station_platform/railway_visual, motivate da bordi/sedimi adiacenti. Sono dipendenze geometriche/compositive, non URI glTF da scaricare automaticamente. **INFERITA**: con opzione B vanno soddisfatti gli stessi bordi rispetto alle rotaie canoniche; non è corretto cancellare quella dipendenza e presumere gli incastri validi.

Problemi di integrità riscontrati su byte esatti:

| File | SHA-256 nel manifest | SHA-256 recuperato | Stato |
| --- | --- | --- | --- |
| `metadata/scene_manifest.json` | `8a3c009bc0f72390cba00f231b7626fd7d3191a210678d29ca954cfde8371ff3` | `234d93ac089d1c23a1c07c9e35160cc1e78608ad27ff0753986e97a77648c6c2` | **VERIFICATA discrepanza**. Non usare un auto-hash dell'intero file come radice di fiducia. |
| `EXPORT_REPORT.md` | `102b04f5d712f8f4a9f9fb357c1a829d69fe8d543b5b76dfa5373415b59bd1e1` | `68df4c4a97d254ea82d6c3f86df969a47222edc0223a6659041106972376c772` | **VERIFICATA discrepanza** anche sul download raw di 28.926 byte; non è attribuita alla conversione testuale del connettore. |

Gli altri cinque JSON e tutti e quattro i GLB campione corrispondono. **NON VERIFICABILE** la causa delle due discrepanze: possibile ordine di generazione/aggiornamento, non dimostrato; non si conclude che i binari siano corrotti. Conservare le evidenze originali e ottenere una revisione del pacchetto/lock approvata. Non rigenerato o corretto alcun asset o manifest in M0.1.

**INFERITA, proposta di riproducibilità**: lock esterno immutabile, separato dai byte dell'export, con package ID/revisione, hash del manifest originale, SHA della baseline canonica, profilo game, trasformazione ammessa, URL di delivery versionata, byte e SHA di ogni file selezionato, ID semantici e dipendenze. Un checksum detached del lock evita auto-riferimenti; nessun timestamp/Drive modifiedTime sostituisce SHA-256. Prima del trasferimento definitivo verificare tutti i file selezionati, non solo i campioni; conservare approvazione e provenienza dei materiali senza alterare i sorgenti.

## 5. Coordinate e geometria: risultati del confronto

### 5.1 Assi e unità

**VERIFICATA**: `coordinate_system.json/gltf/from_plan` dichiara `(x,y,z) = (X,Z,Y)/1000`. I 615 vertici dell'allineamento confermano la conversione plan→glTF per X/Z entro circa `2,3e-13 mm` di arrotondamento floating point. L'asse Y glTF è verticale; origine dichiarata nell'angolo posteriore sinistro della base, quota zero sulla faccia superiore.

**VERIFICATA nel gioco**: non usa metri. `canonical-layout.json/transform` definisce `x=10*(xml.x-30.3); z=10*(xml.y-99.3)` in mm; `src/railway-guard.js:4` lo esplicita. Base 1500×700, camera e distanze sono dell'ordine di centinaia/migliaia (`app.js:126`, `src/navigation.js:4`). Il riferimento `master-plan-v1.json` invocato dall'export non risulta un file del checkout e non è la fonte runtime (`src/network.js:1`).

Pertanto l'adattamento unitario necessario, **dimostrato ma non applicato**, è:

```text
p_game_mm = diag(1000,1000,1000) * p_gltf_m
(x,y,z)_game = (X,Z,Y)_PLAN_MM
```

**INFERITA, proposta**: una sola scala uniforme positiva 1000 sulla root scenografica di integrazione, mantenendo identiche le root MOD e i loro figli. Non è una scala artistica, né una seconda scala N: **mai 1:160**, mai ricentraggio, rotazione π/2 dei rotabili o nuova riflessione. La matrice PLAN_MM→glTF scambia due assi e ha determinante negativo rispetto al sistema PLAN; questo è già incorporato nell'export, non giustifica una scala negativa su GLB→gioco. Non convertire l'intero simulatore in metri.

**VERIFICATA**: base runtime e inventario V06 sono entrambi 1500×700 mm. La discrepanza storica **1450 vs 1500** è mantenuta come decisione D00 aperta nel documento, senza correggere base, tracciato o export. Coincidenza della base non significa coincidenza dei binari.

### 5.2 Disallineamento ferroviario concreto

| Dato | Canonico runtime | Pacchetto V06 | Esito |
| --- | --- | --- | --- |
| Fonte | `canonical-layout.json`, source XML SHA `30790d01…` | `railway_alignment.json/master`: `track_centrelines_mm.json`, SHA `b52b7321…` | **VERIFICATA** diversa provenienza. Hash di file di formato diverso, da soli, non provano il disallineamento: i riscontri geometrici sotto sì. |
| Rete | 75 archi, 6 scambi semplici, 2 WX, 4 terminali | 79 pezzi, 5 record di scambio semplice, 2 WX, 3 paraurti | **VERIFICATA** differenza di struttura/inventario; pezzo e arco non sono equivalenti, nessun mapping ID fornito. |
| WX-A, assi orizzontali | X **378…688**, Z 68/101 mm | Hosts 59/60: X **409,659…719,785**, Z 68,018/101,032 mm | **VERIFICATA** traslazione relativa di circa +31,7 mm in X, non tolleranza submillimetrica. |
| WX-B, assi orizzontali | X **812…1122**, Z 35/68 mm | Hosts 61/62: X **781,810…1091,936**, Z 35,005/68,018 mm | **VERIFICATA** differenza di circa −30,1 mm in X. Una sola traslazione X non può correggere entrambi. |
| Quota sommità rotaie | Profilo massimo Y **5,95** mm: `src/rail-profile.js:3` | Piano del ferro dichiarato **8,40** mm | **VERIFICATA** differenza nominale **2,45 mm**. Non traslare scena o treni per compensarla senza contratto approvato. |
| Offset rotaie dall'asse | ±4,5 mm: `src/rail-profile.js:23` | ±4,725 mm: `railway_alignment.json/master/rule` | **VERIFICATA** diversa convenzione del profilo/offset; non presumere intercambiabilità della sezione. |

Confronto numerico riproducibile effettuato: per ciascuno dei **615 vertici** degli assi esportati, distanza minima euclidea nel piano dal più vicino segmento di qualunque arco canonico. **VERIFICATA**: mediana **11,269 mm**, p95 **75,913 mm**, massimo **150,519 mm**; **526/615** oltre 2,5 mm e **433/615** oltre 5 mm. Il valore 2,5 mm è un riferimento alla tolleranza di riconciliazione del canonico, non un'approvazione per scenografia o rotaie.

Limiti del confronto: non è una corrispondenza piece→edge, non certifica continuità/Hausdorff, usa i vertici esportati e può trovare un binario vicino diverso da quello voluto. È una prova sufficiente di non coincidenza del pacchetto non trasformato nelle unità corrette, non un calcolo di correzione ottimale. Non sono state cercate o applicate trasformazioni artistiche, deformazioni o riallineamenti.

**VERIFICATA**: i nodi ferroviari dichiarati sono aggregati globali (`RAIL_rails`, `RAIL_sleepers`, `RAIL_throw_bars`, `RAIL_base_plates`, ballast aperto/galleria, buffer stops). L'allineamento non fornisce ID canonici WX-A/WX-B/Y-* per singoli elementi animabili. **INFERITA**: anche a geometria coincidente servirebbe un contratto di mapping degli aghi; accendere due diagonali statiche non sincronizza uno scambio operativo.

### 5.3 Origini, bbox e sagome scenografiche

**VERIFICATA nei metadati**: ingombro totale dichiarato 1500×700, quota −18…83 mm. Bbox montagna PLAN: circa X 1093…1491, Y 8,998…678,334, Z −0,28…75,62. Gli edifici hanno origini semantiche diverse (E1 basamento, E2 banchina, altri tetto principale); non usare un ricentraggio Box3 automatico. Conservare `sn_id` e trasformazioni già applicate.

**VERIFICATA nel GLB portali**: P1/P2/P3 separati, `opening_mm` **103,69 / 40,08 / 68,09**. **NON VERIFICABILE** la sagoma utile per i veicoli canonici nell'intero percorso: larghezza nominale o bbox non prova assenza di intersezioni con archi, tetti, predellini o veicoli in curva. Banchina, rimessa, accessi e terreno sono stati allineati dal produttore a un master differente: ogni zona critica richiede confronto contro gli swept envelopes del gioco. Il report export mantiene inoltre aperte verifiche dimensionali artistiche/di masterplan (E4/E6/E2/S1): non si applicano correzioni M1.1.

## 6. Alternative ferroviarie A/B/C

Le valutazioni di costo/rischio sono **INFERITE** dalle evidenze del §3–5; lo stato geometrico indicato è verificato.

| Criterio | A — GLB ferroviario visuale, core attuale | B — rendering ferroviario attuale, scenografia senza railway_visual | C — ibrido delimitato |
| --- | --- | --- | --- |
| Precisione | Non passa ora: disallineamenti X, quota, offset e mapping mancanti. Treni/arrows/picking resterebbero sul canonico. | Preserva coincidenza treno/binario/HUD attuale. Restano da validare terreno, portali, banchina e ingombri. | Può preservare rotaie canoniche solo se nessuna seconda rotaia occupa lo stesso percorso; dettagli adiacenti devono rispettarne le sagome. |
| Implementazione | Richiede selezione esclusiva, mapping per scambi, rimozione visuale selettiva della ferrovia legacy prima del batching; non basta `scene.add()`. | Più contenuta: mantenere invariata la costruzione ferroviaria; adattare soltanto gestione scenografica e unità. | Contratto esplicito per nodo: es. soli arredi non ferroviari; niente ballast/throw bars/rotaie importate finché non validati. |
| Prestazioni | Aggiunge ~970k triangoli dichiarati se duplicato; eventuale sostituzione non dimostrata più economica. | Risparmia 40,14 MB trasferiti e 970k triangoli del GLB rispetto all'import completo; costo ferroviario attuale resta, totale runtime da misurare. | Dipende dal sottoinsieme; più gestione e rischio di doppie superfici. |
| Sincronizzazione | Stato core deve guidare ogni visuale mobile, senza nuove autorità; asset aggregato non offre quel mapping. | Contratto ferroviario esistente conservato; nessuna sincronizzazione di aghi GLB necessaria. | Un solo proprietario per ogni visuale/stato; vietata deduzione dalla presenza/visibilità dei nodi importati. |
| Manutenzione | Dipendenza forte dalla revisione del tracciato e delle mesh. | Minor superficie di regressione; ogni aggiornamento scenario passa il gate sagome sul canonico. | Matrice per nodo/versione necessaria, rischio di selezioni obsolete. |
| Rischio | Alto e attualmente bloccato. | Il più basso fra i tre, ma non nullo per incastri scenografici e batching. | Medio/alto; da autorizzare separatamente dopo B. |

**Raccomandazione — INFERITA**: **B per M0.2 e come baseline candidata**. Nessun caricamento di `railway_visual.glb`, neppure nascosto in attesa: evita sia doppioni sia occupazione di memoria non necessaria. Conservare 150 profili ferroviari di costruzione, scambi, picking, frecce e core.

**A: NO-GO tecnico nell'asset corrente**, fino a riconciliazione col canonico, ispezione binaria, quota/sagoma e mapping di tutti gli otto dispositivi. **C** ammissibile soltanto in una futura proposta con whitelist di dettagli realmente non conflittuali; non usare ballast V06 per mascherare il disallineamento. Le prove browser devono dimostrare ruote/rotaie, frecce, occlusioni, comandi mouse/touch e visibilità tecnica in entrambi gli stati WX. Nessuna modifica automatica del tracciato è una mitigazione ammessa.

## 7. Fattibilità prestazionale e misurazione

### 7.1 Supporto del loader: risultato reale, con limiti

**VERIFICATA sul pacchetto installato**: GLTFLoader registra `GLTFMeshGpuInstancing` a `node_modules/three/examples/jsm/loaders/GLTFLoader.js:174`; `:1645`–`1785` legge accessor TRS e crea `InstancedMesh` (`:1725`). Non è una supposizione dalla specifica glTF. I campioni di massi sono mesh triangolari statiche, compatibili con questa implementazione; nessun Draco/KTX2/Meshopt è configurato nel loader applicativo.

**VERIFICATA tramite esecuzione offline** di GLTFLoader effettivamente installato su `mountain_rocks.glb`: due mesh istanziate, **310×8.264 + 333×1.854 = 3.179.222 triangoli espansi**; 643 istanze, bbox coerente con i metadati (metri: min circa `[1.094620, .001762, .008855]`, max `[1.491755, .077829, .660445]`). Tutte le sei texture sono state sostituite, nel solo script di analisi, da Texture segnaposto: **nessuna decodifica immagini, renderer, GPU, scena di gioco o immagine V06**. La prova verifica costruzione di oggetti/attributi; **NON VERIFICABILE** draw GPU, corretta resa delle texture, foglie o prestazioni. Nessuna modifica del loader applicativo.

### 7.2 Colli di bottiglia

| Rischio | Evidenza e valutazione |
| --- | --- |
| Geometria espansa | **VERIFICATA nei metadati**: vegetazione 8,86M, massi 3,18M, orti 1,35M triangoli; instancing riduce duplicazione e draw, non il lavoro di vertici/fragment quando tutte le istanze sono visibili. È scorretto contare 148.824 istanze come altrettanti draw call. |
| Culling grossolano | **VERIFICATA nel runtime Three**: `src/math/Frustum.js:79` usa una bounding sphere per oggetto; `src/objects/InstancedMesh.js:75` aggrega tutte le istanze. Nessun frustum culling automatico per ogni singolo ciuffo dentro un batch esteso. **INFERITA** necessità di partizioni spaziali/LOD in una fase autorizzata di ottimizzazione. |
| Ombre e multipass | **VERIFICATA** ombre e Cinema esistenti. **INFERITO** forte moltiplicatore di costo con vegetazione/massi completi; inizio Low/direct render, no ombre per erba/dettagli lontani nella futura policy, prima di valutare Cinema. Non abilitare castShadow su tutti i nodi come fa il manager rotabili. |
| Texture e memoria | **VERIFICATA nei metadati**: 105 immagini, 155.260.569 byte codificati nei moduli; non sono VRAM. Una RGBA8 4096² costa circa 64 MiB, ~85,3 MiB con mip completi: è una stima per formato, non una misura del pacchetto. Tre mappe di quel formato possono arrivare a ~256 MiB. Decode, cache e copie CPU aumentano i picchi. |
| Matrici di istanza | **INFERITA aritmetica**: 148.824 matrici float32 4×4 sono 9.524.736 byte (~9,08 MiB) per la sola array di matrici. Non includono accessor originali, geometrie, colori, materiali, texture né duplicazioni. |
| Trasferimento e parse | **VERIFICATA** taglia di centinaia di MB. **INFERITI** tempi di rete/parse, decode/upload/shader compile e stall sul main thread; non caricare tutti i moduli in un `Promise.all` illimitato. I GLB modulari non producono streaming automatico interno al singolo file. |
| Batching attuale | **VERIFICATA** espansione non-indexed e copie world-space in `enrich()`. **INFERITO** picco inaccettabile se applicata indiscriminatamente a V06, perdita di ID/visibilità/culling. Tenere V06 fuori da quel passaggio. |
| Picking su erba/rocce | **VERIFICATA** raycast ricorsivo globale in `turnout-picking.js:69`; `InstancedMesh.raycast()` (`node_modules/three/src/objects/InstancedMesh.js:154`) itera le istanze. `pickThrough` filtra i risultati dopo il raycast, non evita il costo. **INFERITA** futura selezione di candidati/layers/proxy occulsori mirati, preservando l'occlusione reale; vietato rendere tutti i muri attraversabili per velocizzare. |
| Stall e simulazione | **VERIFICATA** `FixedClock.update()` limita elapsed a 0,2 s (`src/simulation.js:89`); il RAF esegue sia simulazione sia render. **INFERITA** una lunga pausa di parsing può rallentare l'avanzamento rispetto al tempo reale, anche se il passo ferroviario resta protetto. Misurare input latency e avanzamento, non soltanto FPS. |

### 7.3 Strategie future, non implementate

**INFERITE**: caricare prima un modulo, limitare concorrenza a 1–2, separare fetch/parse/upload nelle misure, rinviare vegetazione/orti/massi e non scaricarli in Low iniziale. Profili per modulo con ombre/istanze/LOD, non soli DPR. Per erba, LOD, chunk spaziali o selezione stabile di istanze richiedono autorizzazione dell'ottimizzazione M0.4 e prove di copertura: niente tagli arbitrari del primo N se l'ordine è spazialmente sbilanciato.

Compressione futura: geometrie Draco/Meshopt e texture KTX2/Basis possono ridurre costi diversi, ma richiedono asset derivati versionati, decoder/transcoder e valutazione decode; Brotli/HTTP non equivale a compressione GPU. **NON VERIFICABILE** il beneficio su questi asset senza benchmark. Nessuna rigenerazione o dipendenza aggiunta in M0.1.

### 7.4 Protocollo M0.2–M0.6

**INFERITA, proposta eseguibile**: tre ripetizioni app legacy e candidata sulla stessa macchina, browser, viewport/DPR/profilo, camera, flotta e sequenza di input; run cold/warm distinti, foreground, no devtools invasivi durante il campionamento. Misurare prima il costo di caricamento, poi almeno 60 s di RAF reale desktop e 120 s mobile. Separare SwiftShader da GPU hardware. Snapshot deterministici a pari passi simulati per le invarianti, RAF nativo per fluidità e risposta.

| Metrica | Metodo proposto e limite |
| --- | --- |
| FPS/frame time | Timestamp RAF originale: media, mediana, p95/p99, massimo, frame >50/100 ms; distinguere intervallo frame, durata CPU tick e GPU time. Non sostituire RAF per dichiarare fluidità. |
| Caricamento | Performance marks per manifest, fetch per modulo, parse, decode, primo frame visibile e pronto all'input; Resource/Navigation Timing cold/warm. Per CDN cross-origin serve Timing-Allow-Origin per dati completi. |
| Memoria | JS heap/CDP e trend dopo cicli load/unload, conteggi geometry/texture `renderer.info.memory`, stima buffer e immagini; RSS browser se disponibile. `renderer.info.memory` conta risorse, non byte VRAM. Heap non è memoria totale. |
| Draw call/triangoli | `renderer.info.render` per frame completo, con reset controllato e `autoReset=false` attorno all'intero insieme dei pass; annotare qualità, ombre e numero di pass. Non confondere triangoli inventariati con effettivamente disegnati. |
| GPU time | Timer query WebGL2 se estensione disponibile e non disjoint. Non dedurre tempo GPU da sola durata JS o forzare `gl.finish()` durante la misura ordinaria. |
| Errori | Stato HTTP, errori parser/immagini/estensioni, console/pageerror, hash mismatch, abort e WebGL context lost, con versione/modulo; nessuna credenziale nei log. |
| Desktop/mobile | Viewport 1692×877 e 390×844 più landscape; mouse e touch reali/trusted, orientamento, background/resume, 3–4 treni, stop e scambi durante il caricamento. Emulazione mobile non equivale a dispositivo fisico. |

Riutilizzabili gli strumenti di laboratorio `scripts/performance/build-profile.mjs:1` e `browser-benchmark.py`, che già separano bundle observer e produzione, raccolgono RAF/CDP e frame completi. Non eseguiti né adattati in M0.1; un loro vecchio esito non è un benchmark V06.

**NON VERIFICABILI con le evidenze M0.1**: FPS e frame time V06, latenza rete/parse/upload dell'intero scenario, memoria GPU reale, performance su mobile fisico/desktop target, rendering delle foglie e draw call del nuovo scenario. Nessuna nuova misura browser o screenshot è presentata come eseguita. Il parsing offline e il build non attestano queste metriche. La disponibilità di strumenti browser nell'ambiente non rende questo audit una prova hardware.

## 8. Montagna, coperture e vista tecnica

| Componente | Disponibilità verificata | Policy futura proposta — INFERITA |
| --- | --- | --- |
| Montagna fissa | Nodo/`sn_id` `MOUNTAIN_fixed` nel campione. | Visibile normale, nascondibile tecnica; considerare anche massi e vegetazione sovrastanti. |
| C1/C2/C3 | Tre mesh distinte `COVER_C1/2/3`, extras `removable_cover`. | Toggle indipendente mantenendo geometria/trasformazioni e senza fonderle. |
| Portali P1/P2/P3 | Tre mesh distinte con `masterplan_ref` e opening. | Separabili; prova di sagoma rispetto ai percorsi canonici prima dell'attivazione. |
| Gallerie | `TUNNEL_walls`, `TUNNEL_ceiling`, `TUNNEL_septum_P2_P3`. | In tecnica rimuovere la volta se occludente; pareti/setto configurabili, nessuna rimozione automatica di rotaie. |
| Binari nascosti | Core attuale non dipende da classi V06; `TECH_hidden_track_axes` è sola geometria di riferimento. | Mantenere movimento/occupazione/HUD indipendenti dalla visibilità; gli assi importati non sono autoritativi e sono soggetti al disallineamento. |
| Vano tecnico/accesso | `TECH_Z21_vano`, `TECH_Z21_accesso_posteriore` nel GLB tecnico. | Solo sagome scenografiche, nessuna integrazione o comando Z21 reale. Default spenti. |

**VERIFICATA**: in `technical_reference.glb` il default spento è codificato in `extras.visible_by_default=false`; non è una proprietà standard di visibilità glTF. `GLTFLoader.js:2257` copia extras in `userData`, non assegna automaticamente `Object3D.visible`. **INFERITA**: il futuro adapter deve applicare la policy esplicitamente prima dell'attach; altrimenti i riferimenti tecnici potrebbero apparire nella vista normale.

**VERIFICATA**: esistono `Object3D.visible`, setter di qualità e controlli camera/Orbit/Pan/Follow (`src/view-controls.js:2`, `src/navigation.js:47`), ma nessun controllo corrente per C1/C2/C3 o vista tecnica V06. **INFERITA**: riutilizzare meccanica di visibilità e lifecycle; eventuali comandi UI devono essere una proposta separata. In M0.2 si può usare configurazione diagnostica del laboratorio senza nuovi controlli di prodotto. La vista tecnica non deve cambiare routing, collision prevention, velocità, identità dei treni o minimappe.

La sicurezza camera attuale legge `scenic.cameraHeight` e `scenic.buildings` (`app.js:694`, `src/navigation.js:22`–`30`). **INFERITA** necessità di aggiornare i soli dati di presentazione per montagne/edifici V06: i proxy legacy non rappresentano la nuova montagna. Riutilizzare il controller, verificando Follow e pan prima di dichiarare la scena navigabile; non spostare automaticamente i preset per nascondere errori.

## 9. Architettura minimale, distribuzione, branch e rollback

Le seguenti sono **proposte INFERITE**, non file/moduli già implementati né un obbligo di rifattorizzazione.

| Confine concettuale | Componenti attuali da mantenere | Estensione minima candidata |
| --- | --- | --- |
| Railway Core | network, Journey/routing, stepRailway, guard/conflicts, fleet commands, stato ferroviario. | Nessuna. Snapshot di regressione e hash canonico vincolano ogni scenario. |
| Scene Renderer | renderer/camera/presentation, addRail, renderVehicles, effetti turnout/guarded stop. | Root/provenienza per soli oggetti scenografici; percorso legacy conservato. |
| Asset Loader | GLTFLoader della stessa versione, pattern cache/error/dispose del train manager. | Adapter scenografico dedicato, senza fit rotabili; verifica manifest/lock, dedup, concorrenza, progress/error e teardown. |
| Scene Configuration | Nessuna configurazione V06 esistente. | `legacy`/`v06` al bootstrap; versione/profilo/rootScale 1000, moduli ammessi, policy qualità/visibilità e URL immutabili. |
| Interaction Layer | turnout picking/interaction/commands, HUD, minimappe e UI V2.1. | Inizialmente nessuna nuova UI; successiva whitelist/proxy per raycast soltanto se necessario e verificato. |

### 9.1 Integrazione modulare e confine del batching

Una root `scenarioRoot` separata contiene soltanto V06, con scala unitaria documentata. Ogni modulo rimane riconoscibile e gli extras sono indicizzati per `(packageVersion, profile, sn_id)`; duplicati entro la stessa chiave sono un errore. Preservare E1–E8, S1–S3, C1–C3, P1–P3. Gli ID legacy `house-west`, `factory-east`, `station` ecc. non sono alias automatici degli edifici V06: eventuale tabella di equivalenze deve essere revisionata.

Per il percorso legacy lasciare comportamento e build invariati quando il flag è spento. Nel percorso V06 costruire la ferrovia canonica come oggi e individuare i soli costruttori scenografici da selezionare prima del merge statico. Non identificare binari/edifici dal colore del materiale e non chiamare l'attuale `enrich()` indiscriminatamente sulla nuova scena. Se servono batch separati, la chiave deve mantenere categoria/visibilità/provenienza, senza fondere coperture, portali o ID da preservare. Non è proposta una riscrittura del simulatore.

La scena deve continuare a fornire il contratto oggi consumato dal loop: `setQuality`, `update`, `cameraHeight`, `buildings`, `zones.update`, `station.update`, `environment.dispose`. Per componenti V06 non animate sono possibili adapter no-op espliciti, senza introdurre dati simulativi fittizi. Luci e finestre serali V06 non sono esportate: il controllo giorno/notte può continuare a illuminare il PBR, ma non promette lampioni/finestre equivalenti al legacy senza un'altra fase.

### 9.2 Errori, selezione e rollback

Selezione proposta `scenario=legacy|v06` o equivalente di configurazione, default **legacy**, nessun nuovo controllo UI. Whitelist esplicita del profilo game: full scene/source-resolution non sono candidati del medesimo caricamento, neppure per tentare un fallback. `railway_visual` escluso da B; riferimento tecnico lazy e spento.

Manifest/schema/versione/hash o modulo essenziale non valido: interrompere l'attivazione V06, rilasciare risorse parziali e preservare/ricostruire il percorso legacy senza modificare gli oggetti ferroviari. Risultati asincroni tardivi devono essere ignorati e disposti tramite generation/token del loader; non affermare che esista già AbortSignal nella pipeline di questo GLTFLoader. Moduli decorativi opzionali possono fallire isolatamente, con ricevuta diagnostica. Nessun rifiuto di un asset deve disabilitare STOP o sicurezza ferroviaria.

Il rollback minimo è **ricaricare la stessa build con selezione legacy**; un hot swap durante una sessione non è prerequisito M0.2. Se si mantiene la scena legacy come fallback in memoria durante lo staging, misurare il picco e non lasciarla co-renderizzata. Un semplice `.visible=false` non libera memoria; dispose e ownership devono distinguere risorse condivise con treni/ferrovia. La persistenza di flotta/progetti/depot non entra nel loader scenografico.

### 9.3 Asset delivery

Trasferire selettivamente da Drive in area staging separata, verificare SHA/byte, quindi distribuire tramite percorso statico HTTPS versionato e immutabile. Drive è sorgente di consegna, non URL runtime affidabile: ACL, redirect, MIME, CORS e caching non sono ancora verificati per il sito. Vietato inserire URL firmati, token o account di Drive nel client.

**VERIFICATA nel workflow**: `.github/workflows/pages.yml:3` pubblica su push main; `:45` copia `dist assets ui`, `:48`–`75` una whitelist documentale. Non copia automaticamente `asset-library/` o download di lavoro. In futuro una scelta `assets/scenarios/<version>/` rientrerebbe nella copia di assets, ma aumento dimensione del pacchetto, tempo CI e limiti effettivi dell'hosting devono essere verificati; non sono capacità approvate. Alternativa: origin/CDN statico approvato con CORS e cache/Timing-Allow-Origin. Nessun upload, modifica workflow, uso Supabase Storage o deploy in M0.1.

Conservare legacy e URL/hash della versione precedente per rollback. Ogni aggiornamento scenografico cambia package ID/lock, non sovrascrive silenziosamente la stessa URL; il contratto con canonical SHA e ID semantici viene riverificato.

### 9.4 Isolamento UI

Proposta: branch/worktree futuro **indipendente**, ad esempio `codex/scenario-v06-integration`, da una baseline approvata e riletta dalla Regia. Il nome è una proposta, non un branch creato o autorizzato. Non sviluppare sul worktree UI e non assumere che `origin/main` locale sia aggiornato. Prima della futura creazione verificare SHA remoto, working tree e coordinamento con il responsabile UI. Per M0.1 è stato aggiunto solo questo report in una directory precedentemente assente, senza cambiare branch, PROGRESS, UI STATUS o applicazione.

## 10. Matrice rischi

Probabilità qualitative **INFERITE**, non frequenze misurate. Le evidenze verificabili sono indicate separatamente. Severità: critica blocca correttezza/attivazione, alta blocca qualità o stabilità, media richiede presidio.

| Rischio | Severità | Probabilità | Impatto | Evidenza/stato | Mitigazione/gate |
| --- | --- | --- | --- | --- | --- |
| Assi V06 diversi dal canonico | Critica | Certa per confronto corrente | Treni/frecce fuori dalle mesh, sagome incompatibili | **VERIFICATA**, §5 | B; bloccare A; riconciliare scenario senza mutare il core, con mandato separato se servono correzioni. |
| Scala metri/mm errata o doppia 1:160 | Critica | Alta senza adapter | Scenario 1000 volte piccolo o scala N riapplicata | **VERIFICATA** differenza di unità | Una sola conversione positiva 1000; fixture di base, origine e punti noti. |
| Hash manifest/rapporto incoerenti | Alta | Certa nei file letti | Versione non riproducibile/accettazione ambigua | **VERIFICATA** | Lock detached approvato e verifica integrale dei moduli usati prima dell'attach. |
| Doppie rotaie/full+moduli/source+game | Alta | Media | Z-fighting, memoria/draw inutili | **INFERITA** | Whitelist esclusiva; test su elenco richieste e root. |
| Batching globale distrugge confini | Alta | Alta se riusato invariato | Perdita ID/toggle, ferroviario inseparabile, picchi RAM | **VERIFICATA** implementazione, impatto V06 inferito | Selezione e ownership prima del batching; V06 escluso. |
| GPU/VRAM/parse fuori budget | Alta | Alta sul pacchetto completo | Stalli, context loss, mobile inutilizzabile | **INFERITA**, no benchmark V06 | Caricamento minimo, Low, profili e misure target prima di completamento. |
| Raycast su molte istanze | Alta | Alta con vegetazione completa | Hover/click lenti e UI apparentemente bloccata | **VERIFICATA** percorso, costo inferito | Misurare latenza; selezione candidati/proxy senza perdere occlusione. |
| Portali/terreno intersecano rotabili | Critica | Medio-alta | Aspetto incoerente, visibilità/comandi impediti | **NON VERIFICABILE** nelle sagome complete | Gate swept envelope contro scenario; core non controlla ostacoli scenici. |
| Vista tecnica incompleta | Media | Alta senza policy | Coperture/volta/massi continuano a occultare binari | **VERIFICATA** nodi separati, comportamento inferito | Policy per gruppo; stessi snapshot ferroviari prima/dopo. |
| `visible_by_default` ignorato | Media | Alta senza adapter | Riferimenti tecnici visibili in normale | **VERIFICATA** extras/loader | Applicare policy prima dell'attach; test visibilità. |
| Camera usa proxy legacy | Alta | Media | Camera dentro montagna/edifici, Follow inutilizzabile | **VERIFICATA** contratto, regressione inferita | Adapter height/buildings e prove preset/Follow. |
| Interferenza UI/concorrenza | Alta | Media | Sovrascrittura hotfix/stato documentale | **VERIFICATA** UI integrata e docs arretrate | Worktree dedicato futuro, hash protetti e nessun cambio UI M0.1. |
| Delivery runtime non definita | Alta | Media | 404/CORS/taglie hosting, rilascio non riproducibile | **NON VERIFICABILE** distribuzione V06 | Contratto URL/hash e prova sul pacchetto statico prima di ogni release autorizzata. |

## 11. Piano tecnico proposto per M0.2

**Tutto questo paragrafo è una proposta INFERITA e non autorizzata.** Il primo esperimento è parte di M0.2, non un viewer separato o un cambio del tracciato.

### 11.1 Prerequisiti prima di toccare il runtime

1. Regia approva perimetro M0.2, branch/base e opzione B; prende atto che il master dell'export non coincide con la rete attuale. Nessun mandato implicito a spostare mesh o binari.
2. Concordare lock esterno/revisione dell'export per le discrepanze SHA e verificare byte/hash dei soli moduli del primo esperimento. Il fatto che `mountain.glb` passi il proprio SHA non risolve l'incoerenza globale della versione.
3. Baseline nuova su worktree dedicato: test/build, snapshot network/controller/flotta, screenshot legacy desktop/mobile e configurazione hardware/profilo. Congelare gli input per confronto.
4. Definire esclusione dal batching e proprietà delle risorse. Non iniziare sostituendo l'intero `enrich()` o cancellando le scene legacy.

### 11.2 Primo esperimento minimo

Una sola modifica di integrazione futura, opt-in nel vero simulatore: caricare **`mountain.glb` da 16,78 MB**, senza massi/vegetazione/railway/full/source, in root scenografica con sola scala 1000. Conservare core, treni, rotaie canoniche, UI e default legacy. Nessuna nuova UI; registrare modulo/versione/esito nel laboratorio.

La prova iniziale è **diagnostica**, non una scena completa giocabile: la montagna condivide bordi con terreno/portali secondo manifest. Catturare prima/dopo stessa camera e una vista dall'alto, confermare bbox/origine, ID C1/C2/C3 e separazione dal core. In una finestra deterministica a treni fermi verificare che la montagna non occulti apparati necessari; successivamente verificare transito con i comandi originali. Qualunque intersezione/occlusione anomala fa fallire il gate di attivazione: non si sposta il tracciato e non si nasconde l'errore tramite camera.

**Criteri per il primo attach**: nessun caricamento con flag legacy; un solo modulo con V06; scala/bbox corrette nelle unità del gioco; zero mutazioni di canonical/controller/Journey per il solo attach; zero crash/context loss; fallback se fetch/hash/parse fallisce; dispose delle risorse proprie; controlli STOP e selezione treno funzionanti durante e dopo la prova. L'assenza di portali nella prima prova non è PASS di sagoma gallerie.

### 11.3 Estensione entro M0.2, soltanto dopo i gate intermedi

Ordine proposto: `tunnels_portals` → `terrain` → `station_platform` (E1/E2). Totale con mountain **91.925.556 byte** dichiarati. Validare ogni aggiunta prima della successiva; terreno e stazione non sono stati ispezionati binariamente in M0.1. Se la Regia identifica altri edifici principali, definirne la selezione e il costo prima del download: non caricare automaticamente village da 91,6 MB o sawmill da 59,4 MB.

Scambiare i soli gruppi legacy corrispondenti dopo lo staging valido e la prova incastri; vietato sommare terreno/edifici duplicati e dichiarare integrazione completa. Non trascinare nel caricamento le dipendenze visive ferroviarie del manifest: mantenerne il requisito geometrico e verificarlo rispetto al canonico B.

Per ogni passo: screenshot Overview/top/Station/Follow e dettaglio P1–P3 quando presenti; ricevuta con commit, lock, modulo, SHA, profilo, camera/viewport, metriche, errori, snapshot ferroviario e stato rollback. Prova tecnica con C1/C2/C3 separati e volta nascosta tramite configurazione di laboratorio, senza nuovi controlli UI. Mouse/touch sui due WX e scambi semplici visibili, HUD/route/minimappe, inversione/stop/pause e sagome di loco+carri. Eventuali correzioni scenografiche vengono proposte alla Regia, non eseguite per far passare il gate.

## 12. Quality Gate e microfasi successive

Tutte le soglie sotto sono **proposte INFERITE**, non risultati già conseguiti. Le condizioni irrisolte impediscono la promozione automatica. Nessuna fase successiva è autorizzata da questo piano.

| Fase | Scopo e test | Evidenze e accettazione proposta |
| --- | --- | --- |
| **M0.2** | Primo attach controllato e progressione terreno/montagna/portali/E1–E2; invarianti core/UI e fallback; misure cold/warm e RAF. | Lock e SHA verificati, scala corretta, ID preservati, niente doppioni o errori, screenshot e sagome approvati. Rendering/controlli legacy identici col flag spento. Nessuna attivazione giocabile con intersezioni note. |
| **M0.3** | Verifica dei livelli ferroviari usando B; confronto sagome e quote, entrambi gli stati di tutti gli otto controller, routing WX in entrambe le direzioni, guard/occupazione, interazioni e frecce. | Mapping documentato del master, report differenze per zona/edge, ruote su rotaie canoniche, nessun cambio di network o meccanica. A/C ferroviario restano bloccati finché discrepanze e mapping non risolti sotto mandato separato. |
| **M0.4** | Completamento decorativo e ottimizzazione autorizzata; vegetazione/orti/massi per profilo, culling/LOD/ombre, delivery e memoria. | Metriche con GPU/browser dichiarati; qualità Low sostenibile su mobile target, errori zero, nessun leak crescente dopo almeno 10 cicli pertinenti. Cache/shader warmup distinti da crescita persistente. |
| **M0.5** | Regressione completa: tre/quattro treni, due WX, sei semplici, terminali/runaround, coupling/detached, anti-collisione, STOP individuale/globale, pause/reset/luci; M1/M2/M3 e UI V2.1, camera/HUD/minimappe, mouse/touch, background/cleanup. | Suite Node/JMRI/build e prove browser mirate PASS; snapshot delle identità/occupazioni a pari passi, nessuna regressione o test ferroviario indebolito. Vista tecnica solo presentazione. Prove cloud/Auth live escluse salvo mandato distinto. |
| **M0.6** | Baseline giocabile e QG conclusivo, matrice hardware/dispositivi, revisione rischi, pacchetto riproducibile e rollback. | Regia accetta resa e limiti, tutti i gate chiusi o deroghe esplicite, lock/commit/versione consegnati, procedura di ripristino provata localmente. Pubblicazione/merge restano atti separatamente autorizzati. |

Gate comuni:

- **Funzionali**: zero differenze indesiderate del core nei test deterministici, tutti gli otto controller validi e relativi blocchi, nessuna perdita di funzionalità UI o comandi ferroviari. Hash canonico e domini protetti invariati per fasi scenografiche.
- **Geometrici**: medesimo sistema di unità, base 1500×700 documentata, nessuna doppia scala/riflessione; report delle distanze e delle sagome in tutti i punti critici. La tolleranza numerica sullo stesso asset trasformato può essere ≤0,01 mm; non è una tolleranza di allineamento del master ferroviario. Proposta di limite residuo per eventuali future rotaie importate ≤0,5 mm e tangenti ≤1°, da approvare e subordinare alla sezione/sagoma effettiva; gli scarti attuali non passano.
- **Prestazionali**: approvare hardware e budget prima del verdetto. Proposta iniziale di non regressione p95 frame time entro +15% desktop/+20% mobile rispetto alla baseline equivalente sullo stesso hardware, insieme a un obiettivo assoluto di giocabilità concordato: il solo rapporto percentuale non rende accettabile una baseline lenta. Nessun FPS target è dichiarato raggiunto. Registrare ritardi input, context loss, picchi e stabilizzazione memoria.
- **Visivi**: immagini autentiche dell'app nella stessa configurazione, sia normale sia tecnica, UI/HUD leggibili, portali/ruote/banchine verificati. Nessun screenshot di Blender o della full scene vale come prova del simulatore.
- **Integrità e rollback**: richieste limitate ai moduli selezionati, byte/SHA/versione verificati, fallback su 404/hash/parse, niente riferimenti tecnici in normale, ripristino legacy provato senza modificare dati ferroviari o progetti.

## 13. Verifiche M0.1, limiti e questioni irrisolte

### 13.1 Ricevuta delle verifiche eseguite

| Verifica nuova M0.1 | Esito |
| --- | --- |
| Lettura branch/HEAD/status/worktrees/log e refs remote | **PASS**; read-only, nessuna operazione di storia o pubblicazione. |
| Audit codice e report UI pertinenti | **PASS**; discrepanza docs/stato merge dichiarata, nessun documento UI modificato. |
| Lettura sei metadati + EXPORT_REPORT e listing modules | **PASS accessibilità**; discrepanze hash manifest/rapporto documentate, non occultate come PASS di integrità globale. |
| Quattro GLB campione | **PASS** header/chunk/bufferView/URI e SHA; non validazione Khronos completa. |
| Parser reale EXT sui massi | **PASS limitato**: 2 InstancedMesh/643 istanze; texture segnaposto, nessun renderer/GPU. |
| Confronto allineamento vs canonico | **FAIL di coincidenza**, con 615 distanze e dati WX/quota/offset (§5). È un risultato dell'audit, non un fallimento dei test applicativi. |
| `npm test` | **PASS**, 254 test, zero fail/cancelled/skipped. |
| `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` | **PASS**, 9 test. Nessuna rigenerazione del canonico eseguita. |
| `npm run build` | **PASS**, dipendenze preesistenti; bundle hash identico all'hotfix UI. `dist/` non tracciato, nessun sorgente modificato. |
| Invarianti file | **PASS** al controllo post-analisi: 4.037 file tracciati confrontati con manifest SHA-256 acquisito durante l'audit prima della build, nessuna differenza; `git diff --exit-code HEAD` conferma assenza di modifiche ai file tracciati. Working tree iniziale pulito. Nuovo report esclusivamente in directory scenario dedicata. |
| Browser V06, screenshot, FPS, memoria GPU, mobile fisico | **NOT VERIFIED / NON VERIFICABILE con le evidenze raccolte**; non eseguiti. Nessuna immagine V06 visualizzata nel simulatore. |
| Sicurezza/scope | Nessuna azione su Supabase/Auth/cloud, nessun codice/asset/deps/workflow/UI modificato, nessun push/deploy/merge/commit. Non si dichiara un audit di sicurezza completo né un test OAuth. |

Gli output di analisi e i log sono stati conservati fuori dal repository in area di lavoro; la consegna allegata può includere ricevute, metadati e script di analisi senza binari GLB. Il report contiene già risultati, limiti, fonti e comandi essenziali; non dipende da un viewer o da link firmati effimeri. Le prove storiche UI rimangono tali e non sono attribuite a questa esecuzione.

### 13.2 Questioni ancora aperte

1. Quale relazione geometrica/versione collega il master da 79 pezzi dell'export al canonico attuale? L'affermazione di indici coincidenti col gioco è smentita come equivalenza geometrica dal confronto corrente; serve una tabella piece↔edge controllabile, non un match per posizione approssimata.
2. Come soddisfare bordi terreno/sedimi, P1–P3, banchina e sagoma rimessa con B senza muovere la ferrovia? Qualunque modifica degli asset richiede una fase separata; M0.1 non la autorizza.
3. Qual è la revisione immutabile del pacchetto dopo la riconciliazione degli hash del manifest/rapporto? Non sono verificati tutti i checksum del pacchetto né il binario ferroviario.
4. Quali edifici sono essenziali per la prima baseline e quale budget di caricamento/VRAM è accettabile? Village/E4/S1 sono molto più pesanti di E1/E2.
5. Quali dispositivi/browser/GPU rappresentano desktop e mobile target e quali budget assoluti devono approvare? Nessun dato prestazionale V06 acquisito.
6. È richiesto il funzionamento serale delle finestre/lampioni? L'export dichiara esclusa la modalità serale; non presumere parità con i materiali legacy.
7. Quale delivery statico e quali limiti di hosting/pacchetto si scelgono? Drive come sorgente non risolve CORS/cache/runtime.
8. Come formalizzare D00 1450/1500 senza alterare la base da 1500 già effettiva? Nessuna decisione automatica.
9. Lo stato documentale UI deve essere aggiornato dal suo responsabile dopo il merge osservato? Questo audit non ne assume il mandato.

## 14. Decisioni richieste alla Regia e conclusione

Decisioni prima dell'eventuale M0.2:

1. Accettare **B** come percorso candidato, con **A/C ferroviari sospesi** e geometria canonica intoccabile.
2. Approvare un mandato M0.2 esplicito, limitato al primo esperimento e alla sua progressione a gate, con branch/worktree/base dedicati e invarianti UI V2.1.
3. Definire proprietario e modalità di riconciliazione degli hash e del master scenografico; nessun riallineamento automatico o rigenerazione nell'attuale mandato.
4. Confermare adattamento metri→mm 1000, nessuna scala N aggiuntiva, e criteri di sagoma/allineamento; mantenere D00 aperta.
5. Stabilire hardware, budget assoluti/relativi, edifici prioritari e strategia di delivery prima di estendere il caricamento.

**CONDITIONAL GO**: esiste un percorso tecnico minimo fondato sul loader installato e sulla separazione del core; permangono condizioni di integrità, ownership scenografica, sagoma e prestazioni da chiudere. **Non è un GO alla scena completa né alla sostituzione ferroviaria.** Le differenze del tracciato corrente sono un blocco concreto per A, non un dettaglio estetico.

**M0.1 terminata. Nessuna fase successiva eseguita o autorizzata. STOP: attesa del Quality Gate indipendente della Regia.**

---

## 15. Addendum M0.1-R — migrazione della ferrovia operativa al masterplan AS-BUILT V06

### 15.1 Mandato prevalente e nuova conclusione architetturale

**VERIFICATA — decisione vincolante della Regia in questa sessione:** V06 dovrà sostituire anche gli assi di circolazione e il grafo operativo. Da preservare sono le funzionalità e le regole ferroviarie consolidate, non le coordinate, gli ID, le 150 mesh o la topologia attuali come invarianti della nuova configurazione. Il precedente vincolo di geometria immutabile è superato per la futura migrazione autorizzata; non costituisce un'autorizzazione a implementarla in M0.1-R.

**INFERITA — raccomandazione aggiornata:** adottare **un profilo ferroviario V06 coerente**, dal quale dipendano rete, pose dei treni, scambi, occupazioni, percorsi previsti, picking, HUD e minimappe. Il profilo deve essere associato alla versione della scenografia e alla sua trasformazione. Il vecchio profilo rimane disponibile per rollback e regressione, con i propri dati e riferimenti visuali. Non si usa il vecchio grafo sotto le nuove mesh e non si corregge V06 per adattarlo al vecchio canonico.

Le differenze del §5 diventano **motivazione e misura della migrazione**, non motivo per respingere il nuovo masterplan. Restano invece ostacoli reali: contratto topologico incompleto, continuità/mapping WX da recuperare, versionamento non riconciliato, rendering ferroviario aggregato e assunzioni applicative da adattare.

**Esito vigente: NO-GO all'avvio dell'implementazione V06 con i soli materiali operativi verificati.** È un blocco dei prerequisiti, non una dichiarazione di impossibilità del progetto. La strada proposta riutilizza il motore e richiede prima una consegna verificabile di dati e transizioni (§15.7), poi microfasi separate (§15.10). Nessuna fase di quella roadmap è eseguita qui.

### 15.2 Stato del checkout e nuove fonti esaminate

**VERIFICATA:** branch `work`, HEAD ancora `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`. All'ingresso è già presente il rapporto M0.1 non tracciato in `docs/_active/scenario-v06/`, prodotto nella fase precedente: non è lavoro sconosciuto e viene preservato. Gli altri file tracciati risultano invariati. Nessun checkout, reset, rebase, merge, commit, push o deploy M0.1-R.

Sono stati riletti codice e metadati già acquisiti in M0.1. **VERIFICATA:** la lettura metadata Drive di `railway_alignment.json` restituisce ancora 85.535 byte, modifiedTime `2026-11-12T11:00:54.865Z`; il file locale analizzato ha SHA-256 `6a494928707609f1cf6aa9b535a510ca721b9a3458eca0910dfc250c978f46ea`. Un modifiedTime non prova da solo identità crittografica corrente: non viene dichiarato un nuovo download integrale di tutti i GLB.

La ricerca mirata su Drive ha individuato ulteriori fonti effettivamente accessibili. Sono evidenze progettuali, non istruzioni che autorizzano implementazione o interventi elettrici.

| Fonte | Accesso verificato e contributo | Limite |
| --- | --- | --- |
| [Masterplan 2D V06 PDF](https://drive.google.com/file/d/1UyIsIxQAKf2UOdrpdBv4Zu46kkOalLfr/view) | Metadata: 25.021.219 byte; testo estratto letto. Dichiara PLAN_MM, base 1500×700, piano del ferro 8,4, anelli A/B/C, WX-A/WX-B, Y-IN, Y-R1, Y-R2, T-SEG e fonti `tracciato.pdf`, `track_centrelines_mm.json`, `roadbed_mm.json`, `masks_1mm.npz`. | Non è stato scaricato il PDF raw da 25 MB né ricostruita una rete dalla sua immagine. Le quote progettuali e le prove dinamiche restano esplicitamente da verificare nel documento. |
| [Masterplan 2D V06 SVG](https://drive.google.com/file/d/1zLrS0Lu1AEU5GS2xVim7zui4W5ikEZ-z/view) | Byte raw letti: **3.757.460**, SHA-256 `868751dc5d17885161e7ff1a7dac46d556d2af2dee578c787db80a6f5e489022`. SVG A2, viewBox `0 0 594 420`, 1.118 path, gruppi grafici e testi. | `<metadata/>` vuoto, nessun attributo `data-*` nel file; i path non sono un export di porte/giunzioni. Prima di misurare geometrie SVG servono trasformazioni del foglio e identificazione dei layer. Non si scambia la scala del foglio con millimetri del plastico. |
| [File nativo «3 anelli 3 tronchini 1 Triangolo V3.layout»](https://drive.google.com/file/d/17by8J6xuo-dLkXpWPTrmwMeNii-iixyA/view) | Raw **87.878 byte**, SHA-256 `22b4901a4fa1be323d615f02924083ee803a56a43f749f39a05c9b8533d36fd7`. Header binario `WkSt`. Fonte candidata per il recupero dall'applicazione autore. | Non XML, non ZIP, non plist riconosciuto dal controllo eseguito. Nessuna decodifica delle connessioni effettuata; non è il JMRI XML del vecchio simulatore. Corrispondenza di revisione col V06 da certificare. |
| [Tavola ferroviaria V3 PDF](https://drive.google.com/file/d/17mx-0Wc5BE-Blwegco7WvOv7XDE53027/view) | Testo letto: tipi S/R, EP718/EP481-Y, due WX310. | Distinta e disegno non dichiarano una tabella completa di transizioni operative. |
| [Manuale Serie N V3 Sequenze](https://drive.google.com/file/d/1PrOFO5NY1gQG4uNtnqYTrPwbGxR8oZ77/view) | Testo letto, in particolare distinta 19/20 e checklist 20/20. **68 elementi fisici**, cinque scambi semplici: C07 Y 20-222; C12/C13 #6 SX 20-202; N07/N14 #6 DX 20-203. Due WX310 fisici, C14 e B08, senza contarli due volte fra gli anelli. | È un manuale di montaggio e verifica del plastico, non un algoritmo di instradamento del simulatore. Quantità fisiche, pezzi geometrici e archi del grafo non sono la stessa cosa. Corrispondenza dei codici C/N con gli indici 0–78 non ancora consegnata. |

**VERIFICATA come esito della ricerca, NON VERIFICABILE come assenza assoluta:** ricerche Drive per nome esatto di `track_centrelines_mm.json` e `roadbed_mm.json` non hanno restituito quei file. Le ricerche testuali trovano i loro riferimenti nel masterplan. La cartella del masterplan contiene PDF/SVG, `.layout`, manuale e pacchetto V06; non quei JSON sorgenti. La cartella `Rail` elenca un GLB e un `.blend` Meshy, che non sono stati scaricati né assunti come fonte topologica. Non si inventano percorsi locali o disponibilità di `build_data/` e degli script del produttore.

### 15.3 Matrice comparativa del tracciato: dati certi e corrispondenze mancanti

| Oggetto del confronto | Vecchia configurazione verificata | V06 verificato nei materiali disponibili | Conseguenza per la migrazione |
| --- | --- | --- | --- |
| Fonte attiva | JMRI `source.xml` → generatore → `src/canonical-layout.json`. | Masterplan AS-BUILT adottato dalla Regia; geometrie esportate e sorgenti ulteriori sopra. | **INFERITA:** nuovo dataset operativo derivato da V06 e revisionato, non sostituzione nominale del vecchio JSON con file di schema diverso. |
| Segmenti/archi | **75 archi**: 55 non interni a controller (T0–T50 e 4 WIDEN) + **20 interni** (12 semplici, 8 WX); 70 nodi. | **79 pezzi d'asse**, indici 0–78, **615 vertici**: 44 rettilinei e 35 poligonali. Il manuale conta 68 elementi fisici. | **VERIFICATA:** non esiste equivalenza numerica 75↔79↔68. Numero finale di archi/nodi V06 **NON VERIFICABILE** senza contratto di giunzioni e rappresentazione dei dispositivi. |
| Geometria per arco | `points`, lunghezze/distanze, shape, from/to, sourceIds, ruoli e lane. | `piece`, kind, vertices, length_mm, start/end, centreline PLAN e glTF, hidden_intervals. Nessun from/to con nodeId. | Conservare il riferimento di provenienza di ogni pezzo; nuova segmentazione logica solo dove giustificata dalle porte approvate. |
| Scambi semplici | Sei, ciascuno con porte A/B/C e due archi, stato booleano. | Cinque record `turnouts`; il manuale V3 conferma cinque dispositivi semplici, compresa una Y. | Registro e matrice da approvare. Non conservare un ottavo controllo fittizio per far passare il vecchio codice. |
| WX310 | WX-A/WX-B, quattro porte e quattro percorsi ciascuno, due coppie di percorsi selezionate da un booleano. | Due record con hosts 59/60 + diags 12/13; hosts 61/62 + diags 16/17. Etichette WX-A/WX-B nel masterplan. | Numero di apparecchi confermato nelle fonti; porte, percorsi completi, associazioni stato/ingresso/uscita e gruppi visuali devono essere certificati. |
| Connessioni | `nodes`, `aliases`, from/to, `unit`, `switchId`, `requiredState` e controller.internal espliciti. Due alias a lunghezza zero e raccordi WIDEN documentati nella provenienza legacy. | Estremità coordinate e riferimenti di coppie/hosts; mancano giunzioni dichiarate e alias operativi. | Le vecchie connessioni e gli alias non vanno trasportati per somiglianza di nome o prossimità. |
| Circuiti e itinerari | Tre circuiti numerici lane 0/1/2 ricostruiti a stato normale; WX per trasferimenti, runaround e quattro tronchini. | Anelli A/B/C, schema centrale/triangolo e scalo nella tavola/manuale; nessuna lista ordinata di archi/versi o tabella di itinerari nel JSON. | Associare nomi semantici e percorsi verificati; A/B/C non vengono convertiti automaticamente in lane 0/1/2. Il triangolo non è un alias del runaround precedente. |
| Terminali e fermate | Quattro terminali A67/EB39/EB49/EB52; stop terminale, stop individuale/globale e inversione esistenti. | Tre riferimenti buffer_stop sui pezzi **20, 43, 51**, qualificati come paraurti «dedotti» dall'export; il manuale indica due tamponi N10/N20 e N16 a fine aperta senza respingente. Il mapping fra queste nomenclature non è certificato. | Certificare estremità operative, paraurti effettivi e lunghezze utili. Numero di paraurti non prova da solo numero di terminali o punti di fermata. |
| Ruoli degli archi | 46 mainline, 16 yard, 5 runaround, 2 runaround-main, 2 runaround-alternate, 4 crossover. | Nessuna classificazione equivalente nei record pieces. | Nuovo inventario di ruoli e destinazioni. Non chiamare «runaround» ogni tratto centrale per compatibilità. |
| Piano verticale | Rotaia a Y massimo 5,95 mm; posa rotabili e overlay con offset fissi. | Tutti i 615 punti glTF esaminati hanno Y **0,0084 m**, coerente col piano del ferro 8,4 mm del masterplan. | Motore planare riutilizzabile sotto il requisito di complanarità; visuali e pose richiedono il nuovo contratto di quota. Nessuna rampa V06 è inventata. |
| Tunnel | Vecchia scenografia senza classificazione V06. | Nove pezzi hanno intervalli nascosti: **0, 10, 18, 19, 22, 23, 26, 28, 29**. | `hidden` è visibilità, non disconnessione o esenzione da occupazione/collisione. Non escludere quegli archi dalla circolazione. |
| Rendering | 150 profili di rotaia di costruzione su 75 archi, generazione procedurale e batching. | `railway_visual` aggrega rotaie, traverse, aghi, tiranti, ballast e paraurti; non dichiara un grafo. | Superato il numero fisso 150 per il profilo V06. Una sola ferrovia visibile e operativa coerente; la vecchia rimane soltanto nel profilo legacy. |
| Corrispondenza ID | T*, TO*, Y-*, WX-*, WIDEN, terminali noti. | Indici di pezzo, ID di oggetti scenici, alcune etichette di tavola. | **NON VERIFICABILE** un mapping 1:1. La matrice di migrazione deve consentire nuovo/rimosso/suddiviso/accorpato, con motivazione e revisione umana. |

#### Inventario comparativo degli scambi, senza corrispondenze inventate

**VERIFICATA — vecchi dispositivi e dati da sostituire nel profilo V06:**

| Controller legacy | Fonte e categoria | Centro legacy (x,z), mm | Corrispondenza V06 |
| --- | --- | --- | --- |
| Y-IN | TO0, 20-202, single | 903; 101 | La tavola V06 riusa la scritta Y-IN; equivalenza di porte/funzione e associazione al record non certificata. |
| Y-R1 | TO1, 20-221, single | 335,5; 295 | Etichetta presente in V06; non sufficiente per copiare TO1/connessioni. |
| Y-R2 | TO2, 20-220, single | 876,5; 150 | Etichetta presente in V06; mapping da verificare. |
| Y-3 | TO3, 20-220, single | 1059; 101 | Nessun ID equivalente dichiarato in railway_alignment. Non presumere «rimosso» senza distinta approvata. |
| Y-4 | TO4, 20-203, single | 613,5; 254,5 | Nessun mapping operativo dichiarato; non identificare automaticamente con T-SEG. |
| Y-2 | TO5, 20-203, single | 720; 150 | Nessun mapping operativo dichiarato. |
| WX-A | cross, 20-210 | 533; 84,5 | Candidato: record occidentale hosts 59/60, diags 12/13; nomenclatura da fissare nel registro. |
| WX-B | cross, 20-210 | 967; 51,5 | Candidato: record orientale hosts 61/62, diags 16/17; nomenclatura da fissare nel registro. |

**VERIFICATA — tutti i cinque record semplici V06**, letti direttamente in `railway_alignment.json/turnouts`; non contengono un controllerId, codice di catalogo, nomi delle porte o requiredState:

| Record V06 identificato dai pezzi | Toe PLAN_MM (X,Y) | Dati disponibili | Dato operativo ancora necessario |
| --- | --- | --- | --- |
| 30 / 68 | 1091,936; 101,032 | Un asse curvo, uno rettilineo; dettagli aghi/traversine. | ID, porta comune e uscite, stato normale/deviato, vicini e alias. |
| 31 / 32 | 415,412; 256,772 | Rettilineo + curva. | Stessa tabella di porte/transizioni e associazione alla distinta nativa. |
| 33 / 69 | 905,861; 101,032 | Curva + rettilineo; adiacente al record 30/68 tramite estremità presenti. | Giunzione dichiarata fra apparecchi vicini; non basta scegliere il più vicino. |
| 34 / 35 | 1091,936; 533,208 | **Entrambi gli assi curvi**, coerenti con un dispositivo Y nel repertorio. | Codice/identità e definizione delle due posizioni; non chiamare geometricamente «rettilinea» una delle due curve per supposizione. |
| 41 / 42 | 726,293; 173,667 | Rettilineo + curva. | Porte, stati, connessioni e ruolo nei percorsi centrali. |

**INFERITA:** cinque apparecchi semplici + due WX potrebbero richiedere **sette controller logici**, se ciascun apparecchio ha un solo comando booleano accoppiato. Il conteggio operativo finale dipende dalla matrice di attuazione approvata, non dal vecchio numero otto né dal numero di mesh. Il manuale conferma il conteggio fisico, non tutti i raggruppamenti di comando o la polarità dei nomi `on`.

### 15.4 Verifica di sufficienza dei metadati e delle geometrie

**VERIFICATA sullo schema completo letto:** `railway_alignment.json` ha soltanto master/pieces/turnouts/crossovers_wx310/buffer_stops/visual_nodes/note. I record pieces non hanno nodeId/from/to, connectedTo, ruoli, destinazioni, controllerId o stati. I record degli scambi elencano geometria e particolari costruttivi, non una tabella di transito.

**Conclusione — INFERITA dalle assenze verificate:** il pacchetto fornisce una buona base geometrica e di provenienza, ma **non contiene da solo tutte le informazioni necessarie a certificare un grafo operativo**. GLB, object_inventory, asset_dependencies e scene_manifest non colmano la mancanza: descrivono oggetti/materiali/bbox/moduli e relazioni compositive, non collegamenti di esercizio. `extras.sn_id` è un'identità visuale, non una porta ferroviaria. Il binario `railway_visual.glb` resta non ispezionato nei byte per il limite documentato in §4: nessuna nuova topologia gli viene attribuita.

#### Nuova diagnostica delle estremità V06

È stato effettuato un controllo di sola analisi, senza produrre o collegare un grafo applicativo: raggruppamento delle 158 estremità dei 79 pezzi per **uguaglianza esatta delle coordinate PLAN pubblicate**, arrotondate come nel JSON.

**VERIFICATA:** 85 gruppi di coordinate: 63 con due estremità, cinque con tre, **17 con una sola estremità**. Questi gruppi non sono nodi operativi approvati e le 17 estremità non sono 17 fine-binario reali.

- Otto estremità isolate appartengono alle diagonali WX **12, 13, 16, 17**. Sono segmenti rettilinei a due punti, lunghi circa 250,10 mm, mentre gli hosts sono lunghi 310,126 mm. Per esempio il pezzo 12 termina a `[440,741; 68,203]`, vicino all'interno dell'host 59 che sta a Y 68,018: distanza ortogonale **0,185 mm**, non una coincidenza con la bocca esterna. Gli estremi proiettano a circa 31,082/279,044 mm dall'inizio degli hosts. **INFERITA:** occorre recuperare dove e come il percorso completo raggiunge le porte e quali raccordi geometrici/stati appartengono al WX; non inventare prolunghe o giunzioni al centro dell'incrocio.
- Tre coppie vicine ma non coincidenti sono **27.end ↔ 48.start: 0,749155 mm**, **38.start ↔ 40.start: 0,855250 mm**, **70.start ↔ 71.end: 2,141992 mm**. Sono candidati diagnostici da confrontare col sorgente a precisione piena, non giunzioni approvate.
- Le tre estremità rimanenti corrispondono ai pezzi **20.start, 43.start, 51.start**, prossime ai tre paraurti elencati; ciò non certifica da solo tipo, setback o lunghezza utile del terminale.

Non è corretto importare la tolleranza 2,5 mm della riconciliazione legacy per «chiudere» V06. Non è corretto unire tutti i path che si incrociano: un diamond ferroviario non è un bivio. Raccordi, smoothing o alias futuri richiedono evidenza della connessione voluta, coordinate autorevoli e tolleranze approvate. La validità degli export contro il proprio Blender non certifica queste semantiche operative.

### 15.5 Matrice delle dipendenze applicative: riuso, sostituzione e adattamento

Classi: **R** algoritmo/comportamento candidato al riuso; **D** dati da sostituire per V06; **A** componente da adattare localmente; **H** assunzione da ricertificare. Le posizioni nel codice sono **VERIFICATE**; le azioni proposte sono **INFERITE**, non implementate.

| Area e riferimenti | Dipendenza attuale concreta | Classe e intervento minimo proposto |
| --- | --- | --- |
| Fonte della rete — `src/network.js:1`, `:18`–`26` | Import statico del canonico; `createNetwork()` senza argomenti; archi da metadata, flag `canonical:true`. | **D/A:** selezionare i dati del profilo al bootstrap; mantenere il default legacy per compatibilità. «Canonical» deve significare rete selezionata validata, non obbligatoriamente vecchio XML. Non riscrivere `measured/sample`. |
| Loop — `src/network.js:27`–`55` | `[0,1,2]`, filtri lane e `!requiredState`, attesa di tre cicli non ambigui, limite 200 traversamenti. | **D/H/A:** circuiti V06 con ID/nome, archi ordinati/versi, stato di riferimento e lunghezze. Mantenere l'algoritmo solo se gli anelli V06 soddisfano il contratto; non imporre la chiusura modificando gli assi. |
| Validazione rete — `src/network.js:58`–`66` | Endpoint entro **1e-7 mm** dal nodo, coordinate finite e lunghezza positiva. `measured()` può ricevere anche length dai metadata. | **R/H:** riuso con controllo aggiuntivo di coerenza length/distance, segmenti degeneri, porte e transizioni. L'epsilon non è una tolleranza AS-BUILT; non allargarlo per mascherare i gap. |
| Generatore/CI — `scripts/build-canonical-layout.py:123`–`190`; `.github/workflows/pages.yml:30`–`34` | TO0–TO5, porte A*, WX fissi, WIDEN, raggi 249/282/315, quattro terminali; CI rigenera il vecchio canonico. | **D/A:** conservare generatore e dataset legacy; futura pipeline V06 separata e riproducibile, verificata in CI senza sovrascrivere il nuovo profilo da vecchio XML. Non è lavoro eseguito qui. |
| Costruzione rotaie — `app.js:146`–`203`; `src/rail-profile.js:3`, `:23` | 75 percorsi, rotaie ±4,5 mm e quota 5,95, ballast/sleepers fissi; 150 mesh prima del merge. | **D/A:** assi e contratto di profilo V06; niente doppio binario legacy+V06. Riusare i costruttori soltanto se rendono la geometria approvata, non il vecchio profilo per inerzia. |
| Quota treni/rotabili — `app.js:516`, `:523`, `:526`; `src/rolling-stock.js:17`; `src/train-assets.js:123`–`129` | Quote 3,5/7,1 per gruppi treno, ring 5,2, carri sganciati 3,5; ruote native con bottom locale 2,45; Kenney con fit e offset propri. | **R/A/H:** cinematica/animazioni e dimensioni riutilizzabili; pose visuali derivate dal piano ferro V06 e contatto per tipo di modello. Differenza 8,4−5,95 = **2,45 mm**, non spostamento indiscriminato di ogni mesh. Verificare anche scartamento/contatto ruote. |
| Journey — `src/simulation.js:2`–`58` | Archi orientati, seg.sign, storia in ascissa, tangent sampling ±0,5 mm; ensure max 100, memoria percorso ±500 mm. | **R/H:** stesso motore su nuovo grafo; test di continuità/tangenti e consist lungo più archi, triangolo e inversioni. Limiti numerici da validare rispetto alla nuova segmentazione, non aumentare a caso. |
| Router — `src/simulation.js:60`–`80` | Stato booleano per edge.switchId, requiredState, divieto di attraversare due archi consecutivi con stessa unit, unica uscita valida. | **R/H:** riuso se ogni dispositivo V06 ammette questo contratto; evitare nodi spurii e rami non comandati. Percorsi interni spezzati nella stessa unit verrebbero rifiutati: preferire archi logici porta→porta completi. |
| Elenco scambi — `app.js:285`–`288`; `src/turnout-routes.js:3`, `:8`–`46` | Ordine e whitelist di **otto ID**; selezioni false/true precomputate, nessuna configurazione per sette o altri dispositivi. | **D/A:** registro specifico del profilo con ID consentiti e matrice approvata. Conservare validazione severa e modello read-only; non disattivare isTurnoutId né creare placeholder comandabili. |
| Comandi scambio — `src/turnout-commands.js:7`–`23`; `app.js:458`–`473` | Richiesta panel/device, stato booleano e safety riletta, reconcile dei Journey. | **R/A:** preservare confine unico e sicurezza; adattare il solo registro/lookup al profilo. Stati iniziali da dati V06, non necessariamente tutti false come `app.js:579`. |
| Topologia/Next Switch — `src/next-switch.js:14`–`39`, `:42`–`50`, `:56`–`116` | Controller.internal/ports; fasce di approccio su un solo arco adiacente fino a 30 mm; lane/destinazioni nominate Inner/Middle/Outer; traversal max 256, default 12000 mm. | **R/D/A/H:** percorsi e osservatore riusabili; definire nomi/ruoli V06, copertura delle zone protette rispetto ai nuovi confini degli archi, limiti di scansione. Un tratto corto non deve ridurre la protezione solo perché è stato segmentato diversamente. |
| Guard — `src/railway-guard.js:6`, `:25`–`79`; `src/next-switch.js:132`–`145` | Unità mm/s, maxSpeed 100 e fattore 1,5, accelerazione 45/braking 100; v²/(2a), margin approccio `extent+20+v*.6+v²/200`; cache topologia per network. | **R/H:** conservare regole/frenatura e fail-closed; ricertificare distanze, protezione dell'intero dispositivo, nuovo grafo e occupazioni vicine. Nessuna riduzione di soglie per far entrare i treni. Nuova rete implica nuova cache, non mutazione in-place. |
| Collision prevention — `src/railway-step.js:18`–`89`; `src/railway-conflicts.js:3`–`67` | Same-edge distance + SAT e swept envelope fra veicoli anche su archi diversi; modello **planare XZ**, non dipendente da vecchie coordinate. | **R/H:** riuso sotto requisito di piano unico verificato; nuove prove WX/triangolo/rami convergenti, anche traiettorie incrociate su ID diversi. Non trasformare intersezioni geometriche in giunzioni. Dislivelli reali richiederebbero un mandato ulteriore. |
| Occupazioni/prenotazioni — `src/railway-state.js:23`–`46`; `src/next-switch.js:119`–`129`; `src/railway-guard.js:70` | Intervalli edge/min/max e owner; carri sganciati con Journey congelato. StepRailway accetta reservations, ma `app.js:531` non ne passa un registro. | **R/D:** rigenerare occupazioni sul grafo selezionato; vietato riciclare intervalli legacy. Le prenotazioni virtuali del Depot non sono occupazioni di binario e non vanno collegate al core. |
| Velocità/STOP/inversione/aggancio — `src/fleet-commands.js:7`–`58`; `src/consist.js:4`–`21` | Meccaniche indipendenti dai nomi del binario; match accoppiamento entro 3,5 mm e cos angolo >.98, tail e lunghezze in mm. | **R/H:** preservare comandi e limiti; provare aggancio sui nuovi giunti e rami convergenti con storia del percorso, nessun aumento della tolleranza per compensare gap del master. |
| Spawn/reset — `app.js:349`–`363`, `:490`–`502`, `:575`–`600`, `:618`–`625` | Tre startup loop 2/1/0, frazioni .22/.65/.45; quarto treno su **T47 s=80**, distanza di controllo 120 mm; reset riassegna loop e tutti gli scambi false. | **D/A:** anchor di partenza/inserimento e stati di riferimento V06 approvati, compatibili con front/tail e veicoli già presenti. Non usare un nearest-edge o mantenere T47 se l'ID non appartiene a V06. |
| Giri, missioni, ruoli — `app.js:422`–`426`, `:538`–`555` | Missioni nominano WX-A/B e runaround; mode loop/yard, edge.role, t.loop/previousLane; laps da journey.travel / loops[t.loop].length. | **D/A/H:** associare obiettivi alle manovre realmente possibili su V06, ricertificare lunghezze/contatori e ruolo del triangolo. Non dichiarare che ogni itinerario storico abbia un equivalente fisico 1:1. |
| Picking/hover/touch — `src/turnout-picking.js:4`, `:42`–`75`; `src/turnout-interaction.js:42`–`124` | Mesh CPU da TURNOUT_IDS, quota 6,08 e half-width 12,3; errore se mancano percorsi; raycast scena per occlusioni. | **R/D/A:** gesti/precedenza UI e comando restano; geometrie/ID/quote derivate da V06. La sola sostituzione del JSON con sette controller può far fallire il bootstrap attuale. |
| Glow e frecce — `src/turnout-glow.js:5`, `:101`–`108`; `src/turnout-arrows.js:4`, `:44`; `src/turnout-arrow-approaches.js:6` | Lista ID fissa, offsets di letto/rotaie, height e soglia minima lunghezza frecce; approcci a 600 mm. | **R/D/A/H:** osservazione read-only e animazione riusabili, geometrie e quote coerenti col nuovo dispositivo; evitare arrotondamenti che creino frecce su un ramo vietato. |
| HUD/route preview — `src/next-switch-view.js:7`, `:36`, `:54`–`92`; `app.js:643` | Ribbon a quota 8,4, horizon 1800 mm, schema da paths ma nomi/posizioni da stato; labels straight/diverging. | **R/D/A:** stesso componente e meccanismo, dati V06 e quota sopra il ferro (8,4 non è già sopra una rotaia V06 a 8,4). Le due curve della Y richiedono terminologia verificata, non stato fittizio. |
| Minimap/console — `src/train-deck-state.js:31`–`38`; `src/train-deck.js:13`; `src/ui/sidebar.js:83`–`104`; `app.js:669`–`675` | Path da network, marker da Journey; viewBox fisso 1500×700. Sidebar tiles da controlOrder e selettori `data-switch` (`src/ui/sidebar.js:34`–`43`). | **R/D/A:** stesso layout UI, ma tutti devono ricevere lo stesso network e registro attivi. ViewBox resta compatibile con la base V06 verificata. Niente vecchia SVG statica presentata come rete attiva. |
| Guarded STOP visuale — `src/guarded-stop-scene.js:13`, `:17`, `:32`–`33` | Cerca il terreno legacy per nome/texture; fascia 21 mm e limiti 4…1496/696, ray verticale da Y150; colloca segnali osservando il core. | **R/A/H:** allarme e bell restano motore-dipendenti; nuovo riferimento al terreno/proxy V06, ingombri/occlusioni e costo di ricerca da verificare. Segnale non collocabile non deve disattivare lo stop. |
| Import statici nascosti — `src/zone-layout.js:5`, `src/landscape.js:1`, `src/scenic-plan.js:1` | Leggono direttamente controller del vecchio canonico anche se ricevono un altro network; legacy scenery e clearance con coordinate fisse. | **D/A:** confinare al profilo legacy o passare i dati selezionati. Cercare tutte le importazioni prima di attivare V06; una seconda rete implicita sarebbe una regressione. |
| Camera/scena — `src/navigation.js:4`–`30`; `src/structure-layout.js:1`; `src/scenery.js:69`–`97` | Preset/ponticello/proxy legacy, geometrie statiche fuse senza confini di profilo. | **R/D/A:** riuso controller camera e UI; dati scenici e ownership selezionati. Preservare separazione rotaie/parti mobili, ID e visibilità prima del batching. |
| Train Management/M2/M3 — `src/train-management-state.js:4`–`21`; `src/train-projects.js:52`–`60`; `src/depot-inventory.js:24`–`36`; `src/train-management.js:105` | Composizioni e progetti basati su veicoli/UUID; detachedView espone edge; invalidazione generation sul reset; Depot riserva slot virtuali, non binari. | **R/A:** conservare store e funzionalità. Cambiare profilo invalida riferimenti fisici/Journey e intenzioni pendenti; non trasferire posizioni per UUID o ID di arco omonimo. Nessuna nuova persistenza. |
| Test/diagnostica — `tests/network.test.js:12`–`34`, `:79`; `tests/turnout-routes.test.js:62`; `app.js:869`–`902` | Conteggi 75/70/8/4, raggi, T*/TO*/WX*, 256 combinazioni e spawn diagnostici specifici; fixture 5C e snapshot legacy. | **D/A:** mantenere suite legacy come controllo rollback; suite V06 con verità indipendenti dai nuovi builder, ID/casi approvati. Non cambiare gli expected per nascondere un collegamento sbagliato. |

### 15.6 Assunzioni del motore: cosa rimane valido e cosa deve essere dimostrato

**VERIFICATA — il riuso non implica assenza di vincoli.** Il motore tratta un percorso come un nastro orientato di archi con lunghezza positiva, punti continui e un'unica continuazione autorizzata a ogni giunto. `routing()` non è un motore di ricerca globale verso una destinazione: sceglie la continuazione in base agli stati degli scambi, rifiutando uscite multiple/non note. `traceJourney()` prevede il percorso risultante; non imposta gli scambi. Sono questi i comportamenti esistenti da preservare. Non risulta da questi entry point un dispatcher automatico o un pianificatore di fermate di stazione da dichiarare già disponibile.

**INFERITA — condizioni di riuso:**

1. **Dispositivi e unit:** per scambio semplice o Y, una porta comune e due uscite con matrice normale/inversa approvata; nessuna transizione diretta fra i due rami per «svoltare» nello stesso giunto. Per WX, due posizioni e transizioni complete per ogni porta/verso, oppure dimostrazione esplicita dell'eventuale diversa attuazione. L'incrocio centrale non diventa una quinta porta.
2. **Rappresentazione interna:** se un percorso WX comprende più tratti geometrici, può essere un unico arco logico porta→porta con molti punti. Spezzarlo in archi interni consecutivi con la stessa unit contrasterebbe col divieto corrente; cambiare il router per aggirarlo è seconda scelta e richiede prove specifiche, non una riscrittura generale.
3. **Precisione:** origini, scala e orientamento restano quelli verificati: GLB metri→runtime mm con 1000 una volta sola, nessuna seconda 1:160 o riflessione. È necessaria la precisione del sorgente per giunzioni e tangenti; non arrotondare separatamente nodo e arco, non ampliare epsilon per renderli apparentemente coincidenti.
4. **Piano e curvature:** tutti i punti export sono a 8,4 mm. Sotto questa condizione il modello SAT planare è adatto come candidato; la sola presenza di gallerie non richiede una fisica 3D. Curvature più strette e segmentazione poligonale richiedono prove con carrozza da 165 mm, carrelli, verso, giunti e sweep. Il manuale V3 richiede esplicitamente prova meccanica su R216/WX: non viene trasformata in una prova già passata nel browser.
5. **Rete e ruoli:** tre anelli dichiarati non garantiscono che `!requiredState` li chiuda o che ciascun nodo abbia un'unica prosecuzione. Il triangolo e le zone di inversione si modellano con connessioni e versi reali, senza filtri ad hoc basati su vecchi T*. Raggiungibilità, manovre e cambi di direzione vanno ricertificati. La sezione elettrica LK200 del manuale non autorizza né richiede un controller reale nel simulatore.
6. **Sicurezza:** protezioni degli scambi, ammissione e collision prevention restano indipendenti da luce, frecce o visibilità. Un cambio di topologia invalida tutti i Journey/occupazioni precedenti; schema corretto e allineamento visuale non sono da soli PASS di sicurezza.

### 15.7 Dati necessari e recupero dal masterplan, senza deduzioni non autorizzate

**INFERITA — contratto minimo di consegna per il profilo operativo.** I nomi di campi sotto sono una proposta, non file già presenti né schema già implementato.

| Informazione richiesta | Cosa esiste ora | Fonte/azione precisa per recuperarla | Gate di accettazione |
| --- | --- | --- | --- |
| Identità della revisione | Nome V06 e SHA di export/sorgente dichiarati; due mismatch noti del manifest/rapporto. | Il responsabile del master consegna una distinta di revisione che associa PDF/SVG, `.layout`, JSON geometrici, GLB e relativi SHA. Lock detached senza auto-hash. | Un'unica revisione AS-BUILT approvata; nessun miscuglio di V3/V06 per sola somiglianza. |
| Assi completi a precisione piena | 79 polilinee e 615 punti del JSON; master cita `build_data/track_centrelines_mm.json`. | Ottenere il file raw il cui SHA dichiarato è `b52b732166db502d4d906a5b471bfe4344f6bfdab632514ffc6775102a800ec7` e il processo che lo ha generato. Se non disponibile, export dal progetto autore con precisione e trasformazione dichiarate, poi confronto esplicito con V06. | Copertura di tutti i pezzi, piano 8,4, giunzioni/tangenti certificate, lunghezze coerenti; nessuna interpolazione inventata dei WX. |
| Porte e giunzioni | Coordinate e riferimenti di coppie, nessuna lista di connessioni. | Aprire il `.layout` nell'applicazione autore compatibile e richiedere l'export effettivamente supportato di componenti, porte e collegamenti; non assumere un export JMRI disponibile. In alternativa il responsabile tecnico compila la tabella su master/track data, con revisione incrociata e immagini di prova. | ID stabile di ogni nodo/porta; `from/to` e alias; giunzioni esplicite, crossing senza giunzione, gap spiegati e firmati. |
| Componenti e mappa fra nomenclature | Manuale C01…/N01…/B01…/A01…, export 0…78, vecchi T*/TO*. | Distinta dal progetto sorgente che collega componente fisico, pezzi geometrici, controller nuovo e percorsi logici; vecchi ID solo nella tabella di migrazione opzionale. | Copertura 100%; ammessi split/merge/nuovo/rimosso espliciti, nessun abbinamento nearest-neighbour automatico. |
| Scambi semplici/Y | Cinque record senza ID/stati/catalogo. | Registro approvato con id, tipo/codice, posa, porte e percorsi, stato iniziale; confronto con i cinque apparecchi del manuale e revisione grafica dei toe. | Tavola ingresso×stato×uscita, inclusi tutti i casi bloccati e inversione; terminologia corretta per la Y. |
| WX310 completi | Hosts/diags e dettagli grafici, ma estremi interni e nessuna matrice di attuazione. | Dal sorgente dei WX ottenere bocche, raccordi completi, collegamento fra sottoelementi e schema di comando/accoppiamento; confrontare tavola AS-BUILT e componenti effettivi. | Quattro porte e percorsi continui certificati, tutte le entrate in entrambi i versi/stati, nessun nodo al diamond; confini unit e zone protette. |
| Terminali e punti operativi | Tre buffer_stop di cui uno dedotto; nomi S1/S2/T-SEG e fine aperta N16 nel repertorio. | Conferma del tecnico sul master: endpoint del binario, paraurti reale o assenza, setback, sagoma libera, fouling point, lunghezza utile. | Nessun terminale creato dai gap del JSON; niente copia del quarto terminale legacy. Capienza verificata con composizioni ammesse. |
| Circuiti, itinerari e manovre | Nomi A/B/C e sequenze di montaggio, non liste di esercizio. | Tabella ordinata di archi e versi per ogni circuito e per i trasferimenti WX/scalo/triangolo/terminali; stati necessari, movimenti di inversione e stop. Derivare da giunzioni approvate e far revisionare il risultato dal responsabile del piano. | Chiusura/raggiungibilità, transizioni ammesse e vietate, fallback fail-closed; nessun itinerario storico mantenuto su connessioni inesistenti. |
| Zone di sicurezza | Algoritmi e margini legacy; nessun fouling certificato V06. | Ricavare confini dell'intero apparecchio e sagome dinamiche dal master/rotabili, con intervalli metrici sugli archi nuovi. | La suddivisione dei pezzi non riduce le fasce di protezione; test di occupazione/approccio dei vicini. |
| Visuale ↔ asse ↔ parti mobili | `RAIL_rails`, sleepers/throw_bars/ballast globali; inventario sn_id. | Ispezione binaria GLB mediante strumento che gestisca il file; consegna del produttore di una mappa source-piece/route/node/primitive e, se necessario, varianti di parti mobili sotto autorizzazione specifica. | Ogni scambio comandabile ha rappresentazione coerente con lo stato; nessun ago duplicato o agganciato al vecchio grafo. |
| Ballast, sagome e tunnel | Bbox/hidden intervals; `roadbed_mm.json` SHA dichiarato `7aa208bd5104e5e38669c1e920f20773c1d30ffcbecfc7af91e8485ae9c05552`; master cita `masks_1mm.npz`. | Recuperare quei sorgenti e relative unità/layer dal produttore, oppure dati equivalenti revisionati; non usare bbox come prova della luce libera. | Sagome di veicoli in curva, portali, piattaforme e rimessa rispetto alla stessa revisione ferroviaria. |
| Spawn e configurazione iniziale | Dati legacy T47/frazioni/stati false. | Anchor nuovi con edge+s+verso/circuito, lunghezze utilizzabili, stati iniziali coerenti e assenza di occupazione. | Flotta iniziale, quarto treno e reset validati; rifiuto sicuro di composizioni non contenibili. |

Se l'export autore non include collegamenti, è ammessa soltanto una **ricostruzione esplicitamente revisionata**, con provenienza per ogni decisione, non la promozione automatica di coordinate vicine a connessioni. Non è richiesto recuperare dal GLB un grafo che il GLB non promette di contenere. Non si deve ridisegnare il piano per adattarlo alle aspettative del vecchio generatore.

### 15.8 Architettura di migrazione minima e scelta del rendering

**INFERITA — profilo atomico al bootstrap:** configurazione di layout con versione/hash, dati di rete, registro controller, circuiti/ruoli, anchor, piano ferro e profilo dei rotabili, mappa visuale e versione scenografica. Tutti i sottosistemi ricevono la stessa rete validata. I moduli già affidabili restano utilizzati; l'adattamento iniziale riguarda i confini di configurazione e le poche assunzioni hardcoded inventariate, non una separazione in nuovi framework o la riscrittura di Journey/guard/collision prevention.

Un dataset V06 futuro può essere conservato in una posizione dedicata e versionata, mantenendo `canonical-layout.json` come legacy; la collocazione definitiva sarà decisa con il mandato implementativo. Il termine «geometria canonica» dovrà indicare **il dataset autorevole del profilo selezionato**, non il vecchio tracciato per definizione. In V06 non si attivano renderer legacy, minimappa legacy o importazioni statiche di vecchi controller. La CI non deve rigenerare/riportare V06 al vecchio XML.

La scelta visuale non cambia l'autorità del nuovo grafo. Due possibilità da confrontare dopo il recupero dei dati:

| Possibilità futura | Requisiti e limiti |
| --- | --- |
| **GLB ferroviario V06 come visuale statica + dati operativi V06 e parti mobili identificate** | Corrisponde al pacchetto scenografico, ma richiede ispezione e mapping di aghi/tiranti per dispositivo e stato. Nei metadati attuali quegli elementi sono aggregati globalmente. Non si può sovrapporre una seconda coppia di aghi procedurali alle parti già incluse nel GLB o chiamare «sincronizzato» un dispositivo con stato grafico contraddittorio. Eventuale consegna separata delle parti mobili richiede mandato asset esplicito. |
| **Renderer ferroviario esistente adattato agli assi e profilo V06, con selezione esclusiva delle mesh GLB equivalenti** | Riutilizza i costruttori, ma deve rispettare i nuovi assi, piano del ferro e profilo, non conservare la geometria precedente. Rischio di duplicazione nei ballast/rotaie GLB aggregati; selezione e parità geometrica da provare. È un'alternativa visuale conforme soltanto se la Regia ne accetta il contratto e la resa rispetto al master. |

**Superamento esplicito delle opzioni precedenti:** A e C del §6 erano valutate mantenendo la vecchia geometria operativa; quella premessa è ritirata. B non è più la strategia finale ammessa. Riutilizzare algoritmi non significa conservare le loro vecchie coordinate, né saltare il contratto delle parti mobili. La decisione fra le due possibilità sopra resta aperta e non autorizza rigenerazione di asset in questo audit.

### 15.9 Rollback e stato ferroviario

**INFERITA — proposta:** attivazione di layout/scena come coppia versionata prima di costruire network, treni, HUD e listener; nessun hot swap del grafo durante il movimento come requisito iniziale. Il vecchio profilo e i suoi asset/dati verificati rimangono ripristinabili. Un errore di validazione/asset non deve lasciare un core V06 con visuale legacy o viceversa.

La selezione di un altro profilo richiede invalidazione o ricostruzione coerente di Journey, storia, carri sganciati, stati controller, prenotazioni fisiche, cache topologiche, picking e diagnostica, più incremento della generation per le intenzioni pendenti. Riutilizzare un ID omonimo o proiettare un treno sul binario più vicino non costituisce una migrazione valida. Tutti i dati di posa devono essere associati almeno a layoutId/versione; la strategia più semplice è una nuova sessione fisica con anchor del profilo.

**VERIFICATA:** M2/M3 sono session-only e condividono record/UUID dei rotabili per le viste, non un salvataggio compatibile fra grafi. **INFERITA:** il rollback con reload deve dichiarare l'eventuale perdita dello stato di sessione e rispettare le protezioni già esistenti su bozze/dati. Non si promette preservazione automatica di posizioni, progetti o inventario attraverso un reload e non si introduce cloud/persistenza senza mandato. Se la Regia richiede continuità dei progetti virtuali, va definito un adapter di stato separato che non trasporti riferimenti fisici obsoleti.

### 15.10 Roadmap proposta: dati e gestione ferroviaria prima del Quality Gate funzionale

I codici **R0–R7** sono etichette di pianificazione della migrazione, da approvare o rinominare dalla Regia; **non sono microfasi avviate, non riattivano M0.2 e non autorizzano alcuna fase successiva**. Questa sequenza sostituisce il percorso del §11–12 nella parte che caricava prima la scenografia conservando il vecchio tracciato.

| Microfase proposta | Perimetro | Evidenza e gate di uscita |
| --- | --- | --- |
| **R0 — Contratto AS-BUILT e recupero fonti** | Acquisire i dati mancanti del §15.7, congelare revisione/hashes, compilare matrice componenti/porte/giunzioni e registro controller; risolvere discrepanze di versione. Nessuna attivazione di asset nel gioco. | Revisione indipendente Regia/tecnico: copertura di tutti i pezzi, gap e WX spiegati, transizioni e terminali approvati. **Prerequisito prima di autorizzare codice R1.** |
| **R1 — Dataset operativo V06 e validatore** | Nel branch/worktree dedicato, produrre il dataset V06 separato dal legacy e validazione riproducibile; eventuale adapter della factory di rete. Nessuna scena V06 per mascherare difetti della rete. | From/to, alias e source refs, lunghezze, continuità e tangenti; nodi isolati/archi mancanti, componenti/cicli confrontati col piano; nessun nodo spurio ai diamond. Suite legacy invariata. Conteggi V06 derivati e revisionati, non copiati da 75/70/8/4. |
| **R2 — Dispositivi, controller e routing** | Registro dei dispositivi, stati iniziali, archi interni e porte; riuso/adattamento localizzato di routing, turnout model/commands e switch topology. | Truth table indipendente per ogni porta, stato e verso, percorsi vietati compresi; entrambi i WX con trasferimenti reciproci, Y e scambi adiacenti. Configurazioni globali coerenti e fail-closed per dati mancanti; nessun comando bypassa safety. |
| **R3 — Movimento, manovre e protezione sul nuovo grafo** | Journey, pose, flotta iniziale/quarto treno/reset, ruoli/circuiti, occupazioni, guard, collision prevention, detached/coupling e terminali. | Prove deterministiche su nuovi percorsi, triangolo e inversioni; treni lunghi su giunti/curve; stop anticipato, nessuna collisione fra archi diversi, nessun lancio scambio occupato/in approccio, nessuna occupazione perduta. Nessuna riscrittura della fisica come scorciatoia. |
| **R4 — Coerenza visuale ferroviaria e interazione** | Solo dopo R1–R3, attivare la soluzione visuale approvata su V06: assi/quote ruote, parti mobili, picking, glow, frecce, HUD, minimappe e console sullo stesso profilo. Adattamenti dei dati/wiring senza ridisegnare UI V2.1. | Catture planimetriche e dettagli per tutti gli scambi nei due stati, transiti WX/Y/terminali; marker/ribbon/picking sulle medesime coordinate; comandi mouse/touch trusted e stop; nessuna rotaia duplicata. Prova di fallback e rollback locale. |
| **R5 — Composizione scenografica e budget** | Terreno/montagna/portali/stazione e poi decorazioni per moduli; normale/tecnica, ingombri, caricamento e risorse. Può essere collocata dalla Regia nelle future M0.2/M0.4, ma soltanto su baseline ferroviaria V06 validata. | Sagome rispetto al nuovo piano, stato operativo invariato al toggle tecnico, performance misurate con hardware/profilo dichiarati, errori e memory trend, lifecycle. Nessuna riapplicazione di scala o correzione verso la vecchia rete. |
| **R6 — Regressione funzionale completa** | Tutte le funzioni consolidate su V06 e test legacy di rollback: itinerari fisicamente equivalenti, nuovi itinerari necessari, fermate/inversioni, collisioni/occupazioni, quattro treni e TM/M1/M2/M3, HUD/camera/minimappe e UI V2.1. | Matrice requisito→test→evidenza, nessuna asserzione di sicurezza indebolita; differenze intenzionali del nuovo impianto esplicitamente approvate, indipendenti dai risultati del vecchio piano. |
| **R7 — Baseline giocabile e Quality Gate Regia** | Revisione delle prove funzionali/visive/prestazionali, lock dati+asset+codice, limiti e rollback provato. | Approvazione indipendente Regia del profilo V06. Nessun rilascio implicito: merge/push/deploy seguono esclusivamente il mandato futuro applicabile. |

Ogni microfase richiede il proprio mandato e stop di revisione. Il fatto che R0 sia recupero dati non autorizza a scrivere un grafo «temporaneo» che diventi silenziosamente la nuova fonte di verità. Un eventuale esperimento visuale anticipato sarebbe un laboratorio separatamente autorizzato e non potrebbe valere come gate di migrazione operativa.

### 15.11 Matrice di accettazione funzionale per il nuovo piano

**INFERITA — proposta da rendere eseguibile sui dati approvati.** La suite deve distinguere invarianti algoritmiche da numeri, ID e itinerari intenzionalmente cambiati. Il vecchio expected rimane valido per legacy; V06 richiede un oracolo indipendente (tabelle del responsabile del piano), non expected copiati dall'output del nuovo generatore.

| Requisito | Prova richiesta prima del QG funzionale |
| --- | --- |
| Stessa ferrovia visibile/operativa | Overlay di assi/porte campionati, profilo e piano ferro confrontati con i GLB/renderer selezionati, ruote/coupler e marker sul medesimo layoutId; massimo/p95 degli scarti dichiarati e tolleranze approvate. Le tolleranze proposte nel primo audit non sono approvazioni AS-BUILT. |
| Ogni scambio identificato e comandabile | Inventario fisico↔controller↔porte↔mesh completo, entrambe le posizioni e tutti gli ingressi/versi. Zero dispositivi fittizi, duplicati o non protetti; labels della Y corrette. |
| Due WX310 corretti | Quattro bocche e continuità completa; percorrenza delle due strade per ogni posizione e ritorno; no uscita laterale al centro del diamond; occupazione blocca l'intera unit secondo regole certificate. |
| Grafo fedele | Connessioni/alias e terminali corrispondono al master, circuiti A/B/C e centro verificati, nessun endpoint accidentale derivato da arrotondamenti; raggiungibilità e restrizioni documentate. |
| Movimento/inversione/manovre | Composizioni ammesse su tutte le giunzioni/curve e nei tunnel, inversione dopo frenata, triangolo e terminali, sgancio/aggancio coerenti con la storia del percorso; reset/inserimento non crea sovrapposizioni. |
| Itinerari/fermate | Router e preview concordano col veicolo, variazione scambio invalida la previsione storica quando necessario, stop manuale/globale/terminale e misaligned/unknown funzionano anche durante caricamento o vista tecnica. Eventuale ricerca globale di itinerari è un requisito da definire, non una funzione fittiziamente dichiarata riusata. |
| Sicurezza | Sweep di treni su archi diversi WX/triangolo, fronti/tail che occupano più giunti, carri sganciati, stop/approccio/occupazione e casi UNKNOWN; margini non ridotti, timestep e frenatura preservati salvo diverso mandato. |
| UI/HUD/minimappe | Identità treno e stato reale, Next Switch/distante/destinazione, route ribbons e selettori si riferiscono allo stesso grafo; mouse/touch/tastiera e coordinamento HUD-camera passano con la UI V2.1 esistente. |
| Rollback | Caricamento legacy torna a dati+scena coerenti e passa la propria suite; nessun Journey, reservation, callback o mapping di V06 rimane attivo. Stato session-only e intenzioni pendenti gestiti come da contratto, senza nuova persistenza implicita. |

### 15.12 Rischi, dipendenze e condizioni per autorizzare l'implementazione

Le probabilità sono **INFERITE**, non statistiche; i riscontri indicati sono verificati nei limiti descritti.

| Rischio | Severità / probabilità | Dipendenza e mitigazione prima dell'implementazione |
| --- | --- | --- |
| Grafo dedotto da vicinanza o dal GLB | **Critica / alta** con il pacchetto attuale | Connessioni/transizioni del §15.7; revisione delle 17 estremità non coincidenti e dei WX. Nessun merge automatico a 2,5 mm. |
| Dataset scambi incompleto o falso ottavo controller | **Critica / alta** con i vecchi hardcode | Registro approvato e mapping verso tutte le superfici; conteggio logico derivato dall'attuazione reale, non dalle aspettative del codice. |
| Rete nuova con consumer che leggono il vecchio canonico | **Critica / alta** senza adapter | Inventario degli import statici e profilo atomico prima del bootstrap; log di versione condivisa e test di concordanza di HUD/pose/picking. |
| Continuità WX, tangenti e quota sbagliate | **Critica / alta** senza sorgenti completi | Assi a precisione piena, porte e raccordi certificati, contatto ruota/rotaia e geometria dei due stati; niente aggiunte geometriche inventate. |
| Sicurezza apparentemente riusata ma non valida sulle nuove giunzioni | **Critica / medio-alta** | Prove indipendenti sulle nuove zone di conflitto e sull'intero dispositivo, protectedRanges coerenti con segmentazione, fail-closed e suite R3/R6. |
| Visuale statica degli aghi incompatibile con lo stato | **Alta / alta** coi soli nodi aggregati dichiarati | Ispezione e mapping binario; scelta visuale Regia ed eventuale consegna di parti mobili sotto mandato asset specifico. |
| Versioni di master, native file e export discordanti | **Alta / medio-alta** | Lock e provenienza con hash, associazione esplicita delle revisioni; riconciliazione dei mismatch manifest/EXPORT_REPORT ancora aperti. |
| Stato fisico/sessione invalido dopo switch o rollback | **Alta / alta** se si riciclano ID/pose | Bootstrap di profilo, invalidazione generation/cache e contratto di nuova sessione o migrazione esplicita; nessuna proiezione nearest-edge. |
| Test resi verdi cambiando soltanto i conteggi | **Critica / media** | Conservare regression legacy, oracolo V06 indipendente, matrice delle manovre e transizioni vietate; nessun indebolimento per esigenze sceniche. |
| Interferenza UI o CI che rigenera il vecchio tracciato | **Alta / media** | Worktree/branch dedicato futuro; UI V2.1 intatta in questa fase, adattamenti futuri circoscritti e approvati; pipeline dati specifica per profilo. |
| Prestazioni insufficienti dopo migrazione | **Alta / ancora non misurabile** | Restano i rischi del §7; benchmark solo dopo correttezza del nuovo core/profilo, non una deroga ai gate funzionali. |

**Condizioni proposte alla Regia per autorizzare codice:**

1. Approvare il profilo AS-BUILT V06 come nuova autorità geometrica e topologica, mantenendo legacy come rollback; questa scelta è già vincolante nella richiesta, non viene rimessa in discussione. Confermare invece revisione esatta e contratti da usare per realizzarla.
2. Chiudere R0 con porte/giunzioni, percorsi WX completi, registro degli scambi, matrice di transizioni, terminali/circuiti/anchor e corrispondenza con i sorgenti, senza correzioni non documentate.
3. Riconciliare integrità e provenienza di master/export e scegliere la strategia visuale ferroviaria con gestione degli aghi; autorizzare separatamente eventuale lavorazione degli asset necessaria.
4. Approvare l'adattamento localizzato dei consumer che assumono ID/lane/quote e dei vincoli di CI, mantenendo regole di sicurezza, UI e domini consolidati; definire il confine degli eventuali soli cambi di wiring/testo UI indispensabili alle nuove identità.
5. Autorizzare una microfase precisa su branch/worktree/base definiti, con oracolo di test indipendente e gate di uscita. Nessuna approvazione generale della roadmap equivale ad autorizzare tutte le implementazioni.

### 15.13 Ricevuta M0.1-R e arresto

**VERIFICATA:** in M0.1-R sono stati eseguiti nuovi controlli sulla baseline: `npm test` (**254 PASS**, nessun fallimento/skipped), `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` (**9 PASS**) e `npm run build` (**PASS**). Il bundle mantiene SHA-256 **`1ac2022b781311ca3fcc03e6373a55fc56c45eabd714c56694e7107d12352378`**. Questi PASS attestano la baseline legacy rimasta invariata, **non una migrazione V06 eseguita o testata**.

I log e l'analisi di sola lettura sono conservati in `/workspace/work/m01-r/`: `npm-test.log`, `python-test.log`, `build.log`, `topology-analysis.json`, estratti delle fonti e ricevuta finale. I materiali di lavoro non sono stati copiati in assets o caricati nel gioco. **NON VERIFICABILE in questa fase:** grafo V06 operativo completo, rendering binario ferroviario, manovre V06 nel browser, FPS e memoria su hardware target; nessuna prova browser V06 o screenshot di integrazione eseguiti.

**Unico file di repository aggiornato:** `docs/_active/scenario-v06/M01_AUDIT_REPORT.md`, con avviso di prevalenza iniziale e questo addendum; corpo storico M0.1 preservato salvo qualificazione dell'esito come storico. Nessuna modifica a codice, geometrie applicative, UI V2.1, dipendenze, workflow, asset, PROGRESS/UI STATUS, Auth o Supabase. Il controllo finale confronta i 4.037 file già tracciati con gli hash di ingresso e verifica lo scope documentale.

**M0.1-R conclusa. NO-GO all'avvio dell'implementazione finché non sono chiusi i prerequisiti operativi e approvata una microfase precisa. M0.2 non iniziata. STOP: attesa dell'approvazione e del Quality Gate della Regia.**
