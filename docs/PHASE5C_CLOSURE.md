# SerieN — Chiusura Fase 5C

29 ottobre 2026. Repository `epivic-lab/SerieN`, branch `reliability/phase-5c`. Baseline di questa chiusura: `5060221`, rapporto indipendente sul codice `2a78abc`. Autorizzazione: «esegui tutte le operazioni di validazione, implementazione e test e chiudi la 5C». Nessun intervento su altri repository, push o deployment.

**Esito: 5C chiusa con la matrice di accettazione superata nelle condizioni documentate. 5D e 5E non iniziate.** Questo rapporto aggiorna l’esito storico di [PHASE5C_FINAL_REVIEW.md](PHASE5C_FINAL_REVIEW.md), senza cancellarne prove o anomalie.

## Correzioni e impatto

1. **A1, arresto tardivo — risolto.** Ogni passo fisso calcola velocità e Journey candidati dell’intera flotta, confronta gli inviluppi a inizio/metà/fine movimento e il loro inviluppo convesso, quindi conferma soltanto i movimenti ammessi. I rifiuti conservano posizione, segmenti di storia e odometro precedenti e fermano i mezzi coinvolti. Le proposte rifiutate vengono ricontrollate simultaneamente per proteggere anche i convogli che seguono. UI e missioni ricevono solo gli esiti confermati. Restano le velocità, accelerazioni e regole di instradamento precedenti; scompare il controllo successivo al movimento campionato a 0,08 s.
2. **Cambio modelli che introduce un conflitto — risolto.** La prova eseguita durante la chiusura aveva due locomotive compatte separate di 30,284 mm che diventavano sovrapposte di 23,85 mm passando al nativo. Ora il cambio controlla spazio, storia nota degli sganciati e coppie di inviluppi; un rifiuto ripristina modello, selettore e Journey, senza trasferire gruppi. I contatti preesistenti fra carri sganciati possono restare invariati o migliorare: una regressione intermedia ha mostrato che rifiutare indiscriminatamente ogni contatto bloccava anche il passaggio valido ai modelli compatti. La guardia finale confronta i margini prima/dopo e rifiuta conflitti nuovi o peggiorati. Una seconda prova ha riprodotto la crescita di un carro dopo una commutazione lecita: la vecchia storia suggeriva TO4:AC, ora disallineato. Il cambio viene rifiutato anche quando la storia contiene quel ramo, se il nuovo ingombro non coincide con l’instradamento corrente; nessuna occupazione viene inventata. I cambi accettati aggiornano immediatamente le mesh.
3. **Inserimento su area occupata da un corpo con centro altrove — risolto.** Il controllo del quarto convoglio considera anche gli inviluppi su segmenti adiacenti. Il carro con centro su TO4:AC che invade T47 impedisce la creazione del nuovo treno. Il rifiuto non crea né perde veicoli.

4. **Riaggancio al giunto con storia del treno incompleta — risolto.** Una regressione eseguita prima della correzione rifiutava il carro sul segmento adiacente: `locate()` bloccava la posizione attesa al limite della storia nota. Ora il matching estende una copia temporanea del Journey con il router reale prima di confrontare il centro; solo dopo verifica anche l’intero ingombro e conferma i segmenti. Lo scambio disallineato viene rifiutato senza modificare storia, gruppi o quantità. La prova browser ricostruisce intenzionalmente una storia corta e riaggancia la carrozza su TO4:AC conservando tutti gli UUID.

La partenza da un carro appena sganciato resta consentita se il contatto esistente si riduce; il ritorno si arresta prima di un nuovo ingresso nel corpo fermo e conserva la tolleranza di aggancio di 3,5 mm.

## Matrice richiesta: prove eseguite

| Requisito | Evidenza reale |
|---|---|
| Tre anelli e transizioni | Suite Node: tre giri per anello nei due sensi e assenza di salti; browser operativo: 120 s per senso. Nuova matrice browser: 90 s con convogli simultanei in versi misti, oltre un giro completo ciascuno. |
| Otto scambi e crossover | Nuovo oracle indipendente: 40 ingressi leciti e 12 bloccati, entrambi gli stati, uscita attesa obbligatoria, attraversamento Journey completo fino al binario esterno e ritorno. Node: due treni sulle diagonali di ciascun WX fermati prima della sovrapposizione; percorsi paralleli liberi. Conservati i controlli su 256 configurazioni e sull’assenza di nodo al diamante. |
| Quattro tronchini e runaround | Node: accessi dalla linea principale e rami del runaround nei due sensi; nuova matrice: arresto e inversione ai quattro terminali con locomotore corto e cinque carri, usando storie e instradamenti leciti. Browser Fase 4: arresti ai quattro terminali; browser operativo: ramo alternativo, inversione al toe, ramo principale e ritorno in linea. |
| Movimento simultaneo, frontali e inseguimenti | Nuovi test Node e browser con mezzi inizialmente separati, composizioni corte/lunghe, treno fermo, versi opposti e inseguimenti. Controllo del margine ad ogni passo. Test degli arresti a catena e dell’ordine di iterazione della flotta. |
| Occupazione e prevenzione conflitti | R01/R02/R03 rieseguiti. Nuovo browser: carrozza sganciata sul giunto, locomotiva allontanata, occupazione di TO4:AC e comando UI realmente bloccato; ripristino dopo riaggancio e sgombero. Inserimento adiacente rifiutato; crescita modelli pericolosa e uso di storia superata rifiutati. |
| Inversioni, scambi e terminali | Node: otto casi terminale/composizione con ripartenza in senso opposto; browser: inversioni reali, arresti individuali/globali, comando dello scambio rifiutato mentre il convoglio si avvicina, prima che il suo corpo occupi lo scambio. |
| Aggancio, sgancio e composizioni | Browser: manovra reale con allontanamento e ritorno su T0/T12/T16; UUID di tutti i gruppi, ordine e layout identici dopo il riaggancio, nessun carro perso o duplicato. Suite Kenney con GLB reali: ganci/offset, posizione del carro sganciato, ritorno e reset. Rifiuti e rollback conservati; riaggancio al giunto provato anche senza la vecchia storia del convoglio. |
| Plancia, minimappe e Next Switch HUD | Nuova matrice: marker SVG e mesh confrontati con il motore, velocità delle consolle e testo reale dell’HUD (treno, scambio, distanza, destinazione e avviso) confrontati con lo stato ferroviario. Browser operativo: quarto convoglio, consolle nascosta ancora attiva, selezione/MRU e STOP ALL; quattro viewport. |
| Casi limite, atomicità e frame rate | 20/60/120 Hz e frame irregolari per 12 s: stato ferroviario dei convogli (Journey, posizioni, velocità, direzione, odometro e layout), occupazione, HUD e testo delle consolle identici; lo scenario include frontale con arresto e altro convoglio in marcia inversa. Input non finiti rifiutati senza mutazioni. Browser atomico: modello senza spazio e posizionamento oltre il terminale rifiutati conservando i Journey precedenti. |

