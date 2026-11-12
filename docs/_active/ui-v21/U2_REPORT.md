# SerieN UI V2.1 — U2 REPORT

**U2 READY FOR REGIA REVIEW. STOP dopo U2. U3–U9 non autorizzate.**

## Baseline e perimetro

Branch `codex/ui-v2-integration`, checkpoint iniziale approvato locale/remoto `74a8d91c2feafcb826ee316862ec2e8bf7d12a56`, working tree iniziale pulito; baseline ferroviaria `91722fbdf6671e69deebf645c3d8bf389212f421` antenata, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` verificata. Nessun nuovo branch, merge/rebase/reset/force-push/main/deploy/release.

U2 integra shell/header, Menu, Help/Plan reali, skin login gate, qualità, proxy rolling stock, Sign out protetto, Exit disabilitato e ingressi TM. Sidebar, dock, HUD, camera toolbar, campana e interni TM mantengono i controller e la presentazione legacy: nessuna U3/U6/U7/U8 anticipata.

## File applicativi e motivazioni

| File | Delta |
| --- | --- |
| index.html | Quattro link a copie CSS con scope e integration ultimo; classe U2 sulla sola regione auth. Boot e modulo auth originali, ID originali mantenuti |
| app.js | Import/mount shell dopo mount TM, riferimento UI, aggiornamento indicatore Running/Paused nei punti UI esistenti e dispose nel teardown; nessun corpo ferroviario modificato |
| src/train-management.js | `open(initialView, origin)` e getter `sessionSummary` congelato con soli primitivi; ritorno focus al launcher effettivo. Stessi dialog/store/inventory, generazione e beforeunload; nessun nuovo store |
| src/ui/shell.js | Header/materiali, Menu nativo, impostazioni, launcher, proxy rollingModels e guard Sign out in capture; skin dei veri Help/Plan; watcher focus limitati alle modali, nav mobile e cleanup |
| src/ui/guard-modal.js | Coordinator A03 per Sign out U2 e relative primitive one-shot/valid/dispose. Non trasforma `discard()` o reset in Promise |
| src/ui/sfx.js | Feedback UI opt-in indipendente, contesto audio locale sbloccato da gesto e chiuso in dispose; nessun riferimento al controller ferroviario Bell |
| ui/css/*-u2.css (4) | Adapter CSS deterministici delle copie U1: wrap `@scope (.u2-region)` e `:root` → `:scope`, nessun edit al sorgente congelato/U1 |
| ui/css/serien-ui-integration.css | Font locali preesistenti più soli override U2 commentati per CTRL: scope-root surfaces/flex, dialoghi nativi, auth skin, focus e controlli ≥44px, microtesti secondari 14/15px, nav mobile, contrasto launcher ottone |
| tests/browser-ui-v21-U2*.py | Nuovi check minificato e pointer delivery, fixture locale di accesso; nessuna chiamata Auth/Supabase remota |
| 8 test browser storici TM/Projects/Depot/Side | Soltanto `dialog` → `dialog.trainManagement` e relativo close: ora esistono anche Menu/Guard nativi. Tutte le altre asserzioni byte-identiche alla baseline, prova automatica in invariants.json |

CSS legacy originale, tutti i moduli R1, store `train-projects.js`/`depot-inventory.js`, layout/coupler/canonico/asset ferroviari, `auth-gate*.js`, Supabase/migrazioni, dipendenze/workflow, V1 e design V2.1 congelati **invariati**. Confronto sui 226 file baseline: **215 identici**, 11 delta autorizzati (app/index/vista TM e otto test con solo selettore). File nuovi UI verificati separatamente; nessuna riscrittura di dominio.

## CSS: attivazione regionale e confronto visivo

Ordine del documento: style.css legacy → tokens V1 scoped → CSS V1 scoped → tokens TM scoped → CSS TM scoped → integration ultimo. Le copie U1 restano intatte, inclusa la rimozione già approvata dell'import remoto. Ogni derivato è verificato contro la trasformazione dichiarata in `evidence/U2/css-adapters.json`: serve a caricare il design senza far ricadere selettori generici su canvas/HUD/deck/sidebar/TM legacy. `.u2-region` è applicata soltanto a header, Menu, auth, Help/Plan, Guard e nav mobile; `.app.u2-frame` modifica solo l'allocazione della riga header, non geometria ferroviaria.

Scope-root senza `.st` richiedeva esplicitare variabili zero-night, flex del contenuto header e superficie smaltata dei pannelli nativi: override minimi documentati nel foglio integration. Header/plaque mahogany, bottoni brass/enamel, tipografia dei tre font e dialoghi sono derivati dal linguaggio V1/V2.1; i campioni/screenshot della reference sono stati usati come confronto di materiali e anatomia, non come logica. Non si dichiara pixel parity della shell completa o della futura UI integrata. Il contenuto Help resta quello reale e non promette scorciatoie/composer UI future; Plan usa ancora l'SVG generato dal network e il link XML reale, senza click scambi non verificati.

Screenshot finali in `evidence/U2/shell/`: shell/Menu/Help/Plan/conferma a **1440×900,1024×768,390×844**, più gate login. Acquisizioni a transizioni stabilizzate (850ms), ispezionate desktop Menu e mobile shell, tablet Plan; le prime acquisizioni durante l'animazione avevano trasparenze transitorie, sono conservate come contesto di debugging nello scratch e sostituite nelle evidenze finali. Font locali, nessuna importazione Google Fonts. Test console/layout verificano ancora overflow, posizioni HUD/carte e canvas nei viewport legacy. Nessuna evidenza U0/PRE-U1/U1 sovrascritta.

## Callback, dati RAM e dialoghi

- `#signOut` è **lo stesso nodo** e conserva il `addEventListener` originale Auth. A01 intercetta in capture prima del listener bubble; senza dati autorizza una sola consegna, con dati mostra la guard. Cancel/Escape/backdrop non disconnettono; conferma usa token one-shot e blocca click ulteriori/ricorsione. Il test conta le consegne a un listener locale equivalente al confine originale: non effettua logout di un account reale.
- A02 legge `projects.dirty || projects.hasProjects || inventory.size>0`; summary con dirty, conteggi confermati/Depot e generation, nessuna reference mutabile. Il messaggio distingue le categorie presenti. Conferma rivalida lo snapshot: intenti obsoleti non eseguiti. Dispose annulla pending e libera listener/overlay/observer/audio. `Exit to title` è disabilitato, con spiegazione accessibile e nessun reload/logout.
- A03 è coordinatore U2 soltanto. Confirm sincrone reset/Composer/Depot restano originali. Guard nativa assicura top-layer/focus; Escape di Menu/Guard non propaga alla chiusura globale delle modali sottostanti. Help/Plan preservano ID/handler/generazione, aggiungono ruolo/nome dialog e focus trap/ritorno.
- Launcher header/Menu/Stock mobile chiamano la stessa istanza `management.open`; il Menu torna al suo pulsante apribile (non a un elemento dentro il Menu chiuso), Stock torna al proprio launcher. Close non distrugge confermati o record. Le quattro viste restano legacy.
- Qualità usa il select originale e il suo `applyQuality(quality.setMode())`, Auto/Low/High/Cinema. Rolling stock originale resta anche in sidebar; proxy Menu consegna change allo stesso select, poi rilegge il valore reale, incluso rollback. Rifiuti restano nel log reale persistente, non un successo ottimistico. UI sound opt-in non scrive mute/active Bell; chip/controller Bell restano quelli ferroviari, da migrare visivamente solo in U3.
- Camera, singolo canvas e resize originali. Nessun overlay invisibile residuo dopo chiusura: pointer trusted raggiunge gli OrbitControls. Comandi/ID selezionato `#stop`, Space e STOP ALL originali; nessun comando HUD, store parallelo, mock import, KPI, allarme, persistenza o trasferimento aggiunto.

