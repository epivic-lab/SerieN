# 6A.12-R — Limiti Free, capacità e rischi

**Valutazione progettuale, 5 novembre 2026, Europe/Rome. Nessun servizio acquistato.**
Obiettivo0€ ricorrenti **entro le quote**, non garanzia di scala o disponibilità
illimitate. Organizzazione reale verificata Free. Il lavoro di sviluppo, backup e
manutenzione richiede tempo anche senza abbonamenti; nessuna tariffa oraria stimata
o spesa operativa approvata. [Architettura W](6A12R_FREE_BROWSER_ARCHITECTURE.md).

## Quote verificate su fonti ufficiali

| Risorsa | Free documentato | Conseguenza per SerieN |
|---|---|---|
| Database |500MB/progetto, compute condiviso |Registry, indici, nonce, storico e receipt competono per spazio; misura effettiva necessaria |
| Edge invocations |500.000/mese incluse |Contare reads, saves, retry, lifecycle, richieste ostili e overhead misurato |
| Edge runtime |256MB memoria;2s CPU/request;150s durata worker Free e idle timeout |No simulazione server o import pesanti; validazione generale2MiB da profilare, I/O non è CPU |
| Edge bundle/funzioni |20MB bundle CLI locale /5MB server-side;100funzioni/progetto |Un API gateway piccolo e dipendenze fissate; niente assets Three.js nel backend |
| Secrets Edge |100/progetto; nomi max256caratteri, prefisso SUPABASE_ riservato |Secret gestiti server senza secret manager pagato; verificare dimensioni e disponibilità senza leggerne valori |
| Egress |5GB non cached +5GB cached inclusi/mese |API privata non presume cache; asset statici su Pages; scope/periodo di quota da usage organizzazione |
| Storage |1GB |Non necessario per il primo salvataggio JSON; non caricare automaticamente asset/backup di produzione |
| Auth MAU |50.000/mese |Solo alternativa AAuth; righe utenti persistenti occupano comunque DB, cleanup non automatico |
| Realtime |2milioni messaggi,200connessioni peak |Rinviato; nessun polling/sync realtime indispensabile al motore locale |
| Progetti Free |2attivi; pausa dopo1settimana inattività |Si usa solo SerieN; nessun keepalive per aggirare sospensione, nessun SLA dichiarato |
| Backup |Backup automatici giornalieri documentati per piani a pagamento; Free richiede export proprio |Dump verificato e copie private fuori progetto; PITR non assunto gratuito |
| GitHub Pages |Repo pubblico su GitHub Free; sito≤1GB, banda soft100GB/mese, deploy≤10min |Controllare assets e output pubblicato; workflow Actions non ha il soft10build/ora di Pages classico |

Le quote mensili possono essere condivise a livello organizzazione; non assumere
che altri progetti consumino zero. `Unlimited API requests` non elimina quote
CPU/database/egress/Edge. Non abbiamo letto usage mensile o dimensione sito
pubblicato: capacità residua NOT VERIFIED. Snapshot attuale DB12.031.667byte non
è la metrica di fatturazione. Policy Free sopra quota può portare notifiche, grace
period e restrizioni: non promettere un 429 esattamente alla soglia contrattuale.
Nessun upgrade automatico, add-on IPv4, dominio custom, PITR, log drain o Redis
esterno previsto. Se serve spesa, STOP e nuova decisione dell'utente.

## Dimensionamento trasparente

Esempi **ipotetici**, non traffico misurato. Le unità KB/MB sotto sono decimali;
il massimo payload contrattuale è2MiB. Sia S=sessioni/mese, M=salvataggi/sessione,
L=letture/sessione, R=retry e lifecycle/overhead aggiuntivi. Con un'unica Edge per
operazione: `I = S × (M + L) + R`; claim e dispatch sono due transazioni DB ma
**una** invocazione Edge. Rilevare separatamente preflight/errore/fatturazione.

