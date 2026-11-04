# Train Management — gate corrente

R0 e **6A.1–6A.5 APPROVATE dalla Regia**; checkpoint6A.5 `ef36596224133f19ceebeb4de889456c78959515`. R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` immutabile; branch esclusivo `feature/train-management`.

**6A.6: PASS tecnico nel laboratorio integrato; audit indipendente PENDING. Chiusura macrofase6A: BLOCKED. 6B NON INIZIATA.** Checkpoint identificabile con `git log -1 --format=%H -- docs/_active/train-management/6A_INTEGRATION_GATE.md`; SHA remoto/locale verificati nella consegna dopo push.

[Contratto/comandi](6A6_INTEGRATION.md), [rapporto gate e decisioni](6A_INTEGRATION_GATE.md), [riepilogo misure/prove](evidence/6A6/summary.md). Browser Chromium→WebCrypto/IndexedDB→proof HTTP→gateway locale→loginSQL dispositivo→API private6A.5/RLS/transazionePG17→risposta postcommit→verifica browser. Nessun collegamento al simulatore; profilo sintetico chiuso train+loose invariato e migrazioni6A.3–6A.5 intatte.

**PASS:**72controlli integrati;51/45/141SQL regressioni6A.3/4/5,48HTTP6A.2,5browser capability,37adapter, npm37file/220test,9Python/JMRI,build e smoke browserR1. Firma/nonce/scope/expiry/revoca/epoch/workspace, CAS e lock reali, recovery/quote/storico/ricevute, hash indipendenti; faultSQL/backend kill/timeout/HTTP abort/pagina/SIGKILL browser distinti. Zero nuove letture/scritture dei device revocati dopo commit revoca.1500file baseline fuori dai tre documenti gate, canonico/bundle/app/motore/UI/asset identici; nessuna nuova dipendenza app.

**BLOCKED per chiusura6A:** provisioning/principal/secret broker/pooling del futuro hosting non approvati né certificati; il supervisore Docker non è worker produttivo. Owner_id/FKAuth obbligatori conservati: la fixture legacy sintetica non prova workspace applicativi ownerless. Piano cutover con dati/rollback e vincoli ferroviari nel rapporto, senza nuova migrazione o account fittizi reali.

**NOT VERIFIED/NON IMPLEMENTATI:** TLS/Supavisor/quote/configurazione reale, multiistanza/restart/persistenza registry/replay, rotazione credenziali e recoverykit offline definitivo, Safari/Firefox/eviction/durabilità CryptoKey dopo crash processo, OS/storage/PITR; serializer/hydrator/capture/autosave/journal/outbox/UI e catalogo generale. Matrice R0P01–P18 esplicita nel rapporto, nessuna copertura6B–6E anticipata.

Zero query Supabase reale; nessun SQL/DDL/DML/Auth/RLS/grant/Edge/config/deploy, main/Pages/merge o6B. **Unica prossima azione: audit indipendente Regia e decisione sui blocchi; STOP.**
