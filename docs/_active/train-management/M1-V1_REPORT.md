# M1-V1 — Final Runtime Gate

**M1-V1 PASS CON LIMITI**

Le verifiche funzionali con rendering continuo sono riuscite. **La fluidità su GPU reale non è validata:** il worker espone SwiftShader e il rendering software osservato è molto lento, circa **0,4–0,6 frame/s in Low**, quindi non fluido. Questo esito non certifica le prestazioni su desktop o tablet fisici.

## Baseline e metodo

Branch `codex/train-management-m1`, HEAD locale/remoto iniziale pulito `318aaf89da5a5a12e249c2d5c72d5252c4fb3431`, come richiesto. Regia: M1 e M1.1 approvate per la verifica conclusiva.

Eseguita soltanto la nuova verifica runtime mirata e `npm run build`; suite Node/Python e browser già superate **non ripetute**. Build reale `dist/game.js`, minificata da esbuild, hash ricostruito e servito identico a M1.1:

`e64d3efc7915456a33ce6c539afa298c577623d49fffea0e12438ded7a13222c`

Il test carica lo stesso DOM/CSS del simulatore da un HTML scratch, avviando direttamente il bundle originale. Non carica né modifica l'autenticazione, esclusa da questa verifica, e non contatta Supabase. Nessuna route di sostituzione del bundle, nessun bundle leggibile, nessuna intercettazione di RAF/cancelRAF/tick/render, nessun clock sostituito, nessun passo ferroviario manuale e nessuna pausa globale. Le variazioni di velocità usano gli input delle console; per l'aggancio si ferma soltanto il treno interessato.

Un osservatore aggiunge il proprio callback RAF attraverso la funzione nativa, senza sostituirla. Identità della funzione e stringa `[native code]` verificate ai checkpoint; timestamp grezzi, posizioni ferroviarie/mesh, identità dei rotabili e contatori sono salvati. Sono registrati 14 checkpoint e 690 osservazioni RAF nelle tre sessioni (316/128/246). Gli screenshot della scena prima/dopo differiscono e le distanze percorse aumentano anche a pannello aperto.

## Risultati

| Controllo | Esito e prova |
| --- | --- |
| Apertura/chiusura con tre treni in movimento | **PASS**, tre cicli completi; tutti e tre avanzano nei checkpoint aperti e chiusi. |
| Continuità/stabilità del rendering | **PASS osservazionale**: RAF nativo, scena in evoluzione, 348 geometrie e 44 texture in tutti i checkpoint; contesto WebGL attivo al controllo finale. Non è una certificazione universale dei leak. |
| Fluidità | **LIMITATA / hardware NOT VERIFIED**: SwiftShader 0,4–0,6 frame/s, insufficiente per definire fluida la resa software. Nessuna prova equivalente su GPU fisica disponibile. |
| Sincronizzazione composizioni/vista laterale/console/scena | **PASS**, selezioni 0/1/2/0; identità e ordine coerenti, offset da consistLayout, marker console coincidenti con le posizioni 3D, focus camera esistente operativo. |
| Aggancio e sgancio | **PASS**, comandi reali della console, pannello aperto, altri due treni in movimento; identità del carro sganciato conservata e sequenza completa ripristinata al riaggancio. Invio dell'evento del pulsante esistente per verificare l'aggiornamento mentre il dialog è aperto; nessuna mutazione diretta della flotta. |
| Zoom/Fit/scorrimento desktop | **PASS**, viewport 1280×1000, zoom 400%, scorrimento e ripristino completo a Fit. |
| Zoom/Fit/scorrimento tablet | **PASS**, 1024×768 e 768×1024; swipe e tap Fit tramite input touch CDP, senza overflow esterno, con tre treni ancora in movimento. Touch fisico non verificato. |
| Regressioni nei flussi verificati | **PASS**, ritorno dal catalogo di 14 modelli al dettaglio corrente, selezione, chiusura e ritorno focus, scene/console coerenti. Nessuna pretesa di ripetere tutte le suite storiche. |
| Errori e richieste | **PASS**, zero errori JavaScript/console, richieste fallite e risposte HTTP ≥400 nelle tre sessioni osservate. |

## GPU e tempi osservati

Chromium 154.0.8037.57, headless, lancio standard con il solo argomento esplicito `--no-sandbox`; renderer effettivo **ANGLE / Vulkan / SwiftShader Device (Subzero)**. Il probe predefinito e quello con abilitazione software esplicita restituiscono entrambi SwiftShader; `/dev/dri`, `/dev/nvidia0` e `/sys/class/drm` non sono esposti nel worker. Nessuna accelerazione grafica fisica verificabile con gli strumenti disponibili. Tutte le prove runtime hanno usato il profilo Low dell'app tramite il suo comando esistente; Auto/High/Cinema non validati.

