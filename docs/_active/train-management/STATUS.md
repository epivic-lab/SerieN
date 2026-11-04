# Train Management — gate corrente

R0 **APPROVATA** dal committente il 4 novembre 2026, decisioni D01–D08 vincolanti. Roadmap: 6A backend/contratti, 6B persistenza, 6C catalogo, 6D compositore/inventario, 6E collaudo; 5E successiva. La roadmap non è autorizzazione cumulativa.

**6A.1: verifiche documentali PASS; checkpoint di consegna da verificare nella risposta finale. Approvazione indipendente della Regia PENDING. 6A.2 NON INIZIATA e NON AUTORIZZATA.** Branch `feature/train-management`, base `348bfeff12c4005657098d89ea1d3c2ccdda9910` coincidente con main al kickoff. Il commit che introduce [REPORT](evidence/6A1/REPORT.md) identifica atomicamente la consegna; risolvere con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A1/REPORT.md`. SHA locale/remoto e working tree vanno verificati dopo il push: il presente file non anticipa un successo remoto.

Contratti: [stato/lifecycle/atomicità/test futuri](6A1_CONTRACT.md), [schema dati](STATE_SCHEMA.json), [sicurezza/ownership/mapping](SECURITY_AND_DB_MAPPING.md). Le proposte di ownership A, pairing/recovery, limiti e migrazioni richiedono review della Regia prima di implementazione. Il testo integrale R0 non è nel checkout: il confronto indipendente col documento originale resta alla Regia.

Verifiche eseguite: npm test (37 file), esecuzione diretta dei 37 file (220 test), 9 Python/JMRI, build, JSON Schema/meta-schema/16 rifiuti, tracciabilità di 151 proprietà. Esiti e limiti nel rapporto. Nessuna modifica runtime/asset/dipendenza, schema DB, RLS, grants, Auth, funzione o produzione. R1 preservata per identità sorgenti e bundle; nessuna nuova prova browser/hardware/prestazionale.

**Unica prossima azione: attendere audit della Regia e autorizzazione esplicita alla 6A.2. STOP dopo il checkpoint 6A.1.** Nessun gateway, client di persistenza, API, migrazione o autosave da avviare automaticamente; nessun merge/main/deploy.
