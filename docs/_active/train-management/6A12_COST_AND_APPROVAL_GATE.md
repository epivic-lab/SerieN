# 6A.12-P — Costi e autorizzazioni prima dell'attivazione

**Nessuna spesa o risorsa autorizzata da questo documento.**
Prezzi pubblici consultati il5novembre2026, Europe/Rome; fonti S15/S16/H01–H06 in
[readiness](6A12_STAGING_READINESS.md). Valuta dei listini: USD. IVA, cambio,
condizioni account/regione e preventivi mancanti non sono inclusi automaticamente.
Non sono stati letti account, piano, credito disponibile o fatture dell'utente.

## Ipotesi e tre percorsi

Proposta principale da deliberare: **un nuovo progetto Supabase Pro/Micro**, una
VM EC2 fissa x86_64 con2vCPU/2GiB come taglio da quotare, un volume cifrato e un
solo IPv4 pubblico per HTTPS; SQL direct su IPv6 senza add-on Supabase IPv4.
Durata massima proposta7giorni/168ore, nessun rinnovo operativo implicito.
Due workspace C/D, fino a18device attivi, massimo32principal device/versione più
servizi, massimo40oggetti secret e100000APIcall secret; nessuna promessa di capacità
produttiva. Quote storage/WAL/log/backup/egress da congelare nel preventivo.

| Percorso | Vantaggio | Costo/limite e decisione |
|---|---|---|
| Minimo probe Free/Nano, durata proposta72ore |Verifica preliminare ruoli/identità senza quota compute pagata Supabase |S15:0USD,500MB database, pausa per inattività e limite2progetti attivi; disponibilità account NON VERIFICATA. Nessun PITR/backup gestito assunto; hosting/segreti restano da pagare e autorizzare. Non è un PASS dello staging completo |
| Pro/Micro7giorni + hosting A |Isolamento organizzativo e percorso persistente controllabile; proposta raccomandata per integrazione limitata |Calcolo prudente sotto, tetto proposto75USD; NO-GO finché preventivi e autorizzazioni non sono completi |
| Operativo successivo |Stessa architettura singolo broker, periodo30giorni e manutenzione continuativa |Nuovo dimensionamento/SLO/budget; nessun uso reale prima degli altri gate. Small/PITR solo se necessari, quotati e approvati; multi-broker escluso |

Un'organizzazione staging separata è preferibile per isolare accessi/billing; se
si preferisce un secondo progetto nell'organizzazione attuale, la Regia deve
valutare i privilegi organizzativi e le quote condivise **senza modificare il
progetto reale**. Nessuno sconto, free slot o credito viene presunto disponibile.

## Listino verificato e informazioni mancanti

