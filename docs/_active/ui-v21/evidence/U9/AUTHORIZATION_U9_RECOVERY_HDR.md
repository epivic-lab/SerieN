# SERIEN — U9 RECOVERY + CORREZIONE DESIGN CLAUDE

**Modello: GPT-6 — Reasoning Extra High**

## 1. Mandato

L'esecuzione di **U9 — Final Integration, Responsive, Accessibility & Quality Acceptance** è stata interrotta per esaurimento dei token.

Devi riprendere U9 dal punto effettivamente raggiunto, preservando tutto il lavoro valido.

La Regia ha inoltre identificato una **non conformità visiva nell'header**: la scritta "Autumn Railways" non rispetta il design Claude V2.1 approvato.

Sei autorizzato a correggere questo specifico problema all'interno di U9, oltre a completare il mandato U9 originale.

**Non riavviare U9 da zero. Non iniziare nuove fasi.**

## 2. Repository e baseline

Repository: `epivic-lab/SerieN`

Workspace previsto: `/workspace/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U8 approvato:

`30c56aa28e60ce83fe0cbb36209006752325bea8`

Main produttiva:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

La Regia ha verificato GitHub dopo l'interruzione:

- Nessun commit U9 pubblicato sul branch.
- HEAD remoto ancora coincidente con U8.
- `U9_REPORT.md` non presente sul remoto.
- Main invariata.

Questi dati non dimostrano l'assenza di modifiche locali U9.

## 3. Recovery obbligatorio

Prima di modificare file, controlla:

```bash
pwd
git status --short
git branch -vv
git rev-parse HEAD
git log -8 --oneline --decorate
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
git worktree list
```

Verifica il remoto con fetch non distruttivo.

Recupera:

- Modifiche U9 staged e unstaged.
- Eventuali commit locali.
- File untracked.
- Test ed evidenze già prodotti.
- Screenshot.
- Report parziali.
- Failure e correzioni già completate.
- Eventuali note di avanzamento.

Classifica le attività U9 in:

- Complete.
- Partial.
- Not started.
- Not verified.
- Failed.

**Non cancellare lavoro valido e non duplicare attività già completate.**

Vietati reset hard, clean, checkout distruttivi, force push e rebase distruttivi.

Se il workspace non è recuperabile in sicurezza, STOP e documenta il blocco.

## 4. Difetto visivo confermato dalla Regia

La Regia ha esaminato un'anteprima dell'applicazione.

Nell'header attuale:

- La targa principale SERIE N è presente.
- "Autumn Railways" compare come testo piccolo e poco leggibile.
- Il testo è separato dalla sua superficie di ottone.
- Manca la piastra metallica prevista nel design approvato.

**Il risultato NON è conforme alla reference Claude.**

La causa è identificabile nella baseline U8.

In `src/ui/shell.js`, la funzione di costruzione dell'header contiene sostanzialmente:

```js
inner.append(
  plaque,
  el('span', 'u2-edition', 'Autumn Railways'),
  el('span', 'sp')
);
```

L'elemento `.u2-edition` non rappresenta la targa originale.

Questa scelta fu introdotta in U2 e non corretta nelle fasi successive.

U9 deve correggere la non conformità senza alterare l'architettura della shell.

## 5. Fonte originale del design Claude

La Regia ha verificato nel repository i seguenti file frozen:

- `ui/css/serien-ui.css`
- `ui/css/serien-ui-u2.css`
- `ui/css/tokens.css`
- `ui/assets/textures/brass-brushed.jpg`
- `ui/assets/svg/serien-sprite.svg`
- `docs/_active/ui-v21/PROVENANCE.json`

Il CSS è stato estratto dalla reference Claude approvata.

Il pacchetto originale è:

`serien-codex-package-ui-v21.zip`

SHA-256:

`9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d`

Se il pacchetto originale è ancora disponibile localmente, consulta anche:

- Reference HTML del Main UI.
- Specifiche `SPEC_UI_V21.md`.
- Eventuali screenshot originali dell'header.
- Markup originale della piastra.

Non assumere che un file non presente in GitHub esista nel workspace.

**La fonte visiva autoritativa è il design finale approvato, non una ricostruzione creativa.**

## 6. Specifiche della piastra "Autumn Railways"

Nel CSS Claude congelato la componente è identificata dalla classe:

`.edp`

Attenzione: esistono regole successive che prevalgono sulle definizioni intermedie.

Devi applicare **la cascata finale effettiva**, non fermarti alla prima definizione di `.edp`.

Le caratteristiche verificate sono:

### Materiale

Piastra in ottone spazzolato.

Texture originale:

`ui/assets/textures/brass-brushed.jpg`

Gradiente metallico approvato:

- `#f8e6ae`
- `#dcb865`
- `#b48b45`
- `#e3c577`

