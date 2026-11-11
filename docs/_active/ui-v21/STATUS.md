# UI V2.1 — U4 Sidebar, Switches, Environment, Missions & Map

**U4 READY FOR REGIA REVIEW — STOP. U5–U9 non autorizzate.** U3 approvata; mandato U4 in evidence/U4/AUTHORIZATION_U4.md.

Branch `codex/ui-v2-integration`; ingresso locale/upstream/remoto `907a9ec4a9d570f03af9ab77d39269ff49787256`, working tree iniziale pulito. U2 `48a7c4d` antenata; baseline ferroviaria/M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421`, main remoto `184cc9ba93a6b35493f365b2ffcb20ef0645963d` conservati.

Sidebar V2.1 con otto pulsanti reali e hook originali, stati/counter e motivi di blocco completi senza hover; Daylight e missioni con handler originali, soglie42/72 e Next sempre disponibile. Mappa SVG canonica, marker fisici e focus sul controller esistente; quattro treni accessibili, dock LRU tre intatto. U2/U3 e Operations Log unico invariati. Nessun mock, nuova safety, store o renderer.

**PASS nuovi U4:** 254 Node,9 Python,build+canonico/invarianti,9 gruppi produttivi,6 gruppi safety/camera/cleanup, S2/S5 e Phase Zero. 13 comandi finali exit0;27 immagini finali oltre alle regressioni. Occupied/approaching/unknown verificati con stesso rifiuto tra tile e click3D. Native RAF:3treni reali e marker sincronizzati, focus senza mutazione ferroviaria,16frame/24132,3ms (~0,622fps SwiftShader a650×760), un canvas e zero pageerror; hardware NOT VERIFIED.

225/226 file manifest U3 identici, app.js solo binding UI verificato per inversione esatta; tutti gli altri file preesistenti src/ui/tests e font/asset/licenze invariati; CSS U3 prefisso intatto. Bundle `4d63096f8b4cdaa15e62de27ee2b70384712deed58483fa2382fcdccdcde3c27` identico anche al test nativo viaHTTP.

[Rapporto](U4_REPORT.md), [risultati/comandi](evidence/U4/results.json), [invarianti](evidence/U4/invariants.json). Failure di costruzione/fixture/harness documentati e risolti senza cambiare asserzioni storiche. M2/M3 completi e matrice estesa R1/5C restano PASS storici U3, non ripetuti senza modifiche ai domini. GPU/touch/audio fisici, screen reader, altri browser, OAuth remoto, prompt beforeunload e accettazione U9 **NOT VERIFIED**.

Prossima attività: revisione indipendente della Regia. U5 non avviata. Nessun main/merge/deploy/Supabase/workflow/packaging modificato. SHA finale e allineamento remoto nella consegna.
