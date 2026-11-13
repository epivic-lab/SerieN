# SERIE N — R2A-F1: Shared-junction interlocking

13 novembre 2026, Europe/Rome. **PASS tecnico; Quality Gate indipendente della
Regia PENDING. STOP R2A-F1.** La finestra di comando ipotizzata nel Gate R2A è
stata riprodotta dinamicamente e corretta. Il risultato riguarda il simulatore
numerico e non ammette V06 nel browser né certifica un impianto fisico.

## Mandato e provenienza

Baseline obbligatoria e parent unico del checkpoint:
`7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003`, branch R2A
`codex/scenario-v06-r2a-dynamic-circulation`, [Draft PR #17](https://github.com/epivic-lab/SerieN/pull/17).
Letti AGENTS.md, PROGRESS, STATUS V06, rapporto R2A, diagnostico ADJ-01 e
[Quality Gate Regia 6858353142](https://github.com/epivic-lab/SerieN/pull/17#issuecomment-6858353142),
archiviato in [evidence/R2A-F1/REGIA_R2A_GATE.md](evidence/R2A-F1/REGIA_R2A_GATE.md).
Il Gate approva il perimetro numerico R2A ma considera la commutazione durante
l'avvicinamento un rischio da verificare, prima di questa prova non dimostrato.

Ingresso nel checkout esistente `/workspace/SerieN`, branch `work`, HEAD
`f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, working tree pulito. Fetch R2A e
creazione del solo nuovo branch
`codex/scenario-v06-r2a-f1-shared-junction-interlocking` esattamente dallo SHA
richiesto. Nessun worktree aggiunto, modifica dei branch precedenti o rebase.
Prima della pubblicazione, R2A remoto verificato ancora allo SHA obbligatorio,
main ancora a `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, nuovo branch remoto
assente. Commit atomico, checkpoint remoto e Draft con base R2A nella ricevuta
finale: il rapporto non incorpora un impossibile SHA autoreferenziale.

## Riproduzione prima del fix

La sessione R1C e il laboratorio R2A sono invariati. Inizializzazione completa
dei sette controller, C13=true, WX-A=false, altri false; spawn C con loco corta
40×16 mm, ganci ±22 mm, carro 30×14 mm, ganci ±17 mm, passo loco/carro39 mm.
Comando60, velocità nominale90 mm/s, accelerazione45 e frenatura100 mm/s²,
clock1/60 s. Movimento attraverso il vero `stepRailway`, osservazione tramite
`traceJourney`, `collectRailwayState`, `siteSafety`/`getSafety`, comandi tramite
il vero `requestToggle`. Nessuna mutazione diretta di pose o velocità in questa
riproduzione, nessun comando scambio aggirato.

Il giunto condiviso è V06-R01J038, alla fine di P060 nel verso di marcia:
P060 ha s decrescente. C13 protegge l'intervallo esterno **[0,30] mm**;
clearance riportata = s del gancio anteriore −30. Positiva significa fuori
dalla fascia; negativa indica penetrazione. Posizione è del gancio, non del
centro della locomotiva. Tutti gli intervalli occupati sono salvati.

| Tick prima | Velocità mm/s | Gancio P060 s mm | Clearance C13 mm | Guard | Safety C13 | Panel/device isolati |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 815 | 90 | 71,503263 | +41,503263 | SAFE | unlocked | entrambi accettati |
| 835 | 90 | 41,503263 | +11,503263 | SAFE | unlocked | entrambi accettati |
| **836** | **88,333333** | **40,031041** | **+10,031041** | **GUARDED_STOP** | **unlocked** | **entrambi accettati** |
| 837 | 86,666667 | 38,586597 | +8,586597 | GUARDED_STOP | unlocked | entrambi accettati |
| 840 | 81,666667 | 34,419930 | +4,419930 | GUARDED_STOP | unlocked | entrambi accettati |
| 844 | 75 | 29,253263 | −0,746737 | GUARDED_STOP | occupied | entrambi rifiutati |
| 889 | 0 | 1,753263 | −28,246737 | GUARDED_STOP | occupied | entrambi rifiutati |

**Bug di interlocking confermato:** quando il treno sopraggiunge già nella zona
di arresto, C13 viene commutato perché il preview enumera soltanto WX-A, la cui
geometria interna contiene P060. L'arresto sul giunto continua a funzionare, ma
la protezione di comando della seconda unità non riceve l'incontro. Al tick836,
per esempio, la distanza dal centro al giunto è62,031041 mm; il margine di
approach invariato è circa134,014 mm. La richiesta non avrebbe dovuto passare.

Prima di cambiare i sorgenti sono stati eseguiti e conservati **tre test rossi**:
panel al tick836, device al tick836, arresto correggibile fuori dalla fascia.
I primi due falliscono perché `changed:true`; il terzo trova inset0 anziché30.
Ogni sonda di comando ripete da zero tutti i tick in una sessione distinta:
nessuna richiesta precedente altera la traiettoria della sonda successiva.
Il ramo diagnostico senza comandi conserva ogni tick795–900, primo intervento
e arresto, con centri/ganci, velocità, Journey/history, incontri, guard, occupied
e safety di entrambe le unità. Le sonde coprono tick815,830,835,836,837,840,844,
850,889 per entrambe le superfici.

## Correzione minima

Solo due sorgenti applicativi cambiano:

- `src/next-switch.js`: conserva la scelta primaria del router per `next`, ma
  enumera anche le altre unità che appartengono allo stesso nodo. Vale anche
  quando il router rifiuta il percorso. La deduplicazione per unità rimane.
  `siteSafety` riceve così gli incontri completi senza modificare algoritmo,
  soglie, dispatcher o callback di safety.
- `src/railway-guard.js`: alla frontiera rifiutata considera il maggiore inset
  delle unità incontrate. P060 è interno a WX-A, inset0, ed esterno a C13,
  inset30; viene quindi usato30. Il valore deriva dalle protezioni esistenti,
  non da ID, geometria speciale o una nuova costante.

Nessun override, hardcode C13, riduzione di intervalli/margini, scelta alternativa
di routing o refactoring architetturale. `siteSafety`, `railway-state`,
`turnout-commands`, sessione, Railway Step, collision prevention, Journey/router
e costanti cinematiche rimangono byte-identici alla baseline.

## Risultato dopo il fix

| Misura | Prima | Dopo |
| --- | ---: | ---: |
| Primo intervento guard | tick836 | **tick816** |
| Velocità al primo intervento | 88,333333 mm/s | 88,333333 mm/s |
| protectionInset | 0 mm | **30 mm** |
| Arresto completo | tick889 | **tick869** |
| Gancio dal giunto | 1,753263 mm | **31,753263 mm** |
| Gancio dalla fascia operativa C13 | −28,246737 mm | **+1,753263 mm** |
| Safety C13 durante le sonde in moto | unlocked/occupied | **approaching** |
| Panel/device durante quelle sonde | accettati fino all'occupazione | **rifiutati** |
| Safety C13 a riposo fuori fascia | occupied | **unlocked** |
| Correzione protetta a riposo | richiedeva arretramento | **accettata** |

Al tick836 della nuova traiettoria la frenata è già in corso da20 tick:
velocità55 mm/s, gancio s46,419930, clearance+16,419930 mm. Non è lo stesso
stato cinematico della baseline al medesimo tick. Gli incontri sono WX-A e C13;
il primario resta WX-A. Al tick869 il comando può finalmente correggere C13
perché velocità0 e inviluppo completamente esterno alla sua fascia. La
correzione non riavvia il treno: dieci tick conservano la posizione; occorre
il riarmo esplicito. L'occupazione reale conserva sempre il blocco `occupied`.

L'audit ricostruisce in memoria i due moduli **dal commit R2A**, esegue lo stesso
diagnostico e gli stessi negativi senza cambiare checkout o branch. La prova
prima del fix è riprodotta **byte per byte**; SHA256
`03b84a7799b2b3bd9e599e0c52f311cf3ab69277c3e1c3c20742ed22d6134c7c`.
I tre negativi tornano rossi sui sorgenti approvati e verdi sul candidato.
Anche il diagnostico dopo il fix e la matrice sono confrontati con una seconda
esecuzione deterministica, separatamente dai tempi non deterministici dei test.

## Regressione e preservazione

**17 nuovi test**, più l'adeguamento esplicito di un contratto storico:
`tests/route-performance.test.js` confrontava l'intero elenco incontri col 5C,
quindi vietava anche il completamento necessario alla sicurezza. Il fixture
5C resta immutato. Ogni altro campo resta esattamente uguale: next, ranges,
points, stop, uncertain, distanze e highlight. Ogni vecchio incontro resta
presente o anticipato soltanto su un vero nodo condiviso; si verificano nodo,
range di arrivo e completezza di tutte le unità incidenti. Full/lean rimangono
identici fra loro a parità di punti. Il primo run completo411/412 e la sua
causa sono conservati, senza skip o indebolimento di asserzioni ferroviarie.

La matrice copre **tutti i cinque nodi condivisi**, otto archi incidenti V06 e
sei Legacy, ogni lato fisico e ambedue gli assi Journey, loco singola e loco
con un carro, entrambi gli stati del vicino. Sono **112 casi noti**, di cui
72 attraversamenti allineati e40 arresti disallineati con correzione e riarmo;
**56 casi UNKNOWN** sul vicino eseguono direttamente il core anche senza
affidarsi al gate più restrittivo della sessione. I negativi UNKNOWN di
sessione verificano separatamente comandi panel/device e zero tick.

Ogni caso noto verifica: approach fuori occupazione, rifiuto di entrambe le
superfici senza mutazione, occupazione dell'unità corrente, attraversamento
allineato oppure stop fuori fascia, rilascio sicuro a riposo, correzione,
nessuna ripartenza automatica, riarmo, lock occupied dopo ingresso reale.
Le fixture della matrice iniziano con velocità90, gap45 mm e marcia nel vero
step: alcune esercitano intenzionalmente anche il clamp già esistente. La
clearance minima in questi casi è circa2e-6 mm, non una tolleranza fisica
certificata. La riproduzione principale parte invece da ferma e accelera.
Ulteriori approcci accelerati reali con uno e tre rotabili corti coprono anche
la composizione con due carri, senza forzarla nel corto arco Legacy126 mm.
Sessioni vuote consentono entrambi i comandi su tutte le unità; un convoglio
in moto distante oltre1000 mm non provoca un lock C13 fittizio.

| Gate | Esito |
| --- | --- |
| Baseline prima del fix | **395/395 Node**, build PASS |
| Negativi pre-fix | **3/3 fallimenti attesi**, poi riprodotti sui moduli del parent |
| Test mirati F1 | **17/17 PASS** |
| Regressione completa finale | **412/412 Node PASS**, zero skip/cancelled |
| JMRI | **9/9 PASS** |
| Build e canonico | PASS; quattro artefatti canonici senza diff |
| Sei giri R2A e due giri con due carri | **100+38 giunti**, sintesi numeriche identiche alla baseline |
| Accelerazione/STOP/inversione R2A | Identici alla baseline |
| Stop protetti R2A | C13:+31,753263 mm dal giunto; C07 verso inverso:+31,233370 mm; entrambi sbloccati a riposo, correzione protetta, zero arretramenti necessari |
| Confronto esaustivo preview | **38.400 Legacy +20.224 V06 =58.624**, tutte le configurazioni booleane e archi nei due versi, API su Journey congelati |
| Next Switch primario/routing/ranges/stop/distanze | Identici al parent per tutti58.624 confronti |
| Topologie/protectedRanges | Identiche per entrambi i profili |
| Rete Legacy serializzata | SHA256 `ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413`, invariata |
| Dataset V06 | SHA256 `4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7`, invariato; hash/schema/semantica PASS_DATASET_ONLY |
| Bundle | **1.096.081 byte**, +91; stessi85 input, cambiano soltanto i due moduli autorizzati; zero V06/laboratorio |

SHA256 bundle candidato:
`89d732feafef5914078d5ef83885e5b9b68ff3abe967e8c4863a08e20a3063c7`.
La build della baseline ricostruita dall'audit coincide con il precedente hash
`9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66`.
Il bundle cambia perché incorpora il fix generico, che protegge anche i giunti
adiacenti Legacy. Non viene dichiarata una falsa identità del bundle.

[Preservation](evidence/R2A-F1/preservation.json) verifica4209 blob protetti
identici, ogni blob della
baseline e tutte le aggiunte: soli cinque file preesistenti autorizzati
modificati, inclusi PROGRESS/STATUS e il test del contratto. Dataset, geometrie,
Railway Step, collision prevention, renderer/HUD/bootstrap, asset,
Auth/Supabase/backend, dipendenze e workflow sono preservati. Nessuna nuova
richiesta di rete applicativa, credenziale, persistenza o procedura di bypass.

Gli errori di preparazione del laboratorio sono conservati: una fixture di tre
rotabili non entrava con gap45 nel corto arco Legacy126, quindi la matrice
uniforme usa uno/due rotabili e i tre rotabili restano su un approccio accelerato
reale; nessuna geometria modificata. Un'aspettativa del nuovo audit è stata
corretta da PASS a PASS_DATASET_ONLY secondo il contratto effettivo. L'audit
iniziale serializzava ripetutamente la rete immutabile; quello finale congela
direttamente Journey/segments, conservando il controllo read-only.

## Limiti e STOP

R2A-ADJ-01 è **risolto nel perimetro numerico provato**: incontro completo,
approach-lock su entrambe le superfici e arresto correggibile fuori dalla fascia.
Non introduce recovery automatica o nuove decisioni operative. Restano fuori
scope traffico simultaneo/R2B, priorità, quarto treno, manovra N07, arrivo N16,
scalo, agganci dinamici, sagome fisiche e prestazioni hardware. Nessuna nuova
prova browser Legacy; nessuna attivazione browser V06. L'audit bundle e i test
numerici non vengono presentati come una nuova certificazione visuale.

`runtimeAdmission:false`, `physical_profile_certified:false` e
`runtime_circulation_verified:false` rimangono invariati. Ambiente Node24.19.0,
Python3.12; dipendenze del lock già presenti, nessuna installazione o modifica.
Comandi, log e riproduzione in [evidence/R2A-F1/README.md](evidence/R2A-F1/README.md).

**Richiesto Quality Gate indipendente della Regia sulla nuova Draft PR con base
R2A. STOP: nessun merge, deploy, browser V06 o avvio R2B.**
