# Inventario asset / prerequisiti — PRE-U1 font in staging isolato

| Materiale | Provenienza verificata | Destinazione futura | Stato / azione necessaria |
| --- | --- | --- | --- |
| V1 tokens/CSS/6 texture/sprite | Archivio SHA in PROVENANCE; V1 40 file identici al branch design congelato | ui/css/tokens.css, serien-ui.css; ui/assets/textures; ui/assets/svg | STAGED U1 in ui/, NON ATTIVO. Confrontare bytes prima/dopo copia, sprite TM append solo alla copia applicativa. Mai cambiare V1 congelato |
| V2.1 tokens/CSS/materiali TM | design-baseline/serien-mainui-v21/design/tokens e css; manifest verificati | ui/css/tokens-tm.css, serien-ui-train-management.css | STAGED U1 in ui/, NON ATTIVO; no riscrittura del design. Staging fixture U1, attivazione da U2 |
| Cinzel Decorative 700 | google/fonts@c30b221beb0c1da59d563feb91ec8656a1fa972a; TTF ufficiale + OFL | ui/fonts/CinzelDecorative-700.woff2 + licenza famiglia | **PASS PRE-U1**, WOFF2 verificato in font-staging/cinzeldecorative, non attivo |
| Federo 400 | Stesso commit ufficiale, TTF + METADATA.pb + OFL | ui/fonts/Federo-400.woff2 + licenza famiglia | **PASS PRE-U1**, font-staging/federo, non attivo |
| Cutive Mono 400 | Stesso commit ufficiale, TTF + METADATA.pb + OFL | ui/fonts/CutiveMono-400.woff2 + licenza famiglia | **PASS PRE-U1**, font-staging/cutivemono, non attivo |
| Manifest licenze font complessivo | font-staging/manifest.json con URL immutabili, versioni, byte/SHA-256; OFL separati per famiglia | Copia futura in ui/fonts/ con tutte le licenze e manifest | **PASS PRE-U1**; copyright/RFN/condizioni documentati; niente installazione UI |
| Miniature 3/4 e fallback | assets/locomotive-thumbnails e rolling-stock-thumbnails applicativi 91722fb | Riutilizzo stesso percorso | DISPONIBILE, IN USO. PNG della reference hanno bytes diversi ma pixel RGBA identici; fallback SVG pure diverso per bytes. Nessuna sovrascrittura/duplicazione |
| Viste laterali + manifest coupler/bounds | assets/rolling-stock-sides e src/train-side-layout.js applicativi | Stessi percorsi/getter reali | DISPONIBILE, IN USO; scala/ordine/dimensioni dall'app, non sideLayout mirror |
| Schema/layout SVG | network canonico, next-switch-view/schemaSVG, JMRI SVG applicativi | Proiezioni nello stesso renderer/DOM | DISPONIBILE, IN USO. Non usare mock HUD, mock lay/sc/mr o statiche connessioni reference |
| Screenshots/PDF/library/reference | Archivio ricostruito, file-inventory.json completo | Solo documentazione di confronto | DISPONIBILE; mock/fallback font. Non prova del motore; no screenshot gate finale per font reali |
| JS reference e inline V1 | tm-reference, tm-catalog, tm-shell-v21, simulazione V1 | **NESSUNA** destinazione nel bundle | ESCLUSO INTEGRALMENTE, anche import parziale o copia di store/catalogo; non è un modulo di produzione |
| Codice UI adapter | Registry e A01–A13 | src/ui e sole viste autorizzabili | NON IMPLEMENTATO. Nessuna nuova dipendenza runtime necessaria; U0 non crea src/ui |

Provenienza e integrità del design conservate in [PROVENANCE.json](PROVENANCE.json). Aggiornamento PRE-U1: acquisiti i tre font e le rispettive licenze ufficiali; conversione WOFF2 e verifica offline PASS, [FONT_PREFLIGHT_REPORT.md](FONT_PREFLIGHT_REPORT.md). **Prerequisito font soddisfatto; U1 non autorizzata.** Font Gate storico conservato sotto font-staging/. In U1 i font sono anche copiati in ui/fonts/ e i font-face predisposti nello staging CSS, senza link o attivazione nel runtime.

U1 aggiornamento: 19 file predisposti in ui/css, ui/fonts e ui/assets (inattivi); tre font/licenze copiati senza alterazioni, manifest completo. Fixture isolata e HTTP/offline/cascade/visual1440×900 PASS. [U1_ASSET_STAGING_REPORT.md](U1_ASSET_STAGING_REPORT.md). Nessun link nel boot applicativo; U2 non autorizzata.

U2 aggiornamento: i font/asset U1 sono ora usati dalle sole regioni shell/dialoghi/auth U2 tramite copie CSS scoped e integration; file U1/frozen intatti. Le precedenti note «non attivo» descrivono lo staging U1. Vedi U2_REPORT.md e evidence/U2/css-adapters.json. Sidebar/dock/HUD/TM interni restano legacy; U3 non autorizzata.

U3 aggiornamento: autorizzazione separata acquisita; camera, HUD, Bell/status, log e startup ora riusano gli stessi materiali/font nelle sole regioni `u3-region`, tramite i contenitori scoped già esistenti. Nessun nuovo asset/font, nessuna modifica a copie CSS U1/U2 o licenze. Solo appendice U3 nel foglio integration ultimo. Sidebar/dock/TM interni restano legacy; U4–U9 non autorizzate. Vedi U3_REPORT.md e evidence/U3/invariants.json.
