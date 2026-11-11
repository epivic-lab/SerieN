# U1 ASSET STAGING REPORT

**U1 READY FOR REGIA REVIEW. STOP dopo U1; U2 non autorizzata.** Font Gate approvato e U1 autorizzata esclusivamente come Asset Staging & Isolated Visual Foundation. I due testi allegati di autorizzazione sono byte-identici; una copia conservata in `evidence/U1/AUTHORIZATION_U1.md`.

## Baseline e confini

Verificati prima di modificare: branch `codex/ui-v2-integration`, HEAD locale/remoto `65b910bc25def1f0064a0758e29f8d5715314568`, working tree pulito, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` e baseline M2/M3 `91722fbdf6671e69deebf645c3d8bf389212f421`. Nessun branch nuovo, merge, rebase, reset, deploy o release.

`index.html`, `style.css`, `app.js`, `src/`, renderer/asset ferroviari, M2/M3, Auth/Supabase/RLS, test storici/dipendenze/workflow sono **invariati**. `ui/` è soltanto staging non referenziato dal boot. Non si importa alcuno script reference; la fixture non avvia il simulatore e non presenta numeri ferroviari come risultati reali.

## Inventario installato nello staging

**19 file in `ui/`**, con SHA-256 e byte in `evidence/U1/asset-manifest.json` e in `fixture-results.json`:

| Gruppo | File / provenienza | Trasformazioni |
| --- | --- | --- |
| CSS (5) | tokens.css, serien-ui.css V1; tokens-tm.css, serien-ui-train-management.css V2.1; serien-ui-integration.css | V1/TM CSS e token TM verbatim; solo import Google Fonts rimosso da copia tokens V1; integration nuovo con tre font-face locali e font-synthesis:none per root fixture |
| Texture (6) | brass-brushed, brass-spun, enamel-green, mahogany, parchment, steel-brushed, JPG in ui/assets/textures | Verbatim dal pacchetto validato; nessun materiale del renderer toccato |
| Sprite (1) | ui/assets/svg/serien-sprite.svg | V1 conservata nella copia, prima del tag finale aggiunti i sette simboli visivi tm-i-wagon/lock/flip/x/clock/focus/copy estratti verbatim dal markup reference; nessun JavaScript. Href ../textures/brass-spun.jpg preservato: corretto per sprite esterno, non inlining nel boot |
| Font (3) | ui/fonts/CinzelDecorative-700.woff2; Federo-400.woff2; CutiveMono-400.woff2 | Copie byte-identiche ai WOFF2 PRE-U1 approvati; nessun nuovo download/conversione |
| Licenze (3) | ui/fonts/OFL-CinzelDecorative.txt, OFL-Federo.txt, OFL-CutiveMono.txt | Copie integrali dei tre OFL upstream approvati, copyright/RFN preservati |
| Manifest (1) | ui/fonts/manifest.json | Fonte ufficiale, commit, versione, famiglia/peso, byte/SHA-256 e condizioni/licenze derivati dal manifest PRE-U1, senza rinominare le famiglie |

Fonte grafica: archivio originale ricontrollato SHA-256 `9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d`; ciascuna sorgente usata corrisponde al suo SHA completo nell'inventario già versionato. Nessun design ricostruito a memoria, nessuna modifica al congelato V1/V2.1. Solo copie in ui/. Nessuna miniatura/vista laterale/manifest coupler/asset 3D sovrascritta o duplicata.

SHA-256 WOFF2 confermati:

- Cinzel Decorative 700: `da243cadfd41afd6eae0518f60d2eb1c326d4f9c383fd76abdf1aca0ea0402a3`.
- Federo 400: `4ba9047f6d98614d6dd1849e42803e55a383bd153cc47221b692d53eb9e5cbd1`.
- Cutive Mono 400: `838a23082061b6eef65b292c3fe2083d88b3051dc0551f5525f512020ab660c2`.

## CSS e fixture isolata

Ordine unico dei sei link stylesheet in `evidence/U1/fixture.html`:

1. style.css legacy originale.
2. ui/css/tokens.css V1.
3. ui/css/serien-ui.css V1.
4. ui/css/tokens-tm.css.
5. ui/css/serien-ui-train-management.css.
6. ui/css/serien-ui-integration.css **ultimo**.

Un blocco inline di framing della sola fixture precede i link: delimita campioni/griglie e nomina i tre specimen tipografici; non modifica i CSS congelati o il runtime. CSS Integration contiene esclusivamente font-face locali (normal,700/400/400,woff2,swap) e `font-synthesis:none` sulla root fixture. Nessun @import remoto eseguibile. Diff esatto dell'unica rimozione autorizzata in `tokens-import-removal.diff`; nessun altro edit ai fogli design. Questa configurazione non dimostra automaticamente che le future regioni del simulatore possano essere attivate senza ulteriori adapter CSS in U2.

Campioni statici: shell con header/pannelli, bottoni e icone; Train Management con tab e schede normal/selected/disabled; cinque chip comparison, alert e feedback; pergamena, palette/materiali; specimen dei tre font veri. Etichette esplicite «fixture di design», nessun handler o script di simulazione. La fixture è fuori dal normale boot; non è la UI V2.1 integrata.

## Gate U1 eseguiti

Strumenti: Python standard library, Playwright/Chromium già disponibili, HTTP server loopback. Script isolati `verify_assets.py` e `check_fixture.py` in `evidence/U1/`, senza modifica ai test storici o al workflow. Comandi riproducibili dalla root:

- `python3 docs/_active/ui-v21/evidence/U1/verify_assets.py`
- server `python3 -m http.server 8012 --bind 127.0.0.1`, poi `python3 docs/_active/ui-v21/evidence/U1/check_fixture.py`
- `npm run build`

| Gate | Esito / evidenze |
| --- | --- |
| Integrità di font/asset/sorgenti | **PASS**, 19 staging file, hash e dimensioni, source hashes e cambiamenti autorizzati registrati; asset-validation.json |
| Tre licenze e provenienza | **PASS**, copie esatte con tre hash/licenze/copyright/RFN dal manifest PRE-U1; ui/fonts/manifest.json |
| HTTP locale | **PASS**, richieste reali della fixture e GET espliciti su tutti i 19 file staging restituiscono 200; fixture-results.json/http |
| Rete esterna | **PASS**, nessuna richiesta esterna effettiva, nessuna richiesta script; route esterna bloccherebbe e registrerebbe qualsiasi tentativo |
| Font locali | **PASS**, tre FontFace loaded, famiglie Cinzel Decorative/Federo/Cutive Mono e pesi computati700/400/400; font-synthesis none |
| Offline | **PASS** in nuovo contesto offline, senza cache riusata: fixture e risorse soddisfatte dai file locali con route fulfillment, tre font loaded e nessuna richiesta esterna. Distinto dalle vere risposte HTTP del primo passaggio; nessun server remoto richiesto |
| Cascade | **PASS nel perimetro campionato**, sette elementi: header-tm, tre card, tre specimen; confronto con/senza foglio legacy su font/color/background/border/padding/shadow/opacity. **Zero differenze** nelle proprietà confrontate, entrambi i contesti. Ordine dei sei link verificato; nessuna collisione non spiegata osservata |
| Visuale 1440×900 | **PASS verifica fixture**, screenshot HTTP/offline acquisiti, screenshot HTTP ispezionato: tipografia/materiali, bordi, icone e stati visibili; viewport1440×900, niente overflow orizzontale/verticale della pagina (height900) |
| Errori browser/console/richieste | **PASS**, zero pageErrors/consoleErrors/failedRequests in entrambi i contesti Chromium; fixture-results.json |
| Build | **PASS**, exit0; build.txt e build-result.json; bundle SHA `69eb83ebae0250ffe245d4ec6ede50cae3561f148f2e2973d0274f2c53b1068e`, identico al PRE-U1 |
| Runtime protetto | **PASS**, 226 file byte-identici ai blob baseline91722fb, incluse le suite/test/config; asset-validation.json dettaglia SHA/blobs; canonico invariato `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc` |
| Suite ferroviarie storiche | **NOT RERUN**, nessun codice applicativo cambiato; nessun nuovo PASS runtime dedotto dalla fixture |
| UI integrata, altri viewport/browser/hardware | **NOT VERIFIED**, fuori U1; non si certifica U2–U9 dalla fixture |

Screenshot: `evidence/U1/http-1440x900.png`, `offline-1440x900.png`. Misure/risposte HTTP/font/cascade e inventario finale in `fixture-results.json`; invarianti in `asset-validation.json`. Evidenze U0/PRE-U1 non sovrascritte.

## Residui e checkpoint

Nessun impedimento U1 residuo nel perimetro verificato. Limiti espliciti: cascade misurata sui campioni della fixture, non su tutto il DOM ferroviario; riferimento di font reali ora disponibile, confronto completo della UI futura con il design e integrazione/picking/lifecycle rinviati alle fasi autorizzate. Nessun conflitto osservato è stato «risolto» cambiando runtime. Licenze e CSS copiati conservano eventuale whitespace upstream per hash/provenienza, senza normalizzazione di contenuto congelato.

Checkpoint atomico sul solo branch obbligatorio; SHA effettivo e confronto locale/remoto verificati nella consegna. **U1 READY FOR REGIA REVIEW — STOP; attendere nuova autorizzazione per U2.**

Nota whitespace: il controllo diff segnala soltanto lo spazio finale upstream nella medesima riga di ciascuna delle tre licenze copiate; preservato intenzionalmente per l'identità byte/hash. Il controllo degli altri file redatti/staged passa. Sprite XML parsabile, ID unici e tutti i sette simboli TM verificati.