| Scenario | Ipotesi | Consumo e limite dominante |
|---|---|---|
| Uso leggero |100sessioni/mese,20save+5read |2.500invocazioni prima degli extra; con100KB/risposta250MB di egress |
| Crescita |1.000sessioni,30save+5read |35.000invocazioni;100KB/risposta3,5GB, molto meno margine egress |
| Storico leggero |2.000save nuovi/mese ×100KB payload |200MB/mese solo payload; indici/proiezioni/receipt riducono ulteriormente autonomia |
| Snapshot grandi |200nuove revisioni ×2MiB |419.430.400byte solo payload, quasi tutta quota DB prima di indici e base |
| Autosave ingenuo |100device ×60save/ora ×2ore/giorno ×30giorni |360.000invocazioni solo save e crescita storico incompatibile senza altra decisione |

Non salvare a ogni frame/tick. Cattura coerente su richiesta, debounce/coalescing
di cambiamenti **prima** di assegnare envelope immutabile; mai sostituire richieste
già inviate. Autosave eventuale solo dopo misure e budget di storage sostenibile.
I save devono restituire ricevuta compatta; read snapshot ha payload completo e
limite esplicito distinto. Il vecchio cap risposta256KiB non può supportare in
silenzio un DTO generale2MiB: la fase di generalizzazione deve dimensionare e
approvare response cap, paginazione history e budget egress, senza troncamenti.

Proposta soglie interne, **non limiti piattaforma**: warning al60%, stop nuove
scritture e bootstrap all'80% del budget assegnato di spazio/invocazioni/egress;
riserva20% per letture/recovery/export e servizi. Contatori applicativi durevoli
e uso provider non sono identici: confrontarli, fail-closed se misura critica
obsoleta. Non cancellare snapshot/receipt per liberare quota. Nessuna retention
finita autorizzata implicitamente dal requisito di costo zero.

## Registro rischi e gate

| Rischio | Controllo proposto | Stato / gate |
|---|---|---|
| D09 incompatibile con stateless |Nuova decisione W con confine SQL/RLS e trusted Edge espliciti |PENDING Regia, non implementato |
| L01 aggregate32/16 nel lab |Budget Supavisor/custom role e misure globali, slot SQL xact per ammissione lavoro |FAIL storico conservato; cap hosted NOT VERIFIED, blocca apertura |
| Cold start e round-trip claim/dati |Regione DB eu-west-3; bench browser cold/warm e lock separati |Latenza hosted NOT VERIFIED; proposta p95warm<2s/cold<5s da validare, nessuna garanzia |
| CPU validazione generale |Fixture minima/media/massima, JCS/crypto/schema e semantica sotto2s |NOT VERIFIED; rifiuto esplicito prima del timeout, nessun validatore ridotto tacito |
| Connessione persa/commit incerto |Timeout4sSQL/3slock, transazioni distinte; nuova proof/stesso request_id, receipt |Semantica laboratorio riusabile; nuovo percorso NOT VERIFIED |
| Replay dopo rollback/restart/multiworker |Claim SQL committato separatamente, unicità e retention temporale corretta |Gate locale e gestito; RAM vietata come autorità |
| Rate limit solo per isolate |Bucket globali/workspace/device SQL atomici, cap storage/operazioni/bootstrap |Proposta30req/min/device e120workspace, burst5/20; numeri da provare e approvare |
| Abuso pre-auth/Sybil |Body/tempo/costi di parsing limitati, admission bootstrap globale; eventuale CAPTCHA gratuito esplicito |DB rate limita operazioni autorizzate, non invocazioni Edge ostili; mitigazione incompleta prima della prova |
| Secret o Edge compromesso |Segreti server gestiti, kid revocabile, login limitato; niente admin client in data path |Credenziali privilegiate predefinite possono restare accessibili al runtime; rischio trust da accettare |
| XSS/supply chain |Dipendenze fissate/lock, niente unsafe HTML/eval, CSP compatibile e URL approvati |Revisione mirata in implementazione; chiave non estraibile non neutralizza XSS |
| Chiave persa/browser storage cancellato |Recovery kit offline o device già autorizzato; export checkpoint privato |Senza entrambi non promettere recupero; quota/eviction IndexedDB da testare |
| Due tab/device |CAS, journal durabile, Web Locks/BroadcastChannel come coordinamento locale più fallback |CAS SQL autoritativo; API browser diverse da provare, nessun last-write-wins implicito |
| DB pausa/quota/esaurimento |Locale continua, stato pending chiaro, export manuale; nessun keepalive o pagamento automatico |App pubblica ma disponibilità cloud non garantita |
| Backup/restoration |Dump completo leggibile, restore locale e manifest, piano forward-fix |Backup reale NON eseguito; gate predeploy obbligatorio |
| Free e immutabilità illimitata |Stop scritture a budget, export e decisione separata retention/capacità |0€ sostenibile solo a volume limitato; nessun archivio infinito promesso |
| Version skew |Endpoint/schema/DTO/kid/build versionati; fail-closed incompatibilità |Contratto nuovo da testare, niente downgrade automatico |

