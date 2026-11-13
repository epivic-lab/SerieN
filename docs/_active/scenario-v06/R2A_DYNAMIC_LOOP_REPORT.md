# SERIE N — R2A: Dynamic circulation validation

13 novembre 2026, Europe/Rome. **PASS numerico degli scenari R2A con limite
operativo documentato R2A-ADJ-01; Quality Gate indipendente Regia PENDING.**
Prima dimostrazione Node dei sei giri V06 con il motore esistente. Non è
ammissione del profilo nell'applicazione né certificazione fisica. La correzione
automatica a treno fermo presso C13 adiacente a WX-A resta NON CERTIFICATA.

## Mandato e checkpoint

Baseline esatta `b49320c6be4d9f149bb2c5473858c616925a5f6c`, branch sorgente
`codex/scenario-v06-r1c-session-readiness`, [Draft PR #16](https://github.com/epivic-lab/SerieN/pull/16).
R1C accettata e mandato esclusivo R2A nel
[Quality Gate Regia](https://github.com/epivic-lab/SerieN/pull/16#issuecomment-6857567423).
Consultati AGENTS, PROGRESS, contratti M01/addendum, R0/R01/R02/R1A/R1B/R1C,
matrice consumer e limiti dei terminali. Le autorizzazioni storiche main/deploy
in AGENTS non si applicano a questo mandato.

Ingresso `/workspace/SerieN`, branch `work`, HEAD
`f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, stato pulito, un solo worktree.
Fetch esplicito R1C e confronto con head PR/remoto: SHA richiesto coincidente.
Creato `/workspace/work/SerieN-r2a` sul nuovo branch
`codex/scenario-v06-r2a-dynamic-circulation` direttamente dalla baseline.
Branch R2A remoto inizialmente assente, nessuna PR R2A aperta nella ricerca
prima della consegna. Nessun processo di sviluppo concorrente locale osservato;
non si esclude lavoro esterno non pubblicato. Sorgente R1C e main ricontrollati
prima del push; nessuna modifica ad altri branch, reset o rebase.

Consegna: un commit atomico, push ordinario del solo nuovo branch e Draft PR
**con base R1C**, collegata alla #16. SHA effettivo, URL e confronto local=remote
nella ricevuta finale; nessun hash autoreferenziale anticipato in questo file.

## Laboratorio e confini

| Nuovo file | Responsabilità |
| --- | --- |
| `tools/scenario-v06/dynamic-lab.js` | Ingresso sperimentale Node con singola flotta, gate prima del clock/tick, comandi e snapshot |
| `dynamic-oracle.js` nella stessa cartella | Testimone indipendente: ordine R0 congelato, giunti e polilinee R02 rilette senza importare core o builder |
| `dynamic-validation.js` | Asserzioni numeriche a ogni tick, scenari, frenate e protezioni |
| `run-r2a.js` | Riproduzione/evidenze deterministiche e caso minimo ADJ-01 |
| `audit-r2a.js`, `check-r2a-scope.py` | Integrità dataset, input/bundle, rete legacy e confronto di tutti i blob R1C |
| `tests/v06-r2a.test.js` | 24 nuovi test, positivi e negativi |
| Rapporto, `evidence/R2A/`, PROGRESS e STATUS | Prove, limiti e solo prossimo gate |

La factory R1C resta immutata. Ammissione hash/schema/semantica prima di costruire
la rete; tutti i consumer condividono l'unica rete posseduta dalla sessione.
`Journey` e `routing` sono quelli R1C/core; il laboratorio chiama il vero
`stepRailway` attraverso `FixedClock(1/60)`. Guard, `guardDecision`, routing,
SAT/sweeps e collision prevention restano eseguiti da stepRailway anche con un
solo treno. Nessun motore alternativo o movimento diretto via Journey.move.
`collectRailwayState`, `traceJourney` e `createFleetCommands` sono quelli reali.

UNKNOWN, sessione dismessa, Journey estranei o moto invalido rifiutano l'ingresso
**prima di aggiornare FixedClock e prima di qualsiasi stepRailway**. I test
misurano zero tick, nessuno spawn e nessuna mutazione. Il flag
`runtimeAdmission:false` resta invariato in ogni contesto, risultato e dataset.
La nuova API esiste solo in tools Node con dipendenze `node:fs`/`node:crypto`;
nessun import, flag URL, endpoint o cablaggio nel bootstrap/browser.

In ogni prova sono configurati esplicitamente i sette stati:

```json
{"V06-C07":false,"V06-C12":false,"V06-C13":false,"V06-N07":false,"V06-N14":false,"WX-A":false,"WX-B":false}
```

L'inizializzazione completa precede lo spawn. Successivamente **ogni comando
scambio** usa `session.requestToggle` tramite il confine protetto R1B/R1C;
la safety viene riletta sincronicamente dal comando. Snapshot diagnostici non
concedono permessi. Non sono alterati parametri: scala velocità 1,5, accelerazione
45 mm/s², frenatura 100 mm/s², comando massimo 100; unità numeriche del simulatore,
non fisica certificata di un convoglio in scala.

## Oracolo, traiettorie e criteri numerici

`dynamic-oracle.js` non importa il network operativo, Journey, loopPosition,
routing o generatori. Usa le sequenze di pezzi R0 congelate nell'oracolo R1A,
verifica i giunti da `from_node/to_node` R02 e misura nuovamente ogni polilinea.
Le tre lunghezze sono confrontate anche con i valori pubblicati R01/R02 a sei
decimali, entro 0,000001 mm. Non si prende `mainLoops.length` come expected.
Le misure condividono la fonte geometrica revisionata con il dataset: non sono
una nuova misura fisica indipendente del plastico.

Lock effettivi verificati dai byte e dal checker R1A:

- Oracolo R1A: `56199a3f625fbce25b6e69fcde2357841bc17ccc3c5bfa1f658c7e196132591a`.
- Candidato R02: `99a5019f6ea4b8a99d18dcf6aff4a9b841ea2c49c5bb4eff9edd36825eead460`.
- Dataset V06: `4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7`.

Nota documentale: il vecchio rapporto R1A riporta nella tabella un digest R02
con suffisso errato; il pin eseguibile/oracolo e i byte concordano sul valore
qui sopra. R1A non viene modificato. Il primo pin trascritto dal rapporto è stato
rifiutato, poi corretto contro la fonte eseguibile, senza bypass del controllo.

Per ogni tick: coordinata indipendente = origine + allineamento × odometro;
interpolazione separata sui punti R02, confronto di ogni centro e gancio entro
1e-7 mm, travel incrementale uguale al valore assoluto dello spostamento,
nessun salto euclideo maggiore della strada percorsa. Ogni cambio di arco deve
coincidere con **l'unico** giunto atteso; tutta la history conserva ordine,
continuità metrica e segni ammessi. Mutazioni deliberate di posizione o segno
nel nuovo test fanno fallire il monitor e producono stato/tick riproducibile.
Nessun test storico è stato modificato o indebolito.

La posa segue le corde della polilinea: confronto angolare contro la tangente
indipendente con soglia 0,06 rad, non una tolleranza di giunzione. Massimo
osservato 0,0259843 rad (~1,49°), dovuto al campionamento simmetrico del core
presso i vertici poligonali. Nessuna inversione spontanea di orientamento.

Le traiettorie salvano snapshot iniziali, ogni secondo e a ogni giunto; le
asserzioni vengono eseguite **a ogni tick**, anche nei campioni non salvati.
`trajectories.json` contiene velocità, posizione, travel, odometro, history,
pose/ganci, guard e sette stati scambio; `summary.json` è la lettura compatta.

## Sei scenari indipendenti con locomotiva corta

Locomotiva: corpo **40 × 16 mm**, ganci +22/−22 mm, ingombro longitudinale
44 mm. Spawn R1C: A `V06-P056`, B `V06-P065`, C `V06-P064`,
s=124,0505 mm, finestra 0…248,101 mm; ingombro 102,0505…146,0505.
La history iniziale ha segno −1 su tutti e tre gli archi. `dir=+1` percorre
la sequenza R0 al contrario; `dir=−1` la percorre nel verso R0. Questi segni
non sono etichette arbitrarie di orario/antiorario. Sessione nuova per ogni riga.

Comando 60, velocità di crociera ±90 mm/s dopo 120 tick (2 s). Nessuna
interferenza della guard nei giri allineati. Il giro termina al primo tick
con travel ≥ lunghezza: massimo 1,5 mm/tick, residuo esplicitamente misurato.

| Anello | dir | Giro indipendente mm | Tick giro | Travel mm | Giunti | Residuo mm | Check Next Switch |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | +1 | 3468.164116346 | 2372 | 3468.750 | 16 | 0.585883654 | 36 |
| A | -1 | 3468.164116346 | 2372 | 3468.750 | 16 | 0.585883654 | 35 |
| B | +1 | 3260.781635120 | 2234 | 3261.750 | 15 | 0.968364880 | 30 |
| B | -1 | 3260.781635120 | 2234 | 3261.750 | 15 | 0.968364880 | 29 |
| C | +1 | 2933.790700412 | 2016 | 2934.750 | 19 | 0.959299588 | 25 |
| C | -1 | 2933.790700412 | 2016 | 2934.750 | 19 | 0.959299588 | 23 |

Il ritorno è sullo stesso arco iniziale. L'errore euclideo di ritorno coincide
con il residuo di integrazione riportato, entro 1e-7 mm: nessun salto artificiale
al punto iniziale. L'oracolo chiude a distanza esatta di un giro; la posizione
reale dopo il tick coincide con il punto oracolo a giro+residuo. Massimo errore
centro/gancio nei sei scenari **1,14e-12 mm**; history conservata fino a nove
segmenti. Nessun cambio di topologia o geometria.

100 attraversamenti verificati nei sei giri. Tutti i nove segmenti nascosti
sono realmente percorsi nei due versi: A P010/P022/P023, B P000/P018/P019,
C P026/P028/P029 (prefisso `V06-` in tutti gli ID). Il cambiamento di segno
geometrico fra archi non cambia il segno della velocità Journey.

Copertura dei controller pertinente ai giri: A WX-B; B WX-A/WX-B; C
C07/C12/C13/WX-A. **N07 e N14 non appartengono agli anelli normali** e non si
inventa un transito su di essi per dichiarare sette dispositivi attraversati.
I loro stati sono espliciti; i precedenti test R1A/R1B/R1C dei sette dispositivi
sono rieseguiti dalla regressione, senza diventare nuova certificazione dinamica.

Preview/Next Switch: 178 confronti indipendenti nei sei giri su archi esterni
ai dispositivi, ID e distanza al primo percorso interno dal testimone R02;
preview ciclica e Journey invariato dalle osservazioni. L'adiacenza WX-A/C13
con percorso chiuso è il limite distinto ADJ-01 sotto; non si dichiara coperta
come PASS l'identificazione di ogni device adiacente in tale caso.

## Dinamica, composizione e history

Ogni scenario completa anche la decelerazione controllata da ±90 a zero:
**54 tick, 0,9 s, 39,75 mm**, poi dieci tick a posizione invariata. La legge
semi-implicita di accelerazione/frenatura è confrontata per ogni tick con le
costanti contrattuali, senza importare MOTION come expected.

Un caso con locomotiva+un carro corto verifica separatamente:

| Fase | Tick | Velocità mm/s | Travel mm |
| --- | ---: | ---: | ---: |
| Accelerazione a comando 20 | 40 | +30 | 10,25 |
| Crociera e decelerazione a comando 10 | 79 | +15 | 28,50 |
| STOP reale createFleetCommands | 79 | 0 | 28,50 |
| Ripartenza inversa dopo STOP | 129 | −30 | 38,75 |
| Arresto controllato | 147 | 0 | 43,00 |
| Nuova ripartenza in avanti | 187 | +30 | 53,25 |

STOP mantiene il contratto reale, azzeramento immediato della velocità; il
comando velocità zero dimostra separatamente la frenatura. Inversione solo a
riposo completo sul tratto libero della finestra, mai dentro N07. Reset con
throttle pendente, velocità residua o movimento rifiutato, senza arresto implicito.

Ulteriori **due giri C** con locomotiva e **due carri corti**: corpi 40 × 16,
30 × 14 e 30 × 14 mm; ganci loco 22/22, carri 17/17. Offset originali consistLayout
**0/39/73 mm**, tail 90, front 22, ingombro totale **112 mm** e somma corpi 100 mm.
Finestra iniziale tutta contenuta, estremi fisici s102,0505…214,0505 nel segno
iniziale −1. Altri 38 giunti, compresi corpo e ganci su archi diversi; ganci
corrispondenti coincidenti sul nastro Journey e centri/orientamenti confrontati
con l'oracolo a ogni tick. Ingombri numerici dichiarati, non modelli 3D.
Nessuna carrozza lunga dedotta compatibile.

Il test di riconciliazione estende soltanto la history futura con `ensure`
(core, senza movimento) a +1600 mm, verifica osservazioni read-only, poi
richiede due commutazioni protette C13 a treno lontano. Il comando originale
riduce la history a quella occupata, posizione/travel restano identici; la
successiva marcia ricostruisce la storia ammessa senza history-conflict.
Le inversioni e i giri lunghi verificano anche la conservazione/ricostruzione
dei segmenti dietro e davanti alla composizione.

## Arresti protetti e limite R2A-ADJ-01

Due prove con locomotiva+un carro, senza superamento del giunto rifiutato:

| Caso | Intervento primo tick | Tick fermo | Travel mm | Distanza residua gancio→giunto mm | Safety scambio fermo |
| --- | ---: | ---: | ---: | ---: | --- |
| C dir+1, C13=true | 836 | 889 | 1203 | 1,753263435 | occupied, comando rifiutato |
| C dir−1, C07=true | 326 | 379 | 438 | 31,233370211 | unlocked, correzione protetta ammessa |

Il limite è misurato dalla preview completa iniziale e dalla posizione del
**gancio di testa effettivo**, non soltanto dalla distanza restituita dalla guard.
Ogni tick resta prima del giunto; trenta tick fermi non producono creep.
La correzione non avvia automaticamente la locomotiva; serve un nuovo comando.

**R2A-ADJ-01, limite del contratto fra osservatore e protezione operativa presso
unità adiacenti, non difetto della geometria.** Riproduzione minima:

```sh
node tools/scenario-v06/run-r2a.js --adjacent-stop
```

Stati tutti false tranne C13 true tramite comando protetto, partenza C/P064
s 124,0505/sign−1, dir+1, loco 40/car 30, comando 60, clock 1/60. Preview iniziale
misaligned a 1226,753263435 mm; ultimo arco P060 s310,126→0. Encounters contiene
WX-A ma non aggiunge C13 alla bocca condivisa, perché la selezione del sito e
la deduplicazione di traceJourney conservano il WX già incontrato. La guard
calcola `protectionInset:0`, invece di un arretramento di 30 mm per C13.
Al tick 889 la loco è P060 s 23,753263435, gancio anteriore s 1,753263435;
la composizione occupa P060 [1,753263435;79,753263435]. Interseca quindi la
protezione esterna C13 [0;30] e il confine di comando rifiuta entrambi gli
origin come occupied. Non c'è attraversamento del percorso disallineato.

Si registra la discrepanza rispetto all'intenzione commentata nella guard di
lasciare gli aghi operabili dopo l'arresto. **Non si dichiara risolto il difetto
di identificazione/arretramento per unità adiacenti e non si certifica recovery
automatica.** La sicurezza del giunto e il lock restano integri; non è emersa
una violazione di transito o un throw occupato che imponesse una correzione
sostanziale del core per completare i soli giri autorizzati.

Il laboratorio prima prova e registra il rifiuto, poi usa STOP, inversione a
riposo e arretramento reale tramite stepRailway fino alla liberazione, frenata,
nuovo arresto e ripristino direzione. Solo a safety unlocked richiede di nuovo
la correzione, ammessa dal confine originale; nessun override. Questo è un
testimone numerico di recovery manuale sul loop, non un nuovo algoritmo.
Core, traceJourney, guard e margini non sono stati modificati. Regia deve
classificare ADJ-01 prima di autorizzare una fase che presuma correzione diretta
in tale punto; eventuale fix richiede mandato separato.

## Protezioni, negativi e ritorno legacy

In marcia reale sui giri C/A sono catturati **10 stati distinti**: approaching
ed occupied per C07/C12/C13/WX-A/WX-B. Su ciascuno panel e subito device ricevono
rifiuto dalla safety fresca, senza cambiare gli stati. Entrambi i WX mantengono
protezione dell'intera unità originale, comprese le strade inattive. Nessuna
collision prevention viene sostituita, anche se non si certificano due treni.

| Negativo / contratto | Prova effettiva |
| --- | --- |
| UNKNOWN e configurazione incompleta/non booleana | Zero tick/spawn; sette stati null rimangono atomici; guardDecision UNKNOWN dà delta/velocità zero |
| Profilo omesso, ID/edge legacy e Journey di altra sessione V06 o legacy | Rifiuto prima dei tick, safety/throw chiusi; nessun trasferimento di riferimenti |
| Misalignment davanti al convoglio | Frenata, velocità zero, distanza positiva e nessun giunto vietato; ADJ-01 separato |
| Occupazione/avvicinamento | Dieci condizioni dinamiche, due superfici consecutive ciascuna; nessun throw |
| Destinazione/fine percorso irraggiungibile | N14=true sul normale giro C resta ciclo senza P051/N16; nessun percorso inventato. Spawn N16/N07/scalo/triangolo/quarto rifiutato. Non è un test di arrivo/frenata al terminale |
| Limiti moto | API reale clampa −1→0 e101→100; NaN/Infinity/undefined rifiutati; speed101/requested−1/velocity151/dir0 iniettati nel negativo negano tick e throw |
| Composizione troppo lunga | Rifiuto per uscita dalla finestra, senza estendere la storia per farla entrare |
| Reset/reverse durante moto | Rifiuto anche con throttle pendente o velocità residua dopo comando zero; consentiti soltanto a riposo completo |
| Legacy→V06→Legacy | Nuova marcia legacy reale, arresto, replacement verso V06 inizialmente UNKNOWN e nuovo legacy8 controller false; cache/timer/risorse vecchie revocate |
| V06 dinamica→legacy | Dopo moto/arresto completo nessuna flotta, rete/history/reservation ereditata; vecchio tick/throw dismesso rifiutato |

Il test di ritorno legacy verifica anche un timer non scattato e cache vuota.
La regressione completa esegue gli ulteriori contratti di reset/ownership/
prenotazioni/disposal già R1C. Nessun test di terminale N16 o manovra triangolo
viene promosso a PASS di circolazione.

## Quality gate eseguito, integrità e sicurezza

| Controllo | Risultato |
| --- | --- |
| Baseline prima del codice | 371 Node,9 JMRI,build PASS |
| Suite R2A | **24/24 PASS**, zero skip/cancelled |
| Suite completa finale | **395/395 PASS =371 precedenti+24 R2A** |
| JMRI | **9/9 PASS** |
| Build | PASS, bundle identico R1C |
| Rigenerazione canonico | PASS; quattro artefatti canonici senza diff |
| Dataset V06 | Hash/schema/semantica R1A PASS; 79 archi/74 nodi/7 controller/3 terminali invariati |
| Preservazione | **4186 blob protetti R1C identici**, solo PROGRESS/STATUS modificati fra i file preesistenti |
| Bundle | 1.095.990 byte, SHA256 `9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66`;85 input,zero V06/laboratorio |
| Rete legacy serializzata | 533.232 byte, SHA256 `ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413`, invariata prima/dopo |
| Dipendenze/runtime | Node24.19.0,Python3.12; dipendenze del lock riusate, nessuna modifica package/lock |

`evidence/R2A/README.md` collega log e comandi. Errori di costruzione conservati:
aspettativa tail 95/ingombro 117 corretta a 90/112 da ganci dichiarati; aspettativa
non prescritta di C13 sempre unlocked sostituita con evidenza ADJ-01,
rifiuto obbligatorio e arretramento protetto. Nessuna asserzione di non
superamento del giunto o di lock occupato indebolita. Un primo run regressione
fallisce per import relativo esplicito di Three.js dopo lo spostamento delle
dipendenze fuori worktree: ripristinata la cartella locale dal medesimo lock e
rieseguita l'intera suite, senza modificare test o sorgenti. Log conservato.

Nessun Railway Core/app/src preesistente modificato; UI V2.1,HUD,minimappe,
renderer,asset3D,geometrie V06/canonico,backend/Supabase/Auth,deps/workflow
byte-identici. Nessuna nuova richiesta di rete applicativa, credenziale,
persistenza o aggiramento di guard/routing/collisioni. Il controllo di scope
verifica anche l'intero insieme dei nuovi file consentiti.

## Limiti e proposta del Quality Gate R2B

**NOT VERIFIED:** visuale/browser V06, nuova prova browser legacy, sagome fisiche,
contatto ruota/rotaia, clearance tunnel/piattaforme/asset, prestazioni hardware,
composizioni lunghe, traffico simultaneo e conflitti tra treni, WX incrociati
simultaneamente, manovra N07, arrivo/anchor N16,scalo,quarto convoglio,
aggancio/sgancio dinamico e lifecycle del bootstrap. Il bundle identico dimostra
preservazione distribuita, non una nuova prova browser. Dataset e contesto
conservano `physical_profile_certified:false`, `runtime_circulation_verified:false`
e `runtimeAdmission:false`.

Proposta alla Regia, **non eseguita**: accettare i sei giri corti e i due giri
con composizione nel perimetro numerico qui misurato; classificare ADJ-01 e
stabilire prima se serve un microgate di correzione/contratto per Next Switch e
arresto presso unità adiacenti. Per un eventuale R2B, definire autorizzazione e
criteri separati per trasferimenti WX e conflitti/occupazioni fra composizioni,
con testimoni indipendenti e senza dedurre capacità N07/N16. Nessun fix del core
o ampliamento della flotta è autorizzato da questa proposta.

**STOP DOPO R2A. Unica prossima azione: Quality Gate indipendente Regia su questa
Draft e sul limite ADJ-01. Nessun merge, deploy, browser V06 o avvio automatico R2B.**
