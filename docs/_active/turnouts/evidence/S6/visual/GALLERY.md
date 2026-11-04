# S6 — evidenze visive e sonore

Immagini WebGL originali, geometrie e scenografia invariate. Le camere ravvicinate
sono del solo test (minDistance ridotta), non modifiche alla navigazione applicativa.
Occlusione scenica reale; nessuna modalità attraverso gli oggetti.

- [Home wide, notte](home-wide.png)
- [Follow Train, notte](follow-train.png)
- [Zoom STOP giorno](stop-day.png) · [notte](stop-night.png)
- [Due rischi simultanei, vista alta](two-risks.png) · [zoom sul secondo segnale](second-risk-close.png) · [un rischio residuo](one-risk-remains.png)
- [Reduced motion](reduced-motion.png) · [tutti rientrati](retracted.png)
- Emersione: [0ms](emergence-0.png), [200ms](emergence-200.png), [400ms](emergence-400.png)
- Rientro: [0ms](retraction-0.png), [150ms](retraction-150.png), [300ms](retraction-300.png)
- [Sequenza campionata](stop-sequence.gif): frame originali a clock controllato,
  non una cattura video realtime né una misura della fluidità hardware.
- [Campanello originale WAV](bell.wav): stesso DSP del runtime, un singolo colpo
  offline1s/48kHz; nel runtime ripete ogni1800ms finché un rischio resta attivo.

La telemetria [browser.json](../browser/browser.json) associa le pose ai due rischi
reali e documenta il ritorno a una sola guardia. Lo zoom con/senza segnale cambia5250
pixel effettivi, oltre all'asserzione di visibilità della mesh.
Ascolto su dispositivi fisici e approvazione estetica NON verificati automaticamente.
Attendere il giudizio della Regia su proporzioni, materiali, animazione e timbro.
