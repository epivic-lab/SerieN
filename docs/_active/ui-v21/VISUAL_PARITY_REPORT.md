# UI V2.1 — Visual Parity Hotfix

**READY FOR REGIA VISUAL REVIEW — PR DRAFT.** Gate tecnici completati; accettazione visiva riservata alla Regia. Nessun merge o deploy autorizzato/eseguito in questo hotfix.

Data: 2026-11-12, Europe/Rome. Repository `epivic-lab/SerieN`. Branch **`codex/ui-v21-visual-parity`**, derivato esattamente dalla baseline pubblicata **`d77b8aa2710fa474fdb069b204705364b4a9e7e6`**. Riferimento originale vincolante: **`cf2c29a8112b37a53c62cb84fca44061942aea31`**, branch `design/main-ui-redesign`.

PR Draft hotfix: **PENDING — creazione dopo il primo checkpoint verificato**. Checkpoint applicativo: **checkpoint che introduce questa ricostruzione; SHA aggiornato dopo il commit**. Lo SHA dell'ultimo checkpoint documentale si risolve con `git log -1 --format=%H -- docs/_active/ui-v21/VISUAL_PARITY_REPORT.md` ed è consegnato nella PR e nel messaggio operativo, evitando autoreferenze nel proprio commit. La PR #7 e il suo branch documentale non sono stati modificati.

## Prove visive e risultato geometrico

**[GALLERIA COMPLETA: Claude / precedente / correzione / overlay / diff](evidence/VISUAL_PARITY/GALLERY.md)**.

La reference è il vero HTML originale eseguito isolatamente, non una ricostruzione CSS o uno screenshot dell'app difettosa. Il file HTML è acquisito byte per byte dal commit design. L'unico adattamento di rete dell'harness restituisce le tre famiglie font locali già approvate al posto del foglio Google Fonts; markup, CSS e JavaScript dimostrativo della reference rimangono nel solo harness. Qualità **High** selezionata nella reference per rendere visibili le texture, senza usare la sua modalità Auto/Low che le disattiva. Confronti principali nello stato Day0 e con reduced motion; nel runtime il renderer software è Low per la sola scena, mentre i materiali UI restano quelli originali. La simulazione viene fermata tramite il comando reale per la cattura deterministica.

**A 1692×877: header, viewport esterno, sidebar, dock, tre console e HUD compatto coincidono nei bounding box con la reference.** Gli indicatori sono 88×88 nelle medesime coordinate; le righe comandi hanno 326×36 px e scarto verticale inferiore a 1 px. Toolbar camera: altezza60px e larghezza+2,19px rispetto alla reference. Throttle: altezza24px e larghezza+4px, con readout reale distinto da quello della velocità. Sono misure DOM nuove, non valutazioni “looks good”.

| Viewport | Header ref/corretto | Viewport esterno ref/corretto | Dock ref/corretto | Scarto massimo macro-regioni |
| --- | ---: | ---: | ---: | ---: |
| 1692×877 | 64.89/64.89 | 612.11/612.11 | 156.00/156.00 | 0px |
| 1648×895 | 66.22/66.22 | 628.78/628.78 | 156.00/156.00 | 0px |
| 1440×900 | 66.59/66.59 | 633.41/633.41 | 156.00/156.00 | 0px |
| 1366×768 | 58.00/58.00 | 520.00/520.00 | 146.00/146.00 | 0px |
| 1024×768 | 58.00/58.00 | 520.00/520.00 | 146.00/146.00 | 0px |
| 390×844 | 110.00/110.00 | 388.23/388.23 | 195.00/210.00 | Adattamento dichiarato |
| 768×1024 | 72.00/72.00 | 340.00/380.00 | 108.00/166.00 | Adattamento dichiarato |

Alla baseline difettosa, 1692×877: header75px, scena300px, dock502px. La ricostruzione restituisce **612,11px** al viewport esterno e **156px** al dock. Il canvas effettivo è l'interno originale `.win`, **1292×576,11px**, con cornice/padding18px per lato: non si confonde la misura esterna del modulo con quella interna del canvas. Sidebar330px e console452×132px, corrispondenti al vero HTML; i valori iniziali del mandato erano approssimativi.

