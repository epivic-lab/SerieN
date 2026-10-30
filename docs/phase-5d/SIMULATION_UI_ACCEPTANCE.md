# 5D.3 e 5D.4 — Simulazione e assistenza

Codice candidato del checkpoint `5ae8ee9`; prove completate il 30 ottobre 2026. Questi risultati accettano l’equivalenza delle ottimizzazioni nei casi verificati, senza sostituire i gate finali frame/memoria della fase.

## Costo misurato

Benchmark sincrono separato dal frame, renderer fermato e coda GL drenata. Tre batch per scenario, stato ripristinato prima di ciascun batch; 10 chiamate di warmup per componente. Simulazione: 300 passi da 1/60 s per batch; assistenza: 60 letture per batch. Costi medi del batch, poi mediana dei tre risultati. Stessa rete, controlli, modelli e fixture nelle due revisioni. D usa quattro composizioni da cinque carri nell’harness, non modifica la produzione.

| Carico | Passo 5C → candidato, ms | Riduzione | Assistenza 5C → candidato, ms | Riduzione |
|---|---:|---:|---:|---:|
| B, un treno in moto | 0,5290 → 0,2167 | 59,0% | 0,3667 → 0,1850 | 49,5% |
| C, tre in moto | 0,8040 → 0,1753 | 78,2% | 0,2233 → 0,0667 | 70,1% |
| D, quattro composizioni lunghe | 4,5640 → 0,3663 | 92,0% | 0,3500 → 0,1333 | 61,9% |

Misure CPU isolate, non FPS né tempi di una GPU fisica. Non attribuire i microsecondi variabili del componente `deck`, rimasto invariato, ad un miglioramento del DOM.

## Equivalenza eseguita

- 130 casi Node passati, zero saltati/falliti: oracle SAT congelato 5C su 1.600 pose casuali riproducibili, rotazioni e contatti ai vertici/tolleranze; confronto delle traiettorie, velocità, odometri, storia e rollback del passo vecchio/nuovo, incluse quattro composizioni da cinque carri e casi frontali/inseguimento/parcheggiati.
- Trace completa confrontata con la 5C in 120 combinazioni di anello, verso, scambi e orizzonte. La proiezione interna senza punti conserva incontri, intervalli, distanze e highlight effettivo. API completa invariata per default.
- Matrice browser `browser-phase-five-close.py` passata: undici scenari con frontali, lunghe composizioni, sganciati al giunto, inserimento occupato, approccio allo scambio, agganci in curva/al giunto, equivalenza 20/60/120 Hz e frame irregolari, circolazione nei versi misti, crescita dei modelli e storie sganciate superate.
- `browser-phase-zero.py` passata: tre anelli nei due sensi, quarto treno e consolle LRU, entrambe le vie del runaround, STOP ALL, scambi/HUD reali; quattro viewport senza nuovi errori JavaScript o asset mancanti.
- Confronto visuale in movimento: stato completo e hash delle trasformazioni di tutte le gerarchie coincidenti nei due versi, con modelli nativi e Kenney.

Nessun throttling dei comandi, nessuna cache tra passi o letture HUD; nessuna modifica a instradamenti, occupazione, accelerazioni, limiti temporali o riconciliazione delle composizioni. Restano i limiti della 5C sugli inviluppi planari e sulla simulazione non certificata; gli oracle di equivalenza non costituiscono una prova matematica di ogni asset arbitrario.
