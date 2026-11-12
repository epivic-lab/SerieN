# SERIEN — AUTORIZZAZIONE U4: SIDEBAR, SWITCHES, ENVIRONMENT, MISSIONS & MAP

**Modello: GPT-6 — Reasoning High**

## 1. Mandato della Regia

La Regia ha APPROVATO la microfase U3.

Sei autorizzato a eseguire esclusivamente:

**U4 — Sidebar, Switches, Environment, Missions & Map.**

Repository: `epivic-lab/SerieN`

Branch esclusivo: `codex/ui-v2-integration`

Checkpoint U3 approvato:

`907a9ec4a9d570f03af9ab77d39269ff49787256`

Baseline U2 approvata:

`48a7c4d48b118877ec7edf7f4c61fba090e460b8`

Main produttiva di riferimento:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica gli SHA correnti prima di intervenire. Non assumere che HEAD locale e remoto siano necessariamente coincidenti.

**U5–U9 NON SONO AUTORIZZATE.**

## 2. Autorità tecnica e visiva

Consulta e rispetta:

- `docs/_active/ui-v21/MIGRATION_PLAN.md`
- `docs/_active/ui-v21/ADAPTERS.md`
- `docs/_active/ui-v21/CONTRACT_RESOLUTIONS.md`
- `docs/_active/ui-v21/CONTROLS.json`
- `docs/_active/ui-v21/SCREENS.json`
- `docs/_active/ui-v21/TEST_GATES.json`
- `docs/_active/ui-v21/U3_REPORT.md`
- Il pacchetto di design V2.1 approvato e frozen.

Contratti principali: A09, A12 e i controlli CTRL-012, CTRL-013, CTRL-015, CTRL-053.

La reference Claude definisce l'aspetto, non il comportamento ferroviario.

**L'autorità funzionale rimane il codice R1/M1/M2/M3.**

## 3. Obiettivo U4

Trasformare la sidebar legacy nelle regioni V2.1 corrispondenti, preservando le funzioni reali.

Le aree sono:

1. Infrastructure — otto scambi.
2. Environment — illuminazione/daylight.
3. Missions — missioni reali.
4. Railway map — rappresentazione e focus sui treni.

Mantieni coerenza visiva con U2 e U3: materiali, font, spaziature, pulsanti, bordi, pannelli, stati e responsive.

Nessuna funzione dimostrativa.

## 4. File autorizzati

Secondo il piano U4:

- `src/ui/sidebar.js` — adapter nuovo, solo se necessario.
- Eventuali binding strettamente visuali del lighting esistente.
- `app.js` — esclusivamente mount, proiezioni e binding UI.
- `index.html` — esclusivamente regioni e hook necessari.
- CSS integration — nuove regole scoped U4.
- Nuovi test U4 e documentazione/evidenze.

Se le funzioni esistenti sono già sufficienti, riutilizzale senza creare nuovi controller.

Non modificare moduli di sicurezza, topologia, dispatcher o comportamento ferroviario.

Conserva gli ID e gli hook DOM consumati da altre parti dell'applicazione.

## 5. CTRL-012 — Otto scambi reali

La sidebar deve presentare esattamente gli otto scambi esistenti.

Usa `switchSpecs` e `controlOrder`, non una lista hardcoded derivata dalla reference.

Conserva gli ID reali:

WX-A, WX-B, Y-IN, Y-2, Y-3, Y-R1, Y-R2, Y-4.

Ogni tile deve rappresentare:

- Nome/identità dello scambio.
- Stato reale diritto/deviato.
- Indicazione visiva coerente con lo stato.
- Eventuale blocco di sicurezza.
- Motivazione del blocco leggibile senza hover.
- Contatore deviati/totale ricavato dallo stato reale.

Le interazioni devono passare esclusivamente dal percorso originale:

`requestToggle(id, panel)` → dispatcher protetto.

Mai modificare direttamente `s.on`.

