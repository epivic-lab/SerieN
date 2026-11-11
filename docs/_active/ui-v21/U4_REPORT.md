# SerieN UI V2.1 — U4 REPORT

**U4 READY FOR REGIA REVIEW.** Proposta tecnica per revisione indipendente; nessuna approvazione autonoma. STOP dopo U4, U5–U9 non autorizzate.

## Ingresso e autorità

Verificati prima degli interventi repository `epivic-lab/SerieN`, branch esclusivo `codex/ui-v2-integration`, working tree pulito e corrispondenza HEAD/upstream/remoto con U3 approvata **`907a9ec4a9d570f03af9ab77d39269ff49787256`**. U2 `48a7c4d48b118877ec7edf7f4c61fba090e460b8` antenata; main remoto `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, baseline ferroviaria/M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421` conservati. [Ricevuta](evidence/U4/baseline.json), [mandato U4](evidence/U4/AUTHORIZATION_U4.md).

Consultati G-U4, piano, A09/A12, risoluzioni, controlli/schermate e rapporto U3. La reference frozen V1/V2.1 fornisce pannelli Environment/Switches/Map/Missions, materiali e tipografia; i dati e i comportamenti restano quelli applicativi. Non sono importati JavaScript, miniature di stato o coordinate dimostrative.

## Implementazione e file

| File applicativo | Delta e motivazione |
| --- | --- |
| `src/ui/sidebar.js` nuovo | Adapter di presentazione: conserva pulsanti/nodi/handler originali, li dispone nei quattro pannelli V2.1; aggiunge stato scambio e motivi già calcolati, readout daylight e SVG/azioni focus della mappa fisica. Gestisce solo riferimenti DOM e listener locali, con dispose |
| `app.js` | Import/mount, aggiornamento e dispose della sidebar; callback focus che riusa `select`, `nav.focus` e Journey corrente. Aggiornamenti UI anche nei diagnostici già esistenti per mantenere marker e scena sincronizzati. Nessuna modifica ai corpi ferroviari, al dispatcher, alle soglie o al ciclo missioni |
| `ui/css/serien-ui-integration.css` | Solo appendice scoped U4 commentata: brass/enamel, font locali, testi di blocco senza hover, target ≥44 px, mappa parchment, scroll sidebar desktop e disposizione tablet/mobile. Il prefisso U3 resta identico e il foglio resta ultimo |

Nuovi test `browser-ui-v21-U4.py` e `browser-ui-v21-U4-safety.py`; documentazione, strumenti isolati e ricevute in `evidence/U4/`. **Nessun test storico o selettore storico modificato.** `index.html`, CSS legacy, copie CSS/token frozen, asset/font/licenze, `src/train-deck.js`, `src/train-deck-state.js`, tutti i file U2/U3 e tutti gli altri moduli `src/` preesistenti restano byte-identici a U3.

## Contratti integrati

**CTRL-012 — scambi.** Riutilizzati esattamente gli otto pulsanti generati dal codice applicativo da `switchSpecs`, in ordine `controlOrder`. Preservati `data-switch`, `data-switch-hover`, `.switchCell`, ID `switchList` e `switchCount`; aggiunti hook `data-switch-id` e `data-ctrl`. Il loro onclick originale continua a chiamare esclusivamente `requestToggle(id,"panel")`. L'adapter legge il valore reale, senza modificarlo; conserva lo stato `.active` originale e mostra Straight/Diverging/Unknown. Il contatore resta prodotto da `ui()`.

Disabled e title continuano a essere decisi dal binding originale `switchHUDState`. L'adapter ne rende visibile il testo completo in un paragrafo collegato con `aria-describedby`; nessuna seconda valutazione di sicurezza, modifica anticipata o successo ottimistico. Occupied, approaching e unknown sono verificati anche tramite click 3D sul controller reale, con rifiuti e invarianti identici. Non sono copiati i piccoli diagrammi dimostrativi dei tile reference: identità/stato e motivazione reale hanno priorità; il diagramma Next Switch U3 resta quello topologico originale.

**CTRL-013 — daylight.** `#day`, `#sun`, valore e handler originale rimangono gli stessi. Il nuovo output legge il valore effettivo e il glyph già prodotto dal binding; non introduce un'altra formula di soglie. Il binding originale viene invocato una volta **dopo** il ricollocamento dei nodi: il valore iniziale 48 non cambia e l'icona iniziale si sincronizza a Sunset, anziché conservare il glyph statico del markup legacy. Soglie 42/72 e illuminazione reale della scena verificate. Il select rolling stock già presente resta lo stesso nodo con il suo handler, dentro Environment; Menu U2 invariato.