Delta dettagliato CTRL/DOM/callback: `evidence/U2/selector-delta.json`. Il registry U0 continua a descrivere la baseline91722fb: il delta U2 documenta la situazione corrente senza riscrivere la provenienza del registry.

## Gate e risultati

`evidence/U2/RESULTS.json` registra **16 comandi con exit code0**. Output/log, source/bundle/hash e dettagli in `tests/`, `shell/`, `pointer/`, `m1/`, `m2/`, `m3/`, lifecycle, `regressions/` e `native/`.

| Controllo | Esito reale |
| --- | --- |
| npm test | **PASS 254 Node**, zero fail/skip, incl. access-gate/quality/fleet/guard/store |
| Python unittest | **PASS 9** |
| Build e canonico | **PASS**, rigenerazione e diff canonico zero; nuovi bundle UI attesi diversi da U1 |
| U2 specifico | **PASS 10 gruppi**: qualità/title disabled, UI Sound/Bell mute indipendenti, RAM summary/cancel, stesso store, immutabilità dialoghi, Stock/focus,15 screenshot, confirm/doppio evento, intent obsolete/dispose, locked boot/login skin con fixture locale |
| Pointer reale | **PASS**, chiuso Menu/Escape, trascinamento trusted → camera manual e singolo canvas; nessun pageerror |
| M1/M2/M3 | **PASS**, suite esistenti con sole migrazioni selettore, immagini/range/compare/reset/identità/capability/stock separato e touch |
| Lifecycle M2/M3 | **PASS**, 25 cicli e beforeunload sintetico come nelle suite originali; presentazione prompt nativo resta non certificata |
| R1/5C | **PASS 11 scenari**, frontali, composizioni/sganciati/inserimento/approccio/curve/frame/routing/identità |
| Console e Phase Zero | **PASS**, quattro treni/LRU, STOP ALL/controlli/mappa/canonico/HUD e quattro viewport. 404 intenzionale fallback della suite console non è asset mancante U2 |
| RAF nativo finale | **PASS 6 gruppi/7 checkpoint/74 frame**, tre treni in moto, input reali, aggancio/sgancio da fermo con altri due avanzanti; record/progetti separati e preservati. Circa0,645fps software, **fluidità hardware NOT VERIFIED** |
| Errori/risorse U2 | **PASS**, zero consoleErrors/pageErrors/HTTP falliti/richieste fallite/nuovi endpoint esterni nel test U2; snapshot e native mantengono contesto WebGL attivo e nessun errore finale |
| Invarianti | **PASS**, sorgenti R1/store/Auth/Supabase/asset/canonico/dipendenze/workflow e CSS legacy invariati; hash/blob e delta espliciti in invariants.json |

