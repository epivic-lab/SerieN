# V06-INTEGRATION — candidata browser, 14 novembre 2026

**Integrazione funzionale implementata e verificata. QUALITY GATE indipendente
visivo/prestazionale PENDING; nessuna approvazione al rilascio.** Il blocco di
trasferimento è chiuso. Branch `codex/scenario-v06-integration`, stessa Draft
[PR #21](https://github.com/epivic-lab/SerieN/pull/21), dalla base esatta
`642f8eb58eef84cc6474fbe8adacbd4a04e1f27e`. Il mandato di integrazione end-to-end
recuperato nelle precedenti riprese prevale sulle pause ordinarie di microfase.
Nessun merge/main/deploy o nuovo lavoro di backend.

## Asset e ammissione

L'ultimo originale, railway_service_buildings, è arrivato con HTTP200 dal nuovo
riferimento Denmark; header GLB2,36.688.380byte eSHA256 conforme. Non si attesta
che la modifica rete sia stata applicata: lo stato osservato mostrava ancora
revisione1 con Denmark/epivic-lab.github.io. Non è servito aggirare il proxy.

**Tredici originali/364.551.328byte**, inclusa technical_reference opzionale,
ora in `assets/scenario-v06/modules/`. I dodici già versionati sono trasferiti
senza modificarne i byte; l'ultimo si aggiunge. Il lock separato SHA256
`9ede69547d5da2e35eef63d4051d610d13d0647feb9413750f5510172a127499`
è immutato. Il dataset pubblico è copia byte-identica dell'R1A, SHA256
`4fd022e1173ef5517a7c826f4163dd10ab1ff776e1ecfaf144f53d40473ccef7`.
Controllo ripetibile: `python3 tools/scenario-v06/check-local-assets.py --require-complete`.

Il browser verifica SHA e dimensione prima del parse; dataset e lock hanno
pin nel codice. URL/file inattesi,HTTPfallito,hash o dimensione errati impediscono
l'avvio. Tutti i moduli vengono preparati prima di costruire WebGL/flotta/UI;
un errore presenta Retry/Return to Legacy, senza fallback automatico o mezzo
scenario attivo. Nessun URL Drive firmato è nel prodotto o nei file versionati.

## Uso e confine della sessione

Avvio ordinario del repository (`npm ci`, `npm start`). **Menu → Scenario → V06**,
o `?scenario=v06`; senza parametro il default rimane Legacy. La selezione chiede
conferma della perdita di treni/progetti/Depot, osserva la generation reale,
ferma la flotta e ricarica l'intera pagina. Annullare conserva sessione e dati.
Il ritorno a Legacy ricostruisce75archi/8controller/3treni con identità nuova;
nessuna proiezione di Journey o di riferimenti di V06 sulla vecchia rete.
L'autenticazione reale resta obbligatoria e invariata: la fixture locale delle
prove browser non è parte del prodotto. OAuth live NON VERIFICATO.

V06 usa79archi,74nodi e7controller dello stesso dataset e registro validato.
Nuova sessione software inizializzata esplicitamente in S0/N, non una lettura
fisica degli stati null del master. Spawn iniziale e quarto treno verificano
l'intera composizione, storia instradata, visibilità, aree protette e altri
veicoli prima di ammettere la posa. Nessun T47 legacy viene usato da V06.
Reset ricostruisce le pose del profilo e invalida i riferimenti TM come prima.
UNKNOWN e scambi occupati restano protetti dai confini esistenti.

## Scena, ferrovia e UI

La scenografia carica gli undici moduli originali non ferroviari con sola
conversione metri→millimetri1000, senza spostare il piano. Technical_reference
resta nascosta nella vista normale. Il toggle tecnico mostra riferimenti e
assi operativi senza mutare velocità,Journey,occupazione o controller.
Nessuna scenografia/rotaia Legacy è attaccata alla scena V06.

**Variante ferroviaria procedurale completa**, esclusiva del profilo V06:
assi degli79archi R02, piano ferro8,4mm, centri rotaie±4,725mm e testa nominale
0,45mm (scartamento interno9mm). Il GLB railway_visual originale rimane
immutato come riferimento e non viene sovrapposto alla variante. Due tamponi
sui soli terminali buffer-N20/N10; nessun tampone inventato su open-N16.
Massicciata nominale con una sola ownership per cella1mm, unita in3714rettangoli
senza superposizioni di strip; nessuna modifica del tracciato per incastrare
il paesaggio. Il renderer conserva i79assi; non crea nodi al diamond.

**Limite esplicito:** è una rappresentazione nominale del simulatore. Non sono
ricostruiti/certificati aghi mobili e attuatori, cuori e flangeway AS-BUILT;
non si dichiara chiuso il gate di fedeltà fisica R02. La commutazione è osservata
dalle frecce di selezione, non da una falsa animazione meccanica. La scelta
procedurale e l'aspetto richiedono review Regia; nessun PASS estetico implicito.

Picking,focus,glow e frecce ricevono il registro effettivo e la quota del profilo;
sette dispositivi V06 e otto Legacy, nessun ottavo controller fittizio. Panel e
canvas chiamano lo stesso comando protetto. Tile e HUD distinguono S0/S1 e N/X;
la missione del runaround legacy diventa esplorazione di un ramo V06.
Minimappe,layoutplan e marker derivano dalla stessa rete dei veicoli.
Layout/CSS V2.1,tre console,camera,HUD,Bell,TrainManagement,progetti eDepot
restano gli stessi, con selettore e toggle nel Menu esistente.

L'indice statico per il raycast scarta solo bounding box non interessati e poi
interseca veri triangoli. Gli oggetti dinamici usano le trasformazioni correnti;
prefissi di densità,occlusione e disposal sono coperti dai nuovi test. Non è
un bypass dei controlli o una nuova geometria di picking renderizzata.

## Verifiche effettive

**567/567 Node PASS** =559storici invariati+8nuovi; **9/9 JMRI PASS**;
build e rigenerazione canonico senza diff PASS. **19 gruppi browser PASS**
sul bundle finale: caricamento,desktop/mobile,7panel×2stati,7picking reali,touch
trusted suWX-B,toggle tecnico,3composizioni native oltre7m,4callbackRAF nativi,
STOP/pose,sgancio-riaggancio/UUID,inversione,WXoccupato,quarto treno in moto e
reset4,progettoTM/Depot,High,annullamento/conferma cambio profilo,Legacy pulito,
perdita dati confermata ed errore d'integrità senza runtime parziale.
Nessun pageerror/consoleerror o richiesta fallita nella campagna positiva.

La campagna usa Chromium/SwiftShader,Auth sostituito nella sola fixture locale,
RAF del gioco controllato per molte verifiche e quattro callback RAF originali
esplicitamente distinti. Non è un collaudo OAuth,hardware fisico o di tutti i
browser. Non è una nuova campagna numerica R2B3/R2C o una certificazione generale
di sicurezza/equità a4treni: riusa il core e le suite già esistenti.
Una prima fixture tentava di posare il convoglio sul ramo WX P012 inattivo;
il rifiuto era corretto. La fixture finale occupa il ramo selezionato P059:
nessuna guardia o asserzione di sicurezza applicativa è stata indebolita.

Bundle finale1.116.370byte, SHA256
`5ac4580ea02ab205d75914a7a9eda84a5203680077a8a31f8860ab7ac0612e32`.
[Prove,script,log e screenshot](evidence/V06_INTEGRATION/application/README.md).
Ricetta Prepare site invariata eseguita localmente:113file/369.517.260byte,
sotto1GiB,13HEAD200 e SHA delle copie identici. Non è una verifica Pages live.

## Prestazioni: limite materiale della candidata

Gli originali sono molto densi. Il profilo Low usa materiali Lambert e il30%
delle istanze decorative distribuite sull'ordine originale; High ripristina
materiali PBR e tutte le istanze, senza cambiare le coordinate. Nessun GLB è
semplificato/riscritto e nessuna dipendenza runtime è aggiunta. L'indice per il
picking non risolve il costo GPU di milioni di triangoli.

Nel run finale locale: caricamento completo circa38,4s (moduli circa12,0s),
Low401draw/10.272.270triangoli,High419draw/18.064.133triangoli nella scena con4
treni. Quattro callback native separati da circa17,98/17,35/14,62secondi;
High frame+cattura circa53,1s. Questi sono dati di SwiftShader software in
questo ambiente, non FPS su GPU fisica, né un benchmark hardware generalizzabile.
**Su questa macchina la fluidità non è soddisfacente.** I miglioramenti Low
non sono una prova di budget superato. Non dichiarare V06 fluida/pronta alla
produzione: costo asset e prestazioni restano oggetto prioritario del Gate.

## Invarianti, consegna e stop

Core/FixedClock/Journey/routing/F1/guard/collisioni,canonico,artifactR1A,
rotabili/assetmanager,TM/M2/M3,Auth/Supabase,UI CSS/camera e workflow/deps
byte-identici alla base. Funzione addRail legacy identica e150railmesh originali
preservate nel profilo Legacy. Le modifiche condivise sono adapter di registro,
quota,terreno e presentazione; vedere `preservation.json` per i percorsi esatti.
Nessun segreto,eval,nuovo egress o comando realeZ21. Nessun merge/main/deploy.

Commit atomico,push normale e verifica locale=remoto nella ricevuta finale;
la Draft #21 resta aperta con base R2B2, senza rilasci o nuovi tag.
**Unica prossima azione: review indipendente Regia della candidata funzionale,
con gate visivo/prestazionale ancora aperto.** Non è autorizzazione a pubblicare.

---

## Archivio delle riprese precedenti

# V06-INTEGRATION — verifica dopo aggiornamento dominio, 14 novembre 2026

**ASSET QUASI COMPLETI; BLOCKED sull'ultimo modulo obbligatorio.** Ripresa da
`ea20cc2d9a36636afa29e49922cc65df8373171d` sul medesimo branch
`codex/scenario-v06-integration`, PR Draft #21. L'utente segnala il dominio
aggiornato; lo stato osservato della macchina corrente risulta però ancora
revisione1, `observations_current:true`, policy enforced e soli domini
personalizzati Denmark/epivic-lab.github.io. Verificato nuovamente a fine recupero.

Nuovi link Drive: **railway_visual** (40.139.988 byte) e **village_buildings**
(91.596.468 byte) scaricati HTTP200 da Denmark. Anche technical_reference
opzionale recuperato dal connettore. Libreria ora **12 originali/327.862.948 byte**,
header GLB v2, dimensioni e SHA tutti conformi al lock. Salvati nel repository,
senza import nell'app o inclusione nella ricetta Pages.

**Unico obbligatorio mancante: railway_service_buildings.glb,36.688.380 byte.**
Il nuovo link usa `sdmntprukwest.oaiusercontent.com`: richiesta concreta con
nuova connessione respinta dal proxy 403. Il dominio richiesto in precedenza,
Northeu, non compare nella configurazione osservata e non è l'host corrente
dell'ultimo file. Chiesto di applicare alla macchina della chat la regola
`*.oaiusercontent.com`, oppure almeno UKwest se il campo non accetta wildcard,
per evitare di inseguire i datacenter dei riferimenti autenticati. Nessuna
riscrittura degli host, retry identico, modifica locale della policy o rifiuto
della revisione automatica delle approvazioni.

**Verifiche correnti:** controllo dei12file PASS; completezza INCOMPLETE/uscita2
attesa; build rieseguita PASS e bundle identico; sorgenti applicativi, test,
UI, canonico, asset runtime, dipendenze e workflow invariati.559Node/9JMRI
riusati dalla ripresa immediatamente precedente per identità degli input,
NON rieseguiti. BrowserV06 NON VERIFICATO; nessuna attivazione/merge/deploy.
Prove: `docs/_active/scenario-v06/evidence/V06_INTEGRATION/domain-update-2026-11-14/`.

Unica prossima azione: applicare il grant alla macchina corrente, scaricare
l'ultimo modulo e proseguire la medesima integrazione già autorizzata.

---

## Registrazioni precedenti — storiche

# V06-INTEGRATION — ripresa 14 novembre 2026

**RECUPERO PARZIALE; integrazione ancora BLOCKED dalla rete.** Ripresa dal
checkpoint verificato `301dceb64a3c034a1832d43bc6885d17604cc5a4`, PR Draft #21,
branch `codex/scenario-v06-integration`. Il mandato di integrazione già vigente
rimane valido; non è richiesta una nuova approvazione di microfase.

Terreno e segheria ora acquisiti con HTTP 200 dal dominio Denmark autorizzato.
Sette moduli piccoli recuperati dal connettore. **Nove originali, 196.026.628
byte**, header GLB v2/dimensioni/SHA verificati contro il manifest Drive
appena recuperato. Salvati questa volta nel repository in
`asset-library/scenario-v06/modules/`, con lock separato e ricetta
`python3 tools/scenario-v06/check-local-assets.py`, per non dipendere soltanto
dalla cache temporanea di un task. La libreria non è importata dall'app né
copiata dalla ricetta Pages. Nessun originale modificato.

La cache precedente era assente: questi nove file NON sono i nove della ripresa
precedente. Mancano ancora **village_buildings, railway_service_buildings e
railway_visual**; technical_reference è opzionale e assente. I riferimenti dei
tre grandi usano ora `sdmntprnortheu.oaiusercontent.com`. Tentato il trasferimento
degli edifici ferroviari: proxy 403. Nessun retry identico per gli altri file
sullo stesso host; occorre aggiungere questo dominio nelle impostazioni di rete
e applicare la modifica. La configurazione osservata resta revisione1, enforced,
con solo Denmark ed epivic-lab.github.io fra i domini personalizzati. Nessun
rifiuto della revisione automatica delle approvazioni. Host dei link mai riscritti.

**559/559 Node, 9/9 JMRI, build PASS** in questa ripresa. Bundle invariato:
`89d732feafef5914078d5ef83885e5b9b68ff3abe967e8c4863a08e20a3063c7`.
Controllo completezza asset `--require-complete`: uscita2 attesa, INCOMPLETE.
App/Core/F1/dataset/canonico/UI/Legacy/asset runtime/test storici/dipendenze/
workflow byte-identici al checkpoint iniziale. Browser V06 NON VERIFICATO;
smoke Legacy precedente non rieseguito e non presentato come nuova prova.
Nessun codice di attivazione o sostituto scenografico, runtimeAdmission:false.
Nessun URL firmato/token salvato; nessuna modifica Auth/Supabase, merge o deploy.

Prove correnti: `docs/_active/scenario-v06/evidence/V06_INTEGRATION/recovery-2026-11-14/`.
Checkpoint atomico e push normale sul branch esistente; SHA e uguaglianza remota
nella ricevuta finale. **Unica prossima azione: sbloccare il dominio indicato,
riacquisire i tre originali e continuare la medesima integrazione già autorizzata.**
Non è una consegna V06 giocabile o un PASS di integrazione.

---

## Registrazioni precedenti — storiche

# V06-INTEGRATION — ripresa dalla PR #21

13 novembre 2026, Europe/Rome. **BLOCKED sugli asset indispensabili;
integrazione applicativa non completata.** Questa sezione descrive la ripresa
corrente; il rapporto precedente, sotto, rimane storico.

## Checkpoint e acquisizione correnti

Checkout iniziale pulito su `work`, HEAD `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`.
Verificati con `git ls-remote`, fetch e API della Draft [PR #21](https://github.com/epivic-lab/SerieN/pull/21):
branch `codex/scenario-v06-integration`, checkpoint esatto
`7d235e147b7d50536dd8189fd10ad74ffeaf5b5c`, parent R2B2
`f592a12131b9b7236cbe79506cd23a03dacadd9f`. Checkout effettuato sul checkpoint,
senza reset/rebase o modifica del branch iniziale. Letti AGENTS.md, PROGRESS,
STATUS e le evidenze del blocco. La direttiva corrente autorizza la medesima
integrazione end-to-end, senza nuove pause ordinarie per microfase.

La cache del precedente ambiente **non è presente**. Nuovamente elencate le
cartelle Drive originali e recuperato `metadata/scene_manifest.json`;
ottenuti nuovi riferimenti autenticati per tutti i cinque moduli prioritari.
La configurazione osservata è corrente, revisione applicata `1`, policy
`enforced`; il dominio Denmark richiesto nel task precedente è autorizzato.

- `railway_visual.glb`: download HTTP **200**, 40.139.988 byte, SHA-256 conforme.
- `village_buildings.glb`: download HTTP **200**, 91.596.468 byte, SHA-256 conforme.
- Recuperati nuovamente i sette moduli precedenti con materializzazione
  diretta: mountain, mountain_rocks, tunnels_portals, station_platform,
  scenery_details, gardens_allotments, vegetation.
- Totale locale: **9 GLB originali, 227.339.628 byte**. Dimensione, header GLB v2
  e SHA-256 di ogni file verificati contro il manifest appena acquisito.
  Cache corrente `/workspace/work/v06/assets/`, esterna al repository;
  nessun binario applicativo aggiunto.

## Blocco di rete effettivo

Il nuovo riferimento del terreno usa **`sdmntprpolandcentral.oaiusercontent.com`**,
diverso dal dominio Denmark autorizzato. Il tentativo di download con il proxy
ereditato restituisce `URLError: Tunnel connection failed: 403 Forbidden`;
nessun payload del terreno acquisito e nessuna verifica SHA locale possibile.
Anche i nuovi riferimenti di `sawmill.glb` e `railway_service_buildings.glb`
usano il dominio Poland; non si ripete lo stesso tentativo su quel dominio.
Dimensioni e hash attesi sono nell'inventario corrente. Il riferimento tecnico
è opzionale e non è stato acquisito.

Non è disponibile il tool `cloud_environment.request_changes`. Per sbloccare
questa stessa integrazione occorre aggiungere nelle impostazioni dell'ambiente
`sdmntprpolandcentral.oaiusercontent.com`, mantenendo i domini esistenti,
applicare la modifica e verificare la policy osservata con una nuova connessione.
I riferimenti scaduti vanno riacquisiti da Drive; non va riscritto il loro host.
Nessun URL firmato o token è salvato nei file del repository.

**Stop per asset indispensabile irraggiungibile**, previsto esplicitamente
dal mandato. Non sono stati inventati terreno o altri sostituti. Il recupero
parziale non attesta un'integrazione V06: tutti gli otto criteri browser V06
restano **NON VERIFICATI**, `runtimeAdmission:false` preservato.

## Verifiche di questa ripresa

Risultati e log correnti in [evidence/V06_INTEGRATION](evidence/V06_INTEGRATION/):
`resume-asset-recovery.json`, `resume-network-blocker.json` e ricevuta test.
**559/559 Node PASS, 9/9 JMRI PASS, build PASS**, nuova esecuzione della suite
esistente senza ampliamenti R2. Log `resume-node.txt`, `resume-jmri.txt`,
`resume-build.txt` e riepilogo `resume-verification.json`.
Smoke browser Legacy desktop 1440×900 e mobile 390×844 eseguito con la fixture
preesistente: scena renderizzata, tre treni, otto controller, nessun errore
JS/console. Screenshot reali acquisiti e ispezionati, soltanto Legacy;
Auth sostituito nella fixture locale e RAF controllato, nessuna attestazione
OAuth, dinamica browser V06 o prestazioni hardware.

Sorgenti applicativi, Railway Core/F1, dataset, UI, asset tracciati,
dipendenze e workflow preservati; nessun merge, deploy o modifica Supabase.
Il checkpoint finale è registrato nella ricevuta di pubblicazione della
PR #21 dopo push fast-forward e verifica locale/remoto. Richiesto alla Regia
il Quality Gate **del recupero e del blocco**, senza dichiarare l'integrazione
completata o ammissibile al runtime. Unica prossima azione: applicare il dominio
mancante e riprendere la stessa implementazione già autorizzata.

---

# Storico — recupero del task e primo blocco asset

13 novembre 2026, Europe/Rome. **BLOCKED — integrazione non completata.**
Questo checkpoint registra il recupero e un impedimento concreto; non consegna
una versione V06 giocabile. Nessun PASS BROWSER/VISUAL V06 dichiarato.

## Stato recuperato

- Checkout iniziale pulito, branch `work`, HEAD `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`.
- PR #20 aperta e Draft, HEAD esatto `f592a12131b9b7236cbe79506cd23a03dacadd9f`.
  Rapporto R2B2 consultato: safety numerica positiva, deadlock sicuri distinti
  dal progresso. Nessuna nuova campagna numerica richiesta o avviata.
- La lettura dei commenti, degli status e dei workflow PR restituisce liste
  vuote: nessun fallimento remoto osservato, **nessuna attestazione CI remota**.
- Dopo fetch dei branch, nessun branch remoto V06-INTEGRATION trovato.
  Non è possibile escludere lavoro non pubblicato in un altro task.
- Creato `codex/scenario-v06-integration` direttamente dal checkpoint R2B2,
  senza merge/rebase/reset. La direttiva allegata autorizza l'integrazione
  completa e prevale sulle vecchie pause per microfase in AGENTS.md.

## Asset recuperati e impedimento

Pacchetto originale Drive `SERIE_N_V3_SCENARIO_V06_V1`, cartella
`1jtxcuVzYZ2EESRySKLBVzEB0r7Sj6wT3`; moduli `1I5MdBjtPraG9nyXYp-cSp3-jEsXlYbPg`.
Sette GLB trasferiti, **95.603.172 byte**, header GLB v2, dimensioni e SHA-256
verificati contro le voci del manifest originale:
mountain, mountain_rocks, tunnels_portals, station_platform, scenery_details,
gardens_allotments, vegetation. Cache locale: `/workspace/work/v06/assets/`;
non sono aggiunti al renderer o al repository come asset applicativi.

| Modulo non materializzato | Byte originali |
| --- | ---: |
| terrain.glb | 41.022.828 |
| village_buildings.glb | 91.596.468 |
| sawmill.glb | 59.400.628 |
| railway_service_buildings.glb | 36.688.380 |
| railway_visual.glb | 40.139.988 |

I file esistono su Drive: **non sono asset inesistenti**. Il connettore fornisce
un riferimento autenticato per terrain; la materializzazione nell'executor
fallisce con `file exceeds the executor transfer limit of 32 MiB`.
Tentato il download HTTP del riferimento restituito, anche con esecuzione
approvata fuori sandbox: `Tunnel connection failed: 403 Forbidden`.
Il dominio di quel download è `sdmntprdenmarkeast.oaiusercontent.com`, assente
dalla allowlist corrente. Gli altri moduli sopra superano lo stesso limite;
non si afferma di avere tentato il trasferimento di ciascuno.

Il manifest indica espressamente il caricamento congiunto di terreno,
montagna, massi, portali e sedimi per chiudere i bordi condivisi. L'assenza
locale del terreno impedisce la consegna della scenografia richiesta.
Non si sostituisce con terreno inventato o con il vecchio scenario.
Il GLB ferroviario rimane separato dalla decisione di realizzare la variante
visuale coerente con R02: nessun doppio binario o ibrido non verificato.

**STOP per il blocco asset previsto dalla direttiva §4.** Per riprendere serve
un canale di acquisizione funzionante: consentire i domini di download
restituiti dal connettore nelle impostazioni rete dell'ambiente, quindi
ottenere nuovi riferimenti e verificare l'accesso, oppure rendere disponibili
localmente i file originali con gli SHA indicati nell'inventario. Il 403 è del
proxy di rete; la revisione automatica dell'esecuzione non ha rifiutato l'azione.

## Test ed evidenze di questa ripresa

- **559/559 Node PASS**, eseguiti sulla baseline R2B2 prima di interventi.
- **9/9 Python/JMRI PASS**; build esbuild PASS.
- **Smoke Legacy PASS**, Chromium/SwiftShader, 1440×900 e 390×844:
  scena renderizzata, tre treni, otto controller, zero errori JS/console.
  Bootstrap Auth sostituito soltanto nell'harness locale, come nelle fixture
  esistenti; RAF del simulatore controllato per la cattura. Nessuna prova di
  movimento reale, OAuth, FPS hardware o browser V06.
- Screenshot Legacy realmente acquisiti e ispezionati; non sono immagini V06.
- Sorgenti applicativi, dataset, F1, Core, UI, Legacy, asset tracciati,
  Supabase, dipendenze e workflow invariati. Nessun merge/deploy.

[Log, inventario e schermate](evidence/V06_INTEGRATION/).
Tutti gli otto criteri di accettazione V06 restano **NON VERIFICATI**.
La versione eseguibile continua a essere Legacy; non esiste ancora un flag V06.

## Checkpoint e ripresa

Branch `codex/scenario-v06-integration`; parent unico R2B2 `f592a121…`.
Commit effettivo, verifica remoto e Draft PR collegata alla #20 sono riportati
nella ricevuta di consegna. La Draft documenta **BLOCKED**, non una integrazione
funzionante. Non è stata pubblicata alcuna modifica applicativa.

Unica prossima azione: acquisire gli asset bloccanti, quindi riprendere
l'implementazione verticale V06 già autorizzata, senza ulteriori audit R2.
