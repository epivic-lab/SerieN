# Train Management — gate corrente

R0, 6A.1, 6A.2 e **6A.3 APPROVATE dalla Regia**. Baseline 6A.3 `558f43b44be08235f6d30b6f18bd3b4ef07a4c53`, main/R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Branch esclusivo `feature/train-management`.

**6A.4: nucleo transazionale locale a profilo vincolato; approvazione indipendente PENDING.** Checkpoint identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A4/REPORT.md`; verifica remota nella consegna finale. Nessun SaveCheckpoint generale/HTTP/gateway integrato o applicazione produttiva.

[Contratto, privilegi, riproduzione e gap R0 P09–P15](6A4_TRANSACTIONS.md), [rapporto/evidenze](evidence/6A4/REPORT.md). Nuova migrazione additiva proposta, applicata **soltanto** nel PostgreSQL17 isolato; migrazione 6A.3 immutata. Binding SQL a workspace/device, RLS senza bypass, funzione privata con esecutore limitato, lock di coordinamento e head, deduplica prima del CAS, snapshot/proiezioni/head/ricevuta atomici. Validator fail-closed limitato al DTO sintetico server; composizione/Journey/catalogo arbitrari non ammessi.

Owner Auth e FK legacy conservati: il laboratorio usa solo l'owner sintetico esistente, non dimostra workspace applicativi nuovi senza owner. Profilo con train e loose in entrambi i workspace; dati legacy non vuoti preservati in dieci tabelle, timestamp compresi. Test SQL reali di CAS concorrente, idempotenza, fault SQL, terminazione backend, deferred constraint, isolamento e revoca **locale**. Revoca distribuita/gateway, provisioning/pool reali, cutover, validatore generale, offline/autosave, budget produttivi e crash host/PITR **NOT VERIFIED / NON IMPLEMENTATI**, secondo il rapporto.

R1, asset/canonico/bundle, 6A.2, dipendenze e workflow preservati; npm/Node/JMRI/build nei log del rapporto. Supabase reale non modificato; nessuna credenziale produttiva o deploy. Matrice R0 originale P01–P18 preservata.

**Unica prossima azione: audit indipendente della Regia e decisione sul gate 6A.5. 6A.5 NON INIZIATA; STOP dopo il checkpoint 6A.4.**
