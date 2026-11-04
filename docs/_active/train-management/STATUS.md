# Train Management — gate corrente

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

R0 e6A.1–6A.6 APPROVATE dalla Regia nel rispettivo perimetro. Checkpoint6A.6 approvato `5d65a32ff392dabf7e57c040981598f5af398e05`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` immutabile; branch esclusivo `feature/train-management`. L'approvazione tecnica6A.6 non chiude la macrofase.

**6A.7: documenti di progettazione consegnati per audit, D09/D10 PENDING approvazione indipendente.** Nessuna soluzione correttiva implementata o distribuita. [Decisione D09/confronto A-B-C/fonti](6A7_ARCHITECTURE_DECISIONS.md), [D10/inventario/cutover/test](6A7_OWNERLESS_CUTOVER.md), [piano attuativo minimo](6A7_EXECUTION_PLAN.md), [rischi/evidenze](6A7_RISKS_AND_EVIDENCE.md), [rapporto e verifiche](evidence/6A7/REPORT.md).

Raccomandata A: principal SQL distinto per dispositivo/versione, broker verificatore privato fidato, pool applicativo lazy/LRU con cap globale, direct TLS iniziale; Supavisor session eventuale da provare. Rischio broker/secret-store compromesso esplicito; password/TLS/provisioning/pool/rotazione gestiti e budget/costo restano gate staging. Nessuna autorità da GUC o SET ROLE. B e C confrontate, non selezionate.

Raccomandazione D10: nuove righe workspace ownerNULL; owner storici conservati come provenienza privata senza FK Auth; ownership_key generata NOT NULL e domain FK sempre operative. Snapshot/ricevute legacy e ID intatti; niente account Auth fittizi, UPDATE archivi o migrazione automatica legacy. Prova futura obbligatoria: legacy non vuoto e COUNT(auth.users)=0 dopo distacco, poi nuovi workspace operativi. Ownerless ancora NOT VERIFIED/NON IMPLEMENTATO.

**Verifiche correnti6A.7:** npm37file PASS,9Python/JMRI PASS,build PASS; link/scope/hash e preservazione documenti/SQL/R1 nel rapporto. Nessuna suite SQL/HTTP/browser rieseguita per i soli documenti; risultati6A.6 ereditati nel [gate storico](6A_INTEGRATION_GATE.md) e [summary](evidence/6A6/summary.md), intatti. Matrice R0P01–P18 e contratti6A.1–6A.6 invariati; profilo sintetico chiuso, nessun serializer generale.

Zero query o mutazioni Supabase reale; nessuna nuova migrazione, ruolo, servizio, gateway, refactoring, simulatore/topologia/UI/asset, merge/main/Pages o deploy. Fonti pubbliche consultate via connettore e sorgenti ufficiali; changelog diretto403 e confronto R0 integrale NOT VERIFIED. Fasi correttive proposte6A.8–6A.13 richiedono autorizzazioni separate; staging anche per ambiente/costi.

Checkpoint6A.7 identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A7/REPORT.md`; SHA locale/remoto e working tree verificati nella consegna dopo push normale, senza anticiparne il risultato. **Unica prossima azione: audit Regia D09/D10/piano, poi eventuale autorizzazione della sola6A.8. STOP6A.7; 6B NON INIZIATA.**
