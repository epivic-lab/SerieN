# S2 — Identità e picking dei dispositivi fisici

Baseline S1: `99b143c918e016f7e744217aa4c760fc9987deb9`, già verificata su `origin/feature/turnouts`. S2 è autorizzata esclusivamente; S3 non è iniziata.

## Confine con la ferrovia e con S3

Il modello e il dispatcher S1 rimangono invariati. `app.js` crea un `createTurnoutPicking(turnoutModel)` e monta `mountTurnoutInteraction` dopo l'UI iniziale. L'unica mutazione ferroviaria interattiva rimane `requestToggle(controlId, origin)`: pannello `panel`, dispositivo fisico `device`. Occupazione, avvicinamento e UNKNOWN restano governati dalle stesse guardie S1/5C.

S2 elimina base, stelo e sfera degli otto indicatori, i loro tre materiali dedicati, il vecchio lampeggio arancione e il relativo posizionatore. Non elimina lampioni, illuminazione scenica o altri oggetti autentici. Non aggiunge alcun effetto 3D visibile: niente glow, frecce, cartelli o audio.

## Aree di picking

`src/turnout-picking.js` legge **tutti** i `paths` canonici dal modello S1: due per ciascun semplice, quattro per ciascun WX310. Le vie non selezionate restano parte del dispositivo da identificare. Otto mesh indipendenti, una per ID, seguono i segmenti reali con semilarghezza 12,3 mm e piano y=6,08 mm (appena sopra la testa ferroviaria canonica a 5,95 mm). Nessuna regione rettangolare attorno all'intero deviatoio, nessuna curva inventata.

La root è invisibile e **non viene aggiunta alla scena renderizzata**. Le geometrie restano CPU-only: niente draw call, luci o materiali ferroviari sostituiti. I collider non partecipano alla simulazione o alle collisioni dei convogli. Nessuna scrittura su punti, trasformazioni, rotaie, traversine o letti ferroviari.

Il raycast sceglie la superficie del dispositivo più vicina. A parità di profondità usa la distanza dalla polilinea reale, poi l'ordine canonico `TURNOUT_IDS`, indipendentemente dall'ordine dei triangoli. Questo risolve anche le porte condivise Y-3/Y-IN/Y-2. Nel WX310 l'intersezione delle hit-area identifica il medesimo dispositivo; non crea alcuna connessione nel grafo.

Le superfici visibili della scena davanti alla hit-area la occludono. Una locomotiva resta selezionabile; un edificio o un carro impedisce il click attraverso la propria superficie. Elementi invisibili, materiali trasparenti a opacità zero e helper esplicitamente `pickThrough` non occludono. Solo l'anello di selezione e la preview di percorso preesistenti sono marcati pickThrough; nessun loro aspetto è modificato. I pixel occupati da HUD, toolbar e overlay DOM appartengono all'UI, verificata con `elementFromPoint`.

## Identificazione condivisa

`createTurnoutFocus` possiede esclusivamente `{active, source}`. Accetta solo gli otto ID canonici, non cambia posizione degli scambi o Journey. La priorità è keyboard → panel → device; il movimento del mouse passa dalla modalità tastiera alla modalità puntatore. Lasciare una superficie ripristina l'altra sorgente ancora attiva, senza due ID contemporanei.

- Hover sul dispositivo: identifica il comando corrispondente con un sottile contorno neutro nella plancia.
- Hover sulla plancia: stessa identità nel controller, in `canvas.dataset.turnoutId` e `picker.root.userData.activeControl`. In S2 **non appare un'evidenziazione 3D**: questo stato prepara il renderer S3 senza marker provvisori.
- Focus tastiera: equivalente identità. I pulsanti mantengono l'attivazione nativa; le celle dei controlli disabilitati diventano focusabili per consentirne l'identificazione, senza manovrarli.
- Touch: tap intenzionale sul dispositivo usa il dispatcher; niente hover persistente artificiale.

`?diagnostics=1` espone `turnoutInteractionState()` con active/source, numero regioni e presenza nella scena. Il vecchio nome diagnostico `indicatorState` / `snapshot.switchIndicators` rimane come alias di compatibilità per gli stati dei controlli, con `markers:0`; non contiene più riferimenti a sfere, colori o steli. HUD, minimappe e comandi flotta non cambiano.

## Gesti e durata delle risorse

`createPointerIntent` segue l'intero gesto: soglia 7 pixel CSS per mouse/penna e 10 per touch. Un drag che ritorna al punto iniziale resta un drag. Multitouch, swipe, pulsanti secondari, input non finiti, release senza down, pointercancel, perdita di cattura, blur e wheel non commutano.

La cattura deve essere realmente confermata da `gotpointercapture` prima dell'attivazione. Un rilascio della cattura ancora pendente non produce un click. Questa regressione è coperta da test Node e browser. La gestione non chiama preventDefault/stopPropagation e non sostituisce OrbitControls.

Il picking hover viene accorpato a una RAF solo quando arrivano eventi di puntatore o cambia la camera con puntatore nella viewport; nessun lavoro viene aggiunto al tick ferroviario. Non esiste polling idle dell'identità. Geometrie e materiali non vengono ricreati al cambio scambio o durante hover.

`dispose` è idempotente: cancella RAF pendente, catture, stato e cursore, rimuove listener DOM/controls; il picker rilascia otto geometrie e un solo materiale condiviso. La root fuori scena viene smaltita esplicitamente dal teardown applicativo. La prova Node ripete cento mount/dispose e controlla listener/RAF; il browser controlla risorse e inattività finale.

## Verifiche

- `tests/turnout-picking.test.js`: tutti i percorsi degli otto dispositivi, adiacenze/tie, binario ordinario escluso, occlusioni, selezione treno e dispose.
- `tests/turnout-interaction.test.js`: focus/hover, tap, drag, multitouch, input invalidi, cento cicli e regressione capture pendente.
- `tests/browser-turnout-contract.py`: geometria completa S0 e 16 coppie pannello/dispositivo nei due stati; il vecchio bersaglio marker è sostituito dall'asse canonico interno al dispositivo.
- `tests/browser-turnout-interaction.py`: hover bidirezionale, tutti i rami fisici, due zoom, mouse, touch CDP, tastiera, occlusione, locomotive e risorse.
- `tests/capture-turnout-baseline.py`: prima/dopo da bundle S1/S2, otto viste ripetibili, riferimento S1 con soli marker nascosti, materiali reali e piccolo campione RAF equivalente.
- Il test hover della Fase 2 è aggiornato all'identità condivisa: non richiede più un lampeggio di sfere che S2 rimuove intenzionalmente.

Risultati effettivi, comandi, immagini e limiti nel rapporto `evidence/S2/REPORT.md`. Nessuna pretesa di certificare touch/GPU fisici tramite Chromium/SwiftShader. Checkpoint finale esclusivamente su `feature/turnouts`; main richiede autorizzazione separata.
