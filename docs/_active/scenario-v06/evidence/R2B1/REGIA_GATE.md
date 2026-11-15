Source: https://github.com/epivic-lab/SerieN/pull/18#issuecomment-6859221401

## Quality Gate indipendente della Regia — R2A-F1 | 13/11/2026

**Decisione: PASS R2A-F1 / GO limitato alla microfase R2B1 (sicurezza di due treni simultanei in laboratorio Node).** ADJ-01 chiuso **per il perimetro numerico dimostrato**. Non approvo ancora R2B2 (tre convogli/priorità), R2C, integrazione browser, merge o deploy.

### Verifiche GitHub
- Draft PR #18 aperta, parent/base esatto R2A `7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003`, un commit HEAD `9aa9656b1f40dec15215d4df366aae2e2e540904`, zero divergenze.
- Diff controllato: sole due modifiche applicative `src/next-switch.js` (completa gli encounters dei membri incidenti del nodo condiviso, mantenendo primario il sito scelto dalla route) e `src/railway-guard.js` (massimo inset delle fasce già esistenti); test storico adeguato senza modificare fixture 5C.
- Evidenza pre-fix: 3 test rossi, C13 erroneamente `unlocked` con panel/device consentiti al tick836 (prima dell'occupazione). Post-fix: `approaching` e richieste rifiutate, arresto tick869, gancio a 31,753263 mm dal giunto e +1,753263 mm fuori dalla fascia [0,30]; correzione protetta a riposo e riarmo esplicito.
- Revisione dei test 17 F1, laboratorio/matrice 112 noti +56 UNKNOWN, audit di 58.624 preview (Next Switch primario, routing, ranges/stop/distanze invariati), 138 giunti R2A e dinamica preservati. Log pubblicati: 412/412 Node, 9/9 JMRI, build/canonico PASS. Questi log **non sono una riesecuzione indipendente in checkout della Regia**.
- 4.209 blob protetti invariati, bundle +91 byte con 85 input (solo 2 moduli applicativi diversi), zero input V06/laboratorio; dataset, rete Legacy, Railway Step, collisioni, UI/bootstrap e `runtimeAdmission:false` preservati.

Nota di rischio non bloccante per R2B1: nella matrice sintetica il minimo margine positivo di arresto è ~0,000002 mm. Non è una tolleranza fisica certificata; non estrapolare dalle fixture a sagome reali o al browser.

### Mandato esclusivo successivo: R2B1 — Two-train dynamic safety, Node-only
**Baseline esatta** `9aa9656b1f40dec15215d4df366aae2e2e540904`. Nuovo branch dedicato `codex/scenario-v06-r2b1-two-train-safety`, Draft PR con base sulla #18, report `docs/_active/scenario-v06/R2B1_TWO_TRAIN_SAFETY_REPORT.md`.

Obiettivo: laboratorio deterministico con **due treni distinti** mossi dallo stesso `stepRailway`/clock/sessione V06; verificare senza inventare routing le tre condizioni: (1) separazione sicura su due anelli con marcia contemporanea, (2) inseguimento sullo stesso percorso con frenatura/stop e nessuna penetrazione, (3) conflitto di itinerario nei WX-A e WX-B se realmente raggiungibile nelle configurazioni autorizzate, incluso incrocio/opposizione e occupazioni/approcci. Se uno scenario non è raggiungibile con le rotte effettive, documentare NON VERIFIED, non simulare un secondo router.

Testare entrambi i versi dove ammissibili, consistenze corte, ID/ownership, head/tail/ganci, conflitti SAT/sweeps, comandi scambi panel/device, UNKNOWN fail-closed, prenotazioni fresh, STOP/ripartenza, assenza di teleport e rollback. Testimoni geometrici e invarianti indipendenti dalle sole decisioni `stepRailway`. Registrare deadlock e comportamenti di equità senza inventare una policy di priorità. **Se emerge un difetto del Railway Core, STOP** con riproduzione/analisi: il mandato NON autorizza cambi a guard, collision engine, routing o Railway Step. Solo harness Node, test, rapporti ed evidenze; nessun cambiamento a sorgenti applicativi senza gate separato. Preservare i 412 Node preesistenti, 9 JMRI, build/canonico, bundle e comportamento Legacy. NO browser V06, tre treni, quarto slot, N07/N16/scalo, coupling dinamico.

Un commit, push normale verificato, Draft PR collegata; **STOP e Quality Gate indipendente**. Nessun merge, deploy o avanzamento automatico.
