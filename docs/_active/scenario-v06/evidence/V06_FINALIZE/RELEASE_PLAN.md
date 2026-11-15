# Unico piano di release — da eseguire solo dopo il Quality Gate

Verifica del 15 novembre 2026, Europe/Rome. Nessun merge, retarget o deploy
eseguito in V06-FINALIZE. La stessa Draft PR #21 resta sulla base R2B2.

## Grafo e prerequisiti effettivi

Main remoto: `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, merge della #8.
Include l'hotfix HUD/camera mobile `217629c`; è antenato della candidata V06.
Al checkpoint iniziale `0d54ce0`, differenza main…V06: **0 indietro / 16 avanti**.
Il commit di questa consegna si aggiunge alla stessa catena, senza riscriverla.

| PR | Commit da includere, in ordine | Contenuto |
| --- | --- | --- |
| #10 | `ffba29f` | Audit/documentazione V06 |
| #11 | `c527134` | Contratto R0 |
| #12 | `65ec167` | Continuità R01 |
| #13 | `7118c99` | Dataset geometrico R02 |
| #14 | `6a97674` | Dataset operativo R1A e factory |
| #15 | `b8f4f3c` | Registro controller e adattamento consumer |
| #16 | `b49320c` | Readiness/sessione, laboratorio isolato |
| #17 | `7bf4f1e` | Circolazione R2A, laboratorio |
| #18 | `9aa9656` | **Fix F1 next-switch/guard ai giunti condivisi** |
| #19 | `ab9c9ba` | Safety due treni, laboratorio |
| #20 | `f592a12` | Safety tre treni, laboratorio |
| #21 | `7d235e1`, `301dceb`, `ea20cc2`, `642f8eb`, `0d54ce0` | Recupero originali e integrazione browser |
| #21 | commit finale V06-FINALIZE, SHA nella ricevuta PR | Derivati, Low, bande selezione, prove e piano |

Tutti sono già antenati della stessa HEAD. Nessun cherry-pick o merge delle
singole PR è necessario. Nessun conflitto con main osservato: ancestry e
`git merge-tree --write-tree origin/main HEAD` verificati senza creare un merge.
La UI V2.1, CSS, Auth e workflow risultano identici a main nei percorsi protetti;
il core mantiene F1 già presente nella catena. Non escludere F1 dal rilascio.

## Sequenza minima, una sola integrazione in main

1. Ottenere il Quality Gate conclusivo Regia e **l'autorizzazione finale
   dell'utente a merge e pubblicazione Pages**. Un merge in main avvia già il
   deploy: non considerarli due azioni indipendenti.
2. Fare fetch di main e del branch autorizzato. Verificare SHA finale uguale
   alla ricevuta, main ancora `f33377c…`, ancestry, working tree pulito e regole
   GitHub applicabili. Se main cambia, fermare l'esecuzione di questo piano e
   riesaminare il nuovo diff/conflitto prima di integrare; niente force/rebase.
3. **Retarget della stessa PR #21 a `main`**, senza modificare la HEAD. La diff
   di review deve includere l'intera catena sopra. Portarla da Draft a Ready,
   rispettare review/check obbligatori e ricontrollare gli SHA.
4. Eseguire **un solo GitHub merge commit** della #21 in main, con controllo
   della HEAD approvata. `allow_merge_commit:true` verificato via API. Conservare
   la storia e l'antenato UI hotfix; nessuno squash/rebase o merge in R2B2.
5. Attendere il workflow esistente **Deploy SerieN to GitHub Pages** avviato dal
   push a main: canonico/JMRI → Node → build → Prepare site → upload → deploy.
   Verificare run e SHA del merge pubblicato. Non avviare workflow extra.
6. Verifica pubblica su `https://epivic-lab.github.io/SerieN/`: Legacy default,
   assenza richieste V06 al caricamento Legacy, UI/HUD desktop/mobile, Menu →
   Scenario → V06, movimento manuale, sette controller e WX protetti, ritorno
   confermato a Legacy; controllare console e HEAD/hash dei derivati serviti.
   Questo controllo live resta da fare dopo l'autorizzazione, non è attestato ora.

Le PR #10–#20 non vanno pubblicate separatamente: dopo il merge si può chiudere
la loro revisione amministrativa come inclusa dalla #21, senza altri merge.
Nessuna modifica di quelle PR è parte della presente consegna.

## Esposizione, errori e rollback

Legacy è il default anche dopo reload. V06 è opt-in; inizia in Auto Low,
High resta disponibile e l'adattamento automatico esistente rimane attivo.
Gli asset V06 sono richiesti solo entrando in V06. Prima del runtime sono
verificati dataset, inventari pin e hash/dimensioni dei moduli ottimizzati.
Errore di rete/integrità: nessuna scena parziale, Retry e Return to Legacy.

Rollback operativo immediato: Menu → Scenario → Legacy → conferma della perdita
dei dati di sessione → reload con rete, flotta e controller Legacy nuovi.
Rollback della release, se necessario e autorizzato: **revert del solo merge
commit** della #21 con parent 1 (`git revert -m 1 <MERGE_SHA>`) tramite il normale
percorso protetto di main; il workflow Pages ripubblica la versione precedente,
incluso l'hotfix UI V2.1. Nessun reset/force-push. Non eseguito in questa fase.

La ricetta Prepare site è stata eseguita solo localmente: dimensioni, hash e
chiusura degli asset sono in `package.json`. Il pacchetto rimane sotto 1 GiB;
gli originali restano conservati, ma il runtime scarica i derivati verificati.