| Voce | Fatto pubblico verificato / fonte | Trattamento nel preventivo |
|---|---|---|
| Piano Supabase Pro |S15:da25USD/mese per organizzazione |Conteggiare un intero ciclo nel calcolo prudente; disponibilità/prorata/IVA da confermare |
| Compute Micro |S15:0.01344USD/ora, circa10USD/mese;1GB, shared CPU |168ore=2.25792USD prima dei crediti; il taglio non prova throughput né17.11 sul target |
| Compute Small eventuale |S15:0.0206USD/ora, circa15USD/mese;2GB |Alternativa futura, non upgrade automatico per fare passare carico/PITR |
| Crediti compute |S15:10USD/mese per organizzazione a pagamento, non per progetto; non cumulativi |Modello netto:dedurre soltanto credito residuo verificato. Nel bound prudente nessuna deduzione |
| Limiti connessioni Micro |S15 compute/disk:60backend,200client pooler, defaultpool15 |Sono numeri di listino, non budget app16 o osservazioni. Pool/servizi/reserve reali da misurare; S03 prevale sul significato per combinazione |
| Secrets Manager |H02:0.40USD/secret/mese;0.05USD/10000APIcall, versioni non contate come nuovi oggetti nel prezzo d'esempio |Bound prudente40×0.40=16USD per un mese,100000call=0.50USD; pruning/retention e conteggio oggetti obbligatori |
| IPv4 pubblico AWS |H03:0.005USD/IP-ora, anche se idle |168ore=0.84USD; rilasciare IP non equivale a fermare VM e viceversa |
| VM EC2/regione |H03 catalogo on-demand; non estratto un preventivo regionale firmato |DA ACQUISIRE:instance type, region, Linux, ore, eventuale CPU burst, nessun uso di spot/autoscaling |
| EBS/journal/snapshot |H03 catalogo EBS; dimensioni e retention non ancora decise |DA ACQUISIRE:GiB, IOPS/throughput inclusi, snapshot/copie, cifratura e residui dopo stop |
| Clone R01 obbligatorio prima del DDL |Il rehearsal gestito richiede un clone/progetto temporaneo distinto o un percorso di restore equivalente esplicitamente approvato |DA ACQUISIRE costo di creazione/compute/backup/teardown; AU09 distinto. Non incluso gratuitamente o automaticamente nel secondo progetto |
| Backup off-host/registro revoche |H03 catalogo S3, richieste/versioni/retention/regione da scegliere |DA ACQUISIRE:storage, API, cifratura, retention e cancellazione; nessun importo zero implicito |
| Storage Supabase/WAL |S15:Pro include8GBdisk/progetto; S15compute distingue dimensione raccomandata/compute da storage incluso |No conversione del limite consigliato10GBMicro in quota gratuita. Misurare WAL, slot, crescita e retention; costo extra/limiti da quotare |
| PITR facoltativo |S16:7giorni0.137USD/ora (~100USD/mese);14giorni0.274;28giorni0.55 |Non incluso.7giorni di attivazione7-day=23.016USD prima di altri costi; eleggibilità/compute e clone da confermare, AU09 separata |
| Rete/egress/DNS/TLS |Endpoint pubblico e servizi secret/backup generano traffico; regione/account incidono |DA ACQUISIRE quote/rate regionali e dominio; nessun NAT Gateway, loadbalancer o PrivateLink tacitamente attivato |
| Log/monitor |Supabase changelog25settembre annuncia billing usage-based; metriche/provider esterni dipendono dal piano |DA ACQUISIRE volume ingest/query/retention/allarmi. Il periodo di grazia annunciato non è uno sconto di progetto garantito |
| Hosting B Render |H04 disco su servizio pagato, H05 OIDC richiede workspace Pro+; H06 non espone un quote completo nel fetch |DA ACQUISIRE workspace+dueistanze+disco+rete/log; non usare vecchi prezzi Starter o OIDC gratuito |
| Lavoro operatore |Stima progettuale, non prezzo di mercato:12–16ore fra setup, prove, audit, cleanup |Tariffa oraria e disponibilità da approvare separatamente; non assunte gratuite |

Calcolo prudente **parziale**, non preventivo completo del trial Pro/Micro+A:

```text
25.00 piano + 168*0.01344 compute + 40*0.40 secret
+ (100000/10000)*0.05 API secret + 168*0.005 IPv4
= 44.59792 USD ≈ 44.60 USD

Totale = 44.60 + VM + EBS/snapshot + backup/registro + rete/DNS
         + clone R01 + log/monitor + IVA/cambio/altre voci quotate − crediti verificati
Lavoro = ore effettivamente approvate * tariffa approvata, separato
```

Contare piano e compute senza dedurre il credito è un bound prudente, **non** la
fattura attesa: il primo progetto può essere coperto dai crediti indicati dal
listino, un secondo no se già consumati. Non usare lo stesso credito due volte.
Il bound40secret/mese evita di presumere prorata o cancellazione immediata.
Soglie di APIcall valgono per adapter+monitoring; leggere il secret a ogni richiesta
può aumentarne il costo, non si introduce una cache permissiva per risparmiare.

**Tetto proposto, NON AUTORIZZATO:75USD complessivi di servizi per7giorni**, incluse
le voci ignote e fiscalità concordata. Residuo aritmetico rispetto al parziale:
30.40USD. Se le quote mancanti non rientrano o il tetto fiscalmente non è definito,
NO-GO; scegliere un trial più corto o sottoporre un nuovo preventivo. Costi del
lavoro devono avere un tetto distinto prima di incarichi a pagamento. Non attribuire
75USD a una tariffa del provider o a un'autorizzazione già ottenuta.

## Controllo del costo e sostenibilità

