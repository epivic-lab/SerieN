# L02-G — Big Boy nel catalogo operativo

**PASS tecnico, checkpoint destinato all’audit indipendente Regia.**

27 novembre 2026. Base `6358f4ab35ef62bf05d575ffbadf73d0427b3809`, branch
`codex/rolling-stock-l02-big-boy`. Autorizzazione Regia: «si» alla proposta L02-G,
poi «riprendi». Lavoro confinato all'integrazione Big Boy, senza merge o deploy.

## Risultato e utilizzo

Nel menu **Train Management → On the layout → Add Big Boy + tender** si carica
l'asset e si cerca una posizione libera per l'intera unità. La voce compare anche
nel catalogo, nella vista laterale e nei progetti. Avanti, STOP, inversione, luci,
selezione e rimozione usano i comandi esistenti. Il modello è caricato soltanto
alla prima richiesta: non aggiunge 28,2 MB al caricamento iniziale della sessione.

Motrice e tender formano un'unità fissa: 260 mm protetti, 128 davanti e 132 dietro
l'origine. Il tender non è sganciabile e gli agganci esterni sono rifiutati senza
modificare la composizione. Le ruote dei 19 assi, i quattro biellismi, i sette
corpi articolati, le staffe e il timone seguono l'odometro e la Journey reali.

La geometria di base è la stessa di L02-F. I quattro moduli cinematici condivisi
sono trasferiti in `src/big-boy/` senza cambiare un byte; il banco li riesporta.
Manifest e rig diventano dati runtime versionati, senza dipendenze dalle prove
in `docs/_active/`. Asset, attribuzione e anteprime sono in
`assets/rolling-stock/big-boy/`. Le anteprime sono render reali, non immagini AI.

## Protezioni e verifiche

La sagoma anticollisione è l'inviluppo convesso dei rettangoli dei sette corpi,
ricavati dai vertici effettivamente referenziati, con margine longitudinale di
1 mm e laterale di 2,5 mm. Comprende le posizioni articolate, i giochi e il
biellismo; può arrestare conservativamente prima del contatto reale. La sagoma
entra nelle verifiche esistenti di spawn, conflitto e movimento campionato.
Gli altri rotabili mantengono il percorso di calcolo precedente. Integratore,
regole della guardia, instradamento e rete non sono modificati.

- `big-boy-tests.txt`: 5 prove dedicate, inclusi 19 assi, chiusura del biellismo,
  rilascio risorse idempotente, vincolo di composizione fissa, conflitti su entrambe
  le estremità e arresto di due treni in avvicinamento frontale. Su R249, nei due
  sensi e a quattro fasi, ogni vertice renderizzato è dentro la sagoma protetta.
- `browser.json`, `legacy-browser.json`, `v06-browser.json`: inserimento attraverso
  UI, 19 assi animati, inversione, STOP stabile, luci e rimozione BR 01. Giro normale
  con oltre 4.387 mm di avanzamento tra i campioni estremi, su 15 tratti Legacy e
  17 V06. Tentativo di cambiare uno scambio occupato correttamente respinto.
- `lifecycle.json`: caricamento su richiesta, due cicli aggiunta/rimozione,
  memoria GPU residua e tempi CPU di 120 passi a treni fermi per ciclo.
  Dopo entrambe le rimozioni: 239 geometrie e 78 texture, senza crescita.
  CPU p50 1,6–1,7 ms, p95 2,5–2,6 ms. Questi tempi includono aggiornamenti
  diagnostici/UI, non sono FPS o tempi GPU.
- `node-tests.txt`, `rig-tests.txt`, `jmri-tests.txt`, `build.txt`: suite generale,
  cinematica condivisa, JMRI e build. PASS: 588/588 generali, 5/5 dedicati Big Boy (quattro già compresi nella suite),
  11/11 cinematici, 9/9 JMRI e build. Cache applicativa `19cc2d255d35`.
- `catalog-capture.json`, immagini desktop/mobile e `invariants.json`: geometria,
  immagini, hash e perimetro verificato.

Le prove browser usano Chrome locale e una fixture Auth intercettata soltanto
nella pagina di test, con service worker bloccato; Auth e credenziali di produzione
non vengono modificati. L'audio udibile resta NOT VERIFIED: il precedente tentativo
aveva segnalato errori del dispositivo audio. I nuovi log conservano separatamente
eventuali avvisi hardware, senza confonderli con errori JavaScript dell'applicazione.

## Invarianti e limiti

Tracciato canonico, 150 mesh ferroviarie Legacy, controller degli scambi, reti,
scenografia, plancia, camera/HUD e impostazioni di produzione invariati. Nessuna
nuova dipendenza, servizio esterno, credenziale, eval o inserimento HTML dinamico.
Risorse per istanza rilasciate alla rimozione; materiali/texture del template sono
condivisi nella cache di sessione. Lo SHA del GLB runtime è
`14622eac1e9dc20e58411ceea59cf7ea053724936c637dbd2413596a5ba331e1`.

Restano i limiti L02-F: distribuzione visiva nominale, quote non certificate ALCO,
assenza di simulazione del vapore/carichi e collisioni campionate. R150 conserva
il FAIL storico. Le prove operative coprono i circuiti normali; non certificano
ogni percorso deviato, tutte le combinazioni con quattro treni o prestazioni su
ogni dispositivo. Agganci esterni non abilitati. Nessun rilascio sul sito pubblico.

## Riproduzione

```sh
npm ci
npm test
node --test tests/big-boy.test.js
node --test scripts/big-boy/*.test.mjs
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
./node_modules/.bin/esbuild scripts/big-boy/capture-catalog.mjs --bundle --format=esm --outfile=dist/big-boy-catalog.js
python3 -m http.server 8027 --bind 127.0.0.1
# In altro terminale, con Playwright e Chrome:
python3 scripts/big-boy/capture-catalog.py
# Dopo rigenerazione immagini/manifest: npm run build
python3 scripts/big-boy/integration-test.py
python3 scripts/big-boy/lifecycle-test.py
```

## Ripristino e prossimo passo

Durante l'interruzione è scomparso il worktree temporaneo `/private/tmp`:
il checkpoint L02-F era al sicuro, L02-G non ancora committata è stata ricostruita
in `work/big-boy-l02` nel repository locale. Le prove di questa consegna sono state
rigenerate lì; i risultati perduti non sono usati come unica evidenza.

Prossima sottofase proposta **L02-H — audit e rilascio controllato**: revisione
Regia, integrazione tramite PR secondo i gate del repository e pubblicazione
solo con autorizzazione esplicita. Questo checkpoint non modifica main o il sito.
