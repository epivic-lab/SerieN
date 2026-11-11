# SerieN — UI V2.1 | AUTORIZZAZIONE REGIA U1

## VERDETTO

La Regia ha esaminato il Font Preflight Report e le evidenze sul repository.

**FONT GATE APPROVATO.**

Autorizzo esclusivamente:

**U1 — Asset Staging & Isolated Visual Foundation**

Non sono autorizzate U2–U9.

## 1. Baseline

Repository: `epivic-lab/SerieN`

Branch obbligatorio:

`codex/ui-v2-integration`

Checkpoint PRE-U1 approvato:

`65b910bc25def1f0064a0758e29f8d5715314568`

Baseline applicativa:

`91722fbdf6671e69deebf645c3d8bf389212f421`

Main produttiva:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica HEAD remoto, working tree e baseline prima di modificare.

Mantieni il branch esistente. Nessun merge, rebase o reset.

## 2. Font approvati

I tre font sono già disponibili e verificati in:

`docs/_active/ui-v21/font-staging/`

Usa esclusivamente i WOFF2 approvati:

- Cinzel Decorative 700 — SHA-256 `da243cadfd41afd6eae0518f60d2eb1c326d4f9c383fd76abdf1aca0ea0402a3`
- Federo 400 — SHA-256 `4ba9047f6d98614d6dd1849e42803e55a383bd153cc47221b692d53eb9e5cbd1`
- Cutive Mono 400 — SHA-256 `838a23082061b6eef65b292c3fe2083d88b3051dc0551f5525f512020ab660c2`

Trasferiscili nelle destinazioni applicative di staging `ui/fonts/`, senza alterarli.

Includi le tre licenze OFL originali e un manifest con provenienza, copyright, peso, dimensione, SHA e licenza.

Non riconvertire o scaricare nuovamente i font senza necessità.

## 3. Asset grafici V2.1

Prepara la struttura prevista dal piano U0:

- `ui/css/`
- `ui/fonts/`
- `ui/assets/textures/`
- `ui/assets/svg/`

Acquisisci gli asset grafici dal pacchetto Claude precedentemente validato, SHA-256 originale:

`9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d`

Se i file non sono più presenti nel workspace, utilizza solo copie verificabili dagli artefatti disponibili; non ricostruire il design a memoria né inventare asset.

Preserva integralmente V1 e V2.1 congelati. Le modifiche necessarie all'uso applicativo devono avvenire soltanto sulle copie in staging.

Non sovrascrivere miniature, viste laterali, manifest o materiali del renderer ferroviario.

## 4. CSS e tipografia

Predisponi l'ordine unico approvato:

1. CSS legacy residuo.
2. Tokens V1.
3. CSS V1.
4. Tokens Train Management.
5. CSS Train Management.
6. CSS Integration, sempre ultimo.

**In U1 l'ordine va montato soltanto nella fixture isolata.**

Non collegare ancora questi fogli a `index.html` o al runtime produttivo.

Prepara gli `@font-face` locali con famiglia, peso, formato e percorsi corretti.

Disabilita l'eventuale import Google Fonts soltanto nella copia applicativa autorizzata, documentando il diff.

Nessuna richiesta esterna per font, texture, sprite o CSS.

Nessun peso sintetico o sostituzione automatica non dichiarata.

## 5. Fixture grafica indipendente

Crea una fixture isolata, fuori dal normale boot del simulatore, per visualizzare:

- Palette e materiali V2.1.
- Tipografia definitiva con i tre font locali.
- Bottoni, pannelli, bordi, icone e superfici.
- Un campione rappresentativo della shell.
- Un campione rappresentativo del Train Management.
- Stati visivi principali dei componenti.

Non simulare dati ferroviari come se fossero risultati dell'applicazione. La fixture è esclusivamente un ambiente di verifica del design.

Non importare nel runtime `tm-reference.js`, `tm-catalog.js`, `tm-shell-v21.js` o script mock V1.

## 6. Gate U1 obbligatori

Esegui e documenta:

- Integrità byte/hash degli asset e dei font.
- Presenza e correttezza delle tre licenze.
- Assenza di URL remoti effettivamente richiesti.
- Risposta HTTP 200 per tutti gli asset locali.
- FontFace loaded e peso/famiglia corretti.
- Nessun conflitto CSS non spiegato tra legacy, V1 e V2.1 nella fixture.
- Verifica visiva a 1440×900 con font definitivi.
- Screenshot della fixture.
- Errori browser/console/richieste fallite.
- Test della build applicativa.
- SHA del bundle confrontato con quello precedente.
- Confronto dei file runtime protetti contro `91722fb`.

Non considerare il test visivo della fixture come collaudo della UI integrata.

Se l'ordine CSS produce collisioni non risolvibili entro la fixture, documenta la causa senza intervenire nel runtime.

## 7. Divieti

NON modificare:

- `index.html`
- `style.css`
- `app.js`
- Moduli applicativi `src/`
- Engine R1
- Domini M2/M3
- Auth/Supabase/RLS
- V1 e design V2.1 congelati
- Test storici, dipendenze o workflow

NON attivare la nuova UI.

NON avviare U2.

NON eseguire merge, deploy o release.

## 8. Consegna

Produci:

**U1 ASSET STAGING REPORT**

Con:

1. Inventario dei file installati nello staging.
2. Manifest SHA/licenze.
3. Regole CSS e ordine definitivo.
4. Risultati caricamento font offline.
5. Risultati test di cascade.
6. Screenshot della fixture.
7. Test eseguiti e loro esiti.
8. Invarianti runtime.
9. Problemi residui.
10. SHA del checkpoint Git verificato.

Salva le evidenze in:

`docs/_active/ui-v21/evidence/U1/`

Non sovrascrivere evidenze U0 o PRE-U1.

Verdetto conclusivo:

**U1 READY FOR REGIA REVIEW**

oppure

**U1 BLOCKED**, con ragioni precise.

**STOP dopo U1. Nessuna U2 senza nuova autorizzazione della Regia.**