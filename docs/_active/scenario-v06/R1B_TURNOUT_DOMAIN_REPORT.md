# SERIE N — R1B: dominio scambi per profilo

13 novembre 2026, Europe/Rome. **PASS tecnico R1B / Quality Gate Regia pending.**
Nessuna attivazione V06, merge, deploy o fase successiva.

## Mandato e baseline

Base esatta approvata `6a976749d5630c0abf858e64795210183a947f5e`, branch sorgente
`codex/scenario-v06-r1a-operational-dataset`, [Draft #14](https://github.com/epivic-lab/SerieN/pull/14).
Mandato prevalente: [Quality Gate R1A e autorizzazione esclusiva R1B](https://github.com/epivic-lab/SerieN/pull/14#issuecomment-6852401319).
Letti AGENTS, PROGRESS, rapporto R1A, audit M01/addendum e contratti R0/R01/R02.
Le direttive storiche sugli otto controller restano valide per il legacy; il
mandato corrente autorizza il registro separato dei sette V06.

Ingresso: checkout `work` a `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, pulito,
unico worktree `/workspace/SerieN`. Fetch esplicito del branch R1A e riscontro
locale/remoto dello SHA richiesto. Branch R1B inizialmente assente, creato dalla
baseline esatta: `codex/scenario-v06-r1b-turnout-domain`. Nessun reset, rebase o
modifica di altri branch. Nessun lavoro concorrente locale visibile ai controlli;
non si deduce assenza assoluta di attività esterna. Alla ripresa richiesta
dall'utente, branch/HEAD/working tree e log sono stati ricontrollati prima della
chiusura, senza eliminare il lavoro pendente.

## Architettura e contratti

| File | Responsabilità R1B |
| --- | --- |
| `src/turnout-registry.js` (nuovo) | Registro immutabile derivato dalla rete selezionata; identità, ordine, porte, archi, stato richiesto, stati consentiti e profilo |
| `src/turnout-routes.js` | Modello parametrizzato dal registro; API storica `createTurnoutModel(network)` conservata |
| `src/turnout-commands.js` | Injection del registro, rifiuto di profili misti e Journey di altra istanza; confine di comando originario conservato |
| `tests/v06-r1b.test.js` (nuovo) | 38 test dedicati con due reti separate e verità esterna R1A |
| `tools/scenario-v06/audit-r1b.js` (nuovo) | Ammissione dati, inventario registri, hash rete legacy e verifica input/bundle |
| `tools/scenario-v06/check-r1b-scope.py` (nuovo) | Confronto byte di tutti i file preesistenti con R1A |
| Rapporto, evidenze, PROGRESS, STATUS | Consegna e unico gate successivo |

`createTurnoutRegistry(network)` verifica geometria tramite `validateNetwork` e
contratto locale dei controller: ID univoci, porte distinte/esistenti, archi
appartenenti alla stessa unità e copertura completa degli archi comandati,
`requiredState` strettamente booleano, matrice A↔B/A↔C o WX completa. Il profilo
legacy mantiene identità/ordine/porte/archi del canonico; V06 usa schema/layoutId,
namespace di archi/nodi/controller e stati S0/S1, N/X del dataset ammesso.
Sono rifiutati registri parziali, duplicati, profili misti e WX spezzati.

**Il registro non sostituisce l'ammissione indipendente del dataset.** Come in
R1A, il laboratorio deve chiamare `validateArtifact(bytes)` prima della factory;
questo verifica checksum, schema, provenienza e semantica contro l'oracolo
congelato. La validazione strutturale del registro da sola non certifica un
nuovo artefatto V06, né la polarità o il profilo fisico.

Ogni registro è associato all'identità della propria rete tramite WeakMap e
non mantiene uno stato globale di layout attivo. Il modello rifiuta un registro
di un'altra istanza, anche dello stesso profilo. Le cache delle selezioni restano
interne al singolo modello; porte, percorsi e punti esposti sono immutabili.
La rete e la configurazione sono read-only durante la vita dei consumer: un
reset di profilo crea nuove istanze; non è consentito mutare la topologia in-place.

`TURNOUT_IDS` e `isTurnoutId(id)` restano API di compatibilità **solo legacy**;
l'elenco è ora derivato dal canonico, non duplicato come otto stringhe nel dominio.
`isTurnoutId(id, registry)` usa invece il registro esplicito. Questi default non
costituiscono un lookup del layout attivo.

`registry.createSpecs()` restituisce nuovi record di stato: false per il default
legacy, **null per V06**, conservando l'UNKNOWN iniziale R1A. I booleani noti nei
test sono una configurazione del laboratorio; non una decisione di bootstrap.
`matchesSpecs` verifica l'intero insieme, senza dipendere dall'ordine della UI:
nessun ID extra/mancante/duplicato, porte, archi e tipo coerenti, profilo coerente
se dichiarato. Ciò distingue anche i WX-A/B omonimi dei due profili.

### Modello

L'algoritmo originario di selezione e ingresso locale è conservato, compresa
la proiezione read-only del vicino su un ingresso fisicamente esistente. Porte
con risultati localmente discordanti restano UNKNOWN. Nella lettura NETWORK,
se il router espone `controlState`, lo stato grezzo del target e dell'eventuale
unità di ingresso deve essere booleano: la coercizione storica del router non
può rendere percorribile uno stato sconosciuto. Router e Journey non cambiano.

Una porta inattiva nota è BLOCKED; un ingresso ambiguo, invalido, senza router
o con stato sconosciuto è UNKNOWN e non espone `activePaths`. `ROUTABLE` resta
connettività locale, senza implicare `UNLOCKED` o `SAFE`. Stato del percorso,
lock operativo e hazard del motore rimangono osservazioni separate.

### Comando

`createTurnoutCommands({...context, registry})` seleziona il dominio esplicito.
Senza registry conserva esclusivamente il default legacy. Ogni richiesta:

1. Verifica appartenenza dell'ID al registro e origine `panel`/`device`.
2. Rivalida l'intero insieme `switchSpecs`; con registro esplicito verifica
   anche che tutti i Journey appartengano alla medesima istanza di rete.
3. Esige uno stato booleano del dispositivo richiesto.
4. Rilegge `getSafety(controlId)` sincronicamente, senza snapshot persistente.
5. Autorizza solo `blocked === false` **e** `kind === 'unlocked'`.
6. Solo dopo il consenso cambia il booleano e riconcilia tutti i Journey con
   gli stessi parametri e nello stesso ordine del comando precedente.

I callback `route` e `getSafety` devono essere quelli del medesimo contesto
iniettato: non viene introdotto un sistema di autenticazione/provenienza delle
funzioni JavaScript. Gli algoritmi esistenti restano l'autorità di sicurezza.
Un'eccezione di getSafety continua a propagarsi senza cambiare stato/Journey.
Non vengono catturati errori per simulare un consenso.

## Registri e mapping

Inventario completo, incluse porte, ordine e archi con stato richiesto:
[`evidence/R1B/audit.json`](evidence/R1B/audit.json).

| Profilo | Ordine sorgente / ID | false | true |
| --- | --- | --- | --- |
| legacy | 0 Y-IN, 1 Y-R1, 2 Y-R2, 3 Y-3, 4 Y-4, 5 Y-2 | TO0/1/2/3/4/5:AB | TO0/1/2/3/4/5:AC |
| legacy | 6 WX-A, 7 WX-B | upper + lower | down + up |
| V06-R1A | 0 V06-C07 | V06-P035 A↔B | V06-P034 A↔C |
| V06-R1A | 1 V06-C12 | V06-P068 A↔B | V06-P030 A↔C |
| V06-R1A | 2 V06-C13 | V06-P069 A↔B | V06-P033 A↔C |
| V06-R1A | 3 V06-N07 | V06-P031 A↔B | V06-P032 A↔C |
| V06-R1A | 4 V06-N14 | V06-P041 A↔B | V06-P042 A↔C |
| V06-R1A | 5 WX-A | V06-P059 UL↔UR + P060 LL↔LR | V06-P012 UL↔LR + P013 LL↔UR |
| V06-R1A | 6 WX-B | V06-P061 UL↔UR + P062 LL↔LR | V06-P016 UL↔LR + P017 LL↔UR |

Le abbreviazioni P* nella tabella appartengono tutte al namespace `V06-`.
Nessun alias dei semplici legacy è aggiunto. Il codice Kato 20-222 del C07
conserva la geometria Y: i booleani non ne certificano le etichette rettilineo/deviato.

## Verifiche e regressioni

| Controllo | Esito |
| --- | --- |
| Baseline R1A prima delle modifiche | 298 Node, 9 JMRI, build PASS |
| Suite finale completa | **336/336 Node PASS = 298 preesistenti + 38 R1B**, zero fail/skipped/cancelled |
| JMRI, build e rigenerazione canonico | **9/9 PASS, build PASS, quattro artefatti canonici senza diff** |
| Registro/identità | Otto legacy, sette V06, ordine esatto, due WX per profilo, nessun controller fittizio |
| Modello e verità indipendente | 64 WX (16 permessi/48 vietati), 90 semplici/Y (20/70), ogni ingresso/uscita e booleano |
| Ingressi sul router reale | Legacy: 256 configurazioni ×28 ingressi = **7.168**; V06: 128×25 = **3.200**; inclusi vicini chiusi |
| Journey V06 | **38 attraversamenti** ammessi di unità completa e ritorno inverso con posizione ripristinata; incluse alternative C12/C13 |
| Comandi autorizzati | 15 controller ×2 stati ×2 origini = **60 casi**, confronto integrale con sequenza storica e identità conservate |
| Rifiuti | ID/origine invalida, stato non booleano, safety mancante/malformata/unknown/occupato/avvicinamento: nessuna mutazione né reconcile |
| WX interi e occupazione | Ogni arco interno, anche inattivo, in entrambi gli stati, treno e carro sganciato: intera unità bloccata |
| Avvicinamenti | Ogni ingresso reale compatibile e i due stati, nei due versi fisici, su entrambi i profili; guard e margini originali |
| Richieste consecutive | panel→device e device→panel: primo consenso, secondo blocco con nuova occupazione/approccio/unknown e nuova lettura safety |
| UNKNOWN | Stato grezzo target/vicino, ingressi ambigui e snapshot incerto del motore; nessuna promozione a ROUTABLE |
| Isolamento | legacy→V06→nuovo legacy, cache/punti/record distinti, callback del solo contesto comandato; registri e Journey estranei rifiutati |
| Preservazione | **4.148 file preesistenti protetti byte-identici**; unici sorgenti preesistenti cambiati: routes e commands |
| Bootstrap/bundle | `app.js` invariato, **zero input V06** negli 85 input; default rete legacy invariato |

I test di avvicinamento usano gli stessi margini e la stessa `siteSafety`:
allineano il target e gli eventuali vicini e, per lead più corti di 70 mm,
costruiscono il Journey a ritroso attraverso il giunto. Non allungano le rotaie
né riducono le protezioni. Un caso incerto usa un corpo corto dichiarato per
isolare UNKNOWN dall'occupazione della fascia di 30 mm.

Fallimenti iniziali del nuovo harness conservati: conteggio V06 presunto 24
invece dei **25** ingressi effettivi (anche C13.B ha due alternative); inizializzazione
a 70 mm su lead più corti; target adiacente lasciato disallineato; successivo
vicino esterno non allineato nella costruzione retrograda del Journey legacy.
Risolti correggendo le fixture e allineando gli ingressi compatibili. Nessuna
asserzione delle suite precedenti o regola di sicurezza è stata modificata.

Rete legacy serializzata: **533.232 byte**, SHA-256
`ec5c0309f3b7aee5e8af9a996b0bd3b5b3bd03d31ee732cc75286bc2b0904413`, identica a R1A.
Dataset V06 immutato: SHA-256
`4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7`.
Bundle: **1.095.990 byte**, SHA-256
`9eaa6b7273bc8597040a24febae71334c0f08cefd4f384151ff458f4543e2a66`,
+3.600 byte rispetto a R1A, per il contratto di dominio; non si dichiara bundle identico.

## Dipendenze grafiche e operative rimandate

Questa matrice è un inventario del codice effettivo, **non un mandato di modifica**.

| File / riferimento | Dipendenza residua / gate futuro |
| --- | --- |
| `app.js:144`, `:285–288`, `:472`, `:579–580` | Bootstrap legacy, otto ID/UI e default/reset tutti false; futura injection unitaria rete/registro/stati con reset di sessione |
| `src/turnout-picking.js:47`, `:65` | Iterazione e priorità sul TURNOUT_IDS legacy; geometria/quote legacy |
| `src/turnout-interaction.js:13` | Focus valida col default legacy; mount riceve l'ordine del bootstrap |
| `src/turnout-glow.js:106`, `:119` | Costruzione degli otto dispositivi e validazione ID legacy, profilo/offset grafico |
| `src/turnout-arrows.js:44`; `src/turnout-arrow-view.js:6`, `:10` | Iterazione/whitelist legacy, etichette/direzioni e quote da adattare soltanto nel gate visuale |
| `src/turnout-arrow-approaches.js:6` | Osservatore già parametrico; dipende da rete/topologia/Journey coerenti e lookahead 600 mm, nessuna whitelist fissa propria |
| `src/ui/sidebar.js:34`, `:43`, `:136` | Ordine derivato dal bootstrap, etichette Straight/Diverging da verificare per C07 Y; nessuna modifica V2.1 |
| `src/next-switch.js:17`, `:47–48` | Topologia già derivata dai controller, quattro archi WX protetti; nomi Inner/Middle/Outer e confini fisici/fouling da ricertificare |
| `src/next-switch-view.js:7`, `:77` | Quota ribbon 8,4 mm ed etichette straight/diverging; nessun elenco fisso di otto nel renderer HUD |
| `src/train-deck-state.js`; `src/ui/sidebar.js:83` | ViewBox/mappa e presentazione della rete nel relativo gate, non modificati qui |
| `src/scenic-plan.js:1`, `src/zone-layout.js:5`, `src/landscape.js:1` | Import diretto del canonico e coordinate sceniche legacy; non consumare V06 prima del gate dedicato |
| `app.js` spawn/missioni/rotaie; `src/rail-profile.js` | Anchor/capienze, reset, ruoli, quota/contatto, 150 mesh e scenografia rimangono fuori R1B |

Non sono stati modificati dataset R1A/R02/canonico, factory, router, Journey,
fisica, guard, collision prevention, frenatura, UI/HUD/minimappe, picking/glow/
frecce/renderer, scenografia, asset, Auth/Supabase/backend, dipendenze o workflow.
Nessuna nuova chiamata di rete applicativa, credenziale o dipendenza introdotta.
Il confronto blob include anche tutti i test preesistenti. Le sole operazioni
remote di scrittura autorizzate sono branch dedicato e nuova Draft PR.

## Uso esplicito, rischi, rollback e prossimo gate

```js
// Solo laboratorio Node, dopo validateArtifact(bytes).
const network = createNetwork(JSON.parse(bytes));
const registry = createTurnoutRegistry(network);
const model = createTurnoutModel(network, registry);
const switchSpecs = registry.createSpecs(); // V06: on === null, comandi bloccati
// Configurare nel laboratorio stati booleani noti, poi costruire route,
// switchTopology, trains e getSafety tutti da questa medesima rete.
const commands = createTurnoutCommands({registry, switchSpecs, trains, route, getSafety});
```

`physical_profile_certified:false` e `runtime_circulation_verified:false`
sono conservati. Il PASS dimostra contratti e algoritmi nel laboratorio Node;
non certifica fouling/sagome, manovra completa, polarità, capienza N07/N16,
anchor di arresto, asset mobili o circolazione nel gioco.
Browser/UI V06, nuova regressione browser legacy, performance hardware,
collisioni/manovre V06 complete e backend live **NOT VERIFIED** in R1B. Nessuna
immagine o prova storica viene presentata come nuova evidenza visuale.

Rollback: chiudere le istanze isolate e ricreare il contesto legacy, senza
trasferire Journey, stati, callback o cache. Il bootstrap corrente è già legacy.
Per confronto del solo delta, usare la baseline R1A indicata; nessun revert
su main o modifica alla produzione è stato eseguito.

**Proposta, non eseguita:** R1C — audit e contratto dei consumer ferroviari
(spawn/reset/anchor, ruoli/itinerari, cache di sessione e dipendenze UI), con
perimetro e prove assegnati dalla Regia prima di qualsiasi attivazione.
La prossima azione resta il **Quality Gate indipendente R1B**. Il checkpoint
atomico e la nuova Draft PR contro il branch R1A sono verificati nella ricevuta
finale con URL/branch/SHA effettivi. **STOP R1B; nessun merge/deploy o R1C.**
