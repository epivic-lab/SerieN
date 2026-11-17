# Browser cache — rapporto di rilascio

**PASS / pubblicato e verificato il 17 novembre 2026.**
L’utente ha autorizzato espressamente completamento, merge e deploy di questa attività.

- [Sito](https://epivic-lab.github.io/SerieN/)
- [PR #27](https://github.com/epivic-lab/SerieN/pull/27), merge normale dopo gate PASS.
- Codice: `da0f1ffaea4aff230ad9f7bce051ec47d42099e3`.
- Main distribuito: `ba26f791e32c7d322da4169bb0b6fe5c4b692a32`.
- [CI cache/canonico](https://github.com/epivic-lab/SerieN/actions/runs/44143359663): PASS.
- [CI preesistente isolata](https://github.com/epivic-lab/SerieN/actions/runs/44143359590): PASS; nessun servizio cloud modificato.
- [Pages](https://github.com/epivic-lab/SerieN/actions/runs/44144106582): SUCCESS.

## Risultato

Prima: 26 file campionati trasferivano 182,55 MB a cache vuota e 167,46 MB al secondo passaggio.
Ora: 62 risorse del manifest verificate per SHA-256 sul sito pubblico; 51 richieste di rete
originate dal service worker nella prima lettura (11 file shell già conservati dall’installazione),
**zero richieste originate dal service worker e zero byte Resource Timing nella seconda lettura**.
La misura conta le richieste del worker, oltre al Resource Timing, che da solo non proverebbe l’assenza di rete.
Il campione nuovo è più ampio di quello iniziale: non è un benchmark identico del tempo di avvio.

Il service worker pubblicato è byte-identico alla build collaudata, SHA-256
`e86e73e61ae3460cbb40b070d1e0180ee213f72c5bf9f06606f58c749ddc30e8`.
Tutti i 62 file pubblici corrispondono agli hash della build. Accesso ancora bloccato senza login.

## Comportamento

Primo accesso: installazione della shell e cache dei modelli al loro utilizzo.
Visite successive: riuso dei file immutati, senza API aggiuntive sul server.
Nuove release: verifica aggiornamento senza HTTP cache per lo script SW; riuso dei contenuti con lo stesso hash;
attivazione dopo la chiusura delle schede della vecchia release e rimozione selettiva delle voci obsolete.
Nessun reload durante una simulazione. Per ricevere un aggiornamento in attesa, chiudere tutte le schede SerieN e riaprire.
Nessun pulsante aggiunto né cambiamento all’interfaccia.

Se lo storage è pieno/indisponibile o il browser elimina la cache, resta il caricamento dalla rete.
La cache evita i download, non parsing GLB, costruzione della scena o caricamento GPU.
Autenticazione sempre verificata online; nessuna abilitazione della simulazione offline.

## Verifiche e invarianti

581/581 Node, 9/9 JMRI, build PASS. Canonico byte-identico in CI Linux/Python 3.12 sia nella PR sia nel deploy:
il gate di riferimento è chiuso senza modificare i file canonici. Le differenze macOS di CACHE-1 restano
un esito storico reale, non una correzione del generatore né una riproducibilità universale dimostrata.

Chrome locale: rendering V06 dalla cache; aggiornamento con due schede che restano sulla release precedente;
attivazione nuova solo dopo la chiusura e modello invariato riusato senza download.
Test mirati: hash/HTTP errati, quota/storage, installazione fallita con shell precedente preservata,
concorrenza, richieste esterne/API/POST/Range escluse.

Sorgenti ferroviarie, asset, CSS/UI, camera, fisica, controller legacy/V06, auth e lockfile identici alla baseline;
bundle app identico. Le modifiche operative sono limitate a bootstrap HTML, client cache, generazione worker/manifest,
script build e pipeline di distribuzione/verifica. Nessuna dipendenza aggiunta, nessuna modifica a DB/RLS/configurazione Auth.
Nessuna credenziale o risposta autenticata salvata nella cache/evidenze. Il worker usa URL statici consentiti,
fetch senza credenziali, verifica dimensione/SHA-256 e non conserva errori.

NOT VERIFIED: dispositivi Safari/mobile fisici, saturazione reale del disco, durata della persistenza dopo eviction OS,
avvio autenticato sul sito pubblico. Quota/fallback coperti in ambiente controllato; rendering completo collaudato localmente.

## Evidenze e checkpoint

[Evidenze complete](../_active/browser-cache/evidence/release/): `public-browser.json`, `public-worker.json`,
`pages-deploy.json`, `ci-validation.json`, `ci-existing.json`, `local-browser.json`, screenshot accesso/scena,
log Node/JMRI/build e `invariants.json`.
Il collaudo finale ha rafforzato solo l’harness di misura per contare le richieste del worker;
nessun codice runtime è stato cambiato dopo il commit distribuito.

Il checkpoint finale di rapporto/evidenze è sul branch `codex/browser-cache`, distinto dal SHA main distribuito;
SHA effettivo e verifica remota nella consegna, risolvibile con `git log -1 --format=%H -- docs/browser-cache/REPORT.md`.
Nessuna altra fase iniziata. Stato finale: **STOP, rilascio richiesto completato; eventuale audit Regia successivo.**
