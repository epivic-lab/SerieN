# SerieN — Stato e ripresa

**5C conclusa nei limiti documentati dei casi collaudati. 5D e 5E non iniziate.**

Autorizzazione corrente: richiesta «5c». Occorre nuova istruzione esplicita per 5D/5E. Nessun push, deployment o intervento su `first`, `SerieN Control` e altri repository.

## Checkpoint

- Baseline applicativa v0.12: `618f538`; audit 5A: `b819864`.
- 5B: `5a551f7`, `afd50db`, conclusione `954461e`.
- Branch corrente: `reliability/phase-5c`, creato da working tree pulito.
- Correzioni 5C: `d85892f`.
- Chiusura documentale: commit che introduce `docs/RELIABILITY_PHASE5C.md`; risolvere con `git log -1 --format='%H %s' -- PROGRESS.md`.

Tutti i commit sono locali. La perdita della macchina richiede backup/esportazione o push autorizzato del branch: l'hash nella chat non trasferisce gli oggetti Git. Non fare reset distruttivi del lavoro esistente.

## Ultimo blocco completato

R01: inviluppi orientati anche su edge diversi e medesimo predicato per carri fermi; rispetto del verso di avvicinamento. R02: sgancio con copia indipendente del Journey e occupazione su tutti i segmenti attraversati. R03: input numerici invalidi rifiutati prima della corruzione di stato. Posizionamento diagnostico e cambio modello senza spazio non sostituiscono lo stato valido. Aggancio fallito ripristina la ribbon; riaggancio riuscito aggiorna immediatamente le mesh prima della UI.

File principali: `app.js`, `src/railway-conflicts.js`, `src/railway-state.js`, `src/fleet-commands.js`, `src/simulation.js`, contratti JSDoc e test dedicati. Geometria, topologia, missioni, asset, dipendenze e workflow conservati. [Verifica](docs/phase-5c/preservation.json).

## Verifiche effettive

- 109 test Node passati (106 precedenti + tre regressioni R01–R03).
- 9 test Python JMRI passati; build riuscita.
- Browser operativo: circuiti bidirezionali, scambi/crossover, quarto convoglio/MRU, protezioni, HUD, runaround e STOP ALL.
- Browser Fase 4: movimenti simultanei, animazione, inversione, aggancio/sgancio, quattro terminali, Low/High e responsive.
- Browser R01: entrambe le locomotive del caso T47/T46 ferme dopo il controllo.
- Browser atomico: cambio Kenney→nativo impossibile a T39 e posizionamento oltre il terminale rifiutati conservando i Journey precedenti.

Log e risultati: `docs/phase-5c/`. Report: [RELIABILITY_PHASE5C.md](docs/RELIABILITY_PHASE5C.md). Nessuna immagine o vecchio report sovrascritto: gli script browser ordinari hanno scritto in copia temporanea.

## Limiti e prossimi passi

Gli inviluppi sono rettangoli orientati sul piano, non mesh fisiche esatte; la protezione usa il campionamento temporale esistente. I casi verificati non certificano ogni composizione/manovra o la sicurezza di impianti reali. I veicoli legacy artificiali senza storia usano il fallback single-edge; gli sganciati creati dal runtime conservano sempre la storia. Restano i limiti metrologici di WX310, fouling e rotabili.

Non sono state misurate GPU fisiche né ottimizzazioni: questo appartiene alla 5D. CSP, supply-chain, CI e recovery robusto appartengono alla 5E. Prima della 5D attendere l'utente e impostare benchmark ripetibili; non trattare i timing SwiftShader come FPS desktop.

## Ripresa

Leggere questo file, `docs/ROADMAP_PHASE5.md` e il report 5C. Controllare `git status --short --branch` e `git log -4 --oneline`. Nel checkpoint finale nessun cambiamento tracked resta non committato. Non eliminare modifiche successive/altrui.

Usare `/workspace/SerieN`, senza worktree aggiuntivi salvo richiesta. Tool osservati: Node 24, Python 3.12, Chromium/SwiftShader e Python Playwright; CI usa Node 22. Usare proxy e CA ereditati. Eseguire `node --test --test-isolation=none tests/*.test.js`, unittest JMRI e build per i controlli ordinari; i browser/generatori scrivono report, quindi usare working directory temporanee. Nessuna nuova sottofase parte automaticamente.