**CTRL-015 — missioni.** Conservati `missionIndex`, `missionName`, `missionText`, `missionStatus` e `nextMission`, con stringhe, stato, handler e ciclo originali. Next resta disponibile senza completamento. La reference con Next disabilitato/progressi dimostrativi non prevale sul contratto applicativo: nessun reward, nuovo progresso, autoscore o nuova condizione.

**CTRL-053 — mappa.** Il nuovo SVG usa `MAP_VIEWBOX` e `railwayMapPath(network)` già impiegati dal Train Dock. I marker leggono `locomotivePoint(train)` sui treni fisici correnti; il percorso è confrontato esattamente con quello delle miniature originali, e le coordinate con la posizione del locomotore reale. Marker e legenda richiamano selezione e focus sulla Journey corrente, senza comandi di marcia. La legenda fornisce l'azione equivalente con target ≥44×44 px; i marker sono raggiungibili da tastiera e Space locale non viene inoltrato al comando Stop globale. Quattro treni raggiungibili anche quando il dock mantiene tre console LRU. Nessun riferimento a progetti o inventario virtuale; nessuna modifica al dock o alle sue miniature.

**U2/U3.** Header/Menu, guard Sign out, Auth, TM, camera/Route, HUD/Bell, Operations Log e renderer conservati. Nessuna copia log nella sidebar; un solo canvas e nessun nuovo renderer o handler globale. I pannelli sidebar ricevono input soltanto nel loro spazio; mouse/touch/picking e overlay U3 rimangono funzionanti.

[Delta DOM/callback dei quattro controlli](evidence/U4/selector-delta.json). I registry U0 restano storici; non sono riscritti retroattivamente.

## Verifiche U4 effettivamente eseguite

**13 comandi finali exit 0**, con output e ricevute separati dalle esecuzioni intermedie: [results.json](evidence/U4/results.json), `evidence/U4/tests/`.

| Gate | Risultato |
| --- | --- |
| Node e Python | **PASS 254 Node**, zero fail/skip; **PASS 9 Python** |
| Build/canonico | **PASS**, bundle e metafile di dipendenze; rigenerazione canonico e diff zero |
| U4 sul bundle produttivo | **PASS 9 gruppi**: otto controlli/entrambi gli stati/counter, mappa canonica/quattro marker/LRU/focus e Space, mission cycle senza completamento, daylight 42/72, occupied/approaching reali, responsive e integrazione U2/U3 |
| U4 safety e camera | **PASS 6 gruppi**: occupied/approaching/unknown con medesimo rifiuto tra tile e vero picking 3D; nessun cambiamento di scambi o occupazione al rifiuto; luce scena effettiva; camera target coincidente con il locomotore; pagehide/cleanup e click su elemento scollegato senza callback |
| Interazione S2 storica | **PASS**, otto controller e rami, hover, mouse/touch/tastiera, cancel/drag/pinch, occlusione, selezione treno e dispose; asserzioni originali intatte |
| Railway Guard S5 storico | **PASS 6 scenari**, stop predittivo e recupero panel, cache obsoleta/alta velocità, reverse/background, stato controllo sconosciuto, vero freeze/resume Chromium, occupazione fino a partenza compatibile; asserzioni originali intatte |
| Phase Zero | **PASS**, tre circuiti reali, quarto treno/LRU, STOP ALL, mappa/canonico/HUD, scambi protetti e runaround/reverse, asset e quattro viewport |
| RAF nativo produttivo | **PASS**, tre treni realmente avanzanti; marker uguali alle coordinate fisiche nel medesimo frame e focus atomico senza mutazione ferroviaria. **16 frame / 24.132,3 ms**, circa **0,622 fps SwiftShader** a 650×760; un canvas, zero pageerror. Nessuna conclusione di fluidità hardware o confronto prestazionale con U3 |
| Invarianti/assenza mock | **PASS**, 225/226 file del manifest U3 identici, unico delta app.js invertibile esattamente dopo rimozione dei soli binding UI. Tutti gli altri file preesistenti src/ui/tests e asset/font/licenze identici; CSS U3 conservato come prefisso. Nessun input reference/mock/test observer nel bundle |

Bundle SHA-256 **`4d63096f8b4cdaa15e62de27ee2b70384712deed58483fa2382fcdccdcde3c27`**, identico fra esecuzione produttiva, build finale e HTTP del test nativo. [Hash sorgenti](evidence/U4/source-hashes.json), [invarianti](evidence/U4/invariants.json), [observer isolati e ricette](evidence/U4/observer-hashes.json). Gli observer espongono oggetti reali, non sostituiscono motore, dispatcher o renderer; mai installati in dist.

