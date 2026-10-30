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

**Macrofase Scambi S0–S7: S0/S1/S2/S3 APPROVATE (glow B); S4 PAUSA / CHECKPOINT INTERMEDIO; S5 NON INIZIATA.** Le istruzioni operative sono `AGENTS.md`, `docs/_active/turnouts/SPEC_v3.md`, `docs/_active/turnouts/STATUS.md` e `docs/_active/turnouts/CODEX_START.txt`. Prima di S0 Codex verifica branch, working tree, 5D locale e test. L'utente approva **ogni singola sottofase** dopo report, prove e commit; S3 (glow) e S4 (frecce) richiedono approvazione estetica esplicita. Nessuna sottofase è autorizzata automaticamente dal merge di questi documenti.

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
