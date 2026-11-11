# SerieN — FONT PREFLIGHT REPORT / PRE-U1

**FONT GATE PASS — READY FOR U1. STOP per la Regia. U1 non autorizzata né iniziata.** U0 è approvata senza riserve al checkpoint `b9574ae71dd7ebf4039affc20d969d813b93797d`, inizialmente coincidente locale/remoto sul branch `codex/ui-v2-integration`. Baseline applicativa rimane `91722fbdf6671e69deebf645c3d8bf389212f421`.

## Acquisizione e staging

Fonte ufficiale per tutti i file: [google/fonts](https://github.com/google/fonts), commit **`c30b221beb0c1da59d563feb91ec8656a1fa972a`** (HEAD rilevata con ls-remote, download successivi fissati al commit). Percorsi `ofl/cinzeldecorative/`, `ofl/federo/`, `ofl/cutivemono/`: acquisiti TTF della variante esatta, `METADATA.pb` e `OFL.txt` della stessa famiglia/revisione. Tutti gli URL immutabili, byte e SHA-256 dei sorgenti, metadati, licenze e WOFF2 sono in [font-staging/manifest.json](font-staging/manifest.json).

L'endpoint `fonts.googleapis.com` ha restituito **CONNECT 403** per policy di rete; nessun CSS/font è stato ottenuto da quell'endpoint. `raw.githubusercontent.com` è consentito e contiene i file ufficiali. Nessun aggiramento di policy, sito terzo non verificato, installazione globale o nuova dipendenza. File esclusivamente in `docs/_active/ui-v21/font-staging/`, non attivi.

| Famiglia / variante | Versione interna | TTF ufficiale selezionato | WOFF2 byte | SHA-256 WOFF2 |
| --- | --- | --- | --- | --- |
| Cinzel Decorative Bold 700 normal | 1.002 | CinzelDecorative-Bold.ttf | 22460 | `da243cadfd41afd6eae0518f60d2eb1c326d4f9c383fd76abdf1aca0ea0402a3` |
| Federo Regular 400 normal | 1.000 | Federo-Regular.ttf | 38704 | `4ba9047f6d98614d6dd1849e42803e55a383bd153cc47221b692d53eb9e5cbd1` |
| Cutive Mono Regular 400 normal | 1.110 | CutiveMono-Regular.ttf | 30780 | `838a23082061b6eef65b292c3fe2083d88b3051dc0551f5525f512020ab660c2` |

Destinazioni future, **non create**: `ui/fonts/CinzelDecorative-700.woff2`, `ui/fonts/Federo-400.woff2`, `ui/fonts/CutiveMono-400.woff2`, rispettive licenze per famiglia e manifest. Nessun peso sintetico/italic, subset o font sostitutivo.

## Licenze e redistribuzione

Tutte le famiglie: **SIL Open Font License 1.1**. Copie integrali originali con copyright in:

- `font-staging/cinzeldecorative/OFL.txt`: Copyright (c) 2012 Natanael Gama (info@ndiscovered.com), Reserved Font Name **Cinzel**.
- `font-staging/federo/OFL.txt`: Copyright (c) 2011 Cyreal (www.cyreal.org), Reserved Font Name **Federo**. Il font identifica anche Olexa M. Volochay; entrambe le indicazioni upstream sono conservate nei file, senza riscriverle.
- `font-staging/cutivemono/OFL.txt`: Copyright 2012 The Cutive Project Authors (https://github.com/googlefonts/cutivemono); nessun RFN dichiarato nell'intestazione acquisita.

L'OFL permette uso/embedding/bundling e redistribuzione, incluso uso commerciale, con le sue condizioni: accompagnare i font con copyright e licenza; non vendere il font da solo; mantenere i font sotto OFL; non usare nomi autori per endorsement; rispettare i nomi riservati per versioni modificate. L'applicazione che usa il font non deve diventare OFL. Conservare i nomi e i testi originali in questa conversione di contenitore; eventuali modifiche future a design/subset/naming richiedono nuova verifica RFN/licenza. `OS/2.fsType=0` per tutti: coerente con embedding consentito, ma non sostituisce l'OFL. Nessuna licenza di una famiglia è stata usata per coprire le altre.

## Conversione e verifiche

Strumenti **già installati**: FontTools **4.61.1**, Node **24.19.0**, Brotli integrato Node **1.2.0**. Il modulo Python Brotli non era presente; non è stato installato. [convert_verify.py](font-staging/convert_verify.py) collega in processo isolato il codec Brotli standard `node:zlib` a FontTools (`MODE_FONT`, quality 11) e produce WOFF2 dai TTF ufficiali. Non cambia ambiente globale, package.json o lockfile.

Conversione di formato, senza subset/edizioni di glifi, nomi, pesi o metriche. Decodifica WOFF2 e confronto con TTF: name table, cmap, hmtx, contorni di **tutti** i glifi e tabelle layout GPOS/GSUB/GDEF/kern presenti, tutti uguali semanticamente/compilati. Bookkeeping head/checksum e trasformazioni standard del contenitore WOFF2 non sono checksum binari del TTF originale. FontTools segnala nell'upstream Federo una lunghezza della subtable kern oltre il campo dichiarabile: la serializzazione conserva le coppie, confronto layout PASS; warning registrato in `conversion-notes.txt`, non ignorato. Chromium carica il risultato senza console warning/error.

[check_offline.py](font-staging/check_offline.py) carica ogni WOFF2 locale con FontFace da ArrayBuffer in Chromium **154.0.8037.57**, contesto offline e rete abortita: `loaded`, `document.fonts.check`, family e weight computati corretti, `font-synthesis:none`, zero richieste, zero pageerror/console. Screenshot [offline-specimen.png](font-staging/offline-specimen.png) ispezionato. Primo harness fallito prima dei check per argomento viewport sul metodo errato, corretto al contesto; nessun font modificato dalla correzione. È una fixture di verifica isolata, non una modifica ai test baseline.

| Verifica | Cinzel Decorative 700 | Federo 400 | Cutive Mono 400 |
| --- | --- | --- | --- |
| Provenienza ufficiale / commit fissato | PASS | PASS | PASS |
| Licenza effettiva, copyright e condizioni | PASS | PASS | PASS |
| File acquisiti, hash e metadati / integrità WOFF2 decodificata | PASS | PASS | PASS |
| Famiglia, variante, peso da font e METADATA.pb | PASS | PASS | PASS |
| WOFF2 compatibile: decode e caricamento Chromium | PASS | PASS | PASS |
| Disponibilità locale/offline senza richieste | PASS | PASS | PASS |
| Condizioni redistribuzione e RFN registrate | PASS | PASS | PASS |

Hash misurati localmente e ancorati al commit sorgente; non è stata fornita una firma/checksum esterno indipendente per questi binari. Evidenze: manifest, conversion-validation.json, metadata-validation.json, offline-validation.json, screenshot e strumenti riproducibili nello staging. Nessun FAIL font irrisolto. Safari/Firefox, hardware fisico e accettazione visuale della **UI integrata** sono **NOT VERIFIED**, da trattare nelle fasi UI; non sono requisiti per dimostrare i tre file locali WOFF2 caricabili in questo preflight.

## Invarianti e consegna

Validatore documentale esistente eseguito con output separato in `font-staging/invariants.json`: **PASS**, 226 file runtime/test/config byte-identici a `91722fb`; nessuna modifica ai test/workflow/dipendenze, ad app.js/index.html/style.css/src, motore/store R1/M2/M3/Auth/Supabase o design frozen. `npm run build` PASS, bundle SHA-256 sempre `69eb83ebae0250ffe245d4ec6ede50cae3561f148f2e2973d0274f2c53b1068e`; suite baseline non ripetute. Nessun CSS/font-face attivo, nessun `ui/fonts/` installato, merge o deploy.

Sole modifiche: inventario/provenienza/stati tecnici, presente rapporto, evidenze e font/licenze in staging isolato. Checkpoint sul branch autorizzato; SHA e allineamento remoto verificati nella consegna finale. **FONT GATE PASS — READY FOR U1**, che richiede ancora autorizzazione esplicita della Regia.

Nota di conservazione: `git diff --check` segnala un trailing space in una riga di ciascun OFL.txt upstream. I tre testi sono conservati byte per byte per corrispondere agli hash ufficiali acquisiti; nessuna normalizzazione delle licenze. Il controllo whitespace dei file redatti qui, escluse soltanto queste tre licenze, passa.
