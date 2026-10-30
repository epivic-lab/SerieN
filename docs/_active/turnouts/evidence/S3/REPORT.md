# S3 — Blue Pulsating Glow

**Stato: PASS tecnico; approvazione estetica PENDING. S4 non iniziata.**

Autorizzazione: richiesta S3 dell'utente, che approva S2 e limita il lavoro al glow. Le istruzioni del PDF restano specifiche di riferimento, senza autorizzare altre sottofasi. Baseline pulita `feature/turnouts` a `6bdec29194d4e232eeab0e1ff5a8d4e6b26ec47b`; S0/S1/S2 presenti e verificati sul remoto prima delle modifiche. `origin/main` iniziale `6487f61612818c8cd46d882741cfa1ca96ac5a16`.

## Risultato e confronto estetico

A **Precision Outline**: nucleo sottile, feather contenuto, pulsazione discreta. Conserva bene la lettura del pezzo, ma nella vista generale diurna e nelle viste radenti è meno evidente.

B **Soft Conformal Glow**: stesso profilo, diffusione locale più larga e modulazione più percepibile. Si riconosce meglio a distanza e di notte; la maggiore presenza luminosa è il principale compromesso da valutare nell'approvazione visiva.

Nelle immagini ispezionate il blu segue bordi e diramazioni, lascia leggibili rotaie e massicciata e non aggiunge nodi ai WX310. Le estremità restano aperte e sfumate, evitando una cornice rettangolare. I dettagli metallici non vengono sostituiti da materiali luminosi. Questa valutazione tecnica **non costituisce approvazione estetica**.

- [Galleria comparativa Markdown](visual/GALLERY.md): senza glow / A / B, due semplici, WX-A, WX-B, vista generale, giorno e notte.
- [Pagina HTML comparativa](visual/index.html): consultabile servendo il checkout o aprendo il file locale; nessuna pubblicazione/deployment eseguita.
- [Camera, luce e fase effettive](visual/capture.json), [risultati pixel](visual/comparison.json).
- Sei fotogrammi: `visual/pulse-A-{200,700,1100}.png` e `visual/pulse-B-{200,700,1100}.png`. Tre fasi distinte per ciascuna variante, periodo 1400 ms; nessun video sintetico.

Tutti i confronti usano identica camera/target/zoom/luce e seed. Viewport 1100×860, DPR 1, framebuffer della canvas estratto direttamente dal renderer nello stesso task; immagini originali non ritoccate. Dieci frame spenti S3 sono **pixel-identici alla build S2**. A e B sono visibili rispetto allo spento in tutti e venti i confronti.

## Implementazione e confini

[Contratto S3](../../S3_GLOW.md). Nuovo `src/turnout-glow.js`, integrazione minima in `app.js`, callback di identità e breve durata touch in `src/turnout-interaction.js`. Test automatici e ricette di acquisizione documentati in [recipes](recipes/README.md).

Le geometrie overlay derivano da **tutti** i percorsi canonici del modello S1, non dal solo stato selezionato. Il bordo esterno segue l'unione dei letti, con accenti accoppiati lungo le reali spalle delle rotaie. WX-A e WX-B conservano i percorsi longitudinali e diagonali effettivi; nessun collegamento ferroviario centrale viene generato. Nessun riferimento al progetto fisico V2.

Un solo materiale/shader, otto geometrie create una volta, un solo dispositivo visibile, nessuna luce dinamica o nuovo pass postFX. Depth test attivo, raycast disabilitato sulle nuove mesh. Risorse aggiunte dopo il batching, senza alterarlo. A/B cambia uniformi, senza ricostruire oggetti. Idle senza aggiornamento di pulsazione; animazione nel tick già esistente.

Identità condivisa plancia/dispositivo/tastiera; il tap mantiene l'identificazione per 1100 ms e conserva l'unica richiesta protetta. Hover e glow non modificano stato ferroviario. Occupato non implica invisibile: identificazione possibile, commutazione ancora respinta. Preferenza di movimento ridotto osservata in tempo reale, glow statico dopo fade. Pagehide rimuove timer, listener e risorse.

## Verifiche

| Verifica | Esito / prova |
|---|---|
| Node | PASS, 175 test, zero fallimenti o saltati — [log](tests/node-tests.txt) |
| Python JMRI | PASS, 9 test — [log](tests/python-tests.txt) |
| Build produzione | PASS — [log](tests/build.txt) |
| Tutti gli otto dispositivi, hover da plancia e plastico, A e B | PASS, 16 coppie bidirezionali; nessuna mutazione — [browser](tests/glow-browser.json) |
| Tastiera, touch tap singolo, swipe senza commutazione | PASS, Chromium/CDP |
| Reduced motion reale | PASS, due frame statici esattamente uguali |
| Occupato/protetto | PASS, glow disponibile e richieste da entrambe le origini respinte |
| Profondità | PASS, solido opaco davanti al glow: frame acceso/spento identici |
| High giorno/notte, entrambe le varianti | PASS, nessun errore shader/JS o richiesta fallita |
| Risorse GPU e listener | PASS: 348 geometrie / 45 texture / 84 programmi stabili dopo cicli; dispose → 340 / 45 / 83; 8 geometrie e 1 materiale liberati una sola volta, listener preferenza 1 aggiunto / 1 rimosso |
| Geometria originale | PASS, 150 rotaie + 75 letti: manifest completo identico a S0 |
| Materiali e texture | PASS, firme runtime S2/S3 identiche — [dati](tests/views/views-materials.json) |
| Camere opposte/basse, zoom 0,8 / 1,2 | PASS, 12 confronti accesi/spenti, entrambi gli stili su Y-IN/WX-A/WX-B; [dati e immagini](tests/views/views-materials.json) |
| Suite S1/S2 | PASS, 16 coppie reali nei due stati; venti rami, due zoom, mouse/touch/pinch/tastiera, occlusione e selezione locomotiva — [esiti](tests/regressions.json) |
| Simulazione, sicurezza 5C, plancia/HUD/minimappe/responsive | PASS, undici scenari 5C e suite operativa Phase0 su quattro viewport — [esiti](tests/regressions.json) |
| Performance rispetto a 5D | PASS nel campione isolato — [dati](tests/performance.json) |

