# 5D.2 — Rendering e animazioni: verifica del prototipo

> Checkpoint storico. La 5D è ora conclusa: stato corrente, prove finali e provenienza in [PERFORMANCE_AUDIT_5D.md](../PERFORMANCE_AUDIT_5D.md).

30 ottobre 2026. Codice del checkpoint `5ae8ee9`, baseline `303525c`.

Il benchmark CPU completo già salvato mostra riduzioni sul componente `renderVehicles` da 18,9% a 55,9% nei carichi in movimento B–D, mediana di tre batch. Nel carico D (quattro composizioni da cinque carri) 0,229 → 0,101 ms/chiamata. Non è un dato di frame rate né di GPU.

Regressione eseguita ora con Chromium 154.0.8037.57/SwiftShader, viewport 650×760, DPR 1, canvas 650×456: otto coppie di immagini identiche pixel per pixel (errore massimo e medio zero). Nativo Low/High/Cinema giorno/notte, Kenney Low giorno/notte. Seme SSAO, vento e camera fissati esclusivamente nell’harness visuale; nessun override del clock nei benchmark di produzione. Immagini reali diurne/notturne Cinema anche ispezionate: scena presente, dettagli e illuminazione conservati.

Nei due versi di marcia coincidono gli hash di tutte le trasformazioni della gerarchia dei rotabili e lo stato completo diagnosticato, nativo e Kenney. Test mirato sui binding delle ruote copre caricamento, rilascio, sostituzione dei figli a pari numero e odometri positivi/negativi. Suite corrente: 130 casi Node passati, 9 Python e build passati. Sorgenti protette confrontate byte per byte con 5C, incluso costruttore del tracciato, clock, interfaccia e scena.

Le prove sono in `regression/visual`, non soltanto nel codice del test. Nessuna riduzione di ombre, vegetazione, texture o profili. I contatori di profilazione precedenti possono differire a Low per le pose/camera legate al tempo reale (385 contro 389 chiamate); non sono un confronto a pose fissate e non rappresentano una semplificazione. High/Cinema risultano identici. Verifica frame di produzione e stabilità ancora separate e in corso: nessuna chiusura generale della 5D con questo checkpoint.
