> **Fase 0 chiusa su richiesta dell’utente.** Accettata la baseline software pubblicata al commit `d118de0`. I riscontri fisici ancora documentati sono mantenuti come limiti noti e attività successive; non sono presentati come verifiche eseguite. La [Fase 1](../phase-1/README.md) prosegue su questa base.

# SerieN · consolidamento funzionale Fase 0

La rete ferroviaria operativa deriva dall'XML originale, dal PDF RailModeller e dalla distinta Kato. Rendering, guida dei convogli, planimetria, tre minimappe, scambi e HUD leggono lo stesso modello canonico. Nessuna galleria.

[Planimetria tecnica SVG](../jmri-layout/layout-canonical.svg) · [Grafo completo JSON](../jmri-layout/canonical-graph.json) · [XML originale](../jmri-layout/source.xml) · [PDF originale](../jmri-layout/railmodeller-original.pdf) · [Dossier REV A](SerieN_Dossier_Tecnico_Codex_REV_A.pdf) · [Audit della ripresa](INTAKE.md) · [Collaudo browser](browser-result.json)

**La circolazione è verificata; la certificazione geometrica del plastico fisico resta aperta.** Il grafo non contiene collegamenti topologici irrisolti, ma l'export non descrive i profili interni dei moduli omessi. Questa versione non va qualificata come dima costruttiva o Fase 0 completamente accettata sul piano metrologico.

## Geometria e fonti

53 segmenti XML conservati: T0…T50 sono tratte positive; T51 e T52 sono connettori a lunghezza zero, contratti e registrati come alias. Sono conservati tutti i 56 punti e i sei deviatoi TO0…TO5 con le rispettive porte. Le sei unità aggiungono 12 percorsi interni: A–B normale, A–C deviato; B–C non è transitabile direttamente.

Due giunzioni di 2 mm, A55↔TO0:B e A60↔TO4:B, sono riconciliate con tangenti compatibili. Il parser richiede estremi reciprocamente più vicini, controlla le tangenti, rifiuta riferimenti/ID non validi e non collega incroci grafici. La tolleranza è parametrica (default 2,5 mm, obbligatoriamente inferiore a 10 mm); **33 mm non è una tolleranza di giunzione**.

I quattro pezzi omessi sono determinati congiuntamente da PDF, distinta e bocche XML: due 20-210/WX310, un 20-051 e un 20-052. Non sono connessioni scelte per sola vicinanza. T34 e T35 rimangono presenti, ricongiunti attraverso i due allargamenti. Risultato: **70 nodi, 75 tratte positive, una componente, quattro terminali, rango ciclico 6**. Il rango del grafo non è il numero degli anelli principali: include runaround e collegamenti trasversali.

Gli anelli conservano esattamente i raggi nominali **R249/R282/R315** e interassi nominali 33 mm. Le coordinate XML arrotondate al millimetro dei punti sulle curve sono ricondotte agli assi Kato a passi di 45°; ogni correzione, inferiore a 1,1 mm, è registrata in `reconciliation.nominalRadiusFits`. Anche le curve speciali conservano R481/R718: i piccoli adattamenti dell'angolo risultanti dagli estremi arrotondati sono registrati in `shape`, insieme all'angolo nominale. Non vengono usate spline estetiche per i binari.

Gli allargamenti usano due archi contrapposti R481, tratto iniziale da 42 mm rilevato sul PDF e tratto finale adattato alle bocche XML. Il disassamento arrotondato a 33 mm richiede un angolo di circa 15,0507°, anziché esattamente 15°. Questo piccolo fit è esplicito e non equivale a certificazione del pezzo.

Le diagonali WX310 impiegano un profilo arco–rettifilo–controarco ricavato da fatti numerici di un catalogo secondario XTrackCAD, adattato alle bocche 310×33 mm. Il catalogo stesso dichiara geometrie corrette/adattate: **questo profilo necessita di verifica su CAD del produttore o sul pezzo fisico**. La topologia dei quattro ingressi, le due posizioni e le connessioni sono invece verificate. Le diagonali si incrociano senza un nodo centrale.

