# S2 — Interazione sui deviatoi fisici

30 ottobre 2026. **S2 PASS. S3 NON INIZIATA.** Autorizzazione esclusiva S2, ricevuta dopo la correzione del prompt anticipato S3.

## Baseline e consegna

Repository `epivic-lab/SerieN`, branch **`feature/turnouts`**, HEAD iniziale **`99b143c918e016f7e744217aa4c760fc9987deb9`**, working tree pulito. Verificati fetch, coincidenza locale/remoto e ascendenza S0 `1071789` e S1 `99b143c`. `origin/main` osservato a `6487f61612818c8cd46d882741cfa1ca96ac5a16`; nessun merge, rebase, reset, force-push o deployment.

Il commit conclusivo S2 è quello che introduce questo rapporto: `git log -1 --format=%H -- docs/_active/turnouts/evidence/S2/REPORT.md`. SHA locale e verifica dell'effettivo checkpoint remoto sono forniti nella consegna dopo commit e push. Il checkpoint riguarda esclusivamente `feature/turnouts`; main resta un'operazione separata.

## Intervento e file

- `app.js`: rimossi gli otto gruppi base/stelo/sfera, tre materiali dedicati e vecchio feedback arancione. Conservati tutti i lampioni e gli oggetti scenici autentici. Picking e sincronizzazione montati dopo l'UI iniziale; stesso dispatcher S1, stessi comandi, guardie e riconciliazione Journey.
- Nuovi `src/turnout-picking.js` e `src/turnout-interaction.js`: otto hit-area conformi, occlusione reale, identità condivisa, mouse/touch/focus, cancellazione gesti e dispose.
- Rimossi `src/switch-feedback.js`, relativo test e posizionatore `controlMarkers` da `src/zone-layout.js` con il test ormai obsoleto. Nessuna modifica alle restanti funzioni di layout scenico.
- `style.css`: solo contorno neutro nella plancia per identificazione/focus; dimensioni e organizzazione intatte. Nessun effetto 3D provvisorio.
- Nuovi test Node/browser e catture riproducibili; test S1 e hover Fase 2 aggiornati ai dispositivi reali, senza richiedere le sfere eliminate. Aggiornati PROGRESS, STATUS e [contratto S2](../../S2_INTERACTION.md).
- `AGENTS.md`: aggiunto, preservando le regole esistenti, il protocollo permanente richiesto: una sottofase → test → commit atomico → checkpoint remoto verificato su branch dedicato → pausa → consenso. Nessuna pubblicazione automatica su main.

**Nessun glow, freccia, STOP o audio implementato. Nessun intervento a Supabase/backend/API/RLS, altri repository o dipendenze.**

## Picking e sicurezza

Le hit-area usano tutti i percorsi costitutivi del modello S1, anche quando non selezionati: due per semplice, quattro per WX310. Ribbons per segmento canonico, semilarghezza 12,3 mm, piano y=6,08 mm. Non vengono ricostruite rotaie o sagome visibili. Root fuori scena e invisibile: nessun upload/draw call del picker, materiale separato, nessuna collisione ferroviaria modificata.

Tie deterministico per profondità, distanza dalla polilinea e ordine canonico. Edifici, rotabili e altre superfici visibili davanti al dispositivo ne impediscono l'attivazione attraverso l'ostacolo. Locomotive ancora selezionabili; helper di preview/anello preesistenti non occludono. HUD e overlay DOM possiedono i propri pixel.

Hover/focus possiedono soltanto l'identità attiva. Dispositivo → contorno del comando, comando → stessa identità nel controller, canvas e root di picking, pronta per S3. In S2 non compare alcun contorno/glow 3D. Le celle disabilitate restano identificabili; la commutazione passa sempre da `requestToggle` S1 e può essere rifiutata. Hover non cambia scambi, Journey, prenotazioni o sicurezza.

