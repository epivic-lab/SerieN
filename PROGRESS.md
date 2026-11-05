# SerieN — Stato e ripresa

> Stato corrente: 6A.12-R, revisione browser-first proposta; vedere l'ultima voce e il [STATUS Train Management](docs/_active/train-management/STATUS.md). Le voci precedenti restano storiche.

**5A, 5B, 5C e 5D concluse. Pubblicazione su main autorizzata dall’utente il 30 ottobre 2026. 5E non iniziata.**

La richiesta del 30 ottobre ha autorizzato il completamento della 5D dal checkpoint pulito `5ae8ee9`. Controllato GitHub: `main` a `f582b12`, due commit di soli asset/file di sistema rispetto alla base pubblica, preservati. Repository `first` e `SerieN Control` non modificati.

**5D chiusa:** CPU nel carico con quattro composizioni lunghe: passo 4,564 → 0,366 ms (−92%), pose/animazioni −55,9%, assistenza −61,9%. Confronto frame 39+39 acquisizioni/1.488 campioni, nessuna soglia superata; sei sessioni F e 36 cicli. Ritenzione preesistente Bloom riprodotta e corretta: cache dopo tre uscite Cinema 1/2/3 → 0/0/0, un programma GPU rilasciato. Durata logica 108.000 passi per revisione e dieci checkpoint identici, storie limitate a 6/6/7 segmenti.

Codice finale `e8d81d3`: **131 Node**, **9 Python**, build, cinque suite operative browser, otto coppie finali pixel-identiche, cache reale/138,9 s aggiuntivi e Pages sotto `/SerieN/` passati. Timing principale su candidato CPU `5ae8ee9`, cleanup successivo ritestato separatamente: provenienza esplicita nel rapporto. Nessuna promessa di FPS su GPU fisiche o assenza universale di leak.

- [Rapporto conclusivo 5D](docs/PERFORMANCE_AUDIT_5D.md).
- [Dati e tabelle complete](docs/phase-5d/COMPARISON.md), [gate](docs/phase-5d/FINAL_GATES.json).
- [Correzione Bloom e provenienza](docs/phase-5d/BLOOM_LIFECYCLE_FIX.md).
- [Ripresa](docs/phase-5d/RESUME.md): leggere prima di altro lavoro; **5E richiede nuova istruzione esplicita**.

## Rapporti e checkpoint

- [Chiusura 5C](docs/PHASE5C_CLOSURE.md): requisiti, correzioni, prove, rischi residui e rollback.
- [Roadmap](docs/ROADMAP_PHASE5.md): gate delle sottofasi e governance.
- Baseline pubblicata v0.12: `618f538`; audit 5A: `b819864`.
- 5B: `5a551f7`, `afd50db`, conclusione `954461e`.
- Prima implementazione 5C: `d85892f`, rapporto `2a78abc`.
- Verifica indipendente: `5060221`, con gate ancora aperto a quella baseline.
- Chiusura applicativa: `5580799` (passo candidato della flotta), `79247d3` (guardie su modelli/inserimento), `b6ec62d` (contatti invariati), `13ebb2b` (storia sganciata coerente con lo scambio attuale), `8cacb18` (riaggancio al giunto con storia ricostruita).
- Chiusura documentale 5C: `303525c`. 5D: checkpoint iniziali `0775039`, `8292945`, `5ae8ee9`; regressioni `6b3cacf`, `fbf812c`, `71bd99e`; baseline/frame `ad80350`, `97a590a`, `cc2b8b6`, `9051edf`; memoria `7af64e4`, correzione Bloom `e8d81d3`.

Branch di consegna: `performance/phase-5d`, derivato da `303525c`. Codice finale 5D: `e8d81d3`; chiusura documentale nel commit che aggiorna il rapporto 5D. Integrazione autorizzata su `main` dalla base `f582b12`, conservando tutti i suoi 26 percorsi aggiunti. Dettagli in `docs/phase-5d/PUBLICATION.md`. Non fare reset distruttivi del lavoro esistente.

## Esito tecnico della 5C (storico)

Il movimento viene verificato prima del commit del passo, con inviluppi durante il movimento e ricontrollo degli arresti a catena. Posizioni, storia e odometri rifiutati restano conservati. Frontale originario: margine minimo +1 mm, entrambe le locomotive ferme. Inserimento del quarto convoglio e crescita dei modelli non possono introdurre nuovi conflitti; i contatti esistenti possono restare invariati o migliorare. La crescita di uno sganciato non inventa occupazione su un vecchio ramo dopo una commutazione lecita. Il riaggancio attraverso il giunto ricostruisce una candidata tramite il router reale prima del matching e conferma soltanto dopo verifica dello spazio completo.

Geometria canonica, router, Journey/clock, missioni, HUD, plancia, costruttori dei rotabili, asset, dipendenze e workflow conservati. Nessuna galleria. Le modifiche applicative sono confinate a `app.js`, conflitti, coordinamento del passo, comandi flotta e contratti JSDoc. [Confronti](docs/phase-5c-close/preservation.json).

## Verifiche finali della 5C (storico)

- **125 test Node**, zero fallimenti o test saltati; **9 Python JMRI**; build riuscita.
- **Cinque suite browser verdi**: matrice conclusiva 5C (undici scenari), operazioni Fase 0, rendering/operazioni Fase 4, composizioni GLB reali, rollback atomico 5C.
- Tutti gli ingressi degli otto controlli verificati con oracle esplicito e attraversamento completo; quattro terminali con convogli corti e cinque carri; entrambi i rami del runaround; frontali/inseguimenti/WX; carro sganciato su giunto; scambio in avvicinamento; aggancio in curva e al giunto con identità conservate.
- 20/60/120 Hz e frame irregolari con uguale fase iniziale e tempo accettato: stessi stati ferroviari, occupazione, HUD e testo delle consolle. Marker e mesh coerenti; testo reale dell’HUD verificato.
- Schermate Low/High e responsive ispezionate; nessun errore JavaScript o richiesta fallita nelle suite browser riuscite. 36 moduli applicativi, zero cicli ESM statici.

Prove e comandi: [phase-5c-close](docs/phase-5c-close/). Codice applicativo finale verificato: `8cacb18`. Gli output sono locali, contro la build locale; gli script hanno scritto in cwd temporanea e non hanno sovrascritto i report storici.

## Limiti e ripresa

Validazione della simulazione nelle condizioni della matrice: inviluppi sul piano e passo massimo 1/60 s, non certificazione delle mesh articolate o di un impianto reale. La diagnostica può ancora imporre sovrapposizioni per riprodurre difetti; non è una riparazione automatica di stati iniziali invalidi. Restano i limiti metrologici su WX310 e rotabili.

Chromium/SwiftShader non certifica GPU fisiche. La 5D ha misurato e ridotto i costi della previsione e delle animazioni senza cambiare le regole della 5C; vedere il rapporto prestazionale. CSP, supply-chain, CI e recovery restano alla 5E. Il limite del clock di 0,2 s per aggiornamento è conservato e testato.

Alla ripresa leggere rapporto e roadmap, verificare branch/HEAD/working tree e conservare modifiche successive. Usare il checkout esistente `/workspace/SerieN`, senza nuovi worktree salvo richiesta. Ambiente verificato: Node 24.19.0, Python 3.12.14, Chromium/Playwright. Proxy e CA ereditati. Comandi riproducibili in `docs/phase-5c-close/commands.json`.

## Pianificazione futura — Interactive Turnouts (handoff 2026-10-30)

La **Fase 5D è conclusa e pubblicata su main** con commit `58bbe62bffb37f19125ddb38513502b5ca306821`. La pubblicazione è descritta sopra e nei report 5D, che rimangono la fonte principale dei risultati e delle prove.

**Macrofase Scambi S0–S7: S0/S1/S2/S3 APPROVATE (glow B); S4 PASS tecnico / approvazione estetica PENDING; S5 NON INIZIATA.** Le istruzioni operative sono `AGENTS.md`, `docs/_active/turnouts/SPEC_v3.md`, `docs/_active/turnouts/STATUS.md` e `docs/_active/turnouts/CODEX_START.txt`. Prima di S0 Codex verifica branch, working tree, 5D locale e test. L'utente approva **ogni singola sottofase** dopo report, prove e commit; S3 (glow) e S4 (frecce) richiedono approvazione estetica esplicita. Nessuna sottofase è autorizzata automaticamente dal merge di questi documenti.

**Guardrail:** 150 rail mesh, geometria canonica e massicciata intatte; nessuna modifica alla plancia, ai permessi Supabase o al backend durante gli scambi. Il PDF illustrato v3 può essere copiato temporaneamente nella directory attiva solo se effettivamente disponibile; alla chiusura S7 vanno ritirate le specifiche attive e mantenuto `docs/turnouts/FINAL_REPORT.md`.

**Sequenza dopo S7:** completamento Supabase/backend 6A.3–6A.6, Train Management 6B–6E, poi audit finale cybersecurity 5E. Le protezioni minime di sicurezza restano obbligatorie fin da subito.

## Interactive Turnouts — baseline S0 (2026-10-30)

