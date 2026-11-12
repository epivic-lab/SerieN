# UI V2.1 — U0 Integration Foundation & Contract Normalization

**U0 READY FOR REGIA REVIEW.** Solo documentazione/contratti/validazione isolata. Il pacchetto tecnico è approvato dalla Regia nel mandato U0, conservato con checksum; nessuna U1–U9 autorizzata o iniziata.

## Baseline e provenienza

Branch esistente `codex/ui-v2-integration`, checkpoint iniziale locale/remoto verificato `af67ee5c65679b7e5fa384d76a0825dff022f27d`, working tree iniziale pulito. Baseline applicativa `91722fbdf6671e69deebf645c3d8bf389212f421`, main remota `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, design V1 remoto `cf2c29a8112b37a53c62cb84fca44061942aea31`: tutti verificati direttamente prima del lavoro.

M3 finale è già approvata e presente. Gli override sostituiscono `codex/ui-v21`, `a67e0de` come baseline finale, M3 `252d9c3` provvisoria e futuro merge/rebase; nessun riferimento storico è stato cancellato dai materiali frozen. Nessun branch/merge/rebase creato.

Pacchetto originale SHA-256 `9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d`, 36.752.894 byte. Manifest/provenienza del §13 readiness conservati e hash delle evidenze ricontrollati; `PROVENANCE.json` aggiunge origini/checksum dei documenti tecnici usati, senza duplicare l'intero archivio, design, screenshot o asset. I soli prompt/documenti inclusi non autorizzano esecuzione; prevale il mandato U0 aggiornato.

## Artefatti consegnati

Tutti i percorsi tecnici qui sotto sono in `docs/_active/ui-v21/`, separati dai materiali di design congelati:

| Artefatto | Risultato |
| --- | --- |
| README.md, AUTHORIZATION_U0.md, STATUS.md | Autorità normalizzata, mandato con hash, stato e STOP |
| CONTROLS.json | 66 identificativi stabili, moduli/ancore reali, DOM attuale (CSS/accessibile/evento), destinazione V2.1, callback/visibilità, stato letto/modificato, vincoli, fase, test/accettazione e adapter |
| SCREENS.json | 31 schermate complete con associazioni CTRL/test/fasi, stato e distinzione reale/mock-only/futuro non implementato |
| SOURCE_DOM_CALLBACK_TEST.csv | Tabella dei 66 binding sorgente → DOM attuale → V2.1 → callback → test; coerente con JSON, non un selector registry installato nei test |
| ADAPTERS.md | 13 adapter documentati, precondizioni, atomicità/cleanup e accettazione; nessuno implementato |
| CONTRACT_RESOLUTIONS.md | Tutte le 14 decisioni tecniche definitive; branch/base/M3, stato transitorio guard, condizioni sessione e transizioni normalizzate |
| MIGRATION_PLAN.md | U1–U9: file autorizzabili, dipendenze/rischi, gate funzionali/visuali, test/evidenze, rollback e STOP |
| TEST_GATES.json | Matrice dei test esistenti da preservare e dei nuovi check proposti per fase, con riferimenti risolti. U9 ricontrolla tutti i 66 CTRL e tutte le 31 schermate (mock/futuro soltanto per esclusione/limiti) |
| ASSET_INVENTORY.md, PROVENANCE.json | Asset disponibili/in uso/da acquisire, destinazioni future e licenze/checksum/provenienza; design congelato non modificato |
| verify_u0.py, evidence/U0/* | Verifica isolata della consistenza, file invarianti (226), ricevuta build e baseline Git |

`CONTROLS.json` non presenta stringhe come `up-<id>`, `#a/#b` o `window keydown` come CSS valido: le famiglie dinamiche hanno selettori prefix, i controlli globali sono eventi, Focus/Bell/status usano i ruoli/binding attuali. Il loro stato di presenza dipende dalla vista/bozza/selezione. Nuovi `data-ctrl` e DOM V2.1 sono soltanto contratti futuri; nessuno è stato aggiunto al runtime.

## Risoluzioni decisive

