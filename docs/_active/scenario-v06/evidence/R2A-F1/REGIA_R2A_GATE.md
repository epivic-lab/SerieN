Fonte: https://github.com/epivic-lab/SerieN/pull/17#issuecomment-6858353142

## Quality Gate Regia — R2A / 13 novembre 2026

**Decisione: PASS NUMERICO R2A; NO-GO all'avvio di R2B finché non è risolto il rischio ADJ-01.** PR #17 resta Draft. Nessun merge, deploy o bootstrap/browser V06.

Ho verificato tramite connettore GitHub PR, ancestry R1C `b49320c6...` → R2A `7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003` (un commit), elenco delle 28 modifiche, rapporto, sorgenti del laboratorio/oracolo, test e log/evidenze. Il diff non modifica Railway Core, dataset, UI o bootstrap. I log pubblicati attestano 395/395 Node, 9/9 JMRI, build/canonico; **non ho eseguito autonomamente la suite in un checkout**. I sei giri e i due con composizione sono coerenti con l'obiettivo numerico della fase.

### ADJ-01: rischio aggiuntivo da verificare, oltre al blocco a treno fermo
Il report misura l'arresto C13/WX-A prima del giunto, ma con C13 ancora occupato: comando correttamente rifiutato al tick 889. Una lettura congiunta di `src/next-switch.js`, `src/railway-state.js`, `src/turnout-commands.js`, `src/railway-guard.js` e del diagnostico ADJ-01 indica una possibile lacuna **prima** dell'occupazione: `traceJourney` può censire solo WX-A e non C13 sul nodo condiviso; `siteSafety` verifica gli approach tramite `preview.encounters`. Al tick 836 (velocità ~88,33 mm/s), il gancio di testa è a s=40,031 sul P060; la protezione esterna C13 è s=[0,30]. Qui il corpo non è ancora nella fascia occupata, e va provato che C13 non venga erroneamente visto come `unlocked` e commutato durante la marcia. **Questo possibile varco è un'inferenza da codice, non ancora una violazione riprodotta: occorre un test dinamico esplicito.**

### Unica prossima microfase autorizzabile: R2A-F1 — Shared-junction interlocking
Baseline immutabile: `7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003`. Branch dedicato nuovo, Draft PR collegata a #17, nessun merge/deploy.

1. Riprodurre separatamente lo stato C13 disallineato all'avvicinamento (in particolare prima dell'ingresso nella protezione [0,30]); fotografare `getSafety`, `traceJourney`, guard, velocità e l'esito delle richieste protette panel/device, senza eludere il comando originale.
2. Se il comando è accettato mentre un convoglio sopraggiunge nella zona di arresto, trattarlo come **bug di sicurezza**, con test rosso pre-fix e correzione strettamente mirata dei contratti di nodo condiviso/approach-lock. Verificare contestualmente l'inset di protezione che lascia C13 bloccato dopo un arresto disallineato: nessuna riduzione dei margini, nessun bypass della guard.
3. Testare WX-A/C13 nei due versi, stati allineati/disallineati/UNKNOWN, consistenze corte, riavvio, recovery protetta, comandi provenienti da entrambe le superfici; preservare l'assenza di falsi lock lontano dal dispositivo. Non alterare geometria, topologia del dataset, motore di movimento, collisioni, scenografia o bootstrap.
4. Consegnare riproduzione prima/dopo, numeri, suite intera Node/JMRI/build/canonico, audit bundle/legacy, report e nuovo checkpoint remoto. Se la diagnosi smentisce il varco, fornire una prova riproducibile e motivare l'eventuale solo problema di recovery. Se una correzione richiede refactor architetturale ampio, **STOP** e nuovo gate.

**R2B non autorizzata:** collisioni simultanee e priorità non devono poggiare su un interlocking con un possibile falso `unlocked` nel nodo WX-A/C13. R2A-F1 non autorizza attivazione V06 nell'applicazione.
