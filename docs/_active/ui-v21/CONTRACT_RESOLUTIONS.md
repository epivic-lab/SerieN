# Decisioni tecniche normalizzate U0

Tutte le decisioni sono contratti documentali per la futura implementazione. Nessun comportamento del runtime è stato modificato.

| # | Decisione definitiva | Sorgente reale / esito documentale |
| --- | --- | --- |
| 1 | Sign out via `logout.addEventListener`, guard prima del listener senza duplicazioni | auth-gate.js; A01/A02. Niente `.onclick` né funzione Auth ricopiata |
| 2 | Exit to title disabilitato con motivo, senza handler operativo | Nessuna title screen/API oggi; distinzione da Sign out conservata |
| 3 | Conferme async soltanto con coordinator atomico e migrazione completa dei call site UI | A03. Il booleano sincrono non diventa Promise in un if |
| 4 | Condizione sessione reale: `projects.dirty || projects.hasProjects || inventory.size > 0` | train-management.js. Nessun `hasSession` mock; chiusura TM scarta solo draft secondo discard e non svuota progetti/inventario |
| 5 | ID console selezionata e `#stop` unici; Space usa stop selezionato | train-deck.js / app.js, A07/A10; nessun latch STOP ALL |
| 6 | setZoom/status Guarded Stop non sono API pubbliche disponibili | Closure train-side-view / guarded-stop-scene: A05/A06. Vietato documentarle come esportazioni attuali |
| 7 | HUD read-only e diagramma reale | next-switch-view.js/schemaSVG/next-switch.js; nessuna azione scambi dal HUD |
| 8 | Bell unico controller reale, indipendente da UI Sound | guardedStops.bell e snapshot, A06; non si riscrive guarded-stop-bell |
| 9 | Comando speed percentuale distinto da velocity dinamica | Fleet/railway-step reali, scala layout/s (`MOTION.speedScale`), A07. Nessun km/h fittizio |
| 10 | Log stringa completa persistente; niente severity/KPI motore aggiunti | A09, eventuale classificazione solo grafica conservativa |
| 11 | Un solo ordine CSS finale e nessuna attivazione globale anticipata | Ordine e staging sotto, A12; sostituisce l'alternativa ambigua di ASSET_LAYOUT |
| 12 | Font da acquisire/verificare **prima di U1**; asset non ancora completi | A13, ASSET_INVENTORY. U0 non scarica/installa font |
| 13 | Riutilizzare miniature/manifest applicativi | 28 PNG stessi pixel ma hash diversi; nessuna sovrascrittura per hash; fonte applicativa 91722fb |
| 14 | JavaScript reference escluso integralmente dal bundle | V1 inline e tm-catalog/tm-reference/tm-shell-v21 sono esempi visivi, mai import/copy nel runtime, nemmeno catalogo o mirror store |

## Contratto CSS unico

Ordine **finale del documento applicativo migrato**, da verificare in ogni regione attivata: `style.css` (solo regole legacy ancora necessarie, da scoping/rimozione regionale autorizzata) → `ui/css/tokens.css` → `ui/css/serien-ui.css` → `ui/css/tokens-tm.css` → `ui/css/serien-ui-train-management.css` → `ui/css/serien-ui-integration.css` **ultimo**. Font-face locali nel foglio integration o foglio locale collegato al suo inizio, senza cambiare i nomi famiglia. Mai riportare legacy in coda dopo integration; nessun secondo ordine alternativo.

**U1 ha solo staging dei file/fixture isolata:** niente link dei fogli globali in index.html prima di U2. Questo è l'adattamento conservativo del piano: il prompt originale U1 che collegava CSS globali aspettandosi UI invariata non viene eseguito letteralmente. U2 può attivarli per regioni solo dopo prova cascade e isolamento delle regioni legacy; se non è possibile senza alterare parti non autorizzate, STOP, senza ampliare la fase. `serien-ui-integration.css` può contenere soltanto regole necessarie, commentate con CTRL/motivo, non un redesign.

La baseline dei fogli V1/V2.1 resta byte-identica; eventuale rimozione dell'`@import` Google Fonts nella **copia destinata all'app** è l'eccezione documentata dal dossier per self-host/offline, con diff esatto e nessun cambiamento del design congelato. `@font-face` da solo non annulla un `@import`: gate U1 deve controllare richieste esterne, URL texture, sprite, weights e licenze.

## Stati e transizioni da conservare

- Dialogo TM: closed → open; close dirty → guard → keep=open / discard=cancel draft e close; close clean segue discard reale. Guard è uno stato transitorio esplicito mancante nella lista sintetica originale. Tab TM cambia la vista mantenendo draft: il wildcard «any switch» dello schema non impone discard a ogni tab.
- Nuovo progetto/copy/open altro: guard se dirty; cancel ritorna alla versione confermata; confirmed-view è selezione di snapshot, Edit apre una bozza. Link/Re-link solo draft. Conferma inventario riconciliato sui confermati, senza mutare R1.
- Reset confermato: stesso reset reale; generation++ rende stale i riferimenti fisici M2. Progetti, inventario virtuale e prenotazioni ancora valide restano; non inventare UUID fisici persistenti tra reset.
- Inventario: available → reserved per slot confermato compatibile libero; release o conferma che invalida slot → available con notice; remove solo available e dopo consenso UI. Draft/cancel non rilascia prenotazioni valide.
- Intenti pending sono invalidati da dispose e rivalidati al consenso se source/generation/item cambia. Non applicare callback catturate prima di un reset a una nuova generazione.

La correzione branch/base/M3 è già decisa dal mandato, non un futuro gate di merge: `codex/ui-v2-integration@91722fb` applicativo, M3 approvata. Zero trains rimane stato difensivo; nessun delete train/project o trasferimento fisico nuovo. Tutti i dati ferroviari restano autorità esclusiva R1/M1/M2/M3.