Tutti i sette viewport richiesti hanno nuove catture originali, prima/dopo, overlay50/50, diff e misure DOM:1692×877,1648×895,1440×900,1366×768,1024×768,390×844,768×1024. Nessun overflow orizzontale del documento. I file sono [misure reference](evidence/VISUAL_PARITY/reference-measurements.json), [misure prima](evidence/VISUAL_PARITY/baseline-measurements.json), [misure corrette](evidence/VISUAL_PARITY/current-measurements.json), [confronti numerici](evidence/VISUAL_PARITY/comparison-results.json).

Il diff quantitativo esclude **soltanto l'intersezione dell'interno dinamico dei due canvas**, lasciando il bordo e sottraendo dalla maschera ogni rettangolo HUD/Bell/camera/log di entrambe le immagini. Nessun controllo, warning o valore testuale UI è mascherato. La maschera è consegnata per ogni viewport; l'overlay50/50 è anche privo di maschere. Le immagini a pagina intera non vengono ritagliate per occultare pannelli aggiuntivi o difetti. Il pixel-diff è diagnostico, non un PASS pixel-perfect: a1692×877 i pixel UI divergenti oltre24/255 passano da42,03% a15,37%, includendo stati/dati reali e adattamenti dichiarati.

## Root cause confermate e correzioni strutturali

| Difetto | Causa misurata nel runtime precedente | Correzione |
| --- | --- | --- |
| Viewport compresso | `.app.u2-frame` a righe auto e `.middle` separata; la dock da502px determina l'altezza residua di300px | Griglia originale `.st` con aree h/v/s/d, colonne/righe esplicite, `minmax(0,1fr)`, wrapper `.vp > .mi > .win` contenente il vero host WebGL; `.middle` è solo display:contents |
| Header squilibrato | Launcher TM grande, Home e gruppi appiattiti, wrapping diverso dal vero `.hc` | Vere `.plq`/`.edp` affiancate, rivetti e incisione originali, gruppo `.hc` con stato reale e pulsanti compatti; TM nel Menu; Home originale conservato e strumenti camera reali accessibili |
| Dock verticale | Intestazione/tabs/nav più quattro righe per console; min-height44px sommati a heading52+58px e previews separati | Una superficie orizzontale `.dk > .mi`: freccia, carosello, freccia, comandi globali. Console `.tr > .tri`, indicatore a sinistra e nome/modello/stato/throttle/comandi compatti a destra |
| Sidebar alta | Padding12px, gap12px, celle min94px, modelli/legenda su righe aggiuntive | Environment → Switches → Map → Missions in quattro moduli dimensionati; otto celle a due colonne, legenda a lato della vera mappa, modello originale spostato nel Menu |
| Texture e custom properties | Reset `background` degli adapter cancellano gli strati frozen; `.st` assente e `--n` forzato a zero su ciascuna regione | Originali strati smalto/ottone/mogano/pergamena/acciaio riutilizzati, senza modificare i frozen. Proprietà luce ereditata dal frame, proiezione del vero input Day/Sunset/Night; dialoghi esterni hanno fallback separato |
| HUD alto/tagliato | Grid overlay con camera/log come righe della stessa griglia; padding `.vp .mi` si propaga ai pannelli interni e produce HUD compatto64px | Ancoraggi indipendenti dentro il vero viewport; padding interno specifico, HUD compatto44px, schemi e warning originali, popup View limitato ai confini del canvas |
| Log invasivo | Operations Log a tutta larghezza occupa permanentemente una riga sopra la dock | Pannello compatto in basso a destra con messaggio completo nel summary e disclosure del nodo diagnostico originale; nessun testo eliminato |
| Missioni strette | Due titoli/stati reali lunghi superavano la riga disponibile a1024px | Container query sotto270px sulla sola tipografia e larghezza Next Mission; tutte le quattro missioni verificate nei sette viewport senza cambiare la griglia |
| Selezione dopo transizioni viewport | Lo scroll-snap cambia posizione a un evento resize pur mantenendo identica la larghezza host; il solo ResizeObserver non interviene | Listener resize che rivela la vera selezione, senza selezionare o comandare di nuovo il treno; rimosso al dispose insieme al ResizeObserver |

