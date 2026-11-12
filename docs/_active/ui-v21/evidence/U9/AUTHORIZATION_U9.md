# SERIEN — AUTORIZZAZIONE U9
## UI V2.1 — Final Integration, Responsive, Accessibility & Quality Acceptance

**Modello: GPT-6 — Reasoning Extra High**

### 1. Mandato della Regia

La Regia ha approvato tutte le microfasi U0–U8, inclusa U8 dopo revisione indipendente di GitHub, sorgenti, test ed evidenze.

Sei autorizzato a eseguire esclusivamente:

**U9 — Responsive, Accessibility, Integrated Regression & Final UI Acceptance.**

Repository: `epivic-lab/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U8 approvato:

`30c56aa28e60ce83fe0cbb36209006752325bea8`

Checkpoint U7:

`cca11fb76d36e9688f41392fa1592b9a3514dce9`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica lo stato corrente del repository, l'ancestry, HEAD locale/remoto, upstream e working tree.

**U9 è una fase di consolidamento, correzione e accettazione, non di sviluppo di nuove funzionalità.**

Non effettuare merge o deploy.

### 2. Fonti di autorità

Consulta prima di intervenire:

- `AGENTS.md`
- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/STATUS.md`
- `docs/_active/ui-v21/U8_REPORT.md`
- Pacchetto design V2.1 approvato e reference frozen.

Contratti da verificare: **A01–A13**.

Registro complessivo: **66 controlli e 31 schermate/stati di riferimento**.

I controlli e le schermate future, mock-only o non implementabili non autorizzano nuove funzionalità: devono essere verificati come esclusi, disabilitati o puramente informativi secondo il contratto approvato.

### 3. Strategia di esecuzione

Non ricominciare le microfasi U2–U8.

Inizia con un audit di copertura e individua soltanto:

- Difetti effettivi.
- Regressioni.
- Gap responsive.
- Gap accessibilità.
- Problemi di lifecycle/cleanup.
- Disallineamenti visivi rispetto al design frozen.
- Rischi di packaging e release.

Conserva tutte le implementazioni già approvate.

**Non riprogettare componenti funzionanti soltanto perché una variante grafica sembra più gradevole.**

Correggi le lacune documentate con delta minimi, verificabili e reversibili.

### 4. Perimetro autorizzato

Sono consentiti:

- CSS integration e style, con modifiche motivate.
- Markup UI necessario a correzioni reali.
- Piccoli interventi di presentazione/accessibilità nei moduli UI.
- Correzioni di focus, keyboard, cleanup e dispose.
- Test di accettazione integrata.
- Documentazione ed evidenze U9.

Sono vietati:

- Modifiche al dominio ferroviario R1.
- Cambi al dispatcher o alla topologia.
- Modifiche ai dati M2/M3.
- Nuove funzionalità ferroviarie.
- Nuova persistenza.
- Cambi Auth/Supabase/RLS.
- Modifiche agli asset o alla scenografia 3D.
- Nuovi controller paralleli.
- Dipendenze non necessarie.
- Modifiche ai workflow di deploy.
- Merge, PR di release o pubblicazione.

Se una regressione richiede necessariamente una modifica fuori perimetro, segnala BLOCKED e presenta alla Regia il delta minimo necessario.

### 5. Copertura di tutti i controlli

Costruisci una matrice finale derivata direttamente da `CONTROLS.json`.

Per ciascuno dei 66 controlli registra:

- Identificativo.
- Regione/schermata.
- Stato implementato.
- Callback effettivo.
- Autorità funzionale.
- Stato enabled/disabled.
- Eventuale dipendenza da Session only.
- Evidenza funzionale.
- Evidenza visuale/accessibilità.
- Eventuali limitazioni.

Distingui i controlli reali da quelli intenzionalmente non operativi.

Nessun controllo deve essere presentato come funzionante se non possiede un contratto reale.

Non interpretare un pulsante disabilitato intenzionalmente come un difetto.

Verifica il mapping delle 31 schermate/stati da `SCREENS.json`, distinguendo implementazioni reali, future, escluse e reference.

### 6. Responsive finale

Verifica l'applicazione completa ai sette viewport:

- 1920×1080
- 1440×900
- 1280×800
- 1024×768
- 820×1180
- 768×1024
- 390×844

Controlla l'interazione tra:

