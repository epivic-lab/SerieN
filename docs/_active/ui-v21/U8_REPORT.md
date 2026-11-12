# U8 — Depot Virtuale, Inventory, Reservations & Physical Stock Separation

**U8 READY FOR REGIA REVIEW. STOP dopo U8; U9 non avviata.** I gate tecnici pertinenti passano; l'approvazione resta alla Regia.

Mandato [U8](evidence/U8/AUTHORIZATION_U8.md), branch esclusivo `codex/ui-v2-integration`, ingresso approvato U7 `cca11fb76d36e9688f41392fa1592b9a3514dce9`. HEAD/upstream/remoto coincidenti e tree iniziale pulito; U6 `6f8a28a4fe49875dc499872454d5128b2860bdfc` e main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` antenati verificati. Destinazione e main ricontrollate prima del checkpoint: [invarianti Git iniziali](evidence/U8/git-baseline.json). SHA completo del singolo commit e uguaglianza locale/remoto nella consegna, evitando un hash autoreferenziale nel commit.

## Comportamento consegnato

`src/depot-view.js` presenta inventario virtuale V2.1, catalog picker, Available/Reserved, record/code/modelId distinti, UUID slot M2 confermati, notice originali e lista fisica read-only con UUID/generation. Add e Assign riusano esclusivamente M3. Nessuno slot draft, target incompatibile o già occupato nelle opzioni; assenza di target spiegata con selezione/Assign disabilitati. Le due funzioni di trasferimento indisponibili sono targhe informative senza handler.

Release e Remove passano dal coordinator condiviso con Shell/Projects. Pending e Cancel non mutano nulla. Il consenso rivalida snapshot del record, stato, assegnazione originale, progetto/slot compatibile e generation; un contesto cambiato viene rifiutato. Il coordinator consuma pending prima di chiamare il callback, impedendo doppia esecuzione. `onChange` segue soltanto la mutazione riuscita. Reserved conserva Remove disabilitato e il rifiuto del dominio: nessun Release implicito. Cleanup annulla pending e listener; fallback locale posseduto solo nelle fixture standalone.

`src/train-management.js` cambia esclusivamente per passare `guard` a Depot. L'estensione minima di `src/ui/guard-modal.js` consente titolo ed etichette per richiesta, ripristinando i default quando omessi: evita di presentare un consenso Depot con il testo di discard del draft. La logica sincrona, validazione, settlement, focus ed Escape del coordinator rimangono intatte. Depot ripristina il controllo disponibile o il corrispondente Assign/Release; dopo una rimozione torna ad Add.

`ui/css/serien-ui-integration.css` aggiunge soltanto regole `.u8-depot`: enamel/brass, font locali, card, notices, slot/physical separation, focus e target di almeno 44px. Il prefisso U2–U7 è identico. Nessuno script/store/mock della reference nel bundle; stylesheet order e design frozen invariati.

I due nuovi test sono `tests/browser-ui-v21-U8.py` (produzione/DOM e stato R1 reale) e `tests/browser-ui-v21-U8-intents.py` (real store M2/M3 e consensi obsoleti, senza pretesa di simulazione ferroviaria). Mapping e matrici: [DOM/callback](evidence/U8/mapping.json), [guard](evidence/U8/guard-matrix.json), [prenotazioni UUID](evidence/U8/reservation-matrix.json), [separazione fisica](evidence/U8/physical-separation.json).

## PASS eseguiti e provenienza

| Prova | Esito / evidenza |
| --- | --- |
| Node | 254/254, incluso `depot-inventory.test.js`; [log](evidence/U8/tests/node.txt) |
| Python | 9/9; [log](evidence/U8/tests/python.txt) |
| Build produttiva finale | exit0; [log](evidence/U8/tests/build-final.txt), [metafile](evidence/U8/metafile-final.json) |
| Canonico | 70 nodi,75 archi,1 componente,cycleRank6,4 terminali; nessun diff del layout; [log](evidence/U8/tests/canonical.txt) |
| U8 finale | 6 gruppi: Add/duplicati, confirmed-only/exclusive Assign, Release/Remove protetti, UUID reconciliation, detached/reset/session, viewport/dispose; [risultati](evidence/U8/delivery/results.json) |
| Intenti obsoleti | Available→Reserved, nuova assegnazione same-model/new UUID, generation cambiata rifiutati; doppio consenso una mutazione/un callback; dispose conservativo; [risultati](evidence/U8/intents/results.json) |
| RAF nativo finale | 6 gruppi,3 treni in movimento, input trusted mouse/touch e conferma mouse; nessun override RAF/step manuale; [risultati](evidence/U8/runtime-final-adapted/result.json), [frame](evidence/U8/runtime-final-adapted/frames.json) |
| Regressione U2 finale | 10 gruppi, coordinator/default/logout/reset/session/focus; [risultati](evidence/U8/U2-smoke/result.json) |
| Regressione U6 finale recuperata | 6 gruppi, shell/session/keyboard/reset/STALE/cleanup; [risultati](evidence/U8/U6-recovered-adapted/results.json) |
| Depot storico rieseguito | 9 gruppi; [risultati](evidence/U8/depot-adapted/result.json) |
| Lifecycle storico rieseguito | 25 cicli create/open/add/dispose senza residui osservabili; [risultati](evidence/U8/lifecycle-adapted/result.json) |
| U7 rieseguita | 5 gruppi Composer/Compare e reservations; [risultati](evidence/U8/U7-adapted/results.json) |
| U5 rieseguita | 8 gruppi,4 treni/reset/generation/session; [risultati](evidence/U8/U5-adapted/results.json) |

Bundle finale SHA-256 `de724284586912053126bada325953c4d86c089085c5a4dfbd369efbceb324f7`, identico fra build, acceptance U8, native finale e U6 recuperata. Depot/U7/U5 rieseguiti usavano il bundle precedente `e70eb73532bf02dd3cbfd220a9d431c37efed1820d85b3585d16315fd0228f8c`, prima delle sole etichette guard e fallback focus; non vengono spacciati per esecuzioni del bundle finale. U8/native/U6/U2 e intents verificano il comportamento finale pertinente. Node/Python/canonico precedono quelle due correzioni di presentazione; sorgenti dei domini invariati.

Le suite originali restano intatte. [Adapter riproducibile](evidence/U8/run-adapted.py): fornisce il consenso custom richiesto al posto delle vecchie operazioni immediate, verifica le targhe non interattive al posto dei pulsanti transfer disabilitati; U6 usa Edit esplicito U7 e attende l'evento nativo di focus. Le asserzioni di dominio non sono indebolite. Nel runtime i comandi principali e il consenso sono eventi CDP trusted, non semplice `.click()` JavaScript. Avviare il server locale sulla porta8035 e creare `work/` per le fixture storiche, poi usare i comandi registrati. [Comandi/exit code](evidence/U8/commands-final.json), [runner generale](evidence/U8/run-checks.py).

## Identità, reset e stato fisico

I test preservano la distinzione catalog model / record M3 / project vehicleId / physical UUID. I duplicati condividono modelId e hanno ID/codici propri. Assign usa esclusivamente slot confermati compatibili liberi; il dominio rifiuta modelId errato, slot occupato e record già prenotato. Draft/Cancel non rilasciano prenotazioni confermate. Riordino/nome/orientamento dello stesso UUID le mantengono; replacement stesso modello/new UUID non le eredita, con notice effettiva originale.

La prova deterministica confronta l'intero railwayState prima/dopo le operazioni virtuali con simulazione in pausa; l'uncouple e il Reset successivi sono esplicite operazioni R1 originali. Reset cambia generation/riferimenti fisici e annulla il pending, conservando record e prenotazioni compatibili. Close/reopen conserva gli stessi dati in RAM; nessuna persistenza aggiunta.

Nel gate RAF nativo, tre treni avanzano realmente. Le identità fisiche e le strutture rimangono coerenti mentre le coordinate progrediscono tramite il motore originale e la scena segue. Uncouple/recouple originali conservano la stessa identità del vagone detached; nessun record Depot viene generato o trasferito. Zero pageerrors/consoleErrors/failedRequests/httpFailures/contextLost nel gate finale. Il campione SwiftShader di99frame/120978,5ms (~0,810fps) documenta sincronizzazione funzionale; non misura fluidità hardware né prestazioni comparative.

## Evidenza visiva e invarianti

[Delivery](evidence/U8/delivery/) contiene empty, Available duplicati/no-compatible-slot, draft-only, Reserved, Release pending/confirmed, Remove pending/Cancel, dirty draft con riserve intatte, notice e detached-on-track. Le coppie `1920/1440/1280/1024/820/768/390-depot.png` e `*-physical.png` coprono tutti i sette viewport richiesti. Le immagini sono catture della finestra ai due estremi dello scroll, non un'unica composizione artificiale della pagina lunga. Le asserzioni verificano assenza di overflow orizzontale nel dialogo, target≥44px e assenza di comandi nelle sezioni fisiche/planned/transfer. Ispezionate direttamente anche390-depot,1440-physical e Remove pending: impaginazione leggibile, scroll interno e gerarchia dei consensi visibili. Font locali invariati, nessuna nuova richiesta esterna per U8.

[Manifest hash sorgenti](evidence/U8/source-hashes.json) e [verifica](evidence/U8/verify.py) attestano identità dei file protetti rispetto a U7: `depot-inventory.js`, `train-projects.js`, `train-projects-view.js`, `train-side-layout.js`, catalogo, motore/dispatcher R1, layout/topologia/geometria/150 rail meshes, asset, app/index/Auth, dipendenze e workflow. Un solo argomento aggiunto al wiring TM; CSS append-only scoped. Nessun secondo inventario, nessun cambio a `projectSlots`/`reconcile`, nessuna mutazione backend/Auth/Supabase/RLS, nuova persistenza o trasferimento. Dati dinamici resi con textContent; nessuna credenziale aggiunta. [Invarianti](evidence/U8/invariants.json).

## Failure, storico e limiti

**Nessun FAIL irrisolto.** [Failure/recovery](evidence/U8/failure-recovery.json) conserva il timeout U6 originale (fixture incompatibile con la selezione read-only approvata U7) e il successivo PASS con Edit esplicito e attesa focus; non è stata modificata la logica di prodotto per aggirarlo. Recuperati anche disponibilità dell'ambiente/server locale. La prima verifica UI ha motivato etichette guard specifiche e focus fallback, poi verificati nel bundle finale. Log/failure iniziali preservati, nessun reset/clean distruttivo; scratch di questa sessione spostato fuori dal repository prima del commit.

**PASS storici riutilizzati:** matrici estese camera/sidebar/mission/turnout U3/U4 e certificazione estesa R1 già approvate; file/contratti invariati, non nuove esecuzioni. Nessuna copia integrale degli archivi U2–U7: le sottocartelle U2/U5/U6/U7 qui contengono output delle nuove regressioni U8.

**NOT VERIFIED:** hardware fisico GPU/tablet/touch/tastiera/audio, fluidità, screen reader, browser diversi da Chromium, OAuth/provider remoto, presentazione nativa beforeunload (handler coperto sinteticamente), U9 e certificazione della futura release completa.

Nessun merge/main/deploy/Pages, rebase o force-push. Unica prossima attività: review indipendente Regia; U9 richiede nuova autorizzazione esplicita.
