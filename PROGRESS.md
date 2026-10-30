# SerieN — Stato e ripresa

**5C chiusa. 5D ripresa su richiesta dell’utente: regressioni e benchmark finali in corso. 5E non iniziata.**

Autorizzazione corrente: richiesta completa Fase 5D in `docs/phase-5d/REQUEST.md`. Baseline recuperabile `303525c`; working tree iniziale pulito; 125 Node, 9 Python e build iniziali passati. La 5E richiede una nuova istruzione esplicita. Nessun push, deployment o intervento su `first`, `SerieN Control` o altri repository.

5D: ripresa dal checkpoint pulito `5ae8ee9`. Verificato `origin/main` a `f582b12`: due commit remoti aggiungono solo asset-library e file .DS_Store, preservati senza merge/deployment. Build, 9 Python e 130 casi Node passati; confronto esatto di 8 coppie di immagini Low/High/Cinema giorno/notte e trasformazioni/stato in moto nei due versi nativo/Kenney passato. Prove in `docs/phase-5d/regression`. Matrice browser 5C e suite operativa responsive passate; simulazione e proiezione HUD equivalenti nei casi verificati (`SIMULATION_UI_ACCEPTANCE.md`). Tutte e cinque le suite browser sono passate. Baseline frame completa: 39 acquisizioni A–E, zero errori/richieste fallite, dati salvati in Git. Candidato Low completo: 15 acquisizioni, nessun superamento dei budget mediana/p95 (`CANDIDATE_LOW.md`). In corso High/Cinema e sessioni F prima/dopo. 5D non ancora chiusa.

## Rapporti e checkpoint

- [Chiusura 5C](docs/PHASE5C_CLOSURE.md): requisiti, correzioni, prove, rischi residui e rollback.
- [Roadmap](docs/ROADMAP_PHASE5.md): gate delle sottofasi e governance.
- Baseline pubblicata v0.12: `618f538`; audit 5A: `b819864`.
- 5B: `5a551f7`, `afd50db`, conclusione `954461e`.
- Prima implementazione 5C: `d85892f`, rapporto `2a78abc`.
- Verifica indipendente: `5060221`, con gate ancora aperto a quella baseline.
- Chiusura applicativa: `5580799` (passo candidato della flotta), `79247d3` (guardie su modelli/inserimento), `b6ec62d` (contatti invariati), `13ebb2b` (storia sganciata coerente con lo scambio attuale), `8cacb18` (riaggancio al giunto con storia ricostruita).
- Checkpoint documentale finale: commit che aggiorna questo file e introduce `docs/PHASE5C_CLOSURE.md`; risolvere con `git log -1 --format='%H %s' -- PROGRESS.md`.

Branch: `performance/phase-5d`, derivato da `303525c`. Tutti i commit sono locali. Il recupero fuori da questa macchina richiede backup/esportazione o push autorizzato; l’hash nella chat non trasferisce gli oggetti Git. Non fare reset distruttivi del lavoro esistente.

## Esito tecnico

Il movimento viene verificato prima del commit del passo, con inviluppi durante il movimento e ricontrollo degli arresti a catena. Posizioni, storia e odometri rifiutati restano conservati. Frontale originario: margine minimo +1 mm, entrambe le locomotive ferme. Inserimento del quarto convoglio e crescita dei modelli non possono introdurre nuovi conflitti; i contatti esistenti possono restare invariati o migliorare. La crescita di uno sganciato non inventa occupazione su un vecchio ramo dopo una commutazione lecita. Il riaggancio attraverso il giunto ricostruisce una candidata tramite il router reale prima del matching e conferma soltanto dopo verifica dello spazio completo.

Geometria canonica, router, Journey/clock, missioni, HUD, plancia, costruttori dei rotabili, asset, dipendenze e workflow conservati. Nessuna galleria. Le modifiche applicative sono confinate a `app.js`, conflitti, coordinamento del passo, comandi flotta e contratti JSDoc. [Confronti](docs/phase-5c-close/preservation.json).

## Verifiche finali

- **125 test Node**, zero fallimenti o test saltati; **9 Python JMRI**; build riuscita.
- **Cinque suite browser verdi**: matrice conclusiva 5C (undici scenari), operazioni Fase 0, rendering/operazioni Fase 4, composizioni GLB reali, rollback atomico 5C.
- Tutti gli ingressi degli otto controlli verificati con oracle esplicito e attraversamento completo; quattro terminali con convogli corti e cinque carri; entrambi i rami del runaround; frontali/inseguimenti/WX; carro sganciato su giunto; scambio in avvicinamento; aggancio in curva e al giunto con identità conservate.
- 20/60/120 Hz e frame irregolari con uguale fase iniziale e tempo accettato: stessi stati ferroviari, occupazione, HUD e testo delle consolle. Marker e mesh coerenti; testo reale dell’HUD verificato.
- Schermate Low/High e responsive ispezionate; nessun errore JavaScript o richiesta fallita nelle suite browser riuscite. 36 moduli applicativi, zero cicli ESM statici.

Prove e comandi: [phase-5c-close](docs/phase-5c-close/). Codice applicativo finale verificato: `8cacb18`. Gli output sono locali, contro la build locale; gli script hanno scritto in cwd temporanea e non hanno sovrascritto i report storici.

## Limiti e ripresa

Validazione della simulazione nelle condizioni della matrice: inviluppi sul piano e passo massimo 1/60 s, non certificazione delle mesh articolate o di un impianto reale. La diagnostica può ancora imporre sovrapposizioni per riprodurre difetti; non è una riparazione automatica di stati iniziali invalidi. Restano i limiti metrologici su WX310 e rotabili.

Chromium/SwiftShader non certifica GPU fisiche. La 5D dovrà misurare i costi, inclusi quelli della nuova previsione; non è stata avviata alcuna ottimizzazione. CSP, supply-chain, CI e recovery restano alla 5E. Il limite del clock di 0,2 s per aggiornamento è conservato e testato.

Alla ripresa leggere rapporto e roadmap, verificare branch/HEAD/working tree e conservare modifiche successive. Usare il checkout esistente `/workspace/SerieN`, senza nuovi worktree salvo richiesta. Ambiente verificato: Node 24.19.0, Python 3.12.14, Chromium/Playwright. Proxy e CA ereditati. Comandi riproducibili in `docs/phase-5c-close/commands.json`.
