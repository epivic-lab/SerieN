# M3 — Deposito e inventario

**M3 READY FOR REVIEW — A/B/C concluse tecnicamente. STOP per la Regia.**

M2 approvata dalla Regia a `a67e0de7fa01a968152cf47af3a744ea39034bcc`. Branch esistente `codex/train-management-m2`; main remoto `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, verificati prima di modificare codice. Working tree iniziale pulito.

## Fase A

[Contratto e verifica R1](M3_CONTRACT.md): distinte cinque categorie di identità, definita disponibilità/prenotazione dei record virtuali e riconciliazione con i confermati M2. Nessun trasferimento fisico disponibile: il comando addTrain esistente è un inserimento particolare, non il trasferimento di un record inventario; reset e diagnostica non sono operazioni di deposito.

Soluzione isolata confermata: nessuna modifica R1 necessaria, ingresso/uscita disabilitati. Il mandato autorizza B a questa condizione e C dopo l'implementazione, con checkpoint e STOP finale. Nessuna persistenza, release, main, deploy, E1 o redesign.

Baseline: verifiche in evidence/M3/baseline. B e C ancora NOT VERIFIED a quel checkpoint di contratto (storico).

## Fase B — minimo utilizzabile

Implementata vista Depot nella finestra M1/M2. Catalogo unico di 14 modelli e miniature già presenti; nessun nuovo asset, renderer o dipendenza. Record di inventario in RAM con ID `depot:<UUID>` e codice D001… stabile nella sessione, anche per modelli uguali. Stati Available/Reserved for planning, assegnazione esclusiva a un posto confermato con modello uguale, rilascio e rimozione solo virtuali. Un elemento prenotato richiede rilascio prima della rimozione.

Riferimenti `(projectId, vehicleId)` nel solo inventario: M2 non viene mutato. Getter di snapshot read-only nella vista Projects; nessuna modifica al dominio `src/train-projects.js`. Riordino/rinomina/orientamento mantengono la prenotazione; modifiche non confermate e annullamento usano i confermati originali; conferma che rimuove/cambia un posto rilascia il riferimento con avviso, senza sostituzione automatica con modelli uguali.

Liste distinte di posti progettati virtuali (con avviso di bozza aperta) e stock R1 fisico in sola lettura, agganciato o sganciato sul binario. Il reset aggiorna la generazione e l'insieme fisico senza perdere inventario o progetti. Nessun gruppo fisico viene detenuto dal deposito. Ingresso/uscita disabilitati con spiegazione; nessun richiamo a reset/addTrain/diagnostica o comandi ferroviari dal codice M3. Guard beforeunload esteso all'inventario; dispose libera store/UI/handler. Nessuna modifica ad app.js.

### Prove B

- **254 Node, 9 Python, build, canonico rigenerato invariato: PASS**. Nove nuovi test di dominio, inclusi errori atomici, identità duplicate distinte, riferimenti M2, annullamento/conferma/riordino, riconciliazione e reset.
- **Browser funzionale M3 PASS**, nove gruppi sul bundle minificato, auth locale e rendering su richiesta. Desktop 1440×1000, tablet 1024×768 e 768×1024, tap create/remove, controlli ≥44px, nessun overflow. Zero errori pagina, risposte HTTP fallite o richieste fallite. Prove in evidence/M3/implementation.
- **Lifecycle PASS**: inventario senza progetti attiva guard; close/reopen conserva record; rimozione ultimo record rimuove guard; dispose e 25 cicli create/open/add/dispose senza residui osservabili. Evento beforeunload sintetico, non una prova della presentazione del prompt nativo.
- Primo avvio del test browser FAIL del predicato: restituiva il callback del frame, che Playwright invocava senza timestamp. Corretto con `Boolean(...)`; codice applicativo e bundle invariati. Fallimento originale conservato. Esecuzione conclusiva PASS.

C ancora NOT VERIFIED al checkpoint B (storico). Prossima azione: regressioni M1/M1.1/M2/R1 e prova nativa con tre treni, senza altre funzionalità.

## Fase C — chiusura delle verifiche

Codice applicativo identico al checkpoint pubblicato `252d9c30e8497b16d3f3f10e39d6e0e09f879a63`; C aggiunge solo script del gate nativo, rapporto/stato ed evidenze. Contratto A pubblicato `afc6c00d4eeeea7c5947e6d7a107f85bbc47dce3`. Checkpoint attraverso connettore GitHub autorizzato, con confronto dell'intero albero e allineamento del checkout al commit remoto; precursori locali preservati nei branch `codex/train-management-m3-local-contract` e `codex/train-management-m3-local-depot`. Nessun reset/rebase/force-push. SHA conclusivo e verifica remota nella consegna.

### Matrice conclusiva

| Controllo | Esito / evidenze |
| --- | --- |
| Dominio inventario/identità/disponibilità/assegnazioni | **PASS**, nove nuovi test; suite totale 254 Node, zero fail/skip. Errori atomici, due modelli identici distinti, esclusività item/posto, modello compatibile, rimozione riservato protetta. |
| M2 confermato/bozza/annullamento/riordino | **PASS**, prenotazioni seguono UUID del posto; bozza e annullamento non modificano i confermati; conferma rilascia solo riferimenti invalidi senza riassociare modelli uguali. M2 non viene mutato dall'inventario. |
| Reset | **PASS**, riferimenti fisici rigenerati/generazione aggiornata; nessun vecchio carro nella proiezione; inventario e progetti conservati nella sessione. |
| Stock fisico / sganciati | **PASS**, UUID conservato durante sgancio/riaggancio; stato fisico rimane sul binario, inventario virtuale invariato. |
| Browser M3 | **PASS**, nove gruppi funzionali sul minificato; tre viewport 1440×1000, 1024×768, 768×1024, touch create/remove, target ≥44px e nessun overflow. Nomi M2 come testo inerte. |
| Lifecycle M3 | **PASS**, guard anche senza progetti, close/reopen conserva record, rimozione ultimo record libera guard, dispose e 25 cicli senza residui osservabili. Presentazione del prompt nativo **NOT VERIFIED**; evento sintetico verifica l'handler. |
| M1 e M1.1 | **PASS**, suite M1 esistente incluso touch minificato; suite M1.1 tramite wrapper M2 già approvato che attende fine scroll prima di Fit. Codice di proiezioni/vista laterale e asset byte-identici a M2. |
| M2 funzionale / lifecycle | **PASS**, tutte le 13 verifiche funzionali e il lifecycle precedente ripetuti sul nuovo bundle; progetti, dirty guards, copia/confronto, reset, zoom/Fit e touch conservati. |
| R1/5C | **PASS**, undici scenari storici: frontali, composizioni lunghe, sganciati/scambi, inserimento occupato, approccio, curve, frequenze frame, circuiti misti, cambio modello/spazio, storia sganciati e giunto. Wrapper M2, asserzioni storiche invariate. |
| Console e Phase Zero | **PASS**, controlli indipendenti, quattro treni/LRU, posizioni SVG/canonico, runaround, switch/HUD, stop e quattro viewport. Il 404 volontario della suite console verifica il fallback, non è una regressione asset. |
| Native RAF / tre treni | **PASS**, gate dedicato descritto sotto; nessuna pausa/render suppression/stepping diagnostico. |
| Build / Python / canonico | **PASS**, build minificata, 9 Python, grafo rigenerato 70 nodi/75 archi senza differenze; canonico SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. |
| R1/App/renderer/Supabase/Auth/RLS | **PASS invarianti**, nessun cambiamento ad app.js, comandi/step/stato R1, dominio M2, renderer, vista laterale, asset, Auth, Supabase, dipendenze o workflow. Nessuna operazione Supabase/Auth remota eseguita. |

**Dieci suite browser conclusive PASS.** Fixture locali di autenticazione; le suite deterministiche/on-demand non sono usate come sostituti del gate nativo. Nessuna verifica in produzione/deploy o su dati cloud effettuata in M3.

### Gate nativo M3

`tests/browser-depot-runtime.py` carica il bundle minificato reale, hash verificato su disco e dalla risposta HTTP:

`69eb83ebae0250ffe245d4ec6ede50cae3561f148f2e2973d0274f2c53b1068e`

HTML locale derivato da index.html sostituisce solo l'avvio Auth. RAF/timer/tick/render non intercettati, nessuna pausa né `diagnostics.step`. Comandi dei controlli ordinari via eventi DOM; rilascio prenotazione da mouse e creazione/rimozione da touch tramite **tre input CDP trusted**. Viewport compatto 800×700, Low, Chromium/SwiftShader; i viewport desktop/tablet completi sono coperti separatamente dal browser funzionale.

**Sei gruppi PASS, sette checkpoint, 74 frame nativi in 160,477 s.** I tre treni avanzano durante creazione di un progetto M2, creazione e prenotazione dei record Depot, rilascio/create/remove con input nativi e close/reopen. Identità dei rotabili fisici e dei posti M2 invariate. Entrambi i comandi R1 rifiutati in marcia; stop del solo treno 0, sgancio effettivo e riaggancio dello stesso carro con altri due treni che continuano ad avanzare: inventario e progetti non cambiano e lo sganciato compare esclusivamente come materiale fisico sul binario.

Posizioni mondo/3D coerenti nei checkpoint, RAF verificato come funzione nativa, contesto WebGL attivo alla fine. **348 geometrie e 44 texture** in tutti i checkpoint. Zero errori pagina/console, richieste fallite o HTTP ≥400. Rendering software circa **0,455 frame/s**, non fluido; misura della sessione inclusi input/acquisizione, non benchmark isolato o confronto prestazionale equivalente a M2. **GPU/tablet fisici e fluidità hardware NOT VERIFIED.**

### Sicurezza e confini

[Invarianti](evidence/M3/final/invariants.json): nessun percorso non autorizzato; file bloccati byte-identici a M2 approvata; CSS preesistente integralmente preservato. Nessuna nuova dipendenza o renderer. Modelli validati contro il catalogo, prenotazioni contro i confermati correnti, nessuna promozione di UUID fisici a record depot; niente eval/HTML dinamico da nomi utente. Scansione mirata delle nuove modifiche senza pattern di credenziali; non è l'audit cybersecurity completo 5E.

## Funzionalità e limiti consegnati

- **Supportate:** creazione/rimozione di soli record virtuali, identità indipendenti, disponibilità/prenotazione logica esclusiva, rilascio/ripristino disponibilità, riconciliazione dei posti M2 confermati, lettura delle categorie progettate/fisiche/sganciate, guard della sessione e lifecycle. Uso delle console R1 preesistenti per manovre già supportate.
- **Non supportate:** trasferimento fisico scena↔deposito, ritiro o materializzazione di un veicolo da inventario, creazione/cancellazione di treni dal deposito, applicazione globale di composizioni. Controlli disabilitati con motivazione e nessun dispatcher fisico sottostante.
- **Limiti intenzionali:** inventario e progetti solo RAM, persi ricaricando/chiudendo la pagina; prenotazioni solo dei confermati, non delle bozze; un record per un posto e un posto per un record; rimozione di prenotato solo dopo rilascio. Non inventario di proprietà reale, non associazione a sourceVehicleId fisico, nessuna promessa di identità fisica tra reset/sessioni. L'inventario virtuale e i confermati M2 sono invece conservati al reset ferroviario e alla chiusura della finestra.
- **Problemi/regressioni:** nessuna regressione applicativa riprodotta nelle verifiche conclusive. Il primo errore del predicato dell'harness M3 resta FAIL nel proprio artefatto; ripetizione PASS sul medesimo bundle. Hardware fisico e prompt nativo sono i NOT VERIFIED espliciti, non PASS impliciti.

## Verdetto

**M3 READY FOR REVIEW**, nel perimetro virtuale e read-only del contratto A. La consegna richiede il checkpoint remoto finale verificato, con SHA effettivo nella risposta conclusiva; READY non è approvazione della Regia.

Branch `codex/train-management-m2`; checkpoint contratto `afc6c00d4eeeea7c5947e6d7a107f85bbc47dce3`, implementazione `252d9c30e8497b16d3f3f10e39d6e0e09f879a63`, commit conclusivo test/evidenze quello che aggiorna questo rapporto. Approvata M2 intatta e main di riferimento `184cc9b` preservata.

**STOP per audit/approvazione della Regia. Nessuna persistenza, release, altra fase, merge o deploy avviati.** Un trasferimento fisico richiederà un contratto ferroviario separato e approvato; M3 non lo anticipa.

## Evidenze e riproduzione

- [Matrice finale](evidence/M3/FINAL_GATES.json), [hash e confini](evidence/M3/final/invariants.json), [sorgenti testate](evidence/M3/final/sources.json).
- [Browser M3](evidence/M3/implementation/result.json), [desktop](evidence/M3/implementation/desktop-depot.png), [tablet landscape](evidence/M3/implementation/tablet-landscape.png), [tablet portrait](evidence/M3/implementation/tablet-portrait.png), [lifecycle](evidence/M3/implementation/lifecycle.json).
- [Gate nativo](evidence/M3/final/native/result.json), [frame](evidence/M3/final/native/frames.json), [Depot nel runtime nativo](evidence/M3/final/native/native-depot.png).
- [R1 undici scenari](evidence/M3/final/regressions/railway/docs/phase-5c-close/acceptance.json), [M2](evidence/M3/final/m2/browser.json), [M1](evidence/M3/final/m1/browser.json), [M1.1](evidence/M3/final/side/browser.json).

Dalla root con dipendenze del progetto e Python Playwright/Chromium già disponibili: `npm test`, `npm run build`, `python3 -m unittest discover -s tests -p '*_test.py'`, `python3 scripts/build-canonical-layout.py`. Server `python3 -m http.server 8000`; poi `python3 tests/browser-depot.py`, `python3 tests/browser-depot-lifecycle.py`, `python3 tests/browser-depot-runtime.py`. Output selezionabili con M3_OUTPUT/M3_LIFECYCLE_OUTPUT/M3_RUNTIME_OUTPUT. Il runtime software può richiedere minuti.

Regressioni tramite script M2 invariati: `tests/run-train-project-regressions.py` con railway/deck/phase-zero e M2_REGRESSION_OUTPUT, `tests/browser-train-management.py` con M1_OUTPUT, `tests/run-train-side-regression.py` con M11_OUTPUT, `tests/browser-train-projects.py` con M2_OUTPUT, `tests/browser-train-project-lifecycle.py` con M2_LIFECYCLE_OUTPUT. Output M3 in work/m3-*, copie permanenti qui, senza sovrascrivere evidenze precedenti.
