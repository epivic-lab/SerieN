# S4 — Rifinitura conservativa e chiusura tecnica

**S4 PASS tecnico; approvazione estetica/funzionale PENDING. S5 NON iniziata.**

## A. Stato e baseline

Ripresa dal checkout pulito `48a89d1b9a733578666e831b2df5a20ac28bfcb7`, già uguale al remoto `feature/turnouts`, discendente del checkpoint richiesto `c54c8c12d43a07c62228b99b8ffdbd66cedb13a5`. Fetch, genealogia e integrità verificati prima delle modifiche. Origin/main iniziale `6487f61612818c8cd46d882741cfa1ca96ac5a16`. Il rapporto precedente e le sue immagini restano storici; questa acquisizione riguarda il runtime corretto.

## B. Modifica minima e motivazione

Un solo difetto runtime riscontrato: sui rami curvi la bisettrice della punta seguiva la corda degli ultimi 7 mm, anziché la tangente locale al suo ancoraggio. Corretto soltanto il calcolo della base delle punte in `src/turnout-arrows.js`, usando il campione canonico simmetrico ±0,1 mm. Il nuovo test indipendente sulle quaranta punte dei venti percorsi falliva prima della correzione e ora passa: [log prima](tests/node-before-fix.txt), [misure prima/dopo](tests/tangents.json).

Errore angolare massimo **0,420154° → 0,000102°**, residuo Float32. Ancoraggi sulla polilinea, tutti i vertici delle tracce, UV e attributi role identici. Configurazione interamente invariata: dimensioni/quote, colore #EF5066, idle 0,58, reveal 0,92, shader e durata **340 ms**. Nessun nuovo effetto o refactoring. Glow B byte-identico a S3; geometria ferroviaria, massicciata, router, Journey, sicurezza 5C, dinamica e funzioni calde 5D invariati.

Modifiche di supporto: test Node sulla tangente, `tests/browser-turnout-arrows-refinement.py` per stress e camere, breve annotazione del contratto, rapporti/avanzamento ed evidenze. Nessuna dipendenza, backend, Supabase, plancia, HUD, STOP o audio modificato.

## C. Validazione fresca

| Verifica | Esito / evidenza |
|---|---|
| npm test | **195 PASS**, zero fallimenti/saltati — [log](tests/node-tests.txt) |
| Python/JMRI | **9 PASS** — [log](tests/python-tests.txt) |
| npm run build | **PASS** — [log](tests/build.txt) |
| S4 browser | **PASS:** 16 richieste dalle due origini, 16 casi WX (quattro accessi × due stati × due dispositivi), B/hover8, UNKNOWN, reduced motion, rifiuto occupato e profondità — [dati](tests/arrows-browser.json) |
| S1 | **PASS:** azioni reali su tutti8/stati; manifest completo S0 **150 rotaie +75 letti** identico — [dati](tests/contract.json) |
| S2 | **PASS:** venti rami, due zoom, mouse/tastiera e tap/swipe/pinch CDP, drag/cancel/blur/wheel, camera, occlusione, selezione convogli — [dati](tests/interaction.json) |
| 5C | **PASS:** undici scenari ferroviari/protezioni — [log](tests/5c.txt) |
| Fase0 | **PASS:** circuiti, inversione/manovre, quarto convoglio/LRU/STOP ALL, nativi/GLB, HUD/minimappe e quattro viewport — [log](tests/phase0.txt) |
| Stress aggiuntivo | **PASS:** 200 cicli, **1.616 richieste protette** con clock a passi di 5 ms; mesh visibili confrontate a S1 dopo ogni comando, nessun percorso fantasma o animazione residua — [dati](review/review.json) |
| Camere e resize | **PASS:** 24 pose (Y-IN/WX-A/WX-B × due stati × opposto/basso × zoom 0,8/1,4), orbita/rotella UI reali, tre resize (1280×900, 390×844, 960×820), itinerari preservati |
| Idle | **PASS:** due framebuffer idle pixel-identici per ognuna delle 24 pose; differenza off/on del dispositivo non vuota |
| Invarianti | **PASS:** canonico rigenerato senza diff, 64 file originali e cinque funzioni calde identici a S3 — [dati](tests/invariants.json) |

Canonico SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Firme dei materiali e delle texture runtime uguali a S3. Nessun errore JavaScript/console né richiesta fallita osservato nelle suite monitorate; nessun errore WebGL osservato. Le verifiche non certificano tutte le combinazioni di hardware e driver.

### GPU e performance

Lo stress mantiene le stesse venti geometrie e gli stessi materiali (identità oggetti verificata a ogni richiesta). Dopo warmup di entrambi gli stati, contatori invariati in dieci campioni e alla fine: **360 geometrie /45 texture /47 programmi**. La suite funzionale verifica separatamente il dispose: **20 geometrie, 8 materiali, un programma rilasciati**. I totali dei due contesti differiscono per fixture/qualità/risorse caricate; non sono misure della VRAM in byte.

