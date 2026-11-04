# Train Management — gate corrente

R0, 6A.1 e 6A.2 **APPROVATE dalla Regia**, ultima baseline `f64bdc8291a9c51a29c60076bae303e91e6e1d26`. Branch `feature/train-management`; main ancora R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` al kickoff.

**6A.3: PASS tecnico del collaudo locale; approvazione indipendente PENDING. Checkpoint remoto verificato nella consegna finale. 6A.4 NON INIZIATA e NON AUTORIZZATA.** Commit identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A3/REPORT.md`.

[Specifica e rollback](6A3_SCHEMA.md), [rapporto con prove](evidence/6A3/REPORT.md). Proposta `supabase/migrations/20261104165408_serien_workspace_expand.sql`: expand additivo, senza cutover owner/Auth. Baseline e fixture sintetiche in `tests/db/6A3/`, PostgreSQL17.11 reale in container effimero senza rete o porte pubblicate. Nessuna modifica al Supabase reale.

51 verifiche DB PASS: legacy non vuoto preservato esattamente dall'expand, rollback DDL, backfill e inversione semantica, RLS/grants/FK, isolamento A/B con login SQL distinti, head, registry e vincoli ferroviari. 48 test HTTP PASS dopo correzione minima UUID; 5 scenari Chromium PASS; npm test 37 file PASS, 9 Python/JMRI PASS, build PASS. Codice/bundle/canonico R1 e dipendenze invariati. Il backfill attiva i trigger updated_at storici: timestamp possono avanzare, come documentato.

Limiti: cutover senza owner e applicazione reale, API/SaveCheckpoint/CAS, pairing/consumo monouso e revoca DB transazionali, provisioning SQL produttivo, backup/PITR, piattaforma Supabase/PostgREST e carichi reali NOT VERIFIED. Advisor remoti preesistenti registrati senza correzioni produttive. Matrice R0 P01–P18 e contratti precedenti preservati.

**Unica prossima azione: attendere audit della Regia e autorizzazione esplicita 6A.4. STOP dopo checkpoint 6A.3.**
