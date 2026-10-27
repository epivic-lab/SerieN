# Miniature dei locomotori

Sei PNG RGBA 320×160, con sfondo trasparente, generati dai modelli effettivamente
visibili nel simulatore mediante `scripts/capture-locomotives.py` e il renderer
principale. Inquadratura ortografica a tre quarti, illuminazione dedicata; nessuna
immagine generata per imitare un rotabile diverso. La geometria comprende il tender
quando presente nel modello originale.

- `native-*`: modelli procedurali originali di SerieN, dettagli in
  `src/rolling-stock-art.js`, corpi e materiali in `app.js`.
- `kenney-*`: derivati dai GLB Kenney Train Kit 1.1 già distribuiti in
  `assets/kenney`, licenza CC0. Autori: Kenney, Guus Vermeulen, Tony Schaer.
  Sono modelli stilizzati, mantenuti riconoscibili rispetto alla scena principale.
- `unavailable.svg`: segnaposto originale, usato soltanto quando la miniatura
  non può essere caricata.

`manifest.json` conserva dimensioni, ingombri e SHA-256 dei PNG e dei sorgenti.
Durante il gioco le miniature sono normali immagini memorizzate nella cache del
browser: nessun renderer WebGL aggiuntivo, animazione o render target per consolle.
Per rigenerarle, avviare `npm start` e poi `python3 scripts/capture-locomotives.py`.
