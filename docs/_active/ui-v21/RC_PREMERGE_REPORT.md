# UI V2.1 release candidate — pre-merge gate

**READY FOR REGIA MERGE REVIEW.** Mandato limitato al gate e alla creazione di una sola PR **DRAFT**, `codex/ui-v2-integration` → `main`, titolo `SerieN — UI V2.1 Integrated Release`. Nessun merge, auto-merge, workflow_dispatch, deploy, nuova funzionalità o intervento cloud. U0–U9, REL001/002 approvate dalla Regia nel mandato. **Il merge su main attiverà automaticamente GitHub Pages.** STOP dopo la preparazione PR; autorizzazione al merge riservata alla Regia.

## Baseline e identificazione

- Main prima del merge: **`184cc9ba93a6b35493f365b2ffcb20ef0645963d`**, remote invariata.
- Release candidate applicativa approvata: **`29b55b40dfa37c51fae827bdf25ded94948a3a45`**, HEAD iniziale locale/remota/upstream coincidenti, working tree pulito.
- M2 approvata: **`a67e0de7fa01a968152cf47af3a744ea39034bcc`**; M3 conclusiva e baseline UI: **`91722fbdf6671e69deebf645c3d8bf389212f421`**.
- U9 approvata: **`50d7c744e4b9dbbe20197ec8f959fdccb16edb5b`**.
- REL001: **`06a01c5ae70bfd4147e2c866f06803139904f264`**; REL002: **`29b55b40dfa37c51fae827bdf25ded94948a3a45`**.
- Checkpoint di consegna PR: commit documentale che contiene questo rapporto; HEAD effettiva riportata nella descrizione PR e nella consegna dopo verifica remota. Si ricava anche con `git log -1 --format=%H -- docs/_active/ui-v21/RC_PREMERGE_REPORT.md`. Nessun hash autoreferenziale inserito nel proprio contenuto.

[Git gate](evidence/RC_PREMERGE/git-gates.json), [ancestry di tutte le fasi](evidence/RC_PREMERGE/phase-ancestry.json). Il checkpoint applicativo è **25 commit avanti/0 indietro** rispetto a main. La consegna aggiunge **un solo commit documentale** per rapporto/evidenze/PROGRESS/STATUS; la PR contiene quindi26commit, senza cambiamenti al codice approvato o al pacchetto. Nessun rebase/squash/reset. `git merge-tree --write-tree <main> <RC>` termina0, senza conflitti e con albero uguale al candidato, essendo main antenata. Nessuna PR aperta per questa coppia di branch prima della preparazione.

## Inventario completo e perimetro

[25 commit approvati in ordine](evidence/RC_PREMERGE/approved-commits.json), [manifest completo approvato con blob Git/SHA256/dimensioni](evidence/RC_PREMERGE/approved-delta-manifest.json), [riepilogo](evidence/RC_PREMERGE/approved-delta-summary.json), [manifest completo finale per stato/percorso](evidence/RC_PREMERGE/final-delta-name-status.txt), [file del solo checkpoint documentale](evidence/RC_PREMERGE/delivery-files.txt).

Il delta approvato comprende **2.321 percorsi**:2.243docs,34tests,23ui,16src,un workflow Pages,PROGRESS,app.js,index.html,style.css. Inventario generato dal database Git locale con `git diff --raw --no-abbrev --no-renames -z`, senza API Compare o limiti300file. Il manifest finale contiene **2.354 percorsi** e include tutti i nuovi file della consegna, compresi i manifest stessi. Il solo commit documentale tocca **35 file**. Il commit documentale è distinto dalle25fasi approvate e non introduce altri file applicativi.

La UI integrata include contratti U0, asset/font locali U1, shell/Menu/consensi U2, overlay reali viewport e Bell condivisa U3, sidebar/mappa canonica/ambiente/missioni U4, Train Dock e comandi protetti U5, viste Layout/Catalog U6, Composer/Compare U7, Depot virtuale U8 e accettazione responsive/accessibilità/targa Autumn Railways U9. M2/M3 aggiungono progetti e inventario **solo in sessione**, senza trasferimenti fisici o nuova persistenza. I dati UI e i comandi restano collegati ai domini reali.

## Gate e provenienza dei risultati

