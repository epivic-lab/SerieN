# UI V2.1 — Visual Parity Hotfix

**Stato corrente, 2026-11-14 — consegna ripresa e pubblicazione verificata.** [PR #8](https://github.com/epivic-lab/SerieN/pull/8) già integrata in `main` a `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`; [Pages 43313306675](https://github.com/epivic-lab/SerieN/actions/runs/43313306675) SUCCESS. Sito **https://epivic-lab.github.io/SerieN/**; 97 file del pacchetto HTTP200 e byte-identici al checkout/build. Nuovi 254 Node, 9 Python, build/canonico e 138 file protetti PASS. Checkpoint documentale sul solo `codex/ui-v21-visual-parity`; nessuna modifica applicativa, nuovo merge o avvio deployment. [Rapporto e prove correnti](DELIVERY_RECOVERY_REPORT.md). La verifica tecnica non attribuisce un'approvazione estetica indipendente.

---

## Stato precedente — storico, prima del merge

**Aggiornamento corrente — HUD/CAMERA MOBILE COLLISION HOTFIX: PASS tecnico, REGIA REVIEW PENDING.** Dal checkpoint `6e62967356df836df27de59f352496511769d591`, sul solo `codex/ui-v21-visual-parity`. PR #8 rimane Draft; PR #7 e main `d77b8aa2710fa474fdb069b204705364b4a9e7e6` non modificate. Il nuovo mandato autorizza esclusivamente correzione, verifiche e checkpoint remoto, senza merge/deploy.

Riprodotta l'occlusione198×102,734375px. Coordinamento mediante pulsante HUD originale; ripristino dell'intenzione, chiusura View prima dell'espansione utente, Escape/focus/resize/orientation/dispose. Stesso nodo warning aggiornato dal motore disponibile durante la minimizzazione, insieme al Guarded Stop originale. Modifiche applicative solo `src/ui/overlays.js` e CSS contestuale di integrazione; desktop, Train Dock, materiali/frozen e domini invariati.

Nuovi254Node,9Python,build e11gruppi browser PASS;42misure d'intersezione pari a0, sei viewport, tutti i preset/camera reale, allarme sopraggiunto con View aperto, occupazione, rotazione,12cicli e cleanup.132invarianti originali e138file protetti verificati; geometria/testi/stili desktop/tablet identici. Bundle1.092.265byte/SHA256 `1ac2022b781311ca3fcc03e6373a55fc56c45eabd714c56694e7107d12352378`.

[Rapporto corrente](VISUAL_PARITY_REPORT.md), [prove e prima/dopo](evidence/HUD_CAMERA_HOTFIX/README.md). SHA del commit atomico e verifica remota nella consegna; risolvibile dal log del rapporto. **STOP al checkpoint correttivo: unica prossima azione, revisione indipendente Regia. OAuth/hardware/screen reader/altri browser/5E non attestati; nessuna nuova fase.**

---

## Stato precedente — storico

**Stato corrente — UI V2.1 VISUAL PARITY HOTFIX: READY FOR REGIA VISUAL REVIEW.** [PR Draft #8](https://github.com/epivic-lab/SerieN/pull/8); checkpoint applicativo `637a140950d3047c5c7926193f6b312dadc464f1` verificato su remoto. Il mandato completo autorizza la ricostruzione sul solo branch `codex/ui-v21-visual-parity`, derivato dalla produzione `d77b8aa2710fa474fdb069b204705364b4a9e7e6`, e la consegna in PR Draft. La UI pubblicata resta in attesa di accettazione visiva; i precedenti verdetti tecnici non valgono come approvazione estetica.

Ripristinate la griglia Claude e le superfici originali: a1692×877 dock502→156px e viewport300→612,11px, tre console visibili e quattro pannelli sidebar. Cinque viewport desktop con scarto0px dei bounding box esterni rispetto al vero HTML `cf2c29a`; sette confronti completi, adattamenti mobile/tablet dichiarati. PASS254Node,9Python,build/canonico,11scenari5C,6gruppi UI/HUD con16stati,5gruppi RAF nativo/125frame,5gruppi picking/cleanup,28stati missione e sette controlli console/overflow. Ultimo affinamento solo CSS delle missioni strette, con provenienza e verifica mirata distinte.

Motore,150rotaie,topologia,8scambi/WX310,R1,M1/M2/M3,Auth/Supabase/RLS/persistenza,asset e CSS frozen,workflow e dipendenze preservati;132file protetti byte-identici. Prove browser con bootstrap Auth solo locale; OAuth live, hardware fisico/altri browser e certificazione WCAG completa NOT VERIFIED. Produzione e PR #7 documentale non modificate.

[Rapporto e checkpoint](VISUAL_PARITY_REPORT.md), [galleria completa](evidence/VISUAL_PARITY/GALLERY.md), [invarianti/package](evidence/VISUAL_PARITY/invariants-and-package.json), [scope CSS finale](evidence/VISUAL_PARITY/final-scope-verification.json).

**STOP alla PR Draft: prossima azione esclusivamente revisione visiva della Regia. Nessun merge/deploy autorizzato o eseguito.**

---

## Registro precedente — storico, superato dal mandato hotfix sopra

# UI V2.1 — REL-001 Release Packaging Gate

**U0–U9 APPROVATE dalla Regia. REL-001: READY FOR REGIA RELEASE REVIEW — STOP.**

Baseline locale/remota `50d7c744e4b9dbbe20197ec8f959fdccb16edb5b`, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d`. Unico branch autorizzato: `codex/ui-v2-integration`. Unica correzione workflow: aggiunta `ui` a `cp -R dist assets ui _site/` nello step Prepare site.

PASS build Node22 con bundle identico U9, preparazione reale del pacchetto, chiusura riferimenti/HTTP200 sotto `/SerieN/`,CSS/font locali/licenze/texture/sprite,targa Autumn Railways brass/Federo dal pacchetto in Chromium desktop/mobile,assenza richieste esterne. Artefatto completo di docs e prove inferiore a1GiB. Due failure di timeout dell'harness conservati e recuperati. Tutti i sorgenti applicativi,asset originali,CSS frozen,domini e test ferroviari intatti; matrice U9 non ripetuta.

[Rapporto REL-001](REL001_REPORT.md),[evidenze e ricette](evidence/REL001/),[dimensioni finali](evidence/REL001/artifact-size.json). SHA effettivo e verifica HEAD locale/remoto nella consegna del commit atomico. OAuth remoto e sito pubblicato NOT VERIFIED. Nessun merge,deploy,PR release,avvio manuale Pages o ulteriore sviluppo. **Unica prossima azione: revisione indipendente della Regia e sua eventuale autorizzazione al rilascio.**

---

## Registro U9 precedente — storico, superato dallo stato REL-001 sopra

**Verdetto tecnico proposto: READY WITH DOCUMENTED LIMITATIONS. STOP U9; approvazione Regia PENDING.** U0–U8 approvate nel mandato U9. Nessuna fase successiva autorizzata.

Branch esclusivo `codex/ui-v2-integration`, baseline U8 `30c56aa28e60ce83fe0cbb36209006752325bea8`; U7 e main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` antenati. Recuperato tutto il lavoro locale senza reset/rebase/clean. Nessun commit U9 preesistente o push anticipato.

Correzioni minime: readout throttle distinto da actual speed, menu View contenuto nel canvas e sopra i controlli primari, semantica tab TM e gruppo/text Dock, leggibilità Dock/UUID, focus/reduced motion. U9-HDR ripristina la vera targa Claude `.edp`: ottone brushed, viti/SVG maple originali, Federo 400 inciso, cascata finale 46/44px. Font/asset/fogli frozen e domini intatti.

PASS:254 Node,9 Python,build/canonico,66 controlli/31 schermate/A01–A13,111 screenshot finali su7 viewport,6 scansioni axe senza violazioni,header prima/dopo5viewport,RAF nativo finale sul bundle definitivo,regressioni U2–U8/M1/M1.1/M2/M3,PhaseZero/TrainDeck,picking degli8scambi e cleanup Bell,25cicli Projects+25Depot. PASS storici e suite non rieseguite distinti nella matrice; failure/recuperi conservati,nessuna asserzione R1 indebolita.

**REL-001: pacchetto Pages RELEASE BLOCKED** perché `.github/workflows/pages.yml` non copia `ui/`. Solo proposta minima per successiva autorizzazione; workflow non modificato. Nessun merge/main/deploy/PR di release/Supabase/Auth/RLS/persistenza/nuova scena.

NOT VERIFIED:hardware fisico/GPU/FPS/audio/screen reader/altri browser,OAuth live,prompt beforeunload nativo,zoom chrome nativo,certificazione WCAG completa e package pubblicato. SwiftShader è sola prova funzionale; contrasto delle superfici strutturate resta verifica manuale,non certificazione automatica.

[Rapporto U9](U9_REPORT.md),[risultati](evidence/U9/results.json),[comandi](evidence/U9/commands.json),[matrici](evidence/U9/control-coverage.json),[targa Claude](evidence/U9/header-engraved-plaque/delivery/results.json),[hash](evidence/U9/source-hashes.json),[release readiness](evidence/U9/release-readiness.json).

Unica prossima azione: revisione indipendente della Regia. Checkpoint atomico e SHA locale/remoto verificati nel messaggio di consegna; non costituiscono approvazione.


## UI V2.1 — REL-002 (2026-11-12)

REL001 approvato `06a01c5ae70bfd4147e2c866f06803139904f264`; autorizzata esclusivamente ottimizzazione packaging sul branch `codex/ui-v2-integration`. Solo Prepare site: pulizia controllata `_site` e whitelist esplicita di24documenti con chiusura transitiva pubblica. Nessun documento Git rimosso. 718.776.848→4.491.628byte (−99,375101%),97file,docs1.723.266byte,tar4.577.280byte.

Build e bundle U9 identico PASS;73file applicativi preservati,269identità U9 per riuso storico senza ripetere matrice ferroviaria.97HTTP200 incluse le79richieste REL001;3465esclusioni404attese;browser desktop1440×900/mobile390×844 con bootstrap Auth locale,Menu/Dock/WebGL/font/brass/targa e apertura documento pubblico PASS,zero errori runtime o richieste esterne. Preparazioni con residui e destinazione assente identiche. OAuth/cloud/GPUfisica/Pages pubblicata NOT VERIFIED.

[REL002_REPORT](REL002_REPORT.md),[evidenze](evidence/REL002/). **READY FOR REGIA RELEASE REVIEW**, subordinato al checkpoint remoto verificato nella consegna;nessuna approvazione al rilascio implicita. **STOP REL002:review indipendente Regia;nessun merge/main/deploy/PRrelease/nuova fase.**


## UI V2.1 — release candidate pre-merge gate (2026-11-12)

U0–U9 e REL001/002 approvate dalla Regia; autorizzata soltanto preparazione PR DRAFT verso main, nessun merge/deploy. Checkpoint applicativo `29b55b40dfa37c51fae827bdf25ded94948a3a45`, main invariata `184cc9ba93a6b35493f365b2ffcb20ef0645963d`: 25 commit avanti/0 indietro, delta Git completo di 2.321 file e merge-tree senza conflitti. Consegna aggiunge soltanto un checkpoint documentale.

PASS Node22.23.5/npm ci, 254 Node, 9 Python, canonico senza diff, build, ricetta REL002 esatta e identità completa dei 97 file/4.491.628 byte. Bundle U9 identico, 269 identità sorgenti/test/asset, domini M2/M3/R1 e Auth preservati con adapter di presentazione approvati distinti. HTTP: 97 risposte200 e 3.470 esclusioni404 attese. Scansione di 1.758 nuovi blob Git senza candidati ai pattern di credenziali. Browser/ferrovia U9 e REL002 riusati per identità, non rieseguiti indiscriminatamente.

[Rapporto RC](RC_PREMERGE_REPORT.md), [evidenze](evidence/RC_PREMERGE/). **READY FOR REGIA MERGE REVIEW**, subordinato alla PR DRAFT e verifica HEAD/base nella consegna. NOT VERIFIED OAuth/cloud live, Pages pubblicata, hardware fisico e altri browser. Procedura post-deploy e rollback soltanto documentati. Il merge su main attiverà automaticamente Pages. **STOP dopo la PR: nessun auto-merge/merge/workflow_dispatch/deploy/nuova fase; serve autorizzazione esplicita Regia al merge.**