| Fase software | RAF osservati/s | Intervallo mediano | p95 |
| --- | ---: | ---: | ---: |
| Desktop chiuso, tre treni | 0,424 | 2333 ms | 2600 ms |
| Desktop aperto, primo ciclo | 0,401 | 2500 ms | 2633 ms |
| Desktop aperto, secondo/terzo ciclo | 0,460 / 0,438 | 2183 / 2283 ms | 2350 / 2450 ms |
| Aggancio/sgancio, altri due in movimento | 0,590 | 1700 ms | 1900 ms |
| Tablet, controlli e acquisizioni | 0,567 | 1750 ms | 2017 ms |

Sono tempi del flusso interattivo automatizzato, **comprese le acquisizioni**, non un benchmark isolato né una misura trasferibile a GPU fisiche. Lentezza e rallentamento percepito della simulazione nel worker sono reali. Non sono stati aggirati bloccando il rendering. La fluidità hardware resta il limite aperto da valutare dalla Regia prima di considerare il gate un PASS pieno.

## Provenienza delle sessioni

Sono conservati tutti i risultati originali, inclusi gli arresti del solo harness:

1. [Sessione 1](evidence/M1-V1/session-1/result.json): desktop e tre cicli riusciti; poi una chiamata Python a `wait_for_function` con argomento posizionale anziché keyword ha arrestato il test prima della verifica dell'aggancio. Non è un errore JavaScript del simulatore.
2. [Sessione 2](evidence/M1-V1/session-2/result.json): corretto il test e riprese soltanto le verifiche mancanti; aggancio/sgancio riusciti, poi una variabile del test definita nel ramo desktop è risultata fuori scope nella ripresa tablet.
3. [Sessione 3](evidence/M1-V1/session-3/result.json): corretto lo scope; riutilizzate soltanto le verifiche già documentate sullo stesso hash; completati tablet touch, catalogo e movimento finale. Gli stati BLOCKED dei primi due file descrivono tali eccezioni Python e sono conservati senza riscriverli. L'esito conclusivo aggregato è in [summary.json](evidence/M1-V1/summary.json).

Tutte e tre le sessioni hanno usato il rendering continuo nativo. Le riprese hanno avviato l'app nel viewport compatto, che sceglie Low, poi ridimensionato ai viewport di prova; nessuna soppressione di frame. I percorsi work/ nei risultati sono quelli originali; le copie permanenti sono session-1/2/3 qui sopra.

## Evidenze e riproduzione

- [Desktop con tre treni in movimento](evidence/M1-V1/session-1/desktop-three-moving.png).
- [Scena prima](evidence/M1-V1/session-1/scene-before.png) / [dopo](evidence/M1-V1/session-1/scene-after.png).
- [Tablet landscape](evidence/M1-V1/session-3/tablet-landscape.png) e [portrait](evidence/M1-V1/session-3/tablet-portrait.png), ispezionati visivamente.
- [GPU](evidence/M1-V1/gpu.json), [build](evidence/M1-V1/build.txt), [invarianti/hash](evidence/M1-V1/invariants.json), timestamp RAF e log nelle cartelle di sessione.

Il probe GPU è riproducibile con `python3 tests/probe-train-management-gpu.py` e registra anche le funzionalità dichiarate da Chromium.

Dalla root, server locale `python3 -m http.server 8000`, poi `python3 tests/browser-train-management-runtime.py` sulla build minificata. Lo script corretto esegue il flusso completo e restituisce exit code 1 se BLOCKED; `M1_V1_RESUME_FROM` consente di riutilizzare verifiche registrate solo se l'hash del bundle coincide. Il worker software può richiedere molti minuti. Nessun test su rendering fermato vale come prova di questo gate.

## Perimetro e checkpoint

**Nessuna modifica al prodotto:** app.js, UI, vista laterale, asset, motore R1, collisioni/occupazione/aggancio/router, layout, Supabase e autenticazione byte-identici al checkpoint atteso. Modificati soltanto nuovo script di verifica, rapporti/stato ed evidenze. Nessun merge/deploy, nessun M2/M3.

Commit documentale/test atomico: quello che introduce questo rapporto (`git log -1 --format=%H -- docs/_active/train-management/M1-V1_REPORT.md`). SHA effettivo e checkpoint remoto nella consegna, stessa Draft PR #3. **STOP dopo il rapporto; unica prossima azione: review della Regia.**