S15/S16: compute e PITR **non** sono coperti dallo spend cap Supabase. Anche IPv4,
volumi e subscription possono restare fatturabili dopo lo stop. Un budget alert
ha ritardo e non è un hard cap. Prima del GO occorrono owner del billing, quote,
calcolo del worst case, scadenza delle risorse, monitor e arresto preventivo con
margine. Proposta: review giornaliera, allarmi al50%/75%, stop nuove prove all80%
del tetto incluse spese impegnate, costo di teardown e ritardo di fatturazione.
Se tale margine non è quantificabile, non avviare il trial.

Per30giorni futuri: `piano + h*compute − credito_residuo + host + oggetti_secret
+ API + storage/WAL + backup/PITR + rete + log + lavoro`. Non moltiplicare solo il
costo di sette giorni: alcune voci sono mensili, retention continua e consumo
cresce con grant ritirati. Manutenzione indicativa2–4ore/mese più patch/incidente,
stima da validare, non SLA. Cleanup di ruoli dopo revoca/NOLOGIN/zero sessioni e
inventario dipendenze, senza eliminare job/receipt per ridurre la fattura.

Multi-broker futuro: aggiunge compute, distribuzione/backup segreti, monitoraggio,
fencing e verifica del nuovo budget globale; il costo di sviluppo/audit è da
stimare solo dopo decisione architetturale separata.32connessioni non diventano
accettabili perché il tier potrebbe ospitarle: L01/limite16 resta vincolante.

## Registro delle approvazioni richieste — tutte PENDING

| ID | Decisione che Regia/utente devono fissare prima dell'operazione |
|---|---|
| AU01 |Creazione secondo progetto:organizzazione, nome proposto `serien-tm-staging`, regione, owner; dopo creazione ref nella allowlist. Nome proposto non è una risorsa creata |
| AU02 |Piano, quote complete, durata/scadenza e tetto servizi proposto75USD/7giorni, IVA/cambio e tetto lavoro; billing owner e regole di stop |
| AU03 |Provider A/B, taglio/host oserviceID, rete/TLS/secretstore/log/backup/deploy; single-broker, fermo durante sostituzione, IAM e fencing; qualunque configurazione/downtime remoto |
| AU04 |Accessi staging, inventory/backup e probe privilegi/connessione su scratch; elenco DDL di fattibilità, ruoli e cleanup limitato; nessun progetto reale |
| AU05 |Due baseline storiche, cinque migrazioni in ordine, fixture sintetica e dueAuth iniziali, loro eliminazione dopo D10, C/D e Data API negativi. Ogni altra cancellazione esclusa |
| AU06 |Incarico esplicito per adapter/packaging/fixture necessari e successiva review; scelta provisioning manuale iniziale o altra delega provata; custodi/identity/retention/registro revoche |
| AU07 |Profili di carico T19–T20, device/ruoli,96richieste massime per batch, numero batch e limiti di rate/storage/WAL/egress costo nella scheda; nessun load pubblico indiscriminato |
| AU08 |Fault controllati T12/T13/T20/T22–T24 sui soli processi/risorse propri con dati conservati; finestre e downtime espliciti, abort automatico |
| AU09 |Autorizzazione distinta per clone e restore preliminare R01; poi separata estensione nominativa per R02–R06 host/volume/store/DBloss/PITR/post-write, budget/RPO/RTO/blast radius. Nessuna di queste prove sulla prima primaria condivisa |
| AU10 |Cleanup/pausa/eliminazione esatta delle risorse staging, retention evidenze/backup/secret, costi residui e conferma billing; nessuna cancellazione di dati confermati senza consenso nominativo |

Campi non compilati o un sì generico al piano non costituiscono consenso a
servizi, migrazioni, test di carico o restore. L'organizzazione ospitante potrebbe
avere ruoli/piani diversi: non dedurli dal fatto che è collegato un solo progetto.
La prima decisione richiesta è **audit del piano**, poi autorizzazioni economiche
e operative esplicite. Non si richiede di eseguire subito lo staging.

**6A.12-P DESIGN DELIVERED — STAGING EXECUTION BLOCKED — MACRO 6A OPEN — 6B NOT AUTHORIZED.**
STOP per la Regia. Nessuna6A.12 operativa,6A.13 o6B avviata.