- Sign out usa realmente `addEventListener`; A01 blocca il primo evento prima del listener, consenso one-shot, zero chiamate su cancel e nessuna doppia disconnessione. Summary read-only/multipli launcher sono A02 futuri, non API già esistenti. Auth resta invariata. Exit to title resta disabilitato con motivo.
- Conferme M2/reset/remove: A03 coordina tutti i call site senza trattare una Promise come booleano. Nessuna mutazione prima del consenso, rivalidazione dell'intento al consenso, niente callback dopo dispose/reset. Snapshot e guard sessione derivano da `dirty || hasProjects || inventory.size>0`, non dal mock.
- `#stop` e gli ID della console selezionata rimangono unici e collegati a Space. Comandi flotta/guardie R1 restano gli unici dispatcher. Link soltanto in draft; confermati read-only fino a Edit; progetti/inventario fisicamente separati.
- Zoom e status Guarded Stop sono closure/nodi interni, non API pubbliche inventate. HUD usa il vero diagramma ed è read-only. Due controlli Bell condividono un solo controller e snapshot; UI Sound non muta Bell.
- Speed comandata %, velocity reale nelle unità del motore o normalizzazione dichiarata; nessun km/h fittizio. Log resta testo integrale persistente, nessun severity/KPI aggiunto al dominio.
- **Ordine CSS finale unico:** legacy residuo → tokens V1 → CSS V1 → tokens TM → CSS TM → integration ultimo. **U1 solo staging/fixture isolata**; niente attivazione globale nel runtime prima di U2. Questo override del prompt originale evita cambiamenti involontari fuori regione; cascade da provare prima dell'attivazione.
- Tre famiglie font e licenze non incluse: inventario esplicito e gate di acquisizione/verifica **prima di U1**, non dichiarate già complete. U0 non acquisisce/installa font. Miniature e manifest applicativi riutilizzati; nessuna sovrascrittura per hash. JS reference escluso integralmente dal bundle, anche catalogo e sottoparti dei mirror.

## Verifiche effettivamente eseguite

| Verifica | Risultato / prova |
| --- | --- |
| Riferimenti Git e branch iniziali | **PASS** — `evidence/U0/git-baseline.json`; nessuna divergenza |
| `python3 docs/_active/ui-v21/verify_u0.py --output docs/_active/ui-v21/evidence/U0/validation.json` | **PASS**, 19 controlli statici: ID/campi, ancore sorgente effettive, percorsi test esistenti, riferimenti incrociati e copertura gate, CSV/JSON, hash provenienza, confini U0 e assenza reference nel runtime |
| Confronto file applicativi/test/config a 91722fb | **PASS**, 226 file con blob Git e SHA-256 individuali in validation.json; nessuna modifica ai test baseline, scripts, AGENTS, workflow/dipendenze/runtime/asset/Auth/Supabase |
| `npm run build` | **PASS**, exit 0; bundle identico `69eb83ebae0250ffe245d4ec6ede50cae3561f148f2e2973d0274f2c53b1068e` — `evidence/U0/build.txt`, `build-result.json` |
| Canonico | **PASS identità hash**, `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`; non rigenerato inutilmente |
| Diff whitespace / scope | **PASS** richiesto prima del commit; sole modifiche documentali U0 e nota PROGRESS/stati |
| Nuove suite Node/Python/browser ferroviarie | **NOT RERUN**: codice invariato, nessuna ragione concreta di ripetere la Fase 0; risultati precedenti restano storici e separati |
| Nuovi adapter/DOM V2.1, licenze font e gate visuale/font/hardware | **NOT VERIFIED / non implementati** in U0. Validatore statico non prova comportamento DOM o sicurezza ferroviaria runtime |

Il validatore usa soltanto la libreria standard Python, risiede nella documentazione e non è collegato a npm/workflow/tests. Risolve le ancore come sottostringhe statiche, non certifica semantica delle callback né esistenza di un elemento DOM in ogni stato. I test futuri sono marcati PLANNED, distinti dai file test già esistenti; nessuna asserzione storica indebolita o selettore migrato verso DOM assente.

## Rischi residui e STOP

Nessun impedimento alla **review U0**. Restano lavori futuri non certificati: acquisizione/versioni/licenze dei tre font prima di U1; cascade e coesistenza per regione; atomicità dei coordinator asincroni e signOut; listener/ID/focus; prove di adapter, regressioni e accettazione visiva con font reali nelle rispettive fasi. L'intake documentale non assegna PASS a queste attività.

Rollback futuro: fermarsi al primo gate fallito senza ampliare il perimetro; dopo un checkpoint pubblicato, eventuale revert forward della singola fase soltanto con autorizzazione appropriata, mai reset/rebase/force-push o modifica a main. Nessun asset/CSS/font V2.1 installato nell'app, nessuna modifica R1/M2/M3/Auth/Supabase/V1, nessun merge/deploy. Il commit che contiene U0 è il checkpoint atomico; SHA e coincidenza locale/remota sono verificati nella consegna, evitando auto-riferimenti circolari.

**U0 READY FOR REGIA REVIEW. STOP dopo U0: attendere autorizzazione esplicita per U1; nessuna sottofase successiva parte automaticamente.**
