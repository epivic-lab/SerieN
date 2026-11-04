# Train Management — gate corrente

**6A.6 TECHNICAL PASS — 6A.7 DESIGN APPROVED — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

R0 e6A.1–6A.7 APPROVATE dalla Regia nel rispettivo perimetro. Base6A.7 `cec3a97042ddd1cbcacc7e50cb99a9f4b76c2afd`; branch esclusivo `feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` immutabile. Main77b6f64 indipendente non importato.

**6A.8: PASS tecnico SQL locale, audit Regia PENDING.** [Contratto e API per broker futuro](6A8_SQL_LIFECYCLE.md), [matrice ACL/RLS](6A8_ACL_MATRIX.md), [rapporto sicurezza/fault/24criteri](evidence/6A8/REPORT.md), [risultati](evidence/6A8/results.json). Nuova migrazione additiva `20261104231109_serien_capability_lifecycle.sql`, runner `tests/db/6A8/`; nessuna applicazione reale o staging.

Claim nonce durevole in commit separato del caller, unicità/quote/cleanup e autorizzazione derivata da session_user. Lifecycle con job durevoli, ticket/kit key-bound monouso, epoch/key rotation, approvazione e finalizzazione controllate; control/redeemer/provisioner separati e ceiling/RLS/ACL effettivi. Principal preparato NOLOGIN; ALTER LOGIN e completamento sono del solo operatore fixture. Il DB non verifica P-256 e non crea una transazione autonoma interna; il broker resta fidato D09.

**PASS attuali:**97SQL nuovi;51/45/141regressioni SQL6A.3–6A.5;72browser/HTTP/PG6A.6 dopo upgrade;48HTTP e5Chromium6A.2;12+25adapter; npm37file,9Python/JMRI,build. Vere connessioni concorrenti, nuovi processi per replay e sessione aperta durante revoca, fault/rollback e legacy non vuoto. Matrice R0P01–P18, contratti/evidenze approvate, tre migrazioni precedenti e runtime/UI/topologia/asset/canonico/bundle conservati. Il profilo rimane sintetico chiuso, nessun serializer generale.

**BLOCKED per chiusura6A:** nuovo broker/pool/lifecycle end-to-end, provisioning/secret distribution gestiti e ownerless D10 ancora da attuare e verificare nelle fasi autorizzate successive. I72PASS6A.6 usano il gateway originale, non dimostrano integrazione del nuovo claim. Secret adapter in memoria e Unix trust sono limiti del laboratorio; TLS/password/Supavisor/staging/costi/host crash/PITR non certificati.

Zero query o mutazioni Supabase reale, zero staging, nessuna nuova piattaforma/broker/pool/secret store reale, ownerless, refactoring R1, deploy/main/merge/Pages o6B. D09/D10 e piano6A.7 restano riferimenti approvati; le implementazioni successive richiedono autorizzazione propria.

Checkpoint6A.8 identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A8/REPORT.md`; SHA remoto/locale e working tree verificati dopo push normale nella consegna finale. **Unica prossima azione: audit indipendente Regia; STOP6A.8. 6A.9 NON INIZIATA.**
