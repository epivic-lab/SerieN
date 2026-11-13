# Scenario V06 — audit M0.1 e revisione M0.1-R

Il [rapporto completo M01_AUDIT_REPORT.md](M01_AUDIT_REPORT.md) contiene l'audit M0.1 e l'addendum M0.1-R sulla migrazione della geometria ferroviaria operativa.

**Decisione vigente:** V06 sostituirà anche assi e grafo operativo. La raccomandazione iniziale di mantenere la vecchia geometria è superata dall'addendum §15. Funzionalità e regole ferroviarie consolidate restano da preservare.

**Esito tecnico:** NO-GO all'avvio dell'implementazione con i soli dati verificati. Prima del codice occorrono il contratto AS-BUILT di porte/connessioni, percorsi WX completi, registro degli scambi e matrici degli stati, più revisione e integrità delle fonti. La roadmap R0–R7 è una proposta, non un'autorizzazione.

- [Stato della consegna documentale](STATUS.md).
- [Rapporto: audit storico e addendum prevalente](M01_AUDIT_REPORT.md).
- [Ricevute delle verifiche M0.1-R e della pubblicazione](evidence/M01R/README.md).

La richiesta successiva della Regia autorizza il completamento delle pubblicazioni: commit e checkpoint sul solo branch `codex/scenario-v06-audit-m01r`, con PR Draft verso main. Le dichiarazioni «nessun commit/push» nel rapporto fotografano le fasi di audit precedenti a questo mandato di pubblicazione. Il contenuto tecnico del rapporto è conservato byte per byte; questa pubblicazione non avvia M0.2, non modifica il codice/UI e non autorizza merge o deploy.
