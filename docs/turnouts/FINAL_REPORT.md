# Interactive Turnouts — collaudo finale S7

**S7 PASS tecnico / DELIVERED dopo verifica remota; approvazione indipendente della Regia PENDING.** Regia S7 PENDING. Nessuna integrazione main o pubblicazione del simulatore autorizzata. Nessun avvio Train Management/6A/5E.

## Perimetro e storia

SerieN simulatore browser, epivic-lab/SerieN, feature/turnouts. S7 parte dal checkpoint approvato S6.1 `b627f526ff44481a814f7e4cd5ef0f84fbf30ade`, remoto coincidente e working tree pulito. La richiesta S7 attesta approvazione Regia S0–S6.1; i precedenti rapporti restano evidenze storiche con lo stato dell'epoca.

S0 fissa baseline/invarianti; S1 contratto logico puro su otto controlli, sei semplici e due WX310; S2 selezione diretta e dispatcher protetto unico; S3 glow conformale, Variante B approvata; S4 frecce sul routing canonico, reveal340ms; S5 guardia autorevole nel motore; S6 STOP scenico e campanello globale; S6.1 leggibilità notturna limitata ai materiali del cartello. Nessuna modifica runtime prevista in S7.

Gli effetti osservano il motore senza concedere movimento. UNKNOWN resta conservativo; il centro della X non diventa un nodo. La guardia usa Journey, direzione, testa e ingombri; gli effetti non sostituiscono occupazione/collisioni. STOP400/300ms e reduced motion, audio dopo gesto con MUTE e cleanup. Tre console recenti, HUD e minimappe conservati.

## Baseline 5D e prove S7

Baseline5D commit archivio `58bbe62bffb37f19125ddb38513502b5ca306821`, bundle produzione SHA256 `147b28274fe42d72c916494e3f80c516b0bc206ec98fce505f34bee457f69653`. [Gate originali](../phase-5d/FINAL_GATES.json), [confronto originale](../phase-5d/COMPARISON.md). Il profiler5D ha hash `bc87a3592a6e44f97ca8dc1d418051acb206c90c8222618eb6ff7983bf598098`. Le misure S7 vanno lette nelle condizioni Chromium/SwiftShader correnti: non equivalgono a FPS hardware o alla matrice originale completa.

[Matrice T01–T40 e piano](../_active/turnouts/evidence/S7/matrix.json), [driver riproducibile](../_active/turnouts/evidence/S7/run.py), [Pages](../_active/turnouts/evidence/S7/pages.py), [invarianti/sicurezza](../_active/turnouts/evidence/S7/invariants-security.json). Tutti i40 esiti software PASS da esecuzioni S7 fresche; limiti specifici nella matrice, prove hardware NOT VERIFIED. Gli esiti storici non sono usati al posto delle nuove esecuzioni.

## Tracciabilità delle evidenze approvate

[S4](../_active/turnouts/evidence/S4/refinement/REPORT.md), [S5](../_active/turnouts/evidence/S5/REPORT.md), [S6](../_active/turnouts/evidence/S6/REPORT.md), [S6.1 e confronto giorno/notte](../_active/turnouts/evidence/S6/S6.1/REPORT.md). Le nuove acquisizioni S7 documentano il runtime finale, senza sostituire quelle storiche.

## Limiti e autorizzazioni

GPU fisica, touch hardware, altoparlanti e screen reader reali non disponibili: NOT VERIFIED. Touch CDP, controlli semantici e rendering software non sono prove hardware. Minimo audit sicurezza non sostituisce5E. Nessuna migrazione, modifica Supabase/RLS/GRANT o dipendenza nuova autorizzata in S7.

Il checkpoint remoto sul solo branch di sviluppo è parte della consegna; non costituisce approvazione della Regia. Per main/deploy serve una nuova autorizzazione del committente dopo audit S7. Handoff futuro: macrofase Train Management esclusivamente dopo autorizzazione specifica, con vincoli ferroviari/contratti e lifecycle preservati.

## Risultati finali e prestazioni

220Node,9Python/JMRI,build produzione PASS. Suite browser S1,S2,S3,S4,S5,S6,5C e Phase0 PASS, oltre a Pages produzione desktop/mobile e controlli missioni/lifecycle. [Esiti e provenienza](../_active/turnouts/evidence/S7/results.json). I tentativi iniziali Pages sono timeout del fixture di screenshot/actionability in rendering software; ripetizione con setup DOM sincrono, Low e timeout120s PASS. Nessuna modifica runtime. Avvio benchmark interrotto intenzionalmente(-15) per isolarlo dagli extra, poi rieseguito integralmente da solo: PASS.

| Campione | p50 RAF ms | p95 RAF ms | CPU tre treni ms/step | Draw call | Triangoli | Geometrie/texture |
|---|---:|---:|---:|---:|---:|---|
| 5D |1674.95|1949.90|0.0975|367|468812|362/44|
| S4 |1624.90|1783.20|0.0995|353|467856|348/44|
| Finale S7 (label S5 del driver storico) |1599.95|1866.60|0.0920|353|467856|348/44|

p50−4.48%,p95−4.27% contro5D; CPU−0.0055ms assoluti (rumore del campione possibile, nessuna inferenza di miglioramento intrinseco). Stesso Chromium/SwiftShader, viewport650×760, Low, seed516, tre treni attivi su itinerari leciti,16frame dopo3warmup e1600step core. [Dati grezzi](../_active/turnouts/evidence/S7/performance/performance.json). Non ripetuta la matrice completa originale5D né effettuate prove GPU fisiche. Nessuna regressione sostanziale osservata nel carico comparabile.

