# S1 — Contratto interno degli otto scambi

Sottofase S1, baseline S0 `107178921bbc8049d855c0221b799444231120bb`. Questo documento descrive il contratto implementato; non autorizza S2 e non modifica la specifica v3.

## Autorità e confini

- `src/canonical-layout.json` / `src/network.js`: geometria, porte e archi canonici.
- `src/simulation.js:routing` e `Journey`: autorità per gli attraversamenti sulla rete. Invariati.
- `src/next-switch.js` / `src/railway-state.js`: proiezione del viaggio e guardie di occupazione/avvicinamento. Invariati, incluso `tracePoints:false` della 5D.
- `src/turnout-routes.js:createTurnoutModel(network)`: vista pura delle connessioni; consulta il router esistente. Non modifica grafo, stato, Journey, renderer o sicurezza.
- `src/turnout-commands.js:createTurnoutCommands(context)`: unico confine mutante per la richiesta interattiva; riusa guardie e riconciliazione esistenti.
- `app.js:requestToggle(controlId, origin)`: chiama il comando, poi aggiorna materiali/UI/log già esistenti. Il pannello passa `panel`; il picking dei marker passa `device`. Le future hit zone useranno lo stesso ingresso.

Reset e `diagnostics.setSwitches` conservano il loro comportamento preesistente; non sono nuovi percorsi interattivi di bypass.

## Stati e connessioni locali

`false` = straight; `true` = diverging. Ogni connessione indicata è bidirezionale; per un ingresso sul ramo inattivo il router restituisce misaligned. S1 conserva questa regola: non introduce tallonamenti o nuove regole di sicurezza.

| Controllo | false | true |
|---|---|---|
| Y-IN / TO0 | A ↔ B, TO0:AB | A ↔ C, TO0:AC |
| Y-R1 / TO1 | A ↔ B, TO1:AB | A ↔ C, TO1:AC |
| Y-R2 / TO2 | A ↔ B, TO2:AB | A ↔ C, TO2:AC |
| Y-3 / TO3 | A ↔ B, TO3:AB | A ↔ C, TO3:AC |
| Y-4 / TO4 | A ↔ B, TO4:AB | A ↔ C, TO4:AC |
| Y-2 / TO5 | A ↔ B, TO5:AB | A ↔ C, TO5:AC |
| WX-A | UL ↔ UR (upper), LL ↔ LR (lower) | UL ↔ LR (down), LL ↔ UR (up) |
| WX-B | UL ↔ UR (upper), LL ↔ LR (lower) | UL ↔ LR (down), LL ↔ UR (up) |

| Ingresso semplice | false | true |
|---|---|---|
| A | B / AB | C / AC |
| B | A / AB | BLOCKED |
| C | BLOCKED | A / AC |

| Ingresso WX310, ciascun dispositivo | false | true |
|---|---|---|
| UL | UR / upper | LR / down |
| UR | UL / upper | LL / up |
| LL | LR / lower | UR / up |
| LR | LL / lower | UL / down |

Un WX310 espone **due percorsi selezionati simultanei** in ciascuno stato. Nessun nodo al centro della X, nessun trasferimento da una diagonale all'altra. Porte e polilinee sono quelle canoniche, mai interpolazioni tra marker o centri grafici.

## API di lettura

```js
const model = createTurnoutModel(network);
const idle = model.read('WX-A', true);
const local = model.read('WX-A', true, {incomingPort:'UL'});
const actual = model.read('WX-A', true, {
  incomingEdge:'T5', incomingEnd:1, choose:route,
  operationLock:assistance.safetyByControl.get('WX-A')
});
```

`read(controlId, booleanState, context?)` restituisce un oggetto immutabile. Il contesto è opzionale; non possiede alcuno stato ferroviario.

| Campo | Significato |
|---|---|
| controlId, state, position | ID canonico riconosciuto, booleano corrente e straight/diverging/unknown. Nessuna coercizione di 0/1/stringhe/NaN a booleano. |
| routeStatus, unknown, reason | KNOWN/UNKNOWN e motivo. UNKNOWN non produce activePaths o percorso d'approccio fittizio. |
| ports | Nome porta → nodo canonico, copia immutabile. |
| paths | Tutti gli archi costitutivi reali: edge, fromPort/toPort, from/to in mm, points canonici copiati e congelati. |
| activePaths | Un percorso per semplice; due per WX310. Orientamento canonico di riferimento, non direzione inventata di un treno assente. |
| approach | null in idle, altrimenti ROUTABLE / BLOCKED / UNKNOWN. Se ROUTABLE: incomingPort, outgoingPort, edge, from/to, sign e points orientati ingresso→uscita. |
| approachScope | LOCAL_SELECTION oppure NETWORK. Il primo descrive soltanto il dispositivo, il secondo consulta l'ingresso reale nel router corrente. |
| operationLock, lockReason | LOCKED/UNLOCKED/UNKNOWN dalla guardia del motore. UNKNOWN senza osservazione valida; non dedotto dal percorso selezionato. |
| hazardStatus | SAFE/UNSAFE/UNKNOWN fornito dall'eventuale osservatore motore; default UNKNOWN. S1 non implementa il predittore S5. |

