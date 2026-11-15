# Follow Train con le frecce

Intervento unico sul branch `codex/follow-train-arrows`, dalla base `0de0b2df`. Prossima azione: verifica Regia prima di merge e deploy.

Le frecce ruotano lo sguardo attorno alla locomotiva e ne regolano l’elevazione fra circa 13° e 73°. La vista usa un raggio nominale di circa 431 mm e conserva la correzione di sicurezza sopra terreno ed edifici. Gli offset sono relativi alla direzione del treno. Il rilascio arresta la regolazione e il rientro in Follow ripristina la vista standard. Un gesto OrbitControls torna alla camera libera.

## Verifiche del 15 novembre 2026

- Baseline Node 573/573. Candidato Node 574/574, JMRI 9/9 e build di produzione PASS. Eseguiti gli script del package con pnpm. Il test in `tests/navigation.test.js` confronta 20 e 120 Hz.
- Chrome locale con WebGL software, V06 e Legacy PASS. Provate tutte le frecce con pressione e rilascio, cambio preset, controllo velocità, selettore, dialogo e Space. Il test misura lo scarto orizzontale tra bersaglio e locomotiva durante marcia, curva, STOP, retromarcia e cambio treno, con soglia di 1 mm. Provata anche la flotta vuota. Nessun errore JavaScript rilevato.
- [Video V06 della BR 01 in marcia](br01-follow.webm), riproduzione verificata fino alla fine in Chrome, 941 × 515, 3,93 secondi. Registra il canvas mentre Playwright tiene premute le quattro frecce.
- Per ripetere: compilare il bundle, servire il repository su `127.0.0.1:8394` ed eseguire `node scripts/verify-follow-arrows.cjs` con Playwright e Chrome disponibili (`CHROME_BIN` opzionale). Il test sostituisce l’accesso solo nella pagina locale e usa la diagnostica del simulatore per percorrere la curva.
- Diff applicativo limitato a navigazione, tastiera, collegamento in app e guida. Nessuna modifica a geometrie, mesh, treni, scambi, protezioni, backend o dipendenze. I nuovi listener sono rimossi alla dismissione del gestore di tastiera.
