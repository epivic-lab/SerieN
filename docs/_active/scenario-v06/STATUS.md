# V06-INTEGRATION — ripresa 14 novembre 2026

**RECUPERO PARZIALE; integrazione ancora BLOCKED dalla rete.** Ripresa dal
checkpoint verificato `301dceb64a3c034a1832d43bc6885d17604cc5a4`, PR Draft #21,
branch `codex/scenario-v06-integration`. Il mandato di integrazione già vigente
rimane valido; non è richiesta una nuova approvazione di microfase.

Terreno e segheria ora acquisiti con HTTP 200 dal dominio Denmark autorizzato.
Sette moduli piccoli recuperati dal connettore. **Nove originali, 196.026.628
byte**, header GLB v2/dimensioni/SHA verificati contro il manifest Drive
appena recuperato. Salvati questa volta nel repository in
`asset-library/scenario-v06/modules/`, con lock separato e ricetta
`python3 tools/scenario-v06/check-local-assets.py`, per non dipendere soltanto
dalla cache temporanea di un task. La libreria non è importata dall'app né
copiata dalla ricetta Pages. Nessun originale modificato.

La cache precedente era assente: questi nove file NON sono i nove della ripresa
precedente. Mancano ancora **village_buildings, railway_service_buildings e
railway_visual**; technical_reference è opzionale e assente. I riferimenti dei
tre grandi usano ora `sdmntprnortheu.oaiusercontent.com`. Tentato il trasferimento
degli edifici ferroviari: proxy 403. Nessun retry identico per gli altri file
sullo stesso host; occorre aggiungere questo dominio nelle impostazioni di rete
e applicare la modifica. La configurazione osservata resta revisione1, enforced,
con solo Denmark ed epivic-lab.github.io fra i domini personalizzati. Nessun
rifiuto della revisione automatica delle approvazioni. Host dei link mai riscritti.

**559/559 Node, 9/9 JMRI, build PASS** in questa ripresa. Bundle invariato:
`89d732feafef5914078d5ef83885e5b9b68ff3abe967e8c4863a08e20a3063c7`.
Controllo completezza asset `--require-complete`: uscita2 attesa, INCOMPLETE.
App/Core/F1/dataset/canonico/UI/Legacy/asset runtime/test storici/dipendenze/
workflow byte-identici al checkpoint iniziale. Browser V06 NON VERIFICATO;
smoke Legacy precedente non rieseguito e non presentato come nuova prova.
Nessun codice di attivazione o sostituto scenografico, runtimeAdmission:false.
Nessun URL firmato/token salvato; nessuna modifica Auth/Supabase, merge o deploy.

Prove correnti: `docs/_active/scenario-v06/evidence/V06_INTEGRATION/recovery-2026-11-14/`.
Checkpoint atomico e push normale sul branch esistente; SHA e uguaglianza remota
nella ricevuta finale. **Unica prossima azione: sbloccare il dominio indicato,
riacquisire i tre originali e continuare la medesima integrazione già autorizzata.**
Non è una consegna V06 giocabile o un PASS di integrazione.

---

## Registrazioni precedenti — storiche

# Stato corrente — V06-INTEGRATION, seconda ripresa PR #21

**BLOCKED sugli asset indispensabili.** Checkpoint iniziale remoto verificato
`7d235e147b7d50536dd8189fd10ad74ffeaf5b5c`, branch esistente
`codex/scenario-v06-integration`, Draft #21 mantenuta. Nuovi riferimenti Drive:
railway_visual e village_buildings scaricati con HTTP 200 dal dominio Denmark;
sette GLB riacquisiti perché la cache precedente è assente. Nove asset locali
originali, 227.339.628 byte, header/dimensioni/SHA conformi al manifest corrente.
Terrain usa ora `sdmntprpolandcentral.oaiusercontent.com`: proxy 403, host
non nella policy applicata. Stesso host per sawmill e servizi ferroviari.
Richiesta aggiunta nelle impostazioni rete, nessun retry identico o sostituto.
Integrazione applicativa e otto criteri browser V06 **NON VERIFICATI**;
runtimeAdmission:false, codice/dataset/Core/UI/Legacy invariati. Risultati
regressione e smoke Legacy correnti nel [rapporto](V06_INTEGRATION_REPORT.md)
e nelle evidenze `resume-*`. Nessun merge/deploy/Supabase.
Prossima azione: applicare il dominio mancante e riprendere l'integrazione
già autorizzata. Gate Regia richiesto sul recupero/blocco, non sul runtime V06.