STOP attivo: update medio0.13ms/100chiamate, memoria354geometrie/46texture stabile; dispose350/45, quattro geometrie e una texture liberate, voci/timer zero. Prima ricerca posa sincrona89ms: possibile stallo di attivazione, esplicitamente separato dal regime stabile; nessun equivalente STOP in5D, nessuna equivalenza inventata. È un limite residuo da sottoporre alla Regia, non una certificazione di fluidità hardware. Costi individuali di glow/frecce non rimisurati separatamente dal RAF integrato.

## Matrice T01–T40

40PASS,0FAIL,0NOT VERIFIED per i casi software nel perimetro documentato. Hardware e verifiche aggiuntive non eseguite restano NOT VERIFIED come limiti, senza convertirle in prove fisiche. Le quattro missioni sono state ciclate nella UI; i test dei percorsi/operazioni sono separati, non quattro nuove sessioni complete di vittoria delle missioni.

| ID | Requisito | Procedura/evidenza | Esito |
|---|---|---|---|
|T01|Panel hover identifies exact real 3D device.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T02|Device hover highlights corresponding panel control.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T03|Hit regions conform to geometry; old bulb markers absent.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T04|Panel and 3D share same guarded dispatcher.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T05|Occupancy/lock rejection identical from both surfaces.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T06|Hover/preview never changes route.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T07|Touch tap not confused with orbit drag.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T08|Keyboard focus and accessible state announcements.|interaction: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T09|Glow conforms to whole device and respects depth/occlusion.|glow: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T10|Glow readable in day/night from multiple cameras.|glow: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T11|Glow never masks rails, point blades, ballast.|glow: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T12|Reduced motion shows non-pulsing equivalent.|glow: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T13|Simple turnout arrow follows selected legal branch.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T14|Arrow remains subtly visible with no approaching train.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T15|Reverse traversal points arrow correctly.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T16|WX310 straight uses both legal through paths.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T17|WX310 crossover uses both real legal diagonals.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T18|WX crossing center introduces no spurious connection.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T19|Two WX × two states × four entry ports verified.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T20|UNKNOWN/nonfinite state never produces fictional route.|arrows: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T21|Valid trailing-point approach does not trigger false STOP.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T22|Invalid approach stops before protected limit.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T23|Journey head + consist length, never Euclidean-only.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T24|High dt / resume cannot tunnel past limit.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T25|Multi-train simultaneous hazards handled correctly.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T26|Safe reversal clears hazard and scenic warning.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T27|Voluntary stop never auto-restarts.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T28|STOP ALL retains precedence.|guard: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T29|STOP sign scale, scene and ground placement correct.|stop: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T30|Bell requires gesture, supports mute and lifecycle.|stop: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T31|Reset/dispose does not leak listeners, geometry or audio.|stop: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T32|150 rail meshes and canonical layout hash unchanged.|contract: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T33|Ballast unchanged at turnouts; no local stylization.|contract: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T34|Three loops, four sidings, runaround and missions regressions pass.|phase0: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T35|Three consoles/HUD/minimaps/plancia dimensions unchanged.|phase0: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T36|`npm test` and `npm run build` green.|node-build: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T37|Desktop/mobile/browser touch and GitHub Pages base path.|pages: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T38|Performance comparisons against real 5D baseline.|performance: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T39|No secrets, new network egress, DB/schema/permission changes.|security: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|
|T40|Final report exists; active specs removed or superseded.|documentation: [matrice dettagliata](../_active/turnouts/evidence/S7/matrix.json)|PASS|

## Evidenze visive e invarianti

[Home wide](../_active/turnouts/evidence/S7/stop/home-wide.png), [Follow Train](../_active/turnouts/evidence/S7/stop/follow-train.png), [STOP giorno](../_active/turnouts/evidence/S7/stop/stop-day.png), [notte](../_active/turnouts/evidence/S7/stop/stop-night.png), [due rischi](../_active/turnouts/evidence/S7/stop/two-risks.png), [reduced motion](../_active/turnouts/evidence/S7/stop/reduced-motion.png), [desktop Pages](../_active/turnouts/evidence/S7/pages/1280.png), [mobile Pages](../_active/turnouts/evidence/S7/pages/390.png). Il cartello giorno/notte è pixel-identico a S6.1, [confronto](../_active/turnouts/evidence/S7/approved-stop-comparison.json). [Campanello](../_active/turnouts/evidence/S7/stop/bell.wav).

Per semplici/WX-A/WX-B/glow/frecce, restano pertinenti le [camere approvate S4](../_active/turnouts/evidence/S4/refinement/visual/GALLERY.md); sorgenti grafiche immutate e nuove suite S3/S4 sul finale documentano la riproducibilità, senza duplicare gallerie già approvate.

150rotaie/75letti verificati dal manifest S1 fresco; canonico rigenerato senza diff, hash `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`. Nessuna variazione di geometrie Kato, ballast, backend, dipendenze o motore nel collaudo. Minimo scan credenziali sorgenti/bundle PASS, controller ID/input invalidi coperti da Node; moduli nuovi senza fetch/eval/Function/innerHTML. Non è audit completo5E.

## Ritiro operativo e consegna

La specifica PDF/MD e STATUS in docs/_active/turnouts sono **ritirati operativamente e resi non attivi** da README e AGENTS: restano consultabili come archivio storico per conservare bytes della Master Spec, manifest delle evidenze e link esistenti. Non sono istruzioni per proseguire lo sviluppo. Questo rapporto è il documento permanente di consegna; approvazione S7 PENDING. Nessun link storico viene reso pendente.

Checkpoint: commit che introduce questo rapporto finale e la matrice S7, risolvibile con `git log -1 --format=%H -- docs/turnouts/FINAL_REPORT.md`; SHA completo locale/remoto nella consegna. Normale push sul solo feature/turnouts; no main, merge, rebase, reset o deploy. **STOP per audit indipendente della Regia.**
