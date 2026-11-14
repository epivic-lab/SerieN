# V06-FINALIZE — prove e galleria

15 novembre 2026. Stessa PR #21; nessun merge/deploy. Il rapporto sintetico è
in [V06_INTEGRATION_REPORT.md](../../V06_INTEGRATION_REPORT.md), la sequenza
unica di pubblicazione in [RELEASE_PLAN.md](RELEASE_PLAN.md).

## Misure prima/dopo

[Dati completi](comparison.json), stessa fixture `measure.py`, Chromium
SwiftShader, 1440×900, tre composizioni native iniziali, qualità esplicita.

| | Prima | Dopo |
| --- | ---: | ---: |
| Triangoli Low | 10.272.270 | 3.259.097 |
| Draw call Low | 401 | 369 |
| Triangoli High | 18.062.253 | 11.909.778 |
| Moduli richiesti | 324.411.340 byte | 216.744.852 byte |
| Ready locale | 10,52 s | 8,37 s |
| Moduli + ferrovia | 8,59 s | 7,09 s |
| Intervalli di quattro callback RAF Low | 26,78 / 15,50 / 16,53 s | 3,20 / 3,40 / 3,90 s |

I conteggi strutturali sono confrontabili. I tempi osservati provengono da un
renderer software su host condiviso, con suite baseline/tool offline in parte
concomitanti: **non sono un benchmark GPU controllato, né FPS su hardware reale**.
La baseline High ha superato il primo timeout screenshot di 30 s: cattura
riuscita con timeout 180 s. Nessun errore applicativo in quelle misure.
Gli ultimi due ritocchi (default Auto Low desktop e selezione immediata senza
animazione/direzione di arrivo) non cambiano geometrie o materiali misurati;
sono verificati nel browser finale. I RAF del gioco sono controllati per la
fixture, salvo quattro callback originali esplicitamente registrati.

## Galleria reale, ispezionata

| Evidenza | Cattura |
| --- | --- |
| Low prima / dopo, stessa inquadratura iniziale | [prima](before-low.png) · [dopo](after-low.png) |
| High prima / dopo, stessa inquadratura iniziale | [prima](before-high.png) · [dopo](after-high.png) |
| V06 finale desktop / mobile Low | [desktop](v06-overview-low.png) · [mobile](v06-mobile-low.png) |
| Sette controller in S1/X | [plastico e pannello](v06-all-S1-X.png) |
| Scambi posteriori, WX Normal / Crossover | [S0/N](rear-S0-N.png) · [S1/X](rear-S1-X.png) |
| Scambio anteriore C07, due selezioni | [S0](front-S0.png) · [S1](front-S1.png) |
| High con quarto treno | [apri](v06-overview-high.png) |
| WX occupato, comando rifiutato | [apri](v06-WX-occupied.png) |
| Train Management / Depot | [apri](v06-train-management.png) |
| Assi e riferimenti tecnici | [apri](v06-technical.png) |
| Picking/glow | [apri](v06-turnout-glow.png) |
| Rollback Legacy desktop / mobile | [desktop](legacy-rollback.png) · [mobile](legacy-mobile-low.png) |
| Legacy, movimento e STOP desktop / mobile | [desktop](legacy-desktop-smoke.png) · [mobile](legacy-mobile-smoke.png) |
| Errore dataset / derivato, senza scena parziale | [dataset](v06-integrity-failure.png) · [derivato](v06-derived-integrity-failure.png) |

Le frecce rosse indicano la **selezione locale**, mai un'autorizzazione di
marcia. In V06 sono immediate e indipendenti da direzioni di arrivo incerte.
UNKNOWN spegne la selezione. La logica dei sette dispositivi, dei lock e dei
WX rimane quella esistente. Nessuna attestazione di meccanica AS-BUILT.

## Verifiche e limiti

- `after-node.txt`: suite esistente completa con i due nuovi test mirati.
  `after-focused.txt`: profilo/derivati/route band, raycast e regressioni frecce
  Legacy. `after-quality.txt`: adattamento qualità esistente.
- `after-jmri.txt`, `after-canonical.txt`, `after-build.txt`: JMRI, canonico
  rigenerato senza diff e bundle finale. `before-*`: baseline nuova esecuzione.
- `browser-results.json`: 21 gruppi, movimento reale nel core, tre composizioni
  oltre 7 m, quarto treno, sette panel nei due stati, sette device pick, touch
  trusted, WX occupato/rifiuto e bande conservate, agganci/UUID/inversione,
  TM add/remove, HUD/minimappe, High/Low, scenario menu/reload e rollback.
  Include zero richieste V06 su Legacy default e due errori d'integrità iniettati.
- `closeups-results.json` / `front-results.json`: inquadrature dai controlli
  camera reali, Auto Low desktop e smoke funzionale Legacy con tre treni in moto,
  otto controller, STOP e screenshot desktop/mobile.
- `after-original-assets.json`, `optimized-lock.json` nella cartella asset e
  `optimizer-reproduction.txt`: originali intatti e derivati rigenerati con hash
  identici. Matrici/istanze verificate dal builder; ingombri protetti e limiti
  sono registrati per modulo.
- `preservation.json`, `security.json`: inventario dei percorsi preservati,
  pin, bundle, controllo segreti sui nuovi testi; non è il futuro audit 5E.
- `package.json`: ricetta Pages eseguita solo localmente, sotto 1 GiB, asset
  copiati byte-identici e HEAD 200. `git-graph-before-final-commit.txt` registra
  i 16 prerequisiti; lo SHA finale è nella ricevuta remota della PR #21.

Un tentativo con due browser V06 concorrenti ha saturato gli 8 GiB Cloud:
`oom_kill=2`, entrambi i renderer terminati dal sistema. Log sfavorevoli
`smoke-concurrent-oom.txt` e `closeups-concurrent-oom.txt` conservati. La
verifica sequenziale, con un solo renderer V06 alla volta, non incrementa
quei contatori. Non si presenta il tentativo concorrente come PASS o come
misura dell'hardware dell'utente. Lo smoke finale è eseguito sequenzialmente.

Auth è sostituito **solo nella fixture locale**. OAuth live, GPU fisica,
dispositivi mobile fisici, altri browser e nuova pubblicazione Pages live
rimangono NOT VERIFIED. Non sono necessarie nuove campagne numeriche R2.
I deadlock sicuri preesistenti richiedono manovra manuale; nessun dispatcher.

## Riproduzione

Da root, dopo `npm ci` e `npm run build`, avviare
`python3 -m http.server 8022`. In un altro processo, **uno script alla volta**:

```sh
python3 docs/_active/scenario-v06/evidence/V06_FINALIZE/measure.py /workspace/work/v06-finalize/recheck
python3 docs/_active/scenario-v06/evidence/V06_FINALIZE/browser-smoke.py
python3 docs/_active/scenario-v06/evidence/V06_FINALIZE/browser-closeups.py
```

Il tool offline è documentato in
[`tools/scenario-v06/optimizer/README.md`](../../../../../tools/scenario-v06/optimizer/README.md).
L'output degli harness rimane in `work/`; le copie finali qui sono versionate.
**STOP al Quality Gate conclusivo Regia.**
