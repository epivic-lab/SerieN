# RELEASE R1 — RELEASED

Verifica post-deploy completata il2026-11-04. [PR2](https://github.com/epivic-lab/SerieN/pull/2), normale merge su main `348bfeff12c4005657098d89ea1d3c2ccdda9910`; [workflow Pages41842894645](https://github.com/epivic-lab/SerieN/actions/runs/41842894645) SUCCESS, inclusi checkout/npm ci/canonico/Python/Node/build/upload/deploy. [Metadati verificati](evidence/deployment.json).

Sito verificato: https://epivic-lab.github.io/SerieN/ . Bundle effettivamente scaricato **ed eseguito dalla pagina**, cache disabilitata: SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`, identico alla ricostruzione S7 e diverso dalla precedente versione5D. Il parametro storico v0.12.0 e quello fresco restituiscono entrambi il bundle nuovo. Nessun tag o semver inventato. R1 identifica questo rilascio, package resta0.12.0.

## Prove sul sito pubblico

[Risultato completo](evidence/public/result.json), [desktop con guardia](evidence/public/public-stop-desktop.png), [mobile](evidence/public/public-mobile.png). Test eseguito senza sostituzione del JavaScript e senza profiler: sei modelli GLB caricati; nessun errore JS, HTTP o richiesta fallita; comandi mouse Y-IN e WX-A cambiano stato; glowB visibile e itinerari frecce1/2 coerenti; approccio Y4C vietato termina in GUARDED_STOP con velocità0 e STOP geometrico visibile; una voce globale/contesto/timer attivi dopo gesto; MUTE spegne subito voci e timer; STOP ALL ferma tutti; viewport mobile senza overflow.

La simulazione del caso protetto usa le API diagnostiche già presenti nel bundle approvato, attivate dal parametro diagnostics=1, con UI reale e motore reale. Non vengono caricati script alternativi.

Contatori nel caso pubblico STOP, Low1100×860:361draw call,472590triangoli,359geometrie/46texture. Sono una scena/posa diversa dal benchmark S7, non un confronto RAF equivalente. Il confronto byte-identico del bundle e i campioni integrati dimostrano assenza di modifiche al codice prestazionale; nessun nuovo audit completo5D. Campione integrato STOP:0.14ms medi(update S7:0.13), prima posa80.5ms(S7:89), memoria354/46→350/45 al dispose comeS7. Restano limiti hardware/rumore e possibile stallo iniziale della posa, già documentati.

## Ambiente e TLS

La prima navigazione Chromium ha incontrato ERR_CERT_AUTHORITY_INVALID per la CA del proxy gestito, non un errore del sito. Verifica HTTPS standard valida fin dall'inizio. Risolto nel solo profilo Chromium temporaneo, aggiungendo la CA già attendibile dal sistema nel database certificati del profilo, con vincolo DNS epivic-lab.github.io. Verifica TLS rimasta abilitata; proxy della sessione preservato. Nessuna modifica a certificati/secrets/dominio/configurazione di produzione. [Preparazione riproducibile](prepare-browser-trust.py), [smoke pubblico](public-smoke.py). Il profilo temporaneo e i suoi database non sono inclusi nel repository.

Comando riproducibile: preparare un profilo temporaneo con prepare-browser-trust.py; eseguire public-smoke.py con R1_BROWSER_PROFILE, R1_SHA=348bfeff12c4005657098d89ea1d3c2ccdda9910 e R1_BUNDLE_SHA256=0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b. Per ambiente senza proxy/profilo dedicato, omettere R1_BROWSER_PROFILE.

## Git e integrità

Main iniziale aeff336c997748bf49d2a09a61c1d6d9238fb3db; feature S7 approvata2ed3312d18244a6dca91cf68d4d54073843e9e85; merge isolato7db1cb7cb65a63d744c1789c4964b70fbcd3747c; testa PR collaudata5bed63c1461a94a55d7c19afb512e5b8513eeb56. Main finale348bfeff12c4005657098d89ea1d3c2ccdda9910 contiene entrambe le storie e l'albero collaudato esatto. [Verifica asset dopo merge](evidence/post-merge.json): tutti gli asset GLB e .DS_Store di main conservati; canonico/150rotaie/75letti/S7 immutati. Nessun intervento backend/Supabase/Z21.

Questo consuntivo e le prove pubbliche sono un commit documentale successivo sul solo `release/turnouts-s7`, discendente dal main pubblicato. Non richiedono un secondo merge su main o un nuovo deploy; il codice pubblico resta quello verificato sopra. Il rapporto preflight su main conserva la fotografia precedente al rilascio; questo documento registra l'esito successivo. SHA del checkpoint prove risolvibile con git log -1 --format=%H -- docs/releases/R1/PUBLISHED.md e riportato nella consegna.

GPU/touch/speaker/screen reader fisici NOT VERIFIED; nessuna regressione bloccante rilevata nel perimetro verificato. Nessun force/reset/rebase/rollback distruttivo. **STOP: attendere review post-release della Regia; nessuna macrofase successiva avviata.**
