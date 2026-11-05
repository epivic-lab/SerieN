# 6A.12-P — Compatibilità Supabase gestito

**Analisi documentale, nessuna connessione remota o prova staging eseguita.**
Fonti S01–S16, date e limiti in [readiness](6A12_STAGING_READINESS.md).
Gli stati sotto qualificano il requisito indicato, non certificano il sistema.

## Matrice requisito / fonte / interpretazione / verifica

| Requisito | Fatto e fonte | Interpretazione D09/D10 | Esito attuale / prova mancante |
|---|---|---|---|
| PostgreSQL17 gestito |S12 documenta rollout17.11; S15 riporta compute/configurazioni attuali |Richiedere PG17, inventariare versione completa, estensioni, timezone/collation; il locale17.11 non è quel servizio |COMPATIBILE DA DOCUMENTAZIONE; versione del nuovo target RICHIEDE PROVA STAGING |
| CREATE ROLE LOGIN/password |S05 documenta custom LOGIN |Un principal per device/versione, credenziale solo backend |COMPATIBILE DA DOCUMENTAZIONE; autenticazione e attributi effettivi RICHIEDONO PROVA STAGING |
| CREATE/ALTER NOLOGIN e gruppi |S05/S06: ruoli disponibili, postgres non superuser |Niente deduzione che tutti i DDL/attributi o la loro delega siano consentiti |RICHIEDE PROVA STAGING, inclusi ADMIN/INHERIT/SET options e LOGIN+complete atomici |
| Delega DDL ristretta |Nessuna fonte consultata garantisce una capability DDL limitata al nostro namespace/job |CREATEROLE non è una delega innocua per prefix |NON DOCUMENTATO; gate B03/B04, nessun CREATEROLE al data plane |
| SECURITY DEFINER/owner |S07/S08 separano owner, grant e RLS |Owner executor NOLOGIN/NOBYPASSRLS, non proprietario tabelle; session_user resta il caller |RICHIEDE PROVA STAGING di ALTER OWNER/membership/default ACL e comportamento interno alle funzioni |
| ACL/RLS/private schema |S07/S08 documentano livelli distinti |Niente grant browser sulle tabelle/API private, policy derive da session_user/binding |COMPATIBILE DA DOCUMENTAZIONE; catalogo effettivo, colonne/helper/creator RICHIEDONO PROVA STAGING |
| Auth0 ownerless |D10 e migrazione6A.10 provati solo localmente |Usare schema Auth gestito, non ricreare stub o utenti di comodo per C/D |RICHIEDE PROVA STAGING, manifest completo e zero auth.users dopo cutover |
| TLS con CA/hostname |S09 documenta verify-full e certificato di progetto |Verificare endpoint diretto e pooler separatamente; no require-only/fallback |COMPATIBILE DA DOCUMENTAZIONE; handshake/negativi RICHIEDONO PROVA STAGING |
| SCRAM custom login |S05 documenta password, non tutti i dettagli del percorso scelto |Verificare algoritmo/auth effettivi senza estrarre hash password nei report |RICHIEDE PROVA STAGING; nessun cambio di auth per far passare il test |
| Direct IPv6 |S01: backend persistente, IPv6 o add-on IPv4 |Scelta principale; supporto egress IPv6 e CIDR /128 da progettare |COMPATIBILE DA DOCUMENTAZIONE; rete/ref/CA reali RICHIEDONO PROVA STAGING |
| Session pooling con custom role |S01/S03: sessione assegnata fino al rilascio; routing user/ref |Alternativa IPv4; SQL principal separato dal nome wire per il pooler |RICHIEDE PROVA STAGING; session_user fuori/dentro definer e due ruoli intercalati |
| Transaction pooling |S01/S03: backend riassegnabile tra transazioni, no prepared statement persistenti |Non adottato. Due COMMIT separati non sono di per sé incompatibili; stessa identità a ogni transazione resta obbligatoria |RICHIEDE PROVA STAGING dedicata; escluso dal primo percorso, nessuna promessa di compatibilità |
| Shared login + SET ROLE/GUC |Non conserva il session_user distinto richiesto da D09 |Sostituirebbe il confine autorizzativo approvato |INCOMPATIBILE con D09; nessun test positivo può autorizzarlo tacitamente |
| Revoca/rotate warm connection |SQL controlla registry/epoch a ogni operazione; S05 non specifica tutti i cache del pooler |NOLOGIN/password nuova non chiudono da sole vecchie sessioni |RICHIEDE PROVA STAGING; cache/auth reset per custom role NON DOCUMENTATO nelle fonti consultate |
| Terminazione vecchi backend |S06 nega superuser generale; disponibilità di ogni pg_signal_backend/ownership non garantita |Osservatore/operatore separato; mai privilegio di terminate al worker |RICHIEDE PROVA STAGING; fence di rete/host e attesa SQL-zero se terminate non disponibile |
| Limite globale16 |S02/S03 distinguono client/backend e combinazioni |Impossibile dedurre cap globale dal pool-size; L01 resta FAIL doppio |INCOMPATIBILE assumere pool-size16 come budget globale; hosting singolo RICHIEDE PROVA STAGING |
| Riconciliazione credenziali dopo restore |S14 corregge un caso del servizio gestito |Non dimostra ripristino dei nostri secret, binding/epoch, revoche o journal |NON DOCUMENTATO per i custom principal; clone dedicato obbligatorio |

## Direct: percorso raccomandato

