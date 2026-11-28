# L02-E — banco prova browser Big Boy

27 novembre 2026. Base `239fbfc11dc4e601b977297e460979ed64610e35`, branch
`codex/rolling-stock-l02-big-boy`. Ripresa richiesta dall'utente; una sola
sottofase. Nessuna aggiunta al catalogo operativo, merge o pubblicazione Pages.

## Implementazione e limiti

- Banco isolato `scripts/big-boy/lab.html`: GLB L02-D verificato tramite SHA-256,
  sette telai articolati, 19 assi che ruotano dall'odometro firmato, bielle di
  accoppiamento separate per indice senza creare o perdere triangoli del modello.
  3.642 triangoli del gruppo posteriore e 3.766 dell'anteriore sono trasferiti
  dalle parti fisse alle parti mobili. La fase iniziale del sorgente è conservata;
  il centro di manovella è ricavato dalla banda geometrica misurata delle bielle.
- Staffe, perni, guaina e linguetta esportati dalle stesse funzioni Blender di
  L02-D; staffe solidali alle casse, membri del timone orientati sui due perni.
- Il risolutore di posa è condiviso con la scansione L02-D. Nessuna modifica
  al GLB storico. Il confronto dell'intera scansione rileva soltanto due differenze
  numeriche da 1,67e-16, entro la tolleranza 1e-12 (`pose-regression.json`).
- Journey e routing reali dei due scenari, con scambi fissi S0. Inviluppo longitudinale
  conservativo di 260 mm (128 avanti, 132 indietro); copertura continua verificata
  sulle tratte attraversate. Queste sono **occupazioni del banco**, non prenotazioni
  inserite nel motore operativo. Nessun altro treno è presente nel banco.
- **NOT VERIFIED:** biella motrice, distribuzione, quartatura e giochi del biellismo
  durante la rotazione. Biella motrice e distribuzione restano statiche e l'interfaccia
  lo dichiara. Le bielle di accoppiamento non compensano ancora i giochi laterali
  individuali degli assi. Non è una qualifica meccanica dell'intero biellismo.
- **NOT VERIFIED:** contatto tridimensionale continuo, collisioni con altri rotabili,
  agganci e Train Management della Big Boy. Il caso sintetico R150 resta FAIL da L02-D.
  Il banco non abilita la Big Boy nel simulatore e non sostituisce le sue protezioni.

## Prove eseguite

| Gate | Esito | Prova |
| --- | --- | --- |
| Suite applicativa | PASS 584/584 | `node-tests.txt` |
| Cinematica e marcia isolata | PASS 8/8 | `rig-tests.txt` |
| JMRI | PASS 9/9 | `jmri-tests.txt` |
| Build applicazione | PASS | `build.txt` |
| Chrome Legacy e V06 | PASS | `browser.json` |
| Pose L02-D conservate | PASS entro 1e-12 | `pose-regression.json` |

Browser Chrome 158.0.8127.89: per scenario 720 passi da 1/60 s a 35 mm/s,
420 mm avanti, STOP per 60 passi, 420 mm indietro con ritorno entro 1e-7 mm.
Tutti i 19 assi cambiano fase; le bielle cambiano posizione; STOP conserva posa,
odometro e animazione. Nessun errore JavaScript. Margine minimo del timone circa
0,683 mm. I test Node controllano anche NaN/Infinity, ingressi fuori intervallo e
rifiuto atomico del movimento quando il percorso non è estendibile.

Screenshot reali ispezionati: `legacy-initial.png`, `legacy-crank.png`,
`v06-initial.png`, `v06-crank.png`, `mobile.png`. Il banco visualizza gli assi del
percorso con linee diagnostiche, non ricostruisce le rotaie. La vista mobile mostra
l'intero modello; orbit e zoom restano disponibili.

I tempi p50/p95 in `browser.json` misurano CPU per passo e invio del rendering
nella sequenza automatizzata, **non** FPS interattivi né tempo GPU completo.
L'applicazione resta byte-identica nel sorgente e produce lo stesso identificatore
cache della baseline: `df7e2f0981f1`. Non è dimostrata la prestazione della Big Boy
inserita nello scenario completo.

## Invarianti e sicurezza

Nessuna modifica in `src/`, `app.js`, `assets/`, UI operativa, dataset, geometria
canonica, reti, scambi, Auth, SQL, dipendenze o workflow. Le 150 mesh ferroviarie
rimangono nel codice invariato. Solo documenti e script del banco sono modificati.
Nessun segreto, endpoint esterno o dipendenza aggiunti. Ingressi numerici finiti e
scenario ammesso verificati; risorse geometriche, materiali, texture, controlli e
listener di resize rilasciati alla chiusura. Non è l'audit sicurezza 5E.

## Riproduzione

Dalla radice del repository, con Node 22+, dipendenze del lockfile, Python con
Playwright e Chrome. Blender serve solo a rigenerare `drawgear.json`.

```sh
npm ci
python3 scripts/big-boy/extract-coupling-rods.py
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/export-drawgear.py
node --test scripts/big-boy/kinematics.test.mjs scripts/big-boy/motion.test.mjs
node scripts/big-boy/sweep.mjs docs/_active/rolling-stock/evidence/L02-D/prototype /tmp/big-boy-sweep.json
npm test
npm run build
./node_modules/.bin/esbuild scripts/big-boy/lab.mjs --bundle --format=esm --outfile=dist/big-boy-lab.js
python3 -m http.server 8027 --bind 127.0.0.1
# In un secondo terminale:
python3 scripts/big-boy/browser-test.py
```

Aprire `http://127.0.0.1:8027/scripts/big-boy/lab.html`. Le dipendenze del banco
non entrano nel bundle applicativo o nel manifest della cache.

**Esito:** PASS per L02-E, banco e prima animazione; integrazione completa della
Big Boy ancora incompleta. Proposta L02-F: completare biella motrice/distribuzione,
verificare quartatura, giochi laterali e interferenze in rotazione prima del catalogo.
STOP per approvazione Regia. Il checkpoint remoto è verificato nella consegna
con SHA reale, senza introdurre un riferimento circolare nel commit.
