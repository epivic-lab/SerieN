# RELEASE R1 — integrazione controllata Interactive Turnouts

Fotografia dei gate di integrazione prima del merge su main. La richiesta R1 attesta l'approvazione della Regia di S0–S7/S6.1 e autorizza questa sola integrazione/pubblicazione. Il consuntivo dopo deploy viene registrato sul branch `release/turnouts-s7` e nella consegna con SHA principale e workflow effettivi; questo rapporto non anticipa il successo del deploy.

## Storie Git e conservazione

Main iniziale `aeff336c997748bf49d2a09a61c1d6d9238fb3db`; feature approvata `2ed3312d18244a6dca91cf68d4d54073843e9e85`; merge-base `6487f61612818c8cd46d882741cfa1ca96ac5a16`. Conteggio remoto aggiornato:4commit esclusivi main,13feature. Intersezione dei percorsi modificati:vuota. Branch isolato `release/turnouts-s7` creato da origin/main, normale merge no-ff del checkpoint S7, nessun conflitto. Merge d'integrazione `7db1cb7cb65a63d744c1789c4964b70fbcd3747c` conserva entrambe le storie.

Tutti i quattro file esclusivi main preservati byte per byte: `.DS_Store`, `asset-library/.DS_Store`, casa tedesca GLB2647244byte e pacchetto pini GLB46214880byte. [Hash SHA256 e blob Git](evidence/integration.json). Nessuna sostituzione binaria. Il runtime integrato, assets utilizzati e workflow sono esattamente S7; le sole altre modifiche R1 sono documentazione e prove. I nuovi GLB della libreria rimangono nel repository; non vengono spostati nella scena né aggiunti a una pipeline alternativa.

## Collaudo sul risultato integrato

220Node,9Python/JMRI e build produzione PASS. Suite browser contratto/manifest150rotaie75letti, interazione protetta degli otto controlli con mouse/touch/tastiera, S5 guardia e S6 STOP/audio/multitreno/lifecycle:PASS. Pages produzione sotto `/SerieN/` a1280×900 e390×844 PASS, nessun errore JS o richiesta fallita. [Comandi](integration-tests.py), [risultati](evidence/results.json), [desktop](evidence/pages/1280.png), [mobile](evidence/pages/390.png). Lo smoke di pubblicazione usa il bundle effettivamente servito senza sostituirlo con un profiler: [procedura](public-smoke.py).

Canonico rigenerato senza diff, SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Motore S5/collisioni/routing/Journey, geometrie Kato, WX310, ballast, glowB, frecce, STOP S6.1, audio/MUTE, UI/HUD/minimappe e ottimizzazioni5D invariati. Nessun backend/Supabase/Z21/dipendenza nuovo.

## Bundle e prestazioni

Ricostruito separatamente da archivio Git del checkpoint S7 approvato: bundle byte-identico a quello integrato,1022331byte, SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`. Il bundle pubblico prima della release è ancora5D:985297byte, hash `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`. [Rilevazione](evidence/public-before.json).

Nessun audit completo5D ripetuto: sorgenti, dependency e bundle identici a S7. Le caratteristiche misurate di STOP attivo (geometrie/texture, CPU update e dispose) sono riportate nel JSON fresco [stop.json](evidence/stop.json) e confrontate col [collaudo S7](../../turnouts/FINAL_REPORT.md). Differenze di CPU di questi brevi campioni sono riportate come misure, non come regressioni dedotte da hardware diversi. Draw call/GPU della scena sono controllate nel collaudo produzione e tramite identità del bundle. Restano limiti S7: costo sincrono di prima posa STOP, GPU/touch/speaker/screen reader fisici non verificati. Non ripetuta T01–T40 perché il merge non cambia codice applicativo.

## Processo GitHub e pubblicazione

Pipeline esistente `.github/workflows/pages.yml`: push main → npm ci, rigenerazione canonico/Python, Node,build, preparazione sito, upload/deploy Pages. Nessuna modifica a workflow,secrets,dominio o permessi. Lettura GitHub iniziale:main non protetto, nessun ruleset, merge commit consentiti. Usare PR normale con metodo merge e SHA head atteso; ricontrollare stato e policy prima della mutazione. No force/reset/rebase né aggiramento di review.

La versione npm resta0.12.0, nessun tag inventato. R1 è il nome dell'incarico di rilascio, non un nuovo semver. [Rapporto permanente macrofase](../../turnouts/FINAL_REPORT.md); specifiche vecchie non attive, preservate.

Dopo merge verificare entrambi gli antenati e tutti gli asset; seguire il workflow del nuovo SHA main; confrontare l'hash del bundle pubblico aggiornato, poi provare plancia, semplici/WX310, glow/frecce, arresto protetto, STOP, campanello dopo gesto, MUTE e responsive. Il workflow riuscito da solo non costituisce RELEASED. Eventuali blocchi restano documentati senza rollback distruttivo.

**STOP dopo R1**: niente Train Management/6A/5E o altri progetti. Review post-release della Regia richiesta.

## Gate finale prima della PR

Smoke aggiuntivo sul bundle di produzione locale sotto `/SerieN/`:PASS, comando semplice e WX-A tramite mouse, glowB/frecce reali, guardia/STOP, gesture audio/MUTE/STOP ALL e responsive. [Risultato](evidence/production-smoke/result.json). Nessun profiler sostituito nel caricamento. Campione STOP integrato: update medio0.14ms contro0.13ms S7, prima ricerca80.5ms contro89ms; memoria354/46 stabile e350/45 dopo dispose in entrambi. Non sono benchmark statistici nuovi né dimostrazioni hardware.
