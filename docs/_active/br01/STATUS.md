# BR01-C — PASS tecnico, in attesa del Quality Gate Regia

Branch `codex/br01-animated`, base BR01-B `9bbe397847e936c7d6d302caa98199445353fd97`. Giunto allungato di **2,200 mm** lungo la Journey. In rettilineo la distanza minima tridimensionale fra i triangoli della cabina e quelli del corpo del tender passa da **0,527 a 1,943 mm**. La misura riguarda le superfici originali `engine_haus` e `tender_kohletender`. La lunghezza fra i respingenti esterni è **151,825 mm**, rispetto ai 149,625 mm nominali del prototipo in scala 1:160 (+1,47%). Scala, cabina, tender, assi e mesh originali sono invariati.

### Dimensionamento e realizzazione

La ricerca usa i vertici del GLB, i costruttori e le pose del runtime. Alle frazioni di arco di BR01-B aggiunge due griglie (passo massimo rispettivamente 4 e 2 mm), entrambi gli orientamenti e le diverse storie ammesse dal router. Su V06 è stata trovata ancora un’intersezione dei corpi a +1,973 mm; la prima quota campionata libera verificata è +1,977 mm. Sono limiti sperimentali sulle pose del rapporto.

Il primo montaggio a barra rigida e perno in guida longitudinale interferiva con l’asse portante e il carrello anteriore del tender. La soluzione installata ha perni verticali fissi ai due telai. Una camicia cava e una linguetta ruotano ciascuna sul proprio perno. I due elementi rigidi misurano ciascuno **4,790 mm** dall’asse del perno alla punta. La linguetta scorre dentro la camicia; un pattino maggiorato, due risalti all’imbocco e un fermo di fondo limitano fisicamente la corsa. Gli occhi hanno fori da 0,54 mm per perni da 0,40 mm. Le trasformazioni aggiornano esclusivamente gli angoli dei due elementi. I componenti restano sui rispettivi veicoli allo sgancio.

Per la quota minima del gancio sono stati inclusi la sede dell’occhio, il pattino, lo spessore dei risalti e 0,05 mm di luce tecnica. Nel campione V06 la soglia risulta compresa fra **2,130815 e 2,130939 mm**. Il valore installato arrotonda verso l’alto al decimo di millimetro. Interasse dei perni in rettilineo 5,350 mm, campo meccanico 5,290–9,230 mm, osservato **5,348–9,111 mm**. L’inserimento reciproco osservato è **0,469–4,232 mm**. Il confronto dei triangoli include linguetta contro camicia/fermi, occhi contro perni, parti mobili contro montaggi e telai, ferramenta contro il treno di rotolamento e il corpo opposto. Nessuna intersezione rilevata; esclusi i normali accoppiamenti solidali fra parti fisse dello stesso assemblaggio.

### Quote ferroviarie

| Misura sul plastico | BR01-B | BR01-C |
|---|---:|---:|
| Passo fra origini lungo la Journey | 74,813 mm | 77,013 mm |
| Rettangolo locomotiva, lunghezza × larghezza | 96,299 × 21,744 mm | 99,902 × 21,744 mm |
| Rettangolo tender, lunghezza × larghezza | 53,326 × 19,661 mm | 56,973 × 20,400 mm |
| Lunghezza complessiva fra estremi esterni | 149,625 mm | 151,825 mm |

Il passo dedicato si applica esclusivamente a motrice BR 01 seguita dal suo tipo di tender. La sagoma della motrice raggiunge il retro della cabina. Quella del tender include la portata della punta della linguetta e lo spostamento laterale dei carrelli. Le due zone protette si sovrappongono al giunto per circa 5,05 mm lungo la Journey. La lunghezza complessiva usa l’estremo di testa e quello di coda. Il test confronta range occupati, passo del motore e lunghezza esposta nella composizione progettata. Le regole generali di instradamento, frenatura, occupazione e anticollisione e i loro margini restano invariati.

### Gate e riproduzione

