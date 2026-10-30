# S1 — Modello unificato di instradamento

30 ottobre 2026. **S1 PASS. S0 approvata dall'utente; autorizzata esclusivamente S1. S2 NON INIZIATA.**

## Stato e intervento

Repository `epivic-lab/SerieN`, branch `main`. Baseline conclusiva S0 verificata: **`107178921bbc8049d855c0221b799444231120bb`**, working tree pulito. Fetch origin/main eseguito: nessun commit remoto successivo alla base di S0 (`6487f61`); S0 presente localmente e preservata. Nessun reset, merge, push o deployment S1.

Il commit S1 è quello che introduce questo rapporto: recuperabile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S1/REPORT.md`; SHA effettivo e stato Git finale sono comunicati nella consegna. È un singolo commit recuperabile/revertibile, senza dipendenze da altri repository.

- `src/turnout-routes.js`: vista pura e immutabile ottenuta dal router esistente. Tutti gli otto controlli, due stati, porte, percorsi canonici selezionati, direzione d'ingresso e UNKNOWN esplicito. WX-A e WX-B espongono entrambe le vie valide, senza connessione al centro X.
- `src/turnout-commands.js`: richiesta unica per ID canonico e origine panel/device; valida dati, rilegge le guardie del motore a ogni richiesta e conserva l'ordine della precedente commutazione+riconciliazione Journey.
- `app.js`: pannello e picking dei marker chiamano lo stesso `requestToggle`; il wrapper conserva aggiornamenti materiali, UI e messaggi. Vista e comando ispezionabili solo nel consueto oggetto diagnostico condizionato da `?diagnostics=1`.
- Tre nuovi file di test automatici; [contratto completo e tabelle](../../S1_CONTRACT.md), PROGRESS e STATUS aggiornati; evidenze in questa directory.

Nessun effetto, modifica dei marker, nuova hit zone, glow, freccia, STOP o audio. Nessun intervento alla fisica, a Supabase, a permessi/API/backend, ad altri repository, a dipendenze o workflow.

## Connessioni e separazione delle responsabilità

Per ciascuno dei sei semplici: false A↔B / AB, C bloccato; true A↔C / AC, B bloccato. Entrambe le provenienze del ramo selezionato sono lecite nel router attuale. Per ciascun WX310: false UL↔UR e LL↔LR; true UL↔LR e LL↔UR. Tutti e quattro gli ingressi verificati separatamente in entrambi gli stati e al ritorno.

Dettaglio significativo: Y-3, Y-IN e Y-2 hanno porte condivise. La vista **LOCAL_SELECTION** descrive il solo dispositivo; la vista **NETWORK** verifica l'arco e l'estremo d'arrivo con il router e lo stato effettivo del vicino. Non si deduce la percorribilità di rete dalla sola scelta locale. Una selezione nota può avere un ingresso BLOCKED; stato, porta o contesto non determinabile produce UNKNOWN senza activePaths fittizi.

ROUTABLE significa connessione, mai via libera. Il lock di manovra resta un'osservazione separata del motore; hazardStatus è un'osservazione opzionale con default UNKNOWN. Il predittore S5 non è implementato. La grafica non può decidere instradamento, occupazione, arresto o consenso alla commutazione.

## Test e prove

| Verifica | Risultato |
|---|---|
| Baseline `npm test` prima delle modifiche | PASS, 131 test su S0 |
| `npm test` conclusivo | **PASS, 148 test**, zero fallimenti/saltati; [log](node-tests.txt) |
| Nuova matrice router | **7.168 ingressi nelle 256 configurazioni degli otto controlli**, comprese adiacenze chiuse; oracle indipendente per semplici/WX, entrate opposte, Journey e Next Switch |
| Nuove prove comando | 32 transizioni confrontate con la precedente mutazione/riconciliazione; guardie reali occupied, detached, approaching; rifiuti equivalenti, invalid/NaN e rilettura dello stato |
| `python3 -m unittest discover -s tests -p '*_test.py'` | **PASS, 9 test JMRI**; [log](python-tests.txt) |
| `npm run build` | **PASS**; [log](build.txt), hash in [preservation.json](preservation.json) |
| Rigenerazione layout canonico + diff Git | **PASS, nessuna differenza**; [statistiche](canonical-regeneration.txt) |
| Nuova suite browser S1 | **PASS, 16 coppie pannello/marker reali** (otto ID × due stati), rifiuto occupato da entrambe le superfici e input invalidi; [risultato](browser-contract.json), [log](contract-run.txt) |
| Suite produzione `browser-phase-five-close.py` | **PASS, 11 scenari ferroviari**; [risultato](browser-5c-close/acceptance.json), [log](browser-close-run.txt) |
| Suite produzione `browser-phase-zero.py` | **PASS**, circuiti/manovre/HUD e quattro viewport responsive; [risultato](browser-production/browser-result.json), [log](browser-zero-run.txt) |
| Confronto visivo S0/S1 | **PASS, otto coppie pixel-identiche**, Low/High/Cinema giorno/notte e Kenney Low; [confronto](visual/comparison.json), [log](visual-run.txt) |
| Stato/trasformazioni dei rotabili | **PASS, equivalenza esatta** in entrambi i versi, nativi e GLB; dati before/after motion nella cartella [visual](visual/) |
| Invarianza ferroviaria | **PASS**, 150 rotaie e 75 letti identici alle impronte S0 nella nuova suite browser |
| Sicurezza minima | **PASS nel perimetro S1**, [verifica](security.json); non sostituisce audit finale 5E |

Le regressioni 5C coprono frontali, composizioni lunghe, sganciati al giunto, inserimento occupato, scambi in avvicinamento, agganci in curva, frame irregolari, versi misti, crescita modelli, storia sganciati e riaggancio al giunto. Le suite esistenti non sono state indebolite o modificate. Gli output browser sono scritti in cwd temporanee separate, poi copiati qui, senza sovrascrivere prove storiche.

La prima fixture della nuova prova browser tentava di collocare un convoglio lungo su un ramo insufficiente: il diagnostic placement l'ha correttamente rifiutata. La prova finale usa una locomotiva isolata attraverso il comando di sgancio preesistente; nessuna guardia è stata allentata.

## Geometria, dinamica e ottimizzazioni 5D

Hash canonico invariato: **`e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`**. Grafo: 70 nodi, 75 archi, quattro terminali. La verifica browser confronta **l'intero inventario S0**: identità edge/side, trasformazioni/matrici, bounding box, hash degli attributi e degli indici, estremi e controller. Gli oggetti sono letti prima del batching statico già esistente, non ricostruiti da un conteggio della scena aggregata.

Tutti i sorgenti del manifest S0 rimangono byte-identici tranne `app.js`; aggiunti solo i due moduli del contratto/comando. In app.js sono byte-identici `tick`, `advanceFleet`, `renderVehicles`, `getSwitchAssistance`, `switchHUDState`, `makeSwitch`. Router, Journey, coordinatore, conflitti, Next Switch, HUD, plancia, minimappe, renderer, materiali ed effetti restano invariati. [Preservation](preservation.json).

Il nuovo modello prepara una volta topologia e due selezioni locali; i punti restituiti sono copie congelate e riutilizzate. Non viene chiamato nel RAF o nel passo motore. Il dispatcher svolge lo stesso lavoro del precedente toggle soltanto su comando, con validazioni aggiuntive. `tracePoints:false` e le ottimizzazioni 5D restano attive; il test preesistente route-performance confronta 120 proiezioni con il riferimento 5C.

Bundle: **985.297 → 989.196 byte**, +3.899 byte (**+0,40%**), nessuna dipendenza nuova. SHA-256 finale **`0aebd3b2757791db8f078c32157c3ed1b31456eca16432f19baf4369f16c7cec`**. Nessun benchmark completo 5D rieseguito o incremento FPS rivendicato: l'evidenza S1 è l'invarianza dei percorsi caldi, delle geometrie, delle immagini e degli stati, oltre alle regressioni automatiche.

## Riproduzione delle verifiche browser

Da root del repository, dopo build e server statico locale sulla porta 8000:

```sh
node scripts/performance/build-profile.mjs . /workspace/work/s1/s1-profile.js
node docs/_active/turnouts/evidence/S0/build-observer.mjs . /workspace/work/s1/s1-observer.js
S1_BUNDLE=/workspace/work/s1/s1-observer.js S1_OUTPUT=/workspace/work/s1/contract python3 tests/browser-turnout-contract.py
```

Le suite esistenti vanno lanciate con `SERIEN_URL=http://127.0.0.1:8000/` da una cwd temporanea per i loro output. Il confronto usa `scripts/performance/visual-regression.py`, medesimo server e due bundle temporanei salvati: quello S0 generato prima delle modifiche e quello S1. [Comandi e provenienza](commands.json). Per ricreare il bundle S0 in futuro usare una copia temporanea del sorgente Git della revisione, senza cambiare/reset del checkout corrente. Non installare bundle di osservazione in dist.

## Limiti e prossima azione

Nessun blocco aperto per S2. Le proprietà fisiche dei profili Kato conservano i limiti metrologici già documentati; S1 non le ridefinisce. **GPU fisiche, touch su dispositivo reale e benchmark hardware: NOT VERIFIED.** Browser Chromium/SwiftShader, risultati relativi alla simulazione e alle fixture dichiarate.

L'API richiede il grafo canonico validato e bloccato. La selezione locale non include la disponibilità di tutta la rete; per l'approccio concreto occorrono arco/estremo e router correnti. Il chiamante grafico non deve trasformare operationLock UNLOCKED in permesso di circolazione né hazardStatus UNKNOWN in SAFE.

**Unica prossima azione: attendere approvazione esplicita S2.** S2 proposta: rimuovere soltanto i marker artificiali e derivare le hit zone invisibili dalle geometrie canoniche, preservando comando unico, guardie, binari e ballast. Nessuna attività S2 eseguita in questo commit.
