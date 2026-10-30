# SerieN — Stato e ripresa

**5A, 5B, 5C e 5D concluse. 5E non iniziata. Nessun merge o deployment automatico.**

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

Branch di consegna: `performance/phase-5d`, derivato da `303525c`. Codice finale 5D: `e8d81d3`; chiusura documentale nel commit che aggiorna il rapporto 5D. `main` remoto a `f582b12` preservato; nessun merge o deployment. Non fare reset distruttivi del lavoro esistente.

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
