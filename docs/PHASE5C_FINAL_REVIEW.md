# Verifica indipendente Fase 5C

Data: 29 ottobre 2026. Baseline verificata: `2a78abcfcbf12bdc0c95d21c00a8f5fa1f2689e4`, branch `reliability/phase-5c`, working tree iniziale pulito. Requisiti: sezione 5C di [ROADMAP_PHASE5.md](ROADMAP_PHASE5.md). Questa revisione non ripete l’implementazione e non autorizza la 5D.

**Esito: la 5C non supera ancora il gate completo della roadmap.** Le suite esistenti pertinenti passano, ma una prova frontale indipendente riproduce un arresto successivo alla sovrapposizione degli inviluppi; restano anche lacune operative. Non procedere alla 5D prima di una chiusura esplicita di questi punti.

## Copertura rispetto ai requisiti

| Requisito | Prova effettiva e limite |
|---|---|
| Tre anelli continui e percorribili | Node: tre giri per anello in entrambi i sensi, passi di 2 mm e continuità geometrica. Browser operativo: tre convogli simultanei per 120 s e altri 120 s in retromarcia, percorrenze e lane verificate. |
| Otto scambi e crossover WX310 | Node: ingressi/stati, diagonali bidirezionali, nessun nodo al diamante e continuità delle transizioni su 256 combinazioni. Browser: instradamento reale nel runaround e TO4/HUD. La prova di tutti gli ingressi controlla gli output **se presenti**, senza una tabella indipendente che obblighi ogni uscita lecita a essere disponibile. Matrice dinamica completa non coperta. |
| Quattro tronchini e runaround | Node: accesso dalla linea interna a tutti i terminali; entrambi i rami e versi del runaround. Browser operativo: ramo alternativo, inversione al toe, ramo principale e rientro in linea. Browser Fase 4 verde: arresti con locomotore corto su T30/T37/T39/T50, margini 38–48 mm. Il test browser dei terminali parte da posizionamenti diagnostici: non dimostra da solo l’intero viaggio dalla linea principale con ogni composizione. |
| Movimento simultaneo e versi opposti | Browser operativo: tre velocità indipendenti, tre anelli nei due sensi in due blocchi separati; quarto convoglio nascosto e STOP ALL. La prova frontale aggiuntiva esegue due locomotive in versi opposti sulla stessa tratta e rileva l’anomalia A1 sotto. Manca la matrice mista/di inseguimento con composizioni. |
| Occupazione e conflitti | R01: predicato simmetrico, edge adiacenti, caso perpendicolare e parallele a 33 mm. R02: carro realmente sganciato dal servizio comandi, storia indipendente e ranges su T47/TO4:AC. Safety: unit test occupazione e avvicinamento; browser: comando TO4 bloccato da locomotiva presente. Manca prova integrata del comando bloccato da **solo corpo sganciato attraverso il giunto**. |
| Inversioni e arresti | Node: limiti del convoglio al terminale e ribbon riconciliata. Browser Fase 4: ritorno alle posizioni iniziali dopo inversione; browser operativo: arresti individuali/globali, manovra di inversione nel runaround. Manca matrice di inversione vicino a ciascun terminale con composizioni lunghe e commutazione tentata mentre il convoglio si avvicina realmente. |
| Composizioni, aggancio e sgancio | Node: identità del gruppo trasferito, counts, ordine/offset, rifiuto distante/orientamento/capienza/spazio, layout compatto e crossover. La separazione geometrica su R249 non equivale a eseguire aggancio/sgancio in curva. Browser Fase 4: sgancio, allontanamento, rifiuto distante e ritorno/riaggancio. Manca il caso operativo in curva e la sequenza estesa con controllo identità di tutti i mezzi. |
| Plancia, minimappe e Next Switch HUD | Browser operativo: geometria SVG canonica, marker e mesh coerenti, cambio attivo/MRU, simulazione con consolle nascosta, distanza/uscita TO4, route highlight e scadenza. Unit test: 180 snapshot derivati e anteprime WX da ogni ingresso nei due stati. Non dimostra sincronia a ogni frame o dopo ogni tipo di conflitto. |
| Contratti, atomicità e frame rate | Node: input non finiti rifiutati senza corrompere Journey/clock; identità degli agganci e rifiuti. Test del frame rate: **solo FixedClock con accumulo di distanza**, non flotta/protezioni/scambi/UI. Il gate di indipendenza dell’intero motore dai frame rate resta non dimostrato. |

## Valutazione della copertura

La 5C dispone di prove sostanziali, ma la dichiarazione di completamento vale solo per i casi documentati. I gate della roadmap non risultano integralmente soddisfatti dalla sola suite verde. La prova frontale aggiuntiva è eseguita e fallisce il criterio di prevenzione; restano da coprire inseguimenti, richiesta simultanea della medesima tratta con composizioni, aggancio in curva, protezione da sganciati nei giunti e frame rate dell’intera simulazione.

Non sono state applicate correzioni funzionali, modifiche geometriche o dipendenze. Nessun intervento su `first` o `SerieN Control`, push o pubblicazione.

## Test realmente rieseguiti

