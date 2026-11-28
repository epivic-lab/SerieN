# L02-H — audit e rilascio controllato Big Boy

27 novembre 2026. Autorizzazione esplicita Regia alla sottofase L02-H dopo il
checkpoint L02-G `abb26166a9b9e2708afc04bf112f0e15df859ba8`.
Main verificato `148b3d246b36759a8c06072a148a7ab19f24f908`, antenato del candidato.
Nessuna divergenza del branch dedicato. [PR #29](https://github.com/epivic-lab/SerieN/pull/29).

Audit di codice e risorse: PASS, dettagli in `audit.json`. Nessun intervento sul
runtime in questa sottofase; gli script browser accettano destinazione e directory
di prova per preservare le evidenze precedenti. Aggiunto `verify-release.py` per
confrontare i byte pubblici con la build e controllare l'Auth gate senza login.
Il link al rapporto nell'attribuzione usa GitHub: non dipende da documenti esclusi
dal pacchetto pubblico. Handoff permanente in `docs/rolling-stock/BIG_BOY_FINAL_REPORT.md`.

## Gate prima del merge

| Controllo | Prova |
| --- | --- |
| 589/589 test generali | `node-tests.txt` |
| 11/11 cinematici | `rig-tests.txt` |
| 9/9 JMRI | `jmri-tests.txt` |
| Build e hash cache | `build.txt` |
| Chiusura pacchetto: 68/68 risorse | `package.json` |
| Legacy/V06 sul pacchetto, STOP/inversione/protezioni | `packaged/browser.json` |
| Due cicli aggiunta/rimozione, GPU e caricamento differito | `packaged/lifecycle.json` |

Né branch protection né ruleset attivi risultano configurati su main al controllo.
Il merge ordinario della PR deve comunque attendere il workflow Linux
**Validate browser cache**, che rigenera la rete canonica, esegue JMRI, npm test e
build. Non si usa bypass amministrativo, auto-merge, force-push o push diretto a main.

## Pubblicazione e fonte dello stato finale

Il push su main prodotto dal merge attiva la configurazione Pages esistente.
La descrizione finale della PR conserva SHA di merge, URL del run di deploy,
esito e hash della verifica pubblica **successiva** al deploy. Questo commit
registra la qualifica precedente al rilascio, senza inventare SHA o risultati futuri.
La prova pubblica locale è salvata in `dist/l02-h-public/`, con screenshot del
cancello Auth e confronto byte-per-byte di bundle/asset/worker. I dati conclusivi
sono riportati anche nella PR, così rimangono verificabili sul remoto.

Comandi di riproduzione:

```sh
npm test
node --test scripts/big-boy/*.test.mjs
python3 -m unittest discover -s tests -p 'jmri_audit_test.py'
npm run build
# Su una copia delle risorse preparata come nel workflow Pages e servita a 8028:
SERIEN_URL=http://127.0.0.1:8028/ SERIEN_EVIDENCE=docs/_active/rolling-stock/evidence/L02-H/packaged python3 scripts/big-boy/integration-test.py
SERIEN_URL=http://127.0.0.1:8028/ SERIEN_EVIDENCE=docs/_active/rolling-stock/evidence/L02-H/packaged python3 scripts/big-boy/lifecycle-test.py
# Dopo deploy, nessuna fixture Auth:
python3 scripts/big-boy/verify-release.py
```

Invarianti e limiti: [rapporto permanente](../../../../rolling-stock/BIG_BOY_FINAL_REPORT.md).
Prossima azione: verifica e accettazione post-rilascio Regia L02-I; nessun nuovo
lavoro implementativo automaticamente autorizzato.
