# 6A.12-P — Staging readiness

**6A.12-P DESIGN DELIVERED — STAGING EXECUTION BLOCKED — MACRO 6A OPEN — 6B NOT AUTHORIZED.**

Progettazione del 5 novembre 2026, Europe/Rome. Base approvata e verificata:
`1da0675ca59cd47cffe79250f17419c929d90048`, repository `epivic-lab/SerieN`, solo
`feature/train-management`. R1 congelata: `348bfeff12c4005657098d89ea1d3c2ccdda9910`.
La Regia ha approvato 6A.11 **esclusivamente nel laboratorio single-broker**.
Nessun risultato di questo piano è un test di hosting o un'autorizzazione cloud.

## Audit di recupero e consegna

Checkout conservato, HEAD corretto, ascendenza e remoto verificati; working tree
inizialmente pulito. Nessun commit locale aggiuntivo, stash o bozza 6A.12 su disco.
I sette deliverable risultavano **ASSENTI**; ricerca pubblica già svolta e contratti
letti sono stati riutilizzati, senza ripetere le suite SQL/Chromium. Non è stato
necessario ricostruire commit, cambiare branch o recuperare un altro checkout.
AGENTS, PROGRESS, STATUS e i contratti D09/D10, lifecycle, broker, ownerless,
rollback, gate 6A.11 e mapping R0 sono le fonti locali, non un catalogo remoto.

| Deliverable | Audit iniziale | Consegna |
|---|---|---|
| Questo documento | ASSENTE | COMPLETO: prerequisiti, blocker, GO/NO-GO, fonti |
| [Hosting](6A12_HOSTING_ARCHITECTURE.md) | ASSENTE | COMPLETO: due opzioni, singola replica e fencing |
| [Compatibilità](6A12_SUPABASE_COMPATIBILITY.md) | ASSENTE | COMPLETO: direct/session/transaction e privilegi |
| [Provisioning e segreti](6A12_PROVISIONING_AND_SECRETS.md) | ASSENTE | COMPLETO: identità, job, rotazione, journal |
| [Runbook](6A12_STAGING_RUNBOOK.md) | ASSENTE | COMPLETO: sequenza futura con punti di arresto |
| [Test e recovery](6A12_TEST_AND_RECOVERY_PLAN.md) | ASSENTE | COMPLETO: prove ordinarie e distruttive separate |
| [Costi e autorizzazioni](6A12_COST_AND_APPROVAL_GATE.md) | ASSENTE | COMPLETO: prezzi verificati, incognite e decisioni |

COMPLETO significa documento revisionabile; non significa infrastruttura pronta.
Il progetto reale `vehfrjgifzjjgamrgwze` resta nella denylist, anche per metadata,
SQL read-only, backup o prove di connettività. Nessun progetto remoto è stato
creato, interrogato o configurato; nessun servizio o add-on attivato.

## Raccomandazione e invarianti

Proporre una VM AWS EC2 fissa, senza autoscaling, con ingresso HTTPS separato dal
broker privato; SQL **direct TLS** a un progetto Supabase nuovo e indipendente.
Provisioner operatore fuori banda e secret manager con identità macchina.
Alternativa concreta: Render ingresso + private service con disco persistente e
OIDC, subordinata alle prove di fencing e pooling. Nessuna scelta a pagamento è
stata effettuata. I provider sono proposte, non destinazioni già autorizzate.

D09=A resta: broker fidato, LOGIN distinto per dispositivo/versione, autorità SQL
da `session_user`, sei API e claim in COMMIT autonomo prima dei dati. Nessun SQL
arbitrario HTTP, shared login+SET ROLE, credenziale privilegiata nel broker o nel
browser. Il broker compromesso può impersonare i dispositivi di cui ha segreti:
non si promette resistenza a quel compromesso o a root dell'host.

D10 resta: nuovi workspace ownerNULL senza Auth; ledger di provenienza legacy,
FK domain sempre operative, snapshot/receipt storici immutabili. Le sole due
identità Auth della futura fixture saranno sintetiche, iniziali, poi eliminate.
Non sono shadow users per consentire il funzionamento di C/D.

L01 resta **FAIL nel multi-broker: 32 connessioni osservate contro budget 16**.
La guardia del launcher locale non dimostra esclusività su hosting. Il piano
permette soltanto un broker, sostituito con downtime e fencing provato prima del
subentro. Non propone un coordinatore distribuito o un passaggio implicito a B/C.
Profilo sintetico chiuso invariato; nessun serializer/hydrator generale o runtime R1.
[Mapping R0 P01–P18](R0_ACCEPTANCE_MAPPING.md) e tutti i contratti precedenti restano
immutati: il piano infrastrutturale non promuove criteri del simulatore a PASS.

## Registro dei blocker

