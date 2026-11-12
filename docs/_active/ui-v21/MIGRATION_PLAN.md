# Piano U1–U9 normalizzato — NON autorizzato

Ogni gate richiede approvazione della fase precedente e autorizzazione esplicita della fase nominata. Lo stato di oggi è solo U0. I file sotto sono candidati **autorizzabili**, non modificabili in U0. Specifica dettagliata e file test esistenti: [TEST_GATES.json](TEST_GATES.json).

Prima di U1: acquisire e verificare i font/licenze con incarico appropriato; non sono già inclusi. U1 prepara soltanto file/fixture isolati; attivazione CSS per regioni da U2. La Regia potrà autorizzare il piano qui normalizzato, non il prompt originale con branch/base obsoleti.

## U1 — Asset staging (font/licenze già acquisiti e verificati prima dell'ingresso)

Ingresso/dipendenze: U0 approvata; autorizzazione U1; inventario font/licenze soddisfatto.

File autorizzabili: ui/css/*, ui/assets/textures/*, ui/assets/svg/*, ui/fonts/*; fixture/test isolati nuovi; docs/evidence. NO index.html o CSS attivo runtime.. Adapter: A12, A13.

Gate funzionale: Nessuna attivazione globale; order CSS e URL; stessi asset frozen, eccezione import font tracciata.

Gate visuale: Fixture isolata 1440×900 con font definitivi; app precedente invariata per hash.

Test nuovi (da implementare): U1-stage-fonts: hash asset/font/licenze; zero richieste esterne; font weights veri; order fogli fixture; tutti gli URL locali 200; bundle/app invariati. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U1/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Font/licenze incompleti, import remoto residuo o staging altera runtime → STOP prima dell'attivazione; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U2 — Shell/header/dialoghi e ingressi TM

Ingresso/dipendenze: U1 approvata, font/licenze PASS, fixture cascade PASS; autorizzazione U2.

File autorizzabili: index.html/style.css per regioni; src/ui/shell.js, guard-modal.js, sfx.js, keyboard.js; src/train-management.js solo getter/open/launcher; app.js solo binding UI; tests pertinenti. Adapter: A01, A02, A03, A10, A12.

Gate funzionale: Boot Auth invariato; nodi originali e ID preservati; Sign out esegue una volta, Exit disabled; TM unico store; plan labels read-only finché non cablati al dispatcher R1.

Gate visuale: 1440×900,1024×768,390×844; header/menu/help/plan/auth skin; regioni non migrate senza alterazioni.

Test nuovi (da implementare): U2-dialogs: cancel guard zero logout, doppio consenso una chiamata, RAM summary reale, focus/top-dialog, qualità quattro mode, menu rollingModels rollback, ingressi stesso TM; no auth-gate code diff. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U2/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Guard prematura/duplicata, cascade cambia parti fuori fase, launcher nuovo store, boot differente → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U3 — Overlay viewport reali

Ingresso/dipendenze: U2 approvata; autorizzazione U3.

File autorizzabili: src/ui/overlays.js; next-switch-view.js solo DOM/CSS; guarded-stop-scene.js solo posizionamento/interop UI status; view-controls.js solo binding; app.js solo UI. Adapter: A06, A08, A09, A10, A12.

Gate funzionale: Canvas unico; no pointer intercept fuori controlli; HUD read-only topologia reale; bell unico indipendente; log persistente.

Gate visuale: 1440×900,1024×768,390×844; tutti gli stati HUD e guarded stop muted; diagramma contro connessioni reali.

Test nuovi (da implementare): U3-overlays: pointer picking R1; HUD zero switch actions; bell chip/Menu stesso snapshot, UI Sound non mute bell; route 15s; messaggio rifiuto persistente; no mock imports. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U3/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: HUD attua scambi, campana duplicata, status riscritto, overlay blocca scena → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U4 — Sidebar scambi/ambiente/missioni/mappa

Ingresso/dipendenze: U3 approvata; autorizzazione U4.

File autorizzabili: src/ui/sidebar.js, lighting.js; app.js solo proiezioni/binding; index/style per regione; nessun modulo ferroviario. Adapter: A09, A12.

Gate funzionale: Otto controller dal registro; nessuna mutazione diretta s.on; rifiuti e motivi blocco; mission.next sempre; marker reali senza KPI.

Gate visuale: 1440×900,1024×768,390×844; tile blocked reason senza hover, mappa/day-night.

Test nuovi (da implementare): U4-sidebar: ID/numero da registro, route guard identica panel/3D, threshold 42/72, mission cycle senza completamento, map coordinates e focus. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U4/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: ID hardcoded mock, guard aggirata, stato previsto non reale, KPI inventati → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U5 — Dock/carousel e comandi globali

Ingresso/dipendenze: U4 approvata; autorizzazione U5.

File autorizzabili: src/ui/dock.js, keyboard.js; train-deck.js/train-deck-state.js solo presentazione; app.js binding e sola estrazione confirm reset; index/style per regione. Adapter: A03, A07, A10, A12.

Gate funzionale: Quattro treni, ogni card raggiungibile, ID stop unico selezionato, STOP ALL momentaneo, reset atomico e generation; speed% distinta velocity.

Gate visuale: 1440×900,1024×768,390×844; quattro card/carousel, actual gauge e throttle distinti, reset modal.

Test nuovi (da implementare): U5-dock: Space ferma solo selected, allStop incl hidden, rifiuto insertion occupata, fifth impossible, reverse/lights/couple R1 invariati, reset cancel/one-confirm, STALE e virtual session conservati; no km/h. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U5/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Doppie azioni, latch, ID stop duplicato, perdita treno nascosto o nuovo comportamento ferroviario → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U6 — TM shell, On the Layout e Catalog

Ingresso/dipendenze: U5 approvata; autorizzazione U6.

File autorizzabili: train-management.js/train-management-state.js solo proiezione/UI; train-side-view.js solo DOM/adapter; src/ui/guard-modal.js; CSS integration; nessun catalog/store/layout domain. Adapter: A02, A03, A04, A05, A10, A12.

Gate funzionale: Selezione condivisa, physical UUID/ordine/lunghezze, session only e guard reali; filtri solo vista, nessuna quantità; fallback esistente.

Gate visuale: 1440×900,1024×768,820×1180,768×1024,390×844; zoom/Fit/scroll native/Kenney e immagini mancanti.

Test nuovi (da implementare): U6-TM: tre launcher una istanza, close/Esc/backdrop dirty/no dirty, focus return, catalog role/source, actual dimensions, detached track remains, data-view draft retained, beforeunload condizione reale. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U6/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Remount perde sessione, immagini ridimensionano geometria, copy/focus scarta draft senza guard → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U7 — Projects/Composer/Compare

Ingresso/dipendenze: U6 approvata; autorizzazione U7.

File autorizzabili: train-projects-view.js, train-side-view.js DOM/adapter; src/ui/guard-modal.js/keyboard.js; integration CSS; store train-projects e train-side-layout invariati. Adapter: A03, A04, A05, A10, A12.

Gate funzionale: 1 loco+5 trailers, UUID posti stabili, confermati read-only, draft link only, comparison cinque stati e STALE, nessun apply/DnD/delete.

Gate visuale: Sette viewport; rail/inspector/tray/compare a sei veicoli e stato invalido/dirty/stale.

Test nuovi (da implementare): U7-composer: atomicità errors, create/copy/open/Edit/cancel/confirm, no link on confirmed, change real composition vs draft, keyboard locale non input, inventory reservations follow slots not model equality, zero physical changes. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U7/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Store mutato per adattare UI, relink silenzioso confermato, DnD o perdita identità/prenotazione → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U8 — Depot virtuale

Ingresso/dipendenze: U7 approvata; autorizzazione U8; M3 già approvata/presente in 91722fb, nessun merge/rebase.

File autorizzabili: depot-view.js e train-management.js solo coordinamento UI; src/ui/guard-modal.js; integration CSS; inventario/store invariati. Adapter: A03, A11, A12.

Gate funzionale: Virtual record≠catalog≠planned slot≠physical; confirmed-only assignments; reserved remove refused; no physical transfer.

Gate visuale: Sette viewport; available/reserved/empty/no-slot/notices/physical-detached separati.

Test nuovi (da implementare): U8-depot: add duplicate model unique UUID, assign exclusivity+compatibility, release/remove guard pending revalidation, confirm/cancel reconciliation, reset generation, scene/inventory isolation, native RAF tre treni e veri input. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U8/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Trasferimenti o creazione stock fisico, prenotazioni bozza, false identity binding → STOP; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.

## U9 — Responsive/accessibilità/regressioni finali

Ingresso/dipendenze: U8 approvata; autorizzazione U9; font/licenze verificati.

File autorizzabili: CSS integration/style e markup legacy solo cleanup dimostrato; UI modules cleanup/dispose; test/evidence; nessun dominio/config/deploy. Adapter: A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A11, A12, A13.

Gate funzionale: Tutti invarianti R1/M1/M1.1/M2/M3, controller/listener/GPU cleanup; no mock JS; tutti CTRL e schermate coperti.

Gate visuale: 1920×1080,1440×900,1280×800,1024×768,820×1180,768×1024,390×844; font reali,coarse44px,reduced-motion,Low,focus/contrast; hardware limits dichiarati.

Test nuovi (da implementare): U9-final: unit/build/canonical pertinenti, regressioni e native RAF tre treni su bundle reale; dispose/audio/URL; tutte le acceptance; confronto performance equivalente quando sostenuto. Test esistenti nominati nel gate JSON, con asserzioni semantiche preservate; nessuna migrazione a DOM futuro in U0.

Evidenze: docs/_active/ui-v21/evidence/U9/ : results.json, commands+exit codes, source/bundle hashes, screenshots, selector delta, invariants; never overwrite historical evidence.

Rischio/STOP: Qualsiasi failure non risolta, capacità mancante, font/focus non verificati → STOP; nessuna release/merge/deploy implicita; successful phase also STOP for separate Regia approval..

Rollback: Abort before checkpoint on failure; preserve work/evidence. After published checkpoint, explicit authorized forward revert of named phase only, rerun affected gates. No reset/clean/rebase/force-push; no change to main.
