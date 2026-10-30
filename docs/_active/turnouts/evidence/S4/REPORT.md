# S4 — Animated Red Route Arrows

> Rapporto della chiusura tecnica a `48a89d1`, conservato come storico. La successiva [rifinitura conservativa e nuova validazione](refinement/REPORT.md) è lo stato corrente; corregge soltanto la tangente delle punte e rinnova le evidenze. Le misure sotto rimangono quelle del precedente checkpoint.

**PASS tecnico. Approvazione estetica e funzionale dell'utente PENDING. S5 NON iniziata.**

Ripresa dal checkpoint remoto verificato `c54c8c12d43a07c62228b99b8ffdbd66cedb13a5` sul branch `feature/turnouts`, working tree iniziale pulito e 87 hash delle evidenze validi. S0–S3 e checkpoint intermedio presenti sul remoto; main iniziale `6487f61612818c8cd46d882741cfa1ca96ac5a16`. La ripresa completa le verifiche mancanti: **nessuna modifica al runtime rispetto al checkpoint**, nessuna modifica alla Variante B approvata.

## Risultato e convenzione

[Contratto S4](../../S4_ROUTES.md). Tre moduli separano proiezione pura S1, osservazione read-only Journey e rendering. #EF5066, traccia 0,85 mm aderente alla polilinea canonica, piccole punte, comparsa smoothstep 340 ms e idle fermo. Venti geometrie create una volta e otto materiali per animazioni indipendenti; un programma shader condiviso dalla cache, nessuna luce, postFX o nuovo RAF.

I sei scambi semplici rappresentano esclusivamente il ramo attualmente selezionato. I WX310 rappresentano sempre **due** percorsi: upper/lower nel rettilineo, down/up nel crossover. Le diagonali si incrociano graficamente senza creare un nodo ferroviario. I percorsi sono quelli immutabili di S1, senza curve Bézier indipendenti o una seconda tabella di instradamento.

Senza un approccio determinato: traccia e due punte opposte, anche senza treni. Con un treno in movimento: punta singola nel verso della velocità reale e della Journey, osservando l'ultimo veicolo in retromarcia. L'altro percorso WX rimane bidirezionale. Provenienze opposte sullo stesso percorso non assegnano una precedenza: tornano alla convenzione bidirezionale. Un ingresso bloccato non aggiunge rami; UNKNOWN nasconde le frecce del dispositivo. Osservazione entro 600 mm dal respingente, al massimo ogni 150 ms o al cambio di stato: è un criterio grafico, non una distanza di sicurezza.

**Rosso = itinerario impostato, NON via libera.** Le frecce non prenotano, non autorizzano e non cambiano router, Journey o protezioni. Le richieste restano nello stesso dispatcher protetto. Reduced motion mostra subito il percorso fermo. Blu B = identità, rosso = itinerario; profondità attiva e mesh escluse dal raycast. B è il default ufficiale e il suo modulo resta byte-identico a S3; nessun controllo permanente aggiunto alla plancia.

## Evidenze visive e valutazione

- [Galleria comparativa Markdown](visual/GALLERY.md) e [pagina HTML](visual/index.html): tutti gli otto nei due stati, giorno/notte, WX-A/WX-B, vista generale, prima/dopo e B + rosso.
- [Metadati effettivi](visual/capture.json): seed, camera, target, zoom, luce, stato, provenienza e fase. Immagini WebGL originali, non ritoccate.
- [Verifiche](visual/comparison.json): sei frame B isolati pixel-identici a S3; frecce visibili nei confronti; stesso percorso WX osservato nei due versi per ciascuno stato; tre frame di comparsa distinti a 0/170/340 ms, progressi 0/0,5/1. Tutti i 48 frame di stato/confronto hanno frecce già stabilizzate.

Le acquisizioni del checkpoint sono conservate: il runtime non è cambiato e sono state nuovamente validate. La fixture definitiva risale di 120 mm con Journey, evitando di supporre che i raccordi esterni WX, alcuni lunghi 62 mm, contengano un punto a 100 mm. L'acquisizione iniziale interrotta non fa parte delle prove consegnate.

Nelle immagini ispezionate i percorsi rossi seguono binari e diagonali e restano distinguibili da B, lasciando leggibili rotaie e massicciata. La vista generale diurna è volutamente discreta: la leggibilità alla distanza preferita dall'utente resta oggetto di approvazione estetica. Non si dichiara tale approvazione sulla base dei test.

## Test e regressioni

