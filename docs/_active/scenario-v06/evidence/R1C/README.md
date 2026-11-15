# R1C — prove del laboratorio Node

Baseline `b8f4f3cb98a3c5f49aa8713a96d2c10b445fb67b`.
Branch `codex/scenario-v06-r1c-session-readiness`.
Solo R1C; nessun browser V06, avanzamento della nuova flotta o R2.

| File | Evidenza |
| --- | --- |
| `baseline-node.txt`, `baseline-jmri.txt`, `baseline-build.txt` | Nuova esecuzione prima del codice: 336/9/build PASS |
| `r1c-first.txt` | Primo harness: 28 PASS/2 FAIL per aspettative delle fixture, corretti nel test finale |
| `r1c-tests.txt` | Suite dedicata finale: 35/35 PASS |
| `final-node.txt`, `final-jmri.txt`, `final-build.txt` | Suite finale completa: 371/9/build PASS |
| `canonical.txt` | Rigenerazione canonico; confronto Git quattro artefatti senza diff |
| `audit.json` | Versioni/istanze, controller, candidati statici, bundle/rete legacy, import canonico e riferimenti dei consumer |
| `preservation.json` | Ogni blob della baseline confrontato; 4168 protetti identici |

Da root repository con Node24 e dipendenze dal lock:

```sh
npm ci
node --test tests/v06-r1c.test.js
npm test
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
python3 scripts/build-canonical-layout.py
git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg
node tools/scenario-v06/audit-r1c.js
python3 tools/scenario-v06/check-r1c-scope.py
git diff --check
```

Le durate e gli UUID di sessione cambiano a ogni esecuzione; i digest e le
proprietà verificate restano riproducibili. Il checker di scope verifica tutti
i file **preesistenti**; i nuovi file sono quelli espliciti del commit R1C.
I log non sostituiscono un audit indipendente della Regia. Nessun PASS di
circolazione/sagoma/fouling o screenshot browser viene dedotto da questi output.
