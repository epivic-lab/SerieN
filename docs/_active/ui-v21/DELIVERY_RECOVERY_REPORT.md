# UI V2.1 — verifica e chiusura della consegna interrotta

Data: 2026-11-14, Europe/Rome. Repository esclusivo: `epivic-lab/SerieN`.

**PASS tecnico; pubblicazione già avvenuta e ora verificata.** Sito: **https://epivic-lab.github.io/SerieN/**.

## Stato recuperato e attività conclusa

Il checkout iniziale era pulito sul branch locale `work`, a `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`. La documentazione diceva ancora PR Draft e produzione invariata. La verifica GitHub e `git ls-remote` dimostra invece:

- [PR #8](https://github.com/epivic-lab/SerieN/pull/8) chiusa, non Draft e integrata in `main` con merge `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`.
- Checkpoint applicativo del branch `codex/ui-v21-visual-parity`: `217629c970c691c201ee8b1778b49c24bcff684d`, antenato del merge; i due alberi Git sono identici.
- [Workflow Pages 43313306675](https://github.com/epivic-lab/SerieN/actions/runs/43313306675), evento push del merge: `completed/success`, tutti gli step compreso Deploy Pages riusciti. Completamento il 12 novembre 2026 alle 22:46:17 Europe/Rome.
- HEAD remota `main` identica al checkout iniziale; nessun codice locale non salvato da recuperare.

La ripresa chiude verifica e documentazione, senza ricreare la correzione. È stato riaperto il branch già autorizzato dalla propria HEAD remota `217629c…`; non sono stati effettuati merge, push su main, workflow_dispatch o nuovi deploy. Questa constatazione non attribuisce retroattivamente il merge alla ripresa e non sostituisce un giudizio estetico indipendente della Regia.

## Controlli nuovi

Tutte le prove sotto sono nuove, sullo stesso albero applicativo pubblicato; Node v24.19.0, Python 3.12.14, Chromium/SwiftShader headless. Nessuna installazione o modifica delle dipendenze.

| Controllo | Esito / prova |
| --- | --- |
| Node | 254 PASS, 0 fail/skipped: [log](evidence/DELIVERY_RECOVERY/node-tests.txt) |
| Python JMRI | 9 PASS: [log](evidence/DELIVERY_RECOVERY/python-tests.txt) |
| Build | PASS: [log](evidence/DELIVERY_RECOVERY/build.txt); 1.092.265 byte, SHA256 `1ac2022b781311ca3fcc03e6373a55fc56c45eabd714c56694e7107d12352378` |
| Canonico | Rigenerato e confrontato con Git, nessun diff nei quattro output: [log](evidence/DELIVERY_RECOVERY/canonical.txt) |
| Pacchetto pubblico | 97/97 HTTP200 e byte-identici a checkout/build, 4.499.046 byte totali: [ricevute per-file](evidence/DELIVERY_RECOVERY/publication.json) |
| Protezioni | 138 file del manifest HUD_CAMERA_HOTFIX verificati tramite SHA256, zero differenze: [ricevuta](evidence/DELIVERY_RECOVERY/publication.json) |
| Browser HUD/camera | 11 gruppi PASS e 42 misure di intersezione camera/HUD/Bell tutte 0px²: [risultati](evidence/DELIVERY_RECOVERY/browser/results.json), [log](evidence/DELIVERY_RECOVERY/browser.txt) |
| Stato GitHub | PR, SHA e workflow/step verificati: [riepilogo API](evidence/DELIVERY_RECOVERY/github.json) |

La verifica dei 97 file deriva dall'esatta lista pubblicata dal workflow esistente: sei file root, `dist`, `assets`, `ui` e 24 documenti espliciti. Sono stati scaricati con soli GET e confrontati integralmente con il checkout e la build appena eseguita. Il totale è quello della versione correttiva attuale, distinto dal vecchio pacchetto REL002. [Script riproducibile](evidence/DELIVERY_RECOVERY/verify-publication.py).

Il browser esegue il test esistente `tests/browser-ui-v21-overlay-collision.py`, senza modificarlo, sul bundle reale locale: sei viewport 320×700, 375×812, 390×844, 430×932, 768×1024, 1692×877; preset Station/Overview/Yard/Follow, input trusted, ARIA/focus/Escape, 12 cicli, intenzione compact/expanded, resize/orientation, occupazione reale, Guarded Stop sopraggiunto, nodo warning originale e cleanup listener/ResizeObserver. Zero errori JavaScript e risposte HTTP fallite. Il bundle testato è byte-identico a quello scaricato dal sito pubblico. Bootstrap Auth esclusivamente localhost e RAF originale controllato: non è una sessione autenticata sul sito online.

Nuove catture: [Station mobile](evidence/DELIVERY_RECOVERY/browser/after-390x844.png), [Guarded Stop 320×700](evidence/DELIVERY_RECOVERY/browser/guarded-320x700.png), [Guarded Stop 390×844](evidence/DELIVERY_RECOVERY/browser/guarded-390x844.png). Le prime due sono state ispezionate direttamente nella ripresa. Nessuna dichiarazione di identità raster o prestazioni hardware.

## Invarianti, sicurezza e limiti

Nessun sorgente applicativo cambiato. Tracciato canonico, 150 rotaie, otto scambi/WX310, motore R1, HUD, Train Dock, M1/M2/M3, asset, CSS frozen, dipendenze e workflow conservati. La rigenerazione canonica è identica e i 138 file protetti corrispondono al manifest verificato. Nessuna nuova scansione della scena runtime delle 150 mesh: restano valide le prove storiche, distinte dai nuovi controlli.

La ripresa non cambia Auth, Supabase, RLS, persistenza o configurazione di produzione; nessuna credenziale è stata aggiunta alle prove. La suite browser usa soltanto il bootstrap locale già previsto. OAuth live, sessione autorizzata in produzione, GPU/touch/audio fisici, altri browser, screen reader, WCAG completa, benchmark prestazionali e audit 5E restano **NOT VERIFIED** in questa ripresa. Le matrici ferroviarie estese precedenti restano storiche; non vengono attribuite a questa esecuzione.

## Checkpoint e ripresa successiva

Modifiche: questo rapporto, prove nuove e intestazioni di `PROGRESS.md`, `STATUS.md`, `README.md`, `VISUAL_PARITY_REPORT.md`; contenuti storici conservati. Un solo commit documentale sul branch `codex/ui-v21-visual-parity`, seguito da push normale e confronto SHA locale/remoto nella consegna. Il suo SHA si risolve con `git log -1 --format=%H -- docs/_active/ui-v21/DELIVERY_RECOVERY_REPORT.md`, evitando autoreferenze nel commit. Il checkpoint documentale sul branch non cambia la pubblicazione `main` verificata sopra.

Comandi di controllo: `npm test`; `npm run build`; `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'`; `python3 scripts/build-canonical-layout.py`; `git diff --exit-code -- src/canonical-layout.json docs/jmri-layout/canonical-graph.json docs/jmri-layout/layout-canonical.svg docs/jmri-layout/minimap-canonical.svg`. Browser con server localhost: `SERIEN_URL=http://127.0.0.1:8051/ OVERLAY_OUTPUT=/workspace/work/delivery-recovery/browser python3 tests/browser-ui-v21-overlay-collision.py`.

Prossima attività: revisione indipendente della Regia sulla consegna. Nessuna nuova sottofase iniziata o dedotta dalla richiesta di ripresa.
