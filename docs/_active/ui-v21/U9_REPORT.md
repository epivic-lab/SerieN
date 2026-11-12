# U9 — Final UI Acceptance

**Verdetto tecnico proposto: READY WITH DOCUMENTED LIMITATIONS.** La proposta riguarda il codice UI V2.1 e richiede la revisione indipendente della Regia. **Il pacchetto dell'attuale workflow Pages è RELEASE BLOCKED (REL-001)**: manca `ui/`. Nessun merge, deploy, PR di release o nuova fase eseguiti.

## A. Baseline e perimetro

Mandato esclusivo U9, [autorizzazione](evidence/U9/AUTHORIZATION_U9.md). Repository `epivic-lab/SerieN`, branch `codex/ui-v2-integration`. Ingresso approvato U8 **`30c56aa28e60ce83fe0cbb36209006752325bea8`**, remoto coincidente e tree pulito. U7 `cca11fb76d36e9688f41392fa1592b9a3514dce9` e main produttiva `184cc9ba93a6b35493f365b2ffcb20ef0645963d` antenati verificati.

L'ambiente era inizialmente sul branch locale `work` alla main produttiva, senza registry V2.1. Recuperato il solo branch autorizzato dal remoto, con verifica SHA; configurati fetch refspec/upstream mancanti. Nessun reset, rebase, force-push o riscrittura. [Baseline Git](evidence/U9/git-baseline.json). Il commit atomico di consegna, il suo SHA completo e l'uguaglianza locale/remoto sono riportati nel messaggio di checkpoint, evitando un hash autoreferenziale nel commit.

Consultati AGENTS, piano, adapter, risoluzioni, registry, gate, STATUS e U8_REPORT. Verificate le copie frozen CSS/asset U1 e la loro provenienza; confrontata la reference Depot archiviata con le catture reali. Il tentativo di riottenere l'intero ZIP da Drive ha incontrato il proxy 403. Nel recovery è stato recuperato in sola lettura l'HTML originale Main UI dal branch `design/main-ui-redesign`: il CSS corrisponde byte per byte al frozen. Nessun JS mock importato nel runtime. [Integrità frozen](evidence/U9/frozen-assets.json).

## B. Copertura completa

- [66 controlli](evidence/U9/control-coverage.json), derivati direttamente da CONTROLS.json: regione, implementazione, callback effettivo, autorità, enabled/disabled, Session only, evidenza funzionale/visuale e limiti per riga.
- [31 schermate/stati](evidence/U9/screen-coverage.json), derivati direttamente da SCREENS.json. Persistence e mock reference esclusi; Menu/mobile sono adapter reali già autorizzati U2, senza importare il loro JS di riferimento.
- [A01–A13](evidence/U9/adapter-coverage.json), senza estendere i contratti. Sign out resta il listener Auth originale; nuova persistenza e trasferimenti fisici non esistono. Le targhe Depot indisponibili e Exit to title disabilitato sono intenzionali.

Le evidenze per Login sono locali/statiche e non certificano il provider OAuth; beforeunload verifica il vero handler sinteticamente, non il prompt del browser. Lo startup riuscito è verificato; una nuova sessione con guasto reale WebGL non è stata forzata.

## C. Correzioni minime

Registro completo: [issues.json](evidence/U9/issues.json), con riproduzione, root cause, file, delta e test.

| ID | Correzione |
| --- | --- |
| U9-001 | Dock: il binding percentuale throttle puntava al primo output, ora occupato dalla velocità reale. Selettore circoscritto a `.trainConsoleSpeed output`; prova 37% richiesto contro 0.0 layout/s reale a pausa. |
| U9-002 | View: popup prima coperto dall'header nei viewport bassi; ancorato al canvas, altezza limitata allo spazio sopra la toolbar primaria. Misure soltanto su apertura/resize, listener nella lista dispose esistente. Preset e Zoom raggiungibili anche con menu aperto. |
| U9-003 | TM: rimosso `aria-pressed` non valido sui quattro `role=tab`; conservati `aria-selected`, roving tabindex e callback. |
| U9-004 | Dock: rimossi ellipsis/nowrap operativi residui; descrizioni e stato a 14px, scala secondaria a 13px e righe header contenute. |
| U9-005 | Depot/Compare: modello, codice, stato e prenotazione precedono gli identificatori; UUID completi in `details` nativi. Compare mantiene cinque etichette/stati reali con gerarchia visiva distinta. |
| U9-006 | Focus visibile shell/legacy, pulsanti dialoghi e summary da 44px; reduced motion esteso a shell, guard e TM. |

