# Riproduzione locale 6B.1

Repo epivic-lab/SerieN, Node 24, Python 3.12, Chromium/SwiftShader e Playwright.
Non servono account di test reali o accesso Supabase per i test locali.

Dalla root del repository:

```sh
npm test
node --test --test-isolation=none tests/*.test.js
npm run build
python3 -m unittest discover -s tests -p '*_test.py'
python3 -m http.server 8000 --bind 127.0.0.1
```

In un'altra shell, da una directory scratch:

```sh
SERIEN_CONTROLLED_RAF=1 SERIEN_EVIDENCE=/tmp/serien-6b1-evidence \
  python3 /percorso/SerieN/tests/browser-capture-restore.py
```

Il test intercetta il solo bootstrap Auth su loopback e respinge richieste esterne.
Il vero callback RAF/tick viene eseguito con timestamp controllati. Il test
rigenera snapshot/JSON/screenshot, non sovrascrive prove storiche. Senza la
variabile SERIEN_CONTROLLED_RAF usa RAF ordinario e Playwright clock (più lento).

Le regressioni browser storiche 5C/Fase 0 precedono l'Auth gate: per eseguirle
senza credenziali, il runner locale intercetta `**/auth-gate.js*` su loopback e
carica `/dist/game.js`, mantenendo il resto della pagina e degli asset reale.
Questo harness non va pubblicato o aggiunto al bootstrap dell'applicazione.
Le due suite sono state eseguite dalla directory scratch:

```sh
PYTHONPATH=/percorso/harness-locale python3 /percorso/SerieN/tests/browser-phase-five-close.py
PYTHONPATH=/percorso/harness-locale python3 /percorso/SerieN/tests/browser-phase-zero.py
```

Le sei miniature sono state ricatturate con `scripts/capture-locomotives.py`
contro la build locale, in cwd scratch con link ai sorgenti/asset del repository;
PNG e bounds confrontati con il manifest prima di aggiornare il solo hash del
blocco sorgente modificato. Tutti i sei hash immagini e bounds coincidono.

Il file `source-manifest.json` registra hash dei sorgenti e del bundle verificato.
I checkpoint remoti sono verificati con push normale al solo branch autorizzato,
seguito da ls-remote/fetch e confronto SHA. Nessun test qui richiede deployment.
