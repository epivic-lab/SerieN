# 6A.11 — Security hardening e gate avversario

**TECHNICAL PASS nel laboratorio a singolo broker; audit Regia PENDING.**
Il budget aggregato16 **FAIL con due broker:32 connessioni reali**. Questa modalità
non è supportata. Macrofase6A NON CHIUSA;6A.12/staging e6B NON AUTORIZZATE.

Base approvata6A.10 `de53ba702164428e3b76936dc9791dee4eb1697a`, branch esclusivo
`feature/train-management`, repository `epivic-lab/SerieN`,5novembre2026 UTC.
Checkout iniziale pulito, HEAD/remoto/ascendenza e contratti verificati; nessun
cambio branch, import main, reset, merge, rebase o force-push. R1 intoccabile
`348bfeff12c4005657098d89ea1d3c2ccdda9910`. Nessuna query Supabase reale o staging.
La direttiva6A.11 supera soltanto gli STOP storici delle microfasi precedenti.

## Prova integrata e conservazione

Eseguiti **185 controlli SQL O01–O14 e111 controlli integrati PASS**, più una
**diagnostica LIMITATION_REPRODUCED**, esclusa dai PASS. Non sono conteggi di test
storici: [risultati SQL](evidence/6A11/ownerless-sql.json),
[risultati HTTP/browser/SQL](evidence/6A11/results.json),
[log](evidence/6A11/integrated.txt), [sintesi](evidence/6A11/summary.json).
Una sintesi intermedia ereditava «second instance replay only»: classificazione
corretta senza alterare le assertion. Il runner finale emette direttamente
TECHNICAL_PASS_SINGLE_BROKER e il FAIL aggregato32/16.

La fixture unica parte con2utenti Auth legacy e2owner distinti,48righe applicative
in dieci tabelle non vuote,4snapshot/receipt e2head. Il runner riusa senza modifiche
seed e185 oracoli6A.10: manifest iniziale, cutover già approvato, eliminazione Auth,
clone strutturale/compatibilità, restore logico e14punti rollback DDL. Dopo il
cutover Auth0 in entrambi i database di fixture ancora attivi. Creazione privata
C/D ownerNULL senza Auth e senza revisioni inventate. Browser Chromium154.0.8037.57:
CryptoKey P-256 non esportabile in IndexedDB →HTTP loopback →ingresso UID10001
→socket privato660 →broker UID10002 →claim SQL COMMIT →LOGIN dispositivo/versione
con SCRAM/TLS CA+hostname →API dati COMMIT →verifica snapshot nel browser.
C esercita Save/Read/History/Receipt/Recover, D partecipa a pairing/letture/carico/
isolamento; Save D è verificato nel clone SQL ownerless, non spacciato per Save
browser. Reader/editor/owner reali; due browser e backend distinti per CAS.

[Zero Auth](evidence/6A11/zero-auth-proof.json) e manifest
[iniziale](evidence/6A11/manifest-before.json),
[dopo DDL](evidence/6A11/manifest-after-ddl.json),
[prima browser](evidence/6A11/manifest-before-browser.json),
[dopo browser](evidence/6A11/manifest-after-browser.json) provano uguaglianza
completa di tutte le48righe pubbliche originali e2head, non solo dei conteggi.
Payload, identity, digest, versioni, receipt result/auth context, timestamp e FK
storici conservati. Compatibilità A/B verificata su copia separata.

Per la corruzione nuova si **inserisce soltanto un nuovo orphan non confermato
C/revisione999**, copiando payload1 e digest errato. ReadSnapshot restituisce
422INTEGRITY_ERROR; head resta8 in quel test (poi9 dopo Save/browserSIGKILL) e nessuno snapshot/receipt confermato viene
aggiornato/eliminato o privato dei trigger. La riga di fault resta nella fixture
fino al suo cleanup. Questo è un guasto operatore, non una scrittura parziale API.
I vecchi test6A.6 di corruzione usano la propria fixture legacy separata, non il
percorso ownerless o la primaria nuova.

## Difetti dimostrati e hardening minimo

| ID | RED sul codice approvato | Causa e diff minimo | GREEN effettivo |
|---|---|---|---|
| D01 | Nonce array firmato nel lifecycle accettato202, jobAPPROVED→ACTIVATING | RegExp coerciva; richiedere `typeof nonce === 'string'` nel broker |403, jobAPPROVED, nessuna attivazione |
| D01b/c | Stesso array accettato200 nei prototipi6A.2/6A.6; pairing6A.6 crea1binding SQL e ReadHead passa | Identica causa; una guardia di tipo in ciascun gateway |3prove PASS:403/error-only, nessun nuovo binding; pairing valido e vera lettura SQL continuano a funzionare |
| D02 | JSON con chiave duplicata503 RETRYABLE_UNAVAILABLE | Eccezione del parser input classificata come guasto infrastrutturale; wrapper input→400, fatalUTF8 ingresso→400 |400INVALID_REQUEST anche duplicate decodificate, nonfinite, profondità, trailing, UTF8 invalido |
| D03 | Header parziale ancora aperto a7000ms nonostante headerTimeout5s | Node controllava deadline ogni30s; solo `connectionsCheckingInterval:250` sui due server |408: ingresso5215ms, socket privato5219ms; body incompleto408 a15226ms |

