# Train Management — gate corrente

**6A.1–6A.10 APPROVATE — 6A.11 TECHNICAL PASS nel laboratorio a singolo broker,
audit Regia PENDING — MACROFASE6A NON CHIUSA — 6A.12/STAGING e6B NON AUTORIZZATE.**

Base approvata6A.10 `de53ba702164428e3b76936dc9791dee4eb1697a`; solo
`feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` intoccabile.
HEAD/branch/remoto/working tree iniziale/ascendenza verificati. Nessun main import,
branch change, reset/rebase/merge/force-push/Pages/deploy o operazione reale.

[Gate6A.11](6A11_ADVERSARIAL_GATE.md), [A01–A16](6A11_SECURITY_MATRIX.md),
[load/fault](6A11_LOAD_FAULT_RECOVERY.md),
[privilegi/threat/NV](6A11_SECURITY_BOUNDARIES.md),
[regressioni e R0](6A11_REGRESSION_MATRIX.md),
[risultati integrati](evidence/6A11/summary.json),
[Auth0/conservazione](evidence/6A11/zero-auth-proof.json),
[invarianti](evidence/6A11/invariants.json).

Laboratorio misto:48righe storiche+2head integralmente conservati, Auth0,2owner
legacy verificati e C/D ownerless senza nuovi Auth.185SQL O01–O14 e111controlli
integrati PASS;1diagnostica limite separata dai PASS. SIGKILL Chromium dopo Save
COMMIT ownerless:revisione9/receipt1/snapshot verificato; key crash NOT VERIFIED.
Prova completa Chromium→P-256→ingresso→broker→claimSQL COMMIT→principal/TLS→
API ownerless COMMIT→verifica snapshot. Reader/editor/owner, due dispositivi/CAS,
replay concorrente/restart/rollback, receipt retry/head/quota, revoca/epoch/expiry
su sessioni aperte, rotation/activation interrotte, rete/SQL/fault/limiti reali.

D01 (nonce array), D02 (malformed input503), D03 (header deadline non effettivo)
riprodotti RED e corretti con modifiche minime a4file backend. Nessuna migrazione,
ACL/privilegio/contratto/D09/D10/pool/transport modificato. Problemi harness
separati e tentativi falliti conservati, non contati come PASS.

**L01 aperto: cap16 è per processo. Due broker hanno aperto32connessioni SQL;
FAIL budget globale, multi-broker NON SUPPORTATO.** Stesso nonce concorrente su
due backend:200+409/una riga SQL PASS. Modalità supportata singolo broker;
launcher rifiuta replicas2. Sostituzione con fencing e zero vecchie sessioni;
enforcement hosting/multi-deploy NOT VERIFIED, nessun coordinatore aggiunto.

Tutte le regressioni6A.2–6A.10 rieseguite PASS nel perimetro dichiarato,
6A.6 anche dopo l'ultima correzione; npm37file/Python9/adapter12+25/build PASS.
Canonico/bundle/UI/motore/Journey/routing/WX310/guardie/HUD/console/asset/dipendenze
R1 byte-identici. Profilo sintetico chiuso, non serializer/hydrator generale.

NOT VERIFIED: host/power-loss, perdita volumi/journal/secret store/database,
PITR/replay post-write, Supabase/Supavisor/principal/provisioning/secretadapter gestiti,
cap aggregato operativo, costi/churn, altri browser/OS/XSS e matrice R1 completa
visuale/performance. Ogni proprietà ha prova dedicata futura nel rapporto,
nessuna autorizzazione implicita. Zero query Supabase reale e zero staging.

Commit atomico contenente il rapporto6A.11; push normale solo sul branch dedicato,
SHA remoto/locale e working tree pulito verificati nella consegna.
**Unica prossima azione: audit indipendente Regia; STOP6A.11.**
La macrofase6A non è chiusa.6A.12 richiede autorizzazione specifica ambiente/costi;
6B richiede gate separato. Nessuna fase successiva avviata.