- Chrome locale: **522/522 pose B** ripetute in entrambi i sensi campionati, **1.376** configurazioni geometriche valide complessive, incluse curve R216/R249/R282/R315, raccordi e scambi. Per 46 richieste supplementari su tre rami il router non fornisce l’intero tratto necessario a testa e coda nella configurazione di prova; nessuna appartiene alle 522 obbligatorie. Sono registrate in `unavailable`. Zero vertici oltre 0,05 mm, scarto massimo sul rettangolo proprietario **3,77 × 10⁻¹³ mm**. Al punto originale V06-P006 +89,25 mm riprodotta la stessa posa B e scomparsa la precedente sporgenza di 1,678 mm.
- Calcolo indipendente sulle geometrie runtime: **19.933** pose valide V06 e **20.768** Legacy, due orientamenti e itinerari legali. Zero interferenze rilevate. Errore massimo di coincidenza fra centro dell’occhio e perno 0 mm nei campioni; disallineamento secondo la misura assiale inferiore a 3 × 10⁻¹³ mm. I risultati riguardano la matrice campionata. [V06](evidence/BR01-C/sizing.json) · [Legacy](evidence/BR01-C/sizing-legacy.json).
- Video del canvas Chrome con clock, odometro e comandi di plancia reali. Avanzamento, STOP, sosta e retromarcia. Durante STOP e il comando di inversione da fermo sono identiche le trasformazioni registrate del biellismo e del gancio. Scarto massimo rispetto alla cinematica delle bielle e dei pistoni dedotta dall’odometro inferiore a 10⁻¹³ mm. [Video](evidence/BR01-C/joint.webm) · [Telemetria](evidence/BR01-C/live.json).
- Prova anticollisione nello stesso browser: una seconda BR 01 ferma viene posizionata come fixture 225 mm più avanti sullo stesso itinerario; la prima avanza con comando di plancia fino a `GUARDED_STOP / train` dopo 65,663 mm accettati. Velocità zero, margine fra rettangoli **5,340 mm**, nessuna sovrapposizione e odometro stabile al controllo successivo. [Stati, occupazione e margini](evidence/BR01-C/traffic.json).
- PASS per 45/45 test ferroviari mirati, 573/573 suite Node, 9/9 audit JMRI, build tramite lo script di package.json e controllo whitespace. [Test ferroviari](evidence/BR01-C/railway.txt) · [Node](evidence/BR01-C/node.txt) · [JMRI](evidence/BR01-C/jmri.txt) · [Build](evidence/BR01-C/build.txt).
- [Confronto prima/dopo](evidence/BR01-C/comparison.json) · [Tutte le pose browser](evidence/BR01-C/samples.json) · [Screenshot R216](evidence/BR01-C/joint.png) · [Dettaglio del gancio](evidence/BR01-C/drawbar-detail.png). Il dettaglio isola la ferramenta per mostrarne l’innesto. Le misure e il video usano i modelli completi.

Riproduzione con `node scripts/size-br01-drawbar.mjs` (e `--legacy`), server loopback con build locale, `node scripts/verify-br01-joint.cjs --drawbar` con Playwright, `CHROME_BIN` e `SERIEN_URL`, quindi `python3 scripts/summarize-br01-drawbar.py`. Gli strumenti e le acquisizioni sono locali; nessuna modifica a V06, layout, backend, configurazione di produzione, main o deploy. Evidenze A e B conservate. **STOP per Quality Gate della Regia.**

---

# BR01-B — BLOCKED, gate geometrico FAIL

Checkpoint iniziale verificato: `a15aed0d511f53d1d84a13dbed10123a5a18073f` su `codex/br01-animated`. Il mandato prevede lo stop prima di modifiche sostanziali alle quote di sicurezza. La B consegna il controllo separato per veicolo, la prova di intersezione e la proposta per la Regia. Nessuna correzione dimensionale o di posa è stata applicata al runtime.

### Geometria del giunto

Il piano nominale è X = −5,55 nelle coordinate del GLB. Le origini longitudinali di locomotiva e tender sono rispettivamente +7,2580675 e −12,6426195. Ciascun corpo assume la tangente della Journey al proprio centro; i carrelli assumono la posa della corda fra i loro assi. Gli agganci logici dei due veicoli hanno quota 8 mm, offset laterale zero e coincidono in ascissa lungo la Journey. In curva le tangenti ai due centri differiscono e gli estremi dei corpi rigidi non coincidono nello spazio.

| Veicolo | Inviluppo L × W prima e dopo (mm) | Agganci X locali (mm) | Estremi rigidi X locali (mm) |
|---|---:|---:|---:|
| Locomotiva | 96,299 × 21,744 | ±48,149 | −51,753 / +48,149 |
| Tender | 53,326 × 19,661 | ±26,663 | −26,663 / +27,684 |

