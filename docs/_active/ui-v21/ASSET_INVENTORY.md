# Inventario asset / prerequisiti — U0 non installa nulla

| Materiale | Provenienza verificata | Destinazione futura | Stato / azione necessaria |
| --- | --- | --- | --- |
| V1 tokens/CSS/6 texture/sprite | Archivio SHA in PROVENANCE; V1 40 file identici al branch design congelato | ui/css/tokens.css, serien-ui.css; ui/assets/textures; ui/assets/svg | DISPONIBILE come reference; NON INSTALLATO. Confrontare bytes prima/dopo copia, sprite TM append solo alla copia applicativa. Mai cambiare V1 congelato |
| V2.1 tokens/CSS/materiali TM | design-baseline/serien-mainui-v21/design/tokens e css; manifest verificati | ui/css/tokens-tm.css, serien-ui-train-management.css | DISPONIBILE, NON INSTALLATO; no riscrittura del design. Staging fixture U1, attivazione da U2 |
| Cinzel Decorative 700 | Solo nome e link Google Fonts nei materiali, WOFF/licenze non inclusi | ui/fonts/CinzelDecorative-700.woff2 + licenza famiglia | **MISSING**. Prima di U1 acquisire fonte ufficiale/versione, file font, testo OFL/copyright e condizioni del pacchetto esatto; registrare URL originario, famiglia/peso, SHA-256, byte e licenza |
| Federo 400 | Come sopra | ui/fonts/Federo-400.woff2 + licenza famiglia | **MISSING**, stesso gate prima U1 |
| Cutive Mono 400 | Come sopra | ui/fonts/CutiveMono-400.woff2 + licenza famiglia | **MISSING**, stesso gate prima U1 |
| Manifest licenze font complessivo | Da generare dopo acquisizione autorizzata | ui/fonts/manifest.json, licenze per famiglia + indice | **NOT VERIFIED**. Non assumere che un unico OFL senza titolare/versione basti per tutte le famiglie; nessun font sostitutivo o hash previsto inventato |
| Miniature 3/4 e fallback | assets/locomotive-thumbnails e rolling-stock-thumbnails applicativi 91722fb | Riutilizzo stesso percorso | DISPONIBILE, IN USO. PNG della reference hanno bytes diversi ma pixel RGBA identici; fallback SVG pure diverso per bytes. Nessuna sovrascrittura/duplicazione |
| Viste laterali + manifest coupler/bounds | assets/rolling-stock-sides e src/train-side-layout.js applicativi | Stessi percorsi/getter reali | DISPONIBILE, IN USO; scala/ordine/dimensioni dall'app, non sideLayout mirror |
| Schema/layout SVG | network canonico, next-switch-view/schemaSVG, JMRI SVG applicativi | Proiezioni nello stesso renderer/DOM | DISPONIBILE, IN USO. Non usare mock HUD, mock lay/sc/mr o statiche connessioni reference |
| Screenshots/PDF/library/reference | Archivio ricostruito, file-inventory.json completo | Solo documentazione di confronto | DISPONIBILE; mock/fallback font. Non prova del motore; no screenshot gate finale per font reali |
| JS reference e inline V1 | tm-reference, tm-catalog, tm-shell-v21, simulazione V1 | **NESSUNA** destinazione nel bundle | ESCLUSO INTEGRALMENTE, anche import parziale o copia di store/catalogo; non è un modulo di produzione |
| Codice UI adapter | Registry e A01–A13 | src/ui e sole viste autorizzabili | NON IMPLEMENTATO. Nessuna nuova dipendenza runtime necessaria; U0 non crea src/ui |

Provenienza e integrità: [PROVENANCE.json](PROVENANCE.json) riferisce manifest già versionati, senza duplicare 36,75 MB. File font e licenze non sono già completi: **gate d'ingresso U1 non soddisfatto** finché acquisizione/verifica non siano avvenute con autorizzazione appropriata. Questo limite non impedisce la review documentale U0. Scaricare/installare o attivare font non è stato autorizzato in U0.