- Header/Menu.
- Viewport 3D.
- Camera toolbar.
- Next Switch HUD.
- Guarded Stop/Bell.
- Operations Log.
- Sidebar.
- Railway map.
- Train Dock.
- Global controls.
- Train Management.
- Layout e Catalog.
- Projects/Composer/Compare.
- Depot.

Verifica overflow, sovrapposizioni, scrolling, stacking, backdrop, pointer picking e regioni inaccessibili.

Il viewport ferroviario deve rimanere utilizzabile.

Non introdurre overlay invisibili che intercettano gli eventi 3D.

### 7. Leggibilità e gerarchia informativa

Affronta i rilievi visuali accumulati in U2–U8.

In particolare:

**Train Dock**

Le etichette dei treni, lo stato e le informazioni operative secondarie devono essere leggibili senza compromettere le card.

**HUD e Sidebar**

I motivi dei blocchi ferroviari e i warning devono risultare comprensibili senza hover.

**Projects/Composer**

Su mobile il rail e l'inspector devono rimanere navigabili senza perdere il contesto del progetto.

**Compare**

I cinque stati devono essere distinguibili e le informazioni essenziali devono precedere gli UUID tecnici.

**Depot**

Migliora la gerarchia tra nome modello, codice virtuale, stato, progetto e slot prenotato.

Gli UUID completi devono rimanere consultabili, ma non necessariamente occupare la parte visivamente dominante della card.

Riduci la densità eccessiva senza eliminare informazioni importanti o modificare il dominio.

Preferisci interventi mirati su tipografia, spaziature, larghezze, gerarchia ed espansione dei dettagli.

Non introdurre nuovi componenti complessi quando bastano correzioni CSS.

### 8. Accessibilità

Verifica almeno:

**Tastiera**

- Navigazione Tab e Shift+Tab.
- Focus visibile.
- Keyboard del carousel.
- Keyboard delle tab TM.
- Scorciatoie locali Composer.
- Space ferroviario sul solo treno selezionato.
- Escape sul dialogo corretto.
- Nessun comando ferroviario accidentale mentre si scrive.

**Dialoghi**

- Focus iniziale corretto.
- Focus trap dove previsto dal dialog nativo.
- Ritorno focus al launcher.
- Backdrop/Escape.
- Pending e double confirmation.
- Nessuna mutazione prima del consenso.

**Semantica**

- Label e aria-label.
- Ruoli coerenti con il comportamento effettivo.
- Stati disabled.
- Messaggi di errore e status.
- Tab selezionata.
- Controlli grafici con nome accessibile.
- Nessun ID DOM duplicato.

**Touch**

- Target interattivi principali almeno 44×44 CSS px, salvo eccezioni motivate.
- Nessuna interazione esclusivamente hover.
- Scroll, slider, carousel e controlli raggiungibili.

**Preferenze utente**

- `prefers-reduced-motion`.
- Contrasto sufficiente.
- Focus visibile anche con colori e materiali scuri.
- Nessuna perdita di contenuti con zoom browser e ingrandimento del testo nei limiti ragionevolmente supportati.

Utilizza controlli automatici e ispezione manuale/DOM quando disponibili.

Non dichiarare certificazione completa WCAG o screen reader senza verifiche adeguate.

### 9. Font e asset — A12/A13

Verifica nuovamente:

- Cinzel Decorative 700.
- Federo 400.
- Cutive Mono 400.
- File WOFF2 locali.
- Licenze OFL.
- Provenienza e checksum.
- Caricamento offline.
- Computed font-family e font-weight reali.
- Assenza di richieste Google Fonts runtime.

Non sostituire silenziosamente i font.

Conserva i CSS frozen approvati e l'ordine della cascade.

Verifica la distribuzione effettiva degli asset referenziati dall'app.

### 10. Lifecycle, risorse e cleanup

Verifica che l'integrazione completa non introduca:

- Listener duplicati.
- Dialoghi orfani.
- Handler attivi dopo dispose.
- Callback pendenti dopo reset.
- Doppie conferme.
- Leak evidenti di risorse DOM.
- Secondi renderer.
- Canvas duplicati.
- Audio context impropri.
- Risorse GPU non rilasciate dai controller coinvolti.
- Fetch esterne impreviste.
- URL temporanei non revocati quando applicabile.

Controlla cicli ripetuti di:

Open → Close → Reopen → Reset → Dispose.

Includi Train Management, Projects, Depot e guard condivisa.

