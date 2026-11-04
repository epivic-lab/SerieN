# 6A.2 — Rapporto alla Regia

**PASS tecnico del prototipo locale e dei controlli eseguiti. Approvazione indipendente PENDING; checkpoint remoto da verificare dopo commit/push nella consegna finale.** Non è certificazione del backend di produzione. 6A.3 non iniziata.

## Baseline e perimetro

Branch `feature/train-management`, working tree iniziale pulito; HEAD e remoto verificati con fetch/ls-remote a `4c90f1520ce6cd1cc7c1e9a538f819c135c45a82`, approvato dalla Regia. Ascendenza R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` confermata; main remoto invariato. AGENTS/PROGRESS/STATUS e contratti 6A.1 riletti prima delle modifiche. Nessuna riscrittura storia. L'autorizzazione corrente supera il vecchio gate6A.1 per il solo prototipo6A.2.

Implementazione in `prototypes/train-management/capability-gateway/`: protocollo browser/server, parser JSON rigoroso, listener locale/registry simulato, client laboratorio IndexedDB, suite HTTP e suite Chromium. Nessun import dal simulatore o nel suo bundle, nessuna dipendenza produttiva aggiunta. [Contratto/comandi](../../6A2_PROTOTYPE.md). Aggiornati gate AGENTS, PROGRESS, indice attivo e STATUS. Conservati immutati contratti/evidenze 6A.1.

## Evidenze e risultati effettivi

Node 24.19.0, Python 3.12.14; Chromium 154.0.8037.57 headless tramite Playwright già disponibile nell'ambiente. Non è stata installata una dipendenza dell'app. Gateway con socket effettivo127.0.0.1 su porta effimera; test su richiesteHTTP vere e Chromium reale, non solo ritorni booleani.

| Verifica / comando dalla root | Esito | Prove |
|---|---|---|
| `node prototypes/train-management/capability-gateway/security.test.js` | 44 PASS,0 FAIL,0 skip | [log](security.txt),[input/atteso/osservato per caso](security.json) |
| `node prototypes/train-management/capability-gateway/browser.test.js` | 5 scenariPASS in Chromium reale | [log](browser.txt),[osservazioni](browser.json) |
| `npm test` | PASS37 file,0 FAIL/skip; non si spaccia questo conteggio per220 nuovi subtest registrati | [npm-test.txt](npm-test.txt) |
| `python3 -m unittest discover -s tests -p 'jmri_audit_test.py'` | PASS9 test | [python-tests.txt](python-tests.txt) |
| `npm run build` | PASS, bundle identicoR1 | [build.txt](build.txt),[invariants.json](invariants.json) |
| `python3 docs/_active/train-management/evidence/6A2/verify-invariants.py` | PASS1400 file della baseline immutati fuori dai4 documenti di gate consentiti | [script](verify-invariants.py),[risultati](invariants.json) |

Per rigenerare JSON: prefissare la suite HTTP con `CAPABILITY_EVIDENCE=<percorso>` e la suite browser con `CAPABILITY_BROWSER_EVIDENCE=<percorso>`. I risultati salvano descrizioni degli input e codici/risposte osservati; i materiali crittografici effimeri restano in memoria e non vengono registrati. Il test browser espone solo public JWK/deviceId al pairing approvato, mai la private CryptoKey.

Negazioni verificate: firma falsa, body/metodo/path alterati, path non canonico, timestamp passato/futuro, audience/domain errati, replay nonce sequenziale e simultaneo, workspace/layout diversi, device ignoto/revocato/epoch precedente, scope insufficiente anche se il body dichiara owner, invito scaduto/alterato/consumato e key-substitution, fingerprint errato, race pairing, recovery replay/alterata, JSON malformato/duplicate keys anche escaped o nested/nonfinite/oltre2 MiB, Origin consentito senza capacità, Origin estraneo, preflight e Host-rebinding. Ogni caso negato controlla risposta esattamente `{error: DENIED}` senza contenuto protetto e invariabilità di valori/contatori di **entrambi** i workspace fixture. Firma creata prima della revoca e inviata dopo negata. Pairing simultaneo registra esattamente un successo; il body non eleva lo scope reader dell'invito. Recovery abilita una nuova chiave owner e disabilita la precedente; kit consumato non riutilizzabile.

Compatibilità firma: WebCrypto P-256 emette 64 byte P1363, Node verifica con ieee-p1363. Browser reale genera chiave non esportabile, tentativo export fallisce, IndexedDB conserva CryptoKey+identità, reload recupera chiave e firma con risposta 200; revoca successiva restituisce 403 senza dati. Cancellazione della chiave e reload producono missing senza fallback unsigned. Non è una simulazione Node presentata come browser.

Tentativi iniziali: listener senza permesso rete dell'esecutore falliva EPERM; rieseguito con accesso rete supportato, senza wildcard o tunnel. Il primo test Host usava fetch, che ignorava l'override Host e inviava il valore legittimo: sostituito con HTTP grezzo, ora il gateway restituisce 403 al vero Host falsificato. Non è stato aggirato un test: il nuovo input è quello richiesto dall'oracolo. Dopo correzione, suite completa HTTP/browser rieseguita sul codice finale con esiti sopra.

## Invarianti e sicurezza

SHA256 canonico `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; bundle `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`, entrambi R1. App/motore/routing/Journey/guardia/collisioni/mesh150/bed75, otto scambi, tre anelli, console/HUD/minimappe/effetti/camera/5D invariati per identità; suite R1 applicabili correnti PASS. Nessuna nuova misura di prestazioni/GPU o collaudo browser integrato del simulatore: NOT VERIFIED, non dichiarato necessario per effetto di una modifica runtime inesistente.