| Verifica | Esito / prova |
|---|---|
| npm test | **PASS: 194**, zero fallimenti/saltati — [log](tests/node-tests.txt) |
| Python JMRI | **PASS: 9** — [log](tests/python-tests.txt) |
| npm run build | **PASS** — [log](tests/build.txt) |
| Funzionale S4 | **PASS:** 16 comandi accettati da entrambe le origini, B e hover sugli otto, 16 osservazioni WX (4 accessi × 2 stati × 2 dispositivi), Journey immutata, rifiuti occupati senza cambio/riavvio, UNKNOWN, reduced motion e occlusione esatta — [dati](tests/arrows-browser.json) |
| Materiali/texture runtime | **PASS:** firme identiche alla baseline S3, incluse mappe procedurali ferroviarie |
| S1 | **PASS:** manifest originale completo di 150 rotaie + 75 letti identico a S0 e 16 coppie reali pannello/dispositivo nei due stati — [dati](tests/contract.json) |
| S2 | **PASS:** venti rami, due zoom, hover bidirezionale, click, drag/cancel/blur/wheel, touch CDP tap/swipe/pinch, tastiera, occlusione e selezione locomotiva — [dati](tests/interaction.json) |
| Sicurezza 5C | **PASS:** undici scenari reali, inclusi frontali, composizioni, scambi, frame irregolari e riaggancio — [dati](tests/5c/acceptance.json) |
| Operazioni/GUI | **PASS:** tre circuiti, quarto treno/LRU, manovre, inversioni, STOP ALL esistente, GLB e miniature, HUD/minimappe sincronizzati e quattro viewport senza overflow/un solo contesto WebGL — [dati](tests/phase0/browser-result.json) |
| Risorse GPU | **PASS:** 368 geometrie / 45 texture / 48 programmi stabili dopo cicli; dispose → 348 / 45 / 47; 20 geometrie e 8 materiali rilasciati una sola volta, root rimossa |
| GPU/touch fisici, matrice completa 5D | **NOT VERIFIED**; Chromium/SwiftShader e touch CDP |

[Esiti e ambienti delle suite](tests/regressions.json). In questa ripresa si sono corrette due assunzioni del solo test S4: il clock doveva iniziare la transizione prima di avanzare di 500 ms, e dopo il clear diagnostico il puntatore doveva uscire/rientrare nella riga per generare pointerenter. Nessuna modifica al prodotto o alle protezioni per far passare i test. Le suite complete definitive sono tutte PASS, senza errori JavaScript o richieste fallite.

## Performance rispetto a 5D e S3

Baseline 5D dall'archivio di `58bbe62bffb37f19125ddb38513502b5ca306821`, bundle minificato SHA-256 `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`, uguale alla baseline pubblicata. S3 da `fd32b43`. Un solo browser, quattro contesti sequenziali, nessun test CPU concorrente; seed 516, Low/giorno48, 650×760 DPR1, overview fissa e simulazione in pausa. 16 intervalli RAF reali dopo tre di riscaldamento per condizione. S3-B indica B configurata e senza hover, non glow visibile.

| Condizione | p50 ms | p95 ms | Δ p50 vs 5D | Δ p95 vs 5D | Draw call |
|---|---:|---:|---:|---:|---:|
| 5D | 2000.00 | 2199.90 | +0.00% | +0.00% | 367 |
| S3-B | 1991.55 | 2183.40 | -0.42% | -0.75% | 343 |
| S4-red | 1999.90 | 2050.00 | -0.01% | -6.81% | 353 |
| S4-red-blue | 1991.55 | 2016.60 | -0.42% | -8.33% | 354 |

Nel campione nessun caso S4 supera il budget storico di ripetizione (+10% mediana / +15% p95). [Dati grezzi](tests/performance.json), [log](tests/performance.txt). Il minore numero di draw call rispetto a 5D deriva dalla rimozione degli indicatori S2; non viene rivendicato come ottimizzazione delle frecce. Il rosso aggiunge dieci draw call rispetto a S3 idle; il blu attivo ne aggiunge una.

Osservazione di tre treni in movimento e proiezione degli otto dispositivi: mediana dei 16 costi medi di batch **0.0180 ms per aggiornamento forzato**, 1600 aggiornamenti complessivi, senza fisica né render. La cadenza normale è al massimo una scansione ogni 150 ms, oltre ai cambi di stato. È una misura della sola nuova presentazione, non del motore ferroviario.

Sono campioni software limitati, non FPS fisici, non la matrice completa 39+39 della 5D e non un benchmark di flotta in moto con render. Gli scostamenti includono variabilità di scheduling; non si rivendicano miglioramenti di velocità.

## Integrità, sicurezza e chiusura

[Invarianti](tests/invariants.json): canonico rigenerato senza diff, SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. 64 file originali di fonti/asset/dipendenze identici a S3, compreso il glow B; cinque funzioni calde identiche, inclusi requestToggle e dinamica. Manifest runtime 150/75 identico a S0, materiali/texture identici a S3. Nessuna modifica a tracciato, massicciata, Kato, topologia, motore, HUD/minimappe, backend, dipendenze o altri repository. Nessuna importazione V2.

ID e numeri nuovi validati, nessun eval/HTML non sicuro/rete applicativa superflua o segreto aggiunto; scan runtime circoscritto PASS e nessun hook di profiling nel bundle produzione. Non sostituisce l'audit generale 5E. Il modulo non aggiunge listener; riusa la preferenza già esistente e viene eliminato su pagehide.

Limiti: GPU/touch hardware e benchmark completo 5D non verificati, occlusione geometrica conservativa della vegetazione alpha ereditata da S2; contrasto alle distanze elevate da giudicare visivamente. Nessun difetto tecnico bloccante rilevato. Nessuna nuova frenata, cartello STOP o campanello: S5 non iniziata.

[Provenienza e comandi](commands.json), [handoff](RESUME.md). Il commit finale che aggiorna questo rapporto chiude le verifiche dopo il checkpoint `c54c8c1`; SHA locale/remoto e clean tree verificati nella consegna, solo fast-forward feature/turnouts. Origin/main invariato, nessun merge, rebase, reset, force-push o deployment.

**STOP: attendere approvazione grafica/funzionale delle frecce e autorizzazione esplicita S5.**
