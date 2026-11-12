# SerieN UI V2.1 — U3 REPORT

**U3 READY FOR REGIA REVIEW.** Proposta tecnica; approvazione riservata alla Regia. STOP dopo U3, U4–U9 non autorizzate.

## Ingresso e perimetro

Branch esclusivo `codex/ui-v2-integration`. Prima degli interventi: HEAD locale, upstream e remoto coincidenti con U2 approvata **`48a7c4d48b118877ec7edf7f4c61fba090e460b8`**, working tree pulito, commit applicativo U2 `19a84092131a81ee95a869218d77357723abf3a4` presente. Main remoto ancora `184cc9ba93a6b35493f365b2ffcb20ef0645963d`. Baseline R1/M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421` conservata. [Mandato U3](evidence/U3/AUTHORIZATION_U3.md), [ricevuta iniziale](evidence/U3/baseline.json).

Consultati piano U3, adapter A06/A08/A09/A10/A12, risoluzioni, registry dei controlli/schermate/gate e rapporto U2; reference V1/V2.1 congelate per anatomia camera/HUD/Bell e materiali. Usati gli asset/font locali già approvati. Nessuna logica dimostrativa importata.

U3 migra esclusivamente camera/Route, Next Switch HUD, status Guarded Stop/Bell, Operations Log e startup plate. Sidebar, Train Dock e viste M1/M2/M3 restano legacy. Nessun nuovo branch, merge, rebase, reset, force push, main, deploy o modifica backend.

## Implementazione e file

| File | Modifica e ragione |
| --- | --- |
| `src/ui/overlays.js` nuovo | Adapter DOM senza stato ferroviario: sposta i nodi reali in pannelli V2.1, espone View, preset e Bell nel Menu, sincronizza la sola presentazione; rimuove i propri listener e pannelli al dispose |
| `app.js` | Solo import, mount dopo la creazione del controller Guarded Stop, update dopo il suo update e dispose. Nessun corpo ferroviario, funzione log o handler Space modificato |
| `src/guarded-stop-scene.js` | Solo getter `ui` che restituisce un contenitore congelato dei tre nodi DOM originali. Geometria, posizionamento, hazard, timer, audio, unlock, visibility/pagehide e cleanup originali byte-identici dopo rimozione del getter |
| `index.html` | Solo classi U3, hook CTRL-064 e ruolo status sul vero `#loadMsg`. Testi/handler startup ed errori invariati |
| `ui/css/serien-ui-integration.css` | Appendice U3 commentata: materiali brass/enamel, font locali, griglia di posizionamento, View panel, leggibilità/contrasto, target ≥44 px, scroll dei testi lunghi e responsive. Prefisso U2 intatto; resta l'ultimo foglio |
| `tests/browser-ui-v21-U3.py` nuovo | Bundle produttivo, nove gruppi funzionali, matrici visive, route timer e stato terminale; solo Auth locale al confine del boot e RAF controllato |
| `tests/browser-ui-v21-U3-picking.py` nuovo | Observer isolato degli oggetti reali: input trusted su otto scambi/treno, Pan e touch Orbit, confronto SVG e teardown con Bell realmente attiva |
| `tests/browser-guarded-stop.py` | Due adattamenti UI: aprire/chiudere View prima del select camera e localizzare il medesimo pulsante tramite `#bellChip`, poiché il nome accessibile ora cambia correttamente tra Mute/Unmute. Tutte le altre righe e asserzioni restano identiche |

Documentazione/evidenze aggiornate solo in questa microfase. `src/next-switch-view.js`, `src/view-controls.js`, `src/ui/shell.js`, `src/ui/sfx.js`, navigazione, proiezione/topologia, picker/dispatcher, Bell controller, motore, store M1/M2/M3, Auth/Supabase, layout/scenografia, CSS legacy, font/licenze, asset U1/U2, dipendenze e workflow **invariati**.

## Contratti e divergenze conservative