Il click 3D e quello dalla sidebar devono rispettare le medesime guardie R1.

Non creare ottimistic updates che mostrino lo scambio come cambiato prima dell'autorizzazione effettiva.

Conserva gli hook `data-switch` e `data-switch-hover` finché rimangono consumer legacy.

Le condizioni occupied, approaching e uncertain devono mantenere la protezione esistente.

## 6. CTRL-013 — Environment

Restyle del controllo daylight originale.

Mantieni:

- `#day`.
- `#sun`.
- Handler originale.
- Valore effettivo daylight.
- Soglie reali 42/72.
- Coerenza fra slider, icona e scena renderizzata.

Non modificare la fisica ferroviaria.

Non introdurre nuovi stati ambientali fittizi o orologi simulati.

Day/Night deve continuare a funzionare attraverso i binding esistenti.

## 7. CTRL-015 — Missions

La sezione missioni deve riutilizzare i dati e il ciclo originali.

Mantieni:

- Missione corrente reale.
- Descrizione e istruzioni originali.
- Pulsante Next mission.
- Avanzamento ciclico esistente.

**Next mission deve restare disponibile anche se la missione corrente non è completata.**

Non introdurre mission-completion automatica, reward, punteggi, progressi sintetici o KPI.

Non aggiungere condizioni artificiali per cambiare missione.

## 8. CTRL-053 — Railway map

La mappa deve derivare dalla vera geometria ferroviaria e dalle posizioni reali dei treni.

Riutilizza, dove applicabili, le proiezioni esistenti `railwayMapPath`, `locomotivePoint`, la selezione treno e `nav.focus`.

Requisiti:

- Nessuna geometria ricostruita arbitrariamente.
- Marker coerenti con identità e posizione reali.
- Selezione e focus sul treno effettivo.
- Nessun nuovo controller di camera.
- Nessun comando di movimento generato da un click mappa.
- Nessuna confusione tra progetti virtuali e treni fisici.

Il focus tramite marker o azione equivalente deve richiamare le funzionalità già validate.

**Attenzione al confine U4/U5:** il Train Dock e le sue miniature appartengono a U5. Non migrarli anticipatamente.

Se serve un adapter, preserva `src/train-deck.js` e le sue callback originali salvo un intervento strettamente necessario e documentato, da non eseguire se comporta una modifica di dominio.

## 9. Integrazione con U2 e U3

Non alterare le fasi già approvate.

In particolare:

- Header e Menu U2 invariati.
- Sign out guard invariata.
- Auth e Train Management invariati.
- Camera, Route e viewport overlay U3 invariati.
- Next Switch HUD read-only.
- Bell ferroviaria indipendente da UI Sound.
- Operations Log persistente con messaggi originali.
- Un solo canvas e un solo renderer.
- Pointer picking reale preservato.

La nuova sidebar non deve coprire il viewport con superfici invisibili né intercettare click destinati ai treni o agli scambi 3D.

Non reintrodurre nella sidebar una seconda copia funzionale dell'Operations Log già migrato in U3.

## 10. CSS e responsive

Applica lo stile soltanto alle regioni U4.

Mantieni il CSS integration come ultimo foglio della cascade e lascia invariati i CSS congelati.

Verifica:

- Desktop 1440×900.
- Tablet 1024×768.
- Mobile 390×844.

La sidebar deve essere navigabile e leggibile.

I testi di blocco devono essere disponibili anche senza hover.

I controlli principali devono avere touch target adeguati, indicativamente almeno 44×44 px.

Evita overflow orizzontali, pannelli irraggiungibili e sovrapposizioni con HUD, Bell, Camera, Log o Train Dock.

Non anticipare il redesign responsive completo di U9.

## 11. Divieti architetturali

Non modificare:

