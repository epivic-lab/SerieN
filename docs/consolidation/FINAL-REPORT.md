> **Fase 0 chiusa su richiesta dell’utente.** Accettata la baseline software pubblicata al commit `d118de0`. I riscontri fisici ancora documentati sono mantenuti come limiti noti e attività successive; non sono presentati come verifiche eseguite. La [Fase 1](../phase-1/README.md) prosegue su questa base.

# Consegna v0.8 · 28 ottobre 2026

Codice applicativo verificato: **`f3cf1b6179f70cf8b02fc17c446a0eb4a4c04987`**. Branch di lavoro `work`, destinazione di pubblicazione `main`. Ripristino della ripresa: `b7de605`, branch `restore/phase-zero-intake`; versione pubblicata precedente `408cc5f`.

[Simulatore](https://epivic-lab.github.io/SerieN/?v=0.8.0) · [Rapporto visuale](index.html) · [SVG canonico](../jmri-layout/layout-canonical.svg) · [Grafo completo](../jmri-layout/canonical-graph.json) · [Workflow Pages](https://github.com/epivic-lab/SerieN/actions/workflows/pages.yml)

## Completato e verificato

- Unica rete per 3D, movimento, scambi, minimappe e HUD: 70 nodi, 75 tratte, tre anelli, quattro terminali, runaround e due WX310. ID XML preservati; tutte le ricostruzioni hanno provenienza documentata.
- Raggi nominali Kato conservati, due giunzioni di 2 mm riconciliate, nessun collegamento per mera vicinanza o incrocio grafico. Quarto respingente su A67 senza prolunga.
- Tre consolle recenti e operative, quarto convoglio aggiungibile e inserimento protetto; simulazione indipendente dalla visibilità. Miniature dai modelli, punti rossi dalle locomotive reali, click mappa per il focus.
- Otto comandi distinti con protezione; HUD leggero, schemi derivati dalle unità, distanze ferroviarie e blocchi reali. Itinerario temporaneo disattivabile e con scadenza verificata. STOP TUTTI e arresti individuali operativi.
- Rotabili Kenney con spaziatura da ganci, aggancio/sgancio e cambio modelli conservati. Reset stabile, camera e inseguimento conservati. Scenografia adattata ai binari, nessuna galleria.
- Pulizia dei residui della vecchia rete, baseline archiviata e verificata, dipendenze bloccate, reinstallazione pulita, build e pacchetto statico pronti per il workflow Pages. Repository senza modifiche pendenti alla consegna.

## Prove eseguite

| Controllo | Esito e prova |
|---|---|
| Installazione da lockfile e build | PASS: `npm ci --no-audit --no-fund`, `npm run build` |
| Test Node | PASS: tutti i 17 file; [output](node-tests.txt) |
| Parser e tracciabilità | PASS: 9 test; [output](parser-tests.txt) |
| Rigenerazione canonica | PASS: nessuna differenza rispetto ai file registrati |
| Tre anelli nei due sensi, comandi, quarto convoglio, manovre e STOP TUTTI nel browser | PASS: [browser-phase-zero](browser-result.json) |
| Plancia, sei miniature, fallback, stato nascosto e responsive | PASS: [browser-train-deck](../train-deck/browser-result.json) |
| GLB, spaziatura, aggancio/sgancio e inversione | PASS: [browser-consist](consist/consist-check.json) |
| Reset, inserimento occupato, quarto treno, camera e report interattivo | PASS anche sul pacchetto statico destinato a Pages: [browser-smoke](smoke-result.json) |

Risoluzioni browser: 1440×1000, 1024×900, 768×1024 e 390×844. Un solo contesto WebGL. Venti reset: geometrie 344→344. Nessun errore JavaScript bloccante. Chromium/SwiftShader non certifica prestazioni GPU o gesti su tablet fisico.

## Verifiche fisiche trasferite ad attività successive

La Fase 0 software è chiusa e accettata dall’utente. **La baseline non costituisce una certificazione metrologica del plastico fisico.** Mancano riscontri fisici o CAD autorevoli per il profilo interno dei WX310, l'accettazione dei piccoli fit angolari dei pezzi speciali, l'origine effettiva sul tavolato e i punti di fouling/lunghezze utili. Questi limiti non vengono coperti con connessioni o misure inventate. Occorre inoltre un collaudo touch e prestazionale sui tablet reali di destinazione.

Il workflow Pages comprende controllo di rigenerazione, test parser, test Node, build e distribuzione di asset e documentazione; il suo esito e il commit finale pubblicato sono indicati nella consegna in chat e consultabili nel link al workflow sopra.