La cabina è una componente connessa del corpo `engine_haus`. Il retro oltrepassa l’aggancio di 3,604 mm. Sul tender la piattaforma anteriore e i gradini sono solidali a `tender_kohletender`; il punto più avanzato oltrepassa l’aggancio di 1,021 mm. Gli estremi opposti sono sui rispettivi telai/respingenti. Le lunghezze rigide individuali misurano 99,902 e 54,348 mm, somma **154,250 mm**. I due rettangoli contigui dispongono in totale di **149,625 mm**. Spostare l’origine non cambia la lunghezza di un corpo rigido; spostare il piano comune redistribuisce la lunghezza disponibile. A modello e scala invariati mancano dunque **4,625 mm** per la copertura longitudinale separata, già sul rettilineo con i corpi allineati. Questa è una misura delle proiezioni delle geometrie, non una certificazione del raggio minimo.

### Misure in Chrome

Il controllo usa le matrici mondo dei due corpi Three.js e i limiti letti dai loro metadati ferroviari. Per ogni vertice misura lo scarto sul rettangolo del proprietario e il minimo scarto sui due rettangoli. Tolleranza 0,05 mm. Incluse le geometrie generate a runtime di bielle, perni, pistoni e fanali: 70.851 vertici locomotiva e 27.994 tender. Il controllo delle interferenze restituisce un testimone quando un segmento di un triangolo attraversa un triangolo dell’altro corpo nell’area del giunto. Non misura la profondità di penetrazione.

- V06-P006 a +89,25 mm rispetto allo spawn BR01-A, ascissa arco 100,088 mm. Rotazione relativa −13,926°, distanza fra i punti nominali degli agganci 2,433 mm. Eccesso massimo sull’unione **1,678 mm**, 442 vertici fuori tolleranza, riproduzione della A. Sui propri veicoli rispettivamente **3,604 mm / 566 vertici** e **1,021 mm / 438 vertici**. Intersezione confermata fra triangolo 28 della cabina e 2625 del tender.
- 522 pose diagnostiche sul grafo V06: 29 archi di curva con designazione R nel censimento pezzi, estremi compresi e sette posizioni interne, percorrenza campionata in ordine diretto e inverso con fase firmata. Sono rappresentati R216, R249, R282, R315 e R481 nominali. Per i rami si costruisce una Journey di prova con un assetto ammesso dal router senza azionare gli scambi della sessione. Tutte le pose richieste sono valutate. È un campionamento geometrico, non una corsa reale su ciascun arco.
- Un massimo osservato sull’unione è **3,604 mm** su V06-P029 (R216 nominale), al 37,5% dell’arco. Rotazione relativa −16,821°, agganci a 4,739 mm. I triangoli 324 della cabina e 3489 del tender si intersecano. [Dettaglio del giunto](evidence/BR01-B/joint.png) nella posa misurata, con scena d’ispezione separata per visibilità, inviluppo locomotiva azzurro e tender ambra.
- La [registrazione Chrome](evidence/BR01-B/joint.webm) usa i comandi della plancia in V06, clock e odometro effettivi. Le trasformazioni registrate coincidono con fase della motrice, perni, centro biella e asta pistone calcolati dall’odometro sui due lati. STOP, sosta e comando d’inversione da fermo mantengono identiche le trasformazioni campionate. La marcia successiva inverte il segno della velocità. [Telemetria](evidence/BR01-B/live.json).
- [Confronto prima/dopo](evidence/BR01-B/comparison.json) a runtime invariato, [pose e testimoni di intersezione](evidence/BR01-B/samples.json). La sporgenza non è stata corretta. PASS 42/42 test ferroviari mirati, 570/570 Node, 9/9 JMRI, build tramite script package.json/pnpm, controllo whitespace. Protocollo geometrico con esito atteso del candidato corrente: codice di uscita 1. [Test ferroviari](evidence/BR01-B/railway.txt) · [Suite completa](evidence/BR01-B/node.txt).

### Proposta sottoposta alla Regia

Prima di variare la protezione, ricavare da una tavola quotata della variante BR 01 con il suo tender le posizioni dei due perni della barra di accoppiamento, la luce fra cabina e tender e la corsa degli elementi di passaggio. Usare queste quote in uno studio isolato per riprodurre il giunto e provare che le superfici non si intersechino. Se le lunghezze rigide misurate sono confermate, il modello ferroviario corrente usa gli stessi estremi per distanziamento e inviluppi. La rappresentazione distinta di barra, punti di aggancio e sagome protette richiede una proposta separata con impatto su occupazione e anticollisione. Allargare i rettangoli non risolverebbe l’intersezione dei triangoli. Nessuna modifica di questo tipo applicata.