Delta applicativo: **sei moduli di presentazione** (`train-deck`, `train-management`, `train-projects-view`, `depot-view`, `ui/overlays`, `ui/shell`) e appendice CSS integration. Prefisso U8 e fogli frozen intatti. Il gruppo dei selettori Dock ha ora un ruolo group esplicito; i conteggi carri restano testo nativo senza label impropria su span generici (U9-007). Nessun componente complesso, controller parallelo, nuova dipendenza runtime o stato di dominio aggiunti.

## U9-HDR — Autumn Railways Engraved Brass Plate

La Regia ha confermato la non conformità U8/U2: il sottotitolo libero `.u2-edition`, 13px Cutive Mono, non aveva piastra e scompariva sul telefono. Il recovery ha inventariato staged/unstaged/untracked, evidenze, commit e worktree senza cancellare lavoro; locale/remoto erano ancora U8, nessun commit U9. [Recovery](evidence/U9/recovery-state.json), [mandato integrativo](evidence/U9/AUTHORIZATION_U9_RECOVERY_HDR.md).

Fonte originale Main UI recuperata dal commit `cf2c29a8112b37a53c62cb84fca44061942aea31`, branch `design/main-ui-redesign`. Il CSS originale coincide esattamente con `ui/css/serien-ui.css`. HTML e crop originali confermano `.edp`, due `.scr` e foglia `emb-maple`: [provenienza ed estratto](evidence/U9/header-engraved-plaque/reference-source.json), [crop originale Claude](evidence/U9/header-engraved-plaque/claude-original-header.jpg).

Ripristinato il markup originale nella sola shell, con decorazioni `aria-hidden`, SVG originale esterno locale e unico testo accessibile. Materiale, viti, filetto, angoli, ombre e incisione sono ereditati dai fogli frozen; soltanto le ultime rifiniture `.hd .edp` sono riprodotte con scope nel foglio integration, più wrapping naturale per non perdere i comandi reali. Nessuna animazione a ganci/ovale intermedio o ornamento inventato. SERIE N e tutti gli ID/handler conservati.

Il gate compara i computed styles produttivi con una fixture statica dell'HTML/CSS frozen, senza eseguire mock JS: 46px desktop/44px mobile, padding 34/30/26px secondo breakpoint, Federo 400, tracking, bruno `#5a3d10`, text-shadow, viti, foglia e filetto corrispondono. Il testo non è troncato ai cinque viewport e tutti i bottoni header restano raggiungibili. Texture brass locale HTTP200 e hash invariato. Un solo nome accessibile, nessun `.u2-edition` nel DOM. [Risultati/computed](evidence/U9/header-engraved-plaque/delivery/results.json).

Prima/dopo e crop dettagliati a 1920×1080,1440×900,1024×768,768×1024,390×844 sono nella [cartella targa](evidence/U9/header-engraved-plaque/). Ispezionati direttamente i crop desktop/mobile. Nessuna pixel parity dell'intero header dichiarata: shell funzionale e font locali definitivi differiscono dai dati/mock del riferimento. U2 post-header riesegue Header/Menu/TM/Quality/Sign out/focus; G-U9 post-header verifica i sette viewport, Camera e superficie 3D; native post-header verifica convivenza ferroviaria. Esito della targa: **PASS**, subordinato al checkpoint finale e alla review Regia.

## D. Test e provenienza