| Gate | Esito | Evidenza |
| --- | --- | --- |
| Main e branch checkpoint | PASS: SHA autorizzati,25avanti/0indietro,tree iniziale pulito | git-gates.json |
| U0–U9/REL001/REL002/M2/M3 inclusi | PASS: tutti antenati del candidato | phase-ancestry.json |
| Conflitti | PASS: merge-tree senza conflitti,tree risultato uguale aRC | git-gates.json |
| Delta completo/perimetro | PASS: Git locale completo; nuovo checkpoint solo documentazione | manifest e delivery-files |
| R1/M1/M2/M3/Auth | PASS identità domini; adapter di presentazione già approvati distinti | domain-source-identity.json |
| Workflow | PASS: solo Prepare site cambia da main,nessun trigger nuovo; ricetta REL002 esatta | workflow-gates.json,prepare-site.sh |
| Installazione CI | PASS: Node22.23.5, npm11.9.0, `npm ci` | versions.txt,npm-ci.txt |
| Node | **254/254 PASS**,zero skipped | npm-test.txt |
| Python | **9/9 PASS** | python-audit.txt |
| Canonico | PASS: rigenerazione e `git diff --exit-code` | canonical.txt,canonical-diff.txt |
| Build | PASS,bundle U9 byte-identico | build.txt,artifact-identity.json |
| Prepare site e artefatto | PASS:97file,4.491.628byte; tutti gli hash uguali aREL002 | artifact-identity.json |
| Audit runtime | PASS:83riferimenti,67asset,3font+licenze | package-audit.json |
| HTTP locale solo `_site` | PASS:97HTTP200 con hash;3.470404attesi per archivi/esclusioni/sorgenti | http-results.json |
| Browser e ferrovia | RIUSO VERIFICATO,non nuove esecuzioni: artefatto completo REL002 identico e269file U9 identici | u9-identity.json;REL002/U9 |
| Credenziali | PASS nel controllo a pattern e revisione del perimetro,zero candidati nei nuovi blob della storia | secret-scan.json |

Percorsi della tabella relativi a [evidence/RC_PREMERGE/](evidence/RC_PREMERGE/). [Comandi ed exit code](evidence/RC_PREMERGE/commands.json), [riproduzione CI](evidence/RC_PREMERGE/run-ci.py), [inventario e invarianti](evidence/RC_PREMERGE/inventory.py), [verifica HTTP](evidence/RC_PREMERGE/artifact-http.py), [scanner](evidence/RC_PREMERGE/scan-secrets.py). Node22 temporaneo sotto `work/`; cache npm inizialmente read-only recuperata usando cache del workspace. Nessuna dipendenza applicativa o lockfile cambiati; npm non è fissato dal workflow. Non dichiarato un nuovo PASS Actions remoto: Pages non ha trigger PR e i percorsi della CI Supabase isolata sono invariati/non interessati. Nessuna Actions Pages invocata.

Tutti i sorgenti preesistenti aM3 corrispondono byte per byte tranne **cinque adapter di presentazione approvati** (`depot-view`, `guarded-stop-scene` getter UI, `train-deck`, `train-management`, `train-projects-view`). `app.js` contiene il boot/wiring UI approvato; `src/ui/*` sono i moduli UI approvati. Store progetti/inventario, R1/dispatcher/topologia/canonico, M1 e asset ferroviari sono identici alle baseline pertinenti. Auth, package/lock, Supabase e relativo workflow sono uguali a main. Nessuna falsa pretesa che le viste UI debbano essere identiche alla UI pre-U0. Tutti i269hash U9 escluso il workflow Pages modificato daREL001/002 sono confermati.

Scansione credenziali: **1.758 nuovi blob unici,328.533.842byte** nella storia base..RC, incluse versioni intermedie e file binari come byte; pattern chiavi private/token/JWT/URL con password/assegnazioni credenziali, senza stampare valori. Zero candidati. Non è una garanzia universale contro dati nascosti o segreti non riconoscibili; non è un nuovo audit completo5E. Manifest, diff e perimetro non introducono file credenziali/configurazioni Auth. Le nuove evidenze contengono soltanto hash,percorsi,log test e risultati redatti.

## Packaging e riuso delle evidenze

REL001 aggiunge `ui/` al pacchetto. REL002 mantiene `cp -R dist assets ui _site/`, pulisce solo `_site` dopo controllo del percorso e usa whitelist esplicita di24documenti con dipendenze pubbliche transitive. Tutta la documentazione resta in Git; gli archivi tecnici non raggiungibili, questo rapporto e le sue evidenze non sono pubblicati.

