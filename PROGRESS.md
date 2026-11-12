# SerieN — Stato e ripresa

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

## Train Management — M1 (2026-11-06)

Autorizzata esclusivamente M1 dalla baseline main `2a48681c9a7fbfa97386ab619684cab55c779b98`, verificata con fetch. Branch isolato `codex/train-management-m1`. Catalogo grafico, composizioni reali, dettaglio ordinato/direzione/lunghezza, sganciati e selezione/focus condivisi con plancia e scena. Nessuno store ferroviario aggiunto, nessuna modifica R1/collisioni/router/layout/scenografia/Supabase; E1 non importato.

**229 Node, 9 Python, build, browser M1 e regressioni Train Deck/Phase Zero PASS**. Screenshot desktop/tablet ispezionati; touch CDP sulla build minificata PASS. Fixture di autenticazione locale e rendering su richiesta, nessuna verifica hardware o cloud: dettagli in [rapporto M1](docs/_active/train-management/REPORT.md), [stato](docs/_active/train-management/STATUS.md).

Commit atomico e checkpoint remoto sul branch autorizzato, Draft PR verso main: SHA effettivo e link nella consegna dopo verifica. Nessun merge o deploy. **Unica prossima azione: review indipendente della Regia. M2/M3 non iniziate; STOP M1.**

## Train Management — M1.1 (2026-11-06)

Autorizzata esclusivamente la vista laterale completa prima di M1-V1. Checkpoint locale/remoto iniziale pulito `72ed618516b13ab2f77d2759c499e800a7ce7b1b`; stesso branch `codex/train-management-m1` e Draft PR #3. Quattordici PNG ortografiche trasparenti a scala comune, posizioni dai ganci/consistLayout, ordine effettivo e orientamento previsto da R1, lunghezza/numero veicoli, zoom/scroll/Fit e testo sotto. Nessuna modifica ad app.js, motore, regole ferroviarie, asset preesistenti, plancia, Supabase/cloud o funzionalità M2/M3.

**234 Node, 9 Python, build, browser M1.1 sulla build minificata e regressione M1 PASS.** Screenshot BR 055 reale con tre carri (314,6 mm), tablet nativo/Kenney e fixture UI lunga a sei veicoli ispezionati; 14 PNG + manifest rigenerati identici byte per byte. Rendering su richiesta nella fixture Chromium/SwiftShader, nessuna verifica hardware fisica o gate runtime generale. [Rapporto M1.1](docs/_active/train-management/M1.1_REPORT.md), [stato](docs/_active/train-management/STATUS.md).

Commit aggiuntivo atomico e checkpoint remoto verificati nella consegna; PR #3 rimane Draft. Nessun merge/deploy. **STOP M1.1; unica prossima azione: review della Regia. M1-V1 NON avviata e richiede nuova autorizzazione.**

## Train Management — M1-V1 Final Runtime Gate (2026-11-06)

Regia approva M1/M1.1 per la verifica conclusiva, baseline locale/remota pulita `318aaf89da5a5a12e249c2d5c72d5252c4fb3431`, stesso branch e Draft PR #3. **M1-V1 PASS CON LIMITI**: build minificata reale, RAF nativo continuo non intercettato, tre treni in movimento, apertura/chiusura, sincronizzazione, aggancio/sgancio reali, zoom/Fit/scroll desktop/tablet touch e catalogo verificati. Zero errori JS/console, richieste fallite o HTTP ≥400. Risorse ai checkpoint: 348 geometrie/44 texture; contesto attivo all'ultimo controllo.

**Fluidità hardware NON validata:** nel worker Chromium usa soltanto SwiftShader, circa 0,4–0,6 frame/s in Low, non fluido. Nessun test a rendering fermato usato in sostituzione. Build ricostruita identica per hash a M1.1; suite già superate non ripetute. Due errori nel solo harness Python corretti e verifiche mancanti riprese sullo stesso bundle: provenienza completa in [rapporto M1-V1](docs/_active/train-management/M1-V1_REPORT.md), [stato](docs/_active/train-management/STATUS.md).

Prodotto, R1, Supabase e autenticazione invariati. Commit solo test/documentazione/evidenze, checkpoint normale sul branch autorizzato e verifica remota nella consegna. Nessun merge/deploy o M2/M3. **STOP dopo il rapporto; unica prossima azione: review Regia dei risultati e del limite GPU.**

## Supabase Alignment — S2 recovery (2026-11-11)