Il layer di integrazione U2–U5 è stato sostituito e organizzato per responsabilità; gli adapter TM/Composer/Depot già approvati sono conservati. Non è una catena di override aggiunti al vecchio layout. L'unico nuovo `!important` di geometria risolve la basis già `!important` del carosello frozen sotto500px: una console leggibile su tablet stretto, senza alterare le regole congelate. I `!important` per reduced motion restano limitati a quella preferenza.

## Binding e componenti reali

**Train Dock:** rimangono gli stessi callback di selezione, throttle, reverse, stop, lights, uncouple, couple e camera-focus. Tutti e quattro i treni esistono come vere console; frecce e tastiera raggiungono il quarto, mentre tre sono visibili sul desktop di riferimento. Gli ID di compatibilità restano unici e migrano sulla selezione reale. Le tabs equivalenti sono accessibili senza creare un secondo livello visivo. Nome, modello, conteggio e lunghezza derivano dai dati originali. Throttle `%` e `abs(velocity)` in `layout/s` sono distinti. Il nuovo modulo `speedometer.js` trasferisce la geometria100×100, gli angoli e il materiale brass-spun del design: nessuno stato, timer o algoritmo dimostrativo Claude è importato nel prodotto. La scala0–150 è quella del readout preesistente; non sono inventati km/h o pressioni caldaia.

**Sidebar:** i dispositivi canonici sono tutti conservati:WX-A,WX-B,Y-IN,Y-2,Y-3,Y-R1,Y-R2,Y-4. Le due indicazioni Straight/Diverging sono solo proiezioni nel pulsante originale, non nuovi attuatori concorrenti. Stato pressed, disabilitazione, motivazione esatta, focus e dispatcher ferroviario restano reali. Il blocco iniziale WX-A è visibile, non rimosso per imitare il mock. La mappa è generata da tutti gli archi della rete canonica e dai veri punti locomotiva; marker e legenda mantengono selezione/centratura. Day/Sunset/Night chiamano l'input originale; `rollingModels` è il medesimo nodo con il suo handler, spostato nel Menu. Mission name/index/detail/Next Mission restano collegati al sistema originale; istruzioni complete nel Menu. Nessun avanzamento finto è stato aggiunto per riempire una barra del mockup.

**Header/Menu:** le targhe usano mogano, ottone brushed, rivetti, viti, foglia SVG e Federo originali. Lo stato Paused/Running è reale. I tre annunciatori dimostrativi Collision/Points/Buffer non vengono riprodotti come indicatori fittizi. Sound conserva il controller UI originario ed è distinto dalla warning Bell. TM si apre dal Menu con i coordinator M1/M2/M3 originali e ritorno del focus corretto; shortcut mobile Stock conservato.

**Scena:** un solo canvas WebGL2, vero renderer/motore, camera e picking esistenti. Il placeholder è presente solo nello screenshot della reference isolata, mai nella correzione. Nessuna modifica alle150rotaie, geometria/massicciata, scena, topologia, WX310, protezioni o fisica. Nessun nuovo scenario3D Claude.

## Materiali e provenienza

Tutte le sei texture runtime corrispondono **byte per byte agli export originali** nel commit design, sotto `docs/design/main-ui-redesign/serien-mainui-v1/assets/textures/`:brass-brushed,brass-spun,enamel-green,mahogany,parchment,steel-brushed. I percorsi `ui/...` sono le copie runtime già approvate. Ogni JPG restituisce HTTP200 nell'harness; computed styles e pattern SVG attestano l'effettivo uso sulle superfici e sull'indicatore, non soltanto la presenza sul filesystem.

