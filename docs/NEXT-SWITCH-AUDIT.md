# Next Switch HUD — analisi prima dell'implementazione

Il grafo corrente ha 33 archi con polilinee, lunghezze cumulative in millimetri,
estremi orientati e adiacenze. Journey conserva il percorso già attraversato;
routing seleziona gli archi secondo gli otto comandi. Questi dati permettono
misure lungo il percorso senza ricorrere alla distanza euclidea.

Mancano un registro dei punti decisionali e l'associazione esplicita dei comandi
ai nodi/porti. switchId sugli archi non basta: WX-A e WX-B hanno quattro porti
ciascuno, mentre i due gruppi dello scalo accorpano più comandi nello stesso nodo.

Estensione minima: registro esterno derivato dagli estremi esistenti, con nodi,
archi interni, comandi associati e nomi semantici delle uscite. Nessuna variazione
di network.js, simulation.js o delle otto identità dei comandi.

| Punto decisionale | Sorgente geometrica | Comandi |
|---|---|---|
| Crossover ovest | Estremi XA0/XA1 e rettilinei fra i porti | WX-A |
| Crossover est | Estremi XB1/XB2 e rettilinei fra i porti | WX-B |
| Accesso merci | lead.from | Y-IN |
| Bivio nord | lead.to = approach.from = upper.from | Y-2 |
| Gruppo ovest | approach.to, cinque connessioni effettive | Y-3 / Y-R1 |
| Gruppo est | right.from, tre connessioni effettive | Y-R2 / Y-4 |

I gruppi sono una limitazione della geometria attuale: non è lecito inventare due
deviatoi in sequenza né associare orientamenti Kato senza l'export costruttivo.
Gli schemi devono mostrare queste connessioni reali, inclusi i cinque rami a ovest.

La previsione deve leggere la Journey senza estenderla o modificarla. Se un
segmento futuro già memorizzato contrasta con la selezione attuale del router,
si segnala incoerenza e si ferma la linea prima del bivio. Nodi non catalogati con
più uscite, dati mancanti, terminali e percorsi ciclici hanno esiti espliciti.

Riferimento della distanza: centro del veicolo di testa nel verso di marcia;
in retromarcia è l'ultimo carro, con gli offset effettivi Kenney/native. Da fermo
vale la direzione impostata; durante la frenata per inversione vale il movimento
effettivo, indicando l'inversione richiesta.

Sicurezza: HUD informativo, nessuna azione sullo schema. Linea rossa = previsione,
mai consenso di via libera. Occupazione del corpo dello scambio e avvicinamento
entro il margine d'arresto devono impedire gli azionamenti dagli otto controlli
esistenti, con la stessa valutazione mostrata dall'HUD.

## Implementazione

- `src/next-switch.js`: registro dei porti, lettura del percorso, distanze lungo
  le polilinee, destinazioni locali e valutazione dei blocchi.
- `src/next-switch-view.js`: pannello non modale, schema derivato dalle connessioni,
  linea 3D sulle stesse polilinee. Disattivabile, si spegne dopo15secondi.
- Il tratto visualizzato termina a un terminale, a un ciclo già percorso oppure
  alla prima ambiguità/incoerenza. La ricerca ha un limite tecnico di12m/256archi,
  superiore al percorso necessario sul layout corrente.
- Il rosso indica l'itinerario previsto. I rami alternativi sono grigi. Nessuna
  valutazione costituisce un'autorizzazione di percorso libero o un comando Z21.
- I corridoi di protezione seguono gli archi: corpo intero dei WX310 e186mm
  conservativi sui rami dei deviatoi singoli (massimo nominale della distinta
  fornita), proseguendo attraverso nodi intermedi di grado2. Il margine dinamico
  aggiunge ingombro di testa,20mm,0.6s di reazione e spazio di arresto a100mm/s².
- I comandi laterali e il clic 3D passano dallo stesso controllo fresco, anche
  se lo stato di disabilitazione visuale non fosse ancora aggiornato. Lo schema
  dell'HUD è soltanto informativo.
- Su telefono il pannello parte minimizzato; espandendolo può scorrere al suo
  interno, senza coprire i comandi della camera o bloccare il plastico.

## Collaudo riproducibile

`node --test tests/next-switch.test.js`: tre anelli in entrambi i sensi, quattro
porti di ciascun WX310 e tutte le diagonali nei due versi, deviatoi merci e
combinazioni del nodo ovest, quattro tronchini e due rami runaround, offset del
carro di testa in retromarcia, cache Journey incoerente, nodi sconosciuti,
assenza di mutazioni, ingombri e avvicinamento, geometria della linea.

`python3 tests/browser-next-switch.py` contro `npm start`: usa posizioni reali
del grafo tramite diagnostica, router e comandi effettivi. Controlla selezione,
cambio direzione, passaggio Kenney/native, azionamenti ammessi/rifiutati,
schema composto a cinque rami, evidenziazione e scadenza, ingombri desktop/mobile.
La diagnostica non è presente senza il parametro `?diagnostics=1`.