Nel SVG: bianco = segmenti XML; ambra = percorsi interni/connessioni ricostruiti; rosa = profili ancora da certificare e terminali. I layer `explicit`, `inferred`, `profile-review`, `unresolved` permettono ispezione distinta; il layer delle anomalie topologiche irrisolte è vuoto. Tutti gli ID delle tratte positive sono presenti, T51/T52 sono annotati come giunti contratti.

## Coordinate e scala

Scala calibrata tramite S248 (24,8 unità), S124 (12,4), S62 (6,2) e interasse 3,3: **10 mm per unità XML**, con controlli indipendenti coerenti. Non è una deduzione dalle dimensioni della finestra JMRI.

```text
mondo X = 10 × (XML X − 30,3)
mondo Z = 10 × (XML Y − 99,3)
mondo Y = quota verticale del rendering
SVG/minimappa X = mondo X; SVG/minimappa Y = mondo Z
viewBox = 0 0 1500 700; preserveAspectRatio = xMidYMid meet
```

Equivale alla centratura di lavoro del dossier: X=63+10(Xxml−36,6), Z=35+10(Yxml−102,8). Ingombro assi 1374×630 mm su base nominale 1500×700. **L'origine sul tavolato è assunta centrata, non misurata fisicamente.** Il profilo delle rotaie e le traversine richiedono franchi oltre l'ingombro assi.

## Otto comandi riconciliati

| Comando | Sorgente | Pezzo | Funzione |
|---|---|---|---|
| WX-A | modulo omesso XML, quattro bocche A7/A43/A25/A8 | 20-210 | WX310 ovest |
| WX-B | modulo omesso XML, quattro bocche A40/A30/A42/A32 | 20-210 | WX310 est |
| Y-IN | TO0 | 20-202, EP718-15L | Accesso merci ovest |
| Y-2 | TO5 | 20-203, EP718-15R | Bivio tronchini ovest |
| Y-3 | TO3 | 20-220, EP481-15L | Accesso merci est |
| Y-R1 | TO1 | 20-221, EP481-15R | Runaround ovest |
| Y-R2 | TO2 | 20-220, EP481-15L | Runaround est |
| Y-4 | TO4 | 20-203, EP718-15R | Tronchino est |

Il fascio diagonale ha **due accessi distinti**. I vecchi gruppi a cinque rami non descrivevano questa topologia e sono stati rimossi. `continuing=2` dell'XML non è usato come stato attuale dello scambio: la sessione parte in normale e conserva lo stato nei comandi comuni al motore/HUD. Protezione: corpo del deviatoio/crossover, 30 mm sui rami incidenti, sagoma dei veicoli e inviluppo di avvicinamento. Non costituisce un interblocco per impianto reale.

## Tronchini e runaround

Il quarto terminale è **A67**, estremo del ramo T50+T49, confermato nel PDF. Il PDF/BOM ha tre S62B-A: A67 è un normale S248 senza respingente fisico. Il simulatore aggiunge il quarto arresto all'estremo esistente, senza prolungare il binario; `with-fourth-buffer.xml` cambia soltanto il tipo del punto A67. L'aggiunta fisica del respingente richiede aggiornamento della distinta.

Le catene, etichette dei pezzi, lunghezze geometriche fino alla prima porta e fino alla punta comune sono in `canonical-graph.json → terminals`. Il budget riportato sottrae, a scopo conservativo di pianificazione, 30 mm dalla prima porta e 10 mm dal respingente. **Non è una misura validata della lunghezza utile**: il punto di fouling e i franchi devono essere verificati con sagoma reale dei rotabili. Il budget è informativo: il motore arresta i veicoli in base alla sagoma completa prima dell’estremo del percorso, non applica quel budget come lunghezza certificata. Le vecchie quote indicative 47/53/19/65 cm non vengono riutilizzate.


