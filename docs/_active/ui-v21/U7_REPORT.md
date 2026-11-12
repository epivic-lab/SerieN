# SerieN — U7 Projects, Composer & Compare

**U7 READY FOR REGIA REVIEW — STOP.** U8/U9 non avviate; approvazione esclusiva della Regia.

## Ingresso e perimetro

U6 approvata `6f8a28a4fe49875dc499872454d5128b2860bdfc`, uguale a HEAD/upstream/remoto prima degli interventi; working tree pulito. U5 e main produttiva `184cc9ba93a6b35493f365b2ffcb20ef0645963d` verificate come antenate. Branch esclusivo `codex/ui-v2-integration`. Consultati AGENTS, piano/G-U7, A03/A04/A05/A10/A12, risoluzioni, registri controlli/schermate, rapporto U6 e materiali CSS/token frozen. [Mandato](evidence/U7/AUTHORIZATION_U7.md).

## Implementazione

| File | Delta |
| --- | --- |
| `src/train-projects-view.js` | Dashboard confermati read-only; `savedId` e `selectedVehicleId` sono sola presentazione. Selezione confermata non chiama store.open; Edit globale o per progetto è distinto e protetto. Composer con rail/card/inspector/tray, errori reali, controlli e hook CTRL-031–040/057/058. Compare mantiene i cinque esiti del dominio e mostra slot/source reference/UUID fisici distinti |
| `src/train-management.js` | Unico intervento di wiring: aggiunto `guard` agli argomenti di createTrainProjectsView. Tutto il resto U6 byte-identico. Una sola istanza/coordinator per shell e Projects; nelle fixture standalone la vista possiede un coordinator locale |
| `ui/css/serien-ui-integration.css` | Sola appendice `.u7-projects`: enamel/brass, rail parchment scrollabile, inspector, tray e Compare responsive. Prefisso U6 intatto, foglio ultimo. Nessuna skin Depot/U8 o revisione U9 |

Store `src/train-projects.js`, Depot M3, geometria `src/train-side-layout.js`, Side View, catalogo, motore/dispatcher/topologia, asset/font, app/index/Auth/Supabase e dipendenze restano invariati. Nessun nuovo renderer, store di composizione, Apply/Delete Project, DnD, trasferimento fisico o persistenza.

**Guard.** Tutti gli intenti Projects New/View confirmed/Edit/Copy/Cancel passano dal coordinator condiviso. Dirty: consenso prima di cancel; al consenso confronto generation, draft serializzato, confirmed e target pertinente. Il riferimento di Copy è rivalidato su identità e realComposition. Clean segue l'azione diretta. `discard()` resta booleano sincrono (dirty richiede l'intento esplicito), `discardAfterConsent(expected)` U6 resta il confine di mutazione. Nessuna Promise o doppia conferma nativa/custom. Pending impedisce altri comandi; reset e dispose cancellano il pending tramite il medesimo coordinator. Operazioni annidate notificano onChange una sola volta alla fine, senza riconciliazione anticipata al consenso.

**Composer.** Solo begin/copy/open/rename/add/remove/move/flip/link/confirm/cancel del dominio. Locomotiva iniziale, cinque trailer, UUID stabili e ordine reale del draft; rail seleziona uno slot, inspector legge modello/dimensioni/orientamento/riferimento, tray legge PROJECT_CATALOG. Errore di dominio mostrato senza successo ottimistico. Confermati senza input/Link/comandi mutanti; Edit apre la bozza. Link solo sul draft, senza confirm implicito o relink STALE automatico.

**Compare.** Solo compareProject/realComposition: Unlinked, Matching, Different, Changed, Stale. Le righe distinguono UUID slot, sourceVehicleId e UUID fisico corrente: stesso modello non significa stesso veicolo. Cambiamenti fisici nei test provengono esclusivamente da Uncouple/Couple/Reset R1 reali.

**Side/keyboard.** Riutilizzati createTrainSideView e projectSideLayout, manifest/coupler/scala N/zoom 1–6/Fit/scroll/fallback originali. Nessun setZoom pubblico assunto. Un solo listener locale al root Composer: contesto connesso/visibile, slot effettivo, input/textarea/select/contenteditable/pulsanti/dialoghi esclusi. Alt+Left/Right riordina solo trailer validi; F e Delete agiscono sullo slot virtuale valido. Nessun nuovo Space globale.

## Verifiche

[Results e comandi](evidence/U7/results.json), [hash/invarianti](evidence/U7/invariants.json), [mapping](evidence/U7/selector-delta.json), [guard](evidence/U7/guard-matrix.json), [Compare](evidence/U7/compare-matrix.json), [Depot](evidence/U7/Depot-contract.json).