Baseline acquisita sul branch aggiornato `main`, HEAD iniziale `6487f61612818c8cd46d882741cfa1ca96ac5a16` (PR #1 integrata). Verificata l'ascendenza della pubblicazione 5D `58bbe62` e del codice finale `e8d81d3`. Runtime, asset, UI, dipendenze e workflow byte-identici alla 5D pubblicata; bundle locale e live SHA-256 `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`.

- **131 test Node, 9 Python, build e suite browser 5C (11 scenari): PASS**. Suite di produzione per circuiti/manovre/HUD e responsive: evidenze nel rapporto S0.
- Grafo rigenerato senza differenze: 70 nodi, 75 archi, quattro terminali. Hash canonico `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Manifest di **150 rotaie e 75 letti** prima del batching statico.
- Otto riferimenti giorno/notte, semplice e due WX310; camera/seed registrati. PDF originale acquisito e hash verificato. Benchmark 5D conservati con provenienza; nuovo breve campione RAF separato, non confronto equivalente. GPU e touch fisici NOT VERIFIED.
- [Rapporto S0](docs/_active/turnouts/evidence/S0/REPORT.md), [stato](docs/_active/turnouts/STATUS.md), [baseline e verifiche](docs/_active/turnouts/evidence/S0/baseline.json). Commit S0 recuperabile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S0/REPORT.md`.

S0 approvata dall’utente nella richiesta successiva, con autorizzazione esclusiva S1. Il commit S0 è `107178921bbc8049d855c0221b799444231120bb`. Nessun push/deployment S0; 5E non iniziata.

## Interactive Turnouts — S1 (2026-10-30)

**S1 PASS; S2 NON INIZIATA.** Baseline pulita `main` a `1071789`, verificata con fetch e test iniziali. Aggiunti vista pura immutabile dal router e comando unico validato per ID canonico; pannello e picking esistente usano `requestToggle(controlId, origin)`. Entrambi gli stati di tutti gli otto dispositivi, porte, versi, UNKNOWN e due percorsi simultanei per ciascun WX310 documentati nel [contratto S1](docs/_active/turnouts/S1_CONTRACT.md). Selezione locale, accesso di rete, lock e rischio restano distinti.

- **148 Node, 9 Python, build: PASS**. Nuova matrice: 7.168 ingressi su 256 configurazioni globali; nuovo test browser: 16 coppie di vere azioni pannello/marker e rifiuti protetti. Suite browser 5C (11 scenari) e circuito/manovre/HUD/responsive (quattro viewport): PASS.
- **Otto coppie pixel-identiche S0/S1** e stati/trasformazioni nativi/GLB identici nei due versi. Inventario esatto delle 150 rotaie e 75 letti invariato; rigenerazione canonica senza diff. Hash canonico S0 conservato.
- Router, Journey, sicurezza 5C, ottimizzazioni 5D e funzioni calde intatti. Nuova vista predisposta senza lavoro per-frame. Nessuna modifica a indicatori, glow, frecce, STOP, plancia o backend; nessuna nuova dipendenza. Bundle +3.899 byte (+0,40%).
- [Rapporto e limiti S1](docs/_active/turnouts/evidence/S1/REPORT.md), [provenienza/comandi](docs/_active/turnouts/evidence/S1/commands.json). Commit S1 recuperabile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S1/REPORT.md`; SHA effettivo nella consegna. Nessun push/deployment S1.

S1 approvata nella richiesta S2. S0/S1 successivamente salvate sul checkpoint remoto `feature/turnouts` a `99b143c918e016f7e744217aa4c760fc9987deb9`, verificato nuovamente prima di S2. GPU e touch fisici restano NOT VERIFIED.

## Interactive Turnouts — S2 (2026-10-30)

**S2 PASS; S3 NON INIZIATA.** Branch `feature/turnouts`, baseline S1 `99b143c`. Rimossi soltanto gli otto indicatori artificiali (base/stelo/sfera), materiali dedicati e lampeggio/posizionatore obsoleti. Aggiunte otto hit-area CPU-only fuori dalla scena, conformi a tutti i percorsi canonici del modello S1; picking con occlusione e tie deterministico. Stesso dispatcher protetto S1. Identità condivisa per dispositivo/plancia/focus e contorno neutro nella plancia; nessun glow o overlay 3D provvisorio. [Contratto S2](docs/_active/turnouts/S2_INTERACTION.md).

- **161 Node, 9 Python, build: PASS**. Mouse/penna/touch, drag-return, cancel, capture persa/annullata, blur, wheel, input invalidi, cento cicli di mount/dispose. Browser: 16 coppie pannello/dispositivo, venti rami fisici, due zoom, touch CDP tap/swipe/pinch, tastiera, occlusione e selezione locomotive. Regressioni 5C (11 casi), produzione/HUD/responsive e Fase 2 aggiornata (cinque viewport e High giorno/notte): PASS.
- **150 rotaie e 75 letti identici al manifest S0**, canonico rigenerato senza diff e hash `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Materiali/mappe ferroviari invariati. Otto render S2 pixel-identici al riferimento S1 con soli marker nascosti. [Galleria prima/dopo](docs/_active/turnouts/evidence/S2/visual/GALLERY.md).
- Fonti ferroviarie, protezioni 5C e ottimizzazioni 5D intatte; nessun lavoro nuovo nel tick. Campione RAF equivalente S1→S2: p50 1949,95→1966,55 ms (+0,85%), p95 1983,30→2016,50 (+1,67%), draw call 367→343, geometrie GPU 364→340, texture 45→45. SwiftShader, campione breve; non certifica hardware né ripete la matrice completa 5D.
- [Rapporto S2](docs/_active/turnouts/evidence/S2/REPORT.md) con limiti, [comandi/provenienza](docs/_active/turnouts/evidence/S2/commands.json). Commit S2: `git log -1 --format=%H -- docs/_active/turnouts/evidence/S2/REPORT.md`; SHA e verifica remota nella consegna finale.
- Nuova regola permanente aggiunta a `AGENTS.md`: ogni sottofase conclude con test, commit atomico, checkpoint remoto verificato sul branch dedicato e pausa; main richiede distinta autorizzazione. S2 destinata esclusivamente a `feature/turnouts`, nessun merge/rebase/reset/deployment.

**Unica prossima azione: attendere autorizzazione esplicita S3.** Nessun glow, freccia, STOP, audio, dipendenza o backend introdotto. Touch/GPU fisici e benchmark completo 5D NOT VERIFIED in S2. Occlusione geometrica conservativa sulle texture alpha della vegetazione; tutti i venti rami verificati nella fixture. Nessun blocco tecnico noto.


## Interactive Turnouts — S3 (2026-10-30)

**S3 PASS tecnico; approvazione estetica PENDING. S4 NON INIZIATA.** S2 esplicitamente approvata; baseline pulita `feature/turnouts` a `6bdec29194d4e232eeab0e1ff5a8d4e6b26ec47b`, S0/S1/S2 verificati sul remoto prima del lavoro. Implementate A Precision Outline e B Soft Conformal Glow con geometrie/materiale condivisi e identità S2. A resta soltanto il default provvisorio: `?turnoutGlow=A/B` consente il confronto, senza nuovi controlli permanenti.

- Nuovo overlay conformale ai percorsi reali S1, tutti i rami degli otto dispositivi, inclusi entrambi i WX310; niente centro fittizio, barre trasversali o cambio materiali. Blu #37A8FA/#A9DDFF, periodo 1400 ms, fade 160 ms, reduced motion statico. Identità touch breve con dispatcher ferroviario invariato. [Contratto](docs/_active/turnouts/S3_GLOW.md).
- **175 Node + 9 Python + build PASS**. Browser glow: hover bidirezionale di tutti gli otto in entrambe le varianti, tastiera/touch, scambio occupato, occlusione, reduced motion, High giorno/notte e cleanup GPU/listener. Regressioni S1/S2, 5C undici scenari, circuiti/manovre/HUD/minimappe/quattro viewport PASS. Due angoli aggiuntivi e due zoom su Y-IN/WX-A/WX-B; materiali e texture runtime S2/S3 identici.
- **150 rotaie + 75 letti identici al manifest S0**, canonico rigenerato senza diff e hash `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Dieci viste senza glow pixel-identiche a S2. Fonti ferroviarie/sicurezza e funzioni calde 5D invariati; nessuna modifica a plancia, HUD, minimappe, dinamica, backend o dipendenze.
- Campione isolato contro la build 5D pubblicata: p50 1983,20 ms → A 1999,90 (+0,84%), B 1949,90 (−1,68%); p95 2066,60 → A 2099,90 (+1,61%), B 2199,90 (+6,45%). Draw call 367 → 343 spento / 344 acceso. SwiftShader, 16 intervalli per condizione; non ripete il benchmark completo 5D e non certifica FPS fisici.
- [Rapporto](docs/_active/turnouts/evidence/S3/REPORT.md), [galleria comparativa e pulsazione](docs/_active/turnouts/evidence/S3/visual/GALLERY.md), [pagina HTML](docs/_active/turnouts/evidence/S3/visual/index.html), [provenienza](docs/_active/turnouts/evidence/S3/commands.json). Commit atomico: quello che introduce il rapporto S3, risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S3/REPORT.md`. SHA e checkpoint remoto verificati nella consegna finale.

**Unica prossima azione: attendere scelta visiva A/B, eventuali rifiniture e autorizzazione esplicita S4.** Nessuna approvazione estetica dedotta dai test. GPU/touch fisici e matrice completa 5D NOT VERIFIED; A più discreta alle distanze elevate e viste radenti. Protocollo remoto AGENTS già presente, invariato; solo checkpoint fast-forward `feature/turnouts`, nessun push main o deployment.


## Interactive Turnouts — S4 checkpoint intermedio (2026-10-30)

**PAUSA esplicitamente richiesta dall'utente; riprendere S4 domani. S4 NON conclusa; S5 NON iniziata.** S3 B approvata nella richiesta S4 e impostata come default senza cambiarne shader/parametri. Baseline pulita e remoto S0–S3 verificati a `fd32b43fe9438980bde798fd76773f8af2f3f5fc` su `feature/turnouts`.

Salvati tre moduli per proiezione pura S1, osservazione Journey e overlay rosso: percorsi canonici, due percorsi per WX, punte bidirezionali senza approccio, orientamento dalla velocità reale quando noto, UNKNOWN conservativo, comparsa 340 ms e idle fermo. Picking, dispatcher, dinamica e sicurezza non modificati.

- **PASS:** 194 Node, 9 Python, build; canonico rigenerato senza diff; 64 file bloccati e cinque funzioni applicative identiche a S3. Tutti8/due stati/giorno-notte acquisiti; B pixel-identica in sei confronti isolati; WX in versi opposti; tre frame reali di comparsa distinti.
- **PENDENTI / NOT VERIFIED:** suite browser funzionale S4 interrotta su richiesta, regressioni S1/S2/5C/Phase0, materiali/cleanup GPU runtime, confronto prestazionale 5D/S3. Driver terminato con figli prima di qualsiasi esito di suite. Non dichiarare PASS questi controlli.
- [RIPRESA OBBLIGATORIA](docs/_active/turnouts/evidence/S4/RESUME.md), [rapporto intermedio](docs/_active/turnouts/evidence/S4/REPORT.md), [contratto](docs/_active/turnouts/S4_ROUTES.md), [galleria](docs/_active/turnouts/evidence/S4/visual/GALLERY.md). Script/ricette salvati nel repository, metadati e screenshot definitivi conservati. Le evidenze S3 restano intatte.

**Prossima azione unica:** verificare checkout/checkpoint e completare prima la suite browser S4, poi regressioni e performance come da RESUME. Solo dopo chiusura S4 e nuova approvazione umana si potrà considerare S5. Commit attuale intermedio: quello che introduce RESUME S4; SHA locale/remoto forniti nella consegna. Checkpoint solo `feature/turnouts`, origin/main invariato.


## Interactive Turnouts — S4 chiusura delle verifiche

**S4 PASS tecnico, approvazione estetica/funzionale PENDING. S5 NON INIZIATA.** Ripresa dal checkpoint remoto verificato `c54c8c12d43a07c62228b99b8ffdbd66cedb13a5`. Nessuna modifica al runtime del checkpoint o al glow B: completate le verifiche mancanti e corrette soltanto due assunzioni del test browser (clock e rientro del puntatore dopo clear diagnostico).

- **194 Node + 9 Python + build PASS**. Tutte e cinque le suite browser PASS: S4 funzionale (16 comandi, 16 ingressi/stati WX, B/UNKNOWN/reduced motion/protezione/profondità), S1 (manifest 150 rotaie/75 letti e azioni reali), S2 (rami/zoom/mouse/touch/tastiera/camera/selezione), 5C undici scenari, Phase0 circuiti/convogli nativi e GLB/HUD/minimappe/quattro viewport. Materiali e texture runtime identici a S3; nessun errore JS o richiesta fallita.
- GPU stabile a 368 geometrie/45 texture/48 programmi durante i cicli; dispose rilascia 20 geometrie, 8 materiali e un programma. Canonico rigenerato invariato, 64 file originali bloccati e cinque funzioni calde identici a S3. Immagini già salvate nuovamente validate, B isolata pixel-identica e tre frame reali di comparsa distinti. Nessuna alterazione a geometrie Kato, massicciata, dinamica, sicurezza, dipendenze o backend.
- Confronto RAF isolato 5D/S3/S4 e costo CPU della nuova proiezione completati: valori e limiti nel [rapporto finale](docs/_active/turnouts/evidence/S4/REPORT.md). Campione breve SwiftShader, non matrice completa 5D né FPS fisici.
- [Galleria](docs/_active/turnouts/evidence/S4/visual/GALLERY.md), [pagina HTML](docs/_active/turnouts/evidence/S4/visual/index.html), [handoff](docs/_active/turnouts/evidence/S4/RESUME.md), [provenienza](docs/_active/turnouts/evidence/S4/commands.json). Commit finale S4: quello che aggiorna il rapporto dopo c54c8c1; SHA effettivo e verifica remota nella consegna. Solo feature/turnouts, main intatto.

**Prossima azione unica: attendere approvazione grafica/funzionale S4 ed eventuali rifiniture. S5 richiede autorizzazione esplicita.** Restano NOT VERIFIED GPU/touch hardware e benchmark completo 5D; resa generale diurna discreta, da giudicare visivamente. Nessun blocco tecnico rilevato.


## S4 — rifinitura conservativa e nuova chiusura tecnica (2026-10-30)

**S4 PASS tecnico, approvazione estetica/funzionale PENDING; S5 NON iniziata.** Ripresa da `48a89d1`, già salvata su origin/feature/turnouts e discendente di `c54c8c1`, working tree iniziale pulito. Corretto un solo difetto: bisettrice delle punte sui rami curvi, corda7mm → tangente canonica locale (errore massimo0,420154° →0,000102°). Nuovo test falliva prima e passa dopo. Nessuna modifica allo stile, configurazione/durata340ms, tracce, glow B, geometria ferroviaria o massicciata.

- **195 Node +9 Python/JMRI +build PASS** sulla versione finale. Cinque suite browser fresche PASS: S4, S1, S2, 5C undici scenari, Fase0. Nuovo stress PASS: 1.616 richieste protette, identità risorse e percorsi controllati dopo ogni richiesta, GPU360geometrie/45texture/47programmi stabile; dispose20geometrie/8materiali/1programma. Nessuna animazione residua.
- **24 pose ×confronto idle pixel-identico**, due angoli/due zoom/due stati di Y-IN/WX-A/WX-B, orbita/rotella reali e tre resize PASS. Nuove73immagini, due WX nei due versi, reveal0/170/340ms distinto e sei B isolati pixel-identici aS3. [Galleria aggiornata](docs/_active/turnouts/evidence/S4/refinement/visual/GALLERY.md), [camere](docs/_active/turnouts/evidence/S4/refinement/review/GALLERY.md).
- Canonico rigenerato invariato, 150rotaie/75letti identici aS0;64file originali e cinque funzioni calde identici aS3. Railway, sicurezza5C, dinamica/5D, UI, dipendenze e backend preservati. Benchmark isolato5D/S3/S4 fresco entro soglie; dati e limiti nel [rapporto](docs/_active/turnouts/evidence/S4/refinement/REPORT.md). GPU/touch fisici e matrice completa5D NOT VERIFIED; procedura manuale documentata.
- Commit della rifinitura risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S4/refinement/REPORT.md`; SHA e checkpoint remoto verificati nella consegna. Solo feature/turnouts, main invariato, nessun merge/rebase/reset/force/deployment. Evidenze storiche preservate.

**Unica prossima azione: attendere approvazione esplicita grafica/funzionale delle frecce rosse ed eventuali rifiniture. Non iniziare S5 senza nuova autorizzazione.**


## S5 — guardia ferroviaria e arresto deterministico (2026-10-30)

**S4 esplicitamente APPROVATA dall’utente (B e frecce340ms); S5 COMPLETATA tecnicamente, in attesa di revisione. S6/S7 NON iniziate.** Baseline pulita locale/remota `a3ace86c0b8e2fe792bbc8dd4499c65d8237eafc`; checkpoint precedenti preservati e main6487f61 invariato.

- Guardia readonly nel core prima dell’integrazione: distanze Journey e ingombri reali, SAFE/UNSAFE/UNKNOWN distinti da GUARDED_STOP, frenata numerica5C e clamp rigido al primo limite. Scelta router e Journey invariati; accessor grezzo per UNKNOWN. Riusa area protetta30mm per consentire la correzione dei punti senza indebolire lock. Nessun routing duplicato o centro WX inventato.
- Riprodotto il vecchio attraversamento da storia stale (+2,49mm oltre una porta incompatibile); nuovo core delta0 a150mm/s e0,01mm residui. Nativo train2: frenata a30,3708mm prima della porta Y-4 C; pannello corregge e nessun riavvio automatico. Occupazione mantiene il rischio finché persiste, ma i probe readonly non prenotano spazio contro chi può allontanarsi. Stop e STOP ALL autoritativi; dopo stop automatico completo serve riarmo esplicito.
- **217Node,9Python/JMRI,build PASS**;40test mirati inclusi22S5,104casi porta/stato/assi,78UNKNOWNraw. Cinque suite browser finali S4/S1/S2/5C11casi/Fase0 PASS; ulteriori6casi S5 con rotabili/controlli reali, lifecycle Chromium frozen/active e rilascio occupazione PASS. Router/Journey e5funzioni calde,65file bloccati,150rotaie/75letti, canonico e paesaggio/asset intatti. B e frecce340ms byte-identici; nessun nuovo STOP/audio/S6, UI, dipendenza o backend.
- Benchmark attivo isolato5D/S4/S5 entro soglie. S4→S5 p50 1983,20→1999,90ms,p95 2016,60→2166,50ms; CPU flotta3treni0.1000→0.1690ms/passo. Stesse353draw call/348geometrie/44texture nel benchmark. SwiftShader, campione breve: non FPS hardware o matrice completa5D. GPU/touch fisici NOT VERIFIED.
- [Contratto](docs/_active/turnouts/S5_GUARD.md), [rapporto/matrice e limiti](docs/_active/turnouts/evidence/S5/REPORT.md), [telemetria](docs/_active/turnouts/evidence/S5/browser/browser.json), [grafico](docs/_active/turnouts/evidence/S5/plots/braking.png), [provenienza](docs/_active/turnouts/evidence/S5/commands.json). SHA del commit locale nella consegna e risolvibile dal log del rapporto.
- **Per istruzione esplicita di questa richiesta: nessun push senza nuova autorizzazione**, prevale sul protocollo remoto generale AGENTS. Finale solo commit locale `feat(safety): prevent invalid turnout traversals`; working tree pulito e remoto S4 invariato verificati nella consegna. Nessun merge/rebase/reset/deployment.

**Unica prossima azione: attendere revisione S5 e autorizzazione esplicita S6 — Cartello STOP scenico e campanello. Non iniziare S6.**


## S5 — checkpoint per audit indipendente (2026-11-04)

Pubblicazione ora esplicitamente autorizzata sul solo `feature/turnouts`. Implementazione S5 conservata nel commit `8321979af164f80ecfdcac4a9d884712ccd98031`, senza modifiche a codice/test/evidenze. Completamento tecnico **dichiarato**, approvazione indipendente della Regia **PENDING**. Verificati integrità dei50artefatti, corrispondenza dei sorgenti alle evidenze, perimetro del diff e scan mirato credenziali; nessuna suite rieseguita. Risultati precedenti:217Node,9Python/JMRI,build,cinque regressioni browser e sei casi S5 PASS, con provenienza nel rapporto S5.

Checkpoint di pubblicazione: commit che aggiunge questa nota; SHA e coincidenza remota verificati nella consegna. `origin/main` rilevato ad `aeff336c997748bf49d2a09a61c1d6d9238fb3db`, diverso dal riferimento storico S5, senza interventi su main. Nessun merge/rebase/reset/deploy. **Unica prossima azione: attendere l’audit indipendente della Regia. S6 non autorizzata.**


## S6 — STOP scenico e campanello (2026-11-04)

La Regia ha revisionato S5 e autorizzato esclusivamente S6: questo aggiorna la precedente attesa audit. **S6 PASS tecnico nel perimetro verificato; review tecnica/artistica PENDING; S7 NON iniziata.** Baseline pulita feature/turnouts `ca9d419`, S5 `8321979` preservata. Tre moduli separano osservazione guardia, scena e audio; STOP geometrico in scala N, emersione400ms/rientro300ms, reduced motion, avviso accessibile, singolo campanello globale originale con MUTE e cleanup.

**220Node+9Python+build PASS; browser S6, S4, S2 e5C PASS.** Due rischi e risoluzione indipendente, correzione senza ripartenza, STOP ALL/reset/dispose; protezione S5 operativa dopo rimozione totale S6. Sorgenti ferroviarie/S5/5D/glowB/frecce340ms e asset invariati, canonico rigenerato senza diff. GPU rilascia4geometrie/1texture; nessun timer/voce residua. [Rapporto](docs/_active/turnouts/evidence/S6/REPORT.md), [galleria/audio](docs/_active/turnouts/evidence/S6/visual/GALLERY.md), [risultati](docs/_active/turnouts/evidence/S6/browser/browser.json). Hardware GPU/touch, ascolto fisico e screen reader NOT VERIFIED; sequenza campionata, non video realtime.

Commit atomico locale `feat(turnouts): render guarded stop and bell`; SHA effettivo nella consegna. **Nessun push, merge, rebase, reset o deploy: la richiesta S6 vieta il push senza ulteriore autorizzazione, prevalendo sul gate remoto AGENTS.** Prossima azione unica: review tecnica e artistica della Regia. Non iniziare S7.


## S6 — consegna remota e protocollo permanente

Il committente autorizza la pubblicazione S6 e approva il protocollo permanente in AGENTS.md: push normale fast-forward sul branch di sviluppo già autorizzato, verifica remota e confronto SHA fanno parte della chiusura tecnica/DONE senza seconda autorizzazione. Restano prevalenti futuri divieti espliciti specifici. Le restrizioni precedenti qui registrate sono storiche.

Commit funzionale S6: `692013c3605ef93e490f2487be9046baa6b3487c`. Codice, test ed evidenze invariati; risultati documentati sul medesimo runtime (220 Node, 9 Python, build e browser S6/S4/S2/5C PASS), non rieseguiti per questa modifica documentale. Manifest degli artefatti e corrispondenza sorgenti verificati nuovamente. Checkpoint di consegna: commit che aggiunge questa nota; SHA locale/remoto ed esito verificati nella consegna finale. PASS / DELIVERED richiede tale verifica, non costituisce approvazione della Regia.

Review tecnica/artistica PENDING; S7 NON iniziata. Prossima azione unica: attendere approvazione della Regia. Main e deploy richiedono nuova autorizzazione; nessun merge/rebase/reset/deploy previsto.


## S6.1 — leggibilità STOP notturno

Autorizzata esclusivamente S6.1 dopo audit S6, baseline remota `ddd874ac3f9f1ec7e689408a6345d2f422659ded`. Modifica locale alle sole proprietà emissive dei materiali rosso/bianco; nessuna nuova luce/texture/geometria né variazione a logica, audio, posa, animazione, scena o plancia. Rendering giorno/notte alla stessa camera: migliora il contrasto, tutti i pixel esterni al cartello identici a S6.

220Node+build+browser S6 PASS; confronto risorse GPU prima/dopo e invarianti documentati nel [rapporto S6.1](docs/_active/turnouts/evidence/S6/S6.1/REPORT.md). Evidenze S6 precedenti preservate. Hardware GPU e approvazione estetica NOT VERIFIED/PENDING; suite S7 e audit5D non eseguiti. Commit dedicato `fix(turnouts): improve nighttime STOP visibility`; checkpoint fast-forward feature/turnouts e coincidenza SHA verificati nella consegna. Nessun main/merge/deploy. **STOP S6.1; attendere giudizio Regia e autorizzazione al collaudo finale. S7 NON iniziata.**


## S7 — collaudo tecnico finale e ritiro operativo

S0–S6.1 approvate dalla Regia nella richiesta S7; checkpoint iniziale b627f526ff44481a814f7e4cd5ef0f84fbf30ade. S7 PASS tecnico nel perimetro software:40PASS/0FAIL/0NOT VERIFIED nella matrice, con limiti hardware espliciti.220Node,9Python,build, dieci suite/browser funzionali inclusi Pages ed extra, confronto prestazionale isolato PASS; nessuna modifica runtime. p50/p95 contro5D−4.48%/−4.27%,367→353call; prima posa STOP89ms e update0.13ms documentati come limite. Nessuna nuova prova hardware GPU/touch/speaker/screen reader, né quattro nuove sessioni complete di vittoria missioni: UI e regressioni operative verificate separatamente.

[Rapporto permanente e matrice](docs/turnouts/FINAL_REPORT.md). docs/_active/turnouts è ritirata operativamente e non attiva tramite README/AGENTS; Master Spec ed evidenze intatte per hash/link storici. Approvazione S7 della Regia PENDING. Commit/checkpoint feature/turnouts con SHA locale/remoto verificati nella consegna. Nessun merge/main/deploy o altra macrofase. **Unica prossima azione: audit indipendente della Regia; STOP.**


## RELEASE R1 — integrazione e gate prima della pubblicazione

La Regia approva S0–S7/S6.1 e il committente autorizza questa sola integrazione su main e Pages dopo i gate. Main iniziale aeff336c997748bf49d2a09a61c1d6d9238fb3db, feature approvata2ed3312d18244a6dca91cf68d4d54073843e9e85:4/13commit esclusivi e nessun percorso modificato in comune. Branch release/turnouts-s7 da main; merge7db1cb7cb65a63d744c1789c4964b70fbcd3747c senza conflitti. Asset main e due .DS_Store preservati per hash, runtime/bundle identici a S7 ricostruito.

220Node+9Python+build+canonico+browser contratto/interazione/guardia/STOP+Pages desktop/mobile e smoke completo produzione locale PASS. [Rapporto R1](docs/releases/R1/REPORT.md). Questa nota è la fotografia pre-merge: non anticipa il successo di PR/deploy. Esito post-merge/pubblicazione da verificare e consegnare con SHA main, workflow e prove pubbliche. Non cambiano dipendenze, package0.12.0, pipeline, backend o credenziali. Nessuna altra macrofase autorizzata; STOP dopo verifica pubblica e attesa Regia post-release.

## Train Management — 6A.1 contratti (2026-11-04)

La richiesta corrente attesta R1 integrata/pubblicata e audit indipendente del 4 novembre; R0 Train Management 6A–6E **APPROVATA**, D01–D08 vincolanti. Supera i vecchi gate storici senza autorizzare l'intera roadmap. Autorizzata e svolta soltanto **6A.1 documentale**, branch `feature/train-management` creato da origin/main verificato `348bfeff12c4005657098d89ea1d3c2ccdda9910`, coincidente con baseline R1. Working tree iniziale pulito; fetch non distruttivo e assenza branch remoto verificati. Nessun cambiamento sopravvenuto da sovrascrivere.

Prodotti [contratto DTO/lifecycle/CAS/idempotenza](docs/_active/train-management/6A1_CONTRACT.md), [JSON Schema v1](docs/_active/train-management/STATE_SCHEMA.json), [sicurezza e mapping delle dieci tabelle](docs/_active/train-management/SECURITY_AND_DB_MAPPING.md), [STATUS](docs/_active/train-management/STATUS.md) e [rapporto con prove](docs/_active/train-management/evidence/6A1/REPORT.md). Allineati indice attivo e gate AGENTS; turnouts rimane archivio preservato. Proposta ownership workspace/device senza login, pairing/recovery con prova di possesso, revoca e ruoli server minimi; nessuna implementazione o migrazione.

**PASS verifiche attuali:** npm test riporta 37 file riusciti; esecuzione diretta degli stessi file espone 220 test, zero fallimenti/saltati; 9 Python/JMRI; build. JSON Schema Draft2020-12 valido, fixture sintetica valida strutturalmente, 16 casi invalidi respinti, 151 proprietà annotate. Nessun test futuro round-trip/restore/cloud viene confuso con tali esiti. Canonico SHA256 e bundle produzione esattamente R1; sorgenti motore/UI/asset/workflow/dipendenze invariati. Browser, performance/hardware e round-trip operativo NOT VERIFIED in questa fase documentale.

Supabase riletta solo in lettura: dieci tabelle RLS, zero record esatti, due migrazioni storiche e zero Edge Function confermati. Dipendenza owner_id→Auth e assenza Journey nei placement loose documentate; nessuna modifica DB/RLS/grants/Auth/segreti. Esposizione Data API Dashboard e testo integrale R0 NOT VERIFIED; la richiesta fornisce le decisioni approvate ma non il documento completo. Proposte e rischi sono sottoposti alla Regia.

Checkpoint atomico: commit che introduce il rapporto 6A.1, risolvibile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A1/REPORT.md`; SHA e corrispondenza remoto documentati nella consegna dopo push normale. Nessuna approvazione della Regia implicita. Se push/verifica remota fallisce, consegna BLOCKED. Nessuna PR/merge/main/deploy. **Unica prossima azione: attendere audit e autorizzazione esplicita 6A.2, NON iniziata.**


## Train Management — 6A.2 prototipo capability gateway

La Regia approva 6A.1 `4c90f1520ce6cd1cc7c1e9a538f819c135c45a82` e autorizza soltanto 6A.2. Fetch/ls-remote e ascendenza R1 verificati; branch feature/train-management pulito al kickoff, remoto coincidente,main `348bfeff12c4005657098d89ea1d3c2ccdda9910` invariato. Nessuna storia riscritta.

Prototipo isolato in `prototypes/train-management/capability-gateway/`:WebCryptoP-256→NodeP1363,proof firmata,nonce/timestamp,scope da registry,HTTP solo127.0.0.1,pairing owner/fingerprint/invito monouso,recovery simulata e revoca. Nessun import nel bundle R1,DB/credenziale reale o dipendenza produttiva nuova. [Contratto](docs/_active/train-management/6A2_PROTOTYPE.md),[rapporto](docs/_active/train-management/evidence/6A2/REPORT.md). [Corrispondenza R0P01–P18](docs/_active/train-management/R0_ACCEPTANCE_MAPPING.md) dai criteri originali forniti dalla Regia durante il lavoro: lacune esplicite, nessuna rinumerazione6A.1 né test 6B–6E avviato.

PASS:44 testHTTP con negazioni senza dati restituiti/modifiche ai workspace;5 scenari browser Chromium reale per private CryptoKey non esportabile,IndexedDB,reload,firma,revoca/perdita;npm test37 file,9Python/JMRI,build. Canonico/bundle con hash R1 identici,app/motore/asset/workflow/package intatti. TLS/DB/transazioni/ratebudget produzione,revoca multiprocesso,rotazione definitiva e altri browser/hardware NOT VERIFIED; nessun PASS produttivo dedotto.

Checkpoint atomico: commit che introduce rapporto 6A.2, SHA e confronto remoto nella consegna dopo push normale solo feature/train-management. Nessuna PR/main/merge/deploy. Approvazione6A.2 PENDING. **Unica prossima azione: audit Regia e autorizzazione esplicita 6A.3,non iniziata.**


## Train Management — 6A.3 schema PostgreSQL isolato

La Regia approva 6A.2 `f64bdc8291a9c51a29c60076bae303e91e6e1d26` e autorizza soltanto 6A.3. Branch feature/train-management pulito al kickoff; fetch/ls-remote e ascendenza R1 confermati, remoto coincidente e main `348bfeff12c4005657098d89ea1d3c2ccdda9910` invariato. Nessuna storia riscritta.

Proposta additiva `supabase/migrations/20261104165408_serien_workspace_expand.sql`, generata con CLI 3.0.0: workspace/registry privato, ownership domain con FK composite, session head coerente con snapshot e ricevuta, separazione authorizer/worker. Expand senza cutover: owner_id e compatibilità legacy rimangono. Baseline storiche lette dal catalogo reale e ricostruite soltanto in PostgreSQL17.11 locale effimero senza rete. [Specifica/rollback](docs/_active/train-management/6A3_SCHEMA.md), [rapporto/evidenze](docs/_active/train-management/evidence/6A3/REPORT.md). Corretto solo il controllo UUID richiesto nel prototipo; matrice R0 P01–P18 e contratti approvati conservati.

PASS: 51 verifiche SQL reali su dieci tabelle baseline non vuote, FK/RLS/grants e isolamento A/B con connessioni SQL distinte, head, vincoli ferroviari, rollback DDL e conservazione dati. Expand conserva anche timestamp; backfill e inversione conservano valori semantici ma touch_updated_at può avanzare. 48 test HTTP con UUID invalidi, 5 scenari Chromium, npm test37 file, 9 Python/JMRI e build PASS. Canonico/bundle R1 e sorgenti applicativi, asset, package/workflow invariati.

Supabase reale solo letture di cataloghi/migrazioni/trigger/advisor: nessun DDL/DML/Auth/RLS/grant/deploy. Advisor storico Auth/password e suggerimenti indici documentati, non corretti in produzione. Applicazione reale, provisioning SQL, cutover senza owner, transazioni CAS/SaveCheckpoint, piattaforma Supabase/PostgREST e carichi reali NOT VERIFIED. Nessuna API/autosave/integrazione nel simulatore.

Checkpoint atomico: commit che introduce rapporto6A.3, SHA e coincidenza remota nella consegna dopo push normale solo feature/train-management. Nessuna PR/main/merge/Pages/Supabase deploy. Approvazione6A.3 PENDING. **Unica prossima azione: audit Regia e autorizzazione esplicita 6A.4, non iniziata.**


## Train Management — 6A.4 nucleo transazionale locale

Il committente approva 6A.3 `558f43b44be08235f6d30b6f18bd3b4ef07a4c53` e autorizza soltanto 6A.4. Fetch non distruttivo/letture GitHub confermano branch remoto esattamente al checkpoint e main/R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Creato branch locale autorizzato dal checkpoint, working tree iniziale pulito, nessuna storia riscritta.

Nuova proposta SQL additiva `20261104172819_serien_atomic_checkpoint.sql`, adapter server isolato e runner PostgreSQL17 in `tests/db/6A4/`. [Contratto e matrice privilegi](docs/_active/train-management/6A4_TRANSACTIONS.md), [rapporto](docs/_active/train-management/evidence/6A4/REPORT.md). Funzione privata con executor limitato soggetto a RLS, binding session_user workspace/device, lock autorizzazione→head, ricevuta prima del CAS, snapshot/proiezioni/head/ricevuta e vincoli deferred in un commit. Nessuna DML diretta del worker su checkpoint o modifica autorità/catalogo. Revoca SQL locale coordinata; nessuna certificazione distribuita.

Validator volutamente chiuso al profilo DTO sintetico server con train e loose in A/B; ammesse solo variazioni stateId/ui.day/otto scambi. Non è SaveCheckpoint generale: validazione arbitraria catalogo/Journey/collisioni e sostituzione arbitraria proiezioni restano gap espliciti. Owner/FK legacy intatti, nessun cutover o account produttivo nascosto. Fault SQL nei sub-step, kill reale backend dopo snapshot, risposta già committata scartata dal driver, race con connessioni reali e conservazione di dieci tabelle legacy documentati con stato iniziale/finale per caso.

Suite/evidenze effettive nel rapporto: transazioni, regressione 6A.3, adapter JCS/parser, npm test, build e 9 Python/JMRI. Hash canonico e bundle R1, 1451 file baseline fuori dai documenti di gate, prototipo 6A.2 e migrazione 6A.3 byte-identici. Zero mutazioni Supabase reale, nessun main/Pages/deploy/6A.5. Applicazione reale, gateway proof/epoch end-to-end, provisioning/pool, revoca distribuita, autosave/offline, throughput e crash host/PITR NOT VERIFIED.

Checkpoint atomico: commit che introduce il rapporto 6A.4, SHA locale/remoto e working tree verificati nella consegna dopo push normale solo feature/train-management. **Unica prossima azione: audit Regia; STOP. 6A.5 non iniziata né implicitamente autorizzata.**


## Train Management — 6A.5 storico sicuro e recovery locale

La Regia approva 6A.4 `6bf92bf6f100e1c74567dd2b1ed898874e50e66a`; autorizzata esclusivamente6A.5. Working tree iniziale pulito su feature/train-management; fetch non distruttivo, SHA remoto e ascendenza R1 confermati; main ancora `348bfeff12c4005657098d89ea1d3c2ccdda9910`. Nessuna riscrittura storia o modifica produzione.

Proposta additiva locale `20261104175236_serien_history_integrity.sql`, funzioni private ReadHead/ReadSnapshot/ListHistory/ReadReceipt/RecoverRevision e boundary isolato in prototypes/train-management/history-access. [Contratto C1–C3/versioni/retention/quote/R0P09–P15](docs/_active/train-management/6A5_HISTORY.md), [rapporto](docs/_active/train-management/evidence/6A5/REPORT.md). Rimossi grant raw gruppo/login/colonna; controlli device/scope/epoch/expiry/revoca anche su sessione già aperta. Ricevute senza envelope duplicato e retry6A.4 ricostruito identico; request_id indipendente per workspace anche con owner condiviso, legacy non vuoto preservato. Digest stato ed envelope distinti, canonicalizzazione versionata del solo profilo ammesso, corruzione rilevata e recovery CAS nuova revisione senza cancellazioni. Quote checkpoint/storage/audit e limiti request/response/pagina/rate con backoff locale, nessuna certificazione distribuita.

PASS:141 controlliSQL6A.5,51regressioniSQL6A.3,45SQL6A.4,25boundary/backoff e12adapter6A.4,37file npm,9Python/JMRI,build. Prove di race reali, sessione revocata, constraint deferred, fault in sei sub-step e kill backend anche post-upgrade; rollback migrazione completo.1472 file baseline esclusi tre documenti gate, migrazioni approvate,6A.2/6A.4,sorgenti/asset/UI/canonico/bundle R1 byte-identici.

Zero SQL/DDL/DML/Auth/RLS/grant/Edge/config/deploy contro Supabase reale; nessuna credenziale produttiva o main/Pages. Profilo sintetico non ampliato; validatore generale, gatewayDB end-to-end, revoca distribuita, provisioning/pool/TLS/cutover, serializer/hydrator/autosave/offline, carichi e PITR restano gap espliciti. Nessuna6A.6 o6B iniziata.

Checkpoint atomico identificabile dal commit che introduce il rapporto6A.5; push normale solo feature/train-management, verifica SHA remoto/locale e working tree nella consegna. **Unica prossima azione: audit indipendente Regia; STOP.**


## Train Management — 6A.6 integrazione e gate della macrofase

6A.5 approvata `ef36596224133f19ceebeb4de889456c78959515`; autorizzata esclusivamente6A.6 e ripresa setup confermata dalla Regia. Fetch riuscito con accesso rete Codex esplicito, senza modifiche proxy; branch/tracking e checkpoint/ascendenza R1 verificati. Nessun reset/merge/rebase o ricostruzione commit.

**Laboratorio integrato PASS tecnico, chiusura macrofase6A BLOCKED.** [Contratto](docs/_active/train-management/6A6_INTEGRATION.md), [rapporto gate](docs/_active/train-management/6A_INTEGRATION_GATE.md), [riepilogo/evidenze](docs/_active/train-management/evidence/6A6/summary.md). Chromium→CryptoKey non esportabile IndexedDB→proof HTTP effettiva→gateway loopback→principal dispositivo/session_user reale→API privataPG17→commit→verifica hash browser. Sei operazioni dati, pairing controllato/recovery kit monouso, scope/revoca/expiry/epoch/A-B, nonce e digest, CAS concorrenti con entrambi i backend osservati bloccati, recovery/storico, quote/rate/pagine. Fault SQL, backend kill, statement timeout, HTTP abort, pagina chiusa e SIGKILL Chromium distinti. Revoca in-flight e sessione aperta provate senza nuove read/write dopo commit revoca.

**72test integrati PASS**, regressioni51SQL6A.3/45SQL6A.4/141SQL6A.5;48HTTP6A.2,5browser capability,37adapter, npm37file/220test,9Python/JMRI,build e smoke browserR1 PASS.1500file baseline esclusi tre documenti gate byte-identici; canonico/bundle R1 intatti, nessun app.js/motore/UI/asset o dipendenza applicativa nuova. Metriche misurate con limiti/rendezvous espliciti, non benchmark Supabase.

BLOCKED: il supervisore Docker è solo laboratorio, provisioning/secret broker/pool isolato del futuro hosting richiedono decisione e staging; nessun SET ROLE o pool universale sostitutivo. Owner Auth legacy sintetico riusato: persistenza nativa ownerless NON dimostrata. Piano cutover/preservazione/rollback e vincoli ferroviari, threat model e matrice R0P01–P18 nel rapporto. TLS/Supavisor/configurazione reale, multiistanza/restart, rotazione, browser alternativi/eviction eOS/PITR NOT VERIFIED. Nessuna query o modifica al Supabase reale, migrazione nuova, main/Pages/deploy o6B.

Checkpoint atomico: commit che introduce il rapporto gate, SHA remoto/locale e working tree verificati dopo push normale solo feature/train-management nella consegna. **Unica prossima azione: audit indipendente della Regia e decisione sui due blocchi architetturali; STOP. Nessuna chiusura6A o6B implicita.**

## Train Management — 6A.7 Architecture Decision Gate (solo progettazione)

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.** La Regia approva il checkpoint6A.6 `5d65a32ff392dabf7e57c040981598f5af398e05` e autorizza esclusivamente i documenti6A.7. Ripresa: checkout iniziale work/R1 pulito; fetch autorizzato del solo feature/train-management, SHA remoto esattamente6A.6; passaggio non distruttivo al branch dedicato, working tree pulito e checkpoint verificato prima della progettazione. Nessun reset/rebase/main modificato.

Prodotti [D09 e confronto A/B/C](docs/_active/train-management/6A7_ARCHITECTURE_DECISIONS.md), [D10 ownerless](docs/_active/train-management/6A7_OWNERLESS_CUTOVER.md), [piano minimo](docs/_active/train-management/6A7_EXECUTION_PLAN.md), [rischi/evidenze](docs/_active/train-management/6A7_RISKS_AND_EVIDENCE.md), [rapporto verifiche](docs/_active/train-management/evidence/6A7/REPORT.md). Raccomandazione unica D09: conservare principal SQL per dispositivo/versione con broker privato fidato, pool applicativo lazy/LRU con cap aggregato e direct TLS iniziale; nessun pool universale/GUC come autorità. Rischi espliciti di compromissione broker/secret, costo dei ruoli e provisioning gestito da provare. D10: ownerNULL nei nuovi workspace, owner storici come provenienza in registro privato senza FK Auth, generated ownership_key non nulla e domain FK obbligatorie; nessun UPDATE di snapshot/receipt, legacy conservato. Piano O01–O14 con legacy non vuoto e zero utenti Auth nell'intero PostgreSQL isolato, senza account fittizi.

Documentazione corrente consultata via Supabase search_docs e sorgenti ufficiali PostgreSQL17 su GitHub: direct/Supavisor, ruoli, RLS/privati/default ACL, TLS e limiti; changelog e fetch diretti403 tramite proxy, limite dichiarato. Nessuna query al Supabase reale. Nessuna migrazione nuova o modifica SQL/ruoli/gateway/runtime/UI/topologia/asset; R0P01–P18 e contratti6A.1–6A.6 intatti. Nessuna dichiarazione di serializer generale.

Verifiche6A.7: npm37file,9Python/JMRI,build PASS; controllo scope/link/hash e confronto con6A.6 nelle evidenze. Test SQL/HTTP/browser6A.2–6A.6 riportati come prove approvate ereditate, non rieseguite per questi soli documenti. Nuovo modello operativo, replay durevole, provisioning/rotazione, ownerless e staging sono NOT VERIFIED/NON IMPLEMENTATI; proposta sequenza6A.8–6A.13, ciascuna da autorizzare, senza applicazione reale o6B.

Checkpoint6A.7: commit che introduce il rapporto della fase, SHA effettivo e confronto remoto nella consegna dopo push normale esclusivamente feature/train-management. La documentazione non anticipa l'esito del push. **Unica prossima azione: audit indipendente della Regia su D09/D10 e piano; STOP. La6A.8 proposta non è autorizzata.**

## Train Management — 6A.8 lifecycle/replay SQL isolato (2026-11-05)

**6A.6 TECHNICAL PASS — 6A.7 DESIGN APPROVED — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.** La Regia approva6A.7 `cec3a97042ddd1cbcacc7e50cb99a9f4b76c2afd` e autorizza solo6A.8. Branch/HEAD/remoto/ascendenza e working tree iniziale pulito verificati; main77b6f64 avanzato indipendentemente non importato, nessun merge/rebase/reset.

Nuova migrazione proposta `20261104231109_serien_capability_lifecycle.sql`, generata con CLI3.0.0 in container effimero, applicata esclusivamente a PostgreSQL17.11 network-none/tmpfs; le tre approvate6A.3–6A.5 intatte. Claim nonce EXECUTE-only derivato da session_user, autorizzazione/epoch/version/expiry/revoca SQL, contesto chiuso, unicità reale e quote/cleanup. Il caller committa il claim separatamente prima dei dati; nessun COMMIT autonomo nascosto o verifica P-256 nel DB. Sei API dati immutate e broker fidato D09 ancora necessario.

Lifecycle privato con job PREPARED/APPROVED/ACTIVATING/ACTIVE/REVOKED/RECOVERABLE/FAILED, key-bound ticket e recovery monouso, nuove versioni epoch/key e binding, replay/idempotenza job, principal NOLOGIN fino alla finalizzazione operatore. Control/redeemer/provisioner distinti, ceiling su tutte le operazioni pertinenti, executor NOBYPASSRLS/non proprietario tabelle con grant colonna e RLS; nessun authorizer generico al data plane. Secret adapter solo sintetico in memoria e operatore privilegiato solo fixture; distribuzione credenziali reale non risolta.

[Contratto SQL/broker](docs/_active/train-management/6A8_SQL_LIFECYCLE.md), [ACL/RLS effettivi](docs/_active/train-management/6A8_ACL_MATRIX.md), [rapporto sicurezza/fault/24criteri](docs/_active/train-management/evidence/6A8/REPORT.md), runner `tests/db/6A8/`. **97test nuovi PASS**, concorrenza con backend realmente bloccati, replay nuovo processo, revoke su connessione aperta, quota al redeem, FK recovery A/B, fault SQL/LOGIN e job recoverable/failed; dieci tabelle legacy non vuote preservate. Rieseguite51SQL6A.3/45SQL6A.4/141SQL6A.5,72E2E6A.6 dopo nuova migrazione,48HTTP e5Chromium6A.2,12+25adapter, npm37file,9Python/JMRI,build. Nuovo broker→claim/lifecycle end-to-end non dichiarato:72E2E usano il gateway6A.6 originale. Scope/hash/canonico/bundle e scan segreti nelle evidenze.

Zero query/mutazioni Supabase reale e zero staging. Nessun ownerless D10, modifica alle otto tabelle owner-scoped, serializer/hydrator/autosave, UI/asset/topologia/motore/Journey o6B. Password authentication/TLS/Supavisor, secret store durevole/distribuito, pool, costo/carico e host crash/PITR NOT VERIFIED. Changelog pubblico diretto403, documentazione funzioni e fonti PostgreSQL disponibili consultate senza alterare proxy.

Checkpoint6A.8: commit che introduce il rapporto della fase; push normale solo feature/train-management e SHA locale/remoto/working tree verificati nella consegna. **Unica prossima azione: audit indipendente della Regia; STOP. 6A.9 non iniziata né autorizzata.**

## Train Management — 6A.9 broker/trasporto/pool isolato (2026-11-05)

**6A.8 APPROVATA — 6A.9 PASS tecnico di laboratorio, audit Regia PENDING — macrofase6A BLOCKED — 6B NON AUTORIZZATA.** Base `d6aa13001ae10d23b2b3c8c6e45e1dcf8f4e3764`, solo feature/train-management. Audit ripresa: stesso filesystem con lavoro6A.9 untracked conservato, HEAD/remoto6A.8, nessuno stash/WIP da ricostruire; nessun reset/clean/merge/rebase. Main remoto avanzato indipendentemente non importato.

Nuovo prototipo `broker-lab`: ingressoHTTP UID10001 privo di credenziali/reteSQL/Docker, broker privato UID10002 su socket660, supervisor operatore fuori banda. Driver pg8.23.1/lock separati dal bundle, TCP SCRAM/TLS CA/hostname reali. Pool fixed-principal/versione lazy/LRU cap16/coda64/attesa2s/idle30s, session_user verificato, niente SET ROLE. Proof P-256 originale→claim_nonce6A.8→COMMIT confermato→API6A.5→COMMIT→verifica browser. Nessuna modifica a SQL/contratti approvati; DB non verifica P-256 e broker D09 resta fidato.

[Rapporto gate](docs/_active/train-management/6A9_BROKER_GATE.md), [privilegi/threat model](docs/_active/train-management/6A9_SECURITY_BOUNDARIES.md), [suite/evidenze](docs/_active/train-management/evidence/6A9/summary.json), runner `tests/db/6A9/`. **50E2E nuovi PASS** e15sottoprove trasporto/ACL, compresi restart SIGKILL/replay secondo processo, claim separato, revoca/keyVersion dopo claim, veri CAS/timeout/kill/HTTPabort, snapshot/receipt/history, lifecycle con job approvato, ack attivazione perso, recovery monouso e rotazione con vecchia connessione negata. Iniziali proof lifecycle usano job SQL e journal esclusivo/fsynced privato perché il candidato non puòLOGIN e claim_nonce accetta solo operazioni dati; durabilità host/cap distribuito/secret-store loss NON certificati.

Carico con una sola istanza: peak16connessioni, queue64, batch96→81successi/15backpressure,4timeout2s; idle reale31s e25LRU. Secondo broker solo replay/letture minime,2connessioni aggregate misurate; coordinamento globale NOT VERIFIED. Metriche238campioni HTTP con fault: p50239.34ms/p953060.78ms; non benchmark hosting. Chiusura broker0sessioni e cleanup di tutti i container/network/volumi propri verificati.

Rieseguite51SQL6A.3/45SQL6A.4/141SQL6A.5/97SQL6A.8;72E2E del vecchio gateway6A.6 distinti dai50nuovi;48HTTP e5browser6A.2;12+25adapter; npm37file,9Python/JMRI ebuild. Scope/hash/segreti nelle nuove evidenze, R0P01–P18 e tutto il checkout approvato salvo PROGRESS/STATUS conservati. Nessuna migrazione nuova, modifica R1/motore/Journey/WX310/HUD/console/asset/canonico/bundle/root dependencies.

Zero query/mutazioni Supabase reale o staging, nessun main/deploy/Pages. Profilo sintetico chiuso e ownerAuth legacy non vuoto conservati; nessun serializer generale, ownerless6A.10, UI persistenza, autosave/offline/outbox o6B. Restano NOT VERIFIED proprietà gestite Supabase/Supavisor, principal/secret manager/costo/churn e pool globale, recovery perdita host/secret store, PITR e matrice R1 visuale/performance completa.

Checkpoint atomico: commit che introduce il rapporto6A.9; push normale solo feature/train-management e SHA locale/remoto/working tree verificati nella consegna. **Unica prossima azione: audit indipendente Regia; STOP6A.9. Nessuna6A.10 avviata.**

## Train Management — 6A.10 cutover ownerless isolato (2026-11-05)

**6A.1–6A.9 APPROVATE — 6A.10 PASS tecnico di laboratorio, audit Regia PENDING — macrofase6A BLOCKED — 6B NON AUTORIZZATA.** Base `d7075c3a980f554ba8111f5a5478279f5ff6ddbd`, solo feature/train-management, checkout/ascendenza/working tree iniziale pulito verificati. Main indipendente non importato, nessun reset/clean/merge/rebase/force-push.

Nuova proposta `20261105090212_serien_ownerless_cutover.sql`, generata dalla CLI3.0.0 con help corrente in container network-none. Inventario effettivo di colonne/default/FK/unique/generated/trigger/funzioni/RLS/ACL/dependenze prima del DDL. Registro legacy privato minimo con soli2owner verificati; nuove FK RESTRICT validate prima di togliere8Auth CASCADE. Owner nullable senza auth.uid, generated domain NOT NULL, ownership totale,7domainFK e vincoli ferroviari intatti, unicità inventory per dominio. Nuove INSERT workspace ownerNULL; identity guard sui mutabili; Save6A.5 cambia solo l'assegnazione owner dei nuovi checkpoint aNULL, compresi A/B. Nessuna UPDATE/DELETE riuscita su archivi confermati, nessun trigger disabilitato o riscrittura di ID/digest/result/timestamp.

[Gate](docs/_active/train-management/6A10_OWNERLESS_GATE.md), [inventario](docs/_active/train-management/6A10_CONSTRAINT_INVENTORY.md), [ACL/RLS/creator](docs/_active/train-management/6A10_ACL_MATRIX.md), [rollback](docs/_active/train-management/6A10_ROLLBACK.md), [suite/evidenze](docs/_active/train-management/evidence/6A10/summary.json). **185SQL nuovi e50E2E ownerless PASS**: inizialmente dieci tabelle non vuote,2Auth/2owner,4snapshot/receipt e A/Bhead1; dopo cutover Auth0 con tutte le48righe pubbliche originali e2head intatte nella primaria. C/D creati tramite job privato operatore verificato, head0 senza snapshot/receipt inventati. C percorre tutte le seiAPI attraverso Chromium/P256→ingresso→broker6A.9→claimSQL COMMIT→principal/TLS→API ownerless COMMIT→verifica; D partecipa a pairing/letture/isolation e salva sul clone SQL. A/B sul clone compatibilità committano nuova rev2 ownerNULL e leggono rev1. Auth0 anche nel clone strutturale; copie restore/compatibilità rimosse dopo verifica.

O01–O14 coperti: NULL/NULL tutte8tabelle,84dinieghi23503 sui7FKpath×12coppie A/B/C/D con maintenance non-bypass, ready/ordine/member-loose/edge/s/heading/Journey/topology/STOPPED/8booleani, sei faultsubstep/deferred/timeout/kill, CAS/idempotenza/ack perso/history/recovery, RLS vecchio claim Auth con ACLtemporanei→0righe, operator non autoapprova o crea ruoli, unicità per dominio.14punti di rollback DDL confrontano catalogo/ruoli/dati; dump restore verificato. Dopo Auth delete/prima scrittura ownerless nessun down distruttivo; contenimento read-only provato con head3 conservata e write negato. Post-write restore+replay/PITR/secret-store loss NOT VERIFIED.

Rieseguite51/45/141SQL6A.3–6A.5,97SQL6A.8,72gateway6A.6 e50broker6A.9 legacy originali, distinti dai50nuovi ownerless;48HTTP/5browser6A.2,12+25adapter, npm37file,9Python/JMRI ebuild. Pool ownerless cap16/coda64, batch96→80successi/16backpressure,4timeout2s;238campioni HTTP con fault, p50259.97ms/p953050.63ms; non benchmark hosting. Secondo broker2connessioni solo replay/letture, budget globale NOT VERIFIED. Cleanup4container/2network/5volumi verificato.

Baseline6A.9 salvo PROGRESS/STATUS byte-identica: SQL/contratti/R0 approvati, broker/gateway/adapter, R1/motore/Journey/WX310/UI/topologia/asset/canonico/bundle e dipendenze root conservati. Profilo sintetico chiuso, nessun serializer/hydrator generale, UI persistenza, autosave/offline/outbox o6B. Zero query/mutazioni Supabase reale, zero staging/main/Pages/deploy. Changelog403, docs pubbliche consultate senza progetto. Hosting/Supavisor/provisioning gestito/secret manager/costo/churn/cap globale e host recovery restano NOT VERIFIED; nessuna chiusura6A.

Checkpoint atomico: commit che introduce il rapporto6A.10, push normale soltanto feature/train-management e SHA locale/remoto/working tree verificati nella consegna. **Unica prossima azione: audit indipendente Regia; STOP6A.10. Nessuna6A.11,6A.12 o6B avviata.**

## Train Management — 6A.11 hardening e gate avversario (2026-11-05)

**6A.1–6A.10 APPROVATE — 6A.11 TECHNICAL PASS nel laboratorio singolo broker,
audit Regia PENDING — macrofase6A NON CHIUSA — staging6A.12 e6B NON AUTORIZZATE.**
Base approvata `de53ba702164428e3b76936dc9791dee4eb1697a`, solo
feature/train-management; checkout iniziale/HEAD/remoto/ascendenza puliti verificati.
Nessun branch change, main import, reset/rebase/merge/force-push/deploy.

[Gate avversario](docs/_active/train-management/6A11_ADVERSARIAL_GATE.md),
[matrice A01–A16](docs/_active/train-management/6A11_SECURITY_MATRIX.md),
[carico/fault/recovery](docs/_active/train-management/6A11_LOAD_FAULT_RECOVERY.md),
[privilegi/threat/NV](docs/_active/train-management/6A11_SECURITY_BOUNDARIES.md),
[regressioni/R0](docs/_active/train-management/6A11_REGRESSION_MATRIX.md).
Fixture mista legacy non vuota, Auth0 dopo cutover, C/D ownerless;185SQL O01–O14
e111controlli integrati PASS,1diagnostica limite esclusa dai PASS;
confronto completo48righe originali+2head,7domain FK/NULL, nessun UPDATE/DELETE
dello storico nella nuova suite. HTTP/Chromium/P-256→ingresso separato→broker→
claimCOMMIT→LOGIN/TLS→API transazionale→verifica. Replay durevole, CAS due backend,
retry receipt dopo ack perso/head/quota, revoca/rotation su sessione calda,
activation crash prima/dopo commit e fault reali di rete/SQL/processi/store access.

D01 nonce array coercivo riprodotto RED nel broker lifecycle e nei due prototipi
precedenti; aggiunta solo guardia tipo stringa in3gateway. D02 parser input503→400;
D03 controllo Node deadline30s→250ms per applicare effettivamente header5s/body15s.
Quattro file backend corretti,9righe aggiunte/8rimosse. RED/GREEN e problemi
harness distinti conservati; nessun nuovo privilegio, migrazione o architettura.

**Limite aperto L01:2broker indipendenti aprono32connessioni reali,16ciascuno;
il budget globale16 FAIL.** Sicurezza nonce a2broker PASS (una riga,200+409),
nessun supporto operativo multiistanza dichiarato. Singolo broker obbligatorio,
launcher rifiuta replicas2; fencing/sostituzione senza overlap proposti, enforcement
hosting NOT VERIFIED. Nessun coordinatore distribuito introdotto.

Rieseguite tutte le regressioni6A.2–6A.10, npm37file PASS, Python/JMRI9 PASS,
adapter12+25, build PASS. Canonico/bundle e ogni file R1 byte-identici. Profilo
sintetico chiuso invariato, non serializer generale. Zero query Supabase reale,
zero staging, nessun runtime ferroviario/UI/assets/dependency modificato.
Crash host/perdita store/DB/PITR/hosting/Supavisor/costi/browser alternativi e
matrice completa R1 visuale/performance NOT VERIFIED, con prove future necessarie.

Checkpoint atomico: commit che introduce il rapporto6A.11, push normale soltanto
feature/train-management, SHA locale/remoto e working tree verificati nella consegna.
**Unica prossima azione: audit indipendente Regia; STOP6A.11. Nessuna6A.12 o6B avviata.**

## Train Management — 6A.12-P progettazione staging (2026-11-05, Europe/Rome)

**6A.12-P DESIGN DELIVERED — STAGING EXECUTION BLOCKED — MACRO 6A OPEN — 6B NOT AUTHORIZED.**
La Regia ha approvato6A.11 soltanto nel laboratorio a broker singolo. Checkpoint
approvato e conservato `1da0675ca59cd47cffe79250f17419c929d90048`, branch esclusivo
feature/train-management; checkout inizialmente pulito, HEAD/remoto/ascendenza,
commit locali/stash e assenza delle sette bozze verificati. Ricerca pubblica e
contratti già letti riutilizzati; nessun recupero distruttivo o import di main.

Consegna dei soli sette documenti:
[readiness e fonti](docs/_active/train-management/6A12_STAGING_READINESS.md),
[hosting/L01](docs/_active/train-management/6A12_HOSTING_ARCHITECTURE.md),
[compatibilità gestita](docs/_active/train-management/6A12_SUPABASE_COMPATIBILITY.md),
[provisioning/secret/journal](docs/_active/train-management/6A12_PROVISIONING_AND_SECRETS.md),
[runbook non eseguito](docs/_active/train-management/6A12_STAGING_RUNBOOK.md),
[test/recovery futuri](docs/_active/train-management/6A12_TEST_AND_RECOVERY_PLAN.md),
[costi e approvazioni](docs/_active/train-management/6A12_COST_AND_APPROVAL_GATE.md).

Proposta principale: VM EC2 fissa senza autoscaling, ingresso separato dal broker,
socket privato, SQL direct TLS/IPv6 e secret manager con identità macchina;
alternativa Render private service con disco e OIDC. Esclusività/fencing preventivi,
drain, stop e zero sessioni vecchie prima del subentro, fail-closed se non provabili.
L01 resta FAIL nel multi-broker32/16: nessun coordinatore o cap globale inventato.
D09=A/session_user/principal per device e D10/Auth0/storico immutabile invariati.

Fonti ufficiali consultate il5novembre: documentazione e changelog HTML Supabase,
pricing/compute, FAQ Supavisor aggiornata4novembre, AWS/Render. Changelog markdown
non leggibile dal tool, HTML e voci pertinenti disponibili. Ambiguità tra esempio
generico di pool-size e FAQ per user/db/mode esplicitata: nessun cap aggregato
ricavato dal pooler. postgres gestito non è superuser; delega DDL/ownership,
identity pooling/cache/rotation e infrastruttura richiedono prove autorizzate.

Runbook separa baseline storica, cinque migrazioni approvate, fixture sintetica,
D10 e C/D; non esegue il bootstrap Auth finto o runner locali sul gestito. Packaging,
fixture/secret adapter e fencing richiedono un incarico attuativo distinto; nessuna
loro implementazione qui. Restore preliminare e recovery host/store/DB/PITR solo
su clone con autorizzazione separata; post-write replay non dedotto da audit compatto.
Tetto proposto75USD/7giorni NON AUTORIZZATO, bound parziale44.60USD più preventivi
mancanti/clone/fiscalità; tetto lavoro separato. Nessun costo ignoto trattato come zero.

Verifiche locali di questa fase: sette deliverable/nove soli Markdown,38link
locali,29URL ufficiali censiti,213righe tabellari, scansione secret senza riscontri;
1777file precedenti byte-identici. npm test37unità file PASS, Python/JMRI9test PASS
ebuild PASS, log locali /workspace/work/6A12-P. Suite SQL/Chromium6A.11 non rieseguite;
risultati approvati ereditati, nessun nuovo PASS hosting/visuale/performance.
R1/canonico/bundle, backend, SQL/migrazioni, test, contratti D09/D10/R0/UI/asset e
dipendenze invariati. Zero accessi Supabase reale o staging, zero provisioning,
servizi a pagamento, configurazioni remote, deploy o fasi successive.

Checkpoint atomico contenente i sette documenti e i due aggiornamenti di stato,
push normale soltanto feature/train-management; SHA remoto/locale e working tree
pulito verificati nella consegna. **Unica prossima azione: audit della Regia sul
piano e decisioni esplicite su ambiente, budget, accessi, fencing e operazioni.
STOP dopo6A.12-P; nessuna richiesta di eseguire subito lo staging.**

## Train Management — 6A.12-R cambio strategico browser-first (2026-11-05, Europe/Rome)

**6A.12-R DESIGN PROPOSTO — REVIEW REGIA PENDING — PRODUZIONE/IMPLEMENTAZIONE NON AUTORIZZATE.**
Base approvata `55d6bd6ef8211e9f136468090ff195f4ac791bde`, solo feature/train-management;
R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` preservata. Il piano6A.12-P resta
storico, superato operativamente: nessun acquisto hosting o staging da eseguire.
6A.12-L sospesa, nessun WIP rilevato nei checkout disponibili, nessun reset/clean.

Cinque soli nuovi documenti: [architettura](docs/_active/train-management/6A12R_FREE_BROWSER_ARCHITECTURE.md),
[decisione D09/D10](docs/_active/train-management/6A12R_D09_D10_DECISION.md),
[piano produzione/audit](docs/_active/train-management/6A12R_PRODUCTION_MIGRATION_PLAN.md),
[limiti Free/rischi/fonti](docs/_active/train-management/6A12R_FREE_LIMITS_AND_RISKS.md),
[percorso e18criteri R0](docs/_active/train-management/6A12R_ROUTE_TO_COMPLETE_SERIEN.md).
STATUS aggiornato; nessun altro file applicativo/SQL/test/workflow modificato.

Proposta W: Pages→HTTPS→Edge verificatore P-256→SQL privato attestato, ownerless
e zero nuovi Auth. D09=A non trasferibile tacitamente: nuova decisione richiesta
per login runtime EXECUTE-only e contesto RLS verificato, claimCOMMIT separato
dai dati, lifecycle senza ruoli per-device. Verificatore Edge fidato, rischio issuer
e credenziali privilegiate runtime espliciti; nessuna separazione processo inventata.
Auth anonima confrontata, NON adottata: richiederebbe deroga D10/membership/recovery;
JWT non sostituisce nonce. L01 32/16 storico FAIL conservato, nuovo cap gestito
aggregato NOT VERIFIED/bloccante; ammissione transazioni non equivale a cap sessioni.

Audit Supabase reale autorizzato solo letture: SerieN Free/eu-west-3/PG17.11.0.003,
due migrazioni iniziali, dieci tabelle tutte0righe, Auth1, Storage0/0, Edge0;
otto FK Auth CASCADE, RLS attiva e policy owner legacy. Nessun utente eliminato,
nessun segreto letto o modifica remota. Backup NON eseguito: inventario fresco,
dump esportabile/leggibile e restore locale, rehearsal, flag DISABLED, rollback/
forward-fix e approvazione esatta della Regia restano gate prima del futuro deploy.
Nessun nuovo progetto staging e nessun costo ricorrente introdotto.

Checkout originale work/5c8f0f5 pulito e senza stash conservato. Git shell bloccato
da proxy irraggiungibile; connettore GitHub conferma checkpoint e12commit dopoR1.
Checkout isolato shallow/sparse con108blob/172tree e commit esatti verificati SHA;
evidenze storiche e due .DS_Store esclusi solo dalla materializzazione, nel tree intatti.
Nessun main import, rebase/reset/merge. Pubblicazione del solo branch autorizzato
via Git Data API fast-forward con lease dopo verifica locale.

Verifiche fresche: npm37unità file PASS/0FAIL, Python/JMRI9 PASS, build e canonico
senza diff; scope/link/tabelle/hash/segreti in /workspace/work/6A12-R/verification.json.
Bundle/R1/canonico/UI/backend/SQL/asset/dipendenze invariati per hash e tree.
Nessuna nuova suite SQL/browser6A.11, misura hosted o R1 visuale/performance/hardware:
NOT VERIFIED, prove approvate precedenti solo ereditate. Il simulatore non dispone
ancora di capture/hydrate/outbox generali; il piano li mette prima dell'apertura
cloud generale e conserva tutti R0P01–P18 senza dichiarazioni di completamento.

Checkpoint atomico contenente i cinque documenti più PROGRESS/STATUS; SHA effettivo,
coincidenza remota, contenuti e working tree verificati nella consegna dopo
pubblicazione. **Unica prossima azione: audit Regia e decisione esplicita sul modello
W/D09/D10. STOP6A.12-R;6A.12-R.1 locale, produzione e6B–6E non autorizzate.**
