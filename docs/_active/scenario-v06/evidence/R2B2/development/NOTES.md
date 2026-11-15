# Preparazione e diagnosi

La prima matrice ha completato i dieci casi S1 e poi rifiutato una nuova
aspettativa troppo forte: SAFE sul follower centrale prima del riarmo.
La diagnosi ripete i tre spawn s40/120/200 su P064, sign=-1, richieste20/60/80,
600 tick, STOP e riarmo40 del leader,180 tick, quindi riarmo40 del centrale.
Al tick780 il leader è ripartito ma il centrale conserva `reason:train`:
la richiesta pendente dell'ultimo follower e il suo inviluppo di sonda sono
ancora incompatibili con il corpo centrale fermo. Al tick781 il comando
esplicito del centrale produce subito +0,0125 mm e guard SAFE. Non è un
movimento spontaneo né un probe che impedisce una partenza compatibile.

Il test finale controlla lo stato effettivo, il progresso di ciascuno dei due
follower dopo il proprio comando, l'immobilità fino al comando e il fatto che
un eventuale allarme centrale abbia una richiesta posteriore ancora presente.
Tre permutazioni di ID/ordine e rilascio nel tick successivo all'arresto comune
o30tick dopo. Non sono cambiate soglie, aspettative geometriche o algoritmi core.

Il negativo di occupazione tentava `pop()` su un array congelato dalla sessione:
falliva prima del monitor. Corretto costruendo la copia diagnostica abbreviata;
il monitor rileva effettivamente la mancanza e allega precedente/corrente/input.
Il negativo finale altera anche il terzo rotabile del terzo convoglio.

Le otto prove near-touch hanno un leader mantenuto fermo: sono classificate
ARRESTO SICURO controllato, distintamente dai dodici casi WX di riferimento in deadlock.
La revisione dell'etichetta ha richiesto due nuove esecuzioni complete finali.
Nessun difetto sostanziale del core o penetrazione osservati.