Il CSS principale frozen è identico alla fonte design. Tokens e CSS Train Management rimangono identici alla baseline pubblicata: la sola rimozione storica dell'import Google dai token precede questo hotfix e i tre WOFF2 locali restano invariati. La reference HTML contiene anche rappresentazioni JPEG inline che differiscono byte per byte dagli export JPG: sono conservate nella reference eseguita; il prodotto usa gli esatti file frozen esplicitamente richiesti, non texture approssimate. Questa differenza può contribuire al pixel-diff e non viene nascosta.

Evidenze: [identità frozen/export](evidence/VISUAL_PARITY/frozen-source-identity.json), [confronto con JPEG inline](evidence/VISUAL_PARITY/original-texture-identity.json), [computed styles/HTTP e stati UI](evidence/VISUAL_PARITY/ui-gate/results.json). Cinzel Decorative700, Federo400 e Cutive Mono400 vengono caricati dalle risorse locali; nessuna nuova richiesta font esterna nel runtime testato.

## HUD, warning, camera e log — matrice effettiva

| Stato / azione | Nuova verifica |
| --- | --- |
| Normale compatto | Nome reale del prossimo punto, distanza, bordo250×44 nel viewport; azione minimize originale |
| Expanded/minimized | Sette viewport, diagramma originale, zero mutazioni ferroviarie causate dalla UI |
| Guarded Stop | Rischio e ragione reali visibili con HUD aperto/chiuso a1692,1024,390; nessuna sovrapposizione warning/HUD |
| Occupied / approaching | Stato predisposto sul vero motore isolato, pulsante disabilitato e ragione esatta; comando rifiutato senza mutazioni |
| UNKNOWN da storia incoerente | Fault locale sugli oggetti reali, guardia fail-closed e messaggio del motore; nessun mock di snapshot |
| Frenata per inversione | Direzione reale e `Braking to reverse` dal generatore originale |
| Terminale / nessuno scambio | `No switches ahead` e distanza residua dal percorso reale |
| Camera/View | Popup entro il viewport in tutte le dimensioni; zoom, Home/Recenter, preset, Follow, pan e orbit originali |
| Bell/Sound | Mute Bell sincronizzato Menu/chip, warning conservato; Sound UI non altera la Bell |
| Log | Testo completo nel preview e nel nodo originale, apertura/chiusura disclosure; confronto textContent verbatim, non whitespace normalizzato |
| Quarto treno e resize | Frecce/input da tastiera e ripristino della console selezionata dopo screenshot/resize a larghezza invariata |
| Cleanup | pagehide rimuove overlay/menu Bell, timer e voci audio; listener resize del carosello rimosso nel suo dispose |

Le prove di stati pericolosi o incoerenti avvengono solo nel laboratorio locale con oggetti reali predisposti dal test. Non vengono eseguite contro dati o sessioni di utenti reali.

## Test, artefatto e distinzione delle prove

| Gate | Esito / provenienza |
| --- | --- |
| Node | **254 PASS**, nuova esecuzione locale sul codice finale; zero fail/skipped |
| Python JMRI | **9 PASS**, nuova esecuzione locale |
| Canonico | Rigenerazione70nodi/75archi/4terminali; nessun diff dei quattro file generati |
| Build | PASS locale Node24.19.0/esbuild preesistente; nessuna dipendenza installata nel prodotto |
| Visual regression |21screenshot reference/prima/correzione +7overlay +7diff +7maschere; sette viewport, macro desktop0px |
| UI/HUD | **6 gruppi PASS**, 16 ricevute di stato, nuovo observer sul bundle finale, zero pageerror/HTTP failure |
| RAF nativo | **5 gruppi PASS**, 125 frame osservati, bundle finale, RAF originale non sostituito; tre/quattro treni, comandi, frecce, M1/M2/M3, reset/generation/STALE e consensi reali |
| Picking/risorse | **5 gruppi PASS** sul codice finale con observer di oggetti: otto click3D veri, locomotiva, mouse/touch, topologia HUD e cleanup |
| Matrice ferroviaria5C | **11 scenari PASS**, nuova esecuzione durante l'hotfix prima degli ultimi affinamenti di presentazione; motore/dispatcher/controlli invariati per hash, finale anche coperto da native/picking |
| Contenuti finali | **28 stati missione PASS** (4×7viewport), sette verifiche console/overflow; nuovo controllo mirato dopo l’ultimo ritocco CSS |
| Auth/Supabase/RLS/deps/workflow | Identità byte rispetto alla baseline; non si dichiara un nuovo test OAuth live |
| Packaging locale | Ricetta REL002 invariata,97file/24documenti; nessuna nuova evidenza aggiunta alla whitelist pubblica |
| Qualità documentale/scope | Diff whitespace, link e manifest delle prove verificati; nessun file di motore o frozen fuori perimetro |

