# Scenario V06 — R0

**R0 ANALISI COMPLETATA CON DIPENDENZE APERTE — QUALITY GATE REGIA PENDING. CONTRATTO NON CERTIFICATO; NO-GO R1.** Il checkpoint remoto e il suo SHA effettivo sono verificati nella consegna finale; un push fallito non vale come pubblicazione completata.

M0.1-R accettato; autorizzata soltanto R0. Base `ffba29fd40dcda874124ca4d8f6b8b169d7b2298`, branch `codex/scenario-v06-r0-contract`. Main di riferimento `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`.

Il [rapporto R0](R0_TRACK_CONTRACT_REPORT.md) copre 79/79 pezzi con mapping proposto verso 68 elementi del manuale; 17/17 estremità classificate (otto WX, sei in tre gap, tre terminali); cinque semplici/Y e due WX con porte/stati proposti e 64 casi WX. A/B chiudono metricamente; C conserva G3, il triangolo G1/G2 e la necessità di manovra sul comune N07. Nessun collegamento per vicinanza o correzione geometrica.

**Dipendenze aperte:** sorgenti track_centrelines/porte/giunti non recuperati, `.layout` disponibile ma non decodificato, percorsi completi e aghi WX mancanti, due checksum incoerenti senza causa accertata, fine aperta N16 in conflitto col paraurti dedotto export, capacità/stop e itinerari da certificare. Richieste F01–F08 e decisioni D01–D08 nel rapporto.

**Nuove verifiche R0:** 254 test Node PASS, 9 JMRI PASS, build PASS; copertura, trasformazioni, lunghezze, matrici e riproducibilità audit PASS. Bundle `1ac2022b781311ca3fcc03e6373a55fc56c45eabd714c56694e7107d12352378` identico alla baseline. Browser/circolazione V06 NOT VERIFIED. Log e perimetro in [evidence/R0](evidence/R0/README.md).

Solo documenti/evidenze scenario e appendice PROGRESS. Rapporto M01 invariato; nessuna modifica applicativa, geometrica, renderer, UI, asset, dipendenze, workflow o backend. Nessun merge/deploy/M0.2/R1.

**Prossima e unica azione:** Quality Gate Regia e assegnazione delle integrazioni. L'accettazione dell'analisi non risolve i dati mancanti e non autorizza automaticamente R1.