Riproduzione: dopo la build, servire il repository su loopback; con Playwright disponibile e `CHROME_BIN` impostato, eseguire `node scripts/verify-br01-joint.cjs` (server predefinito 127.0.0.1:8193), quindi `python3 scripts/summarize-br01-joint.py`. I risultati sono scritti esclusivamente nella cartella B. Conservate le evidenze A. Nessun intervento su UI, flotta, geometria V06, sicurezza ferroviaria, backend, main o deploy. STOP per Quality Gate della Regia.

---

# BR01-A — BLOCKED al Quality Gate della Regia

15 novembre 2026. Base verificata su GitHub e in locale: `b82def8f449980ff1ab3eca1fe129ee1fc34e763`, branch `codex/br01-animated`. Il checkpoint contiene un candidato di sviluppo con difetto di sagoma misurato. L’integrazione resta incompleta.

## Motivo dello stop

Con Chrome sul simulatore V06, dopo 50,325 mm di avanzamento accettato sull’arco V06-P006, 392 vertici delle mesh superavano di oltre 0,05 mm entrambi i rettangoli orientati dei veicoli. Sporgenza massima 1,163 mm sulla cabina. La registrazione conclusiva riproduce il difetto dopo 89,25 mm: 442 vertici, massimo **1,678 mm** sulla cabina, 0,888 mm sul tender. Il controllo usa le trasformazioni world effettive, gli stessi estremi longitudinali degli agganci e le semilarghezze lette dal modello ferroviario. Il massimo è lo scarto orizzontale su un asse locale, minimizzato sui due rettangoli. Il rilievo dimostra una parte di sagoma scoperta; non documenta una collisione fra treni. Le regole e i margini di protezione sono intatti. Il modello attribuisce al giunto cabina–tender una coordinata longitudinale comune, mentre le geometrie originali si estendono oltre questa sezione. In curva i due corpi ruotano separatamente.

[Prima misura](evidence/BR01-A/clearance.json) · [Ripetizione durante la registrazione](evidence/BR01-A/clearance-final.json).

## Implementazione verificata e limiti