[Comandi ed exit code](evidence/U9/commands.json), [matrice regressioni](evidence/U9/regression-matrix.json), [risultato conclusivo](evidence/U9/results.json). I log intermedi FAIL e l'interruzione del primo native run sono conservati e distinti dai recovery PASS.

| Gate | Esito ed evidenza |
| --- | --- |
| Node | **254/254 PASS**, zero skipped: [log finale](evidence/U9/tests/node-checkpoint.txt). |
| Python | **9/9 PASS**: [log](evidence/U9/tests/python.txt). |
| Build | PASS; [metafile finale](evidence/U9/metafile-final.json), [hash/size/input](evidence/U9/bundle.json). |
| Canonico | PASS, rigenerazione senza diff: [log](evidence/U9/tests/canonical.txt), [diff](evidence/U9/tests/canonical-diff.txt). |
| G-U9 visivo/DOM/a11y | PASS, sette viewport e 111 screenshot reali: [acceptance definitiva](evidence/U9/acceptance-checkpoint/results.json). |
| Shell/U2 | PASS, consenso/logout event-boundary, focus, quality e sessione: [risultati](evidence/U9/U2-header-final/result.json). |
| Viewport/U3 | PASS dopo recovery, suite originale: [risultati](evidence/U9/U3-final/results.json). |
| Sidebar/U4 | PASS, scambi protetti/motivi reali, mappa, ambiente e missioni: [risultati](evidence/U9/U4/results.json). |
| Dock/U5 | PASS, 4 card/LRU/Space/stop/reset/consenso: [risultati](evidence/U9/U5-adapted/results.json). |
| TM/U6 | PASS, shell/tab/identità/preview/focus e STALE: [risultati](evidence/U9/U6-adapted/results.json). |
| Projects/U7 | PASS, cinque Compare, UUID e prenotazioni: [risultati](evidence/U9/U7-adapted/results.json). |
| Depot/U8 | PASS, guard/reconciliation/reset e sette viewport: [risultati](evidence/U9/U8/results.json). |
| M1/M1.1/M2/M3 | Originali e adapter approvati rieseguiti; [M1](evidence/U9/M1), [side](evidence/U9/side), [M2](evidence/U9/M2), [M3](evidence/U9/depot-adapted). |
| Cicli lifecycle | PASS, 25 cicli Projects e 25 Depot, [matrice](evidence/U9/lifecycle-matrix.json); intenti obsoleti/doppio consenso [PASS](evidence/U9/intents/results.json). |
| Picking/Bell/cleanup | PASS, original observer harness sui sorgenti finali: [risultati](evidence/U9/picking-final/results.json). |
| Canonico integrato/Train Deck | PASS, suite originali tramite adapter: [Phase Zero](evidence/U9/tests/phase-zero-final.txt), [Train Deck](evidence/U9/tests/train-deck-final.txt). |
| RAF nativo definitivo | PASS sul bundle finale; [checkpoint e input trusted](evidence/U9/native-checkpoint-recovery/results.json). |

Le suite U4/U5/U6/U7/U8/M1/M2/M3 precedono, ove indicato dai loro hash, le ultime correzioni Camera/ARIA e la targa header; i moduli di dominio interessati restano identici. U2 è stata rieseguita dopo la correzione della targa. La matrice non le spaccia tutte per esecuzioni del bundle finale. U9 e native post-header, U2 post-header, header gate e Node post-header verificano il bundle conclusivo. U3, picking, Phase Zero e Train Deck U9 pre-header conservano la propria provenienza; i relativi moduli ferroviari/camera/picking sono byte-identici dopo la sola correzione shell. Il successivo delta semantico del Dock è verificato dal G-U9 finale e dal native finale. La ricostruzione [a14d…](evidence/U9/header-evidence-reuse.json) dimostra byte per byte che i test post-header precedenti differiscono dal bundle finale soltanto per quel delta. Gli adapter aggiungono consensi custom, Edit esplicito o attesa focus nativa: **nessuna asserzione ferroviaria indebolita** e test originali invariati.