La topologia immutabile e i due stati locali sono preparati una volta; letture successive riusano polilinee e percorsi congelati. Lo stato corrente è sempre passato alla lettura: nessuna cache di posizione degli scambi, occupazione o Journey. La nuova vista non è invocata nel ciclo frame o nel passo di simulazione.

### Selezione locale e ingresso reale

Alcuni deviatoi sono direttamente contigui: Y-3:B con Y-IN:A; Y-IN:C con Y-2:A. Una porta può ricevere più archi esterni appartenenti al vicino. Per preparare la tabella **locale**, il modello interroga il router per ciascun arco d'ingresso, assumendo che quell'arco reale sia percorribile dal lato del vicino. L'assunzione vale solo per la tabella, non modifica lo scambio vicino e non autorizza un viaggio.

Per un treno concreto passare `incomingEdge`, `incomingEnd` (0 = estremo from, 1 = estremo to) e il `choose` corrente. Il modello controlla che l'arco sia esterno e tocchi la porta giusta, consulta il router e richiede coerenza con lo stato locale. Nessuna scelta del vicino viene forzata. Per esempio Y-2 può selezionare A↔B, ma un ingresso da TO0:AC con Y-IN straight restituisce **BLOCKED**.

`incomingPort` da solo offre la tabella locale; se è specificato anche l'arco deve coincidere con la porta derivata. Un arco mancante/interno, estremo non valido, porta estranea, router assente/indeterminato o snapshot incompatibile produce UNKNOWN. Non usare LOCAL_SELECTION per decidere il movimento. Il chiamante ricava la provenienza dal Journey/encounter, mai dalla distanza euclidea del marker.

### Separazione dalla sicurezza e dalla grafica

ROUTABLE significa solo connessione valida. Non significa binario libero, permesso di movimento o scambio manovrabile. Il lock osservato resta indipendente; un WX occupato può esporre due vie selezionate e operationLock LOCKED. `hazardStatus` non cambia instradamenti, lock o velocità; non viene calcolato dal colore, dall'hover o dal renderer.

`?diagnostics=1` espone `turnoutView(id, options)` per l'ispezione, con stato reale, router e guardia reali; espone anche `requestToggle` che passa dallo stesso confine protetto. Nessun hook di profiling entra nella build di produzione.

## API del comando

```js
const commands = createTurnoutCommands({switchSpecs, trains, route, getSafety});
const result = commands.requestToggle('WX-A', 'device');
```

- ID ammessi: esclusivamente i sei Y e i due WX canonici; origini ammesse `panel` e `device`. Tastiera sul pulsante resta `panel`.
- ID/origine/stato non validi sono rifiutati prima di consultare la sicurezza o riconciliare Journey.
- `getSafety(id)` viene invocato sincronicamente **a ogni richiesta**. È il motore a calcolare la guardia; il chiamante non può allegare un precedente stato unlocked al comando.
- Solo `{blocked:false, kind:'unlocked'}` permette la commutazione. Occupied, approaching, unknown, guardia assente o malformata rifiutano senza mutazioni ferroviarie.
- Successo: inverte il booleano esistente e riconcilia tutti i Journey con gli stessi tail, front e router, nello stesso ordine pre-S1. Non cambia velocità, odometri, identità, regole di movimento o semantica della riconciliazione.
- Ritorno successo: `{changed:true,controlId,origin,on}`. Rifiuto: `{changed:false,controlId,origin,reason,message}`. Rendering, materiali e messaggi applicativi rimangono responsabilità del wrapper in app.js.

## Verifica

`tests/turnout-routes.test.js`: oracle indipendente per otto controller, due stati e tutte le porte; verso opposto e attraversamento Journey; confronto con Next Switch; **7.168 ingressi su 256 configurazioni globali**; unknown/nonfinite; oggetti congelati; indipendenza di selezione, lock e hazard.

`tests/turnout-commands.test.js`: 32 transizioni panel/device confrontate con la precedente mutazione+riconciliazione; guardie reali per corpo occupante, sganciato e avvicinamento; rifiuti senza mutazioni; validazione e rilettura delle guardie.

`tests/browser-turnout-contract.py`: vere azioni su pannello e marker, entrambi gli stati di tutti gli otto controlli; blocco occupato e input invalidi; confronto esatto delle 150 rotaie e 75 letti con l'inventario S0. Richiede osservatore temporaneo documentato nella baseline S0, mai installato in dist.

Esiti di regressione, build, immagini e limiti sono nel rapporto `evidence/S1/REPORT.md` alla chiusura S1. Nessuna modifica S2 è inclusa.
