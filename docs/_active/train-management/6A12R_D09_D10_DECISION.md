# 6A.12-R — Decisione D09/D10 richiesta alla Regia

**PROPOSTA — NON APPROVATA — nessuna sostituzione delle decisioni vigenti.**
5 novembre 2026, Europe/Rome; base `55d6bd6ef8211e9f136468090ff195f4ac791bde`,
branch `feature/train-management`. [Architettura proposta](6A12R_FREE_BROWSER_ARCHITECTURE.md).

## Decisioni vigenti e incompatibilità concreta

D09=A è il modello [principal per dispositivo](6A7_ARCHITECTURE_DECISIONS.md),
attuato solo nel laboratorio6A.8–6A.11: session_user→binding, broker fidato privato,
pool singleton16/coda64. Il DB non verifica P-256; ingresso pubblico privo di
credenziali SQL. Il requisito nuovo elimina il processo persistente: D09 non può
essere semplicemente dichiarata invariata spostando Node in Edge.

D10=[ownerless e provenienza storica](6A7_OWNERLESS_CUTOVER.md), collaudata nella
6A.10 locale: nuove righe ownerNULL, ownership_key totale, sette domainFK, vecchi
owner conservati in registro privato senza cascata Auth; snapshot/receipt immutabili.
Nessun nuovo account Auth, neppure anonimo/shadow. Auth0 con dataset misto non vuoto
è una prova di indipendenza **del laboratorio**, non lo stato del progetto reale.

Il progetto reale oggi ha **un utente Auth** e otto FK owner→auth.users CASCADE.
Non cancellarlo: l'audit non dimostra che sia eliminabile o inutilizzato da altri
componenti. W conserva il divieto di nuovi Auth e l'indipendenza target dei dati;
Auth0 nell'intero progetto non viene dichiarato raggiunto. Un eventuale requisito
di cancellazione finale richiederebbe audit/decisione distinta e tutela completa.

## Confronto delle due identità richieste

| Aspetto | W: P-256 + ownerless + Edge attestante | AAuth: Auth anonima + RLS per membership |
|---|---|---|
| Esperienza browser | Nessuna registrazione, chiave non estraibile in IndexedDB | `signInAnonymously()` senza email/password, ma crea vera riga Auth e sessione |
| Autorità dati | Registry capability SQL, scope/expiry/epoch correnti; MAC dell'Edge e RLS su contesto privato | JWT verificato + membership privata workspace/device e RLS; authenticated da solo non autorizza |
| D09 | Nuovo ingresso attestato, login runtime condiviso EXECUTE-only; abbandona identità SQL per-device | Nuova autorità JWT/sub; non riusa session_user per identificare il device |
| D10 | Preserva nuovi dati ownerNULL, provenienza e nessun nuovo Auth | Deroga necessaria al divieto Auth; conservare comunque ownerless e storico con membership separata |
| Revoca | SQL corrente ad ogni operazione, anche dopo claim; key/epoch invalidati | Controllo membership/sessione/epoch corrente nel DB oltre JWT; signOut/delete non invalidano istantaneamente tutti gli access token |
| Replay | Nonce browser SQL durevole, claim separato e contesto/digest esatto | JWT è bearer riutilizzabile: mantenere P-256+nonce per requisito replay, o richiedere deroga motivata; Auth non lo sostituisce |
| Recupero dispositivo | Pairing key-bound, recovery kit offline monouso, revoca vecchie chiavi | Nuovo browser ha diverso sub anonimo; pairing/recovery devono collegare membership dopo prova, non copiare refresh token |
| Perdita storage | Senza altro device o recovery kit accesso perso; nessun recupero con nome workspace | Logout/clear storage perde l'account anonimo recuperabile solo con meccanismo aggiuntivo; non offre recovery automatico |
| Sicurezza client | XSS può far firmare CryptoKey non estraibile; difesa supply chain/CSP e origini HTTPS | XSS può rubare sessione bearer; P-256 aggiuntiva riduce alcuni riusi ma non risolve XSS |
| Trusted server | Edge compromesso può attestare capacità false nell'ambito issuer; credenziali privilegiate predefinite ampliano il rischio | JWT verificabile indipendentemente da Edge usando client RLS; accesso admin predefinito resta rischio del runtime |
| Costi Free | Invocazioni, database/nonce e connessioni; niente MAU nuovi | Stesse quote più MAU, righe Auth, refresh/CAPTCHA/abuso; 50kMAU non è un limite di storage delle righe persistenti |
| Complessità | Nuovo confine SQL/MAC/RLS; elimina provisioning password per ogni device e journal host | RLS JWT/membership più standard, ma nuovi account/lifecycle e pairing; se si conserva P-256 resta doppio protocollo |
| Riuso | Browser proof/parser/envelope/digest, casi CAS/history/ownerless; portare verificatore a WebCrypto Deno | DTO/validator/atomicità/history/ownerless; sostituire binding SQL con membership, aggiungere SDK/session management |
| Da rifare | authorize/RLS/claim/lifecycle dipendenti da session_user, pool/IPC/secret fixture | authorize/RLS/claim/lifecycle e mapping actor/receipt; nessun remapping di ricevute storiche |

