# Train Management M1 — consegna tecnica

Rapporto della baseline M1. Estensione corrente: [M1.1 — vista laterale](M1.1_REPORT.md); [stato](STATUS.md).

Baseline verificata con fetch: HEAD e origin/main entrambi `2a48681c9a7fbfa97386ab619684cab55c779b98`, working tree iniziale pulito. Branch isolato `codex/train-management-m1`. Nessuna importazione E1. Unico esecutore tecnico, nessun subagent.

## Interfaccia e architettura

- Accesso dalla sidebar; la plancia mantiene dimensioni, comandi e console esistenti.
- Catalogo grafico: 8 modelli SerieN e 6 Kenney caricati dal gestore asset già esistente, con nome, tipo e dimensioni N. STOCK rimane la fonte dei modelli nativi; il diesel legacy usa la misura delle mesh originali già visitate dal gestore. Gli eventuali asset non caricabili non vengono dichiarati disponibili.
- Miniature locomotive riutilizzate; otto nuove anteprime carri generate dai costruttori/GLB esistenti con `captureLocomotiveThumbnail`, senza un renderer aggiuntivo durante l'uso di M1. Generazione riproducibile con `python3 tests/capture-train-management-thumbnails.py`, server locale su :8000.
- Tutte le composizioni presenti, selezione comune con la plancia, dettaglio con identità dei veicoli, locomotiva e carri nell'ordine reale, direzione corrente e lunghezza calcolata da `consistLayout` con lo stesso contratto delle console. La lunghezza complessiva include gli agganci; le dimensioni del catalogo sono quelle dei modelli.
- Sganciati derivati dall'array reale `detached`, con identità e binario; nessun inventario fuori scena.
- Focus 3D tramite `select` e `nav.focus` esistenti. Selezione nella console/3D rispecchiata nel pannello. Dialog nativo con contenimento focus, Escape e ritorno al pulsante; layout desktop e tablet.
- Modulo di presentazione separato e proiezioni pure, estendibili con future viste senza introdurre azioni M2/M3. Nessuno store ferroviario aggiunto: soltanto stato della vista e firma per evitare ricostruzioni DOM inutili. Refresh strutturale al massimo 4 Hz quando aperto; nessuna proiezione quando chiuso.

## Verifiche

- `npm test`: **229 PASS**, zero fallimenti/saltati. Inclusi ordine/identità in retromarcia, lunghezza dal contratto ferroviario, lettura senza mutazioni, dimensioni importate e metadati catalogo indipendenti.
- `python3 -m unittest discover -s tests -p '*_test.py'`: **9 PASS**.
- `npm run build` e `git diff --check`: **PASS**.
- `python3 tests/browser-train-management.py`: **PASS**. Selezione e console comuni, occupazione e identità invariate dalla consultazione, ordine in retromarcia, sgancio dal comando esistente, identità del carro sganciato, selezione esterna, catalogo nativo/Kenney, focus 3D, Escape/focus, assenza di overflow. Touch CDP sulla build minificata: PASS. Nessun errore JS o risposta HTTP fallita.
- Regressioni `browser-train-deck.py` e `browser-phase-zero.py`: **PASS**, compresi quarto convoglio fuori dalle tre console, circolazione avanti/indietro, manovre, miniature/HUD e viewport responsive. Copie eseguite sotto `work/regression/` per preservare le prove storiche.
- Screenshot desktop 1440×1000, tablet landscape 1024×768 e portrait 768×1024, catalogo tablet: acquisiti e ispezionati visivamente.

### Provenienza e limiti browser

Chromium headless / SwiftShader. La fixture locale sostituisce esclusivamente il modulo auth nella pagina di test, senza richieste Supabase né modifiche alla produzione. I primi tentativi con rendering continuo hanno incontrato timeout; il collaudo funzionale finale usa una build esbuild leggibile degli stessi sorgenti e blocca solo la callback `tick`, disegnando su richiesta. Le regressioni usano la stessa fixture; la prova touch usa invece `dist/game.js` minificato e intercetta il solo ciclo grafico. I clock/step e i comandi ferroviari restano quelli reali. Non è un nuovo benchmark prestazionale e non verifica GPU, touch fisico, screen reader o autenticazione cloud.

Il test M1 costruisce automaticamente `work/m1-test-bundle.js`. Server: `python3 -m http.server 8000` dalla root. Le copie riproducibili delle regressioni, con le sole fixture di autenticazione/rendering, sono `evidence/M1/run-train-deck.py` e `evidence/M1/run-phase-zero.py`: eseguirle da una directory scratch tramite percorso assoluto per preservare le prove storiche.

## Invarianti e sicurezza

Diff limitato ad aggancio UI, metadati read-only del gestore asset, nuovi moduli/test/anteprime e documentazione. Motore R1, collisioni, occupazione, router, canonico, mesh rotaie, asset preesistenti, scenografia, camera e funzionalità della plancia conservati. Nessuna composizione creata/eliminata/modificata da M1; i test di sgancio usano i comandi già presenti. Nessuna dipendenza aggiunta, nessuna modifica Supabase/Auth/cloud, workflow o configurazione di produzione. Testi dinamici inseriti con `textContent`; markup HTML soltanto costante; nessun eval o segreto introdotto.

## Evidenze e checkpoint

[evidence/M1](evidence/M1) contiene log dei gate e screenshot:

- [Desktop](evidence/M1/desktop.png)
- [Tablet landscape](evidence/M1/tablet-landscape.png)
- [Tablet portrait](evidence/M1/tablet-portrait.png)
- [Catalogo tablet](evidence/M1/catalog-tablet.png)
- [Risultato browser](evidence/M1/browser.json)

Commit atomico: quello che introduce questo rapporto (`git log -1 --format=%H -- docs/_active/train-management/REPORT.md`). SHA effettivo, verifica del checkpoint remoto e link Draft PR nella consegna. Main e deploy non autorizzati né eseguiti. **STOP dopo M1; attesa review della Regia.**