- **Camera:** tutti i pulsanti e il select originali conservano ID e listener. Il pannello View aggiunge segmenti per i quattro preset reali, che consegnano `change` al select originale; Free camera legge `nav.preset`. Zoom, Pan/Orbit, Home e Follow usano gli stessi controller. Il Home dell'header U2 rimane operativo; non viene rimosso per imitare la reference. Depot/Loop dimostrativi sono sostituiti dai preset reali Freight yard/Follow. Route mantiene il disclaimer e il contratto di 15.000 ms, secondo click per nascondere.
- **Pointer:** un solo canvas, primo figlio del viewport; il layer di disposizione è `pointer-events:none`, i soli pannelli visibili ricevono input. Nessun backdrop trasparente esteso al canvas. View si chiude con Escape locale o pointerdown sul canvas, senza sopprimere il picking. Il pannello View aperto copre intenzionalmente la propria area e non costituisce un overlay invisibile.
- **A08:** riusato integralmente il vero HUD, con schema SVG originale, distanze, percorso, stato scambio e warning; solo un wrapper visivo. ID `#nextSwitchHUD` preservato, senza rinominarlo in `#nx` della reference. Unico pulsante: minimize/expand. Nessuna chiamata `requestToggle`, nessun nuovo dispatcher o diagramma fittizio. Connessioni e SVG normalizzato confrontati con `schemaSVG` della stessa proiezione reale.
- **A06:** status e chip sono i nodi originali della scena. `#bellSeg` nel Menu clicca il medesimo pulsante mute, poi entrambi rileggono l'unico `guardedStops.bell.snapshot`. Nessuna factory Bell nell'adapter, nessuna mutazione di UI Sound. Il testo di rischio originale resta visibile con Bell muted; si conservano unlock trusted, timer, voci, quiet su visibility/pagehide e disposal.
- **A09:** il solo contenitore Operations Log originale passa dalla sidebar al viewport. `log(s)` resta identico; messaggi completi, persistenti e senza classificazioni severity, KPI, timer o successi ottimistici. I testi lunghi possono scorrere, non sono troncati o sostituiti da toast.
- **A10/A12:** nessun handler globale aggiunto. Space originale e modali U2 preservati. Solo Escape locale nel pannello camera; input/select/button non diventano comandi ferroviari. Le regioni U3 riusano il contenitore CSS scoped U2 aggiungendo `u3-region`; non si allarga lo scope dei fogli congelati. Override U3 limitati ai pannelli nuovi e al pulsante Bell Menu.

[Delta dei 13 controlli e selettori](evidence/U3/selector-delta.json). I registry U0 rimangono registri della loro baseline, non vengono riscritti retroattivamente.

## Gate eseguiti

**14 comandi finali exit 0**, con comandi, variabili pertinenti, output e ricevute in [results.json](evidence/U3/results.json) e `evidence/U3/tests/`. Questi PASS derivano da nuove esecuzioni U3, non dai PASS storici U2.

| Gate | Esito ed evidenza |
| --- | --- |
| Node | **PASS 254**, zero fail/skip; inclusi navigazione, view controls, next switch, Guarded Stop, dispatcher e store |
| Python | **PASS 9** |
| Build produttiva e dipendenze del bundle | **PASS**, metafile in `bundle-inputs.json`; nessun input reference/mock/observer/test |
| Canonico | **PASS**, rigenerazione e diff zero su `src/canonical-layout.json` e `docs/jmri-layout` |
| U3 bundle produttivo | **PASS 9 gruppi**: camera reale, Route, HUD read-only, Bell/suono UI, rifiuto/log, tre viewport, terminale e tastiera |
| Picking U3 | **PASS 5 gruppi**: otto click 3D al dispatcher originale, hit su treno e stessa console, Pan mouse/touch Orbit, SVG reale e HUD immutante, pagehide da Bell con timer attivo e zero voci/timer dopo cleanup |
| Interazione scambi storica S2 | **PASS** con observer appropriato: otto ID, rami, mouse/touch/tastiera, gesture/cancel, occlusione, selezione treno e cleanup; test originale invariato |
| Guarded Stop storica S6 | **PASS** con harness appropriato e soli adattamenti UI descritti: segnale reale e pixel, geometria, animazione/reduced motion, più rischi, mouse/Enter/touch, audio sintetizzato offline, stop/reset/dispose ed engine operativo senza effetti. Speaker fisico non certificato |
| R1/5C | **PASS 11 scenari** della suite `browser-phase-five-close.py`, senza modifiche alle asserzioni |
| Phase Zero | **PASS**, tre circuiti, quarto treno e LRU, STOP ALL, scambi/HUD, entrambi i runaround, reverse, marker/mesh, quattro viewport e renderer unico |
| RAF nativo | **PASS**, bundle produttivo via HTTP, tre treni realmente avanzanti, Follow e drag trusted a manuale, un canvas, zero pageerror. **63 frame / 194.542,2 ms**, circa **0,319 fps SwiftShader**: prova funzionale, non fluidità hardware né benchmark comparabile a U2 |
| Integrità/architettura | **PASS**, 222/226 file del manifest baseline U2 byte-identici; quattro delta verificati per inversione esatta. Tutti gli altri asset/font/CSS U1/U2 identici; corpo scena Guarded Stop invariato salvo getter; testo log e controller HUD/camera invariati |

Le suite M2/M3 complete non sono state ripetute: moduli e contratti non cambiati, confermati per hash. I loro PASS precedenti restano storici; non si attribuiscono a nuove esecuzioni U3. Le vecchie suite con vincoli grafici legacy HUD (es. larghezza ≤215 px e traslucenza specifica nel test Train Deck) non sono usate come oracolo dell'aspetto U3; gli invarianti ferroviari interessati sono verificati da Phase Zero/R1 e dai nuovi gate. Nessuna asserzione ferroviaria indebolita.

