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