Regia autorizza ripresa, non riavvio, dal checkpoint [#4](https://github.com/epivic-lab/SerieN/issues/4). Recuperati undici file S2 non committati sul branch locale `codex/supabase-alignment-s2`, HEAD/baseline `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`; nessun commit S2 preesistente o branch remoto. Due migrazioni originali byte-identiche al remoto, terza invariata. Recuperati replay PG17.11 e confronto catalogo PASS, test SQL/sicurezza/commit differito PASS, 40 unità/file Node24, 9 Python e build PASS. Nuove letture remote dell'11 novembre confermano stessa storia e catalogo, senza modifiche produttive.

Aggiunti CI isolata senza segreti/deploy, manifest e documentazione/evidenze permanenti. [Rapporto S2](docs/supabase/alignment/RESULTS.md), [recupero](docs/supabase/alignment/RECOVERY.md), [riproduzione](docs/supabase/alignment/REPRODUCE.md). Il rapporto distingue risultati recuperati e CI da leggere dopo il checkpoint sul commit consegnato. Nessun cambiamento R1/M1/M2/UI/asset/Auth, nessuna importazione E1 o migrazioni sperimentali. Auth/Data API live e opzioni Preview restano da verificare. **Nessuna PR** senza prova di sicurezza Preview; nessun merge/deploy. Unica azione dopo consegna: review Regia S2 e decisione S3.

## Supabase Alignment — S3 preparazione Draft PR (2026-11-11)

Regia approva tecnicamente S2 `a864de9f17c71775d60746f6432618343b8299ac` e autorizza soltanto la Draft PR di allineamento, mai il merge. Impostazioni dashboard riferite dalla Regia: repository SerieN, directory `.`, deploy produttivo attivo su main, automatic branching disattivato. CI resa permanente per PR main e push pertinenti main/S2, mantenendo replay effimero, token read-only e zero connessioni produttive. Test statici evento/ref/paths e shell PASS; preflight hash/catalogo remoto PASS; test locali e build PASS. [Rapporto S3](docs/supabase/alignment/S3.md); gli esiti reali CI/check/PR sono riportati nella consegna dopo verifica sul nuovo SHA. Nessun cambiamento SQL storico, R1/M1/M2/UI, Auth o configurazioni remote. Il merge può avviare deployment Supabase e Pages: **NON ESEGUITO; STOP per autorizzazione Regia**.

## Train Management — M2, incremento dominio (2026-11-11)

Mandato esplicito per tutta Milestone A, con incrementi e checkpoint, da main remoto `184cc9b` verificato; branch nuovo `codex/train-management-m2`. Nessun M3/persistenza/merge/deploy/redesign. Catalogo quattordici modelli normalizzato dal manifest esistente, store di progetti in RAM isolato, identità progettate/fisiche distinte, lifecycle/ordine/orientamento e confronto con generazione di reset. Sette nuovi test; baseline 234 Node/build PASS. [Rapporto e prove aggiornati](docs/_active/train-management/M2_REPORT.md). UI/browser M2 NOT VERIFIED in questo incremento. Prossima azione: integrare la UI M2 e la vista laterale, nel perimetro A già autorizzato.

## Train Management — M2, incremento editor (2026-11-11)

Primo checkpoint remoto `2743bcd`, albero identico al precursore locale d80082f, pubblicato tramite connettore con autorizzazione esplicita dell'utente. Integrata vista Projects: lifecycle, modifiche non confermate protette, anteprima M1.1 con flip, confronto e copia del reale, invalidazione riferimenti al reset. **245 Node, 9 Python, build, canonico e browser funzionale M2 (13 gruppi) PASS**; limiti e primo errore dell'harness preservati nel [rapporto M2](docs/_active/train-management/M2_REPORT.md). Solo notifica reset aggiunta ad app.js; sorgenti R1/backend/layout/deck invariati. Prossima azione: gate runtime continuo con tre treni e regressioni browser R1, senza M3/persistenza/merge/deploy.

## Train Management — M2, chiusura Milestone A (2026-11-11)

**M2 READY FOR REVIEW — STOP per audit Regia.** Baseline main `184cc9b`, branch `codex/train-management-m2`; dominio remoto `2743bcd`, codice completo remoto `59f54f1`. Incremento conclusivo solo test/documentazione/evidenze, SHA effettivo e checkpoint remoto verificati nella consegna. Precursori locali preservati e interi alberi identici ai checkpoint del connettore autorizzato; nessun reset/rebase/force-push.

**245 Node, 9 Python, build, canonico, otto suite browser PASS**. Gate RAF nativo: 3 treni in moto, 11 gruppi/22 checkpoint/486 frame; input trusted mouse e touch nei due viewport tablet, conferma/riordino/orientamento senza effetti fisici. Comandi R1 rifiutati in marcia e sgancio/riaggancio da fermo con altri due treni in moto, identità conservate. 348 geometrie/44 texture stabili, contesto attivo, zero errori/richieste fallite. Tentativi precedenti dell'harness mantenuti con esito originale; dettagli nel [rapporto M2](docs/_active/train-management/M2_REPORT.md) e nella [matrice](docs/_active/train-management/evidence/M2/FINAL_GATES.json).

Progetti solo in RAM; nessuna applicazione globale, orientamento solo progettato, comandi fisici dalle console esistenti. GPU/tablet fisici e fluidità hardware **NOT VERIFIED**; SwiftShader circa 0,375 frame/s non fluido. Backend/Auth/privilegi, motore R1, plancia, redesign, canonico e asset preservati; sola notifica di invalidazione dopo reset in app.js. Nessuna nuova dipendenza o renderer. **M3/persistenza non iniziate, nessun merge/deploy. Prossima azione unica: audit della Regia.** Proposta M3-A: contratto inventario fuori scena/ingresso-uscita fisica, separato dagli sganciati sul plastico.

## Train Management — M3-A contratto (2026-11-11)

Regia approva M2 `a67e0de` e autorizza M3 A/B condizionata/C sul branch esistente `codex/train-management-m2`. HEAD remoto M2 e main `184cc9b` verificati, working tree pulito. [Contratto M3-A](docs/_active/train-management/M3_CONTRACT.md): cinque identità distinte, record virtuali disponibili/prenotati per posti M2 confermati, nessuna equivalenza con materiale fisico/sganciato. R1 non espone trasferimenti generici deposito↔scena; addTrain, reset e diagnostica non saranno riutilizzati come trasferimenti. Architettura isolata fattibile senza modifiche R1: B autorizzata dal mandato a questa condizione. Prossima azione: implementare inventario/vista Depot, poi collaudo C e STOP Regia; nessuna persistenza/release/main/deploy/E1/redesign.

## Train Management — M3-B inventario virtuale (2026-11-11)

Contratto A remoto `afc6c00` verificato. Implementati store isolato e vista Depot, identità `depot:<UUID>`, disponibilità/prenotazione di posti M2 confermati, riconciliazione senza mutazioni M2/R1, liste virtuali/fisiche/sganciate distinte, trasferimenti fisici non disponibili. Nessun cambio ad app.js/motore/asset/renderer/backend. **254 Node, 9 Python, build/canonico, browser M3 (9 gruppi) e lifecycle 25 cicli PASS**; primo errore del predicato dell'harness preservato nel [rapporto M3](docs/_active/train-management/M3_REPORT.md). Prossima azione già autorizzata: C, regressioni e gate nativo con tre treni. Nessuna persistenza/release/main/deploy/E1/redesign.

## Train Management — M3-C chiusura (2026-11-11)

**M3 READY FOR REVIEW — STOP Regia.** Branch `codex/train-management-m2`; M2 approvata a67e0de, main `184cc9b` preservata. Checkpoint remoti A `afc6c00`, B `252d9c3`, C solo test/rapporto/evidenze: SHA conclusivo e verifica remota nella consegna. Alberi confrontati integralmente con precursori locali conservati, nessun reset/rebase/force-push.

**254 Node, 9 Python, build/canonico, dieci suite browser conclusive PASS**. M1/M1.1/M2 e lifecycle, 11 scenari R1, console/layout preservati. Gate nativo M3: 6 gruppi, 7 checkpoint, 74 frame, input trusted mouse/touch, 3 treni in movimento durante gestione/prenotazione deposito. Aggancio/sgancio rifiutati in marcia e verificati da fermo con altri due treni in moto: stesso carro fisico, nessuna conversione in inventario, progetti/inventario conservati anche a close/reopen e reset. 348 geometrie/44 texture stabili, contesto attivo, zero errori/richieste fallite. [Rapporto M3](docs/_active/train-management/M3_REPORT.md), [matrice](docs/_active/train-management/evidence/M3/FINAL_GATES.json).

Inventario solo virtuale/RAM con prenotazioni dei confermati; niente trasferimenti fisici scena↔deposito o applicazione di composizioni. App.js/R1, dominio M2/M1.1, asset/renderer, canonico, Supabase/Auth/RLS, dipendenze e workflow immutati. Hardware fisico/fluidità e presentazione prompt nativo NOT VERIFIED; software circa 0,455 frame/s non fluido. Primo errore dell'harness archiviato senza riscriverlo; prove conclusive PASS sullo stesso bundle. **Nessuna persistenza, release, E1, redesign, main, merge o deploy avviati. Prossima azione unica: audit/approvazione della Regia, nessun altro sviluppo.**

## UI V2.1 — Fase 0, audit e preparazione (2026-11-11)

Mandato limitato alla Fase 0. Verificati direttamente main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` e M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421`; main antenato, sei commit esclusivi. Creato `codex/ui-v2-integration` da M2/M3 approvata, preservando checkout iniziale/branch originali. Nessuna modifica applicativa/Auth/Supabase/layout/V1, merge o deploy.

**254 Node, 9 Python, build, canonico e dieci suite browser PASS**, incluso RAF nativo con tre treni, input mouse/touch trusted, sgancio/riaggancio reale con altri due in moto; software circa 0,524 fps, hardware fisico NOT VERIFIED. [Integration Readiness Report](docs/ui-v2-integration/REPORT.md), [stato](docs/ui-v2-integration/STATUS.md), evidenze nuove separate da quelle storiche. Checkpoint documentale sul branch dedicato, SHA e verifica remota nella consegna.

**BLOCKED per integrazione UI:** ZIP V2.1 non disponibile, pacchetto tecnico definitivo Claude e relativa approvazione mancanti; Exit to title separato da logout da definire. Audit software completato senza regressioni rilevate. **STOP Fase 0; unica prossima azione: attendere pacchetto definitivo e successiva autorizzazione della Regia.**

## UI V2.1 — acquisizione design: blocco trasferimento (2026-11-11)

Design dichiarato approvato dalla Regia, incarico ancora limitato alla Fase 0. Allegato effettivo `serien-codex-package-ui-v21.zip` (nome citato diverso); `download_file` restituisce `file exceeds the executor transfer limit of 32 MiB`. Nessuna copia locale: contenuto, equivalenza nomi, checksum e confronto V2.1↔baseline **NOT VERIFIED**. **Acquisizione/audit design BLOCKED**, non dichiarati completati.

Remote main `184cc9b`, M2/M3 `91722fb` e checkpoint dedicato iniziale `e61402c` nuovamente verificati; working tree iniziale pulito. Nuove esecuzioni: **254 Node, 9 Python, build/canonico PASS**, stesso bundle/canonico; suite browser precedenti non ripetute. Aggiornati solo [rapporto §11](docs/ui-v2-integration/REPORT.md), STATUS, PROGRESS ed evidenze. Nessuna modifica applicativa/Auth/Supabase/V1, merge o deploy.

**STOP. Unica prossima azione: acquisire lo ZIP tramite URL scaricabile o parti sotto 32 MiB e completare l'audit**; pacchetto tecnico definitivo e autorizzazione all'implementazione restano separati. SHA del checkpoint documentale e allineamento remoto nella consegna.

## UI V2.1 — tentativo Google Drive (2026-11-11)

Metadati e raw fetch connettore PASS: file Drive `1lZ9zmhbh8HwDC1ILd5OqeKJCrV0fm2i8`, `serien-codex-package-ui-v21.zip`, application/zip dichiarato, 36.752.894 byte. **BLOCKED nella materializzazione**: host temporaneo `sdmntprnortheu.oaiusercontent.com` HTTP 403; Drive diretto CONNECT 403, domini non in allowlist enforced. Non è un diniego dei permessi Google Drive. Nessun ZIP locale: integrità/manifest/contenuto/contratti e confronto completo NOT VERIFIED.

SHA main/M2-M3/V1 e checkpoint iniziale `e48dd96` confermati; nessuna modifica applicativa contro `91722fb`. Test non ripetuti come richiesto; bundle/canonico identici. Solo rapporto §12, STATUS, PROGRESS ed evidenza sicura del blocco; nessun URL firmato salvato. [Rapporto](docs/ui-v2-integration/REPORT.md).

**STOP per la Regia. Prossima azione:** consentire il dominio di download nelle impostazioni rete e ripetere con riferimento fresco, oppure parti sotto 32 MiB; poi completare l'audit. Nessuna implementazione/merge/deploy.

## UI V2.1 — acquisizione definitiva e readiness gate (2026-11-11)

**READY FOR UI V2.1 IMPLEMENTATION GATE**, non autorizzazione applicativa. Due ZIP CRC PASS; `.aa` + `.ab` ricostruiscono l'originale di 36.752.894 byte, SHA-256 `9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d`. CRC originale e manifest tecnico 197/197 + design 143/143 PASS. Presenti dossier tecnico/spec/contratti/prompts U0–U9, design V2.1 congelato e V1 (40 file identici al branch design). Blocco di trasferimento RISOLTO.

[Rapporto §13](docs/ui-v2-integration/REPORT.md), [mapping 66 controlli e 31 schermate / evidenze](docs/ui-v2-integration/evidence/final-package/). Confronto con M2/M3 `91722fb` completo; branch effettivo resta `codex/ui-v2-integration`, M3 già approvata/presente: riferimenti precedenti del dossier superati dal mandato, nessun merge/rebase. Adattamenti solo UI documentati (getter/launcher, conferme, DOM, cascade); engine/store/Auth congelati.

Smoke nuovo reference 4 tab PASS con limiti espliciti; primo harness selettore errato registrato. Font definitivi/licenze da acquisire in U1, gate visivo/interattivo completo da eseguire nelle fasi previste. Baseline test non ripetuti come richiesto; nessuna modifica applicativa, hash bundle/canonico invariati. Aggiornati solo rapporto/stato/progresso/evidenze. **STOP per gate Regia sul pacchetto e adattamenti; nessuna U0/U1 applicativa, merge o deploy avviati.**

## UI V2.1 — U0 Integration Foundation & Contract Normalization (2026-11-11)

Regia approva il pacchetto tecnico e autorizza **soltanto U0 documentale**. Verificati branch locale/remoto iniziale `codex/ui-v2-integration@af67ee5c65679b7e5fa384d76a0825dff022f27d`, baseline applicativa `91722fbdf6671e69deebf645c3d8bf389212f421`, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d`; nessun altro branch/merge/rebase M3, già approvata/presente.

**U0 READY FOR REGIA REVIEW.** [Rapporto](docs/ui-v2-integration/U0_REPORT.md); registry completo 66 CTRL / 31 schermate, crosswalk source/DOM/callback/test, 13 adapter futuri, 14 conflitti normalizzati, piano U1–U9, matrice test/gate, inventario/provenienza in [docs/_active/ui-v21](docs/_active/ui-v21/README.md). Nessuna copia dell'intero design, nessun runtime/test baseline modificato, niente selector migration.

**PASS:** validatore isolato: 19 controlli statici, 226 file applicativi/test/config byte-identici a 91722fb, build con bundle/canonico identici. Suite browser/Node/Python baseline non ripetute; nuovi adapter/font/gate visuali NOT VERIFIED. Font/licenze Cinzel Decorative/Federo/Cutive Mono da acquisire e verificare prima U1; U0 non li installa. U1 normalizzata solo staging/fixture, attivazione CSS regionale da U2.

Checkpoint atomico documentale sul branch esistente; SHA/allineamento remoto nella consegna. Nessuna modifica R1/M2/M3/Auth/Supabase/V1/dipendenze/workflow, merge o deploy. **STOP U0: attendere review Regia e autorizzazione esplicita U1 con prerequisiti font.**

## UI V2.1 — PRE-U1 font preflight (2026-11-11)

U0 `b9574ae71dd7ebf4039affc20d969d813b93797d` APPROVATA SENZA RISERVE. Autorizzato solo prerequisito font, non U1. **FONT GATE PASS — READY FOR U1.** Font ufficiali google/fonts@`c30b221beb0c1da59d563feb91ec8656a1fa972a`: Cinzel Decorative Bold 700, Federo Regular 400, Cutive Mono Regular 400, licenze OFL separate/copyright/RFN preservati, metadati/pesi/hash verificati. TTF→WOFF2 con FontTools già presente e Brotli integrato Node; nessuna dipendenza o installazione globale.

[FONT_PREFLIGHT_REPORT](docs/_active/ui-v21/FONT_PREFLIGHT_REPORT.md), manifest/font/licenze e verifiche in docs/_active/ui-v21/font-staging. PASS conversione/roundtrip contorni e metriche/layout, browser Chromium offline senza richieste/errori, validatore invarianti 226 file e build/bundle identico. Warning kern upstream Federo documentato con coppie preservate e browser PASS; primo harness corretto prima dei check. Endpoint CSS Google Fonts CONNECT403, sorgenti ufficiali pinned su raw.githubusercontent.com accessibili, nessun aggiramento policy. Suite baseline non ripetute; UI integrata/font visual gate e altri browser/hardware NOT VERIFIED.

Solo inventario/provenienza/documentazione e staging non attivo; nessun index/style/app/src/test/workflow/dipendenze/Auth/Supabase/design o ramo originale modificato, nessun merge/deploy. Checkpoint remoto sul branch codex/ui-v2-integration verificato nella consegna. **STOP per la Regia: U1 richiede autorizzazione esplicita separata.**

## UI V2.1 — U1 Asset Staging & Isolated Visual Foundation (2026-11-11)

Font Gate approvato; due autorizzazioni U1 ricevute identiche. Verificati locale/remoto `codex/ui-v2-integration@65b910bc25def1f0064a0758e29f8d5715314568`, baseline M2/M3 `91722fb`, main `184cc9b`, working tree iniziale pulito. **U1 READY FOR REGIA REVIEW.**

19 file inattivi in ui/: CSS/token/materiali/sprite da pacchetto verificato, tre font WOFF2 PRE-U1 e licenze verbatim, manifest. Solo import remoto rimosso da copia tokens V1, sette simboli TM visivi aggiunti a copia sprite; nessuna JS reference o miniatura/renderer copiata. Ordine legacy→V1→TM→integration ultimo soltanto nella fixture isolata. [Rapporto](docs/_active/ui-v21/U1_ASSET_STAGING_REPORT.md), evidenze nuove docs/_active/ui-v21/evidence/U1/.

**PASS:** hash/integrità/licenze, HTTP200 tutti asset, tre font loaded/famiglie/pesi/no synthetic, rete esterna assente, offline con risposte da file locali in contesto nuovo, zero errori, screenshot 1440×900 ispezionato. Cascade sette campioni con/senza legacy senza differenze; build/bundle identico e 226 file runtime/test/config protetti invariati. Nessuna suite storica ripetuta; UI integrata/altri viewport/browser/hardware NOT VERIFIED.

Solo staging e documentazione; nessun index/style/app/src/R1/M2/M3/Auth/Supabase/V1/V2.1 congelato/test/workflow/dipendenze modificato; nessuna attivazione nuova UI, merge/rebase/reset/deploy/release. Checkpoint remoto verificato nella consegna. **STOP U1: attendere review Regia e nuova autorizzazione U2.**

## UI V2.1 — U2 Shell, Header, Dialogs & TM Launchers (2026-11-11)

U1 approvata; U2 autorizzata dal checkpoint `74a8d91c2feafcb826ee316862ec2e8bf7d12a56` sul branch esistente, remote/ancestor/working tree verificati. **U2 READY FOR REGIA REVIEW.** [Rapporto](docs/_active/ui-v21/U2_REPORT.md), evidence/U2 con log/exit code/screenshot/invarianti.

Shell/header/Menu/Help/Plan/auth skin attivate solo in regioni CSS scoped, asset e font locali. A01/A02: Sign out sul nodo/listener Auth originale, guard con dirty/count reali e conferma one-shot; cancel/doppio evento/obsolete/dispose verificati. Una sola istanza TM per header/Menu/Stock, sessione/focus preservati. Qualità/rolling stock reali, Exit disabled; UI sound indipendente dalla Bell. Reset/Composer/Depot mantengono confirm sincrone; nessuna migrazione sidebar/dock/HUD/viste TM o motore.

**PASS:** 254 Node,9 Python,build+canonico; U2 specifici10gruppi/16screenshot su3viewport e login, pointer verso OrbitControls, M1/M2/M3/lifecycle, R1/5C11scenari, deck/PhaseZero; native finale6gruppi/7checkpoint/74frame,3treni e input reali. Tutti16comandi exit0, bundle finale `3112b76b6988dc9f5932511cbe31336f0e1b2e68cff15bfff1b26e722e572fa1` verificato anche viaHTTP nel gate nativo. 215/226file baseline identici; delta autorizzati app/index/TM e8test con sole migrazioni di selettore dialog, nessuna asserzione di dominio indebolita. Iniziali errori di harness/server/selector e adattamenti CSS documentati con recupero, non occultati.

OAuth reale/provider, hardware/GPU/audio e UI integrata completa NOT VERIFIED; SwiftShader circa0,645fps non fluido. Packaging ui/ su Pages da autorizzare prima della futura release, workflow invariato in U2. Nessuna modifica Auth/Supabase/R1/store/asset/layout/design frozen/dipendenze/workflow, nessun merge/main/deploy. Commit atomico e checkpoint remoto verificati nella consegna. **STOP U2, attendere audit Regia e nuova autorizzazione esplicita U3.**

## UI V2.1 — ripresa controllata U2 dopo interruzione (2026-11-11)

Recuperato **`19a84092131a81ee95a869218d77357723abf3a4`**, unico commit U2 dopo U1, già sul remoto del branch autorizzato `codex/ui-v2-integration`; stato iniziale pulito, nessun staged/unstaged/untracked. Implementazione/test/screenshot già completi: nessun lavoro ricreato. Ripristinato il solo tracking locale del branch con fetch esatto non-force.

**PASS nuovo audit statico:** 15 hash sorgenti e 226 hash/blob baseline corrispondenti, 16 ricevute exit0, bundle finale identico al gate nativo, 16 screenshot recuperati e 114 evidenze precedenti inventariate. **PASS documentato da esecuzioni precedenti:** test Node/Python/build/canonico e suite browser U2/M1/M2/M3/R1/native sopra elencati; nessun test costoso ripetuto e nessun sorgente/test/asset modificato. NOT VERIFIED e prerequisito packaging futuro restano espliciti. [Rapporto aggiornato](docs/_active/ui-v21/U2_REPORT.md), [audit di ripresa](docs/_active/ui-v21/evidence/U2/recovery/VERIFICATION.json).

Checkpoint della ripresa soltanto documentale, SHA e allineamento remoto nella consegna. **U2 READY FOR REGIA REVIEW; STOP.** Unica prossima azione: audit Regia e nuova autorizzazione esplicita U3. Nessun merge/main/deploy/Supabase o fase successiva.

## UI V2.1 — U3 Real Viewport Overlays (2026-11-11)

U2 APPROVATA; autorizzata soltanto U3. Verificati branch `codex/ui-v2-integration`, HEAD/upstream/remoto iniziali `48a7c4d48b118877ec7edf7f4c61fba090e460b8`, stato pulito e main `184cc9b`. **U3 READY FOR REGIA REVIEW.** [Rapporto](docs/_active/ui-v21/U3_REPORT.md), [risultati](docs/_active/ui-v21/evidence/U3/results.json).

Adapter di sola presentazione riusa controlli camera/Route, HUD e SVG topologici originali, Bell/status originali e medesimo mute dal Menu. Operations Log originale completo/persistente spostato nel viewport; startup skin senza boot change. CSS U3 regionale, un canvas/picking invariato; nessuna migrazione sidebar/dock/TM. Scena Guarded Stop espone soltanto i nodi UI tramite getter; motore, proiezioni, dispatcher, Bell controller, M1/M2/M3/Auth/Supabase/asset/layout/deps/workflow invariati. Un test storico adattato solo per aprire View e localizzare Bell; tutte le asserzioni identiche.

**PASS:** 254 Node,9 Python,build+canonico,9 gruppi U3 produttivo,5 gruppi picking/cleanup,17 immagini finali shell/route/native su3viewport; S2,S6,R1/5C11scenari,PhaseZero. 14 comandi finali exit0. Native RAF:3treni reali,63frame/194542,2ms (~0,319fps software), Follow+drag trusted e nessun pageerror; fluidità hardware NOT VERIFIED. 222/226 file manifest U2 identici e quattro delta autorizzati verificati per inversione; CSS U2 prefisso intatto e asset/font/licenze identici. Bundle `e45a019e20ca80b079d00fc3c8ae5b4d36111e6bb3ec87733a9bb2d1d7709cfc` identico al test nativo. Failure di fixture/timing/serializzazione/harness conservati e risolti; contrasto Route circoscritto a U3 e ricontrollato.

OAuth remoto/altri browser/hardware/prompt beforeunload/UI completa NOT VERIFIED; M2/M3 complete non ripetute, contratti invariati. Packaging ui/ resta prerequisito della futura release separata. Checkpoint atomico e remoto verificati nella consegna; nessun main/merge/deploy/rebase/force. **STOP U3. Prossima attività consentita: sola revisione indipendente della Regia; U4 non avviata.**

## UI V2.1 — U4 Sidebar, Switches, Environment, Missions & Map (2026-11-11)

U3 APPROVATA; autorizzata esclusivamente U4. Ingresso branch `codex/ui-v2-integration`, HEAD/upstream/remoto `907a9ec4a9d570f03af9ab77d39269ff49787256`, stato pulito e main `184cc9b` verificati. **U4 READY FOR REGIA REVIEW.** [Rapporto](docs/_active/ui-v21/U4_REPORT.md), [risultati](docs/_active/ui-v21/evidence/U4/results.json).

Nuovo adapter sidebar di sola presentazione: otto nodi/handler reali e motivi di blocco completi, glyph/valore daylight dal binding originale (soglie42/72), missioni/ciclo originale con Next sempre disponibile. Mappa SVG da railwayMapPath/locomotivePoint, marker fisici e focus selezione/camera esistenti, quattro treni anche con tre console LRU. Nessuna modifica a dock, miniature o file U2/U3. App.js solo mount/update/dispose/focus UI; CSS integration conserva U3 e aggiunge solo regole U4. Nessun indice/DOM hook perso, nessun log duplicato, mock, nuova safety o store.

**PASS nuovi:** 254 Node,9 Python,build/canonico/invarianti,9 gruppi U4 produttivi,6 safety/camera/cleanup, S2/S5/Phase Zero;13 comandi finali exit0 e27 immagini finali su3viewport oltre alle regressioni. Occupied/approaching/unknown reali con parità tile/3D; RAF nativo3treni,16frame/24132,3ms (~0,622fps software), marker fisici sincronizzati e focus senza mutazione ferroviaria. Bundle `4d63096f8b4cdaa15e62de27ee2b70384712deed58483fa2382fcdccdcde3c27`. 225/226 file manifest U3 identici; delta app.js invertito esattamente rimuovendo solo i binding UI, asset/font/licenze/workflow e tutti gli altri src/ui/tests preesistenti invariati. Nessun test storico modificato.

Failure di costruzione, aspettativa Reset/fourth train, preparazione approach e harness S5 conservati e risolti; nessuna modifica ai contratti per ottenere PASS. M2/M3 completi e certificazione estesa R1/5C non ripetuti, restano PASS storici U3 con domini invariati. Hardware/GPU/touch/audio/screen reader/altri browser/OAuth remoto/prompt beforeunload/UI completa NOT VERIFIED. Nessun main/merge/deploy/rebase/reset/clean/force, Supabase o packaging modificato. Checkpoint atomico e verifica remota nella consegna. **STOP U4: unica prossima azione, revisione indipendente Regia; U5 non avviata.**

## UI V2.1 — U5 (2026-11-11)

Autorizzata esclusivamente U5 da U4 approvata `1d591bbc914f74cf066666522c6692be4132a614`, branch `codex/ui-v2-integration`. Quattro card fisiche stabili/carousel, cronologia LRU separata, ID selezionati unici e selezione condivisa; throttle 0–100 distinto da actual/gauge `abs(velocity)` 0–150 layout/s. Callback ferroviarie originali, STOP ALL senza latch, Pause e Add Train preservati. Reset con coordinator, consenso una volta, contesto rivalidato e corpo ferroviario invariato; Cancel zero mutazioni, generation/STale e record/prenotazione M2/M3 conservati. Keyboard/focus e dispose verificati.

**254 Node,9 Python,build/canonico/invarianti,8 gruppi U5,lifecycle,Browser Train Deck,Phase Zero,5C e smoke U2/U3/U4 PASS.** Native RAF sul bundle finale:4 treni reali,89frame/140877,644ms (~0,625fps SwiftShader), stop individuale/globale e pause/resume,zero pageerror; hardware NOT VERIFIED. Screenshot finali1440×900/1024×768/390×844. Sessione fisica singleton NOT VERIFIED: screenshot singolo proietta soltanto il vero treno0, senza rimuovere la flotta. Recuperi e limiti nel [rapporto U5](docs/_active/ui-v21/U5_REPORT.md), [stato](docs/_active/ui-v21/STATUS.md), [evidenze](docs/_active/ui-v21/evidence/U5/results.json).

Bundle `8199e84ff8b0bf600013ff7b7ded3fe7d42a5a6be13468f55032e3a78add7ac3`; motore/dispatcher/topologia/M2/M3/asset/Auth/Supabase e workflow invariati. Checkpoint atomico e push normale sul solo branch autorizzato, verifica SHA nella consegna. **U5 READY FOR REGIA REVIEW — STOP; U6–U9 non avviate, nessun merge/main/deploy/Pages.**

## UI V2.1 — U6 recovery (2026-11-12)

Ripresa U6 autorizzata da U5 approvata `e6f152c9b5a23347cbbd5aa6898b91a11e2194e0`, branch `codex/ui-v2-integration`. Inventario prima degli interventi: quattro file applicativi parziali, due log baseline, nessun commit U6; preservato il lavoro e completati shell unica/tab/focus, Layout reale/Side View originale, Catalog definizioni/filtri e guard shell atomica. API discard originale sincrona e store/interiori U7/U8 invariati, aggiunta minima di presentazione per consumo del consenso già rivalidato. Reset/generation/STALE/session-only e beforeunload conservati.

254Node,9Python,build/canonico/invarianti,M1,Side View,Projects lifecycle,6gruppi U6,smoke U2,8gruppi U5 e RAF nativo4treni con consultazione TM PASS. Cinque viewport richiesti; nessuna pretesa hardware. Bundle `8672384da7e4224342c2d6f2168132aca45d97ce49a6a1b1a6d98fe84ad2b7e7`. Disconnessione temporanea exec-server recuperata senza modifiche distruttive; failure intermedi e limiti espliciti nel [rapporto U6](docs/_active/ui-v21/U6_REPORT.md), [risultati](docs/_active/ui-v21/evidence/U6/results.json).

App/motore/dispatcher/topologia/catalogo/store/asset/Auth/Supabase/dipendenze/workflow intatti; CSS limitato U6. Checkpoint atomico/push sul solo branch autorizzato e SHA remoto nella consegna. **U6 READY FOR REGIA REVIEW — STOP; U7/U8/U9 non avviate, nessun merge/main/deploy/Pages.**

## UI V2.1 — U7 (2026-11-12)

Autorizzata U7 da U6 approvata `6f8a28a4fe49875dc499872454d5128b2860bdfc`, branch `codex/ui-v2-integration`. Dashboard confermati read-only (selezione non apre draft), Edit esplicito, Composer rail/inspector/tray da store M2 e cinque stati Compare veri. Coordinator condiviso con shell U6 tramite un argomento, guard New/View/Edit/Copy/Cancel con rivalidazione e consenso singolo; nessuna Promise su discard o mutazione fisica. Shortcuts locali con esclusione input/dialoghi e operazioni valide; niente Space globale aggiuntivo. Side View originale, UUID slot e M3 prenotazioni/riconciliazione preservati.

254Node,9Python,build/canonico/invarianti,M1,Side View,Projects M2,lifecycle,U6/U5 regression,5gruppi U7/sette viewport,Runtime nativo storico/trusted mouse+touch e native-checkpoint4treni+Composer PASS. Bundle `8e6f7628c2b78fc4eb1abe6ef00ca99929ee66aae6d17cc5ac0163499c89ca6b`. Runtime esteso480frame/929662,7ms (~0,515fps SwiftShader): non prova hardware né confronto prestazionale. Matrici, errori/recuperi e limiti nel [rapporto U7](docs/_active/ui-v21/U7_REPORT.md), [risultati](docs/_active/ui-v21/evidence/U7/results.json).

Domini M2/M3, catalogo/geometria/R1/dispatcher/topologia, app/Auth/Supabase/asset/dipendenze/workflow invariati; CSS soltanto U7. Checkpoint atomico e push normale sul solo branch autorizzato, SHA remoto nella consegna. **U7 READY FOR REGIA REVIEW — STOP; U8/U9 non avviate, nessun merge/main/deploy/Pages.**

## UI V2.1 — U8 Depot Virtuale M3 (2026-11-12)

Autorizzata esclusivamente U8 da U7 approvata `cca11fb76d36e9688f41392fa1592b9a3514dce9`, branch `codex/ui-v2-integration`; ingresso locale/upstream/remoto pulito e ancestry verificati, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` invariata. Depot V2.1 con Add/Assign originali, identità record/catalog/slot/physical distinte, Available/Reserved e notice vere; slot solo confermati compatibili/esclusivi. Release/Remove protetti dal coordinator condiviso Shell/Projects con snapshot/assignment/generation rivalidati e consenso unico; callback successivo alla mutazione. Physical stock read-only, detached sui binari, trasferimenti solo targhe informative; nessuna nuova persistenza.

254Node,9Python,build/canonico/invarianti,6gruppi U8/sette viewport,6controlli intenti obsoleti,Depot storico9gruppi,lifecycle25cicli,U7/U5,U6 recuperata e U2 PASS. RAF nativo finale6gruppi/3treni in movimento con input trusted mouse/touch;99frame/120978,5ms (~0,810fps SwiftShader) senza pretesa hardware. Bundle finale `de724284586912053126bada325953c4d86c089085c5a4dfbd369efbceb324f7`. [Rapporto](docs/_active/ui-v21/U8_REPORT.md), [risultati](docs/_active/ui-v21/evidence/U8/results.json), [comandi](docs/_active/ui-v21/evidence/U8/commands-final.json). Distinte le regressioni pre-etichette/focus e quelle sul bundle finale; failure fixture U6 conservato e recuperato con Edit esplicito U7/attesa focus, nessuna asserzione di dominio indebolita.

Solo4file applicativi autorizzati:Depot view,wiring singolo guard TM,etichette opzionali per-request coordinator e CSS append-only scoped. Domini M2/M3,Projects view,Side View,catalogo,R1/dispatcher/topologia/geometria/asset,app/Auth/Supabase/deps/workflow intatti. NOT VERIFIED:hardware/fluidità/audio,screen reader,altri browser,OAuth remoto,prompt beforeunload nativo,U9/release completa. Matrici estese immutate U3/U4/R1 riusate come PASS storici. Checkpoint atomico e push normale sul solo branch autorizzato, SHA locale/remoto verificato nella consegna; nessun main/merge/deploy/Pages. **U8 READY FOR REGIA REVIEW — STOP; prossima attività esclusivamente review indipendente Regia. U9 non avviata.**


## UI V2.1 — U9 + recovery U9-HDR (2026-11-12)

Autorizzata esclusivamente U9 da U8 approvata `30c56aa28e60ce83fe0cbb36209006752325bea8`, poi specifica correzione Regia della targa Autumn Railways. Recuperato checkout/lavoro/evidenze senza riavviare U9 o perdere modifiche. Sette file applicativi di sola presentazione: sei moduli vista/shell e appendice integration. Targa originale Claude con geometria finale/viti/maple/Federo400, readout throttle, menu View, ARIA, leggibilità/focus/motion; nessuna modifica R1/dispatcher/layout/catalogo/M2/M3/Auth/Supabase/asset/frozen/workflow/deps.

**READY WITH DOCUMENTED LIMITATIONS; approvazione indipendente Regia PENDING.**254Node,9Python,build/canonico,111catture definitive/7viewport,6axe scansioni senza violazioni,header prima/dopo5viewport,66controlli/31schermate/A01–A13,RAF nativo sul bundle finale,regressioni e cleanup PASS. Evidenze storiche/nuove/non rieseguite distinte; nessuna asserzione ferroviaria indebolita. [Rapporto](docs/_active/ui-v21/U9_REPORT.md),[risultati](docs/_active/ui-v21/evidence/U9/results.json),[comandi](docs/_active/ui-v21/evidence/U9/commands.json),[recovery](docs/_active/ui-v21/evidence/U9/recovery-state.json).

REL-001 confermato: Pages omette `ui/`; futura release bloccata, workflow intatto. NOT VERIFIED hardware/FPS/screen reader/audio/altri browser/OAuth live/prompt beforeunload/zoom chrome/WCAG completa/package pubblicato. Commit atomico e checkpoint normale sul solo branch autorizzato, SHA completo e allineamento remoto nella consegna. Nessun merge/main/deploy/PR release/nuova fase. **STOP U9: unica prossima attività, review indipendente della Regia.**

## UI V2.1 — REL-001 Release Packaging Gate (2026-11-12)

U0–U9 APPROVATE nel mandato Regia; autorizzato soltanto REL-001 dal checkpoint `50d7c744e4b9dbbe20197ec8f959fdccb16edb5b`, locale/remoto coincidenti, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d`. Unica modifica workflow: nello step Prepare site, `cp -R dist assets ui _site/`. Sorgenti/UI/R1/M1/M2/M3/Auth/Supabase/asset/frozen/test/dipendenze intatti; bundle identico a U9.

PASS build Node22, preparazione reale da `_site` vuoto, chiusura83riferimenti,67file asset byte-identici,9CSS inclusi/5runtime caricati,3WOFF2+3OFL,6texture/sprite,79HTTP200,base `/SerieN/`,browser sul solo pacchetto con bootstrap Auth locale,zero richieste esterne/errori runtime. Targa Autumn Railways con brass/Federo effettivo e catture desktop/mobile ispezionate. Due timeout dell'harness conservati e recuperati senza modificare l'app. Misura finale include tutta docs/rapporto/evidenze; pacchetto e tar locale inferiori a1GiB,non committati. Matrice U9 non ripetuta; OAuth reale e pubblicazione NOT VERIFIED.

[REL001_REPORT](docs/_active/ui-v21/REL001_REPORT.md),[evidenze](docs/_active/ui-v21/evidence/REL001/). **READY FOR REGIA RELEASE REVIEW**, subordinato al checkpoint remoto verificato nella consegna; non è approvazione al rilascio. Commit atomico e push normale sul solo branch autorizzato. **STOP REL-001: unica prossima azione, review indipendente della Regia. Nessun merge/main/deploy/PR release/avvio manuale Pages o nuova fase.**


## UI V2.1 — REL-002 (2026-11-12)

REL001 approvato `06a01c5ae70bfd4147e2c866f06803139904f264`; autorizzata esclusivamente ottimizzazione packaging sul branch `codex/ui-v2-integration`. Solo Prepare site: pulizia controllata `_site` e whitelist esplicita di24documenti con chiusura transitiva pubblica. Nessun documento Git rimosso. 718.776.848→4.491.628byte (−99,375101%),97file,docs1.723.266byte,tar4.577.280byte.

Build e bundle U9 identico PASS;73file applicativi preservati,269identità U9 per riuso storico senza ripetere matrice ferroviaria.97HTTP200 incluse le79richieste REL001;3465esclusioni404attese;browser desktop1440×900/mobile390×844 con bootstrap Auth locale,Menu/Dock/WebGL/font/brass/targa e apertura documento pubblico PASS,zero errori runtime o richieste esterne. Preparazioni con residui e destinazione assente identiche. OAuth/cloud/GPUfisica/Pages pubblicata NOT VERIFIED.

[REL002_REPORT](docs/_active/ui-v21/REL002_REPORT.md),[evidenze](docs/_active/ui-v21/evidence/REL002/). **READY FOR REGIA RELEASE REVIEW**, subordinato al checkpoint remoto verificato nella consegna;nessuna approvazione al rilascio implicita. **STOP REL002:review indipendente Regia;nessun merge/main/deploy/PRrelease/nuova fase.**


## UI V2.1 — release candidate pre-merge gate (2026-11-12)

U0–U9 e REL001/002 approvate dalla Regia; autorizzata soltanto preparazione PR DRAFT verso main, nessun merge/deploy. Checkpoint applicativo `29b55b40dfa37c51fae827bdf25ded94948a3a45`, main invariata `184cc9ba93a6b35493f365b2ffcb20ef0645963d`: 25 commit avanti/0 indietro, delta Git completo di 2.321 file e merge-tree senza conflitti. Consegna aggiunge soltanto un checkpoint documentale.

PASS Node22.23.5/npm ci, 254 Node, 9 Python, canonico senza diff, build, ricetta REL002 esatta e identità completa dei 97 file/4.491.628 byte. Bundle U9 identico, 269 identità sorgenti/test/asset, domini M2/M3/R1 e Auth preservati con adapter di presentazione approvati distinti. HTTP: 97 risposte200 e 3.470 esclusioni404 attese. Scansione di 1.758 nuovi blob Git senza candidati ai pattern di credenziali. Browser/ferrovia U9 e REL002 riusati per identità, non rieseguiti indiscriminatamente.

[Rapporto RC](docs/_active/ui-v21/RC_PREMERGE_REPORT.md), [evidenze](docs/_active/ui-v21/evidence/RC_PREMERGE/). **READY FOR REGIA MERGE REVIEW**, subordinato alla PR DRAFT e verifica HEAD/base nella consegna. NOT VERIFIED OAuth/cloud live, Pages pubblicata, hardware fisico e altri browser. Procedura post-deploy e rollback soltanto documentati. Il merge su main attiverà automaticamente Pages. **STOP dopo la PR: nessun auto-merge/merge/workflow_dispatch/deploy/nuova fase; serve autorizzazione esplicita Regia al merge.**