Non riscrivere l'architettura dei controller per correggere un singolo listener.

### 11. Invarianti ferroviari obbligatori

La UI integrata deve preservare:

1. Motore R1 e dispatcher reali.
2. Quattro treni massimi.
3. Tre console recenti LRU indipendenti dalla flotta.
4. STOP ALL momentaneo, senza latch.
5. Space sul treno selezionato.
6. Otto scambi protetti.
7. Next Switch HUD read-only.
8. Guarded Stop Bell indipendente da UI Sound.
9. Operations Log reale, senza timeout artificiale.
10. Un solo renderer.
11. Pointer picking di treni e scambi.
12. Camera e Follow originali.
13. Pause/Resume.
14. Add Train protetto.
15. Coupling/uncoupling R1.
16. Reset atomico.
17. Generation e STALE corretti.
18. Projects M2 session-only.
19. Depot M3 session-only.
20. Nessun Apply globale o trasferimento fisico Depot/binari.

Non introdurre mock, eventi fittizi o telemetria non esistente.

### 12. Regressioni integrate

Implementa `G-U9` come definito in `TEST_GATES.json`.

Esegui i test richiesti per l'accettazione finale, usando gli harness originali e gli adapter approvati.

Copertura:

- Node.
- Python.
- Build produttiva.
- Canonico.
- R1 e dispatcher.
- Guarded Stop.
- Camera/viewport.
- U2–U4.
- Train Dock U5.
- Train Management U6.
- Projects U7.
- Depot U8.
- M1/M1.1/M2/M3.
- Focus/keyboard.
- Responsive.
- Cleanup.
- Font e asset offline.

Esegui le regressioni effettivamente necessarie per il gate finale; dove più suite testano lo stesso codice invariato, puoi riutilizzare evidenze solide con hash e provenienza.

La matrice conclusiva deve distinguere chiaramente PASS eseguiti, PASS storici verificati tramite identità dei file e NOT VERIFIED.

Non dichiarare PASS nuovi basandoti soltanto sull'esistenza di screenshot precedenti.

Non modificare le asserzioni ferroviarie per ottenere test verdi.

### 13. RAF nativo finale

Esegui almeno una sessione integrata sul **bundle produttivo definitivo U9**.

La prova deve utilizzare il vero RAF, senza sostituirlo con step manuali.

Scenario minimo:

- Tre treni in movimento contemporaneo.
- Inserimento del quarto treno quando consentito.
- Interazioni con Dock e selezione.
- Comandi individuali e STOP ALL.
- Pause/Resume.
- Scambi reali e Next Switch HUD.
- Camera/Focus.
- Apertura e chiusura TM.
- Composer e Depot durante il movimento.
- Conferma/cancel di operazioni virtuali.
- Reset e generazione.
- Verifica che i dati virtuali rimangano coerenti.

Controlla identità, geometria, stato ferroviario, scene synchronization e assenza di errori runtime.

Non trasformare questo gate in un benchmark indiscriminato.

Se esegui confronti prestazionali, usa condizioni equivalenti e descrivi metodologie e limiti.

SwiftShader non certifica FPS, fluidità o stabilità di GPU fisiche.

### 14. Verifica visiva finale

Crea una matrice di screenshot sui sette viewport.

Includi:

- Schermata principale.
- Day/Night.
- Quality Low/High.
- Stato operativo dei treni.
- STOP ALL e Pause.
- Warning ferroviari.
- Sidebar e scambi.
- Camera/HUD.
- Dialoghi di conferma.
- Train Management.
- Catalogo.
- Composer.
- Compare.
- Depot.
- Stati vuoti, dirty, invalidi e STALE.
- Responsive mobile.
- Reduced motion, quando verificabile.

Gli screenshot devono provenire dall'applicazione reale, non dalla reference Claude.

Effettua una revisione estetica comparando il design approved/frozen alle implementazioni produttive.

Rileva e correggi soltanto scostamenti significativi.

Documenta gli scostamenti deliberati necessari a preservare le funzioni ferroviarie.

### 15. Packaging e release readiness

U9 NON autorizza il deployment, ma deve individuare eventuali blocchi futuri alla pubblicazione.

Verifica in sola lettura:

- Bundle e asset richiesti.
- Percorsi relativi.
- Font locali.
- CSS e sprite.
- Copertura del pacchetto di distribuzione.
- Compatibilità prevista con GitHub Pages.
- Eventuali dipendenze da path assoluti.
- Eventuali file UI non inclusi dal workflow attuale.
- Assenza di richieste esterne indesiderate.