- `node --test --test-isolation=none tests/*.test.js`: **109/109**, zero fail/skipped.
- `python3 -m unittest discover -s tests -p jmri_audit_test.py`: **9/9**.
- `npm run build`: **PASS**, bundle locale generato; nessun deployment.
- `tests/browser-phase-zero.py`: **PASS**, inclusi quattro viewport, asset GLB/miniature, nessun errore JavaScript o richiesta fallita.
- `tests/browser-phase-four.py`: **PASS**, operazioni ferroviarie, animazioni sincronizzate, quattro terminali, tre viewport e High/Low.
- `tests/browser-consist.py`: **PASS**, GLB reali, ganci/offset, sgancio-riaggancio, percorso avanti/indietro, ripristino nativo e reset.
- `tests/browser-phase-five-c.py`: **PASS**, rollback del cambio modelli impossibile e posizionamento invalido conservano i Journey precedenti.

I browser sono stati eseguiti contro la build locale con Chromium/SwiftShader. Il primo avvio concorrente di Fase 4/5C è scaduto nel caricamento o nell’attesa della diagnostica; ripetuti **senza cambiare gli script**, in sequenza, sono passati. I log iniziali sono conservati: non sono classificati come difetti ferroviari dimostrati. La copia temporanea `atomic-navigation-adapted.py` è stata preparata ma **non eseguita**.

Evidenze ripetibili: [phase-5c-review](phase-5c-review/), incluse asserzioni browser in JSON e log. Le schermate Low desktop e High shunter prodotte dalla suite sono state anche ispezionate visivamente; nessuna anomalia evidente nei campioni. Non è una certificazione visiva di tutti gli stati. Gli altri browser storici di scenografia e il confronto 5B contro v0.12 non sono attribuiti a questa esecuzione. Gli hash dei file canonici, topologia, rotabili, UI, dipendenze e workflow coincidono con la prova 5C precedente.

- Prova aggiuntiva indipendente [head-on-probe.py](phase-5c-review/head-on-probe.py): eseguita; raccoglie campioni e riproduce A1. Non viene conteggiata come test di prevenzione superato. Primo harness con BR216 legacy fallito per metadati ganci assenti, poi sostituito con due mezzi dotati di metadati espliciti; errore del harness conservato e distinto dal difetto applicativo.

## Problemi, gravità e proposte prima della 5D

**A1 — Alta rispetto al gate di affidabilità: arresto dopo contatto degli inviluppi.** Con app in pausa e modelli nativi, sganciare i carri di 0 e 2, collocare BR055 su T47 s=200 verso +1 e BR260 su T46 s=110 verso −1; comandare 100 a entrambe e campionare `api.step(1/60)`. Partono separate. Al passo 76 il margine fra estremità dei ganci è +1 mm; al 77 è −0,925 mm e le velocità sono ancora +57,75/−57,75 mm/s; al 78 vengono fermate con margine −2,875 mm (centri distanti 80,975 mm, estensioni verso il contatto 83,85 mm). Tutti i campioni sono in [head-on-probe.json](phase-5c-review/head-on-probe.json).

Questa è sovrapposizione degli **inviluppi definiti dai ganci**, non prova di compenetrazione delle mesh dettagliate. È un problema del criterio di prevenzione richiesto dalla roadmap. Ispezione coerente con l’osservazione: `advance` muove i treni prima del controllo; `updateTrainStatus` viene campionato ogni 0,08 s e arresta dopo che il predicato di conflitto diventa vero, senza ripristinare la posizione precedente. L’esito storico R01 partiva già da mezzi sovrapposti e verificava l’arresto: non poteva validare questo gate.

**Proposta circoscritta, non implementata:** aggiungere una regressione con inviluppi inizialmente disgiunti e margine minimo non negativo lungo tutta la manovra; valutare una posizione candidata prima di confermare il passo per tutti i convogli, oppure un margine predittivo coerente con movimento relativo e intervallo di protezione. Conservare l’ultimo stato disgiunto e verificare frontali/inseguimenti, mezzi fermi e attraversamenti WX; non basta aumentare una soglia geometrica senza controllare le parallele. Nessuna riscrittura generale necessaria.

**A2 — Media, lacuna di copertura:** aggiungere casi dinamici mirati per inseguimento/stessa tratta, composizioni corte e lunghe, aggancio-sgancio in curva, inversione vicino ai quattro terminali e tentativo di commutazione in avvicinamento. Integrare R02 con un test UI in cui soltanto il corpo del carro sganciato protegge lo scambio attraverso il giunto. Conservare identità, ordine, quantità, marker e HUD nelle asserzioni. Questi sono requisiti non dimostrati, non ulteriori bug già accertati.

**A3 — Media, qualità degli oracle:** il test “all eight switches route every entrance” può accettare un `null` anche per un ingresso lecito; aggiungere una tabella attesa indipendente per ogni ingresso/stato e l’attraversamento Journey corrispondente. Gli altri test dimostrano diversi percorsi reali, quindi questa debolezza non prova che gli instradamenti attuali siano errati.

**A4 — Media, gate frame rate non coperto:** confrontare stato ferroviario completo, arresti e UI con sequenze di frame definite (20/60/120 Hz e frame irregolari), invece del solo integrale del clock. Definire tolleranze e semantica del limite 0,2 s; non confondere questo controllo di affidabilità con l’ottimizzazione 5D.

Priorità proposta: regressione e correzione locale A1, completamento della matrice A2–A4, nuova verifica dei gate. Tutti gli interventi applicativi richiedono una successiva istruzione dell’utente. In questa revisione sono stati modificati soltanto rapporto, prove e stato documentale; nessuna pubblicazione.
