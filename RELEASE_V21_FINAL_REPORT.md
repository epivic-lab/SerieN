# SerieN UI V2.1 — rapporto operativo finale

**Verdetto Quality Gate Owner: RELEASED — ACCEPTANCE PENDING.** La release è pubblicata e i due processi automatici sono riusciti. Restano obbligatorie l'autenticazione Google reale e l'accettazione funzionale autenticata sulla URL pubblica. Queste prove non sono state simulate né dichiarate PASS.

Data: **12 novembre 2026, Europe/Rome (CET, UTC+1)**. Merge alle **16:38:35 CET**; Pages riuscito alle **16:39:41 CET**; processo Supabase conclusivo osservato alle **16:40:45 CET**. I timestamp dei file di evidenza sono UTC. Versione di prodotto **UI V2.1**; la versione tecnica preesistente `0.12.0` del package/bundle è conservata.

## 1. Merge e autorizzazione

| Dato | Risultato verificato |
| --- | --- |
| Repository / PR | [epivic-lab/SerieN — PR #6](https://github.com/epivic-lab/SerieN/pull/6) |
| Main prima | `184cc9ba93a6b35493f365b2ffcb20ef0645963d` |
| HEAD candidata autorizzata | `d99e4be117f4838ee6c149ad5c158f8688c40754` |
| Main dopo / merge commit | **`d77b8aa2710fa474fdb069b204705364b4a9e7e6`** |
| Parent 1 / parent 2 | Main prima / HEAD candidata, esattamente nell'ordine sopra |
| Albero del merge e della candidata | `6e6703a6fac31aa58d076d81682ed2463847a32a` — identico |
| Metodo / stato | Merge commit; PR `closed`, `merged=true`, `draft=false` |

**Nuove verifiche:** working tree iniziale pulito; main e HEAD remote coincidenti con il mandato; 26 commit avanti e zero indietro; 2.354 percorsi modificati; main antenata; merge-tree senza conflitti. Il commit finale della candidata aggiunge soltanto 35 file documentali rispetto a REL-002. Supabase, Auth client, package/lock e workflow Supabase invariati; 269 identità U9 confermate. Nuova build locale Node24.19.0 e preparazione reale del pacchetto: tutti i 97 hash uguali a REL-002. Le precedenti suite locali 254 Node / 9 Python sono state inizialmente riusate per identità, senza ripetizione indiscriminata.

Il mandato allegato autorizza Ready, merge e deployment. La PR è stata portata Ready. La revisione automatica ha inizialmente rifiutato il merge perché dichiarava assente un'autorizzazione attendibile in chat per merge e relativi deployment. L'utente ha quindi confermato esplicitamente **«Confermo merge commit e deployment automatici»** sulla domanda contenente PR e SHA esatti. Dopo una nuova verifica delle baseline immutate, il merge è riuscito mediante lo stesso strumento autorizzato. Nessun aggiramento o percorso di push alternativo.

Evidenze nuove: [preflight](docs/releases/V2.1/evidence/preflight.json), [merge](docs/releases/V2.1/evidence/merge.json). Il precedente STOP pre-merge è superato dal mandato e dalla conferma; i rapporti storici restano intatti.

## 2. GitHub Pages e integrità pubblica

Workflow `.github/workflows/pages.yml`, **Deploy SerieN to GitHub Pages**. [Run automatico **43250016350**](https://github.com/epivic-lab/SerieN/actions/runs/43250016350), evento `push`, branch `main`, SHA esatto `d77b8aa2710fa474fdb069b204705364b4a9e7e6`, primo tentativo, **SUCCESS**.

Installazione `npm ci`, canonico rigenerato senza differenze, **9 Python PASS**, **254 Node PASS / 0 fail / 0 skipped**, build, Prepare site REL-002, upload e deploy: tutti SUCCESS nei log del nuovo run remoto. Toolchain Actions: Node22.23.4 / Python3.12.16. Nessun workflow_dispatch, rerun o deploy manuale.

Artefatto `github-pages`: ID **13958513755**, ZIP **2.319.118 byte**, digest `sha256:8f588b5111ab72a45182ff956b0f9f00ccf5cd9be4a42705dd28bf853353d862`. È la dimensione compressa dell'upload, distinta dai byte dei file pubblici. I log di `actions/deploy-pages` riportano `pages_build_version` e ID deployment uguali allo SHA del merge, poi `Reported success!` e URL ambiente corretta. L'endpoint generico deployments non è esposto dal connettore: l'associazione è verificata tramite payload/log del deploy e hash pubblici, non dedotta dal solo titolo del run.

URL: **https://epivic-lab.github.io/SerieN/**.

| Controllo pubblico — nuova esecuzione | Esito |
| --- | --- |
| Tutti i percorsi del manifest REL-002 | **97/97 HTTP200**, dimensioni e SHA256 esatti |
| Byte complessivi / documenti | **4.491.628 byte / 24 documenti** |
| Bundle `dist/game.js` | **1.088.369 byte** |
| SHA256 bundle | `11085af332a3636cb23e1bcca2b88d669dfd47942fedbff7c183203ce8b66bd2` |
| CSS, font/licenze, texture, sprite, GLB e documenti | Tutti inclusi nel confronto dei 97 hash |
| Archivi/sorgenti volutamente esclusi | **11/11 HTTP404 attesi**, percorsi registrati separatamente |

Le richieste usano query univoca, `Cache-Control: no-cache`, `Pragma: no-cache`, confronto del contenuto di rete e registrazione degli header CDN. Non si presume un MISS della CDN: l'hash esatto della risposta prova il contenuto servito anche in caso di HIT. Nessun fallback locale. Il confronto pre-merge dell'HTML pubblico coincideva con la main precedente; dopo il deploy l'intero manifest coincide con V2.1.

Le 3.470 esclusioni HTTP dello storico RC sono **prove locali riusate**, non 3.470 nuove richieste pubbliche. I 97 percorsi positivi sono stati tutti verificati ex novo; il controllo pubblico delle esclusioni è il campione esplicito di 11 percorsi.

Evidenze: [run, step, artefatto e deployment](docs/releases/V2.1/evidence/pages.json), [log Actions con email/query sensibili redatte](docs/releases/V2.1/evidence/pages-job.log.txt), [inventario completo pubblico e hash](docs/releases/V2.1/evidence/public-assets.json), [baseline pubblica precedente](docs/releases/V2.1/evidence/public-before.json).

## 3. Supabase production

Progetto **SerieN**, ref `vehfrjgifzjjgamrgwze`: **ACTIVE_HEALTHY** prima e dopo il processo. Configurazione GitHub Integration **USER_VERIFIED** nel mandato e in S3: repository SerieN, directory `.`, production branch `main`, deploy attivo, automatic branching disabilitato. Nessun toggle modificato.

**Processo realmente osservato:** workflow Supabase `97df5c95030348f5bb7ace0af2d16051`, branch produttivo `main`, record `e1607c94-3a6e-4b33-b49e-aa7438fc87bf`, dalle 15:39:45 alle 15:40:45 UTC. Log letti in sola lettura dalla sorgente `workflow_run_logs`:

1. Cloning git repo, `git_ref=main`.
2. Reading project config e Checking service health sul progetto corretto.
3. **Skipping configuration for protected branch**.
4. **All migrations are up to date**.
5. No buckets found; Skipping seed data for protected branch.
6. **No functions to deploy**.

Il nuovo check dell'app Supabase, pur chiamandosi **Supabase Preview**, è associato allo SHA del merge e termina **SUCCESS** (ID `131294266368`). I log produttivi identificano branch/progetto/workflow, non stampano direttamente lo SHA: l'associazione al commit è sostenuta dal check GitHub sullo SHA esatto e dalla main indipendentemente verificata, senza inventare uno SHA nel log. La configurazione attiva, il processo osservato e la salute sono quindi tre evidenze distinte.

Il check pre-merge della PR #6 `131278523669` era **SKIPPED** con motivazione esplicita automatic preview branching disabilitato: non era failure e non costituiva prova di deploy. Il successivo SUCCESS sul merge è distinto da quello SKIPPED.

| Catalogo migrazioni prima/dopo | Stato |
| --- | --- |
| `20261029230530_serien_core_schema` | Presente prima e dopo |
| `20261029230558_serien_constraints_security` | Presente prima e dopo |
| `20261105155420_serien_verified_email_gate` | Presente prima e dopo |
| Versioni aggiuntive / pendenti | **Zero**; confermato anche dal log del processo |

Nuovo SELECT in transazione READ ONLY del catalogo approvato: **identità semantica esatta** rispetto allo snapshot S3 e fra prima/dopo. Tabelle, colonne, constraint, indici, funzioni applicative, trigger, RLS/policy, grant, privilegi effettivi e schemi/ruoli custom invariati. Nessuna lettura di righe utenti. Edge Functions dopo il processo: elenco vuoto; il log conferma nessuna funzione da distribuire. I file `supabase/` del merge restano identici alla main precedente.

Il record branch corrente riporta `FUNCTIONS_DEPLOYED` già nel preflight, con timestamp storico del 29 ottobre: quel campo da solo non prova un nuovo deployment. Il vecchio `MIGRATIONS_FAILED` documentato in S3 non è stato riparato; nel preflight di questa esecuzione non era presente nel risultato corrente. Nessun db push, apply_migration, merge_branch, deploy Edge manuale, seed, modifica Auth/RLS o scrittura applicativa eseguita.

**Auth/Data API: NOT VERIFIED, con lettura parziale esplicita.** I tool disponibili non espongono la configurazione completa Auth/Data API e non è disponibile un browser condiviso autenticato amministrativo. Il GET diretto al dominio del progetto è bloccato dalla policy di rete dell'ambiente. Una nuova lettura mirata di `pg_db_role_setting` per i soli tre parametri non segreti `pgrst.db_schemas`, `pgrst.db_extra_search_path`, `pgrst.db_max_rows` restituisce zero righe: non dimostra i valori runtime e non autorizza a inferire default. Provider, anonymous/signup, Site URL/redirect, JWT/MFA/rate limit e impostazioni Data API complete restano da leggere in dashboard senza Save. Il log “Skipping configuration” e il diff sorgente nullo supportano l'assenza di modifiche apportate da questa release, non certificano tutte le impostazioni esterne.

Evidenze: [processo, log, check, salute e migrazioni](docs/releases/V2.1/evidence/supabase-production.json), [catalogo prima](docs/releases/V2.1/evidence/catalog-before.json), [catalogo dopo](docs/releases/V2.1/evidence/catalog-after.json), [metodo read-only Auth/Data API storico](docs/supabase/alignment/EXTERNAL_CONFIGURATION.md).

## 4. Production smoke e provenienza

**Nuova esecuzione sulla vera URL pubblica**, Chromium, contesti nuovi non autenticati, desktop **1440×900** e mobile **390×844**. Nessun route mocking, fixture Auth, token/sessione iniettata o bypass. I due screenshot sono stati anche ispezionati visivamente.

| Gate | Produzione nuova | Prova precedente riusata / limite |
| --- | --- | --- |
| Documento e fogli CSS | HTTP200; cinque fogli UI e CSS principale caricati in entrambi i viewport; nessun overflow orizzontale del gate | PASS sul perimetro pre-login |
| Font locali | Cinzel Decorative e Federo risultano loaded; Cutive Mono non richiesto dalla pagina bloccata; tutti e tre i WOFF2 verificati per hash HTTP | Rendering completo dei tre font nella shell: U9/REL002 locale, non nuova prova autenticata |
| Auth gate | Visibile e chiuso; simulatore non avviato; zero pageerror | SDK esterno bloccato dalla rete di questo ambiente |
| OAuth Google/login/sessione/logout | **BLOCKED — USER ACTION REQUIRED** | Nessun account autorizzato/sessione condivisa utilizzabile; nessun login simulato |
| Shell V2.1/targa Autumn Railways/brass | HTML e asset pubblici verificati; **rendering autenticato NOT VERIFIED** | PASS locale U9/REL002, artefatto ora byte-identico |
| Canvas WebGL2/scena corrente | **NOT VERIFIED live**, zero canvas perché Auth impedisce il boot | PASS funzionale SwiftShader locale riusato; nessuno scenario Claude nuovo |
| Menu/sidebar/mappa canonica/ambiente | **NOT VERIFIED live**, dipende dall'accesso | PASS storici U2–U4/U9 |
| Dock quattro treni/selezione/HUD | **NOT VERIFIED live**, dipende dall'accesso | PASS storici U5/U9 |
| Otto scambi inclusi WX310/protezioni | **NOT VERIFIED live**; nessun comando forzato | PASS R1/U4/U9 e nuovi 254 test CI; non equivalgono a smoke pubblico |
| Train Management/Layout/Catalog | **NOT VERIFIED live** | PASS locale U6/U9 e identità del codice |
| Composer/Compare/Depot virtuale | **NOT VERIFIED live** | PASS locale U7/U8/U9 e identità M2/M3 |
| Track plan/documenti pubblici | Tutti i 24 file pubblici e hash PASS; click dalla shell autenticata **NOT VERIFIED** | Link/chiusura transitiva locale RC/REL002 riusata |
| Console/rete | Zero pageerror; un errore console/richiesta per viewport sull'SDK `esm.sh` | Blocco del proxy dell'ambiente, non 404 di un asset pubblico; zero PASS inventati sull'app non avviata |

L'import preesistente `https://esm.sh/@supabase/supabase-js@2.95.0?bundle` fallisce con `net::ERR_TUNNEL_CONNECTION_FAILED`. La stessa destinazione e il dominio Supabase restituiscono CONNECT403 con curl; la policy runtime consente il sito Pages ma non questi host. La pagina mostra «Autenticazione temporaneamente non disponibile». Si tratta del limite di questa esecuzione: non prova una indisponibilità globale del servizio. Nessuna nuova dipendenza esterna aggiunta dalla release; l'Auth client è identico alla main precedente. Non viene dichiarata assenza universale di errori runtime o di richieste anomale nell'app autenticata.

Il primo tentativo Chromium ha rilevato la CA del proxy non riconosciuta. Failure conservato; recupero limitato alla fiducia nell'esatta chiave SPKI della CA fornita dall'ambiente (`NODE_EXTRA_CA_CERTS`), senza disabilitare globalmente TLS o cambiare il sito. Il nuovo tentativo raggiunge Pages e documenta il successivo limite di rete SDK. Desktop condiviso dichiarato enabled/unknown, ma nessun tool `cua_repl.js`/`open_in_codex` disponibile dopo l'avvio; usato Playwright installato con Chromium per la prova automatizzata.

Evidenze: [console/rete/DOM e viewport](docs/releases/V2.1/evidence/public-browser.json), [desktop](docs/releases/V2.1/evidence/public-1440.png), [mobile](docs/releases/V2.1/evidence/public-390.png), [failure TLS iniziale](docs/releases/V2.1/evidence/browser-initial-tls-failure.json). I driver pubblici riproducibili sono conservati accanto ai risultati.

### Prova manuale obbligatoria ancora necessaria

Da un browser con accesso ordinario a SDK/Supabase/Google, con **account Google già autorizzato**, aprire la vera URL pubblica in entrambi i viewport. Registrare senza token, email o dati personali: login e ritorno esatto a `/SerieN/`, sessione autorizzata, shell/targa/font/WebGL2/scena corrente; Menu/sidebar/mappa e quattro treni, selezione/HUD, comandi protetti degli otto scambi/WX310; Train Management/Layout/Catalog, Composer/Compare e Depot; Track plan e documenti. Usare soltanto dati virtuali di sessione e comandi ferroviari consentiti. Verificare console/rete e accesso ai soli dati autorizzati, quindi logout e ritorno al gate. Non usare reset rischiosi o dati reali degli utenti. La lettura delle impostazioni Auth/Data API richiede inoltre la dashboard amministrativa in sola lettura, come sopra.

## 5. Invarianti e sicurezza

**Nuovo controllo di identità + nuova CI, con prove operative precedenti riusate:** albero approvato immutato dal merge, 269 identità U9 e dominio R1/M1/M2/M3 preservati; canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`, 150 rail meshes e topologia non modificati. Protezioni anticollisione, dispatcher degli otto scambi e operazioni protette dei treni non sono stati indeboliti per superare i gate.

Projects e inventario virtuale mantengono la semantica session-only attestata dal codice identico e dai test precedenti/CI. Nessuna nuova scrittura persistente introdotta o eseguita durante questa attività. Questo non elimina la sessione Auth persistente preesistente del client. Nessuna modifica applicativa, nuova dipendenza, schema, policy, Auth, asset o scenografia. Nessun nuovo audit completo 5E dichiarato. Nei report/evidenze consegnati non sono incluse password, token/sessioni o righe utenti; i log Actions hanno redazioni esplicite.

## 6. Ricognizione e chiusura dei sospesi

La [ricognizione](docs/releases/V2.1/evidence/pending-inventory.txt) registra le occorrenze nei documenti attivi pertinenti prima dell'aggiornamento corrente e nel rapporto permanente U0. Comprende anche condizioni STOP e comandi STOP ALL, che non sono automaticamente sospesi. U0, font preflight, U1–U9, REL001/002 e RC sono confrontati con le approvazioni successive. I rapporti storici restano intatti; questo rapporto e i registri attivi riportano lo stato operativo corrente.

| Sospeso / provenienza | Stato finale e prova |
| --- | --- |
| PR #6 Draft | **CLOSED**: Ready e merge verificato, nuova prova GitHub |
| Autorizzazione pre-merge / STOP RC | **CLOSED**: mandato registrato, conferma esplicita in chat, merge autorizzato |
| Approvazioni U0–U9 e font gate | **CLOSED come autorizzazione storica**: approvate dal mandato; i vecchi STOP/READY non sono gate attuali |
| U0: font/licenze, cascade, adapter/coordinator, focus/listener e DOM futuri | **CLOSED nel perimetro locale approvato U1–U9**; font/licenze anche distribuiti per hash; OAuth/signOut e accettazione autenticata reale restano aperti nelle righe dedicate |
| REL-001 omette ui / RELEASE BLOCKED U9 | **CLOSED**: REL001 ha corretto ui; packaging finale superato da REL002; nuova verifica pubblica |
| REL-002 review / pacchetto finale | **CLOSED**: approvazione mandato e 97/97 hash pubblici |
| Pages non pubblicato / upload remoto | **CLOSED**: nuovo run/deployment SUCCESS sul merge esatto |
| Supabase production non osservato | **CLOSED**: nuovo workflow produttivo/log/check SUCCESS, salute e cataloghi invariati |
| Supabase Preview skipped | **CLASSIFIED**: corretto prima del merge; distinto dal successivo processo produttivo riuscito |
| OAuth remoto/login/sessione/logout U2–U9/REL/RC | **BLOCKED — USER ACTION REQUIRED**; prova manuale esplicita, nessun PASS sintetico |
| Auth/Data API S3 | **NOT VERIFIED / limite documentato**; lettura DB parziale vuota non risolve la configurazione esterna |
| UI pubblica desktop/mobile | **PARTIAL**: nuovo pre-login/CSS/HTTP PASS; accettazione autenticata ancora bloccata |
| Asset/font/scena/WebGL | **PARTIAL**: distribuzione di tutti i file PASS; scena e resa completa live ancora bloccate |
| Train Management, Dock, Menu, scambi | **NOT VERIFIED live**; prove locali precedenti riusate e nuova CI distinte |
| M1/M2/M3, R1, session-only | **PRESERVED** per identità e test; smoke pubblico autenticato pendente |
| Beforeunload nativo, zoom chrome, singolo treno fisico non raggiungibile U5 | **LIMITI CONSERVATI**, nessuna funzione/test distruttivo aggiunto per fabbricare una prova |
| Hardware GPU/FPS/audio/touch/tastiera, screen reader, altri browser | **BACKLOG / NOT VERIFIED**, non diventano sviluppi obbligatori in questo rilascio |
| Audit completo accessibilità / WCAG | **BACKLOG futuro**, sei scansioni axe locali U9 non sono certificazione completa |
| Documentazione release | Rapporto completo, PROGRESS e stati attivi aggiornati su branch/PR documentale separati; nessun secondo merge autorizzato |
| Rollback | **PLAN RETAINED — NOT EXECUTED**, richiede nuova autorizzazione Regia |

Backlog futuro esplicito e non implementato: cybersecurity hardening **5E**; certificazioni GPU/dispositivi fisici e browser non testati; audit completi di accessibilità; ulteriori evoluzioni della simulazione; integrazione del nuovo scenario 3D Claude. La pubblicazione V2.1 non chiude queste attività.

## 7. Anomalie, documentazione e rollback

Nessuna pipeline di rilascio fallita. Anomalie operative: rifiuto automatico iniziale del merge risolto mediante conferma dell'utente e ricontrollo SHA; failure TLS browser conservato e recuperato come descritto; blocco rete SDK/progetto ancora presente; endpoint GitHub deployment/check dettagliati non esposti dal connettore; query log iniziale con campo `body` inesistente, corretta a `event_message` senza scritture. I log Actions segnalano deprecazioni `punycode`, `url.parse` e action Node20 eseguite dal runner con Node24; `npm ci` riporta zero vulnerabilità. Nessuna dipendenza/action modificata per eliminare warning fuori mandato.

Questa documentazione nasce da **`d77b8aa2710fa474fdb069b204705364b4a9e7e6`** su **`codex/release-v21-final-report`**, separata dal branch candidato congelato. Il suo commit atomico è individuabile con `git log -1 --format=%H -- RELEASE_V21_FINAL_REPORT.md`; SHA reale e URL della PR documentale sono consegnati con il risultato operativo, evitando autoreferenze nel commit. Il checkpoint viene pubblicato e verificato sul solo branch documentale; la PR rimane Draft e non viene integrata. Main resta al merge della release: nessun push documentale su main e nessun secondo deployment produttivo intenzionale. Non si assume che il semplice aggiornamento documentale sia approvato per un futuro merge.

Evidenze permanenti: [docs/releases/V2.1/evidence/](docs/releases/V2.1/evidence/), con [manifest SHA256 delle evidenze](docs/releases/V2.1/evidence/evidence-manifest.json). Rapporti primari conservati: [RC_PREMERGE](docs/_active/ui-v21/RC_PREMERGE_REPORT.md), [REL002](docs/_active/ui-v21/REL002_REPORT.md), [U9](docs/_active/ui-v21/U9_REPORT.md), [S3](docs/supabase/alignment/S3.md). [STATUS corrente](docs/_active/ui-v21/STATUS.md), [PROGRESS](PROGRESS.md).

**Rollback solo documentato:** baseline precedente `184cc9ba93a6b35493f365b2ffcb20ef0645963d`. Conservare prima commit/run/log e verificare quale versione sia realmente servita. Con **nuova autorizzazione Regia**, creare un branch dall'attuale main e preparare il revert del merge rispetto al parent 1 (`git revert -m 1 d77b8aa2710fa474fdb069b204705364b4a9e7e6`), verificando eventuali commit successivi. Test, build, packaging, PR e distinta autorizzazione prima dell'integrazione; verificare poi il nuovo deployment contro i propri hash. Nessun reset/force-push, disattivazione di integrazioni o rollback Auth/Supabase/RLS automatico.

**Verdetto conclusivo: RELEASED — ACCEPTANCE PENDING.** Merge, Pages, artefatto pubblico e processo/salute/catalogo Supabase sono verificati con nuove evidenze. OAuth reale, smoke funzionale autenticato desktop/mobile e configurazione completa Auth/Data API restano esplicitamente aperti. L'accettazione definitiva richiede queste prove; i limiti non sono trasformati in PASS né in nuove funzionalità.
