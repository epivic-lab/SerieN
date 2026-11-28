# L02-F — Big Boy: quartatura e biellismo nominale

27 novembre 2026. PASS tecnico campionato, in attesa di audit indipendente Regia.
Base `6a9f319e3418da1235b753086fd71b9edbe01d22`, branch autorizzato
`codex/rolling-stock-l02-big-boy`. Ripresa e correzione autorizzate dai successivi
«riprendi l'attività» / «continua» della Regia. Nessuna integrazione nel catalogo,
merge o pubblicazione del sito in questa sottofase.

## Cambiamenti

Il GLB storico L02-D è immutato, SHA-256
`14622eac1e9dc20e58411ceea59cf7ea053724936c637dbd2413596a5ba331e1`.
La sua quartatura fallisce su tutti gli otto assi motori: massimo sfalsamento
0,078934°, anziché 90°. `quartering.json` e il relativo diagramma conservano
questa diagnosi negativa; non descrivono il candidato corretto.

Il candidato separa per indici le ruote del lato positivo e applica una rotazione
fissa di 90°, preservando i 50.653 triangoli degli assi motori. Il rilievo diretto
dei perni su tre soglie assiali calibra la manovella. L'audit indipendente del
candidato misura errore massimo dalla quartatura nominale 0,078934° e discrepanza
massima di spostamento 0,009342 mm (limite 0,03), rispetto a 0,242721 mm in L02-E.
Anche il browser misura i vertici effettivamente referenziati dalle mesh renderizzate.

Quattro meccanismi comprendono accoppiamento, biella motrice, testa a croce,
contro-manovella, biella eccentrica, glifo/levette e stelo valvola. Il solver chiude
le lunghezze rigide senza memoria di stato; avanzamento e inversione dipendono
dall'odometro firmato. Si tratta di una **distribuzione visiva nominale**:
le quote sono scelte per il simulatore, non ricavate da disegni ALCO. Posizione
nel glifo fissa; fasatura del vapore, regolazione del cutoff e carichi non simulati.

Le vecchie parti statiche esterne del biellismo sono sostituite per isole connesse:
43.297 triangoli originali esclusi dal candidato runtime, senza riscrivere il GLB.
Due supporti del telaio anteriore, 416 vertici, ricevono un restringimento laterale
x × 0,35 per liberare i perni. Il manifest registra ogni indice e modifica.
Le nuove parti sono istanziate (48 barre, 88 occhielli forati, 72 perni/steli).
Totale browser 232.707 triangoli, 97 draw call. Timone e staffe L02-D conservati.

## Verifiche e prove

| Verifica | Esito | Prova |
| --- | --- | --- |
| Quartatura GLB storico | FAIL atteso, fixture negativa | `quartering.json`, `quartering-gate.txt` |
| Quartatura candidato | PASS, 8 assi | `candidate-quartering.json`, `candidate-gate.txt` |
| Metodo di misura e regressioni | PASS 8/8 | `audit-method-tests.txt` |
| Cinematica, distribuzione e giochi | PASS 11/11 | `rig-tests.txt` |
| Interferenze campionate | PASS 648/648 | `mechanism-clearance.json` |
| Chrome Legacy/V06 | PASS, 420 mm avanti/ritorno, STOP, 19 assi, 4 meccanismi, zero errori | `browser.json` |
| Applicazione | PASS 584/584 | `node-tests.txt` |
| JMRI | PASS 9/9 | `jmri-tests.txt` |
| Build | PASS, cache invariata `df7e2f0981f1` | `build.txt` |

Il solver è verificato su 1.441 fasi, con continuità, periodicità, inversione e
rifiuto di geometrie irraggiungibili. Il gioco assiale è provato sui veri occhielli
renderizzati a −0,45/0/+0,45 mm, ogni 15°: sovrapposizione con i perni >0,08 mm.
Questo controlla l'impegno geometrico, non resistenza o ritegno sotto carico.

Blender esamina i triangoli esportati dalle stesse istanze renderizzate, contro
corpo residuo e tutti i 19 assi rotanti, oltre alle coppie di parti non collegate.
Nove pose: rettilineo, R315/R282/R249 nei due sensi e massima articolazione reale
Legacy/V06; 72 fasi per posa, passo 5°. Zero riscontri non consentiti; residuo di
chiusura massimo 8,28e-11 mm. Esclusioni esplicite: attacchi al corpo e ingressi
nei cilindri dal test corpo; coppie con giunto nominato comune dal test reciproco;
perni/giunti e testa a croce dal test ruote. Non è un contatto fisico continuo;
le esclusioni non sono certificazione dimensionale dei cuscinetti.

Screenshot `legacy-initial.png`, `legacy-crank.png`, `v06-initial.png`,
`v06-crank.png`, `mobile.png`: viste reali del banco isolato, desktop e mobile
ispezionati. Il diagramma `quartering.png` è invece una visualizzazione delle
misure storiche. Tempi CPU step+invio render in Chrome headless: p50/p95
Legacy 0.2/0.7 ms, V06 0.1/0.2 ms. Non sono FPS o tempi GPU dell'applicazione completa.

## Invarianti, sicurezza e limiti

Diff confinato a `scripts/big-boy/`, prove L02-F, PROGRESS e STATUS. Nessuna
modifica a src, app, tracciato canonico, 150 mesh, otto scambi, UI operativa,
camera/HUD, scenografia, fisica di produzione, Auth, cloud, dipendenze o deploy.
GLB e prove storiche invariati. Nessun segreto, eval, HTML dinamico o servizio
esterno aggiunto. Input cinematici non finiti rifiutati; risorse GPU del banco
rilasciate. Il checkout originale e le sue modifiche preesistenti sono preservati.

NOT VERIFIED: fedeltà dimensionale ALCO, collisione continua tra campioni,
contatto completo ruota/scambio, carichi, marcia multi-treno e prestazioni del
simulatore completo. R150 conserva il precedente FAIL. L'integrazione operativa
Big Boy non è conclusa; serve L02-G, autorizzata separatamente.

## Riproduzione dalla radice del worktree

```sh
python3 scripts/big-boy/audit-quartering.py # exit 2 atteso sul sorgente storico
python3 scripts/big-boy/prepare-quartering.py
python3 scripts/big-boy/audit-quartering-candidate.py
python3 scripts/big-boy/prepare-valve-gear.py
python3 -m unittest discover -s scripts/big-boy -p 'quartering_test.py'
node --test scripts/big-boy/*.test.mjs
node scripts/big-boy/export-mechanism-poses.mjs /tmp/bigboy-mechanism-poses.json 5
blender -b -t 4 --python-exit-code 1 --python scripts/big-boy/inspect-mechanism.py -- /tmp/bigboy-mechanism-poses.json /tmp/bigboy-mechanism-clearance.json
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
./node_modules/.bin/esbuild scripts/big-boy/lab.mjs --bundle --format=esm --outfile=dist/big-boy-lab.js
python3 -m http.server 8027 --bind 127.0.0.1
# In altro terminale, Python con Playwright e Chrome installati:
python3 scripts/big-boy/browser-test.py
python3 scripts/big-boy/capture-quartering.py
```

Prossima azione: audit Regia e approvazione **L02-G — integrazione nel catalogo e
verifiche operative Big Boy**, senza implicita autorizzazione a merge/deploy.
