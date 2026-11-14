# V06 browser — evidenze della candidata

14 novembre2026. Bundle SHA256
`5ac4580ea02ab205d75914a7a9eda84a5203680077a8a31f8860ab7ac0612e32`.
567Node,9JMRI,build/canonico e19gruppi browser PASS. Questo è un verdetto
funzionale della candidata; **review visiva/prestazionale ancora aperta**.

## Galleria ispezionata

| Scena | Cattura |
| --- | --- |
| V06 desktop Low | [apri](v06-overview-low.png) |
| V06 mobile Low | [apri](v06-mobile-low.png) |
| V06 High,quattro treni | [apri](v06-overview-high.png) |
| Assi/riferimenti tecnici | [apri](v06-technical.png) |
| Picking/glow | [apri](v06-turnout-glow.png) |
| Ritorno a Legacy | [apri](legacy-rollback.png) |
| Errore integrità,nessun runtime | [apri](v06-integrity-failure.png) |

## Matrice browser effettiva

| # | Verifica | Esito |
| --- | --- | --- |
| 1 | V06 cold load and coherent identities | PASS |
| 2 | mobile and desktop surfaces | PASS |
| 3 | seven trusted panel controls, both states | PASS |
| 4 | seven trusted device picks | PASS |
| 5 | trusted mobile touch device command | PASS |
| 6 | technical toggle preserves railway state | PASS |
| 7 | three native consists moving on real browser core | PASS |
| 8 | four native RAF callbacks advance the engine | PASS |
| 9 | STOP ALL, vehicles, Journey and minimaps coherent | PASS |
| 10 | uncouple/couple identity and reverse | PASS |
| 11 | occupied WX rejects device command and disables panel | PASS |
| 12 | fourth locomotive moves through the real browser core | PASS |
| 13 | fourth complete locomotive and reset on V06 | PASS |
| 14 | Train Management project and Depot preserve physical fleet | PASS |
| 15 | High rendering | PASS |
| 16 | profile reload cancellation preserves session data | PASS |
| 17 | confirmed reload returns to coherent Legacy | PASS |
| 18 | confirmed session-data loss is explicit and complete | PASS |
| 19 | integrity failure has recovery and no partial runtime | PASS |

`browser-results.json` contiene osservazioni e distinzioni fra step diagnostico
sul core reale,interazione mouse/touch trusted e quattro callback RAF native.
La fixture sostituisce solo Auth nel contesto Playwright locale; il prodotto
non contiene tale bypass. Nessun PASS OAuth o Pages pubblicata.

`browser-integration.py` è la ricetta effettiva Cloud, server locale8022,
output temporaneo `/workspace/work/v06/browser-final-3`. Da root repository:

```sh
npm run build
python3 -m http.server 8022
# in altro processo, dalla stessa root:
python3 docs/_active/scenario-v06/evidence/V06_INTEGRATION/application/browser-integration.py
```

Non usare questa campagna come benchmark FPS: SwiftShader è molto lento con gli
originali densi. Il rapporto espone anche i valori sfavorevoli,senza estrapolarli
a GPU fisiche. Nessuna certificazione della meccanica degli scambi o delle sagome.

## Log e riproducibilità

- `node.txt`:567/567,zero fallimenti/salti.
- `jmri.txt`:9/9; `canonical.txt`:rigenerazione,senza diff dei quattro artifact.
- `build.txt`:esbuild; `preservation.json`:SHA/percorsi protetti/bundle.
- `original-assets.json`:13header/dimensioni/SHA,zero mancanti o invalidi.
- `focused.txt`:nuovi8test,ammissione/dispositivi/rotaia nominale eBVH equivalente.
- `prepare-site-exact.sh`:copia immutata del blocco Prepare site del workflow.
- `package.json`:113file/369.517.260byte,sotto1GiB;13HEAD200 e SHA della copia
  locale `_site`,dataset/lock/bundle identici. Nessun deploy.

I test storici restano invariati; nessun expected di sicurezza indebolito.
La prima fixture P012 su ramo WX inattivo era rifiutata correttamente;
la campagna finale occupa P059 selezionato per verificare il comando protetto.
