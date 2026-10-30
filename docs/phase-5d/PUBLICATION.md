# Integrazione e pubblicazione 5D su main

30 ottobre 2026. Autorizzazione esplicita dell’utente: **«ok, pubblica tutto su main»**. Supera il precedente vincolo di consegna sul solo branch. Non autorizza la 5E o interventi su altri repository.

- Base `main`: `f582b1226ccf8a592970b0304d0010e1cc43aa57`.
- Branch 5D integrato: `592dac58eb9623aa7ca2264e97636a8e84692abb`, con tutta la storia 5A–5D.
- Merge locale senza conflitti; **tutti i 26 percorsi aggiunti sul remoto conservano gli stessi blob Git**, inclusa asset-library. Nessun reset o force push.
- App, moduli, asset runtime, dipendenze, pagina, stili e workflow coincidono con il branch validato. Non sono stati aggiunti i modelli della libreria non utilizzata al sito pubblicato.
- Sul contenuto integrato sono rieseguiti: rigenerazione del layout canonico senza differenze, **131 Node**, **9 Python**, build: PASS. Prove in `publication/`.
- Bundle atteso: SHA-256 **`147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`**, identico alla build finale verificata della 5D.

Il push di questo merge su `main` attiva il workflow già esistente `Deploy SerieN to GitHub Pages`; nessuna modifica al workflow. Sito: **https://epivic-lab.github.io/SerieN/**.

La pubblicazione effettiva va verificata confrontando il bundle servito da `/SerieN/dist/game.js` con l’hash atteso, oltre ai controlli dello stato del sito. L’API dei workflow non è accessibile da questo ambiente; il solo push non viene considerato prova di deployment completato. L’esito della verifica live è riportato nella consegna della pubblicazione.

Rollback, se necessario: revert del merge su working tree pulito e nuova esecuzione delle verifiche, senza cancellare le storie o sovrascrivere contributi successivi. Il branch `performance/phase-5d` e il backup Git conservano il checkpoint originale.