**Attenzione:** nelle precedenti revisioni è emerso il rischio che il workflow Pages non includa ancora tutti i nuovi asset `ui/`.

Verifica concretamente se il problema esiste ancora.

Non modificare il workflow e non pubblicare nulla.

Se il packaging della futura release richiede interventi, documentali come release blockers con file, motivazione e proposta minima per una successiva autorizzazione.

Distingui la certificazione del codice UI dalla certificazione del pacchetto pubblicabile.

### 16. Gestione delle correzioni

Per ogni problema identificato registra:

- ID.
- Componente.
- Gravità.
- Evidenza.
- Riproduzione.
- Root cause.
- File interessati.
- Correzione minima.
- Test di regressione.
- Stato finale.

Preferisci correzioni piccole e localizzate.

Non aggiungere microfasi supplementari artificiali.

Non riaprire il design approvato salvo violazioni concrete di accessibilità o comportamento.

Se emerge un problema critico fuori perimetro, segnala BLOCKED e attendi istruzioni della Regia.

### 17. Evidenze U9

Salva in:

`docs/_active/ui-v21/evidence/U9/`

Deliverable obbligatori:

- `results.json`.
- `commands.json` con exit code.
- `invariants.json`.
- `source-hashes.json`.
- `control-coverage.json` per tutti i 66 controlli.
- `screen-coverage.json` per le 31 schermate/stati.
- `accessibility-matrix.json`.
- `responsive-matrix.json`.
- `lifecycle-matrix.json`.
- `regression-matrix.json`.
- `release-readiness.json`.
- Metafile e hash bundle definitivo.
- Screenshot finali.
- Elenco issue corrette.
- Failure e recovery.
- Rischi residui.
- NOT VERIFIED.

Non copiare l'intero archivio U0–U8.

Usa riferimenti e hash quando le evidenze storiche sono ancora valide.

### 18. Rapporto conclusivo U9

Prepara:

`docs/_active/ui-v21/U9_REPORT.md`

Il rapporto deve includere:

**A. Baseline**

Checkpoint U8, HEAD, branch, ancestry e scope.

**B. Copertura**

66 controlli, 31 schermate/stati e A01–A13.

**C. Correzioni**

Delta applicativo, motivazioni e regressioni.

**D. Test**

Comandi, exit code, PASS/FAIL/NOT VERIFIED.

**E. Visual e accessibilità**

Esiti ai sette viewport e rilievi residui.

**F. Ferrovia**

Invarianti R1/M1/M2/M3 e sessioni virtuali.

**G. Risorse**

Renderer, listener, audio, cleanup, font e asset.

**H. Release readiness**

Packaging, asset, rischi e interventi eventualmente necessari.

**I. Verdetto tecnico proposto**

Una sola conclusione fra:

- READY FOR REGIA FINAL REVIEW.
- READY WITH DOCUMENTED LIMITATIONS.
- BLOCKED.

La proposta tecnica Codex non equivale ad approvazione della Regia.

### 19. Checkpoint

Soltanto se i gate obbligatori sono soddisfatti:

1. Controlla il diff rispetto a U8.
2. Verifica assenza di modifiche fuori perimetro.
3. Crea un commit atomico reversibile.
4. Esegui push normale fast-forward su `codex/ui-v2-integration`.
5. Verifica HEAD locale/remoto.
6. Riporta SHA completo.
7. Consegna U9_REPORT e tutte le evidenze.

Se rimangono failure critiche o obblighi di verifica non soddisfatti, segnala BLOCKED senza dichiarare l'accettazione completata.

### 20. STOP ASSOLUTO

**STOP DOPO U9.**

Non eseguire merge in main.

Non creare PR di release senza autorizzazione.

Non pubblicare GitHub Pages.

Non modificare Supabase/Auth/RLS.

Non introdurre persistenza.

Non importare nuove scenografie o pacchetti 3D.

Non iniziare una nuova fase di sviluppo.

La chiusura di U9 richiede un'approvazione indipendente della Regia.

La pubblicazione, l'eventuale aggiornamento del workflow Pages e l'integrazione del nuovo scenario 3D saranno decisioni successive, separate.

**Procedi ora con l'audit integrato U9, le sole correzioni necessarie e la consegna finale alla Regia.**