Gesti: soglia mouse/penna 7 px CSS, touch 10 px; misurato anche il massimo spostamento durante il gesto, non soltanto la distanza finale. Multitouch, ritorno dopo drag, cancellazione, blur, wheel e capture perso/annullato non commutano. Conferma `gotpointercapture` obbligatoria nei browser con cattura supportata. Il caso della cattura rilasciata prima della conferma, individuato dal test browser, è stato corretto e coperto anche da regressione Node. Nessun preventDefault/stopPropagation aggiunto, OrbitControls conservato.

## Matrice di verifica

| Gruppo | Esito / prova |
|---|---|
| Baseline S0/S1 e checkpoint iniziale | PASS: locale/remoto coincidenti a S1, storia S0/S1 presente |
| `npm test` | **PASS: 161 test**, zero fallimenti/saltati; [log](node-tests.txt) |
| `python3 -m unittest discover -s tests -p '*_test.py'` | **PASS: 9 test JMRI**; [log](python-tests.txt) |
| `npm run build` | **PASS**; [log](build.txt) |
| Tutti gli otto controlli e i due WX | **PASS**, tutti i rami fisici, due zoom, entrambi gli stati nel test di equivalenza; [contratto browser](browser-contract.json), [interazione](browser-interaction.json) |
| Plancia/dispositivo e guardie | **PASS**, 16 coppie di vere azioni, rifiuti occupied e input invalidi; dispatcher/guardie S1 invariati |
| Hover bidirezionale senza effetti ferroviari | **PASS**, otto ID, controllo dello stato prima/dopo, venti rami fisici, identificazione univoca |
| Mouse/touch/tastiera | **PASS** per mouse, focus su otto comandi, touch CDP tap/swipe/pinch, drag-return/cancel/lost-capture/blur/wheel; **touch fisico NOT VERIFIED** |
| Occlusioni e selezione locomotive | **PASS**, test raycast indipendenti e browser con superficie visibile interposta |
| Listener e risorse | **PASS**, cento mount/dispose senza listener/RAF residui; otto geometrie e un materiale rilasciati esattamente una volta; root non renderizzata |
| Convogli, HUD, minimappe, missioni e responsive | **PASS**, 11 scenari 5C, circuito/manovre/HUD e quattro viewport; test Fase 2 cinque viewport, hover anche su occupato, grafica High giorno/notte e comandi reali; [regressioni](regressions.json) |
| Integrità geometrica | **PASS**, inventario completo 150 rail mesh + 75 letti identico a S0; canonico rigenerato senza diff |
| Materiali e massicciata | **PASS**, firme reali materiali/mappe e immagini WebGL; [camera/materiali](visual/capture.json) |
| Screenshot prima/dopo | **PASS**, otto confronti marker-only esatti; [galleria](visual/GALLERY.md), [comparatore](visual/comparison.json) |
| Prestazioni 5D preservate | **PASS nel perimetro S2**: fonti motore/ottimizzazioni intatte, nessun lavoro nuovo nel tick, confronto RAF breve entro budget; matrice completa 5D e hardware **NOT VERIFIED in S2** |
| Sicurezza minima | **PASS nel perimetro S2**; [controllo limitato](security.json), non sostituisce 5E |

I test sostituiti riguardavano esclusivamente sfere/lampeggio/posizionatore rimossi per richiesta. Nessun test ferroviario o oracle S1 è indebolito: rimangono anche i 7.168 ingressi sulle 256 configurazioni e le guardie reali per occupazione, sganciati e avvicinamento.

## Evidenza visiva e integrità

[Galleria prima/dopo](visual/GALLERY.md): overview, semplice Y-IN, WX-A, WX-B, ciascuno di giorno 48 e notte 95; Low, 960×820, DPR1, seed516. Camera e target effettivi registrati. Le immagini sono state ispezionate.

La prova isolante renderizza anche il **bundle S1 con i soli otto gruppi marker nascosti in test**: tale render è pixel-identico a S2 in tutte e otto le viste. Dimostra che non sono state cambiate geometrie, massicciata o altre superfici sceniche per accomodare le hit-area. Le PNG complete mostrano l'intera UI; le PNG `*-scene-*` sono readback reali del framebuffer, senza ricostruzioni o editing dell'immagine.