Non basta la presenza di una funzione: ciascuna riga rimanda a test eseguiti e asserzioni sui risultati. Le lacune A2–A4 della verifica indipendente sono coperte dai nuovi casi sopra, senza trasformarle in un refactoring generale.

## Risultati misurati e test

- **125 test Node passati**, 109 precedenti più 16 nuovi. Zero fallimenti o test saltati.
- **9 test Python JMRI passati**; `npm run build` riuscita.
- **Cinque suite browser passate**, inclusi undici scenari della nuova matrice: `browser-phase-five-close.py`, `browser-phase-zero.py`, `browser-phase-four.py`, `browser-consist.py`, `browser-phase-five-c.py`.
- Frontale A1: minimo **+1,000 mm**, due velocità nulle, contro −2,875 mm prima della correzione. Frontale lungo: **+0,800 mm**; inseguimento lungo: **+9,6125 mm**. Nessuna sovrapposizione degli inviluppi nei passi osservati dei casi preventivi, partiti separati.
- Cambio modelli rifiutato: rimangono **30,284 mm** di separazione e le identità/storie precedenti. Passaggio ai compatti consentito dopo sganci a contatto invariato.
- **36 moduli applicativi, zero cicli ESM statici.** Hash e confronti di sorgente confermano che geometria canonica, router, Journey/clock, HUD, plancia, costruttori dei rotabili, asset, dipendenze e workflow non sono stati modificati. Sono cambiati solo il coordinamento del passo, i controlli di conflitto/comandi e la diagnostica necessaria ai test.

Comandi, log, JSON e immagini verificate sono in [phase-5c-close](phase-5c-close/). Gli script browser sono stati eseguiti con cwd temporanea contro la build locale, preservando i report storici. La prima attesa `load` del browser atomico era scaduta nel runner software: lo script ora usa `domcontentloaded` con 120 s, conservando tutte le asserzioni applicative. Il timeout della regressione intermedia sui contatti è conservato separatamente e non è attribuito al runner: ha guidato l’affinamento della guardia.

## Gate, rischio residuo e recupero

**Nessun blocco noto residuo per la 5C nei casi della matrice.** Gli stati iniziali delle prove preventive sono separati; la diagnostica mantiene la possibilità di posizionare volontariamente mezzi in conflitto per riprodurre anomalie. Il motore non ripara automaticamente una sovrapposizione imposta dalla diagnostica.

La protezione usa inviluppi sul piano e una previsione entro il passo fisso massimo di 1/60 s; non è una simulazione certificata delle mesh articolate né una dimostrazione formale per geometrie arbitrarie. La sincronizzazione browser è verificata ai confini degli avanzamenti diagnostici e nei flussi operativi descritti. Restano i limiti metrologici già dichiarati su WX310 e rotabili. Nessuna certificazione di sicurezza ferroviaria fisica.

Il limite preesistente di 0,2 s per aggiornamento del clock è conservato e testato: uno stallo di 0,5 s avanza 0,2 s. L’equivalenza fra frame rate usa la stessa fase iniziale del clock, lo stesso tempo accettato e gli stessi comandi. Chromium/SwiftShader verifica il rendering software; non misura le prestazioni di una GPU fisica. La nuova previsione ha un costo di calcolo che andrà misurato nella 5D, soltanto su nuova autorizzazione.

Checkpoint movimento: `5580799`. Checkpoint guardie/modelli e matrice: `79247d3`; affinamento dei contatti: `b6ec62d`; verifica della storia sganciata: `13ebb2b`; riaggancio al giunto: `8cacb18`. Per rollback usare revert dei checkpoint in ordine inverso su working tree verificato, senza reset distruttivi; rieseguire suite e aggiornare il gate prima di una futura pubblicazione. Tutto salvato localmente, senza push/deployment o avvio della 5D.