La texture è sovrapposta al gradiente tramite `background-blend-mode: overlay`.

Nessun fondo trasparente che lasci apparire semplicemente lo smalto verde.

### Geometria finale

La versione finale usa:

- Altezza 46 px su desktop.
- Altezza 44 px nel breakpoint mobile.
- Bordo rettangolare con angoli arrotondati.
- Padding orizzontale derivato dalle ultime regole CSS.
- Filetto interno inciso tramite `:before`.
- Ombre esterne e rilievi interni.

Non utilizzare la primitiva ovale delle prime regole come geometria definitiva.

Non implementare la precedente versione sospesa ai ganci: le regole successive hanno disabilitato quell'animazione e introdotto le viti.

### Viti decorative

Il design finale definisce:

- `.scr`
- `.scr.l`
- `.scr.r`

Sono due viti metalliche decorative collocate sui lati della piastra.

Utilizza le risorse SVG/CSS già presenti nella reference.

Non sostituirle con emoji o semplici punti testuali.

### Scritta incisa

Il testo corretto è:

**AUTUMN RAILWAYS**

Con:

- Font Federo.
- Peso 400.
- Maiuscole.
- Dimensione e tracking derivati dalle regole finali.
- Colore bruno inciso `#5a3d10`.
- Ombreggiature chiare e scure che simulano l'incisione.
- Contrasto leggibile sul materiale metallico.

Non rendere la scritta come testo grigio libero sopra lo sfondo smaltato.

Non sostituire Federo con Cutive Mono.

### Ornamenti

Verifica l'uso originale delle classi ornamentali `.lf` e degli SVG della reference.

Lo sprite approvato include:

`emb-maple`

Se la reference conferma l'utilizzo dell'emblema sulla piastra, riutilizzalo esattamente.

Non inventare ornamenti ulteriori.

### Responsive

La targa deve essere accanto alla placca SERIE N quando la larghezza disponibile lo consente.

Su viewport stretti:

- Nessuna sovrapposizione.
- Nessun testo esterno alla piastra.
- Nessuna alterazione della barra Menu.
- Nessuna perdita dei comandi.
- Nessun overflow orizzontale.
- Viti e incisione proporzionate.
- Adattamento secondo i breakpoint frozen.

Verifica i computed styles finali, non soltanto le dichiarazioni CSS.

## 7. Correzione tecnica richiesta

È autorizzata una modifica strettamente visuale al markup in:

`src/ui/shell.js`

e una limitata aggiunta di CSS scoped U9 in:

`ui/css/serien-ui-integration.css`

La soluzione deve:

1. Conservare la placca principale `.plq` con SERIE N.
2. Rimuovere la rappresentazione non conforme `.u2-edition`.
3. Creare la piastra `.edp` coerente con la reference approvata.
4. Riutilizzare materiale, bordi, viti, tipografia e ornamenti originali.
5. Mantenere un solo testo accessibile "Autumn Railways".
6. Rendere gli elementi puramente ornamentali non significativi per screen reader.
7. Preservare tutti gli handler e gli ID critici della shell.
8. Evitare componenti duplicati o nuovi controller.

Non modificare i CSS frozen.

Non alterare Auth, Menu, Quality, Sign out, Train Management launcher o Bell.

Non inserire mock JavaScript della reference nel bundle.

## 8. Quality gate specifico della targa

Prima della correzione registra il difetto con evidenza.

Dopo la correzione verifica:

**DOM**

- Un solo elemento `.edp` visibile.
- Nessun vecchio sottotitolo libero fuori dalla piastra.
- Un solo testo accessibile Autumn Railways.
- Elementi decorativi senza azioni.
- Placca principale SERIE N preservata.

**CSS**

- Texture brass caricata localmente.
- `background-image` corretto.
- Altezza coerente con la reference finale.
- Bordo e filetto interno presenti.
- Viti laterali presenti.
- Font Federo realmente caricato.
- Contrasto e text-shadow effettivi.
- Nessuna richiesta esterna.

**Visual**

Screenshot prima/dopo:

- 1920×1080.
- 1440×900.
- 1024×768.
- 768×1024.
- 390×844.

Aggiungi almeno un crop dettagliato dell'header desktop e mobile.

Confronta la piastra con la reference Claude, quando accessibile.

Non dichiarare pixel parity se manca una reference originale confrontabile.

**Regressioni**

