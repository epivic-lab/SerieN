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