AAuth richiede abilitazione esplicita del provider anonimo, review di **tutte** le
policy esistenti: utenti anonimi usano `authenticated`, non `anon`. Non autorizzare
con user_metadata, UUID passato dal browser o semplice `TO authenticated`.
L'is_anonymous può distinguere tipi di utente ma non dimostra membership al workspace.
Auth anonima non implica cambiare owner_id dei dati o attribuire il workspace al sub:
modello alternativo minimo = membership privata `(sub,device,workspace,scope,epoch)`
con FK che non cancellano dati ferroviari alla rimozione Auth. La cronologia conserva
l'attore originario; niente migrazione massiva dei receipt verso nuovi sub.

Nell'alternativa AAuth mantenere JWT lato Edge verificato con chiavi/issuer/audience
reali, poi usare contesto RLS del chiamante, mai client admin per operazioni ordinarie.
Niente CRUD arbitrario browser: API chiuse e sole procedure autorizzate. Se il browser
può chiamare direttamente un RPC esposto, quel RPC deve imporre gli stessi controlli
e replay; il solo passaggio precedente attraverso Edge non è una garanzia SQL.

## Perché proporre W

W soddisfa il nuovo vincolo operativo senza cambiare tacitamente l'identità utente
e la conservazione D10. Evita costo e complessità del provisioning ruoli/password
per-device; mantiene il materiale browser già verificato. AAuth offre primitive
standard utili, ma non elimina nonce durevole, CAS, recovery, membership o restore.
Non è dimostrato che sia più breve mantenendo tutti i vincoli correnti.

W non offre resistenza a un verificatore Edge malevolo, né l'isolamento processo
del broker precedente. Il rischio di attestante compromesso e la disponibilità
di chiavi amministrative predefinite nel runtime devono essere accettati espressamente.
Se la Regia richiede che SQL verifichi autonomamente la proof browser, W è respinta:
serve prima fattibilità P-256 nel DB (opzione B storica), non una HMAC presentata
come firma browser. Nessuna estensione crypto non supportata è assunta disponibile.

## Registro delle decisioni da approvare

| ID di proposta | Testo della decisione richiesta | Stato |
|---|---|---|
| D09-R-W | Sostituire A solo per il nuovo percorso con Edge P-256 fidato, attestazione interna e login SQL EXECUTE-only; nuovo contesto RLS e due commit nonce/dati | PENDING |
| D09-R-TRUST | Accettare nuovo perimetro Edge e rischio issuer/credenziali runtime; nessuna equivalenza con separazione UID/IPC precedente | PENDING |
| D09-R-BUDGET | Richiedere cap aggregato gestito verificato; L01 32/16 storico rimane FAIL; nessuna esclusività derivata da worker RAM | PENDING |
| D10-R-W | Confermare nuovi dati ownerNULL, legacy invariato, zero nuovi Auth, distacco CASCADE controllato; nessuna cancellazione dell'utente reale | PENDING, conservazione proposta |
| D09/D10-R-AAuth | Solo se scelta in alternativa: autorizzare nuovi utenti Auth anonimi e mapping membership, definire replay e recovery; motivare deroga a divieto Auth | NON SELEZIONATA / PENDING |
| PROD-R | Solo progetto esistente, backup verificato, migrazione esatta e deploy con gate dedicato, flag chiuso fino ai PASS | NON AUTORIZZATO |

Questi suffissi sono proposte della6A.12-R, non rinumerano D01–D10 né inventano
approvazioni. Approvare il modello non approva deploy, budget a pagamento, main,
cutover Auth o fasi successive. La prossima eventuale **6A.12-R.1** è una prova
locale del nuovo confine, come definita nel [percorso](6A12R_ROUTE_TO_COMPLETE_SERIEN.md),
da autorizzare separatamente. **STOP alla fine di questa revisione.**