**Bundle finale:**1091381byte, SHA256 **`714aac5f7534702a96d01a347db25c1497739d1081af3f2ed6f702e9f2ddb7bd`**. Pacchetto locale **4497128byte**. Il manifest hotfix è [package-manifest.json](evidence/VISUAL_PARITY/package-manifest.json): il vecchio hash REL002 non è impropriamente attribuito alla correzione. Il package viene soltanto preparato localmente, non pubblicato.

L’ultimo ritocco riguarda esclusivamente la tipografia delle missioni nei contenitori sotto270px. Bundle JS e observer sono invariati rispetto ai PASS native/UI/picking. I rispettivi risultati storici conservano i loro hash autentici; il CSS finale è coperto da28nuovi stati missione, sette controlli console/overflow e dalla ricattura completa. Nel viewport nativo650×700 il contenitore missione è più largo di270px: il ritocco non si applica. [Verifica di scope finale e diff CSS](evidence/VISUAL_PARITY/final-scope-verification.json), [controllo contenuti](evidence/VISUAL_PARITY/control-fit.json).

Le prove browser usano un bootstrap Auth esplicito **solo locale** per osservare la vera applicazione e il suo renderer. Gli observer aggiungono riferimenti agli oggetti reali nel solo bundle di laboratorio; non fanno parte di `dist/game.js` o del prodotto. Il test nativo usa invece il vero bundle di produzione e RAF originale, con un osservatore separato di frame. Comandi DOM programmati e input mouse/tastiera/touch trusted sono distinti nelle ricevute, senza attribuire automaticamente trusted a ogni azione. Non vengono simulati login Google o sessioni cloud.

Evidenze primarie: [Node](evidence/VISUAL_PARITY/node-tests-final.txt), [Python](evidence/VISUAL_PARITY/python-tests-final.txt), [build](evidence/VISUAL_PARITY/build-final.txt), [native](evidence/VISUAL_PARITY/native-final/results.json), [picking](evidence/VISUAL_PARITY/picking-final/results.json), [5C](evidence/VISUAL_PARITY/railway-5c/docs/phase-5c-close/acceptance.json), [invarianti](evidence/VISUAL_PARITY/invariants-and-package.json). Ricette e hash di provenienza sono conservati accanto alle prove.

## Differenze residue motivate

- **Dati e sicurezza:** nomi/stati/modelli veri, otto dispositivi anziché sette, ragione di occupazione visibile, mappa canonica, missioni reali e velocità `layout/s`. Nessun falso allarme, pressione, km/h o clearance inventata per ottenere uguaglianza pixel.
- **Mobile390×844:** header110px e viewport388,23px come nella reference; dock210px contro195px per conservare modello/readout reale e comandi completi. Tutti e quattro i pannelli sono consultabili sotto il dock; la reference nello stato Trains nasconde Environment/Switches/Missions e mostra solo Map. Il diff dell'intera pagina conserva questa divergenza. Navigation/Stock/Menu reali rimangono disponibili.
- **Tablet768×1024:** scena380px contro340px e una console larga leggibile al posto di due moduli stretti; dock166px per le funzioni reali. Sidebar in due colonne con i quattro pannelli e otto scambi. Il mock porta dock108px e sidebar533px: quella compressione non viene imposta ai controlli reali.
- **Sidebar desktop:** il riquadro complessivo coincide; distribuzione interna modificata di pochi pixel per evitare il lieve sforamento inferiore della reference e mantenere la ragione di blocco dell'ottavo dispositivo. Nessuno scrolling dell'intera sidebar nei cinque desktop verificati.
- **HUD/diagnostica:** Bell reale e log completo restano visibili anche quando il mock dimostrativo iniziale non li mostra. La toolbar differisce di circa2px di larghezza e il throttle di4px, con allineamento del resto del modulo verificato.
- **Materiali:** export frozen byte-esatti anziché JPEG inline della reference; nessuna nuova texture. Stati Paused/Running, percentuali e stringhe variabili rimangono reali e non sono mascherati nel diff.

