# Train Management — gate corrente

R0 e 6A.1 **APPROVATE dalla Regia**, quest'ultima al commit `4c90f1520ce6cd1cc7c1e9a538f819c135c45a82`. Base R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`, main invariato al kickoff6A.2. Solo branch `feature/train-management`.

**6A.2: prototipo locale e verifiche PASS nel perimetro osservato. Approvazione indipendente PENDING; checkpoint remoto verificato nella consegna finale. 6A.3 NON INIZIATA/NON AUTORIZZATA.** Commit risolvibile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A2/REPORT.md`.

[Contratto e comandi](6A2_PROTOTYPE.md), [rapporto/evidenze](evidence/6A2/REPORT.md), [matrice R0 P01–P18](R0_ACCEPTANCE_MAPPING.md). Contratti6A.1 conservati senza rinumerazioni. La Regia ha fornito i criteri R0.13 originali durante6A.2: la matrice registra corrispondenze complete/parziali e lacune degli oracoli, non esegue funzionalità6B–6E.

44 test HTTP di sicurezza PASS;5 scenari Chromium reale PASS (CryptoKey non esportabile/IndexedDB/reload/firma/revoca/perdita); npm test37 file PASS,9Python PASS, build PASS. Runtime/canonico/bundle R1 invariati. Prototipo isolato senza dipendenze produttive, DB/credenziali, Pages o deploy. Negazioni verificano sia assenza di dati protetti in risposta sia assenza di scritture sui workspace fixture.

Limiti: memoria e sezioni sincrone di un processo, HTTP loopback; nessuna prova transazionale/DB/RLS/quote/DoS/TLS/revoca distribuita o rotazione definitiva. Solo Chromium headless nella sessione di test; altri browser e durabilità dopo crash OS NOT VERIFIED. Scadenza grant device e cerimonia recovery duraturo restano punti da definire prima della produzione. Nessuna certificazione produttiva implicita.

**Unica prossima azione: attendere audit della Regia e autorizzazione esplicita 6A.3. STOP dopo checkpoint 6A.2.**