| ID | Stato attuale | Condizione concreta di sblocco / responsabile |
|---|---|---|
| B01 Ambiente | NON AUTORIZZATO | Regia/utente scelgono organizzazione, nome, regione, owner e ref del **secondo** progetto; denylist produzione verificata fuori dal target |
| B02 Spesa | NON AUTORIZZATA | Approvare preventivo completo e tetto proposto USD75/7 giorni, o alternativa; IVA, residui e lavoro espliciti, nessun importo ignoto ammesso al GO |
| B03 DDL gestito | RICHIEDE PROVA STAGING | Probe CREATE/ALTER/NOLOGIN/membership/ownership/DDL atomico e default ACL con identità operatore consentita; niente assunzione di superuser |
| B04 Delega lifecycle | RICHIEDE PROVA STAGING | Separare control/redeemer/provisioner API da DDL; job operatore manuale ammesso da D09 solo se approvato; automazione ristretta non dichiarata disponibile |
| B05 Trasporto | RICHIEDE PROVA STAGING | Direct SCRAM/TLS, CA/hostname, session_user; session pooling solo dopo probe dedicati e misure di tutti i backend |
| B06 L01 hosting | RICHIEDE PROVA STAGING | Unica macchina/servizio autorizzato, esclusione prima del secondo avvio, stop/fence e zero vecchie sessioni; chiudere ingresso se dubbio |
| B07 Secret/journal | DA PROGETTO A IMPLEMENTAZIONE AUTORIZZATA | Adapter operativo, identità minima, versioni, registro revoche e restore fail-closed; il file/journal lab non basta |
| B08 Fixture/migrazioni | DA VALIDARE | Baseline vuota reale gestita, nessuno stub Auth; manifest, ordine migrazioni, clone restore e default ACL per creator |
| B09 Packaging | DA IMPLEMENTARE SOLO CON NUOVA AUTORIZZAZIONE | Endpoint/CA/audience configurabili, segreti operativi, supervisor single-broker, niente hook di fault nel servizio normale |
| B10 Recovery post-loss | NOT VERIFIED | Clone dedicato, autorizzazione distruttiva distinta, riconciliazione di DB/journal/secret/revoche e scritture confermate |
| B11 Account/operazioni | DA DECIDERE | MFA, accesso amministrativo, custodi segreti, finestre di fermo, carico e cancellazione risorse con eventuale residuo di fatturazione |

I B03–B06 sono esperimenti da autorizzare, non ragioni per interrogare il progetto
reale. Nessuna incompatibilità gestita è stata dimostrata: l'architettura proposta
ha un percorso plausibile D09, **hosting NOT VERIFIED**. Se uno dei presupposti
necessari fallisce, dichiarare **ARCHITECTURE BLOCKED** e tornare alla Regia; non
allargare privilegi o sostituire il modello. Distinguere questo caso dall'attuale
STAGING EXECUTION BLOCKED per autorizzazioni e verifiche ancora mancanti.

## Gate progressivi, senza autorizzazione implicita

1. **GO al solo probe di fattibilità**: autorizzazioni ambiente/costi firmate,
   ref staging identificato, account separato e permessi operatore; niente broker
   aperto o migrazioni applicative finché i probe minimi non passano.
2. **GO a migrazioni/integrazione**: B03–B05 passati, backup/restore preliminare
   su clone autorizzato, adattamenti di packaging/fixture implementati in incarico
   esplicito, review del diff e credenziali segregate. Poi ordine del runbook.
3. **GO al traffico sintetico limitato**: ACL/RLS/Auth0/storico integri, fencing,
   secret store e budget verificati. Nessun traffico reale o simulatore collegato.
4. **GO a fault distruttivi**: separato, su clone identificato con costo/RPO/RTO
   approvati; non incluso nella prima esecuzione condivisa dello staging.

NO-GO a qualunque target ambiguo, preventivo incompleto, LOGIN condiviso,
principal/secret fuori binding, recupero che riattiva grant, seconda replica o
impossibilità di osservare le sessioni precedenti. Chiusura macro 6A e 6B restano
altri gate: nessuna loro autorizzazione deriva dall'approvazione di questi documenti.

## Registro delle fonti ufficiali

Consultazione pubblica il **5 novembre 2026, Europe/Rome**, tramite ricerca docs
Supabase e browser di ricerca, senza strumenti di progetto/account. Fatto
pubblicato, interpretazione e prova mancante sono separati nella compatibilità.
Il changelog `.md` non è leggibile dal tool (content-type non supportato); il
corrispondente HTML e le voci pertinenti sono stati consultati con successo.
Il proxy shell non include supabase.com: nessuna modifica di policy o aggiramento.
Le pagine generiche possono essere meno aggiornate delle sezioni specializzate.