Queste differenze sono consegnate per la decisione visiva della Regia, non cancellate o trasformate in un certificato pixel-perfect. GPU/dispositivi fisici, screen reader e browser diversi da Chromium non sono certificati da SwiftShader. Non è un audit WCAG completo o un benchmark equivalente5D. OAuth reale e i limiti Auth/Data API della release precedente restano separati; questo hotfix non li dichiara risolti.

## Anomalie e recuperi conservati

La prima reference Auto selezionava Low e disattivava le texture: le catture definitive selezionano High. Un test leggeva l'intensità sole prima del vero frame di rendering: corretto il timing del test mantenendo la formula attesa. Un selettore Sound precedente cercava il testo invece del nome accessibile reale: corretto il selettore e usato un click trusted fuori dal Menu. Il test del log confrontava innerText, che normalizza whitespace diversamente nel disclosure chiuso: il confronto finale usa textContent esatto e verifica l'apertura del nodo originale. Nessuna asserzione ferroviaria indebolita.

Il mancato ripristino della console dopo un evento resize a larghezza invariata è stato **riprodotto e corretto nell'adapter**, con listener e cleanup, prima del PASS finale. Sono conservati i risultati/log intermedi e la riproduzione, non soltanto le catture riuscite. Il controllo finale ha inoltre rilevato il taglio di due missioni a1024×768: corretto solo il dimensionamento tipografico nel contenitore stretto, quindi ricontrollati tutti i28stati. Le ricevute precedenti non sono state riscritte; la provenienza finale distingue bundle invariato e ritocco CSS mirato.

## File, Git e consegna

File applicativi: `index.html`, `src/train-deck.js`, `src/ui/shell.js`, `src/ui/sidebar.js`, `src/ui/dock.js`, `src/ui/overlays.js`, nuovo `src/ui/speedometer.js`, `ui/css/serien-ui-integration.css`. Documentazione: questo rapporto, gallery/evidenze, PROGRESS e stati attivi UI pertinenti.

**132file applicativi/frozen/backend sono byte-identici alla baseline**, inclusi `app.js`, domini R1/M1/M2/M3, canonico/topologia/mesh/asset, Auth, Supabase, package/lock e workflow. Nessuna nuova scrittura persistente: progetti e Depot restano session-only. Nessuna password, token/sessione cloud o riga utente nelle prove. Nessun cambio SQL/Auth/RLS, dipendenza o workflow di deploy.

Il branch dedicato viene pubblicato con push normale e checkpoint remoto verificato; niente force-push/rebase/reset, nessun lavoro sul vecchio branch d'integrazione o sul branch della PR #7. La PR è Draft verso main e **non viene integrata**. La produzione resta alla baseline pubblicata; un eventuale futuro merge/deploy richiede l'approvazione visiva e una distinta autorizzazione. 5E, certificazioni hardware/altri browser e nuovo scenario Claude non sono avviati.

**Verdetto tecnico: READY FOR REGIA VISUAL REVIEW.** La ricostruzione grafica originale è trasferita al runtime con geometria e materiali verificabili; le prove funzionali passano nel laboratorio dichiarato. La decisione di accettazione visiva e di rilascio resta alla Regia sulla PR Draft e sui confronti completi.