Le matrici estese R1/5C undici scenari e scene/audio Guarded Stop sono **PASS storici verificati per identità dei file**, non nuove esecuzioni. [25 identità storiche](evidence/U9/historical-source-identity.json), [266 file baseline + 4 nuovi harness con hash](evidence/U9/source-hashes.json). Nessun PASS ricavato dalla sola presenza di screenshot storici. [Registro dei 59 test originali unici](evidence/U9/gate-test-coverage.json): distingue esecuzioni nuove, riuso storico e suite legacy sovrapposte non rieseguite; le suite complete Phase 1/3/4 e i vecchi runtime standalone non sono dichiarati nuovi PASS.

## E. Visual, responsive e accessibilità

Verificati **1920×1080, 1440×900, 1280×800, 1024×768, 820×1180, 768×1024, 390×844**. [Matrice responsive e indice screenshot](evidence/U9/responsive-matrix.json), [matrice accessibilità](evidence/U9/accessibility-matrix.json).

Schermata principale, Day/Low, Night/High, Layout/Catalog/Projects/Depot, Composer sei veicoli, rail fino all'ultimo veicolo, inspector, Compare e card Reserved/identità sono acquisiti ai sette viewport. Altre catture documentano cinque Compare, vuoti/invalidi/dirty/STALE, warning ferroviari, consensi, reset, Stop/Pause, focus e reduced motion. Nessuna schermata dell'app è prodotta dal mock reference.

Nessun overflow orizzontale di pagina/dialogo rilevato nei casi. Scroll interni e carousel restano intenzionali; canvas unico con superficie raggiungibile tramite hit-test e picking trusted. Nessun overlay invisibile prende gli eventi 3D. Popup View limitato al viewport e separato dai controlli primari; warning/sidebar/log conservano il testo senza hover.

**axe-core 4.11.0: zero violazioni** nei sei stati finali main, Layout, Catalog, Composer, Depot Reserved e guard. Le verifiche incomplete di axe sono elencate, non convertite in PASS. Ispezionati visualmente scena/header/Dock mobile e desktop, gerarchia Depot/Compare e consensi; palette, font, materiali e regole frozen conservati. Le differenze deliberate già approvate U2–U8 — dati ferroviari reali, HUD topologico, cronologia LRU distinta, avvisi Session only, assenza di KPI/trasferimenti mock — restano necessarie. Nessun redesign delle card U8 approvate per imitare le card mock su carta.

Tastiera: Tab/Shift+Tab, focus visibile/ritorno, top-dialog Escape, tab TM Home/End/arrows, carousel Home/End, shortcuts locali Composer/input exclusion e Space sul selezionato. Chromium può passare per BODY/chrome nel giro Tab nativo: verificato il ritorno ai controlli del dialogo, senza focus sui controlli applicativi sottostanti; nessuna trap parallela introdotta. [Probe isolato](evidence/U9/tests/native-dialog-focus-probe.txt).

Target principali ≥44px; piccole icone SVG della mappa conservano bottoni legenda equivalenti ≥44px. Zoom/scroll/Fit touch nei test originali. Reduced motion, ingrandimento del testo root e viewport CSS equivalente a zoom 200% verificati senza perdita dei contenuti. Questo non certifica il chrome zoom nativo, hardware touch, screen reader o conformità completa WCAG.

## F. Ferrovia e sessioni virtuali

[Venti invarianti](evidence/U9/invariants.json). Motore R1/dispatcher/topologia/geometria/catalogo/150 rail meshes e domini M2/M3 invariati. Quattro treni massimi, LRU tre indipendente, STOP ALL momentaneo, Space selezionato, otto scambi protetti, HUD read-only, Bell indipendente da UI Sound, log reale persistente, camera/Follow/picking/Pause e Add protetti conservati.

