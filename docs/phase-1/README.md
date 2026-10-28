# SerieN · Fase 1 — plancia compatta e interfaccia inglese

Fase 0 chiusa e accettata dall'utente sulla baseline pubblicata `d118de0`. I limiti geometrici e le verifiche sul plastico restano registrati nel dossier e nel rapporto storico, senza dichiarazioni di certificazione aggiuntive.

Questo incremento realizza la Fase 1 richiesta nel messaggio successivo: riduzione di almeno il 50% dell'altezza della plancia, interfaccia interamente in inglese e rimozione degli elementi decorativi indicati. Non modifica la geometria, il motore o l'ambientazione ferroviaria.

## Cambiamenti

- Miniatura reale della locomotiva e minimappa affiancate, slider su una sola riga e cinque comandi raccolti sotto: direzione, arresto, luci, sgancio e aggancio. Nome, tipo, stato e numero di carri restano leggibili.
- Restano le tre consolle dinamiche, la sostituzione per recenza, il quarto convoglio, il bordo ambra del selezionato, il focus della camera dalla minimappa e STOP ALL. I rotabili continuano la simulazione anche quando la loro consolle non è visibile.
- Tradotti navigazione, sidebar, comandi treno, HUD, nomi degli scambi, destinazioni, stati, missioni, registro operativo, conferme, messaggi di errore, tooltip, nomi accessibili, guida e visualizzatore tecnico. Gli identificativi XML rimangono invariati.
- Rimossi titolo/slogan sovrapposti al plastico, istruzioni permanenti nel viewport e contatori convogli/FPS. La diagnostica tecnica resta disponibile esclusivamente con `?diagnostics=1`.
- Barra camera spostata verso il margine inferiore ora libero. Nessun renderer o ciclo di simulazione aggiuntivo per le miniature.

## Misure e prove

La baseline è stata misurata nel browser sulla v0.8 precedente, con gli stessi viewport e tre/quattro convogli: [baseline-ui.json](baseline-ui.json). Il confronto riguarda **l'intera plancia, intestazione inclusa**, non solo le singole schede. I dati misurati dopo l'intervento e le schermate sono prodotti dal collaudo browser.

[Conservazione del grafo](railway-preservation.json): nodi, punti, tratte, raggi, lunghezze, connessioni, stati richiesti e porte scambi sono identici alla baseline. Nel modello canonico cambiano soltanto i testi visualizzati. I documenti e le vecchie acquisizioni restano archiviati nella lingua e nella forma originali.

I test controllano altezza dimezzata, miniature affiancate, comandi indipendenti, minimappe effettive, selezione fra quattro convogli, STOP ALL, testo inglese, accessibilità dei comandi compatti e assenza dei tre gruppi di overlay rimossi. La verifica responsive include desktop, tablet orizzontale/verticale, telefono e puntatore touch emulato; non certifica hardware tablet fisico.

## Esito finale v0.9

| Viewport | Plancia v0.8 | Plancia v0.9 | Riduzione |
|---|---:|---:|---:|
| Desktop 1440×1000 | 393 px | 183 px | 53.44% |
| Tablet 1024×900 | 393 px | 183 px | 53.44% |
| Tablet verticale 768×1024 | 453 px | 183 px | 59.60% |
| Telefono 390×844 | 509 px | 212 px | 58.35% |

Le stesse altezze sono confermate con quattro convogli. Con puntatore touch emulato a 768×1024 la plancia misura 189 px e tutti i pulsanti hanno altezza di almeno 40 px. Nessun overflow orizzontale della pagina. Su desktop il viewport 3D recupera i 210 px liberati dalla plancia.

Verifiche superate: 17 file di test Node, 9 test parser/fonti, collaudo browser della Fase 1 (testi inglesi, cinque comandi per treno, selezione, simulazione del convoglio nascosto, arresti, miniatura GLB, minimappe reali, route preview, focus camera, layout e touch). Nessun errore JavaScript. [Risultato browser](browser-result.json) · [Output Node](node-tests.txt) · [Output parser](parser-tests.txt).

La baseline accettata della Fase 0 è conservata dal tag `phase-0-accepted` sul commit `d118de0`. Non sono state modificate geometria, rete ferroviaria, motore di simulazione o composizione dei convogli. Gli asset storici e i documenti sorgente mantengono la propria lingua originale; l'interfaccia corrente e il visualizzatore tecnico sono in inglese.
