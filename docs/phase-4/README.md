# Fase 4 — Materiale rotabile · v0.12

## Riferimento e audit iniziale

Baseline: Fase 3, commit `d31546d`. Ricerca nella cronologia completa disponibile, nei README storici (incluso `b088511`), nell'analisi architetturale e nei report delle fasi 0–3: nessuna definizione precedente numerata della Fase 4 recuperata. È adottato il [piano proposto dall'utente](REQUEST.md), senza attribuirlo retroattivamente alla roadmap originale.

La Fase 3 ha consegnato paesaggio, stazione/scalo e campagna sul retro, con 95 test Node, 9 test Python e collaudi browser. Non aveva chiuso la certificazione fisica dei WX310, le misure di fouling e le prestazioni su dispositivi reali: restano limiti indipendenti dalla Fase 4. Il checkout era pulito; nessun intervento su `first`, `SerieN Control` o altri repository.

Audit riproducibile: `node scripts/audit-rolling-stock.mjs`. [Modelli nativi](native-audit.json), [sei GLB Kenney](kenney-audit.json), [dimensioni e provenienza miniature prima dell'intervento](baseline-stock-audit.json).

| Materiale precedente | Sorgente / formato / licenza | Valutazione e intervento |
|---|---|---|
| BR 055 schematica | `app.js` + `rolling-stock-art.js`, primitive Three.js originali, senza texture proprie | Ingombro precedente 84,5 × 38 × 21 mm nella cattura. Corpo/tender rigidi, ruote aggiunte a quelle di base, asta statica. Sostituita da studio dimensionale con quattro assi motori, tender a tre assi e trasmissione animata. |
| BR 216 schematica | Stesse sorgenti, geometria originale | Ingombro precedente 72 × 38,25 × 21 mm. Mantenuta; corretto l'asse di rotazione delle ruote. Resta una rappresentazione schematica, non un modello in scala storicamente certificato. |
| BR 260 schematica | Stesse sorgenti, geometria originale | Ingombro precedente 58 × 39 × 21 mm; sagoma generica. Sostituita da studio V60 con cabina decentrata, cofani disuguali, griglie, tre assi e aste animate. |
| Carri nativi | `app.js` + `wagonDetails`, primitive originali | Cassone comune con varianti di carico, passo fisso 64 mm. Sostituiti da cinque famiglie con metadati e ganci propri. Il vecchio passo è mantenuto soltanto per coppie legacy senza catalogo. |
| Steam K1, Diesel K2, Shunter K3 | `assets/kenney/*.glb`, Train Kit 1.1, CC0 | Tutti mantenuti: stilizzati, senza identità DB attribuita. Geometrie e materiali originali con colormap condivisa, caricamento asincrono e adattamento uniforme all'inviluppo esistente. |
| Kenney lumber, tank, box | Stessa sorgente, GLB CC0 | Tutti mantenuti e compatibili con consist e cambio modelli. Nessuna modifica ai file GLB. |

I GLB non contengono clip di animazione. I gruppi `wheels-front/back` hanno geometria saldata e pivot non corrispondenti ai singoli assi: non si applica una rotazione inventata dell'intero gruppo. Per animarli correttamente occorre una rielaborazione separata degli asset. I conteggi esatti di triangoli, dimensioni della colormap e struttura sono nei JSON dell'audit. I conteggi dei vecchi modelli nativi non sono stati misurati separatamente dal resto della scena; non sono inventati.

## Modelli e movimento consegnati

Gli studi BR 055 e V60 sono geometria originale operativa, **non repliche storiche definitive**. Le dimensioni sono obiettivi di progetto coerenti con le famiglie rappresentate, da verificare su disegni quotati prima di dichiarare fedeltà metrologica. Non sono stati scaricati nuovi asset. BR 44, BR 212 e BR 232 compaiono nel catalogo futuro soltanto come pianificati, senza modelli fittizi.

- BR 055: obiettivo nominale 18.285 mm / 160, corpo, caldaia, cabina, fumaiolo, fanali con supporti, tender articolato, quattro assi accoppiati e tre del tender. Ruote su gruppi di assale, bielle di accoppiamento e biella motrice con cinematica biella-manovella semplificata, un quarto di giro tra i lati. Non si simula un distributore completo.
- V60/BR 260: obiettivo nominale 10.450 mm / 160, cabina decentrata, griglie, cofani, tre assi, aste accoppiate e fanali fissati alla cassa. Mantiene accelerazione e controllo del motore esistente; non introduce una fisica di trazione certificata.
- Carro chiuso, aperto e cisterna: 62,5 mm nominali ciascuno; pianale a carrelli 81,25 mm; carrozza DB d'ambientazione 165 mm. Sono famiglie generiche dichiarate, non classi storiche specifiche inventate. La BR 216 parte con pianale e carrozza, per renderli effettivamente disponibili nella scena.

Ogni nuovo veicolo ha identificativo, dimensione nominale e ganci espliciti. La lunghezza del convoglio include gli attacchi del modello. Le ruote dipendono dall'odometro firmato, si fermano da ferme e invertono con la marcia. Carrelli e tender campionano posizione e corda sul medesimo Journey canonico: nessun binario parallelo ricostruito per l'animazione. L'inviluppo delle ruote native poggia alla quota delle teste delle rotaie, 5,95 mm.

## Composizioni e interfaccia

Aggancio soltanto al veicolo realmente sganciato: confronto con la posizione prevista del nuovo elemento in coda, tolleranza 3,5 mm e orientamento compatibile. Eliminato l'aggancio fino a 115 mm, che poteva trasferire un carro lontano. L'identità dell'oggetto resta la stessa. La protezione dai carri fermi considera ingombri e verso di avvicinamento, permettendo di allontanarsi dopo lo sgancio.

Le tre consolle conservano struttura, comandi e minimappe. Mostrano anche la lunghezza in millimetri e mantengono nome, tipo, quantità e stato operativo. Le sei miniature sono nuove catture dei modelli reali ove modificati; manifest con hash dei sorgenti e delle immagini. Riutilizzo del renderer principale, nessun secondo contesto WebGL.

[Preservazione](preservation.json): rete, grafo canonico, simulatore Journey, rotaie, HUD, camera, CSS e scenografia Fase 3 identici alla baseline. Nessuna galleria.

## Prestazioni e risorse

Geometrie statiche aggregate per materiale anche all'interno degli assali; materiali PBR condivisi tra i rotabili, senza nuove texture. I nuovi corpi hanno migliaia, non milioni, di triangoli: conteggi esatti nell'audit. Restano cache dei template GLB, caricamento asincrono, miniature PNG in cache e rilascio delle geometrie dei carri eliminati. Le animazioni usano i gruppi esistenti nel ciclo principale.

Non sono stati introdotti LOD o compressione texture aggiuntivi: la sola colormap Kenney resta condivisa. Gli intervalli tra frame e i contatori registrati in [browser-result.json](browser-result.json) descrivono Chromium/SwiftShader, non una GPU desktop fisica. Prestazioni su hardware reale ancora da misurare.

## Verifiche

- [100 test Node](node-tests.txt) passati: inclusi assali, bielle, inversione, carrelli su R249, agganci distanti/opposti rifiutati e separazione degli inviluppi rettangolari per tutte le coppie dei sette modelli nuovi su R249. Questa prova non certifica ogni inviluppo reale sugli scambi.
- [9 test Python JMRI](parser-tests.txt) passati; rete e geometria canonica immutate.
- [Collaudo Fase 4](browser-result.json): tre convogli simultanei, fasi ruote rispetto alla distanza effettiva, bielle, arresto e inversione, allontanamento dal carro sganciato, aggancio distante rifiutato, ritorno e riaggancio, carrozza presente, lunghezze nelle consolle e veicoli sul centro del binario. Desktop/tablet/telefono, Low e viste High, nessun errore bloccante o asset mancante.
- [Regressioni operative](operations-result.json): tre circuiti in entrambi i sensi, quarto convoglio, entrambe le manovre nel runaround, protezioni, HUD, minimappe e STOP ALL.
- Il test Fase 4 verifica inoltre un locomotore corto in arrivo a ciascuno dei quattro terminali canonici: arresto entro l’inviluppo del respingente reale, senza prolunghe.
- [Regressioni Kenney](kenney-regression.json): cambio modelli, spaziatura, sgancio/riaggancio, inversione, reset e ritorno ai nativi passati.

Gli screenshot sono immagini effettive: [desktop](desktop.png), [tablet](tablet.png), [telefono](phone.png), [vapore High](steam-high.png), [V60 High](shunter-high.png).

## Stato e limiti

Implementato e collaudato il nucleo software della Fase 4 proposta. Non viene dichiarata una chiusura della fedeltà storica dei modelli, delle prestazioni su GPU reali o dell'animazione dei GLB Kenney non articolati. La BR 216 resta schematica. Le prove di manovra complete usano anche il quarto locomotore corto; non implicano che il convoglio con carrozza da 165 mm entri in ogni tronchino. La capacità viene verificata dal motore con gli ingombri effettivi.

Il commit di consegna è quello che introduce questo report e la v0.12; pubblicazione e stato del deploy sono riportati nel messaggio di consegna, dopo l'esito del workflow esistente.

Verifica diretta su GitHub Pages ancora bloccata dalla policy di uscita: il proxy restituisce HTTP 403 al CONNECT verso `epivic-lab.github.io`. Il dominio è stato aggiunto alla bozza della configurazione dell’ambiente, preservando i preset e gli altri accessi; il salvataggio della bozza non applica la modifica al runtime. Per completare la prova dal cloud occorre applicare tale impostazione e ripetere il test browser con `SERIEN_URL=https://epivic-lab.github.io/SerieN/`. Il successo del workflow non viene confuso con il collaudo browser sul sito pubblico.