Zero chiamate Supabase, zero credenziali reali, zero migrazioni/Auth/RLS/grants/EdgeFunction/config Pages. Registry/kit/token sono soltanto dati fixture effimeri; scan bounded dei pattern credenziali e isolamento import PASS. Statiche di laboratorio pubbliche senza dati del registry; letture/scritture private entrambe firmate. CORS non autorizza. Startup loopback-only, flag CLI obbligatorio, nessun adattatore produzione. L'impossibilità che qualcuno modifichi/copii/tunnelli il prototipo non è garantita.

## Tracciabilità R0 e limiti

La Regia ha fornito i18criteri originali R0.13 durante6A.2. [Matrice originale→scenari6A.1](../../R0_ACCEPTANCE_MAPPING.md), senza rinumerazioni. Coperture parziali identificate: eventi spurii hydrate, variante10 min, tripla capture/hydrate/capture, due-tab+journal, reconnect backlog/backoff, scadenza grant device, budget throughput, asset switch live e ricovero fisico occupato. Sono backlog progettuale con fasi assegnate; nessun test funzionale6B–6E avviato.

NOT VERIFIED: DB/transazioni/RLS/pool/ownership effettiva, revoca distribuita e fault tra processi, durabilità dopo restart, quote/rate/DoS produttivi, TLS reale, rotazione a due fasi, recovery kit offline definitivo, scadenza dei grant durevoli, Safari/Firefox/mobile, crashOS e persistenza disco. Registry solo memoria e sezione sincrona event-loop, non una transazioneDB. Recoverykit laboratorio scade10 min, non è il kit offline durevole6A.1. Nonce replay non è idempotenza request_id (ancora non implementata). XSS nello stesso origin può usare una privateKey non esportabile. Il limite2 MiB/10k nonce e timeout/maxconnessioni non certifica un budget di servizio. Questi limiti non sono FAIL dei test eseguiti, ma impediscono qualunque PASS produttivo.

## Checkpoint e STOP

Commit atomico identificabile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A2/REPORT.md`; SHA effettivo, fast-forward e coincidenza remoto nella consegna finale dopo push normale solo feature/train-management. Se il checkpoint fallisce, stato consegna BLOCKED. Nessuna PR/main/merge/deploy e nessuna 6A.3. **Unica prossima azione: audit Regia e autorizzazione esplicita 6A.3.**