- Derivato riproducibile con `python scripts/prepare-br01.py ORIGINALE assets/br01/locomotive.glb` (NumPy e Pillow). Conservato l’originale fuori dal worktree di sviluppo e verificato il suo SHA-256. Rimossi binari e terreno espositivi. Separate le geometrie per veicolo, assi e carrelli. Base colore ricampionata a 1024 px, mappe aggiuntive sostituite da fattori di materiale. [Attribuzione e modifiche](../../../assets/br01/ATTRIBUTION.md).
- Locomotiva e tender usano due veicoli del motore esistente, agganci coincidenti lungo la Journey e lunghezza nominale totale 149,625 mm a 1:160. Un caricamento GLB condiviso per la flotta. Comune asse locale +X in avanti. Angolo delle ruote pari a −odometro/raggio di rotolamento. Manovelle dei lati sfasate di 90°, bielle e cursori calcolati rispetto ai perni. La cinematica usa il delta firmato solo dopo l’accettazione del passo da parte del simulatore. La distribuzione resta una ricostruzione semplificata. Durata GPU e correttezza cinematica completa non qualificate.
- Registrazione MediaRecorder del canvas Chrome con comandi reali della plancia. Il bundle di misura usa il fixture locale di autenticazione del progetto e una camera di ispezione laterale. Clock, render loop, odometro e comandi di marcia sono quelli applicativi. In curva la corsa passa da 0 a 93,5 mm; dopo la frenatura resta a 93,5 mm durante STOP e sosta, poi torna a 3,75 mm in retromarcia. Prova di contatto degli assi limitata al campione acquisito; i minimi di quota in `wheel-contact.json` comprendono i bordini. [Screenshot](evidence/BR01-A/on-track.png) · [Video](evidence/BR01-A/motion.webm) · [Telemetria](evidence/BR01-A/motion.json).
- Nel GLB originale: 123.724.664 byte, 121.942 triangoli, 37 primitive, 12 materiali, 38 immagini. Derivato: 4.458.300 byte (−96,40%), 84.246 triangoli, 23 primitive, 9 materiali, 9 immagini. Stima RGBA8 prima dei mipmap: da 716,0 a 36,0 MiB. Le primitive GLB escludono la distribuzione generata in JavaScript. Nel browser con tre composizioni, qualità Low e registrazione attiva: 288–375 draw call e 2.669.387–3.509.881 triangoli per la scena nelle istantanee, media di 50,1 frame/s tra primo e ultimo campione. Ultimo campione: 180 geometrie e 46 texture della scena. Nessun confronto FPS controllato con l’originale. [Misure asset](evidence/BR01-A/asset-metrics.json).
- Il catalogo attivo espone BR 01 e tender. I vecchi identificativi restano riconoscibili al validatore, che segnala il modello incompatibile conservando i dati. Test di dominio eseguito. Il gestore progetti di questa baseline è di sessione. Recupero di una composizione preesistente e verifica dei percorsi UI di creazione, selezione e rimozione end-to-end: **NOT VERIFIED**. Rimozione di una locomotiva fisica tramite UI non implementata. Non consegnate funzionalità di migrazione persistente. Nessuna carrozza aggiunta.
- Baseline 569/569; candidato 570/570 test Node, 9/9 audit JMRI, build con lo script di package.json tramite pnpm, diff check PASS. I fixture di catalogo sono stati adattati ai due modelli attivi. Nessuna modifica a dati canonici, grafo, binari, scenografia V06, motore di frenatura, conflitti, protezioni, backend o configurazione di produzione. Regressioni browser complete di HUD, minimappe, camera e Train Management, rettilineo e arresto protetto in conflitto tra treni: **NOT VERIFIED**. Nessuna qualifica sicurezza generale. [Suite Node](evidence/BR01-A/node.txt).
- Riproduzione della registrazione e del controllo: servire il worktree compilato in loopback, eseguire `node scripts/verify-br01.cjs` con Playwright disponibile, `CHROME_BIN` e `SERIEN_URL` del server locale. Lo script scrive le acquisizioni nel worktree. Il controllo misura lo scostamento; il gate è FAIL se i vertici fisici escono dai rettangoli. L’attuale candidato riproduce il difetto.

**STOP per Quality Gate della Regia.** Da riesaminare l’articolazione e la geometria al giunto cabina–tender prima della qualifica successiva. Nessun merge o deploy.

---

# BR 01 — baseline PASS, locomotiva ancora da integrare

Al 15 novembre 2026 il GLB locale di 123.724.664 byte ha SHA-256
`39551a52be63db4e85973f5586b5f6d4b23c229e9c158d7376904766b73df086`.
Il controllo sul Mac (arm64, Node v24.22.1) inizialmente falliva sulla
serializzazione JSON di createNetwork() nella copia storica di Fase 0.

Confrontando in ordine tutti i punti con docs/phase-0/layout.json, la prima
differenza è L0-return.points[35].z: 236.95636556485283 contro
236.95636556485286. Le altre quattro sono le ordinate 35 e 65 di L1-return
e L2-return. La formula è 350 + r * Math.sin(a); gli scarti osservati sono
di un valore binary64 adiacente (massimo 5,685e-14 mm). Ne derivano cinque
distanze cumulative diverse su L0-return e 22 su L1-return. Nodi e incidenze
coincidono anche nell’ordine. Ricalcolando le distanze sui punti archiviati
si riproduce esattamente il digest storico 87b2d7a0…a45971a.

Il test verifica prima le distanze e lunghezze grezze, poi riconduce solo
le cinque esatte varianti osservate ai corrispondenti valori archiviati.
Nessuna tolleranza generale. L’hash finale copre ancora l’intero grafo,
inclusi ordine, connessioni, metadati e geometria. Invariati hash dei
sorgenti protetti, digest atteso e conteggi di 33 archi e quattro terminali.

Test mirato PASS; suite completa 569/569, nessun salto; audit JMRI 9/9;
build PASS (script di package.json eseguito con pnpm). Solo test e documenti
modificati. Nessuna modifica a runtime, ferrovia, UI o sicurezza.