Il native gate definitivo compatto esegue comandi DOM reali in gruppi, tastiera Dock trusted, launcher TM mouse trusted e creazione Depot touch trusted. I precedenti gate completi U9 con input trusted per tutte le azioni sono conservati ai loro hash. Non viene fatto un confronto prestazionale fra i metodi. Il native gate usa **la funzione RAF originale mai sostituita**; un osservatore RAF separato conta soltanto i frame. Nessuno step manuale o observer bundle usato in sua sostituzione. Verifica tre treni reali simultaneamente, quarto inserito consentito, selezione/Dock/Space, restart dopo STOP ALL, Pause/Resume, scambio protetto e HUD, Follow/Home, TM/Composer/Depot durante il moto, Cancel/consenso sui veri controlli, input trusted mouse/touch/tastiera, close/reopen e reset/generation. Ogni checkpoint confronta UUID e pose ferroviarie con la scena; nessun errore runtime o contesto perso rilevato.

Progetti, record virtuali e slot rimangono coerenti; reset conserva dati virtuali e rende STALE il riferimento fisico. Couple/uncouple R1 e prenotazioni UUID esercitati dalle suite integrate M2/M3/Dock/Phase Zero. Nessun Apply globale, trasferimento fisico, mock, telemetria fittizia o nuova persistenza.

## G. Risorse, font e asset

Un solo renderer/canvas nei checkpoint. Pagehide/dispose rimuove overlay e handler, timer Bell attivo e voci; consensi pending non eseguono callback. I cicli ripetuti non lasciano dialoghi o guard unload osservabili; i launcher disposti restano inerti. Il listener resize aggiunto usa il disposer originale. Il delta non crea risorse GPU, AudioContext, URL temporanei o fetch. Non viene affermata assenza universale di leak.

Cinzel Decorative **700**, Federo **400**, Cutive Mono **400**: WOFF2 locali, firme, SHA, OFL e provenienza immutabile confermati; computed family/weight reali e decodifica con browser offline registrati. Nessuna richiesta Google Fonts runtime o altra nuova richiesta esterna nella fixture locale. L'offline dei font non implica login OAuth offline o cold start Auth offline. Ordine cascade e copie frozen conservati. [Hash bundle/asset](evidence/U9/bundle.json), [font/a11y](evidence/U9/accessibility-matrix.json).

## H. Release readiness e limiti

[Audit packaging in sola lettura](evidence/U9/release-readiness.json). HTML/CSS e asset referenziati esistono nel checkout e usano percorsi relativi compatibili con `/SerieN/`. **REL-001 confermato**: `.github/workflows/pages.yml` non copia `ui/`; il bundle JS non incorpora quei CSS/font/texture. Proposta minima per autorizzazione successiva: `cp -R dist assets ui _site/`. Workflow intatto, nessuna pubblicazione eseguita. Monitorare inoltre la dimensione dell'archivio docs copiato dal workflow.

Restano NOT VERIFIED: GPU/FPS/fluidità fisici, screen reader, audio/touch/tastiera fisici, browser diversi da Chromium, provider OAuth/cloud live, prompt beforeunload nativo, chrome zoom reale, nuovo benchmark completo 5D e pacchetto Pages pubblicato. SwiftShader fornisce prova funzionale; i conteggi RAF non certificano prestazioni hardware e non sono un confronto prestazionale equivalente.

## I. Consegna alla Regia

**READY WITH DOCUMENTED LIMITATIONS.** Gate software U9 soddisfatti nel perimetro documentato; nessun failure tecnico irrisolto del codice UI. Release/deploy bloccati separatamente da REL-001. [Failure e recovery](evidence/U9/failure-recovery.json), [rischi/NOT VERIFIED](evidence/U9/regression-matrix.json). Gli screenshot intermedi ridondanti sono in scratch con hash nel [registro retention](evidence/U9/intermediate-capture-retention.json); finali e failure pertinenti inclusi nel checkpoint, archivio U0–U8 non ricopiato.

**STOP U9.** Attendere esclusivamente la revisione e l'approvazione indipendente della Regia. Nessuna fase successiva, integrazione main, modifica al workflow o pubblicazione autorizzata da questo rapporto.