La fixture unknown riproduce esplicitamente una cache Journey divenuta incoerente dopo una modifica controllata dello stato nel **solo test**: geometria reale, posizione lungo la Journey reale e velocità 150 entro il limite applicativo. Il motore calcola il blocco, poi entrambe le superfici lo rispettano. Non è un mock della safety o dei dati UI, né una modifica diretta consentita nel prodotto.

**PASS storici documentati, non nuove esecuzioni:** certificazione completa M2/M3 e matrice estesa R1/5C di U3 conservate. Non ripetute perché domini e contratti non cambiati. Per U4 sono stati scelti i nuovi controlli sopra, S2/S5 e Phase Zero, pertinenti alle dipendenze modificate. Nessuna esecuzione indiscriminata dei vecchi harness né allentamento delle asserzioni; tutti i test storici restano byte-identici.

## Visuale, accessibilità e recuperi

**27 nuove immagini finali**, oltre a quelle delle regressioni: 16 in `sidebar/` (cinque stati × tre viewport e mobile completo), tre in `safety/`, sette in `overview/` (Day/Night a 1440×900, 1024×768, 390×844 più mobile completo) e una in `native/`. Le catture sidebar mostrano anche il focus ravvicinato reale; quelle Overview ripartono dall'app fresca per rendere leggibile il layout complessivo. Nessuna evidenza precedente sovrascritta.

Ispezionati pannelli desktop/map, mobile/map e Overview notturna. Font e materiali locali coerenti con U2/U3, motivi leggibili senza hover, target principali ≥44×44 px, nessun overflow orizzontale. A desktop la sidebar scorre per rendere raggiungibili quattro pannelli con testi completi; tablet/mobile seguono il layout progressivo esistente, senza anticipare U9. HUD, Bell, Camera e Log restano nello spazio viewport; Train Dock conserva l'aspetto legacy. I marker piccoli dispongono della legenda equivalente a target ampio.

Failure intermedi e ricevute preservati in `tests/*first*`, `*second*`, manifest `*intermediate*` e `failures/`; non presentati come PASS:

- Primo smoke di costruzione: alcuni nodi erano cercati dopo averli temporaneamente scollegati. Conservati i riferimenti e inizializzato il binding daylight solo a nodi ricollegati; nuovo avvio e suite finali senza errori.
- Prima aspettativa del test Reset eliminava il quarto treno: la baseline lo conserva. Corretto solo il test; mappa e reset applicativo già corretti.
- Prima fixture approach non aveva ancora raggiunto la soglia reale di avvicinamento e conservava la quarta locomotiva sulla zona di prova. Spostata quella locomotiva usando il diagnostico originale e lasciata agire l'accelerazione reale; nessuna modifica al dominio o al margine di protezione.
- Harness storico S5 richiedeva attesa esplicita dell'observer e i metodi stop/resume del profiling standard, inclusa la ripresa RAF nativa. Completato l'harness isolato; stessa suite e stesse asserzioni, poi PASS compreso freeze/resume. La prima versione della fixture unknown con margine più ampio è conservata; consegna ricontrollata con velocità nel limite reale.

## Limiti, sicurezza e checkpoint

**NOT VERIFIED:** fluidità su GPU e dispositivi fisici, touch/audio fisici, screen reader, altri browser/supporto `@scope`, OAuth remoto, prompt beforeunload nativo e accettazione integrata U9. Nessuna credenziale o sessione cloud usata/modificata; i test esplicitano il confine Auth locale. I PASS browser non attestano il provider Google reale.

Motore R1, dispatcher/sicurezza degli otto scambi, topologia/canonico, STOP ALL momentaneo, Space selezionato, flotta quattro/console tre, Guarded Stop/Bell, domini M1/M2/M3 e Projects/Depot session-only intatti. Nessuna persistenza, store parallelo, trasferimento fisico, KPI, nuovo allarme o previsione simulata. Auth/Supabase/RLS/API, scenografia/asset 3D, workflow e packaging Pages invariati. Il prerequisito futuro di packaging ui/ già noto resta fuori U4; nessun merge, deploy, rebase, reset, clean o force push.

Nessun impedimento tecnico U4 residuo nei gate eseguiti. Checkpoint atomico sul branch autorizzato, SHA completo e allineamento remoto verificati nella consegna. **U4 READY FOR REGIA REVIEW — STOP.** Attendere revisione indipendente della Regia; U5 non avviata.
