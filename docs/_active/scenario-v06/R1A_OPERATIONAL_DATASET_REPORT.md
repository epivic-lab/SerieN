# SERIE N — R1A: dataset ferroviario operativo V06

13 novembre 2026, Europe/Rome. **PASS tecnico R1A / revisione indipendente Regia pending.**
Solo dataset, validazione e adapter della factory non attivato. Nessuna circolazione
V06 nel simulatore, attivazione, modifica dei sistemi operativi, merge o deploy.

## Mandato, baseline e confini

Baseline esatta `7118c99a9367da61f0042dfe40240fe78dc0d7c6`, branch sorgente
`codex/scenario-v06-r02-wx-validation`, [Draft #13](https://github.com/epivic-lab/SerieN/pull/13).
Autorizzazione prevalente: [decisione Quality Gate Regia](https://github.com/epivic-lab/SerieN/pull/13#issuecomment-6851925629).
Letti AGENTS, PROGRESS, M01/addendum, R0, R01, R02 e decisione della PR.

Checkout iniziale `work`/`f33377c`, pulito e unico worktree locale. Fetch esplicito
del branch R02: SHA coincidente con il mandato. Branch R1A locale/remoto prima
inesistente; creato `codex/scenario-v06-r1a-operational-dataset` dall'esatto R02.
Nessun reset, rebase o modifica degli altri branch. Nessuna concorrenza locale
visibile ai checkpoint; non si presume assenza assoluta di lavori esterni.

## Architettura e file

| File / gruppo | Modifica e responsabilità |
| --- | --- |
| `src/datasets/v06-r1a.json` | Nuovo dataset operativo versionato e completamente separato |
| `src/datasets/README.md` | Contratto, ammissione Node isolata, uso esplicito, rollback |
| `src/network.js` | Unico sorgente applicativo modificato: parametro `dataset = canonical`, controllo strutturale minimo e geometria copiata per istanza |
| `tools/scenario-v06/build-r1a.py` | Derivazione deterministica da R02; nessun import del canonico/generatore legacy |
| `tools/scenario-v06/validate-r1a.js` | Ammissione indipendente Node: digest, lineage, schema e controlli semantici fail-closed |
| `tools/scenario-v06/check-r1a-scope.py` | Confronto di tutti i blob preesistenti contro R02 |
| `tests/v06-r1a.test.js` | 44 nuovi test, router/guard esistenti usati senza modifiche |
| `evidence/R1A/` | Oracolo congelato, mapping esaustivo, log, hash e ricevute |
| Questo rapporto, `STATUS.md`, appendice `PROGRESS.md` | Consegna R1A e unico prossimo gate |

La factory riceve un oggetto dati esplicito; `createNetwork()` mantiene il default
legacy e `createNetwork(canonical)` il fallback esplicito. La factory non è il
validatore completo V06: il chiamante isolato deve prima eseguire
`validateArtifact(bytes)`. Questo verificatore è Node-only, non un nuovo loader
browser. Non esiste un flag URL/UI né un collegamento V06 nel bootstrap.

Nella factory, lo spread originale dei metadati risovrascriveva la copia dei
punti con l'array sorgente. Il piccolo adattamento esclude `points` dai metadati:
ogni istanza possiede ora i suoi punti. Il confronto integrale serializzato della
rete legacy con la vecchia factory è identico, inclusi distanze, nodi, controller,
metadati e circuiti. Metadati/controller restano condivisi in sola lettura come
nel contratto precedente; non è un meccanismo di hot swap dello stato.

## Schema, versioni, checksum e provenienza

| Oggetto | Identità |
| --- | --- |
| Schema / layout / versione | `serien-v06-operational-1` / `V06-R1A` / `1` |
| Dataset SHA-256 | `4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7` |
| Input R02 SHA-256 | `99a5019f6ea4b8a99d18dcf6aff4a9b841ea2c49c5bfa1f658c7e196132591a` |
| Oracolo esterno SHA-256 | `56199a3f625fbce25b6e69fcde2357841bc17ccc3c5bfa1f658c7e196132591a` |
| Assi originali estratti R01 | `b140214d52977ea62be422882bbcf2b2e3fcf16fee6d1d0f429f03e2d4304cab` |
| Alignment export originale | `6a494928707609f1cf6aa9b535a510ca721b9a3458eca0910dfc250c978f46ea` |

Il digest dell'artefatto è fissato nel validatore esterno, senza auto-hash del
JSON. Anche input e oracolo hanno lock verificati. Il generatore non legge
l'oracolo R1A: le matrici e i testimoni congelati provengono dai file R0/R02 già
presenti nella baseline. Il checker non importa il builder. Nei test negativi si
esegue direttamente `validateDataset(object)`, così il rifiuto deve dipendere
dagli invarianti e non soltanto da un checksum cambiato.

`provenance` conserva commit, percorso R02, hash di candidato/assi/alignment e
decisione Regia. I limiti di provenienza produttore già dichiarati nei rapporti
storici restano aperti: questo lineage non certifica il file nativo né corregge
i mismatch del manifest/EXPORT_REPORT.

## Mapping geometrico–operativo

Mapping completo di **79 righe** in [mapping.csv](evidence/R1A/mapping.csv): pezzo,
arco, from/to, porte, unit/controller, stato booleano, ruolo/circuito, lunghezza,
numero vertici e intervalli nascosti originali/operativi.

| Elemento R02 | Contratto runtime |
| --- | --- |
| Pezzi `0..78` | `V06-P000..V06-P078`, uno a uno, tutti i vertici e il verso S→E preservati |
| 74 giunti `R01J*` | ID `V06-R01J*`, coordinate esatte e incidenze sorgente esplicite; nessuno snap/alias di prossimità |
| Punti `[X,Y]` PLAN_MM | `{x:X,z:Y}`, mm, piano ferro nel metadata `railTopMm:8.4`; nessuna seconda scala N |
| Porte | Nodo esplicito nel registro controller e `fromPort`/`toPort` sugli archi interni |
| Percorso geometrico | `geometryRef` all'esatto record R02, lunghezza polilinea e `sourcePiece` stabile |
| Stati | `false` = S0/N; `true` = S1/X; `initialState:null`, polarità fisica non certificata |
| C interno / B medio / A esterno | `lane` 0 / 1 / 2; `mainLoops` orientati e ruoli senza vecchi ID ferroviari |
| Terminali | `20.S` tampone N20, `43.S` tampone N10, `51.S` fine aperta N16; anchor null |
| Itinerari | Archi, versi e `requiredStates`; triangolo marcato non ammesso al transito diretto |
| Manovra triangolo | Due tratte distinte, stati ed evento stop–liberazione–commutazione–inversione; `runtimeAdmission:false` |

| Unità | Percorsi `false` | Percorsi `true` |
| --- | --- | --- |
| V06-C07 (Y) | p35 A↔B | p34 A↔C |
| V06-C12 | p68 A↔B | p30 A↔C |
| V06-C13 | p69 A↔B | p33 A↔C |
| V06-N07 | p31 A↔B | p32 A↔C |
| V06-N14 | p41 A↔B | p42 A↔C |
| WX-A | p59 UL↔UR, p60 LL↔LR | p12 UL↔LR, p13 LL↔UR |
| WX-B | p61 UL↔UR, p62 LL↔LR | p16 UL↔LR, p17 LL↔UR |

Ogni WX conserva quattro archi completi porta→porta e `kind:'cross'`, come nel
contratto esistente. Le cinque primitive geometriche non diventano archi
consecutivi della stessa unit. I centri diamond non sono nodi né porte. Gli ID
WX-A/B identificano i dispositivi V06 nel nuovo registro; nessun arco/nodo,
connessione, alias o parametro geometrico viene recuperato dal vecchio grafo.
Le normali WX e i rami S0 restano soggetti allo stato richiesto `false`.

**Intervalli nascosti:** tutte le nove geometrie rimangono nel grafo. R02 conserva
due fine-intervallo arrotondate a 169,7 mm, oltre la lunghezza misurata di p28
(169,676015711 mm) e p29 (169,677235025 mm). `sourceHiddenIntervalsMm` conserva
esattamente i valori originali; solo `hiddenIntervalsMm` limita questi due
estremi alla lunghezza dell'arco. Nessun punto o collegamento è cambiato. Non è
una tolleranza di connettività o un indebolimento di sicurezza.

## Risultati e limiti delle verifiche

| Verifica nuova R1A | Risultato |
| --- | --- |
| Baseline prima delle modifiche | **254 Node, 9 JMRI, build PASS** |
| Finale `npm test` | **298/298 PASS = 254 legacy + 44 nuovi**, zero skipped/cancelled |
| Finale JMRI / build | **9/9 PASS / PASS**, dipendenze e pipeline precedenti invariate |
| Riproducibilità | Generazione in output temporaneo, confronto byte esatto PASS |
| Validatore indipendente | Schema/lineage/hash, tutti i vertici, lunghezze, incidenze, ruoli, porte e unit PASS |
| Negativi | **34 mutazioni semantiche rifiutate**, più alterazione del digest dell'artefatto |
| WX sul router reale | **64 casi: 16 ammessi, 48 vietati**, ingresso reale e uscita sul lead esterno allineato |
| Semplici/Y sul router reale | **90 casi: 20 ammessi, 70 vietati**, tutte le alternative esterne presso C12/C13 |
| Configurazioni globali | **128**, 20.224 arrivi totali / **17.920 attivi**, nessuna ambiguità e router coerente con oracolo esterno |
| Anelli nei due versi | C **2933,790700**, B **3260,781635**, A **3468,164116 mm**, chiusi |
| G1/G2/G3 e tangenti | Punti identici a R02, giunti esatti; mismatch di tutte le coppie esterne uguale all'oracolo |
| Triangolo e terminali | Tratte/testimoni e reciproci ammessi; N07.C↔B diretto sempre vietato; soli tre terminali dichiarati |
| Stato sconosciuto | Sei valori non booleani × sette unit: guard esistente `UNKNOWN/unknown-control`, distanza e avanzamento concessi zero |
| Protezione strutturale WX | Sette siti istanziabili con topologia esistente; quattro percorsi WX completi protetti; nessun nodo diamond |
| Factory / fallback | Default ed esplicito legacy equivalenti, V06 isolato, coordinate per istanza separate, mutanti con vecchi ID rifiutati |
| Preservazione | **4.127 blob preesistenti protetti identici**; sole eccezioni ammesse factory, PROGRESS e STATUS scenario |
| Bootstrap / bundle | App invariata, **zero input V06** nei 84 input della build |

Bundle finale: 1.092.390 byte, SHA-256
`29573d343214ce7584c235c5d7c053ed9f73841dbdf4590556878ddbf1ee2dc5`.
Differisce dalla baseline di 125 byte per la sola factory autorizzata; **non** si
dichiara identità binaria. La rete legacy serializzata completa rimane invece
identica: 533.232 byte, SHA-256
`ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413`.

Fallimenti intermedi conservati e risolti senza cambiare regole operative:
il primo controllo rigido degli hidden ha rilevato l'arrotondamento sorgente,
risolto con doppio campo raw/bounded; il primo harness dei semplici presumeva
un solo ingresso esterno per porta e ha fallito su C12.B, dove arrivano due
alternative di C13. Il test finale verifica entrambe, anziché alterare la rete.
[Log del primo harness](evidence/R1A/initial-v06-failure.txt).

I 34 negativi coprono pezzo mancante, duplicati/ID legacy, nodo diamond, tre gap,
vertici interni/non finiti/degeneri, lunghezze e hidden, stati WX/semplici/tipi,
unit spezzata, copertura controller/porte/default, terminale/anchor inventato,
anello aperto/verso, transito e attivazione manovra triangolo, stati itinerario,
hash/baseline/schema, falsa certificazione/circolazione e riferimento legacy extra.

Non sono stati cambiati Journey, router, guard, next-switch, collision prevention,
comandi/gestione scambi, frenatura, flotta/manovre, UI V2.1/HUD/renderer, asset,
backend, Supabase, JMRI XML, canonico, test precedenti, dipendenze o workflow.
Il generatore legacy continua a scrivere solo i propri artefatti: il dataset V06
ha percorso e generatore distinti. Nessuna credenziale/URL firmata introdotta;
nessuna chiamata backend o nuovo accesso di rete applicativo.

## Uso opt-in e rollback

Da root, in un laboratorio Node:

```js
import {readFileSync} from 'node:fs';
import {createNetwork, validateNetwork} from './src/network.js';
import {validateArtifact} from './tools/scenario-v06/validate-r1a.js';
const bytes = readFileSync('src/datasets/v06-r1a.json');
validateArtifact(bytes);
const isolatedV06 = createNetwork(JSON.parse(bytes));
validateNetwork(isolatedV06); // {edges:79, deadEnds:3}
const legacy = createNetwork(); // {edges:75, ...}, nessun dato V06
```

Rifiuto di hash/schema/lineage: nessuna istanza V06 viene costruita. Il fallback
legacy è un'azione esplicita, non una riparazione silenziosa del dataset invalido.
Rollback R1A: abbandonare l'istanza isolata e creare una nuova rete legacy; nel
gioco non c'è alcun profilo da disattivare perché il bootstrap non è cambiato.
Non trasferire Journey, stati, prenotazioni, pose o cache fra le due reti. Nessuna
promessa di migrazione della sessione o hot swap. La baseline R02 resta
disponibile come checkpoint precedente; nessun revert/merge/deploy eseguito.

## Rischi e raccomandazione R1B

`physical_profile_certified:false` e `runtime_circulation_verified:false`
rimangono obbligatori. Il PASS riguarda dataset e compatibilità strutturale/
topologica isolata, non una rete giocabile o una clearance alla circolazione.

1. **Stato unknown:** il router storico converte a Boolean; il test dimostra il
   blocco nella guardia già esistente, non cambia tale semantica. Mai usare il
   router da solo come permesso di movimento.
2. **Consumer ancora legacy:** TURNOUT_IDS/UI/command mapping, spawn, missioni e
   destinazioni applicative assumono il vecchio profilo. Sono dipendenze note
   fuori R1A; nessun alias di vecchi controller è stato introdotto per aggirarle.
3. **N07/N16 e WX:** anchor, capacità utile (250,101 mm è solo limite geometrico
   S1), front/tail, margini, crossing conflict e comportamento dei convogli
   richiedono i gate operativi futuri. Il test della struttura protetta non
   certifica sagome/fouling o manovre fisiche. Nessun treno V06 è stato fatto
   circolare o spawnato nel simulatore.
4. **Geometria/visuale:** tutti i punti R02 conservati, inclusi scarto WX massimo
   accettato ≈3,334762 mm e mismatch poligonale ereditato fino a 3,391156°.
   Aghi/GLB, quota/contatto, sagome e certificazione manifatturiera restano aperti.

**Raccomandazione:** sottoporre R1A a Quality Gate indipendente; proporre R1B come
microfase separata di ricognizione/contratto dei consumer e piano di adattamento
alle identità V06, definendo precisamente quali modifiche funzionali saranno
ammesse. Nessuna necessità di modifica più ampia è stata aggirata per completare
la sola istanziazione dati autorizzata. L'attivazione richiede un nuovo mandato.

Prove browser/UI/V06, prestazioni hardware, sagome/collisioni/manovre complete,
asset mobili e backend live **NOT VERIFIED** in R1A. Non sono necessarie immagini
del simulatore per questa consegna non visuale; non vengono riutilizzate come
nuove prove le catture storiche.

**STOP R1A.** Consegna esclusivamente su branch dedicato e Draft PR collegata
alla #13, con SHA locale/remoto verificato nella ricevuta finale. Nessun merge,
deploy, R1B o attivazione iniziati.