- **PASS eseguiti:** 254 Node (incluse atomicità M2, slot e riconciliazione M3), 9 Python, build/metafile/canonico e diff zero; M1; Side View originale con geometria, native/Kenney, touch e sei veicoli; lifecycle Projects con 25 mount/dispose.
- **Browser U7:** cinque gruppi completi. Creazione/sei slot/UUID/reorder/flip/keyboard/errore atomico; confirmed read-only/Edit esplicito/New/Cancel/consenso singolo; riserva Depot mantenuta su draft e Cancel, rilasciata solo a Confirm quando lo slot è rimosso anche se resta un modello uguale; cinque stati Compare reali e Link solo in draft; sette viewport, zoom/Fit/scroll/fallback/sessione/dispose pending. [Prova definitiva](evidence/U7/checkpoint/results.json).
- **Regressioni:** suite Projects M2 con tutte le asserzioni originali, U6 completa e U5 completa; unici adattamenti di input: consenso nativo tradotto in click della guard, Edit esplicito dopo selezione read-only, attesa del close event nativo per il focus. File storici non riscritti. Domini mai allentati per adattare il DOM.
- **Runtime:** ricevute native in results.json. La suite Projects runtime storica usa RAF continuo, tre treni avanzanti, input mouse/touch CDP trusted, confirm/close/reopen e operazioni R1 reali. La verifica breve finale usa il bundle definitivo con quattro treni, Copy/Flip/Confirm durante il movimento, poi Space/STOP ALL/ripartenza/Pause/Resume originali. Nessun rendering o passo manuale sostituisce queste prove.
- **PASS storici documentati:** matrici estese U2/U3/U4/R1 e M2/M3 oltre ai contratti rieseguiti sopra; file immutati verificati per hash rispetto a U6. Non dichiarate nuove esecuzioni complete senza ragione.

I primi run precedono soltanto le ulteriori restrizioni dei tasti, l'Edit esplicito per card e gli attributi data-ctrl. Acceptance e native finali riportano la provenienza/hash effettivi; nessuna confusione tra bundle precursore e definitivo.

## Visuale, recuperi e limiti

Sette viewport: 1920×1080,1440×900,1280×800,1024×768,820×1180,768×1024,390×844. Catture dashboard vuota/popolata, readonly, composer vuoto/sei veicoli, reorder/flip, errore, guard New/Edit/Cancel, cinque stati Compare, preview zoom/scroll e fallback. `surfaces/` porta realmente in vista rail/inspector/tray/Compare con scroll del dialogo, senza override CSS o finte geometrie. Ispezionati rail mobile e inspector/tray desktop. Target principali ≥44 px e nessun overflow del dialogo; corpo e rail scorrono. Nessuna anticipazione responsive U9. Nessuna copia delle intere cartelle storiche.

FAIL intermedi preservati: baseline catturata prima del completamento dell'ingombro native della diesel (identità uguali, ingombri cambiati dall'inizializzazione originale; fixture stabilizzata sul coupler canonico prima del confronto ferroviario integrale); prima attesa della fixture su un coupler ancora assente, corretta con optional chaining; errore Path/function nel runner del consenso; harness storici ancora nativi e race sul close/focus. Recuperi documentati nei log e adapter, senza modifiche ferroviarie. I confronti fisici della prova definitiva rimangono integrali.

**NOT VERIFIED:** GPU/touch/audio/dispositivi fisici, screen reader, altri browser, OAuth remoto, presentazione nativa beforeunload e revisione globale U9. Touch = emulazione Chromium/CDP. I tempi SwiftShader non attestano fluidità o prestazioni GPU hardware. L'accettazione estetica e funzionale definitiva spetta alla Regia.

Nessuna credenziale o scrittura cloud, Supabase/Auth/RLS, backend o nuova persistenza. Dati variabili inseriti come testo/attributi DOM, nessun HTML utente eseguito. Checkpoint atomico e push normale sul solo branch autorizzato quando i gate finali sono verificati; SHA contenitore nella consegna per evitare autoreferenza. Nessun merge/main/deploy/Pages/force push.

**STOP dopo U7. U8 e U9 non avviate.**

Bundle definitivo: `8e6f7628c2b78fc4eb1abe6ef00ca99929ee66aae6d17cc5ac0163499c89ca6b`. Acceptance e native-checkpoint hanno lo stesso hash. Il runtime esteso precursore ha 480 frame in 929662,7 ms (~0,515 fps SwiftShader), con tutte le asserzioni originali PASS; nessuna conclusione hardware. Ultimo completamento di lifecycle: callback di input già scollegati ignorate dopo dispose, verificato anche con input trattenuto prima del rerender.
