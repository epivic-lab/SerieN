# M0.1-R — evidenze e provenienza

Baseline: `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`. I log sono le esecuzioni effettive di M0.1-R, conservate prima del mandato successivo di pubblicazione.

| Evidenza | Significato e limite |
| --- | --- |
| [node-tests.txt](node-tests.txt) | 254 PASS, zero fail/skipped; baseline del simulatore, non rete V06 implementata. |
| [python-tests.txt](python-tests.txt) | 9 test JMRI PASS sulla baseline legacy. |
| [build.txt](build.txt) | Build locale con dipendenze esistenti; nessuna installazione o aggiornamento. |
| [topology-analysis.json](topology-analysis.json) | Analisi in sola lettura dei metadati V06: estremità esatte e distanze diagnostiche. Non è un grafo operativo, non autorizza giunzioni per vicinanza. |
| [audit-verification-before-publication.json](audit-verification-before-publication.json) | Ricevuta storica di fine audit: hash rapporto, 4.037 file tracciati invariati, nessun codice/UI/asset modificato e nessuna pubblicazione ancora eseguita in quel momento. |
| [publication-scope.json](publication-scope.json) | Confronto della baseline nel worktree dedicato e perimetro documentale; le verifiche dell'audit sono riusate per identità, non attribuite a un'esecuzione nuova. |

Il rapporto pubblicato conserva SHA-256 `e32d7a4d7113e7b6b29a359d9ea2e2581d69f669daeed8a228f1f70830ee0980`. I campi `new_commit:false` / `push:false` della ricevuta storica descrivono lo stato prima del successivo mandato di pubblicazione. Il checkpoint effettivo è il commit che contiene questa directory; il suo SHA e l'uguaglianza con il remoto sono verificati nella consegna finale e nella PR, evitando un auto-riferimento nel commit.

Non sono incluse copie dei GLB o dei documenti Drive completi, URL temporanei o credenziali. Browser V06, prestazioni hardware e migrazione del grafo rimangono NOT VERIFIED. Nessuna M0.2 avviata.