Ripetizione Linux NOT VERIFIED. Il log storico BR 01 registra comando e
risultati ma non la versione Node, V8, flag o immagine. I workflow indicano
Node 22 e altri log V06 riportano v24.19.0; nessuno identifica il processo
BR 01. Il lockfile fissa three 0.163.0 ed esbuild 0.25.12; createNetwork e
JSON.stringify non usano tali dipendenze. Nessun runner Linux corrispondente
disponibile nella sessione. La differenza numerica è dimostrata, la sua
attribuzione a una specifica combinazione di V8 e sistema operativo no.

Prossimo risultato: prova articolata di ruote, bielle e pistoni in funzione
della distanza; integrazione e verifica in simulazione ancora da eseguire.

---

## Checkpoint storico — BLOCKED (15 novembre 2026)

Mandato: preparazione del modello originale, integrazione e verifica in un unico
intervento; nessun merge o deploy. Branch dedicato `codex/br01-animated`, base
`a266068d72bf42974b1829723996fe9566d341d4` (main remoto acquisito con fetch).
Questo checkpoint documenta un impedimento di accesso, non un'implementazione.

## Stato reale del rilascio

V06 è già integrato: PR #21, merge `298e7fc52a07b6206dda2cf5bce89ecdd7b89d00`.
Main successivo `a266068` imposta V06 predefinito e mantiene Legacy selezionabile.
Il workflow Pages preesistente [43695610489](https://github.com/epivic-lab/SerieN/actions/runs/43695610489)
risulta completed/success sullo stesso SHA; non è stato avviato in questo incarico.
La pubblicazione è verificata a livello workflow, non tramite browser live.
Il checkout iniziale era `work` a `f33377c`; working tree pulita, preservata.

## Impedimento verificato

La cartella Drive indicata contiene `br_01_german_steam_locomotive.glb`, ID
`1yN79n9eStjlgErbeAO3bY87ZOe0nxLDe`, MIME `model/gltf-binary`,
123.724.664 byte, `can_download: true` nei metadati del connettore.
Due richieste autenticate `google_drive.fetch(download_raw_file=true)` terminano
con `Transport closed`, senza file materializzato. Il tentativo HTTP diretto
tramite proxy verso Drive termina con `CONNECT tunnel failed, response 403`.
La policy di rete dell'ambiente non include Drive. Nessun tentativo di aggirarla.

Nessuna BR 01 o rapporto preliminare individuati nel workspace. I percorsi Mac
forniti non sono disponibili su questo host Linux. Non sono stati letti i byte
del modello: autore/licenza, parti, rig, triangoli, texture e possibilità di
articolazione restano NOT VERIFIED. I dati preliminari dell'utente non vengono
presentati come misure confermate.

## Riscontri sul codice della baseline

- `src/railway-step.js`: `train.odometer += p.delta` nel solo ramo accettato,
  dopo aggiornamento della Journey; un rifiuto ferma velocità e movimento.
- `app.js`: la posa passa Journey/coordinata/odometro alle animazioni esistenti.
- `src/train-assets.js`: cache di promesse, clonazione e rilascio risorse condivise
  già esistenti; fallback nativo e adattamento dimensionale Kenney richiedono
  una revisione specifica per la BR 01, non un semplice cambio di URL.
- `src/rolling-stock.js`, `src/train-projects.js`, `src/fleet-commands.js`,
  `src/locomotive-thumbnails.js`: punti da integrare insieme ai percorsi di
  inserimento e migrazione. Nessun vecchio asset rimosso in assenza del sostituto.

## Verifica e limiti

**PASS baseline:** `npm test` (569 test, zero fallimenti/saltati),
`python3 -m unittest discover -s tests -p jmri_audit_test.py` (9 test),
`npm run build` ed `git diff --check`. I log in `evidence/` riguardano
esclusivamente la baseline acquisita, non una BR 01 integrata.
Nessuna modifica a runtime, layout, scenografia, protezioni, UI, backend,
dipendenze o workflow. Gli invarianti sorgente sono verificabili con
`git diff a266068d72bf42974b1829723996fe9566d341d4 -- app.js src assets ui .github package.json package-lock.json`.
Animazione BR 01, migrazione, dimensioni, errori del nuovo asset, confronto
peso/triangoli/draw call, screenshot e video: NOT VERIFIED / non prodotti.
Nessuna misurazione di FPS o GPU fisica.

Unica prossima azione: rendere il GLB originale disponibile nel workspace
(allegato diretto o trasferimento autenticato funzionante), poi riprendere
il mandato già autorizzato sul medesimo branch. Nessuna ulteriore approvazione
di ambito richiesta; restano vietati merge e deploy.
