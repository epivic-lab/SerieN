# Evidenze R0 — osservazioni e proposte distinte

Data: 2026-11-13 UTC. [Rapporto](../../R0_TRACK_CONTRACT_REPORT.md). Le tabelle sono evidenze di audit: non sono caricate dal simulatore e non costituiscono un dataset operativo R1. Associazioni fisiche e connessioni proposte rimangono non certificate.

| File | Contenuto e limite |
| --- | --- |
| [source-lock-as-received.json](source-lock-as-received.json) | Byte/hash delle 13 fonti acquisite, ID/URL Drive, confronto manifest; non certificazione del produttore |
| [revision-reconciliation.json](revision-reconciliation.json) | Diff dei manifest, cronologia Drive sanitizzata; causa mismatch sconosciuta, GLB non verificati in R0 |
| [source-recovery-search.json](source-recovery-search.json) | Ricerche accessibili e limiti della lettura nativa |
| [source-examination.json](source-examination.json) | 68 tipi/codici confrontati con p19 manuale, allegati PDF e leader SVG |
| [piece-matrix.csv](piece-matrix.csv) | Tutti i 79 pezzi, estremi/gruppi esatti, codici/ruoli proposti, intervalli nascosti |
| [component-mapping.json](component-mapping.json) | Raggruppamento proposto in 68 componenti |
| [endpoint-classification.csv](endpoint-classification.csv) | Tutte le 17 estremità singole, senza connessione certificata |
| [gap-classification.json](gap-classification.json) | G1/G2/G3: coordinate/distanze, intenzione dal manuale, geometria irrisolta |
| [proposed-port-registry.json](proposed-port-registry.json) | Sette controller proposti, porte/stati, 64 casi WX; campi mancanti espliciti |
| [route-checks.json](route-checks.json) | Sequenze/lunghezze/gap, transizione N07 vietata nel triangolo |
| [conditional-connectivity.json](conditional-connectivity.json) | Scheletro sotto assunzioni; unione degli stati, non grafo operativo |
| [validation-summary.json](validation-summary.json) | Conteggi/copertura e hash; non certificazione AS-BUILT |
| [alignment-diagnostic.png](alignment-diagnostic.png) | Diagramma ispezionato dei dati ricevuti, senza saldature/prolunghe |
| [audit-contract.py](audit-contract.py) | Audit standalone, libreria standard; legge alignment esatto del lock e produce le tabelle |
| [contract-analysis.txt](contract-analysis.txt) | Prima analisi; successivamente lo script è stato vincolato anche all'hash del lock |
| [reproduction.txt](reproduction.txt) | Esecuzione dello script consegnato e confronto byte per byte dei suoi nove output: PASS |
| [node-tests.txt](node-tests.txt), [python-tests.txt](python-tests.txt), [build.txt](build.txt) | Nuove esecuzioni R0: 254 Node, 9 JMRI, build PASS |
| [checks-summary.json](checks-summary.json) | Exit code, versioni e bundle identico alla baseline |
| [scope-verification.json](scope-verification.json) | Baseline 4.047 file, delta/invarianti pre-commit; SHA remoto effettivo nella consegna |

Riproduzione (nessuna dipendenza dell'app, nessuna modifica ai sorgenti):

```sh
python3 docs/_active/scenario-v06/evidence/R0/audit-contract.py /percorso/fonti-r0 /percorso/output-audit
```

Fornire `railway_alignment.json` esatto del lock. Il controllo dimostra coerenza/riproducibilità della proposta; il mapping incorporato non viene certificato da queste asserzioni. Distinta confrontata separatamente dal PDF. Originali Drive integrali, URL firmati, credenziali e dati personali degli autori non sono pubblicati. Nessuna nuova prova browser/dinamica/hardware V06.