Build Node22 appena eseguita: **1.088.369byte**, SHA256 **`11085af332a3636cb23e1bcca2b88d669dfd47942fedbff7c183203ce8b66bd2`**, identico aU9. Pacchetto **97file /4.491.628byte**, docs **24file /1.723.266byte**,−**99,375101%** rispetto ai718.776.848byte REL001. Tar REL002 storico4.577.280byte,non rigenerato inutilmente. Ogni file del nuovo `_site` coincide con il manifest REL002; test HTTP senza fallback al repository.

Riusate [evidenze browser REL002](evidence/REL002/browser-results.json) e [rapporto U9](U9_REPORT.md), grazie all'identità completa dell'artefatto e dei269file sorgenti/test/asset: desktop1440×900/mobile390×844,shell,CSS,font locali,targa brass/Federo,WebGL2,Train Dock,Menu e accesso ai documenti pubblici. Fixture Auth locale dichiarata in quelle prove; non certifica OAuth reale. Nessuna nuova esecuzione di tutta la matrice ferroviaria o del browser in questo gate.

## Procedura post-deploy — da eseguire solo dopo merge autorizzato

1. Verificare ancora main e HEAD PR, assenza divergenze, stato dei gate; ottenere autorizzazione esplicita Regia al merge. Non abilitare auto-merge.
2. Dopo il merge autorizzato registrare SHA effettivo di main e run Pages partito automaticamente da quel push. Verificare che il run riguardi esattamente loSHA integrato, che build/upload/deploy terminino con successo e che il deployment pubblico corrisponda alrun. Non usare workflow_dispatch per aggirare failure.
3. Su `https://epivic-lab.github.io/SerieN/`, verificare tutti i97percorsi del manifest REL002:HTTP200,hash del bundle/CSS/font/texture/sprite/asset/documenti;97file e stessa chiusura pubblica. Usare risposte di rete fresche e distinguere cache/CDN da release realmente servita. Verificare404 per archivi esclusi e assenza di fallback di sviluppo.
4. Desktop1440×900 e mobile390×844: effettuare **OAuth reale** con account autorizzato,senza fixture; verificare shell,font locali/targa,canvas,Train Dock,Menu,Layout/Catalog/Projects/Depot,link Track plan e dipendenze pagina pubblica. Controllare console/rete:zero nuovi errori/404 runtime/Google Fonts. Progetti e inventario restano session-only,nessuna nuova persistenza o operazione fisica/cloud.
5. Registrare risultati,screenshot,limiti e SHA; in caso di errore fermare l'accettazione e sottoporre alla Regia il piano di rollback,senza eseguirlo automaticamente. GPU fisica/OAuth live richiedono prove reali: gli smoke SwiftShader storici non li sostituiscono.

## Rollback documentato — NON ESEGUITO

Baseline produttiva nota: `184cc9ba93a6b35493f365b2ffcb20ef0645963d`. Se pubblicazione fallisce verificare prima quale deployment è ancora effettivamente servito; non assumere che un jobfallito abbia sostituito la versione precedente. Conservare SHA,runID e log del failure.

Con nuova autorizzazione Regia, preparare un branch di rollback dall'**attuale** main e un commit che annulli l'integrazione della release: per un mergecommit usare il revert del merge rispetto al parent main (esempio operativo da adattare/verificare: `git revert -m 1 <mergeSHA>`),senza reset/force-push. Verificare il parent main contro la baseline e gli eventuali commit successivi per non annullare lavoro indipendente. Rieseguire build/test/packaging della versione ripristinata,aprire PR separata e attendere approvazione almerge. Il push approvato su main avvierà il normale workflow Pages; verificare deployment e asset/hash della versione ripristinata,non il manifest97file della release V2.1. Nessun rollback Auth/Supabase/RLS è previsto perché questa release non li modifica. Non modificare trigger per forzare una pubblicazione.

## Limiti e STOP

**NOT VERIFIED:** OAuth/SDK Auth/Supabase live,nuova pubblicazione Pages e upload remoto,fluidità/GPUhardware fisica,altri browser,screen reader/audio/touch fisici,conformità WCAG completa. I risultati U9/REL002 e i limiti già approvati restano validi e distinti dalle nuove esecuzioni CI locali. La whitelist documentale richiede manutenzione quando si aggiungono futuri link pubblici. Nessun blocco tecnico residuo rilevato dai gate eseguiti.

La PR resta **DRAFT** e non autorizza il merge. URL/numero,HEAD e base reali sono verificati e consegnati dopo la creazione; non registrati qui come eventi anticipati. **READY FOR REGIA MERGE REVIEW — STOP.**
