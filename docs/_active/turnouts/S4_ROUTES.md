# S4 — Percorsi rossi selezionati

La richiesta S4 approva ufficialmente **B — Soft Conformal Glow**. L'app usa B per default, con gli stessi parametri e lo stesso shader S3. A rimane solo come opzione esplicita per riprodurre i confronti storici; nessun nuovo controllo permanente. Le prove S3 restano immutate.

## Significato e convenzione

**Rosso = itinerario impostato, NON via libera.** Lo stato locale S1 decide quali percorsi sono rappresentabili. Il rosso non prenota, non autorizza, non modifica il router, la Journey o le protezioni. Blu = identità del dispositivo; i due layer restano indipendenti.

Senza un treno in avvicinamento con velocità effettiva nota, ciascun percorso ha una traccia ferma e due piccole punte opposte. Questa convenzione bidirezionale evita di rappresentare come illecito il passaggio inverso. Vale anche per il percorso di un WX non interessato dall'avvicinamento e per osservazioni concorrenti con versi opposti sullo stesso percorso.

Con provenienza determinabile, il percorso interessato conserva solo la punta rivolta verso l'uscita effettiva. La direzione usa il segno della **velocità reale**, non il comando di inversione ancora da completare. In retromarcia si osserva la Journey in corrispondenza dell'ultimo veicolo e del suo respingente anteriore nel verso di movimento. Nessuna scelta del treno selezionato prevale arbitrariamente sugli altri.

Una provenienza bloccata non aggiunge un ramo: restano soltanto i percorsi effettivamente impostati. Se il contratto S1 restituisce UNKNOWN per stato/configurazione o ingresso osservato, l'intero dispositivo non mostra frecce. Quando la previsione Journey è incerta, non se ne deduce un verso: rimane la convenzione bidirezionale dei percorsi locali conosciuti. Ciò descrive il dispositivo e non risolve un itinerario globale incerto.

## Contratto puro e osservazione

`src/turnout-arrow-view.js`: `turnoutArrowView(model, id, on, approaches, choose)`. Riusa esclusivamente `model.read(...).activePaths` e l'approccio NETWORK S1; nessuna seconda tabella di instradamento. Restituisce percorso immutabile S1, segno −1 / 0 / +1, provenienza `JOURNEY` / `BIDIRECTIONAL`, stato e incertezza. ID e distanze sono validati. Non restituisce una clearance.

`src/turnout-arrow-approaches.js`: osservazione read-only dei treni in movimento attraverso `traceJourney`, fino a 600 mm dal respingente di testa. Nessuna estensione/riconciliazione della storia. Treni fermi: convenzione bidirezionale. Il limite riguarda soltanto la presentazione, non lo spazio di sicurezza. La scansione si aggiorna al massimo ogni 150 ms, oppure al cambio di stato; è distinta dall'animazione del frame. Una commutazione rifiutata non cambia stato e non riavvia la comparsa.

## Geometria e rendering

`src/turnout-arrows.js`: venti nuove geometrie, una per ogni percorso fisico dei dispositivi, create una volta dopo il batching. Solo i dieci percorsi impostati sono normalmente visibili: sei semplici più due per ciascun WX. Vertici della traccia campionati dalla polilinea canonica, senza Bézier o giunti nuovi. I WX rettilinei mostrano upper/lower; in crossover down/up. Le due diagonali si incrociano graficamente ma non diventano un nodo ferroviario.

Traccia al centro fra le rotaie, quota 6,08 mm, larghezza 0,85 mm; punte lunghe 7 mm e semiampiezza 2,35 mm, arretrate di 6 mm alle estremità. Le bisettrici delle punte seguono la tangente locale della polilinea all’ancoraggio (campione simmetrico ±0,1 mm), anche sui rami curvi; non la corda degli ultimi 7 mm. La piccola quota evita coincidenza con traversine senza spostare alcuna mesh originale. Il feather è locale, senza luci o postFX aggiunti. Depth test attivo, depth write disattivato; mesh escluse dal raycast. Blu sui bordi e rosso fra le rotaie restano distinguibili.

Otto materiali, uno per dispositivo per animazioni indipendenti, con lo stesso shader condivisibile dalla cache programmi. Le direzioni per percorso aggiornano le uniformi prima del draw; nessun nuovo buffer a ogni commutazione. Parametri in `ARROW_CONFIG`: #EF5066, idle 0,58, comparsa 0,92, durata 340 ms, interpolazione smoothstep. La nuova selezione nasconde subito quella precedente e viene rivelata longitudinalmente. Nel caso bidirezionale la sequenza usa il verso canonico del percorso soltanto come riferimento temporale; nello stato finale rimangono entrambe le punte. Nessun moto continuo dopo la comparsa.

`prefers-reduced-motion` mostra immediatamente il percorso completo e fermo. Il listener già esistente aggiorna entrambi i layer. Il tick aggiunge soltanto `turnoutArrows.update(now)`. Nessun nuovo listener/RAF del modulo; pagehide libera venti geometrie e otto materiali una sola volta. La logica ferroviaria resta utilizzabile senza questo layer.

## Verifica e approvazione

[Rapporto S4](evidence/S4/REPORT.md) · [Galleria](evidence/S4/visual/GALLERY.md).

La resa visiva S4 richiede approvazione umana. S5, nuove frenate, STOP e audio non sono inclusi.