Prove [RED](evidence/6A11/defects-red.json), [GREEN](evidence/6A11/defects-green.json),
[legacy RED](evidence/6A11/legacy-nonce-red.json),
[legacy GREEN](evidence/6A11/legacy-nonce-green.json).
Il nonce malformato richiedeva comunque una firma/capacità o un job approvato:
nessuna prova di firma aggirata o accesso anonimo. D02 era già fail-closed sui dati,
ma classificava male l'errore. Pool, transport, lifecycle SQL, ACL, dipendenze,
migrazioni e contratti approvati sono invariati. Diff runtime totale:4file,
9righe aggiunte/8rimosse. Nessuna nuova funzionalità o coordinatore distribuito.

Problemi dell'harness distinti dai difetti: porta Docker riassegnata al restart
(H01, ora esplicita); chiusura transport omessa nelle prime due prove legacy
(H02, corretta in finally; successivo tentativo6A.6 esaurì disco, poi rieseguito
72/72); timestamp futuro121s divenuto valido durante il loop (H03, ora±300s).
[Provenienza](evidence/6A11/run-provenance.json),
[errore ambiente conservato](evidence/6A11/harness-disk-failure.txt).
Un successivo avvio broker125 era dovuto alle copie VFS orfane dei create falliti
(H04): inventario riferimenti e cleanup dei soli4layer attuali, senza toccare
immagini/layer referenziati o precedenti; run finale completo da fixture nuova.
Nessuno di questi tentativi è sommato ai PASS finali.

## Matrici e risultati delle regressioni

- [A01–A16: criteri originali, prove, stato SQL, livelli di diniego](6A11_SECURITY_MATRIX.md).
- [Carico/multiistanza, memoria, fault e recovery](6A11_LOAD_FAULT_RECOVERY.md).
- [Privilegi/threat model e inventario NOT VERIFIED](6A11_SECURITY_BOUNDARIES.md).
- [Regressioni e R0 P01–P18](6A11_REGRESSION_MATRIX.md).

Registri JSON: [difetti](evidence/6A11/defect-register.json),
[fault](evidence/6A11/fault-matrix.json),
[NOT VERIFIED](evidence/6A11/not-verified.json).

Tutte le regressioni richieste rieseguite: SQL6A.3=51,6A.4=45,6A.5=141,
SQL lifecycle6A.8=97; gateway6A.6=72 anche dopo la correzione finale;
broker6A.9=50; ownerless6A.10=185SQL+50E2E; capability6A.2=48HTTP+5browser;
adapter6A.4=12 e6A.5=25; npm=37unità file, Python/JMRI=9, build PASS.
Nessun totale artificiale fra unità eterogenee. I riepiloghi storici6A.9/10 non
vengono reinterpretati come misure del budget globale: la nuova prova lo fallisce.
[Registro machine-readable](evidence/6A11/regression-matrix.json).

Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`;
bundle SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`.
[Invarianti](evidence/6A11/invariants.json): tutti i file già tracciati nella base
immutati salvo4fix backend ePROGRESS/STATUS. R0/D09/D10/migrazioni intatti; nessuna
modifica topologia, motore, Journey, routing, WX310, guardie, HUD, console, asset,
UI o dipendenze. Matrice visuale/prestazionale R1 completa NOT VERIFIED.

## Limiti, riproduzione e checkpoint

Il pool rispetta16 solo per processo, non globalmente: due processi indipendenti
hanno aperto32connessioni reali. Non è un FAIL nascosto dentro un PASS aggregato.
La modalità supportata resta **un broker** con sostituzione sequenziale/fencing;
il launcher di laboratorio rifiuta `--replicas 2`. Non equivale a un lock globale
o a certificazione di un orchestratore. Multi-broker e hosting restano bloccati
fino a gate specifico; non è stato introdotto un nuovo servizio.

Crash host, perdita volume/secret store, DB-loss/PITR, Supabase/Supavisor gestito,
provisioning/costi/churn e browser diversi sono NOT VERIFIED. Riavviare processi
con volumi conservati non dimostra tali proprietà. PG17 isolato/tmpfs, dati
sintetici, sole CA pubbliche nelle evidenze; niente password/private key/token.
Il dump logico locale verificato è inventariato con hash, non pubblicato:
[manifest backup](evidence/6A11/backup-manifest.json).

Comandi e confini: [README harness](../../../tests/db/6A11/README.md).
Validatore sintetico chiuso6A.4–6A.5 invariato: **non è un serializer generale**.
Commit atomico contenente questo rapporto, push normale soltanto sul branch
approvato, confronto SHA locale/remoto e working tree pulito nella consegna.
**STOP6A.11** per audit indipendente Regia; macrofase6A non approvata da Codex.