| Terminale | Catena | Prima porta | Asse fino alla porta (mm) | Asse fino alla punta A (mm) | Budget simulazione, non certificato (mm) |
|---|---|---|---:|---:|---:|
| A67 | T50 + T49 | TO5:C | 373.90 | 561.98 | 333.90 |
| EB39 | T30 + T48 + T29 | TO5:B | 433.71 | 620.00 | 393.71 |
| EB49 | T37 + T38 | TO1:A | 124.19 | 124.19 | 84.19 |
| EB52 | T39 + T46 + T47 | TO4:C | 558.00 | 746.21 | 518.00 |

Il runaround principale è TO1:B–T40–A54–T42–TO2:B; l'alternativo è TO1:C–T43–TO4:A–TO4:B–T44–TO2:C. Le manovre fra i due rami richiedono inversioni sui rami comuni, senza attraversamenti B–C. Il breve ramo EB49 limita la lunghezza del convoglio che può liberare TO1: una locomotiva sola può manovrare dove un convoglio lungo non entra.

## Interfaccia e simulazione

Tre consolle operative mostrano gli ultimi tre convogli selezionati; `＋ Convoglio` aggiunge una quarta BR216 reale del simulatore, inizialmente ferma nel tronchino est. La sostituzione della consolle non modifica il convoglio nascosto. Bordo ambra per il selezionato, comando STOP TUTTI per tutti i convogli inclusi quelli nascosti. Arresti individuali, luci, direzione, aggancio/sgancio rimangono indipendenti.

Sei PNG trasparenti, ricavati dai modelli effettivi DB/Kenney, sono memorizzati con hash e provenienza; nessun renderer aggiuntivo durante il gioco. Ogni SVG riusa una sola definizione della geometria e proietta il centro reale della propria locomotiva. Il clic sulla mappa centra la camera, senza avviare un inseguimento permanente.

HUD compatto, trasparente e minimizzabile nel viewport 3D: percorre il medesimo grafo e router, usa la direzione effettiva durante la frenata e quella impostata da fermo. Schema derivato dai percorsi interni della specifica unità, destinazione omessa se indeterminabile, avvisi basati sulle effettive zone occupate. Nessuna interazione di azionamento sullo schema. L'opzione **Itinerario** nella barra della camera accende per 15 secondi una linea rossa sul percorso reale; un secondo clic la spegne. Non indica autorizzazione di via libera.

La scenografia si adatta ai binari: fabbrica ovest spostata fuori dal ramo A67; ponte riposizionato su un rettifilo semplice anteriore, anziché dentro il WX310 ovest. Posizione e opera sono scenografiche. Gli otto indicatori cliccabili sono collocati fuori dal corridoio ferroviario (almeno 25 mm dagli assi), anziché sulle nuove geometrie degli scambi; le coordinate topologiche restano invariate. Stazione, campagna, vegetazione autunnale e strumenti camera sono conservati. Nessun portale o copertura nasconde i treni.

## Riproduzione e accettazione

```sh
npm ci
python3 scripts/build-canonical-layout.py
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm test
npm run build
npm start
# In un secondo terminale con Playwright Python e Chromium:
python3 tests/browser-phase-zero.py
python3 tests/browser-train-deck.py
python3 tests/browser-consist.py
python3 tests/browser-smoke.py
```

I test Node verificano i tre anelli per più giri nei due sensi, raggi nominali, tutte le configurazioni dei comandi, crossover senza nodo d'incrocio, quattro terminali, inversione reale per il tronchino est, entrambi i rami runaround, continuità di posizione e tangenti, arresto prima dei respingenti con sagoma completa, cache dell'itinerario, HUD e identità delle minimappe. Il parser è verificato separatamente sui dati originali. I risultati browser sono registrati dal test soltanto dopo l'esecuzione completa.

Restano manuali: CAD/profilo fisico WX310, accettazione dei piccoli fit dei pezzi speciali contro il montaggio, origine effettiva sul tavolato, fouling e lunghezze utili, interazioni touch su tablet reale e prestazioni su GPU reali. Le prove responsive Chromium/SwiftShader non sono benchmark hardware né collaudi su iPad.
