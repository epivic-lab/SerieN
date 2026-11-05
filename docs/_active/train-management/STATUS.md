# Train Management — gate corrente

**6A.12-P DESIGN DELIVERED — STAGING EXECUTION BLOCKED — MACRO 6A OPEN — 6B NOT AUTHORIZED.**

6A.1–6A.11 approvate nei rispettivi perimetri;6A.11 solo laboratorio single-broker.
Base approvata `1da0675ca59cd47cffe79250f17419c929d90048`, branch esclusivo
`feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` congelata.
Audit di recupero: checkout pulito e corretto, nessun commit locale/stash/bozza
6A.12 da perdere; ricerca e contratti già disponibili conservati. Nessun cambio
branch, main import, reset/rebase/merge/force-push o ricostruzione di storia.

Sette deliverable di sola progettazione:

1. [Readiness, blocker, fonti e GO/NO-GO](6A12_STAGING_READINESS.md).
2. [Hosting e single-broker/fencing](6A12_HOSTING_ARCHITECTURE.md).
3. [Compatibilità Supabase direct/session/transaction](6A12_SUPABASE_COMPATIBILITY.md).
4. [Provisioner, secret manager, lifecycle e journal](6A12_PROVISIONING_AND_SECRETS.md).
5. [Runbook futuro non eseguito](6A12_STAGING_RUNBOOK.md).
6. [Test obbligatori e recovery su clone](6A12_TEST_AND_RECOVERY_PLAN.md).
7. [Costi verificabili e registro approvazioni](6A12_COST_AND_APPROVAL_GATE.md).

Raccomandazione: un host EC2 fisso, ingresso HTTPS separato dal broker privato,
SQL direct TLS/IPv6, identità macchina/secret manager e provisioner fuori banda.
Alternativa Render con disco persistente/OIDC; entrambi subordinati alle prove
staging. Nessun provider/account/piano scelto o attivato tacitamente.

D09=A e D10 invariati. L01 resta FAIL multi-broker32/16, modalità non supportata;
launcher locale non dimostra esclusività hosting. Il piano richiede prevenzione
del secondo avvio, drain, fence esterno e zero vecchi backend prima di READY.
Nessun coordinatore distribuito o login SQL universale/SET ROLE introdotto.

Blocker: organizzazione/nome/ref staging e budget non assegnati; fattibilità DDL e
delega gestiti, session_user/pool/cache/TLS, secret adapter/journal/registro revoche,
packaging/fixture, esclusività hosted e recovery ancora da provare/implementare
solo con incarico esplicito. Proposta75USD/7giorni NON AUTORIZZATA; preventivo
completo e costo clone/lavoro/fiscalità necessari prima del GO. Restore/fault
host-volume-store-DB/PITR richiedono clone dedicato e seconda autorizzazione.

Fonti pubbliche consultate il5novembre2026, Europe/Rome; fatti, interpretazioni e
NOT VERIFIED separati. Nessun accesso a dati o metadata del Supabase reale
`vehfrjgifzjjgamrgwze`, nessuna creazione/SQL/configurazione/deploy cloud o staging.
Tutti i file backend/SQL/migrazioni/test e R1/UI/asset/canonico/bundle/dipendenze,
contratti D09/D10/R0 precedenti restano invariati. Nuovi controlli soltanto locali:
documenti/link/scope/secret (38link,1777file precedenti identici), npm37file PASS,
Python/JMRI9 PASS ebuild PASS; SQL/Chromium6A.11 non rieseguiti.
Nessuna nuova certificazione hosted, R1 visuale/prestazionale o browser/OS recovery.

Commit atomico dei soli nove Markdown, push fast-forward solo sul branch dedicato,
SHA remoto/locale e working tree pulito verificati nella consegna.
**Unica prossima azione: audit indipendente della Regia sul piano e compilazione
delle approvazioni economiche/operative. STOP6A.12-P.**
6A.12 operativa,6A.13 e6B non autorizzate; macrofase6A ancora aperta.