- Header/Menu.
- Train Management launcher.
- Quality.
- Sign out.
- Responsive.
- Focus.
- Assenza di interferenze con i controlli ferroviari.

## 9. Priorità di esecuzione dopo il recupero

Una volta recuperato il lavoro locale, procedi così:

**PRIORITÀ 1 — Correzione header**

Completa e verifica la piastra Autumn Railways.

Non ripetere la progettazione visiva: la soluzione esiste già nei materiali frozen.

**PRIORITÀ 2 — Completamento U9 residuo**

Riprendi l'audit e le correzioni già avviate:

- 66 controlli.
- 31 schermate/stati.
- Responsive.
- Leggibilità.
- Accessibilità.
- Focus e keyboard.
- Lifecycle.
- Cleanup renderer/audio/listener.
- Font e asset.
- Regressioni integrate.
- Release readiness in sola lettura.

**PRIORITÀ 3 — Accettazione finale**

Esegui il gate G-U9 sul bundle finale.

Non ricominciare test già validi se file e dipendenze interessate sono immutati.

Riesegui i test coinvolti dalle modifiche alla shell e i gate conclusivi non ancora completati.

## 10. Invarianti funzionali

Preserva tutti i contratti U0–U8, in particolare:

- R1 e dispatcher invariati.
- Quattro treni massimi.
- Tre console LRU indipendenti.
- STOP ALL senza latch.
- Space sul selezionato.
- Otto scambi protetti.
- Next Switch HUD read-only.
- Bell indipendente da UI Sound.
- Reset e generation atomici.
- Projects/Depot session-only.
- Unico renderer.
- Nessun nuovo trasferimento fisico.
- Nessuna persistenza.
- Nessuna modifica al backend.

La correzione dell'header non deve modificare alcuna logica ferroviaria.

## 11. Evidenze U9

Riutilizza le evidenze locali U9 già valide.

Conserva anche fallimenti e recuperi significativi.

Salva le evidenze nuove in:

`docs/_active/ui-v21/evidence/U9/`

Prepara una sottocartella specifica per il difetto dell'header, ad esempio:

`evidence/U9/header-engraved-plaque/`

Includi:

- Origine e root cause del problema.
- Riferimenti ai CSS frozen Claude.
- Delta DOM/CSS.
- Screenshot prima/dopo.
- Computed styles.
- Verifica font/texture/viti.
- Test di regressione.
- Hash delle fonti.
- Eventuali limiti di confronto visuale.

Non sovrascrivere le evidenze storiche U2–U8.

## 12. Deliverable conclusivi U9

Completa il mandato U9 originale.

In particolare:

- Coverage dei 66 controlli.
- Coverage delle 31 schermate/stati.
- Matrice A01–A13.
- Accessibility matrix.
- Responsive matrix.
- Regression matrix.
- Lifecycle matrix.
- Source hashes.
- Bundle SHA-256.
- Build/metafile.
- Release-readiness.
- Screenshot finali ai sette viewport.
- Evidenza specifica della piastra Autumn Railways.

Produci:

`docs/_active/ui-v21/U9_REPORT.md`

Il rapporto deve includere una sezione esplicita:

**U9-HDR — Autumn Railways Engraved Brass Plate**

con:

- Non conformità originale.
- Design Claude di riferimento.
- Root cause.
- Correzione applicata.
- Evidenze.
- Test.
- Esito.

Distingui PASS eseguiti, PASS storici, NOT VERIFIED e FAIL.

## 13. Checkpoint

Soltanto dopo il completamento dei gate:

1. Verifica il diff rispetto a U8.
2. Verifica il perimetro autorizzato.
3. Esegui i test sul bundle definitivo.
4. Crea checkpoint atomico e reversibile.
5. Esegui push fast-forward sul solo branch autorizzato.
6. Verifica HEAD locale/remoto.
7. Consegna SHA completo e rapporto.

Se i gate obbligatori non sono soddisfatti, segnala BLOCKED senza dichiarare U9 completa.

## 14. STOP assoluto

**STOP DOPO U9.**

Non iniziare altre fasi.

Non eseguire merge in main.

Non creare PR di release.

Non pubblicare GitHub Pages.

Non modificare Supabase/Auth/RLS.

Non introdurre nuova persistenza.

Non importare nuovi scenari 3D.

Non dichiarare U9 approvata autonomamente.

### Istruzione finale

**Recupera innanzitutto lo stato locale U9. Verifica e correggi la piastra Autumn Railways confrontandola con il design Claude frozen. Completa soltanto i gate U9 mancanti, poi consegna il checkpoint alla Regia e fermati.**