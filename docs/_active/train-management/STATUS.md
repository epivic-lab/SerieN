# Train Management — gate corrente

**6A.1–6A.9 APPROVATE — 6A.10 PASS tecnico di laboratorio, audit Regia PENDING —
MACROFASE6A BLOCKED — 6B NON AUTORIZZATA.**

Base approvata6A.9 `d7075c3a980f554ba8111f5a5478279f5ff6ddbd`; branch esclusivo
`feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` intoccabile.
Checkout/ascendenza/working tree iniziale verificati. Main indipendente non importato.
Nessun reset/clean/merge/rebase/force-push.

[Gate ownerless](6A10_OWNERLESS_GATE.md), [inventario](6A10_CONSTRAINT_INVENTORY.md),
[ACL/RLS/creator](6A10_ACL_MATRIX.md), [rollback](6A10_ROLLBACK.md),
[zero Auth](evidence/6A10/zero-auth-proof.json), [suite/log](evidence/6A10/summary.json),
[invarianti](evidence/6A10/invariants.json).

**185SQL O01–O14 e50E2E ownerless PASS.** Fixture inizialmente con2Auth/2owner,
dieci tabelle non vuote,4snapshot/receipt, A/Bhead1. Dopo nuova migrazione additiva:
Auth0 in entrambi i DB di test attivi, registro privato con2owner storici e tutte
le48righe pubbliche originali più2head intatte nella primaria. C/D creati senza Auth
tramite job privato operatore, ownerNULL/domain workspace valido, head0 senza
archivi inventati. C attraversa tutte le API via Chromium/P-256→ingresso→broker6A.9→
claim SQL COMMIT→principal/TLS→API ownerless COMMIT→verifica. D pairing/letture/
isolamento nel browser e Save nel clone SQL; A/B compatibili con nuova rev2
ownerNULL e lettura rev1 su copia separata. Copie restore/compatibilità poi rimosse.

Ledger minimo senza Auth FK o autorità runtime;8FK Auth sostituite da RESTRICT già
validate, default auth.uid/NOT NULL owner rimossi, generated ownership_key NOT NULL,
7domain FK/unique/railway intatti. Nuove INSERT workspace ownerNULL e identity
immutabile; SaveCheckpoint cambia solo il nuovo owner aNULL, senza alterare
validatore/CAS/idempotenza/quote/ACL. Migrazioni/contratti6A.1–6A.9 e R0 intatti.
Broker/gateway/adapter originali invariati, nessun potere di workspace creator al
broker o API amministrativa HTTP.

NULL matrix su tutte8tabelle;84FKcross-workspace con errore23503 distinto daACL;
vincoli ferroviari e archivi immutabili; sei faultsubstep/deferred/timeout/kill,
CAS/ack perso/retry/history/recovery; RLS nega vecchio claim owner anche con SELECT
temporaneo.14punti rollback DDL con catalogo/ruoli/dati identici; backup restore
locale verificato. Dopo Auth delete/prime scritture: read-only provato, nessun down
distruttivo/account fittizio; restore+replay post-write/PITR/secret-store loss NON
certificati. Il profilo resta sintetico chiuso, non un serializer generale.

Rieseguite51/45/141SQL6A.3–6A.5,97SQL6A.8,72gateway6A.6,50broker6A.9 legacy
(distinti dai50ownerless),48HTTP/5Chromium6A.2,12+25adapter; npm37file,9Python/JMRI,
build e hash canonico/bundleR1 PASS. Pool ownerless peak16/coda64,4timeout2s,
idle31s; due broker solo replay/letture minime,2connessioni aggregate. Coordinamento
budget globale NOT VERIFIED. Cleanup di4container/2network/5volumi verificato.

**BLOCKED per chiusura6A:** audit Regia e fasi successive non autorizzate; hosted
Supabase/Supavisor/inventario diverso dal lab, provisioning/secret manager operativo,
costi/churn/cap globale/host crash/PITR/recovery dopo perdita segreti NOT VERIFIED.
Zero query/modifiche Supabase reale e zero staging; nessun main/Pages/deploy,
UI persistenza, runtime/hydrate/autosave/offline/outbox/asset o6B. Invarianti R1
motore/topologia/Journey/WX310/HUD/console/camera/dipendenze preservati.

Checkpoint6A.10: `git log -1 --format=%H -- docs/_active/train-management/6A10_OWNERLESS_GATE.md`;
SHA locale/remoto e working tree verificati dopo push normale nella consegna.
**Unica prossima azione: audit indipendente Regia; STOP6A.10. Nessuna6A.11 avviata.**