| ID | Fonte ufficiale / URL | Uso e limite |
|---|---|---|
| S01 | [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) | Direct, IPv6/IPv4, session/transaction; non prova login del nostro principal |
| S02 | [Pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits) | Pagina aggiornata 27 ottobre; rinvia alla FAQ per i pool per ruolo |
| S03 | [Supavisor FAQ](https://supabase.com/kb/troubleshooting/supavisor-faq-YyP5tI) | Aggiornata 4 novembre: combinazioni user/db/mode, retention backend, servizi; cap globale da misurare |
| S04 | [Connection management](https://supabase.com/docs/guides/database/connection-management) | Servizi e riserve; percentuali indicative non sono il budget SerieN |
| S05 | [Postgres roles](https://supabase.com/docs/guides/database/postgres/roles) | Custom LOGIN documentati, non delega completa di tutti i DDL |
| S06 | [Superuser e operazioni non supportate](https://supabase.com/docs/guides/database/postgres/roles-superuser) | postgres gestito non è superuser |
| S07 | [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Grant separati dalle policy; non usare JWT Auth come autorità D09 |
| S08 | [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) | Exposed schemas, funzioni e default privilegi per creator |
| S09 | [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement) | verify-full; aggiornare enforcement può riavviare il DB |
| S10 | [Network restrictions](https://supabase.com/docs/guides/platform/network-restrictions) | CIDR IPv4/IPv6, direct e pooler; non protegge automaticamente Data API HTTP |
| S11 | [Changelog](https://supabase.com/changelog) e [CLI v3](https://supabase.com/changelog/supabase-cli-v3) | Default local/consenso hosted; help/versioni da ricontrollare prima dell'esecuzione |
| S12 | [Postgres 15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) | Minor e compatibilità restore, non disponibilità del nostro nuovo target |
| S13 | [Data API opt-in](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) | Nuovi default; non affidarsi a essi al posto di ACL/RLS |
| S14 | [Restore credential resync](https://supabase.com/changelog/restore-credential-resync) | Fix del ripristino fisico gestito; non promette riconciliazione dei nostri custom secret |
| S15 | [Pricing](https://supabase.com/pricing), [compute](https://supabase.com/docs/guides/platform/manage-your-usage/compute), [compute/disk](https://supabase.com/docs/guides/platform/compute-and-disk) | Listini pubblici, non preventivo dell'organizzazione |
| S16 | [PITR pricing](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery) | Add-on separato, fuori spend cap; non incluso nella proposta minima |
| H01 | [AWS EC2 IAM roles](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html), [stati istanza](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html) | Credenziali temporanee e stop; stesso ruolo può essere assegnato a più VM |
| H02 | [Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/) | Prezzi per oggetto/API, nessun secret creato |
| H03 | [VPC pricing](https://aws.amazon.com/vpc/pricing/), [EC2 on demand](https://aws.amazon.com/ec2/pricing/on-demand/), [EBS pricing](https://aws.amazon.com/ebs/pricing/), [S3 pricing](https://aws.amazon.com/s3/pricing/) | IPv4 verificato; VM/volumi/backup richiedono quote regionali, non prezzi inventati |
| H04 | [Render persistent disks](https://render.com/docs/disks) | Disco esclusivo e stop prima del redeploy; non prova zero sessioni SQL |
| H05 | [Render OIDC](https://render.com/docs/oidc) | Identità per service; richiede workspace Pro o superiore |
| H06 | [Render pricing](https://render.com/pricing) | Pagina consultata; quote complete non ricavabili dall'estrazione, DA ACQUISIRE |

Alcune ricerche iniziali Render `/docs/instance-types` e `/docs/openid-connect`
non hanno restituito contenuto; il riferimento corretto OIDC è H05. Nessuna
conclusione di costo o esclusività è fondata su quelle pagine irraggiungibili.
Per H03 sono cataloghi per il preventivo futuro, non tariffe regionali già verificate.

## Verifiche di questa consegna

Controlli documentali: perimetro di soli nove Markdown, link locali, presenza dei
sette deliverable, riferimenti D09/D10/L01, assenza di valori di credenziali,
diff e uguaglianza di ogni altro file tracciato alla base 6A.11. Build e test
locali applicabili sono registrati in PROGRESS; nessuna nuova suite remota o SQL.
Le prove 6A.11 restano evidenze approvate **ereditate**, non rieseguite o sommate
come nuovi PASS di questa fase. Nessuna nuova certificazione visuale/performance R1.

Verifica finale locale: **PASS documentale**, sette deliverable e nove soli file
Markdown cambiati;1777file della base6A.11 byte-identici.38link locali e29URL
ufficiali censiti (link remoti consultati come indicato nel registro, non test
su account).213righe di tabelle controllate per struttura; sette migrazioni/baseline
in ordine e autorizzazioni AU01–AU10 presenti. Scansione pattern senza riscontri
per chiavi/token reali; nessun valore di credenziale introdotto.

Eseguiti qui: `npm test` **37unità file PASS**, Python/JMRI **9test PASS**,
`npm run build` **PASS**. Nessuna suite SQL/Chromium o test hosting rieseguito.
Log locali conservati in `/workspace/work/6A12-P/`; risultati e metodo essenziali
sono riportati qui per non dipendere da quel workspace. Controllo riproducibile:
`git diff 1da0675ca59cd47cffe79250f17419c929d90048 --name-only` deve elencare soltanto
i sette documenti ePROGRESS/STATUS; diff/check e confronto R1 runtime separato.
Canonico SHA256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`;
bundle SHA256 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`.
La verifica sorgenti non è una nuova campagna visuale/prestazionale R1.
