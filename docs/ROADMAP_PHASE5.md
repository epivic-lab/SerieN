# SerieN — Roadmap ufficiale Fase 5

Fonte: [Master Plan 1.0 dell'utente](phase-5a/REQUEST.md). Baseline applicativa: `618f538563aa7bd6497f6de3fba9744287b7ebb0`, v0.12. Questa roadmap definisce il lavoro futuro, non autorizza l'esecuzione automatica delle sottofasi successive.

## Governance

Ordine vincolante: **5A → 5B → 5C → 5D → 5E**. Ogni passaggio richiede una nuova istruzione esplicita dell'utente. 5A e 5B sono concluse; 5C è stata implementata e riesaminata su richiesta dell’utente, con gate di accettazione ancora da completare. Non iniziare 5D dalla lettura di questo documento.

Solo repository `epivic-lab/SerieN`; mai modificare `first`, `SerieN Control` o altri repository. Conservare geometria RailModeller/Kato, topologia, scambi, missioni e contratti. Niente gallerie, integrazioni con hardware o nuove funzionalità non richieste. Nessuna riscrittura generalizzata né dipendenza aggiunta senza motivazione. Nessuna scansione offensiva di servizi esterni.

Ogni intervento applicativo futuro deve riportare motivazione, impatto, rischio di regressione, test e rollback. Le correzioni funzionali richiedono un difetto dimostrato. Una vulnerabilità critica richiede segnalazione immediata; non autorizza espansioni indiscriminate fuori ambito.

## Stato

| Sottofase | Stato | Dipendenza / autorizzazione |
|---|---|---|
| 5A — Audit tecnico e Security Assessment | Completata; risultati e limiti in ENGINEERING_AUDIT.md | Sola analisi, test non distruttivi e documentazione |
| 5B — Refactoring architetturale | Completata; [report](REFACTORING_PHASE5B.md) | Commit di estrazione e comandi, caratterizzazione e regressioni browser |
| 5C — Affidabilità ferroviaria | Implementazione conclusa; gate completo non ancora dimostrato: [verifica indipendente](PHASE5C_FINAL_REVIEW.md) | Suite mirate verdi; lacune operative da chiudere prima dell’accettazione |
| 5D — Performance Optimization | Non iniziata | 5C accettata e nuova istruzione |
| 5E — Cybersecurity Hardening e stabilizzazione | Non iniziata | 5D accettata e nuova istruzione; possibili urgenze documentate separatamente |

## 5A — Audit tecnico e Security Assessment

Obiettivo: fotografare architettura, motore, rendering, risorse, superficie d'attacco, dipendenze, CI e test. Non modificare l'applicazione o il deployment.

Deliverable: [ENGINEERING_AUDIT.md](ENGINEERING_AUDIT.md), questa roadmap, [PROGRESS.md](../PROGRESS.md), prove riproducibili in [phase-5a](phase-5a/), commit documentale.

Accettazione: HEAD e stato iniziale identificati; analisi delle fasi 0–4; problemi classificati per evidenza/severità/probabilità/impatto; vulnerabilità distinte dai rischi; build e suite applicabili eseguite con esiti reali; file applicativi invariati; piano 5B–5E e percorso di ripresa. I difetti trovati non devono essere risolti per dichiarare concluso l'audit.

## 5B — Refactoring architetturale

Obiettivo: separare responsabilità e rendere testabili le parti di `app.js`, mantenendo il comportamento osservabile. Non cambiare framework o struttura delle cartelle per principio.

Sequenza proposta:
1. Estrarre un servizio puro per layout/posizioni/occupazione e stato dell'assistenza scambi (`app.js:454–487`), passando esplicitamente rete, flotta, carri sganciati e router. Lasciare al bootstrap scene, DOM e callback. Primo intervento raccomandato.
2. Definire contratti JSDoc per Train, Vehicle, Journey, Couplers, OccupiedRange e snapshot. Conservare `Journey`, `consistLayout` e dati canonici come fonti uniche.
3. Separare comandi della flotta da presentazione e missioni, un modulo e un commit per volta. Evitare doppie proprietà divergenti come `cars`/`carObjs` e ID/indici impliciti senza cambiare API pubbliche.
4. Rimuovere soltanto codice/import inutilizzati verificati; rendere esplicita la gestione degli errori e il ciclo di vita. Aggiungere test delle interfacce estratte.

Deliverable: moduli rifattorizzati, test di caratterizzazione e regressione, mappa delle dipendenze aggiornata, report e commit recuperabile.

Gate: stessi comandi e output validi; zero variazioni dei file canonici; suite Node/Python/build e browser operative; difetti 5A ancora riconoscibili e registrati, mai nascosti come comportamento corretto. Nessuna nuova dipendenza circolare. Rischio medio per i confini stato/UI; rollback tramite revert del singolo commit sul branch di lavoro, senza reset del lavoro altrui.

## 5C — Affidabilità dei comportamenti ferroviari

Obiettivo: consistenza nelle condizioni limite, senza inventare percorsi o occupazione.

Priorità:
1. Correggere R01: inviluppi e distanze coerenti anche quando i centri sono su segmenti adiacenti o rami diversi. Usare grafo/Journey e occupazione, distinguendo vicinanza geometrica da conflitto ferroviario. Test reale riprodotto in 5A deve diventare verde per la protezione.
2. Correggere R02: conservare il percorso del carro sganciato e proiettarne tutto l'ingombro attraverso i giunti, non soltanto sul segmento del centro.
3. Contratti numerici e operazioni atomiche: rifiutare input non finiti senza corrompere Journey/clock; testare fallimento del cambio modelli e del posizionamento diagnostico.
4. Matrice di regressione: tre anelli in due sensi, tutti gli ingressi degli otto scambi e WX310, quattro tronchini, entrambi i rami del runaround, composizioni corte/lunghe, collisioni frontali e inseguimenti, veicoli fermi e scambi in avvicinamento, inversione al terminale, aggancio in curva, veicolo attivo e consolle nascosta. Verificare posizione, ordine, identità, ingombri, minimappe e HUD.

Deliverable: suite operativa con casi limite, correzioni documentate e commit recuperabile. Gate: nessuna compenetrazione nota nei casi riprodotti; nessuna falsa connessione al diamante; scambi protetti anche dai corpi sganciati; zero vagoni duplicati/persi; risultati indipendenti dal frame rate nelle condizioni definite. Le dimensioni fisiche del plastico restano da certificare separatamente. Rischio alto per la simulazione: correzioni piccole, fixture prima della modifica, revert per singolo difetto.

## 5D — Performance Optimization

Obiettivo: misurare prima, poi ridurre costi CPU/GPU/allocazioni e aggiornamenti superflui, senza peggiorare sicurezza ferroviaria o qualità non concordata.

Baseline ripetibile: viewport e DPR fissati, stessa versione/browser/backend GPU, warmup e durata fissati, qualità Low/High/Cinema, giorno/notte, almeno tre ripetizioni. Separare modalità diagnostica, campionamento e rendering normale.

Matrice: scena equivalente senza treni (il runtime attuale assume almeno un treno; serve harness dedicato), un convoglio, tre simultanei, quattro con composizioni lunghe, HUD/scambi e Route attivi. Misurare frame time mediana/p95, CPU/profili, heap dove disponibile, contatori geometrie/texture/draw call, caricamento/cache e cicli reset/cambio qualità. Documentare cosa non si può misurare, soprattutto GPU fisica.

Candidati fondati sull'audit: riuso di vettori/quaternioni/colori, snapshot ferroviario unico per aggiornamento, invalidazione mirata dell'anteprima, cache di calcoli ripetuti. Valutare LOD/texture/instancing solo dopo profiling; non impoverire i modelli per ottenere un numero migliore.

Deliverable: misure iniziali, modifiche motivate, benchmark prima/dopo con stesse condizioni, regressioni e commit recuperabile. Gate: vantaggio misurato sul carico interessato, nessuna regressione oltre il budget stabilito dopo la baseline, geometria e comportamento invariati. Nessuna dichiarazione di FPS desktop da SwiftShader. Rischio medio: un'ottimizzazione per commit, confronti e rollback conservati.

## 5E — Cybersecurity Hardening e stabilizzazione

Obiettivo: ridurre i rischi reali dell'app statica e della catena di pubblicazione.

1. Ripetere audit dipendenze e credenziali; correggere eventuali vulnerabilità confermate. Non aggiornare solo perché una versione è vecchia.
2. Pin delle action a SHA verificati, permessi minimi per job e separazione build/deploy, preservando il deploy Pages esistente e la riproducibilità del lockfile. Verificare le impostazioni GitHub non osservabili in 5A quando disponibili.
3. CSP compatibile con sito attuale e origini asset. Considerare bootstrap inline con hash/nonce o file locale, `blob:` per planimetria e texture GLB, `data:` per icone. Testare realmente la policy. Una meta CSP non può fornire `frame-ancestors`; non simulare header non supportati da Pages. Trattare i documenti e la pagina legacy come risorse autonome.
4. Verificare flussi `innerHTML` e numerici senza dichiarare XSS inesistenti; mantenere `textContent` per dati. Validare asset e JSON in CI. Decidere esplicitamente la distribuzione della diagnostica, che oggi modifica solo la sessione locale e non è una backdoor server.
5. Test di errori runtime, asset mancanti/corrotti, perdita/ripristino WebGL, reset e lifecycle; documentare rischi residui e limiti.

Deliverable: assessment finale, controlli CI, policy e correzioni provate, regressione completa, versione stabile e commit. Gate: nessuna vulnerabilità critica nota irrisolta nel perimetro verificato; CSP effettivamente applicata senza rompere WebGL, GLB, miniature, blob e report; audit e build riproducibili. Non dichiarare immunità agli attacchi. Rischio medio/alto per CSP/deploy: verificare su artefatto/staging autorizzato prima di pubblicare, conservare workflow e versione di rollback.

## Recuperabilità e gate comuni

Leggere sempre `PROGRESS.md` e questa roadmap all'avvio. Controllare HEAD, branch, working tree e provenienza remota prima di ogni modifica. Una task cloud è già isolata: usare il checkout esistente, senza nuovi worktree salvo richiesta esplicita.

Per ogni blocco: test pertinenti → aggiornamento PROGRESS → commit piccolo. Mai sovrascrivere cambiamenti preesistenti. Registrare separatamente verificato automaticamente, osservato manualmente, sola ispezione e non verificato. Tenere note e comandi nel repository, non soltanto in chat.

Il commit 5A è locale e non attiva il deployment. La recuperabilità dopo perdita totale della macchina richiede un backup/esportazione o push del branch documentale autorizzato: una chat o un hash non trasferiscono gli oggetti Git. Nessuna pubblicazione o push è stato effettuato in 5A.
