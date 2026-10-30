# S3 — Identità blu conformale

S3 implementa due proposte estetiche, ancora da approvare. S4 non iniziata.

`src/turnout-glow.js` dipende solo da Three e dal contratto puro S1. Legge tutti i percorsi canonici di ciascuno degli otto dispositivi, indipendentemente dallo stato impostato. Il blu identifica il dispositivo completo: non mostra l'itinerario selezionato, non concede transito e non decide la sicurezza.

## Geometria e materiali

Otto BufferGeometry nuove, create una volta dopo il batching statico. I bordi longitudinali seguono l'unione dei letti dei percorsi reali; i bordi interni sepolti in altri rami sono eliminati. Due accenti sottili sulle spalle delle rotaie mantengono leggibili anche i percorsi reali dei WX310. Nessun collegamento centrale, barra trasversale, pannello rettangolare o modifica a geometrie/materiali originali. Le estremità sfumano lungo i percorsi.

Un unico ShaderMaterial condiviso, senza luci aggiunte, texture, bloom globale o passaggi postFX. Test di profondità attivo, scrittura di profondità disattivata; blending normale e feather antialias. Le mesh non partecipano al raycast. Solo un dispositivo può essere illuminato; il cambio identità non incrocia due glow.

## Configurazione di revisione

Aprire l'app con `?turnoutGlow=A` oppure `?turnoutGlow=B`. A è solo il default provvisorio per la revisione, non una scelta estetica approvata. Nessun controllo permanente aggiunto alla plancia.

| Parametro | Comune / A | B |
|---|---|---|
| Colori | #37A8FA / #A9DDFF | identici |
| Periodo | 1400 ms | identico |
| Fade entrata/uscita | 160 ms | identico |
| Nucleo / feather | 0,42 / 1,05 mm | 0,55 / 2,5 mm |
| Opacità feather | 0,13 | 0,31 |
| Intensità minima pulsazione | 0,76 | 0,57 |

A — Precision Outline: contorno più sottile, discreto, con pulsazione contenuta.
B — Soft Conformal Glow: diffusione locale più ampia e presenza maggiore; stesso tracciamento geometrico.

Valori centralizzati in `GLOW_CONFIG` e `GLOW_STYLES`. Nessuna ricostruzione al cambio variante.

## Identità e ciclo di vita

`mountTurnoutInteraction` conserva il dispatcher protetto S1/S2 e notifica `onIdentify(id)` dal medesimo modello di focus. Hover fisico, hover plancia e tastiera convergono sull'identità comune. Un tap touch valido mantiene l'identità per 1100 ms e invia una sola richiesta al dispatcher esistente; scorrimento/orbita non commutano. Lo scambio occupato può essere identificato e resta protetto dalle guardie esistenti.

`createTurnoutGlow(scene, model, options)` espone `identify`, `update`, `setVariant`, `setReducedMotion`, `snapshot`, `dispose`. ID, preferenze, tempi e percorsi non finiti sono rifiutati. `update` riceve il clock del tick esistente, senza un nuovo RAF. In idle ritorna subito; nessuna allocazione GPU nel frame. `prefers-reduced-motion` è osservato dinamicamente: dopo il fade il glow rimane statico, guadagno 0,82.

Su pagehide vengono rimossi listener e timer dell'interazione, listener della preferenza, otto geometrie e materiale condiviso. Dispose è idempotente. Le 150 rotaie, 75 letti, materiali ferroviari, sicurezza, dinamica, Next Switch, Journey e ottimizzazioni 5D restano separati e invariati.

[Rapporto e limiti](evidence/S3/REPORT.md) · [Confronto visivo](evidence/S3/visual/GALLERY.md).
