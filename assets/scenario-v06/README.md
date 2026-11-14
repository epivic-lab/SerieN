# V06 — originali e profilo browser opt-in

Tutti i13GLB originali di `SERIE_N_V3_SCENARIO_V06_V1` sono presenti:
364.551.328byte,headerGLB2/dimensioni/SHA verificati. I precedenti dodici file
sono stati spostati da asset-library senza alterarne i byte; l'ultimo modulo
railway_service_buildings è recuperato in questa integrazione. Nessun URL firmato.

`asset-lock.json` è il lock detached degli originali; `dataset.json` è la copia
byte-identica R1A per il browser. Il runtime verifica entrambi i pin e gli hash
prima del parse. Gli undici moduli scenografici sono caricati alla scala1000;
technical_reference è inizialmente nascosta. railway_visual resta come riferimento
immutato e NON è sovrapposto alla variante procedurale degli assi R02.

```sh
python3 tools/scenario-v06/check-local-assets.py --require-complete
npm start
```

Nell'app autenticata: Menu→Scenario→V06, oppure `?scenario=v06`. Tornare a Legacy
richiede conferma e ricarica una nuova sessione. La cartella viene copiata dalla
ricetta Pages esistente; nessun deploy è stato eseguito da questa integrazione.

La candidata richiede review Regia: dettagli meccanici degli scambi non certificati
e geometrie originali molto dense. Low riduce materiali/densità,non certifica FPS.
Rapporto: `docs/_active/scenario-v06/V06_INTEGRATION_REPORT.md`.
