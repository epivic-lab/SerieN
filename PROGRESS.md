# SerieN — Stato di avanzamento e ripresa

## Fase corrente

**5B in corso, autorizzata dall’utente. Primo blocco: estrazione delle viste ferroviarie pure.**

La [roadmap ufficiale](docs/ROADMAP_PHASE5.md) impone nuova istruzione esplicita dell'utente per ogni sottofase. 5B è autorizzata; 5C–5E non lo sono. Vietati interventi su `first`, `SerieN Control` e altri repository; nessuna pubblicazione o modifica al deployment autorizzata in 5A.

## Riferimenti Git

- Baseline applicativa stabile sottoposta ad audit: `618f538563aa7bd6497f6de3fba9744287b7ebb0`, v0.12.
- Branch iniziale: `work`, pulito. Branch di audit: `audit/phase-5a`.
- Checkpoint documentale 5A: il commit che introduce questo file insieme ad audit e roadmap. Identificarlo senza dipendere dalla chat: `git log -1 --format='%H %s' -- PROGRESS.md`.
- Nessun push e nessun deployment in 5A. `main` remoto non modificato da questa attività.

Un commit locale non sopravvive automaticamente alla perdita completa della macchina. Per ripresa fuori dal checkout occorre esportazione/backup o push del branch documentale autorizzato. Non promettere recupero remoto sulla sola base dell'hash. Il branch corrente consente recupero locale senza sovrascrivere lo stato applicativo stabile.

## Checkpoint 5B in corso

Branch `refactor/phase-5b`, da audit `b819864`. Estratti `layoutFor`, `vehiclePositions`, raccolta occupazione e assistenza scambi in `src/railway-state.js`; contratti JSDoc in `src/railway-types.js`. Confronto differenziale con oracle storico v0.12 su 180 stati, senza mutare Journey; build riuscita. R01/R02/R03 restano aperti per 5C. Nessun push o deployment. Checkpoint viste: `5a551f7`. Secondo blocco completato: comandi puri rispetto alla presentazione in `src/fleet-commands.js`, risultati espliciti per i fallimenti e test differenziali/identità dei carri. Eventi UI e missioni restano nel bootstrap; rimossi import/materiali inutilizzati, builder e PNG dimostrati invariati. Prossima attività: regressioni browser e documentazione finale 5B.

## Ultima attività completata

Audit della baseline con esecuzione di test e riproduzione non distruttiva di condizioni limite. Report: [ENGINEERING_AUDIT.md](docs/ENGINEERING_AUDIT.md).

File aggiunti nel checkpoint:

- `PROGRESS.md`.
- `docs/ROADMAP_PHASE5.md`.
- `docs/ENGINEERING_AUDIT.md`.
- `docs/phase-5a/`: richiesta originale, evidenze JSON/log e harness di audit Python/Node. Gli harness sono documentazione/test non distruttivi, non codice applicativo.

Nessun file applicativo, test preesistente, asset, lockfile o workflow modificato: [96 file non documentali confrontati byte per byte](docs/phase-5a/preservation.json). Build in `dist/` e bytecode Python sono output locali ignorati. Test browser e rigenerazione del grafo sono stati eseguiti su copia temporanea per conservare i vecchi report.

## Test effettivamente eseguiti

- 100 test Node passati; anche la ripetizione strumentata per coverage passa.
- 9 test Python JMRI passati.
- `npm run build` riuscita; quattro file canonici rigenerati fuori checkout e identici.
- Browser Fase 4 locale: PASS, inclusi animazioni, agganci, quattro terminali e viste responsive/High.
- Browser operativo Fase 0 locale: PASS per anelli bidirezionali, quarto treno/MRU, scambi/HUD, entrambi i rami runaround e arresti.
- Sito pubblico v0.12: HTTP 200, caricamento miniature e GLB Kenney senza errori di pagina o richieste fallite. Il precedente blocco di rete Pages non sussiste nel runtime pubblicato. Non è stata eseguita qui l'intera suite operativa sul sito remoto.
- `npm audit`: zero vulnerabilità note. Scanner offline limitato della storia: 310 blob testuali, zero pattern di credenziali trovati; nessuna garanzia universale.
- Probe locali: R01/R02/R03 riprodotti; dieci reset con contatori stabili (402 geometrie, 50 texture), senza prova generale di assenza di leak.

Coverage Node: 91,28% linee / 89,71% branch / 94,77% funzioni **solo dei moduli importati dalla suite**; non include entrypoint e vari moduli browser. GPU desktop/tablet reali non verificate. Nessun benchmark prima/dopo o ottimizzazione eseguiti.

## Problemi aperti e priorità

1. **R01 / P1:** conflitto tra mezzi lunghi con centri su segmenti adiacenti: la soglia cross-edge di 17 mm non copre l'ingombro. Browser diagnostico T47/T46: centri a 20 mm, entrambi ancora in moto. Stato limite costruito per la prova, non incidente d'uso ordinario. Da correggere in 5C.
2. **R02 / P1:** l'occupazione del carro sganciato viene tagliata al segmento del centro; manca l'adiacente pur attraversato dal corpo. Incompletezza dimostrata con moduli originali; non tutte le conseguenze sugli scambi sono state riprodotte. 5C.
3. **R03 / P2:** NaN accettato da Journey/FixedClock può corrompere lo stato interno. Non dimostrato come ingresso remoto sfruttabile. 5C.
4. **A01/A02 / P2:** stato e responsabilità accoppiati in `app.js`, contratti impliciti; prima estrazione pura in 5B.
5. **P01/P02 / P2:** allocazioni e calcoli ripetuti da profilare. SwiftShader lento nel campione; non estrapolare FPS desktop. 5D.
6. **S01/S02 / P2:** action a tag mobili, permessi workflow da restringere per job, CSP assente. Rischi preventivi, non compromissioni confermate. 5E.

Nessuna vulnerabilità critica confermata richiede una modifica applicativa urgente fuori ambito. La fedeltà metrologica dei WX310 e dei rotabili non è stata certificata dall'audit.

## Prossima attività raccomandata — checkpoint 5B

Completare le regressioni browser e il report di refactoring 5B; non iniziare 5C. I nuovi servizi sono stati verificati con test di confronto della baseline. Nessuna correzione R01/R02/R03 è stata introdotta.

## Riprendere in una sessione nuova

1. Leggere questo file, roadmap e audit, poi le istruzioni correnti dell'utente; l'ultima autorizzazione prevale.
2. Controllare `git status --short --branch`, `git log -3 --oneline` e ref di provenienza. Non resettare o cancellare modifiche preesistenti.
3. Usare `/workspace/SerieN`, checkout esistente: la task cloud è già isolata; nessun worktree salvo richiesta esplicita.
4. Nel checkpoint non restano modifiche tracked non committate. Verificare sempre; eventuali nuovi cambiamenti appartengono alla sessione corrente, non vanno rimossi automaticamente.
5. Ambiente osservato: Node 24.19, Python 3.12.14, Chromium 154 e Python Playwright 1.62; CI usa Node 22/Python 3.12. Seguire proxy e CA ereditati, mai esporre segreti o disabilitare verifiche TLS.
6. Per ripetere controlli usare i comandi dell'audit. Non lanciare generatori, screenshot o script di cattura miniature nel checkout senza controllarne gli output: alcuni modificano file tracked. Usare copia temporanea per i report browser esistenti. Gli script `docs/phase-5a/*` scrivono soltanto evidenze documentali e non correggono i problemi.
7. Prima di ogni blocco futuro: motivazione, rischio, test, rollback; poi verifica e commit piccolo. Non iniziare una sottofase successiva automaticamente.