Le prime catture hanno individuato due problemi della strumentazione: lettura del framebuffer in un turno successivo (non conservato da WebGL) e differenza presente solo al primo fotogramma, eliminata con warm-up ripetibile delle luci. Il test finale legge nello stesso turno del render e riscalda entrambe le illuminazioni. L'overview diurna è stata riacquisita su entrambi i bundle dopo il warm-up; le altre sette coppie già coincidono esattamente. I minimi scarti di compositing del DOM non vengono spacciati per modifiche ferroviarie. Log delle iterazioni e cattura finale sono conservati con provenienza in commands.json.

Canonico SHA-256 invariato: **`e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`**. Grafo 70 nodi, 75 archi, quattro terminali. La prova delle 150 rotaie e 75 letti confronta ID edge/side, matrici/trasformazioni, bounding box, attributi/indici, estremi e controller con l'intero inventario S0 **prima del batching statico**. [Preservazione sorgenti](preservation.json).

## Prestazioni e limiti

Fonti byte-identiche a S1: router/Journey, protezioni 5C, modello/dispatcher S1, Next Switch/HUD, geometrie/profili/materiali/scenografia e dipendenze. In app.js `advanceFleet`, `renderVehicles`, `getSwitchAssistance` sono identici; il tick perde soltanto il vecchio aggiornamento dei materiali dei marker. Nel calcolo HUD cambia solo l'accessibilità tabIndex delle celle disabilitate.

Il picker prepara otto geometrie CPU una volta, riusa Raycaster/Vector2/array di risultati; non viene ricostruito al toggle. Il raycast hover è richiesto da eventi e accorpato a una RAF, sospeso durante il gesto. Nessun nuovo effetto globale, luce o costo ricorrente idle nel tick ferroviario.

Confronto breve S1→S2, stessa fixture e viewport 650×760, Low/day48/overview fissa, simulazione in pausa, 12 intervalli RAF dopo tre warm-up:

| Misura | S1 | S2 |
|---|---:|---:|
| p50 frame, ms | 1949,95 | 1966,55 |
| p95 nearest-rank, ms | 1983,30 | 2016,50 |
| Draw call | 367 | 343 |
| Triangoli | 468812 | 467756 |
| Geometrie GPU conteggiate | 364 | 340 |
| Texture | 45 | 45 |

p50 +0,85%, p95 +1,67%, entro budget 10%/15% della 5D nel campione equivalente. Una prima finestra era stata acquisita durante verifiche CPU concorrenti e non viene usata come confronto; il campione sopra è ripetuto senza altri test in parallelo. È un controllo breve SwiftShader, **non** una nuova esecuzione della matrice 39+39/1.488 frame della 5D, una misura di VRAM o una certificazione FPS hardware. Le 24 draw call/geometrie e i 1.056 triangoli eliminati sono quelli dei tre componenti dei vecchi otto marker; le nuove hit-area non entrano nel rendering.

Bundle finale e dimensioni in preservation.json. Nessuna nuova dipendenza. GPU fisiche, dispositivi touch reali e endurance browser di molte ore restano **NOT VERIFIED**. I limiti metrologici Kato già documentati non vengono ridefiniti.

Nota di occlusione: il filtro è geometrico e conservativo; non campiona le maschere alpha dei texel della vegetazione. Le superfici geometriche davanti al dispositivo possono quindi impedirne il picking anche in piccoli vuoti della texture. Tutti i venti rami fisici della fixture sono comunque verificati nel browser. La baseline S0 attiva usata dai test dovrà essere archiviata e i percorsi aggiornati alla chiusura S7, senza perdere queste prove.

## Pausa e checkpoint

Dopo completamento delle verifiche: un commit atomico S2 sul branch feature/turnouts, push esplicito solo a quel riferimento, verifica SHA remoto e ascendenza S0/S1/S2, working tree pulito e main invariato. In caso di divergenza/push fallito, STOP e segnalazione; nessuna integrazione automatica.

**Unica prossima azione: attendere approvazione esplicita S3.** Nessuna implementazione del glow o delle fasi successive è inclusa.