Endpoint del nuovo progetto, porta5432, database approvato e ruolo effettivo del
dispositivo, CA verificata e hostname coerente. Vietati DSN provenienti dal client,
IP sostitutivo senza hostname verification, postgres nel broker e plaintext.
L'applicazione continua a limitare il pool per principal/versione, chiude su errore
ed esegue due transazioni: claim COMMIT, poi API dati COMMIT. La rete non sostituisce
l'autorizzazione. L'ingresso pubblico non può raggiungere il DB.

IPv6 e uscita con indirizzo stabile sono prerequisiti di A. S10 descrive allowlist
per accesso SQL e pooler; non estenderla a0.0.0.0/0 o::/0 per risolvere errori.
Se IPv6 è assente: fermarsi, proporre session mode o add-on IPv4 con relativo costo.
S01 avverte che l'add-on sostituisce il recordIPv6 con IPv4: non assumere dual-stack.
Enforcement SSL di progetto è una modifica remota con possibile reboot [S09],
soggetta al consenso futuro e alla finestra prevista; non è stato verificato attivo.

## Supavisor session: proprietà da dimostrare

Il client usa il formato routing ruolo/ref documentato dal pooler, mentre SQL
`session_user` deve essere il ruolo device **senza trasformarlo in un login
universale**. Configurazione privata deve distinguere eventuale wire username e
principal atteso; il codice attuale usa lo stesso nome per autenticazione e check.
Un suffisso di routing non deve diventare un'autorità fornita dal browser.

Probe con due custom role e transazioni intercalate: connessione, session_user,
current_user dentro definer, backend PID, grant/membership e risposta A→B negata.
Ripetere dopo idle eviction, errore, reconnect, NOLOGIN, password/key rotation,
revoca e scope downgrade con client caldo. Misurare anche quando il client si
chiude e il backend rimane visibile; non liberare budget sulla sola promessa
client.end. La coda interna session può durare più della nostra attesa2s: servono
misura e deadline client; statement_timeout SQL non copre una query ancora in
attesa nel pooler. Nessun valore di cache password o tempo massimo è inventato.

**Ambiguità nelle fonti:** la pagina generica S01 restituita dalla ricerca docs
contiene un esempio semplificato di pool-size complessivo; la pagina specializzata
S02 rimanda alla FAQ S03, aggiornata4novembre, che descrive pool per combinazione
user/database/mode. Per prudenza si dimensiona sulla somma dei pool osservati,
non su quell'esempio. La verifica staging deve risolvere comportamento/versione
reali; non si assume una moltiplicazione esatta sempre attiva o una fusione tra
ruoli. Client pool cap16 non prova backend gestiti≤16 durante churn/retention.

## Transaction: escluso dal primo gate, non bocciato per un motivo falso

La transazione resta l'unità di assegnazione del backend. Claim e dati devono
restare due transazioni indipendenti, entrambe autenticate allo stesso principal
atteso e con capacità riletta; un cambio PID fra esse non costituisce da solo una
violazione. Nessun uso di temp table, SET persistente, advisory lock di sessione o
contesto GUC sopravvivente fra transazioni è ammesso come autorità.

Il driver attuale invia query parametrizzate **senza nome**; questo non equivale a
richiedere named prepared statements persistenti. Non inventare un'opzione globale
`prepare:false` per node-postgres: verificare il protocollo della versione fissata.
Un eventuale esperimento futuro deve provare pinning BEGIN→COMMIT, identità,
errori/rollback/COMMIT incerto, cancellation, limiti per ruolo e assenza di routing
su login condiviso. Se manca un requisito, è NO-GO; non si cambia D09 per efficienza.

## Dipendenze delle migrazioni e cambi pubblicati

I due SQL storici di core/constraints sotto tests/db/6A3 precedono le cinque
migrazioni root; la prima expand fa ALTER di tabelle già esistenti. Il bootstrap
locale crea anon/authenticated e una finta auth.users: **NON ESEGUIRE SU SUPABASE**.
Il laboratorio usa postgres locale superuser, ruolo differente da postgres gestito.
Vanno verificati CREATE SCHEMA/ROLE, attributi, ownership delle funzioni e grant ai
NOLOGIN, defaults per ogni creator e dipendenze Auth/estensioni già presenti.
Nessuna modifica ai file approvati in questa fase; adattamenti necessari richiedono
proposta separata e nuovo diff revisionato, mai una patch silenziosa di migrazione.

Changelog consultato: CLIv3 cambia target/consenso [S11]; PG17.11 richiede attenzione
a estensioni/restore [S12]; default Data API stanno cambiando [S13]; il fix restore
credenziali [S14] non risolve il nostro protocollo operativo. I sorgenti approvati
non introducono ltree, PGP legacy o operatori custom; inventariare comunque il nuovo
ambiente gestito, senza copiare o modificare oggetti di sistema. Non usare pgcrypto
come prova di disponibilità di un verificatore P-256 nel DB.

L'audit dei creator e delle ACL deve includere PUBLIC, anon, authenticated,
service_role e authenticator, non solo il worker. Il broker non usa Data API: si
propone di tenerla disabilitata per lo staging e provare separatamente che grant,
RLS e helper non espongano dati anche nel controllo di esposizione dedicato.
Nessuna client key amministrativa nei file o nei test browser.

Il controllo non si limita a safe_device_role: quella funzione approvata esamina
attributi/membership e tabelle dei namespace applicativi, non certifica ogni
funzione/estensione presente nel gestito. Inventariare EXECUTE effettivo via
PUBLIC su helper/definer in **tutti** gli schemi accessibili e relativi grant di
sistema. Un percorso inatteso verso dati o privilegi è NO-GO; non modificare
schema/ruoli gestiti per nasconderlo, ma sottoporre il vincolo alla Regia.
