# Train Management — gate corrente

R0 e **6A.1–6A.4 APPROVATE dalla Regia**; checkpoint 6A.4 `6bf92bf6f100e1c74567dd2b1ed898874e50e66a`. Main/R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` immutabile, branch esclusivo `feature/train-management`.

**6A.5: PASS tecnico nel laboratorio isolato; audit indipendente PENDING.** Checkpoint identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A5/REPORT.md`; SHA remoto/locale nella consegna. 6A.6 NON INIZIATA né implicitamente autorizzata.

[Contratto API, C1–C3, formato e quote](6A5_HISTORY.md), [rapporto/evidenze](evidence/6A5/REPORT.md). Nuova proposta versionata `20261104175236_serien_history_integrity.sql`, applicata solo a PostgreSQL17 effimero. Migrazioni approvate 6A.3/6A.4 e profilo DTO sintetico invariati. Owner Auth legacy obbligatorio conservato; nessun account reale o cutover produttivo.

C1: eliminati i grant SQL diretti, inclusi quelli per login/colonna; read/recover privati ricontrollano device/workspace/scope/epoch/key/expiry/revoca sotto lock. Revoca verificata anche nella stessa sessione SQL e nella race read/revoke. C2: ricevute compatte v2 e ricostruzione esatta dei retry 6A.4, senza envelope duplicato nel DB. C3: dominio workspace/request_id indipendente anche con owner legacy condiviso, unicità legacy preservata mediante indice parziale.

Digest stato distinto dall'envelope, versione canonica esplicita limitata al profilo, controlli schema/engine/topology/revision/manifest refs. Storico paginato, segnalazione corruzione/incompatibilità e recovery CAS in una nuova revisione preservando lo storico. Quote storage/checkpoint/audit, limiti byte/pagina/rate e backoff locale; nessuna retention distruttiva.

**PASS:** 141 controlli SQL6A.5, regressioni51 SQL6A.3 e45 SQL6A.4,25 test boundary/backoff e12 adapter6A.4,37 file npm,9 Python/JMRI ebuild. Fault SQL/deferred e kill backend rieseguiti anche post-upgrade.1472 file baseline fuori dai tre documenti gate byte-identici; canonico/bundle R1 invariati. Zero modifiche Supabase reale, main o Pages.

Restano NOT VERIFIED/NON IMPLEMENTATI: gateway proof+DB/end-to-end6A.6, revoca distribuita, provisioning/rotazione/pool/TLS reali, validatore DTO generale, serializer/hydrator/autosave/offline/UI, catalogo reale, cutover senza owner, carichi/budget produttivi e crash host/PITR. Non sono dedotti PASS dalle prove locali.

**Unica prossima azione: audit indipendente della Regia. STOP dopo checkpoint remoto 6A.5; nessuna 6A.6.**
