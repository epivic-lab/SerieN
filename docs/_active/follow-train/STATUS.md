# Follow Train con le frecce

## Follow con distanza regolabile e quota libera

In Follow, A avvicina la camera e Z la allontana. La distanza varia da 30 a 3600 mm dal bersaglio e si ripristina rientrando in Follow. La freccia giù permette di scendere fino alla verticale sotto il treno. Il terreno e gli edifici possono attraversare l’inquadratura. Guida aggiornata in `index.html`.

La pubblicazione comprende anche la correzione dello scatto in curva descritta sotto. Test Node 576/576, JMRI 9/9 e build PASS. Chrome locale PASS su V06 e Legacy per A/Z, rilascio, discesa sotto quota zero, rientro in Follow, marcia, retromarcia, cambio treno e controlli UI.

## Correzione dello scatto in curva

Base pubblicata `4279b8bc`, branch `codex/follow-curve`. La camera ricava la direzione dai punti 16 mm prima e dopo il centro della locomotiva lungo il percorso già impegnato. Il centro e gli offset manuali sono aggiornati nello stesso fotogramma. La lettura avviene solo in Follow.

- V06-P006, posizioni da 20 a 227 mm con passo di 1 mm. Picco angolare prima della correzione 2,747° per passo, dopo 0,260° sia in avanti sia in retromarcia. Il test in `tests/navigation.test.js` mantiene la soglia a 0,3° e verifica le coordinate del centro a ogni passo.
- Chrome locale con WebGL software, V06-P006 da 90 a 122 mm. Le posizioni del tender coincidono nei 33 campioni acquisiti in Station e Follow. Picco della camera Follow di 0,250° per passo. [Filmato della curva](br01-curva.webm) di 4,75 s, riproduzione verificata fino alla fine.
- Regressione browser V06 e Legacy PASS per frecce, selettori, dialoghi, STOP, inversione, cambio e rimozione del treno.
- Node 575/575, JMRI 9/9 e build PASS. Prossima azione: verifica Regia prima del rilascio.

## Primo rilascio

Intervento unico sul branch `codex/follow-train-arrows`, dalla base `0de0b2df`. Prossima azione: verifica Regia prima di merge e deploy.

Le frecce ruotano lo sguardo attorno alla locomotiva e ne regolano l’elevazione fra circa 13° e 73°. La vista usa un raggio nominale di circa 431 mm e conserva la correzione di sicurezza sopra terreno ed edifici. Gli offset sono relativi alla direzione del treno. Il rilascio arresta la regolazione e il rientro in Follow ripristina la vista standard. Un gesto OrbitControls torna alla camera libera.

## Verifiche del primo rilascio

- Baseline Node 573/573. Candidato Node 574/574, JMRI 9/9 e build di produzione PASS. Eseguiti gli script del package con pnpm. Il test in `tests/navigation.test.js` confronta 20 e 120 Hz.
- Chrome locale con WebGL software, V06 e Legacy PASS. Provate tutte le frecce con pressione e rilascio, cambio preset, controllo velocità, selettore, dialogo e Space. Il test misura lo scarto orizzontale tra bersaglio e locomotiva durante marcia, curva, STOP, retromarcia e cambio treno, con soglia di 1 mm. Provata anche la flotta vuota. Nessun errore JavaScript rilevato.
- [Video V06 della BR 01 in marcia](br01-follow.webm), riproduzione verificata fino alla fine in Chrome, 941 × 515, 3,93 secondi. Registra il canvas mentre Playwright tiene premute le quattro frecce.
- Per ripetere: compilare il bundle, servire il repository su `127.0.0.1:8394` ed eseguire `node scripts/verify-follow-arrows.cjs` con Playwright e Chrome disponibili (`CHROME_BIN` opzionale). Il test sostituisce l’accesso solo nella pagina locale e usa la diagnostica del simulatore per percorrere la curva.
- Diff applicativo limitato a navigazione, tastiera, collegamento in app e guida. Nessuna modifica a geometrie, mesh, treni, scambi, protezioni, backend o dipendenze. I nuovi listener sono rimossi alla dismissione del gestore di tastiera.