Bundle finale SHA-256 **`3112b76b6988dc9f5932511cbe31336f0e1b2e68cff15bfff1b26e722e572fa1`**, identico a quello verificato su disco e via HTTP dal gate nativo finale. Build/receipts di iterazioni intermedie hanno hash propri: non sono presentati come ulteriori esecuzioni dello stesso bundle. Canonico sempre `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`.

Fallimenti intermedi registrati in `failures-and-recovery.txt` e log: server8000 occupato/non responsivo → server8022; strict selector generico con tre dialoghi → selector-only migration; confronto iniziale attraversava warm-up qualità e rendering reale (Journey.ensure cache), separato dal checkpoint rigoroso prima/dopo navigazione read-only; superfici/header CSS corretti soltanto nel perimetro U2. Le asserzioni storiche di dominio non sono state indebolite per far passare il design.

## Limiti e prossima azione

**NOT VERIFIED:** OAuth Google reale/provider/logout remoto (non sono state usate credenziali o mutate sessioni cloud), browser diversi da Chromium e supporto @scope su di essi, hardware GPU/touch/speaker/screen reader, prompt beforeunload nativo e accettazione visuale finale U9. Il gate login comprende core unit tests, markup/boot bloccato e fixture locale di autorizzazione; Auth sorgente è invariata. Non si attribuiscono prove remote al listener-spy locale.

Le superfici non migrate sono ancora legacy per scelta di perimetro; il confronto visuale non è un collaudo U3–U9. Prima di un'eventuale release autorizzata, il packaging Pages dovrà includere ui/ (workflow attuale copia dist/assets/docs): **non modificato in U2, nessun deploy consentito**. Questo non blocca review e test locali U2, ma impedisce di considerare questo branch una release pronta.

