# S2 — Confronti prima/dopo

Bundle S1 e S2, medesimi seed, camera, illuminazione e qualità Low. Sono rimossi esclusivamente gli otto marker artificiali. Nessun glow, overlay o modifica ai binari. Cliccare le immagini per la dimensione originale.

| Vista | Prima (S1) | Dopo (S2) |
|---|---|---|
| overview, giorno | ![prima](before-overview-48.png) | ![dopo](after-overview-48.png) |
| overview, notte | ![prima](before-overview-95.png) | ![dopo](after-overview-95.png) |
| Y-IN, giorno | ![prima](before-Y-IN-48.png) | ![dopo](after-Y-IN-48.png) |
| Y-IN, notte | ![prima](before-Y-IN-95.png) | ![dopo](after-Y-IN-95.png) |
| WX-A, giorno | ![prima](before-WX-A-48.png) | ![dopo](after-WX-A-48.png) |
| WX-A, notte | ![prima](before-WX-A-95.png) | ![dopo](after-WX-A-95.png) |
| WX-B, giorno | ![prima](before-WX-B-48.png) | ![dopo](after-WX-B-48.png) |
| WX-B, notte | ![prima](before-WX-B-95.png) | ![dopo](after-WX-B-95.png) |

[Confronto automatico](comparison.json): otto render WebGL esattamente uguali al riferimento S1 con i soli marker nascosti. Le immagini `*-scene-*` sono readback reali dal canvas; il framebuffer è letto nello stesso turno del render. [Camera/materiali/timing](capture.json). Il primo fotogramma viene acquisito dopo warm-up della luce; i minimi scarti di antialias del DOM non vengono confusi con differenze ferroviarie.
