# SERIE N — R2B2: Three-train dynamic safety

13 novembre 2026, Europe/Rome. **PASS tecnico di separazione numerica nel
perimetro misurato; QUALITY GATE INDIPENDENTE REGIA PENDING.** Progresso
verificato nei casi compatibili e dopo i comandi espliciti di liberazione e
riarmo. **20 scenari WX in deadlock sicuro** (12 configurazioni di riferimento e8 perturbazioni), distinti da8 arresti controllati near-touch.
L'equità generale rimane **NON CERTIFICATA**. Nessun dispatcher o recovery.

## Mandato, checkout e baseline

Autorizzazione esclusiva: [Quality Gate Regia della PR #19, commento6860875610](https://github.com/epivic-lab/SerieN/pull/19#issuecomment-6860875610),
conservato in [REGIA_GATE.md](evidence/R2B2/REGIA_GATE.md). Letti prima delle
modifiche AGENTS, PROGRESS, STATUS, rapporto R2B1 e rapporto R2A-F1.
Baseline e parent unico obbligatorio:
`ab9c9bacdba652209b2ffc14b7c70856645601ba`.
Branch autorizzato `codex/scenario-v06-r2b2-three-train-safety`;
base della Draft `codex/scenario-v06-r2b1-two-train-safety` (PR #19).

Checkout esistente `/workspace/SerieN`, branch iniziale `work`, HEAD
`f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, working tree pulito e origine
`https://github.com/epivic-lab/SerieN.git`. Baseline inizialmente assente:
fetch del solo branch R2B1, verifica SHA #19/FETCH_HEAD e creazione del nuovo
branch direttamente da tale commit. Nessun merge, rebase, reset o worktree.
Il nuovo branch remoto risultava assente; R2B1 era ancora alla baseline e
main ancora a f33377c. **477/477 Node e build PASS prima del codice**.
SHA atomico, URL Draft e local=remote sono nella ricevuta finale: nessun commit
aggiuntivo per inserire uno SHA autoreferenziale nel rapporto.

## Estensione minima del laboratorio

Due soli file preesistenti di laboratorio sono modificati:

- `two-train-lab.js`: parametro opzionale `trainCount`, predefinito2 e limitato
  a2/3. Stessa sessione R1C, stessa rete V06, stesso `FixedClock(1/60)`, stessa
  transazione originale `stepRailway(context,dt)` con esattamente3 risultati.
  Controlli espliciti anche su arco, posizione finita e intervalli occupati.
- `two-train-validation.js`: stesso monitor e stesso testimone geometrico,
  con cicli su tutti i treni e sulle coppie0:1,0:2,1:2. Tre contatori di tick
  dimostrano il passaggio effettivo su ciascuna coppia, senza cambiare l'oracolo.

Nuovi `three-train-validation.js`, `run-r2b2.js`, `audit-r2b2.js`,
`check-r2b2-scope.py` e `tests/v06-r2b2.test.js`. Nessuna modifica applicativa.
I477 test storici e tutte le evidenze R2B1 restano byte-identici.

ID 0/1/2 contigui secondo i comandi originali; Journey distinti e appartenenti
alla stessa sessione/rete. L'ammissione controlla posizione/verso, ogni
rotabile/gancio/front/tail, dimensioni finite, contenimento integrale nella
history iniziale, rotta attiva, prenotazioni, occupazioni ed envelope contro
**tutti** i treni già presenti. Usa SAT originale e distanza esterna dei
poligoni. Un rifiuto non inserisce nulla e conserva lo snapshot della sessione:
negativi su collisione con entrambi gli altri treni, posizione/arco/ID/verso,
composizione lunga/larga/invalida, percorso inattivo e prenotazioni.

Non si estende la history per inventare spazio. L'ammissione aggiuntiva
richiede tutti fermi; rete, identità e readiness vengono ricontrollate prima
del clock. Nessun nuovo ingresso runtime. `runtimeAdmission:false` invariato.

Comandi velocità/STOP/inversione provengono da `createFleetCommands`, comandi
panel/device da `session.requestToggle`, routing/guard/SAT/sweep dal core
originale. Le prenotazioni e le occupazioni sono rilette dalla sessione attuale.
Nessun movimento individuale fuori dalla transazione e nessuna priorità suID 0.

Stock numerici: loco corpo40×16 mm, ganci22/22; carro30×14 mm, ganci17/17,
passo39 mm. Loco, loco+carro e loco+2 carri negli anelli; loco e loco+carro
negli inseguimenti/WX dove le finestre lo consentono. Non sono sagome fisiche.

## Oracolo indipendente e determinismo

`two-train-oracle.js` resta **byte-identico**: nessun import da src, Journey,
router o collision prevention; fonti R02 e R1A pin e controllate tramite SHA256.
A ogni tick: posa/orientamento di ciascun veicolo, entrambi i ganci, front/tail,
metrica/history, giunti leciti e rotta allineata, odometro/travel, limite
cinematico, assenza di rollback/teleport, continuità dei ganci, intervalli
occupati freschi e owner delle prenotazioni.

Tutte le3coppie vengono controllate per ogni veicolo con poligoni esterni e
**inviluppi continui conservativi**: campioni, vertici R02, frontiere Journey,
cambi della tangente e hull con disco di copertura della rotazione. Il verdetto
SAT/guard del motore non è l'expected. I negativi alterano posa/front/rear e
history del **terzo rotabile del terzo treno**, occupazioni e overlap: il monitor
fallisce e allega iniziale, precedente/corrente e input effettivi.

**75 scenari,57.649 tick,172.947verifiche coppia-tick,887 giunti per esecuzione**.
Due esecuzioni finali: **76 JSON byte-identici** (75 tracce e sintesi). Le tracce
gzip conservano iniziale, campioni, giunti, comandi e finale; ogni tick, anche
non campionato, entra nel digest cumulativo del suo JSON. UUID e chiavi casuali
delle prenotazioni non entrano nelle tracce.

Rieseguite anche tutte le55 prove R2B1/60.917 tick. Tolto il solo nuovo campo di
strumentazione `pairChecks`, **ogni risultato è byte-identico** alla traccia
pubblicata; identici anche i55digest di tutti i tick. Nessun test storico cambiato.

## Matrice effettiva e risultati numerici

[Matrice di tutte le75 righe](evidence/R2B2/SCENARIO_MATRIX.md),
[sintesi](evidence/R2B2/summary.json), [totali](evidence/R2B2/numeric-totals.json),
[tracce](evidence/R2B2/traces), [determinismo](evidence/R2B2/determinism.json).

| Gruppo | Casi / tick | Separazione | Progresso e arresti | Min corpi / sweep mm |
| --- | ---: | --- | --- | ---: |
| S1 tre anelli | 10 /23.720 | PASS | 8 combinazioni di verso, più1/2 carri per treno: giro completo per tutti, zero guard ingiustificate | 15,505111242 /14,250722079 |
| S2 inseguimento | 26 /14.990 | PASS | Leader in moto/frenata/STOP/fermo, entrambi i follower protetti; rilascio immediato/differito e riarmo individuale | 0,05 /0,049998 |
| S3 WX | 28 /16.790 | PASS | 8N in progresso; 10X e8 perturbazioni con coppia bloccata e terzo in moto; 2conflitti reali a3in deadlock | 0,017742613 /0,012724691 |
| S4 F1/C13 | 1 /999 | PASS | Arresto fuori fascia, due altri treni in moto, correzione e riarmo espliciti | 15,505111242 /14,250722281 |
| S5 dinamiche/stress | 10 /1.150 | PASS | Prenotazioni sovrapposte/rilascio, UNKNOWN e8 arresti near-touch controllati | 0,000100000 /0,000100000 |

S1 confronta ogni veicolo con il testimone indipendente dei circuiti R02:
origine+odometro e ordine degli archi, oltre alla distanza percorsa.
LunghezzeA3468,164116346/B3260,781635120/C2933,790700412 mm. Nessun treno viene
fermato artificialmente quando termina prima il giro. Nei casi loco singola
il finale è rispettivamente1,000169/1,063779/1,182344 giri.

S2 usa posizioni statiche validate suP064:40/120/200 mm per loco singole,
25/108/191 mm per loco+carro. Tre ordini fisici0-1-2,2-0-1,1-2-0;
anche2-1-0 con carro e nei due versi. Ogni rilascio avviene nel tick successivo
all'arresto comune oppure30 tick dopo. Leader liberato, follower1 riarmato
successivamente, follower2 soltanto dopo il proprio comando. Zero movimento
spontaneo. Nel caso in moto0-1-2, arresto comune137, progressi dopo rilascio
410,5/230,5/50,25 mm. Un allarme centrale può restare legato alla richiesta
pendente del follower posteriore: il comando compatibile riparte comunque,
senza un probe stale che lo blocchi. [Diagnosi](evidence/R2B2/development/NOTES.md).

S3 prova entrambi i WX, N/X e tutti i4abbinamenti di verso della coppia.
Il terzo è ammesso in una finestra reale, validato contro entrambi e comandato:
resta **SAFE e in moto anche nel finale**, con travel>100 mm. Non è una presenza
statica nominale. Approach-lock e occupied sono verificati, panel/device
rifiutati, protezione integrale del WX finché qualunque ingombro lo interseca;
la commutazione dopo rilascio usa la safety fresca anche del terzo.

Conflitti a3raggiungibili: WX-A eWX-B inX, due vie attive e terzo in coda sulla
prima, finestra upstream ricavata soltanto dal router originale. Tutti e3entrano
fisicamente nello stesso WX; si arrestano senza penetrazione (693/393 tick),
comandi ancora rifiutati per occupied. **DEADLOCK sicuro, non PASS di progresso**.
Tre itinerari interni indipendenti nello stesso WX sono impossibili: il grafo
ha2 vie attive. L'audit conferma64coppie dirette:16ammesse e48vietate.
Le48vietate e una terza via indipendente sono **NOT VERIFIED come circolazione**;
non sono inventate connessioni o traiettorie per esercitarle.

S4 conferma F1 invariato: arresto869, gancio31,753263435 mm dal giunto,
**+1,753263435 mm fuori dalla fasciaC13[0,30]**. Entrambi gli altri convogli sono
ancoraSAFE in moto. Panel/device rifiutati in approach; correzione consentita
fuori fascia a riposo,10 tick immobili dopo correzione e ripartenza solo esplicita.

S5 inserisce due prenotazioni sovrapposte dello stesso owner su ciascuno dei
due itinerari degli altri treni: entrambi si arrestano perreserved mentre
l'owner prosegue; quattro rilasci,10 tick senza riavvio, guard fresh SAFE e
riarmo esplicito. UNKNOWN è provato sia nel gate di ammissione/clock sia
con3fixture negative e lo step originale, senza convertire null in false.
ID/Journey estranei e reset/rollback in movimento sono rifiutati; sostituzione
valida solo dopoSTOP, sostituzione invalida conserva la sessione corrente.

## Sensibilità numerica, safety e progresso

Near-touch con gap iniziale0,0001/0,001/0,01/0,1 mm, ordine0-1-2 e2-1-0.
Leader mantenuto fermo e follower comandati: il movimento che invaderebbe i
corpi già occupati viene rifiutato, nessuna penetrazione. Sono **8 arresti sicuri
controllati**, non conflitti risolti né certificazione di circolazione.

Perturbazioni WX: ±0,001 e±0,01 mm in senso opposto sulle due posizioni iniziali,
entrambi iWX, stesso stock/routing e core. Tutte conservano separazione e la
stessa classe operativa: coppia in deadlock, terzo in progresso. WX-B passa da
0,017742613 mm non perturbato a0,017848724/0,020248063 mm; sweep da0,012724691 a
0,012830802/0,015215724 mm. Nessuna soglia o geometria del motore è modificata.

Minimo globale corpi/sweep **0,0000999999999749 mm**, imposto dallo stress statico
near-touch, non margine operativo raccomandato. Minimo dinamico WX corpi
0,0177426127008 mm e sweep0,0127246912044 mm. Massimo errore di posa
2,278173318e-13 mm; massimo eccesso di salto2,273736754e-13 mm.

**20 scenari DEADLOCK**:10casiWX X (8versi+2concarri),2conflitti WX a3 e8 ripetizioni perturbate.
Le8 ripetizioni perturbate confermano la stessa classe operativa delle
12 configurazioni di riferimento. Gli8near-touch e UNKNOWN restano arresti
protetti distinti. Nessuna risoluzione automatica, priorità o promessa di
equità/assenza generale di starvation. **Nessun FAIL di safety osservato**.

## Gate, preservazione e limiti

| Controllo | Esito |
| --- | --- |
| Baseline | 477/477 Node, build PASS prima del codice |
| Regressione completa | **559/559 Node**,82nuovi, zero fail/skip/cancelled |
| Classificazione near-touch finale | 8/8 mirati PASS dopo l'aggiornamento dell'etichetta |
| R2B1 riprodotta | 55/55 risultati originali e digest tick identici |
| Matrice R2B2 | 75/75 separazione PASS;57.649 tick per esecuzione |
| Determinismo | 76 JSON byte-identici, due esecuzioni finali |
| JMRI | 9/9 PASS |
| Build / canonico | PASS;4 artefatti canonici senza diff |
| Preservazione | **4.328 blob protetti identici su4.332baseline**; sole eccezioni PROGRESS/STATUS e i2 harnessNode elencati |
| F1, core e testimone geometrico | Byte-identici, tutti i test precedenti invariati |
| Bundle | 1.096.081 byte,85 input, zeroV06/laboratorio; SHA256 identico R2B1 |
| Segreti | Nessun candidato nei nuovi file, incluse tracce decompresse |

BundleSHA256 `89d732feafef5914078d5ef83885e5b9b68ff3abe967e8c4863a08e20a3063c7`.
[Audit](evidence/R2B2/audit.json), [preservazione](evidence/R2B2/preservation.json),
[riproduzione e log](evidence/R2B2/README.md). Node24.19.0, Python3.12;
dipendenze già presenti, nessuna installazione o nuova dipendenza.

Railway Core/Step/Journey/routing/collision prevention/guard, F1, dataset e
topologiaV06,150railLegacy,SimulatorLegacy,UI/HUD/renderer/bootstrap/asset,
Supabase/backend/Auth e workflow preservati. Nessuna nuova richiesta di rete
applicativa. `runtimeAdmission:false`, `physical_profile_certified:false` e
`runtime_circulation_verified:false` immutati.

NOT VERIFIED: browserLegacy nuovo, browserV06, hardware/sagome e tolleranze
fisiche, profili lunghi non provati, perdita live di un singolo stato noto
tramiteAPI applicativa non esposta, priorità/equità generale, quarto treno,
N07/N16/scalo, coupling dinamico. Le distanze minime e le perturbazioni provate
non certificano robustezza per qualsiasi errore geometrico o numerico.

**STOP R2B2. Richiesto Quality Gate indipendente della Regia sulla Draft con
base#19. Nessun R2B3/R2C, browserV06, integrazione visuale, merge o deploy.**
