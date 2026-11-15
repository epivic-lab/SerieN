## Quality Gate indipendente Regia — R2B1 | 13 novembre 2026

**DECISIONE: PASS NUMERICO R2B1. GO circoscritto alla sola R2B2 — THREE-TRAIN DYNAMIC SAFETY (laboratorio Node).** Non equivale a certificazione fisica, operativa browser, risoluzione deadlock o autorizzazione al deploy.

### Verifica GitHub
- Draft PR #19 aperta/non unita, base e parent unici `9aa9656b1f40dec15215d4df366aae2e2e540904`, head `ab9c9bacdba652209b2ffc14b7c70856645601ba`, un commit fast-forward, nessuna divergenza.
- 86 file nel diff: modificati soltanto `PROGRESS.md` e `docs/_active/scenario-v06/STATUS.md`; aggiunti harness Node, 65 test e documentazione/evidenze. Nessuna modifica a Railway Core, `stepRailway`, Journey, routing, guard, collisioni, dataset, UI, R2A/F1, backend o dipendenze.
- Letti rapporto, matrice completa, test e implementazioni `two-train-lab.js`, `two-train-validation.js` e `two-train-oracle.js`. Due treni distinti della stessa sessione V06, unico FixedClock e **una sola transazione stepRailway su entrambi per tick**. L'oracolo verifica indipendentemente posa/giunti, rettangoli e sweep continuo conservativo, intervalli occupati/prenotazioni e tutte le coppie per ciascun tick; non usa il verdetto SAT del core come expected.
- Matrice pubblicata: **55 scenari, 60.917 tick, 702 attraversamenti**, assenza di penetrazione numerica nei casi provati. Minima distanza corpi `0.017742612700800464 mm`; clearance minima sweep conservativo `0.012724691204381237 mm`. Risultati numerici su stock corti e geometrie candidate R02, **non** distanze di sicurezza fisiche.
- **11 deadlock sicuri** (1 frontale + 10 WX X): PASS di separazione, **NO PASS di risoluzione dei conflitti**. Nessun dispatcher/priority/fairness generalizzata certificati. I 48 abbinamenti diretti WX vietati dal grafo sono correttamente NOT VERIFIED come circolazione, 16 consentiti validati.
- Log pubblicati: baseline 412 Node, finale **477/477 Node**, **9/9 JMRI**, build/canonico; 56 file JSON/55 tracce dichiarati byte-identici e hash per tick. Codice/manifesto/diff coerenti; **la Regia non ha rieseguito autonomamente la suite in un checkout**.
- Preservazione: 4.246 blob protetti invariati, 2 file di stato/documentazione modificati; bundle invariato F1 1.096.081 byte, 85 input, zero V06/laboratorio; `runtimeAdmission:false` preservato. Secret scan riportato senza candidati.

### Osservazioni
Le distanze minime inferiori a 0,02 mm sono accettate solo per la **safety numerica misurata**, non per sagome fisiche o robustezza in presenza di perturbazioni. In R2B2 esigere anche controlli near-touch e sensitività numerica sul medesimo contratto. Gli 11 deadlock restano debito operativo esplicito: non dichiarare “tre treni autonomi” finché non esiste un gate dedicato di dispatch/priorità/recovery.

### Unica microfase autorizzata: R2B2 — Three-train dynamic safety (Node only)
**Baseline esatta:** `ab9c9bacdba652209b2ffc14b7c70856645601ba`. **Nuovo branch:** `codex/scenario-v06-r2b2-three-train-safety`. Draft PR con base sulla #19. Report `docs/_active/scenario-v06/R2B2_THREE_TRAIN_SAFETY_REPORT.md`.

1. Estendere in modo minimale il laboratorio R2B1 per **tre Journey/owner ID 0/1/2 nella stessa sessione, clock e unica transazione stepRailway/tick**, senza riscrivere il core; ammissione statica completa dei tre, rifiuto atomico di collisioni/occupazioni/slot invalidi.
2. Provare tre anelli A/B/C contemporanei in combinazioni di verso realmente ammesse (otto combinazioni se raggiungibili), almeno un giro per ciascun treno, con un sottoinsieme di composizioni corte; nessuna falsa guard o teletrasporto.
3. Provare inseguimento a tre (coda leader/follower/follower), arresti/probe/cambi condizione immediati o differiti, rilascio e riarmo esplicito; permutare ID e ordine per rilevare dipendenze da indice.
4. Provare conflitti di due convogli presso WX-A/WX-B con terzo convoglio in movimento, eventuali conflitti a tre **solo se topologicamente raggiungibili**; includere F1/C13 con traffico aggiuntivo, comandi panel/device, occupazione totale del WX e prenotazioni fresh. Se un caso è irraggiungibile: dimostrazione e NOT VERIFIED, non inventare rotte.
5. Estendere l'oracolo esterno a tutte le **tre coppie** per ogni tick, sweep conservativo e occupazioni/prenotazioni, identificare margini near-touch, confrontare stabilità con piccole perturbazioni delle condizioni iniziali **solo come stress test senza cambiare geometria/algoritmi o soglie core**. Separare chiaramente safety, progresso, deadlock e starvation non verificata.
6. Preservare i 477 test Node preesistenti, 9 JMRI, build/canonico, modulo F1, bundle, Legacy, dataset e `runtimeAdmission:false`. Produrre scenari reali, numeri, trace/hash deterministici, negativi e report con limiti.

**STOP obbligatorio se emerge un difetto sostanziale del core o una penetrazione:** isolare repro e proporre microfase correttiva, non modificare guard, routing, SAT, collision prevention o stepRailway senza mandato separato.

Fuori scope: dispatcher, priorità/recovery automatica dei deadlock, quarto treno, N07, N16, scalo, coupling dinamico, asset/renderer/UI/browser V06, Supabase, integrazione e deploy. Un commit atomico, checkpoint remoto, Draft PR, poi STOP per Quality Gate indipendente. **R2B3/R2C non autorizzate.**