- Motore R1 e sicurezza.
- Dispatcher degli otto scambi.
- Topologia e geometria ferroviaria.
- STOP ALL momentaneo.
- Space per il treno selezionato.
- Limite quattro treni e tre console LRU.
- Guarded Stop e Bell.
- Domini M1/M2/M3.
- Projects/Depot session-only.
- Auth/Supabase/RLS.
- Asset ferroviari e scenografia 3D.
- Workflow e packaging Pages.

Nessun mock, KPI inventato, allarme sintetico o store parallelo.

Nessun merge, deploy, rebase distruttivo, reset, clean o force push.

## 12. Test richiesti

Prima di modificare, verifica branch, stato Git, checkpoint U3 e file realmente coinvolti.

Dopo l'implementazione:

**Test funzionali U4**

- Otto tile generati dagli scambi reali.
- Stati diritto/deviato corretti.
- Counter reale.
- Blocco occupied/approaching/uncertain.
- Motivo del blocco leggibile.
- Stessa autorizzazione per sidebar e click 3D.
- Nessuna mutazione diretta dello stato scambio.
- Daylight e soglie 42/72.
- Mission cycle senza condizione di completamento.
- Mappa reale e marker corretti.
- Focus sulla camera reale.
- Nessuna mutazione ferroviaria impropria.
- Pointer e focus senza regressioni U3.

**Regressioni**

Consulta il gate G-U4 in `TEST_GATES.json`.

Esegui le suite pertinenti per dispatcher, interazione, environment, missioni, map, camera e flotta.

Preserva le asserzioni semantiche originali.

Gli adattamenti di selettori legacy sono consentiti soltanto quando inevitabili per il DOM approvato, e devono essere documentati e verificati come selector-only.

Non ripetere inutilmente M2/M3 completi se i rispettivi moduli non sono cambiati.

**Test visivi**

Acquisisci screenshot reali ai tre viewport previsti, mostrando:

- Scambi in stati differenti.
- Blocchi e motivazioni.
- Day e Night.
- Missioni.
- Mappa e marker/focus.
- Layout complessivo con HUD U3 e Train Dock legacy.

Per i controlli critici di sicurezza verifica anche il comportamento reale, non soltanto screenshot.

Se serve un test ferroviario nativo, usa il RAF reale e registra il limite delle prestazioni software.

## 13. Evidenze

Salva in:

`docs/_active/ui-v21/evidence/U4/`

Includi:

- Risultati e comandi con exit code.
- Log pertinenti.
- Screenshot.
- Hash sorgenti e bundle.
- Verifica dell'assenza di mock nel bundle.
- Invarianti Git.
- Delta DOM/selector/callback.
- Eventuali failure e recuperi.
- Limiti NOT VERIFIED.

Non sovrascrivere evidenze precedenti.

Distingui PASS effettivamente eseguiti, PASS storici documentati e NOT VERIFIED.

## 14. Checkpoint e rapporto

Se tutti i gate pertinenti sono soddisfatti:

1. Crea checkpoint atomico e reversibile sul branch autorizzato.
2. Esegui push senza force.
3. Verifica la corrispondenza locale/remoto.
4. Riporta SHA completo.
5. Prepara `docs/_active/ui-v21/U4_REPORT.md`.

Il rapporto deve presentare funzioni integrate, file modificati, verifiche, rischi residui e proposta di READY FOR REGIA REVIEW oppure BLOCKED.

Non dichiarare la microfase approvata autonomamente.

## 15. STOP obbligatorio

Interrompi e segnala BLOCKED se:

- Una tile modifica direttamente lo stato di uno scambio.
- Le protezioni R1 vengono bypassate.
- I dati della sidebar sono fittizi.
- La mappa non rappresenta posizioni reali.
- Missioni o daylight cambiano comportamento.
- U2/U3 regrediscono.
- L'integrazione richiede modifiche di dominio fuori mandato.

**STOP al termine di U4. NON INIZIARE U5.**

Nessun merge in main.

Nessun deploy GitHub Pages.

Nessuna modifica Supabase.

Procedi ora con U4 secondo il mandato e i gate esistenti.