| Versione | RAF p50 ms | p95 ms | Δ p50 /p95 su 5D | Draw call |
|---|---:|---:|---:|---:|
| 5D | 1999.90 | 2183.30 | +0.00% /+0.00% | 367 |
| S3-B | 1983.20 | 2199.90 | -0.84% /+0.76% | 343 |
| S4-red | 1983.20 | 2049.90 | -0.84% /-6.11% | 353 |
| S4-red-blue | 1999.95 | 2099.90 | +0.00% /-3.82% | 354 |

Confronto nuovo, sequenziale e isolato: un Chromium/SwiftShader, viewport650×760/DPR1, Low giorno48, panoramica fissa, seed516, dinamica in pausa. Sedici intervalli RAF dopo tre warmup per condizione. Baseline: build pubblicata5D `58bbe62`, S3 `fd32b43` configurata B; hash effettivi in [provenienza](commands.json). Entrambe le condizioni S4 rispettano le soglie di ripetizione +10% p50/+15% p95 rispetto sia a5D sia aS3. Nessuna regressione prestazionale significativa rilevata in questo campione breve; non è la matrice completa5D né una misura di FPS hardware.

Proiezione grafica con tre treni osservati in movimento: 1.600 aggiornamenti forzati, mediana delle sedici medie di100 = **0.0210 ms**; normalmente la scansione è al massimo ogni150ms. Non misura fisica né rendering. [Dati completi](tests/performance.json), [log](tests/performance.txt). Un primo tentativo è terminato prima dei campioni per ERR_EMPTY_RESPONSE del server locale; server riavviato con log su file e intera misura ripetuta. Nessuna modifica al prodotto per tale problema.


## D. Risultato visivo e limiti

Nuove **73 immagini WebGL** sulla versione corretta: 14 baseline S3 e 59 candidate, tutti8 × due stati × giorno/notte, panoramica, B+rosso, WX da provenienze opposte e reveal a 0/170/340 ms. [Galleria completa](visual/GALLERY.md), [pagina HTML](visual/index.html), [camere/zoom/resize](review/GALLERY.md), [metadati](visual/capture.json), [confronti automatici](visual/comparison.json).

**PASS:** sei confronti B isolati pixel-identici a S3, frecce effettivamente visibili, due versi sullo stesso percorso WX in entrambi gli stati, tre framebuffer distinti con progressi 0/0,5/1. Campione/seed516, DPR1, camera/luce e clock registrati; immagini originali, nessun ritocco. Ispezionati i due WX (giorno con B e notte crossover) e tutti e tre i frame reveal, oltre a pose basse/opposte e telefono del collaudo aggiuntivo.

I WX310 conservano due itinerari reali simultanei per stato e nessun collegamento ferroviario al centro dell’incrocio. Verificati quattro accessi/due stati, due provenienze opposte sullo stesso percorso e versi coerenti con Journey; se il verso non è determinabile la convenzione rimane bidirezionale. UNKNOWN nasconde il dispositivo. Rosso significa itinerario impostato, **non via libera**.

Le pose ispezionate mostrano tracce aderenti alle rotaie e distinguibili dal glow B. A distanza e nelle viste radenti il rosso resta discreto; il gusto e la leggibilità alla distanza preferita sono da approvare dall’utente. I campioni statici non mostrano flicker, ma non coprono ogni angolo o driver.

**NOT VERIFIED:** GPU e touch fisici, matrice completa 5D, ispezione continua di ogni angolo/zoom. Verifica manuale proposta: su GPU reale aprire la stessa versione, passare giorno/notte, commutare tutti8 anche rapidamente, percorrere un’orbita completa con zoom minimo/massimo e viste quasi radenti; controllare WX, assenza di flicker/artefatti, occlusione corretta, conclusione dopo340ms e persistenza attenuata, B invariata. Ripetere tap/drag/pinch su touch fisico e annotare browser/GPU/DPR. Non trattare questa procedura proposta come eseguita.

## E. Repository e riproduzione

Branch esclusivo `feature/turnouts`. Un commit atomico di questa rifinitura seguito da push fast-forward esplicito sullo stesso branch, confronto SHA remoto/locale e working tree pulito; SHA effettivo nella consegna, risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S4/refinement/REPORT.md`. Origin/main verificato invariato a `6487f61612818c8cd46d882741cfa1ca96ac5a16`; verifica remota finale nella consegna. Nessun merge/rebase/reset/force-push/deployment.

[Comandi/provenienza](commands.json), [esiti delle cinque suite](tests/regressions.json), [hash delle nuove evidenze](evidence-sha256.json). Gli script versionati generano bundle temporanei fuori da dist; nessun hook di collaudo nel prodotto. Le prove S3 e le immagini S4 precedenti sono preservate.

## F. Decisione

**S4 tecnicamente pronta per l’approvazione estetica/funzionale dell’utente. Nessun blocco tecnico rilevato**. Nessun lavoro S5. Attendere approvazione estetica/funzionale esplicita delle frecce rosse; la B è già approvata.
