# SerieN — Stato di avanzamento e ripresa

## Fase corrente

**5B conclusa: refactoring architetturale mirato e verificato. 5C non iniziata.**

La richiesta esplicita «esegui 5b» ha autorizzato questa sottofase. La [roadmap ufficiale](docs/ROADMAP_PHASE5.md) richiede una nuova istruzione per iniziare 5C, 5D o 5E. Nessun push/deployment o intervento su `first`, `SerieN Control` e altri repository è autorizzato dal lavoro corrente.

## Riferimenti Git e recuperabilità

- Baseline applicativa stabile confrontata: `618f538563aa7bd6497f6de3fba9744287b7ebb0`, v0.12.
- Audit 5A: `b819864`, conservato nel branch `audit/phase-5a`.
- Branch corrente: **`refactor/phase-5b`**, creato da working tree pulito.
- Primo checkpoint: **`5a551f7`**, viste ferroviarie pure e caratterizzazione.
- Secondo checkpoint: **`afd50db`**, comandi della flotta, separazione degli effetti UI e pulizia mirata.
- Checkpoint conclusivo: commit che introduce `docs/REFACTORING_PHASE5B.md` e aggiorna questo file; identificarlo con `git log -1 --format='%H %s' -- PROGRESS.md`.

Commit soltanto locali: nessun push, nuovo rilascio o deployment; `main` remoto non modificato. Una nuova sessione con lo stesso checkout può riprendere dal branch. La perdita completa della macchina richiede backup/esportazione o push autorizzato del branch: l'hash nella chat non trasferisce gli oggetti Git.

## Ultima attività completata

Estrazione da `app.js` di:

- `src/railway-state.js`: layout, posizioni, raccolta occupazione e derivazione assistenza scambi; lettura senza DOM/renderer o mutazioni di Journey, nessuna cache nuova.
- `src/fleet-commands.js`: velocità, inversione, stop, luci e aggancio/sgancio; mutazioni degli oggetti esistenti e risultati espliciti. UI, messaggi e missioni sono adattati dall'entrypoint nello stesso ordine precedente.
- `src/railway-types.js`: contratti strutturali JSDoc. Nessuna dipendenza o type checker aggiunto.

Rimossi import/materiali inutilizzati. La regione sorgente dei builder è identica alla baseline dopo la sola rimozione di due dichiarazioni morte: PNG e modelli conservati; aggiornato solo il digest di provenienza nel manifest miniature. `app.js`: 967 → 897 righe, senza riscrittura generalizzata.

Documentazione: [report 5B](docs/REFACTORING_PHASE5B.md), [roadmap](docs/ROADMAP_PHASE5.md), [audit storico 5A](docs/ENGINEERING_AUDIT.md). Evidenze in `docs/phase-5b/`; fixture storiche test-only in `tests/fixtures/*-v012.js`.

## Test realmente eseguiti

- **106 test Node passati**: 100 precedenti + sei nuovi. Confronti di stato/message/identità e 180 combinazioni delle viste ferroviarie; Journey congelati non mutati.
- **9 test Python JMRI passati**.
- Build riuscita; nessun cambio a manifest delle dipendenze, lockfile o workflow.
- **Confronto browser v0.12/5B PASS:** sei snapshot identici per stock/hull, Journey, animazione, composizioni, HUD, consolle, messaggi e missioni.
- **Browser Fase 4 PASS:** tre convogli, fasi delle ruote/bielle, inversione, sgancio/ritorno/riaggancio, quattro terminali, UI e rendering responsive/High.
- **Browser operativo PASS:** tre circuiti nei due sensi, quarto convoglio/MRU, scambi protetti, HUD, runaround e STOP ALL.
- **Browser Kenney PASS:** spaziatura, cambio modelli, sgancio/riaggancio, inversione, reset e ripristino nativi.
- Confronto dei file protetti e del builder; zero cicli nel grafo statico aggiornato. Nessuna misura di prestazioni o GPU fisica rivendicata.

Gli script browser hanno scritto in copie temporanee. Le immagini/report precedenti non sono stati sovrascritti. Non è stato ricontrollato qui il deployment pubblico: non è cambiato perché non è stato pubblicato nulla.

## File modificati / conservati

Applicazione: `app.js` e tre moduli nuovi. Manifest miniature: solo hash di provenienza. Aggiunti test, fixture storiche, confronto browser e documentazione. Rete, grafo canonico, Journey/clock/router, rotaie, Next Switch HUD, plancia, rotabili, asset manager, scenografia, camera, CSS/index, dipendenze e CI sono identici alla baseline: [preservazione](docs/phase-5b/preservation.json).

Non esiste un secondo store: array e veicoli mantengono le identità. `cars` e l'indicizzazione per ID restano contratti legacy esplicitati, non trasformati in accessor che romperebbero il reset. Lifecycle e recovery globale del renderer rimangono quelli esaminati in 5A.

Nel checkpoint finale non restano modifiche tracked non committate; controllare comunque `git status --short`. `dist/`, cache Python e file in `/tmp` sono output locali, non modifiche da applicare o pubblicare.

## Problemi aperti: riservati alle fasi successive

- **R01 / P1 (5C):** soglia cross-edge 17 mm insufficiente per i corpi lunghi. Funzione collisioni identica alla baseline; nessuna correzione introdotta durante l'estrazione.
- **R02 / P1 (5C):** occupazione dei carri sganciati tagliata all'edge del centro, ora isolata e commentata nel servizio. Ancora riprodotta, non approvata come requisito corretto.
- **R03 / P2 (5C):** Journey/FixedClock accettano NaN nei casi dell'audit; sorgenti invariati.
- Profiler/allocazioni e benchmark hardware: 5D. CSP, action/permessi CI e recovery robusto: 5E. Nessuna nuova vulnerabilità critica rilevata durante questo refactoring, che non sostituisce un nuovo security assessment.

## Prossima attività raccomandata — NON eseguita

Attendere istruzione per **5C**. Iniziare dalle regressioni R01 e R02 che dimostrino la protezione desiderata, quindi correggere gli inviluppi cross-edge e conservare il percorso dei carri sganciati attraverso i giunti. Usare i servizi ora testabili; non introdurre nuove topologie o modifiche alle missioni senza necessità verificata.

## Ripresa in una nuova sessione

1. Leggere questo file, la roadmap e il report 5B; l'ultima istruzione esplicita dell'utente prevale.
2. Controllare branch, `git status --short --branch` e `git log -4 --oneline`; non resettare o eliminare lavoro esistente.
3. Usare il checkout `/workspace/SerieN`: le task cloud sono già isolate, nessun worktree salvo richiesta.
4. Tool osservati: Node 24.19, Python 3.12.14, Chromium 154 e Playwright Python 1.62. CI: Node 22/Python 3.12. Usare proxy/CA ereditati; mai estrarre segreti o disabilitare TLS.
5. Node: `node --test --test-isolation=none tests/*.test.js`; Python: audit unittest; build: `npm run build`. I browser e i generatori scrivono report tracked: eseguirli con working directory temporanea. Il confronto `tests/browser-phase-five-b.py` richiede anche la build v0.12 a porta 8001 e candidato a porta 8000; non pubblica siti.
6. Per ripristino, revert dei singoli commit 5B in ordine inverso su branch dedicato e working tree verificato. Non mascherare R01/R02/R03 come comportamento corretto per mantenere verdi i test.
7. Non iniziare 5C automaticamente. Ogni blocco futuro richiede motivazione, rischio, verifica, rollback e commit piccolo.