Un esempio Redis/Upstash nelle docs non impone un servizio esterno: il piano
propone bucket SQL. Limiti di chiamate Edge→Edge non sono rate limiting inbound;
non confonderli con protezione DDoS. Evitare function chaining del tutto nel percorso
minimo. Progetto singolo semplifica costi, ma aumenta rischio di errore operativo:
backup, gate e feature flag sono indispensabili.

## Fonti ufficiali e limiti dell'evidenza

Consultate il5novembre2026 con Supabase search_docs e web reader. Changelog.md
non leggibile dal reader per content-type markdown: usato changelog HTML,
inclusa nota breaking CLI3 del4novembre. Le pagine non certificano la configurazione
SerieN; dove esempi e documenti divergono (es. limiti recursive) non se ne deduce
alcuna garanzia e si esclude la dipendenza. Versioni esatte SDK/CLI si fissano nella
fase implementativa dopo help/changelog, non si aggiungono dipendenze ora.

| Fonte | Evidenza usata |
|---|---|
| [Supabase pricing](https://supabase.com/pricing) |Free, risorse incluse, inattività e confronto piani |
| [Billing](https://supabase.com/docs/guides/platform/billing-on-supabase) |Quote invocazioni/MAU/storage/realtime e ambito organizzazione |
| [Edge limits](https://supabase.com/docs/guides/functions/limits) |CPU/memoria/durata/bundle/funzioni/secrets, pagina aggiornata29ottobre |
| [Invocations usage](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations) |Quota mensile e misurazione usage |
| [Storage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size) |Quota1GB e gestione superamento Free/fair-use |
| [Edge auth](https://supabase.com/docs/guides/functions/auth) |Auth mode, verify_jwt e responsabilità del handler custom |
| [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous) |Account reali, authenticated, perdita sessione, abuse, no cleanup automatico |
| [Edge/Postgres](https://supabase.com/docs/guides/functions/connect-to-postgres) |Driver server e connessioni, RLS client vs admin |
| [Database connection](https://supabase.com/docs/guides/database/connecting-to-postgres) |Transaction/session/direct e compatibilità da riprovare |
| [Edge secrets](https://supabase.com/docs/guides/functions/secrets) |Secret lato server e variabili predefinite, non isolamento processo |
| [Regional invocation](https://supabase.com/docs/guides/functions/regional-invocation) |Località utente vs regione DB e scelta da misurare |
| [Edge deployment](https://supabase.com/docs/guides/functions/deploy) |Distribuzione/versioni, non comando autorizzato in questa fase |
| [Backups](https://supabase.com/docs/guides/platform/backups) |Backup giornalieri piani pagati, export proprio per Free |
| [Changelog](https://supabase.com/changelog) |CLI3 target locale predefinito, conferme hosted e flag/versioni da verificare |
| [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |Disponibilità Free repo pubblico, banda/sito/build e rate limiting |

Fonti PostgreSQL/ACL/pgcrypto e connessioni già censite nel
[D09 storico §6](6A7_ARCHITECTURE_DECISIONS.md); nessuna nuova disponibilità di
estensione P-256 dedotta. Conteggi/configurazione reale nell'
[audit](6A12R_PRODUCTION_MIGRATION_PLAN.md). **Nessun PASS hosting/costo sotto carico
o disaster recovery è dichiarato da questa revisione.**