Verifiche correnti: **559/559 Node, 9/9 JMRI, build e smoke Legacy
desktop/mobile PASS**; screenshot `resume-legacy-1440.png` e
`resume-legacy-390.png`. Browser V06 NON VERIFICATO.

---

# Storico — prima ripresa V06-INTEGRATION, 13 novembre 2026

**BLOCKED — integrazione applicativa non completata.** La nuova direttiva
autorizza l'intera integrazione e supera i vecchi STOP di fase sottostanti.
Ripresa dal checkpoint esatto R2B2 `f592a12131b9b7236cbe79506cd23a03dacadd9f`,
branch `codex/scenario-v06-integration`, catena Draft #20 preservata.
Il terreno originale necessario supera il limite di materializzazione 32 MiB;
download alternativo negato dal proxy di rete 403. Sette altri moduli recuperati
e verificati. Nessun asset mancante inventato; nessun codice applicativo cambiato.
559 Node, 9 JMRI, build e smoke **Legacy** desktop/mobile PASS; V06 browser e
otto criteri di accettazione NON VERIFICATI. Nessun merge/deploy/Supabase.
[Rapporto e modalità di ripresa](V06_INTEGRATION_REPORT.md).

---

# Scenario V06 — R2B2

**PASS tecnico di safety numerica / QUALITY GATE INDIPENDENTE REGIA PENDING.**
Mandato esclusivo dal [Gate #19 /6860875610](https://github.com/epivic-lab/SerieN/pull/19#issuecomment-6860875610).
Baseline e parent unico `ab9c9bacdba652209b2ffc14b7c70856645601ba`;
branch `codex/scenario-v06-r2b2-three-train-safety`, Draft con base R2B1/#19.
SHA atomico, URL e checkpoint local=remote nella ricevuta finale.

Una sessione R1C, una rete V06, tre Journey/owner ID 0/1/2, un solo
FixedClock(1/60) e una transazione stepRailway originale per tick. Ammissione
integrale e atomica, tre coppie/ogni veicolo verificate dall'oracolo R2B1.
Due sole estensioni ai moduli di laboratorio, nessuna modifica applicativa.

**75 scenari /57.649 tick /172.947 coppia-tick /887 giunti** per esecuzione.
10 casi S1 (otto versi A/B/C e stock con uno/due carri),26 inseguimenti con
permutazioni/riarmi/immediato-differito,28 WX (inclusi due conflitti reali a3),
F1 con due treni in moto,10 dinamici/UNKNOWN/near-touch.
**20 righe DEADLOCK sicuro** (12 configurazioni WX di riferimento e8 perturbate),
8 arresti near-touch controllati: separazione PASS, progresso distinto.
Terzo effettivamente in moto nei conflitti della coppia WX; nessun dispatcher.
Margine minimo stress0,0001 mm, minimo dinamico WX0,017742613 mm;
non sono tolleranze fisiche certificate. Equità generale NON CERTIFICATA.

Baseline477/477; finale**559/559 Node,9/9 JMRI,build/canonico PASS**.
Due matrici finali/76JSON byte-identici. Tutte le55prove R2B1 riprodotte con
risultati e digest tick identici, salvo nuovo contatore di coppie nel risultato.
**4328 blob protetti identici**; sole eccezioni PROGRESS/STATUS e2harnessNode.
Core/Step/Journey/routing/guard/collisioni,F1 e testimone geometrico invariati.
Bundle F1 byte-identico,85input,zeroV06/laboratorio. Dataset/topologia,Legacy,
UI/HUD/renderer/bootstrap/asset,backend/Supabase/deps/workflow intatti.
`runtimeAdmission:false` e certificazioni fisiche/runtime false preservati.

[Rapporto R2B2](R2B2_THREE_TRAIN_SAFETY_REPORT.md),
[matrice](evidence/R2B2/SCENARIO_MATRIX.md),[evidenze e riproduzione](evidence/R2B2/README.md).
NOT VERIFIED browser Legacy nuovo/browser V06,hardware/sagome fisiche,
equità generale,N07/N16/scalo,coupling dinamico/quarto treno e48coppie WX vietate
come circolazione. Nessuna rotta impossibile inventata.

**STOP R2B2. Unica prossima azione: Quality Gate indipendente Regia sulla Draft.
Nessun R2B3/R2C, browser V06, integrazione visuale, merge o deploy.**

---

## Stato storico precedente — R2B1 prima del Gate Regia #19

# Scenario V06 — R2B1

**PASS tecnico di safety numerica / QUALITY GATE INDIPENDENTE REGIA PENDING.**
F1 approvata nel [Gate #18 / 6859221401](https://github.com/epivic-lab/SerieN/pull/18#issuecomment-6859221401).
Baseline e parent unico `9aa9656b1f40dec15215d4df366aae2e2e540904`;
nuovo branch `codex/scenario-v06-r2b1-two-train-safety`, Draft con base R2A-F1.
SHA effettivo, URL e checkpoint local=remote nella ricevuta finale.

Laboratorio Node dedicato: una sessione/rete/clock, due Journey e owner,
una transazione stepRailway originale per tick. Nuova ammissione preventiva,
comandi/routing/guard/SAT/sweeps/prenotazioni originali, occupazioni fresche.
Oracolo indipendente R02/R1A: pose/ganci/history/giunti, geometria di corpi e
invilluppi conservativi continui, occupazioni e sette stati controller.

**55 scenari /60.917tick**, due esecuzioni complete deterministiche.15casi S1
con giri completi per entrambi,12inseguimenti,2frontale/divergente,19WX/F1,
7prenotazioni/condizione fresca/UNKNOWN. Nessuna penetrazione o movimento fantasma.
**11deadlock sicuri**, non una prova di risoluzione/equità. Zero priorità inventate.
64coppie topologiche WX verificate:16ammesse,48vietate non percorse.

Baseline412/412Node; finale**477/477Node,9/9JMRI,build/canonico PASS**.
4246blob baseline protetti identici; F1 e R2A intatti, bundle F1 byte-identico,
85input,zeroV06/laboratorio. Core/app/geometrie/UI/asset/backend/Supabase/deps/
workflow intatti; runtimeAdmission:false e certificazioni fisiche/runtime false.

[Rapporto](R2B1_TWO_TRAIN_SAFETY_REPORT.md),
[matrice effettiva](evidence/R2B1/SCENARIO_MATRIX.md),
[evidenze e riproduzione](evidence/R2B1/README.md).
NOT VERIFIED nuove prove browser Legacy/browserV06/hardware/sagomefisiche,
equità generale,N07/N16/scalo,coupling dinamico,terzo/quarto treno.

**STOP R2B1. Unica prossima azione: Quality Gate indipendente Regia.
Nessun merge,deploy,browser V06 o avvio R2B2.**

---

## Stato storico precedente — R2A-F1 prima del Gate Regia #18

# Scenario V06 — R2A-F1

**PASS tecnico / QUALITY GATE INDIPENDENTE REGIA PENDING.** Baseline R2A approvata
per il perimetro numerico `7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003` e
[mandato F1 della #17](https://github.com/epivic-lab/SerieN/pull/17#issuecomment-6858353142).
Nuovo branch `codex/scenario-v06-r2a-f1-shared-junction-interlocking`, un commit
atomico e Draft con base R2A; SHA/URL e verifica remota nella consegna finale.

ADJ-01 **confermato dinamicamente e risolto nel perimetro numerico provato**.
Prima:tick836,88,333 mm/s,gancio40,031 su P060,fasciaC13[0,30],safety unlocked,
panel/device accettati in sessioni isolate. Tre test rossi prima del fix.
Dopo:encounters WX-A+C13,approach-lock invariato ora efficace,inset30 derivato
dalla fascia esistente,stop tick869 a31,753 mm dal giunto,1,753 mm fuori fascia;
correzione protetta a riposo e ripartenza solo con comando esplicito.

Solo next-switch.js e railway-guard.js applicativi modificati; test storico
full/lean adeguato al completamento degli incontri, fixture5C immutato.
**412/412 Node,9/9 JMRI,build/canonico PASS.**112 casi noti+56 UNKNOWN su cinque
giunti condivisi V06/Legacy.58.624 preview con primary/routing/ranges/stop
identici. Sei giri e due composizioni R2A,dinamica e138giunti preservati;
4209blob protetti identici,bundle+91byte,stessi85input,zero V06/laboratorio.

[Rapporto](R2A_F1_SHARED_JUNCTION_REPORT.md),[evidenze](evidence/R2A-F1/README.md).
runtimeAdmission:false e flag di certificazione fisica/runtime invariati.
Geometrie/dataset,Step/collisioni/cinematica,UI/renderer/HUD/bootstrap/asset,
Auth/Supabase/backend,dipendenze e workflow preservati. Nessun nuovo PASS browser.

**STOP R2A-F1: richiesta valutazione indipendente Regia. Nessun R2B,merge,deploy
o attivazione browser V06.** Traffico simultaneo,priorità,N07/N16/scalo,quarto
treno,agganci dinamici e sagome fisiche restano fuori perimetro.

---

## Stato storico precedente — R2A prima del Gate Regia e di F1

# Scenario V06 — R2A

**PASS numerico R2A con limite operativo R2A-ADJ-01; QUALITY GATE REGIA PENDING.**
R1C accettata a `b49320c6be4d9f149bb2c5473858c616925a5f6c` dal
[Quality Gate della PR #16](https://github.com/epivic-lab/SerieN/pull/16#issuecomment-6857567423).
Branch dedicato `codex/scenario-v06-r2a-dynamic-circulation`, worktree separato,
nuova Draft con base R1C. SHA/URL e verifica local=remote nella ricevuta finale.

Harness solo Node basato sulla sessione R1C immutata, vero stepRailway/Journey/
routing/FixedClock/guard/preview/state/fleet commands. Sei giri A/B/C nei due
versi:100 giunti; due giri C con loco e due carri corti:38 giunti. Posa e ganci
contro testimone indipendente a ogni tick, tutti9 segmenti nascosti, frenatura,
STOP/ripartenza/inversione, history e comandi protetti. UNKNOWN vieta ogni tick.
24 nuovi test; **395/395 Node, 9/9 JMRI,build/canonico PASS**.

**R2A-ADJ-01 APERTO:** presso WX-A/C13 la guard arresta prima del giunto
misaligned ma lascia la composizione nella fascia operativa C13; throw rifiutato
come occupied. TraceJourney non enumera C13 alla bocca condivisa e protectionInset
resta 0. Nessun superamento del giunto o aggiramento del lock; correzione soltanto
dopo STOP/inversione/arretramento protetto e liberazione. Nessun fix del core.
Recovery automatica e Next Switch completo in tale caso NON CERTIFICATI.

[Rapporto R2A](R2A_DYNAMIC_LOOP_REPORT.md),[prove](evidence/R2A/README.md),
[sintesi numerica](evidence/R2A/summary.json).4186 blob R1C protetti identici;
src/app/UI/renderer/asset/backend/deps/workflow intatti. Bundle identico R1C,
85 input e zero V06/laboratorio. runtimeAdmission sempre false.

**STOP R2A: unica prossima azione Quality Gate Regia, inclusa classificazione
ADJ-01 prima di un eventuale R2B.** Nessun merge/deploy/browser V06 o nuova fase.
N07/N16/scalo/quarto treno/traffico simultaneo/agganci dinamici non certificati.

---

## Stato storico precedente

# Scenario V06 — R1C

**PASS tecnico del laboratorio Node R1C / QUALITY GATE REGIA PENDING.**
Mandato esclusivo dal [Quality Gate R1B nella PR #15](https://github.com/epivic-lab/SerieN/pull/15#issuecomment-6856806189).
Baseline esatta `b8f4f3cb98a3c5f49aa8713a96d2c10b445fb67b`, branch dedicato
`codex/scenario-v06-r1c-session-readiness`, nuova Draft PR contro R1B.
URL/SHA e checkpoint remoto effettivi nella consegna finale.

Session factory solo in tools/scenario-v06: selezione esplicita, ammissione
hash/schema/semantica prima di createNetwork, una rete immutabile per istanza,
registry/stati/router/modello/topologia coerenti, Journey/flotta di fixture
statiche, occupazioni/prenotazioni, cache/callback/timer e disposal. UNKNOWN
iniziale sui sette V06, rifiuto profili/istanze misti e hot swap in movimento.
Readiness di laboratorio distinta da runtimeAdmission, che resta sempre false.

**371/371 Node =336 precedenti+35 R1C,9/9 JMRI,build/canonico PASS.**
Legacy→V06→Legacy riparte da zero, ingressi stale revocati, prenotazioni/cache
svuotate e timer/callback isolati. Tre candidati statici C/B/A verificati per
lunghezza e ingombro; terminali/scalo/quarto slot/triangolo non configurati
rifiutati. Nessuna posizione operativa o capienza inventata. Matrice completa
consumer e piano di rollback nel [rapporto](R1C_SESSION_READINESS_REPORT.md).
[Prove e comandi](evidence/R1C/README.md).

4.168 blob preesistenti protetti identici; tutti src/app/test precedenti,
UI V2.1/renderer/asset/core/dataset/backend/deps/workflow invariati.
Bundle legacy identico R1B:1.095.990byte,85input,zero V06/laboratorio.
physical_profile_certified:false e runtime_circulation_verified:false immutati.
Browser V06, circolazione completa, arresti/manovre/sagome/fouling e teardown
applicativo NOT VERIFIED; nessun nuovo PASS visuale dedotto dal laboratorio.

**STOP R1C: unica prossima azione Quality Gate Regia.** R2 dinamica solo
proposta, nessuna esecuzione o autorizzazione implicita. Nessun merge/deploy,
attivazione browser, modifica Supabase o circolazione operativa.

---

## Stato storico precedente

# Scenario V06 — R1B

**PASS tecnico R1B / QUALITY GATE REGIA PENDING.** Mandato esclusivo dalla
[PR #14](https://github.com/epivic-lab/SerieN/pull/14#issuecomment-6852401319),
R1A approvata a `6a976749d5630c0abf858e64795210183a947f5e`.
Branch `codex/scenario-v06-r1b-turnout-domain`, nuova Draft PR contro R1A;
URL/SHA effettivi e verifica remota nella consegna finale.

Registro per istanza di rete e profilo,8legacy/7V06, contratti del modello e
comandi adattati senza riscrivere gli algoritmi. Stati V06 iniziali null,
unknown fail-closed, safety riletta sincronicamente, WX protetti come unità
complete. Rifiuto dei profili misti e dei Journey di altra rete; cache isolate.
**336Node=298precedenti+38R1B,9JMRI,build/canonico PASS.**7.168ingressi legacy,
3.200V06,64WX/90semplici,38attraversamenti+ritorno, occupazioni/avvicinamenti e
richieste consecutive da superfici diverse.4.148file protetti byte-identici.

[Rapporto R1B](R1B_TURNOUT_DOMAIN_REPORT.md),
[evidenze](evidence/R1B/README.md). UI/picking/glow/frecce/Next Switch e altri
consumer ancora legacy inventariati per i gate futuri, senza modifiche.
Dataset/geometria/bootstrap, Journey/router/guard/fisica/collision prevention,
renderer/UI V2.1/HUD/minimappe/scenografia, backend e workflow preservati.
Zero input V06 nella build; nessuna attivazione visuale od operativa.
`physical_profile_certified:false`, `runtime_circulation_verified:false`.
Circolazione completa, sagome/manovre/anchor e nuove prove browser NOT VERIFIED.

**STOP R1B: unica prossima azione, Quality Gate Regia.** Proposta R1C di audit
consumer/contratto, non avviata; nessun merge/deploy o passaggio automatico.

---

## Stato storico precedente

# Scenario V06 — R1A

**PASS tecnico R1A / QUALITY GATE REGIA PENDING.** Dataset operativo isolato,
nessuna attivazione o circolazione V06. Branch dedicato
`codex/scenario-v06-r1a-operational-dataset`, base approvata
`7118c99a9367da61f0042dfe40240fe78dc0d7c6` e mandato nella
[PR #13](https://github.com/epivic-lab/SerieN/pull/13#issuecomment-6851925629).

79 archi/74 nodi/sette controller/tre terminali, 79 geometrie R02 preservate,
G1/G2/G3, A/B/C, scalo e triangolo coerenti. Adapter minimo della factory con
default legacy; V06 non incluso nel bootstrap/bundle. Oracolo esterno e digest
pin, 64 casi WX/90 semplici, 128 configurazioni/20.224 arrivi totali/17.920 attivi,
stati sconosciuti bloccati dalla guardia originale. 44 nuovi test con 34 mutanti
semantici e digest negativo; **298 Node (254 legacy +44), 9 JMRI e build PASS**.
4.127 file preesistenti protetti identici; sola factory applicativa modificata.

[Rapporto R1A](R1A_OPERATIONAL_DATASET_REPORT.md), [prove](evidence/R1A/README.md).
`physical_profile_certified:false`, `runtime_circulation_verified:false`.
Anchor/capienze N07/N16, consumer/comandi, aghi/GLB, sagome e circolazione restano
gate successivi. Checkpoint remoto e Draft PR verificati nella consegna finale.

**STOP R1A: unica prossima azione, review indipendente Regia. R1B richiede mandato
separato; nessun merge/deploy o attivazione.**

---

## Stato storico R0.2 (precedente al Quality Gate della PR #13)

**PASS GEOMETRICO/OFFLINE. CONDITIONAL GO R1 — QUALITY GATE REGIA PENDING.** Nessuna attivazione, certificazione manifatturiera o prova di circolazione runtime.

Branch `codex/scenario-v06-r02-wx-validation`, baseline esatta R01 `65ec1675510700fef503c16af2cfbe725817568a`, collegamento alla [Draft #12](https://github.com/epivic-lab/SerieN/pull/12). [Rapporto R02](R02_WX_GEOMETRY_VALIDATION_REPORT.md), [dataset separato](candidate/R02/README.md), [prove](evidence/R02/README.md).

Scelta confermata: ricostruzione G1 R583,184 mm e centro17,924429 mm. Tutti i 79 record pezzo, nodi, porte, sette controller, stati, tre terminali e G1/G2/G3 identici a R01; A/B/C chiusi. La Regia ammette l'eccezione locale WX dal master, misurata più finemente in 3,334762 mm. Confronto letterale XTrackCAD: residui di arrotondamento del catalogo misurati e fit continuo verificato. TRAX indica centro11,6 mm: confronto numerico limitato e sensibilità esplicitamente ipotetica, record completo non acquisito. Dati nominali Kato confermati; profilo esatto del produttore non certificato.

64 casi WX,90 semplici,128 configurazioni/17.920 arrivi,tre terminali e manovra nel triangolo PASS offline. Nove mutanti rifiutati fra checker originale e controlli analitici nuovi. Baseline/finale 254 Node,9 JMRI e build PASS, bundle invariato.

Metadati GLB verificati, binario non trasferibile oltre32MiB e download raw negato dal proxy; nessuna ispezione triangoli dichiarata. Contratto visuale per successiva variante locale: partizione esclusiva dei WX negli aggregati, unione rotaie comuni, frog e quattro gruppi mobili N/X. Nessuna modifica asset/renderer. Profilo ruote/rotaie e sagome esaminati solo preliminarmente.

Prima di R1: Quality Gate e mandato Regia sul candidato e sul lock. Prima di visuale/circolazione: mapping binario, parti mobili, gauge/contatto, protezioni, anchor/capienze e prove runtime. Provenienza AS-BUILT ancora distinta dal lock candidato.

**STOP R0.2. Unica prossima azione: Quality Gate Regia. R1 non iniziata; nessun merge/deploy.**
