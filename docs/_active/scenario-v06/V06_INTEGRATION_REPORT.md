# V06-INTEGRATION — recupero del task e blocco asset

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