I test Node verificano tutti gli otto overlay e ogni percorso reale con un oracle indipendente sui due bordi ferroviari; stessi vertici/materiale per A/B, fade, pulsazione, rientro, input invalidi, nessuna mutazione del grafo e dispose idempotente. Le tabelle/router S1 continuano a coprire i due stati e tutte le provenienze.

## Confronto prestazionale con 5D

Build 5D ricostruita da archivio di `58bbe62`, SHA-256 minificato `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`, uguale alla baseline pubblicata. Nessuna sostituzione della baseline 5D con S2. Un solo Chromium, contesti sequenziali, nessun test CPU concorrente, seed 516, Low/giorno 48, viewport 650×760, DPR 1, overview fissa, simulazione in pausa; clock RAF reale, nessuna accelerazione artificiale. 16 intervalli misurati dopo 3 di riscaldamento per condizione.

| Condizione | p50 ms | p95 ms | Δ p50 vs 5D | Δ p95 vs 5D | Draw call |
|---|---:|---:|---:|---:|---:|
| 5D | 1983.20 | 2066.60 | +0.00% | +0.00% | 367 |
| S3-off | 1983.25 | 2049.90 | +0.00% | -0.81% | 343 |
| S3-A | 1999.90 | 2099.90 | +0.84% | +1.61% | 344 |
| S3-B | 1949.90 | 2199.90 | -1.68% | +6.45% | 344 |

Nel campione nessuna variante supera +10% p50 / +15% p95. A/B aggiungono una sola draw call rispetto allo spento. Il calo di draw call da 5D deriva dalla rimozione degli indicatori S2, non da un'ottimizzazione attribuita al glow. Texture 44 in tutte le condizioni; geometrie GPU residenti 362 / 338 / 339 / 339, riferite alle sole risorse caricate in questa fixture, non al numero di mesh canoniche. La prova di lifecycle completa riscalda tutti e otto gli overlay e registra separatamente 45 texture.

Queste misure software non sono FPS fisici, non misurano una flotta in movimento e non ripetono le 39+39 acquisizioni della matrice completa 5D. I piccoli scostamenti includono variabilità di scheduling; non si rivendica un miglioramento di velocità. Sorgenti e funzioni calde 5D sono conservati e i test ferroviari verificano separatamente la dinamica.

## Integrità e sicurezza

[Verifica sorgenti](tests/invariants.json): 62 file di fonti/asset/dipendenze bloccati identici a S2, comprese geometrie, materiali, router, Journey, sicurezza e render ferroviario. Quattro funzioni calde applicative identiche (`advanceFleet`, `renderVehicles`, `getSwitchAssistance`, `switchHUDState`); nel tick si aggiunge solo `turnoutGlow.update(now)` prima del render. Canonico rigenerato senza diff, SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Immagini spente identiche confermano anche la conservazione visiva di letti e materiali nelle dieci fixture.

Nessuna modifica a dipendenze, backend/Supabase, permessi, asset o altri repository. ID e nuovi numeri validati. Nessun eval, HTML non sicuro, chiamata di rete applicativa o credenziale aggiunta. Scan circoscritto ai sorgenti runtime e assenza di hook temporanei nella build produzione verificati. Non sostituisce l'audit generale 5E.

## Limiti e checkpoint

GPU fisiche e touch hardware: **NOT VERIFIED**. Chromium/SwiftShader e touch CDP non certificano tutti i dispositivi, angoli o FPS reali. Occlusione geometrica conservativa della vegetazione alpha ereditata da S2. La verifica di profondità usa anche un ostacolo opaco sintetico; non prova ogni oggetto della scena. Nessun difetto bloccante conosciuto; la leggibilità estetica alle distanze preferite dall'utente richiede la sua scelta.

Il default A e `?turnoutGlow=A/B` sono provvisori per il confronto; nessun controllo permanente aggiunto alla plancia. Frecce, STOP/audio, protezioni e altre sottofasi non modificate.

Commit atomico S3: il commit che introduce questo rapporto (`git log -1 --format=%H -- docs/_active/turnouts/evidence/S3/REPORT.md`). SHA locale/remoto e clean tree verificati nella consegna finale, solo `feature/turnouts`, fast-forward. Nessun push main, merge, rebase, reset, force-push o deployment. Protocollo permanente già presente in AGENTS, non duplicato.

**STOP: attendere scelta visiva A/B, eventuali rifiniture e autorizzazione esplicita S4.**
