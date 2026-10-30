# S3 — Confronto A / B

Immagini WebGL reali, camera e luce identiche nelle tre colonne. A: Precision Outline. B: Soft Conformal Glow. Nessuna variante è ancora approvata.

[Pagina comparativa HTML](index.html) · [Dati camera/luce](capture.json) · [Verifiche pixel](comparison.json)

## Y-IN semplice — giorno

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off Y-IN semplice giorno](candidate-Y-IN-48-off.png) | ![A Y-IN semplice giorno](candidate-Y-IN-48-A.png) | ![B Y-IN semplice giorno](candidate-Y-IN-48-B.png) |

## Y-IN semplice — notte

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off Y-IN semplice notte](candidate-Y-IN-95-off.png) | ![A Y-IN semplice notte](candidate-Y-IN-95-A.png) | ![B Y-IN semplice notte](candidate-Y-IN-95-B.png) |

## Y-2 semplice — giorno

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off Y-2 semplice giorno](candidate-Y-2-48-off.png) | ![A Y-2 semplice giorno](candidate-Y-2-48-A.png) | ![B Y-2 semplice giorno](candidate-Y-2-48-B.png) |

## Y-2 semplice — notte

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off Y-2 semplice notte](candidate-Y-2-95-off.png) | ![A Y-2 semplice notte](candidate-Y-2-95-A.png) | ![B Y-2 semplice notte](candidate-Y-2-95-B.png) |

## WX-A — giorno

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off WX-A giorno](candidate-WX-A-48-off.png) | ![A WX-A giorno](candidate-WX-A-48-A.png) | ![B WX-A giorno](candidate-WX-A-48-B.png) |

## WX-A — notte

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off WX-A notte](candidate-WX-A-95-off.png) | ![A WX-A notte](candidate-WX-A-95-A.png) | ![B WX-A notte](candidate-WX-A-95-B.png) |

## WX-B — giorno

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off WX-B giorno](candidate-WX-B-48-off.png) | ![A WX-B giorno](candidate-WX-B-48-A.png) | ![B WX-B giorno](candidate-WX-B-48-B.png) |

## WX-B — notte

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off WX-B notte](candidate-WX-B-95-off.png) | ![A WX-B notte](candidate-WX-B-95-A.png) | ![B WX-B notte](candidate-WX-B-95-B.png) |

## Vista generale — giorno

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off Vista generale giorno](candidate-overview-48-off.png) | ![A Vista generale giorno](candidate-overview-48-A.png) | ![B Vista generale giorno](candidate-overview-48-B.png) |

## Vista generale — notte

| Senza glow | A — Precision Outline | B — Soft Conformal Glow |
|---|---|---|
| ![off Vista generale notte](candidate-overview-95-off.png) | ![A Vista generale notte](candidate-overview-95-A.png) | ![B Vista generale notte](candidate-overview-95-B.png) |

## Pulsazione — 1400 ms

Tre fasi a 200 / 700 / 1100 ms dall’ingresso; camera e luce costanti. Con movimento ridotto la pulsazione è disattivata.

### Variante A

| 200 ms | 700 ms | 1100 ms |
|---|---|---|
| ![A 200 ms](pulse-A-200.png) | ![A 700 ms](pulse-A-700.png) | ![A 1100 ms](pulse-A-1100.png) |

### Variante B

| 200 ms | 700 ms | 1100 ms |
|---|---|---|
| ![B 200 ms](pulse-B-200.png) | ![B 700 ms](pulse-B-700.png) | ![B 1100 ms](pulse-B-1100.png) |

## Angoli e zoom aggiuntivi

[Dodici confronti da camere opposte e basse](../tests/views/views-materials.json), con le immagini originali nella stessa cartella. Zoom 0,8 e 1,2; entrambe le varianti su Y-IN, WX-A e WX-B. Materiali e texture ferroviari sono confrontati anche a runtime.
