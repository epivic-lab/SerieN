# M3-A — Contratto deposito e verifica R1

Baseline approvata M2: `a67e0de7fa01a968152cf47af3a744ea39034bcc`, branch `codex/train-management-m2`; main di riferimento `184cc9b`. Entrambi gli HEAD remoti verificati e working tree pulito all'avvio. Mandato M3: A → B soltanto se isolata/sicura → C, poi STOP. L'autorizzazione specifica copre queste tre fasi, prevalendo sulle pause generiche tra microfasi di AGENTS; resta obbligatorio il checkpoint verificato di ogni incremento. Nessuna persistenza, release, main, deploy o E1.

## Cinque identità distinte

| Categoria | Identità / autorità | Posizione e disponibilità |
| --- | --- | --- |
| Modello catalogo | `modelId` dei 14 modelli M1/M2 | Definizione riutilizzabile; non è una disponibilità fisica. |
| Veicolo progettato | UUID di M2, nel progetto/bozza | Virtuale; ordine/orientamento progettati; nessuna posizione ferroviaria. |
| Rotabile fisico agganciato | `group.uuid`, posseduto da R1 | Sul convoglio reale; impegnato nella simulazione. |
| Rotabile fisico sganciato | Lo stesso `group.uuid` trasferito da R1 alla lista detached | Sul binario, con punto/Journey reali; non disponibile in deposito. |
| Record fuori scena | Nuovo ID `depot:<UUID>` e codice progressivo D001… | Inventario virtuale della sessione, senza group, UUID fisico, Journey o posizione. Disponibile o prenotato per la pianificazione. |

UUID fisici stabili durante aggancio/sgancio/cambio modello sullo stesso gruppo. Il reset può ricreare i carri mantenendo le locomotive; la generazione M2 invalida i vecchi riferimenti alla scena. Nessuna promessa di identità fisica attraverso reset/ricarica. M3 legge il nuovo insieme R1 a ogni aggiornamento e non conserva riferimenti ferroviari. Record di deposito e progetti M2 restano nella sessione dopo reset; non si associano automaticamente a gruppi fisici neppure se hanno lo stesso modello.

## Comandi effettivi verificati

- `src/fleet-commands.js`: velocità, stop, retromarcia, luci; sgancio in coda da fermo con stesso gruppo e Journey; aggancio da fermo di un veicolo vicino al retro, allineato, attraverso storia/router verificati e spazio sufficiente, massimo cinque rimorchi.
- `app.js:addTrain`: comando preesistente aggiunge soltanto una locomotiva specifica, al punto T47/80, con controllo conflitti e massimo quattro treni. Non accetta un ID di deposito o una composizione arbitraria e non è un contratto di trasferimento.
- `app.js:reset/removeWagon`: reset/manutenzione della simulazione, distruzione di geometrie e ricostruzione dei carri; non sono operazioni di deposito utilizzabili per ritirare materiale.
- `app.js:diagnostics.placeTrain` è diagnostica, non un ingresso ferroviario pubblico. Nessuno di questi ingressi sarà esposto o richiamato da M3.

Non esistono trasferimenti generici scena↔deposito, ritiro sicuro di un veicolo selezionato o materializzazione da inventario con identità conservata. Richiederebbero un contratto ferroviario separato su inserimento/ritiro, occupazione, Journey, collisioni e identità. **Entrata e uscita fisiche NON DISPONIBILI in M3.** Sgancio/aggancio R1 restano nelle console esistenti.

## Stati e transizioni autorizzate

| Transizione | Condizioni | Effetto |
| --- | --- | --- |
| Catalogo → nuovo record disponibile | Modello valido | Nuovo ID fuori scena; nessun oggetto 3D. |
| Disponibile → prenotato virtualmente | Posto di progetto M2 confermato, stesso modello, nessun'altra prenotazione sul posto | Riferimento `(projectId, vehicleId)` nel solo inventario. |
| Prenotato → disponibile | Rilascio esplicito | Rimuove solo il riferimento di pianificazione. |
| Prenotato → disponibile | Conferma M2 rimuove il posto o ne cambia il modello; progetto non più presente | Riconciliazione esplicita, con avviso. Nessun riaggancio automatico a modelli uguali. |
| Disponibile → eliminato | Record di inventario virtuale | Nessun effetto sui binari. |
| Prenotato → eliminato | Non ammesso: prima rilascio esplicito | Evita la perdita silenziosa di una prenotazione. |
| Fisico agganciato ↔ sganciato | Soltanto comandi R1 verificati | Restano entrambi sul plastico; inventario invariato. |
| Deposito ↔ scena | Non supportata | Controlli disabilitati, motivazione visibile. |

Un record può prenotare un solo posto; un posto può avere un solo record; modelli uguali non implicano la stessa identità. I posti di una bozza non confermata non sono prenotabili. Durante una modifica M2 si considera la versione confermata: annullare non rilascia prenotazioni; confermare può rilasciare riferimenti divenuti invalidi. Il riordino conserva l'ID del posto e quindi la prenotazione; nome e orientamento progettato non alterano la disponibilità del modello.

La prenotazione è una relazione di pianificazione, anche per progetti copiati dal reale: non sostituisce né riserva il `sourceVehicleId` fisico M2 e non dichiara il treno pronto ad essere applicato. Le categorie saranno etichettate nella UI. L'inventario virtuale si può rimuovere solo dalla sua sezione; le liste fisiche non hanno comandi di creazione/rimozione/assegnazione.

## Confine architetturale B

Store in RAM separato, con copie difensive. Legge copie dei confermati M2 per validare/rilasciare riferimenti, senza mutare il dominio M2; espone solo creazione, prenotazione, rilascio, rimozione e riconciliazione virtuali. Proiezione ferroviaria read-only tramite M1/M2. Nessun nuovo renderer/dipendenza, nessuna modifica al motore o ad app.js; riutilizzo della notifica reset M2 già approvata. Guard beforeunload esteso ai record di deposito. Dispose rimuove UI/handler; fine sessione perde l'inventario.

**Esito A: PASS del contratto isolato.** B è eseguibile nel mandato senza modifiche R1: l'intero perimetro è virtuale e le operazioni fisiche non disponibili. Nessun contratto di ingresso/uscita implementato implicitamente.
