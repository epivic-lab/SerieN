# UI V2.1 — U3 Real Viewport Overlays

**U3 READY FOR REGIA REVIEW — STOP. U4–U9 non autorizzate.** U2 approvata dalla Regia; mandato U3 conservato in evidence/U3/AUTHORIZATION_U3.md.

Branch `codex/ui-v2-integration`; checkpoint U2 iniziale locale/upstream/remoto `48a7c4d48b118877ec7edf7f4c61fba090e460b8`, working tree iniziale pulito. Baseline ferroviaria/M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421`, main remoto `184cc9ba93a6b35493f365b2ffcb20ef0645963d` conservati. Nessun merge/rebase/main/deploy.

Camera/View/Route riusano nodi e controller originali; HUD read-only e SVG originale; status Guarded Stop originale e chip/Menu sullo stesso Bell; log originale completo e persistente nel viewport; startup skin soltanto. Un canvas, layer pointer-through, CSS limitato a U3. Nessuna nuova logica ferroviaria, mock, controller Bell o handler globale. Sidebar/dock/viste TM restano legacy.

**PASS nuovi U3:** 254 Node, 9 Python, build/canonico, invarianti, nove gruppi sul bundle produttivo, cinque gruppi picking/cleanup, tre catture aggiuntive con route valida, regressioni R1/5C, Phase Zero, S2 e S6. 14 comandi finali exit0. 17 screenshot finali fra shell/valid-route/native, oltre alle regressioni. RAF nativo: tre treni reali, 63 frame in circa195s, ~0,319fps SwiftShader; nessuna certificazione di fluidità hardware.

222/226 file del manifest U2 byte-identici; quattro delta autorizzati verificati per inversione esatta (app/index/solo getter scena/un test con preparazione e selettore UI). CSS U2 conservato come prefisso, asset/font/licenze invariati; motore/store/Auth/Supabase/layout/workflow/dipendenze protetti. Bundle finale `e45a019e20ca80b079d00fc3c8ae5b4d36111e6bb3ec87733a9bb2d1d7709cfc` verificato anche viaHTTP nel test nativo.

[Rapporto U3](U3_REPORT.md), [risultati e comandi](evidence/U3/results.json), [invarianti](evidence/U3/invariants.json). Failure intermedi e recuperi documentati senza modificare asserzioni ferroviarie. Suite M2/M3 complete non ripetute poiché moduli/contratti invariati; restano PASS storici. OAuth remoto, altri browser, hardware, prompt beforeunload e accettazione completa U9 **NOT VERIFIED**. Packaging Pages ui/ ancora prerequisito della futura release, fuori U3.

Prossima attività consentita: sola revisione indipendente della Regia. U4 non iniziata. SHA finale e verifica remota nella consegna.