Nessun impedimento U2 residuo nei gate eseguiti. File/limiti/evidenze pronti per audit della Regia. Checkpoint atomico sul branch autorizzato, SHA effettivo e allineamento locale/remoto verificati nella consegna. **U2 READY FOR REGIA REVIEW — STOP e attendere approvazione esplicita prima di U3.**

## Ripresa controllata dopo interruzione — 2026-11-11

Prima di modificare file, recuperati repository, branch, HEAD, upstream, stato Git ed evidenze. U2 era già interamente committata e pubblicata in **`19a84092131a81ee95a869218d77357723abf3a4`**, unico commit dopo U1 approvata. HEAD locale e remoto coincidevano; nessuna modifica staged, unstaged o non tracciata. Main remoto ancora `184cc9ba93a6b35493f365b2ffcb20ef0645963d`; U1 e baseline M2/M3 verificate antenate. Rapporti, codice, log e screenshot erano recuperabili. Nessuna componente è stata ricreata.

La configurazione locale aveva l'upstream dichiarato ma il fetch limitato a main: aggiunto soltanto il refspec esatto, senza force, del branch autorizzato e ripristinato il tracking `origin/codex/ui-v2-integration`. Nessun cambiamento a branch originali o configurazioni di prodotto. Il confronto del delta completo U1→U2 e dei callback conferma il perimetro sopra documentato.

**Lavoro precedente:** tutta l'implementazione, correzioni circoscritte, build, test e screenshot descritti nel rapporto appartengono al checkpoint U2 recuperato. **Lavoro nella ripresa:** audit statico effettivo, lettura dei log, nuova ispezione dello screenshot Menu mobile già acquisito, inventario SHA-256 delle 114 evidenze precedenti e questo aggiornamento documentale. Nessun sorgente, test, asset o bundle modificato; nessun test runtime/build ripetuto, come richiesto dal mandato di ripresa. Il campo `codeCheckpoint` di alcune ricevute precedenti identifica il HEAD U1 al momento dell'esecuzione sul delta non ancora committato; la provenienza del risultato U2 è corroborata dagli hash dei sorgenti consegnati e del bundle finale, non da quel solo campo.

| Categoria | Risultato della ripresa |
| --- | --- |
| PASS verificato con esecuzione effettiva | Branch/HEAD/remoto/upstream e ancestry; 15 hash sorgenti, 226 hash/blob delle ricevute baseline; 16 file exit code coerenti con RESULTS; 16 PNG con dimensioni registrate; hash bundle locale identico a quello del test nativo; inventario delle 114 evidenze precedenti |
| PASS documentato da evidenza valida precedente | 254 Node, 9 Python, build/canonico, 10 gruppi U2, pointer, M1/M2/M3/lifecycle, R1/5C, console/Phase Zero e RAF nativo; stessi sorgenti e bundle verificati, nessuna nuova esecuzione dichiarata |
| NOT VERIFIED | OAuth remoto, altri browser/@scope, hardware GPU/touch/audio/screen reader, prompt beforeunload nativo, accettazione completa U9; limiti precedenti confermati |
| FAIL | Nessun fallimento residuo nell'audit di ripresa; diagnostica dei fallimenti intermedi preservata nei log originali |

Prove della ripresa: [VERIFICATION.json](evidence/U2/recovery/VERIFICATION.json), [manifest delle evidenze precedenti](evidence/U2/recovery/PRIOR_EVIDENCE_SHA256.json). Il diff del checkpoint di ripresa comprende soltanto questi due file, questo rapporto, i due STATUS e PROGRESS. Il suo SHA completo e la verifica remota finale sono riportati nella consegna; il checkpoint applicativo resta `19a84092131a81ee95a869218d77357723abf3a4`.

**U2 READY FOR REGIA REVIEW.** Nessuna attività U2 applicativa mancante rilevata; U3 non iniziata. Prossima azione unica: audit indipendente della Regia e nuova autorizzazione esplicita prima di U3. Nessun merge o deploy.
