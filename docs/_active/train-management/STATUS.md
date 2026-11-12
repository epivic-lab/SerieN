# Train Management — M3

**M3 READY FOR REVIEW — STOP per audit/approvazione della Regia.** Non avviare persistenza, release o altri sviluppi.

M2 approvata `a67e0de7fa01a968152cf47af3a744ea39034bcc`; branch esistente `codex/train-management-m2`, main di riferimento `184cc9ba93a6b35493f365b2ffcb20ef0645963d` invariata. Contratto A remoto `afc6c00d4eeeea7c5947e6d7a107f85bbc47dce3`; implementazione completa B remota `252d9c30e8497b16d3f3f10e39d6e0e09f879a63`. C solo test/documentazione/evidenze: commit che aggiorna questo file, SHA e confronto remoto nella consegna. Checkpoint pubblicati tramite connettore autorizzato, alberi identici ai precursori locali preservati, nessun reset/rebase/force-push.

Vista Depot, record virtuali distinti dal catalogo e da veicoli progettati/fisici/sganciati, identità univoche, disponibilità/prenotazioni di posti M2 confermati, rilascio/rimozione virtuali e riconciliazione. M2 e R1 non sono mutati dall'inventario; reset/close conservano la sessione. Ingresso/uscita fisici NON DISPONIBILI: nessun contratto generico R1, nessuna materializzazione/rimozione arbitraria.

**PASS:** 254 Node, 9 Python, build, canonico; dieci suite browser conclusive incluse M1/M1.1/M2/lifecycle/R1/console/layout e M3. Nativo: 6 gruppi, 7 checkpoint, 74 frame, 3 input trusted mouse/touch; 3 treni in movimento durante gestione deposito, sgancio/riaggancio R1 da fermo con altri due in moto, identità e inventario coerenti. 348 geometrie/44 texture stabili, contesto attivo, zero errori/richieste fallite nel gate finale.

**NOT VERIFIED:** GPU/tablet fisici e fluidità hardware; SwiftShader circa 0,455 frame/s non fluido. Presentazione del prompt nativo beforeunload non verificata; handler e 25 cicli lifecycle PASS. Primo errore del predicato dell'harness conservato con esito FAIL, ripetizione conclusiva PASS senza cambiare il bundle.

[Contratto](M3_CONTRACT.md), [rapporto completo e limiti](M3_REPORT.md), [matrice](evidence/M3/FINAL_GATES.json), [evidenze](evidence/M3/final/). App.js, R1, dominio M2, M1.1, asset, renderer, geometria, Auth, Supabase/RLS e dipendenze byte-identici a M2 approvata. Nessun E1/redesign/cloud/merge/deploy.

**Unica prossima azione: review indipendente della Regia su M3.**
