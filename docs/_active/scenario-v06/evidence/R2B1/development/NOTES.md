# Preparazione e correzioni del laboratorio

Nessun difetto del core osservato; nessun sorgente applicativo corretto.

- Il primo cercatore di finestre WX escludeva tutti gli archi nascosti e cercava
  solo fino a450 mm. WX-A/P059 attraversa prima WX-B e poi archi nascosti R02:
  `No validated upstream window WX-A/V06-P059/1`. Rimosso il filtro estraneo al
  mandato; ogni posa/ingombro su tali archi resta validata, senza cambiare routing.
- Un primo approccio a distanze diverse sulle due vie X non produceva conflitto
  temporale. L'aspettativa `X diamond conflict prevented` non era giustificata:
  scelta una distanza comune sulle due vere rotte tramite Journey.ensure originale.
  Nessun cambiamento al motore, al clock o alle velocità per forzare una collisione.
- Il primo negativo width100 ammetteva correttamente il secondo veicolo, perché
  i candidati C/P064 e B/P065 sono separati66,027 mm e (100+16)/2=58 mm.
  Corretto il solo input del negativo a150: (150+16)/2=83 mm. Il rifiuto ora è
  geometricamente fondato. `focused-first.txt`:63/64; `focused-corrected.txt`:2/2
  (il negativo corretto e UNKNOWN del core). Le regressioni finali includono65
  test R2B1 senza skip, nessun test preesistente cambiato.
- Il primo oracolo racchiudeva cinque pose in un hull. Dopo una matrice55/55 e
  regressione477/477 PASS, è stato rafforzato: almeno17pose, tutti i vertici e
  cambi della tangente simmetrica, padding conservativo per l'intero intervallo.
  Questo risolve il limite di sola campionatura dell'oracolo. Le prove definitive
  e il determinismo sono rieseguiti sul monitor rafforzato; la dinamica del core
  resta identica. Il primo log completo è conservato come `first-full-node.txt`.

Questi errori di preparazione non sono collisioni osservate, fallimenti del core
né motivi per una correzione applicativa. Sono distinti dai11deadlock numerici
realmente osservati e registrati nelle evidenze definitive.
