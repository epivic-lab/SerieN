> Analisi storica del 27 ottobre 2026. Lo stato attuale e le rettifiche sono nel [report di consolidamento](docs/consolidation/README.md); questo documento viene conservato per tracciabilità.

# Tracciato corretto: tre anelli, quattro tronchini, un runaround

Fonte fornita dall'utente: `3 anelli 4 tronchini 1 run around.pdf`, ricevuta
il 27 ottobre 2026. Sostituisce il PDF Fleischmann allegato per errore.
Documento di una pagina, esaminato visivamente e mediante estrazione del testo.
Il PDF resta negli allegati privati e non è stato inserito negli asset pubblici.

## Elementi leggibili

- Tre circuiti con curve marcate R249-45, R282-45 e R315-45.
- Due crossover WX310 nel rettilineo superiore, sfalsati tra le coppie di anelli.
- Deviatoi marcati EP718-15L/R e EP481-15L/R nel fascio interno.
- Curve R481-15 e rettilinei S248, S186, S124, S62 e S62F.
- Quattro terminazioni di tronchino. Rettifica dal successivo controllo XML/BOM: tre S62B-A espliciti; il quarto ramo A67 termina su S248 senza respingente fisico.
- Due percorsi del runaround da ricostruire attraverso i deviatoi effettivi,
  rispettandone posizione, orientamento e collegamenti nel disegno.
- Sul lato inferiore dell'anello interno compaiono 20-051 e 20-052, con un
  S124 centrale su un tratto spostato verso l'interno del plastico.
- Sagome di fabbricati nella metà inferiore e sul lato destro; non è presente
  un rendering prospettico dello scenario.

Le sigle sono trascritte dal documento; le geometrie ufficiali di catalogo
devono ancora essere verificate. Non trattare la trascrizione come una distinta
completa con quantità già validate.

## Differenze rispetto al simulatore attuale

1. Gli anelli non si possono rappresentare tutti con la stessa funzione
   `stadium`: quello interno ha un disassamento nel rettilineo inferiore.
2. La lunghezza dei rettilinei deve derivare dalla sequenza reale dei pezzi,
   non dalle coordinate 360 e 1140 fissate nel codice corrente.
3. WX310 e deviatoi del fascio devono essere componenti geometrici e operativi;
   i connettori disegnati separatamente dai percorsi dei treni non sono adeguati.
4. Le spline libere del fascio vanno sostituite con rette, archi e itinerari dei
   componenti indicati. Il PDF consente una ricostruzione molto più vincolata
   dello schema SVG attuale.
5. Pianta 2D e scena 3D devono derivare dalla stessa ricostruzione. Il vecchio
   SVG è un'approssimazione da sostituire, non una fonte autorevole.

## Precisione e prossima verifica

Il disegno non espone una quota esplicita del bordo del piano; non attribuire
automaticamente al PDF la misura 1500 × 700 mm presente nell'applicazione.
Le dimensioni della pagina PDF non sono dimensioni fisiche del plastico.
Usare le lunghezze nominali dei pezzi come riferimento per la scala, verificare
separatamente scartamento, interassi e chiusura di ciascun circuito.

Prima di dichiarare fedeltà millimetrica: ricostruire la distinta completa,
verificare le geometrie di catalogo, calcolare trasformazioni e connessioni,
e produrre un confronto sovrapposto alla pianta con errori dichiarati.

Questa acquisizione aggiorna i riferimenti del progetto. Non costituisce ancora
una modifica della geometria o della simulazione eseguibile.