Bundle finale SHA-256 **`e45a019e20ca80b079d00fc3c8ae5b4d36111e6bb3ec87733a9bb2d1d7709cfc`**, identico a quello servito nel test nativo. Observer isolato SHA-256 `1618f13765884fd47b7135f11b17c16b6ac76d2cb13d83c2e486e023f0aa785e`: costruito da sorgenti reali più soli hook, mai installato in `dist`. [Hash dei sorgenti](evidence/U3/source-hashes.json), [invarianti](evidence/U3/invariants.json), validator riproducibile `verify-invariants.py`.

## Visuale e accessibilità

**17 catture finali dell'app reale:** `shell/` contiene 13 PNG (quattro stati a 1440×900, 1024×768, 390×844 più terminale); `valid-route/` contiene tre PNG con previsione valida, percorso rosso e destinazione reale; `native/` aggiunge la cattura durante esecuzione RAF nativa. Le suite di regressione conservano altre immagini separate.

Ispezionate catture desktop e mobile con HUD/warning e camera aperta. Brass/enamel e tipografia locale riprendono la reference; i diagrammi rappresentano lo stato effettivo, anche quando un disallineamento lascia solo rami grigi. Corretto il solo contrasto del testo Route attivo sul brass, poi ripetuta la matrice finale. Nessun overflow orizzontale; target dei controlli principali ≥44×44 px. Su mobile il corpo HUD espanso e i messaggi lunghi scorrono dentro pannelli limitati: lo status Guarded Stop resta visibile indipendentemente dallo scroll e dal mute. Il pannello View aperto può coprire parte dell'HUD; Escape e click sul canvas lo chiudono. Sidebar/dock/TM conservano volutamente la presentazione legacy.

## Failure e recuperi, senza occultamento

Log ed esiti intermedi preservati in `tests/*first*`, `*second*`, manifest `*initial*`/`*intermediate*` e `failures/`; il riepilogo finale seleziona esplicitamente le esecuzioni con exit 0.

1. Server storico 8022 rispondeva con `curl: (52) Empty reply from server`: usato server locale isolato 8033, nessuna configurazione produttiva cambiata.
2. Primo scenario di rifiuto usava la correzione Y-4 da fermo che R1 permette. Fixture corretta occupando realmente Y-IN; messaggio atteso ricavato dal risultato del dispatcher e confrontato integralmente col log.
3. Attesa wall-clock Route in software superava la scadenza durante il rendering: verifica del contratto con clock monotono controllato a 0/14.999/15.000 ms, sul vero handler originale, come nei test esistenti. Nessuna falsa prova di timing hardware.
4. Primo observer S6 non eseguiva il tick nel `renderFixed` previsto dal suo harness; ripristinato il metodo di profiling con tick/render reali. Poi adattata l'apertura View e il selettore Bell al DOM U3, conservando tutte le asserzioni. Warning di deprecazione Pillow nel test storico conservato; nessuna dipendenza modificata.
5. Primo confronto stringa SVG differiva per serializzazione DOM dei tag autochiusi: normalizzato anche l'SVG atteso tramite DOM, poi confronto esatto PASS.
6. Primo smoke nativo superava il timeout input di 30 s con SwiftShader continuo: timeout del solo harness portato a 120 s; esecuzione completa PASS senza cambiare sorgenti applicativi. Limite prestazionale software registrato.

## Limiti, sicurezza e consegna

**NOT VERIFIED:** fluidità/GPU/touch/audio fisici e screen reader; browser diversi da Chromium e relativo supporto `@scope`; OAuth Google reale/logout remoto; prompt beforeunload nativo; accettazione completa U9. Nessuna credenziale o sessione remota usata/modificata. I test usano un confine Auth locale esplicito, non attestano il provider reale.

Railway R1, quattro treni/tre console LRU, STOP ALL momentaneo, Space selezionato, dispatcher degli otto scambi, topologia/canonico, identità fisiche, M2/M3 session-only e separazione inventario/progetti/simulazione preservati. Nessun nuovo endpoint, persistenza, controller Bell, renderer, KPI o logica mock. Auth/Supabase/RLS/API, workflow e branch originali intatti. Resta il prerequisito di packaging `ui/` per una futura release separatamente autorizzata, già documentato in U2; nessun deploy eseguito.

Nessun impedimento tecnico U3 residuo nei gate eseguiti. Checkpoint atomico sul solo branch autorizzato, SHA completo e corrispondenza locale/remoto nella consegna. **U3 READY FOR REGIA REVIEW — STOP.** Prossima attività consentita: sola revisione indipendente della Regia; nessuna U4 avviata.
