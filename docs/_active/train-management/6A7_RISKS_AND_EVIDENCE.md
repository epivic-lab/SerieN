# 6A.7 — Matrice dei rischi e delle evidenze

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Base approvata `5d65a32ff392dabf7e57c040981598f5af398e05`. Questa matrice non modifica [R0P01–P18](R0_ACCEPTANCE_MAPPING.md) né gli esiti del [gate6A.6](6A_INTEGRATION_GATE.md). Tutte le nuove mitigazioni sono specifiche, non implementazioni. La priorità è impatto sul gate, non una probabilità numerica inventata.

## Rischi residui e prove necessarie

| ID / priorità | Rischio | Evidenza disponibile | Mitigazione proposta | Prova/approvazione necessaria |
|---|---|---|---|---|
| R01 bloccante | Principal custom/privilegi non delegabili su gestito | Login distinti nel lab, fonti ruoli S03/PG03 | Job provisioner separato, zero admin nel data path | Staging: creare/ruotare/ritirare principal con privilegi minimi; FAIL se richiede admin nel worker |
| R02 bloccante | Backend per-device e repliche saturano DB | Un psql/device6A.6; S01/S02 descrivono limiti, non cap del progetto | Lazy/LRU/cap aggregato, deadline/fairness | A16+staging: budget/SLO/costo reali approvati; nessuna assunzione da1000device→1000backend |
| R03 alto, fiducia esplicita | Broker o secret store compromesso impersonano i device assegnati | Threat model6A.6; DB non verifica P-256 | Ingresso senza secret, broker privato con domini espliciti; nessun admin/raw DML | Approvazione rischio D09; A13/A14, isolamento OS/secrets/rete; A non diventa resistente al broker malevolo |
| R04 bloccante | SET ROLE/GUC/session pool riusato confonde identità | session_user/RLS provati6A.5/6A.6 | Principal fisso, nessun rebinding, close/re-auth per altro device | A05/A06/A14 e session_user in definer/staging custom pooler |
| R05 bloccante | Replay dopo restart o seconda istanza |6A.6 usa nonce RAM; tabella replay_nonces già6A.3 | Claim unico committato prima dei dati, TTL e cleanup sicuri | A07: due istanze, restart e rollback dopo claim, stesso nonce negato |
| R06 alto | Crash DB/secret-store lascia principal/kit attivo senza ack | Ticket/pairing solo fixture6A.6 | Prepare NOLOGIN, job durevole, consume/activate coordinati e ack consultabile con nuova proof | A11/A12: fault ogni confine, nessun doppio grant, recovery non perso |
| R07 bloccante | Revoca su sessione già aperta inefficace | PASS locali revoca/read/save6A.5/6A.6 | Registry e lock per transazione; drain dopo commit; NOLOGIN non unico controllo | A10 con claim pre-revoca, due broker e connessione calda |
| R08 bloccante | OwnerNULL salta FK o CHECK nullable | Schema letto, PG01 su NULL/MATCH/CHECK | Domain key generata NOT NULL, ID non nulli, completezza tuple | O05/O06/O09, query dirette per vincoli e API per autorizzazione |
| R09 bloccante | Auth delete cancella storico | Otto FK CASCADE baseline ancora presenti | Registro provenienza senza Auth FK, sostituzione referenze RESTRICT | O03/O11: Auth=0 e legacy non vuoto dopo delete, nuovo workspace funziona |
| R10 bloccante | Backfill viola immutabilità o benedice corruzione | Trigger immutable6A.5, digest distinti e retry storico | Nessun UPDATE snapshot/receipt; registro provenance separato | O02/O10: tutti i valori/ID/timestamp identici; no trigger disabilitato |
| R11 alto | Policy/grant Auth residue aprono dati workspace con provenance | Policy storiche e revoche6A.5; S08 avverte default in evoluzione | Ritirare policy Auth applicative; inventario tabella/colonna/function/membership/creator ACL | O12/A14 e Data API negativa staging; nessuna fiducia nel solo schema privato |
| R12 alto | Credenziale/pooler rotation resta stale | Non collaudata; S03 distingue client esterni | Nuovo principal/versione, drain e inventario; epoch per compromissione | A11 e password-cache Supavisor se scelto; nessun rollback grant sospetti |
| R13 alto | B presume crypto P-256 SQL/JCS o pgsodium disponibili | PG05 non offre tale contratto; S07 sconsiglia pgsodium | Non scegliere B senza prova primitiva/formato/ACL/contesto | Nuova decisione se A respinta, staging crypto dedicato; B NOT VERIFIED |
| R14 alto | C autentica solo un gateway capace di mentire | HMAC documentato PG05, nessun sistema C testato | Firmatario separato, scope issuer e registro DB; ingress unico | Nuova decisione se A respinta; C NOT VERIFIED, no claim di sicurezza dal solo MAC |
| R15 alto | Restore dopo ownerless perde checkpoint o inventa owner |6A.6 non prova PITR/disco | Forward-fix/read-only; backup+export completo+replay verificato | O14+staging restore, Regia prima di ogni operazione reale |
| R16 alto | XSS usa CryptoKey non esportabile | Limite esplicito6A.2/6A.6 | CSP/input/asset allowlist e revoca; browser non detiene SQL secret | Resta rischio; audit frontend futuro separato, nessun cambiamento R1 qui |
| R17 alto | Misure sintetiche vendute come costi/scala reali | Metriche6A.6 includono fault e lock intenzionali | Budget e carico/SLO staging, ruoli e churn misurati | Nessun prezzo o capacità di produzione dedotto; approvazione budget |
| R18 medio | R0 integrale/changelog non disponibili | Mapping R0 originale disponibile; changelog403 | Preservare criteri/contratti; fonti pubbliche mirate e confronto indipendente Regia | R0 integrale NOT VERIFIED; changelog da ricontrollare prima implementazione/staging |

## Registro delle evidenze: cosa si può affermare

| Livello | Evidenza | Stato e limite |
|---|---|---|
| Laboratorio approvato | [summary6A.6](evidence/6A6/summary.md), [results](evidence/6A6/results.json), [audit](evidence/6A6/audit.json), [invariants](evidence/6A6/invariants.json) | 72 E2E PASS e regressioni riportate sul checkpoint approvato; non rieseguite in6A.7 |
| Schema approvato | Migrazioni6A.3–6A.5 e baseline `tests/db/6A3/` | Letti; dipendenza Auth e domain/FK effettivi inventariati, nessuna modifica |
| Documentazione pubblica | Fonti S01–S08 e PG01–PG05 nel [D09§6](6A7_ARCHITECTURE_DECISIONS.md) | Consultate via search_docs e sorgenti ufficiali GitHub; primitive e modalità, non configurazione progetto |
| Verifiche6A.7 | [REPORT](evidence/6A7/REPORT.md), log npm/Python/build e scope JSON | PASS soltanto sui controlli realmente eseguiti; documentazione e identità file |
| Architettura corretta | A01–A16 e6A.8–6A.12 nel [piano](6A7_EXECUTION_PLAN.md) | NOT VERIFIED, specificata ma non implementata |
| Ownerless con legacy non vuoto | O01–O14 nel [D10](6A7_OWNERLESS_CUTOVER.md) | NOT VERIFIED, zero nuovi utenti Auth previsto come oracolo futuro |
| Supabase staging | Login/TLS/pooler/ACL/limiti/restore | NOT VERIFIED; ambiente e operazioni da autorizzare separatamente |
| Supabase reale | Nessuna query/DDL/DML/Auth/config/deploy in6A.7 | Intatto; vecchie osservazioni non presentate come attuali |
| Accettazione simulatore | R0P01–P18 completi, capture/hydrate, autosave/offline/catalogo6B–6E | NOT VERIFIED dove già tale nel gate6A.6; nessuna approvazione o nuovo PASS |

## Decisioni da sottoporre alla Regia

1. D09=A con broker fidato, cap connessioni aggregato e percorso direct TLS iniziale; criteri di abbandono se ruolo/costo non sostenibile. B/C confrontate, non selezionate.
2. D10 con nuove righe ownerNULL e provenienza storica privata senza FK Auth; archivio invariato, niente promozione legacy automatica o policy erasure implicita.
3. Isolamento del broker, lifecycle/rotazione/recovery durevoli, budget/SLO e test avversari obbligatori; nessun privilegio amministrativo nel data path.
4. Sequenza correttiva proposta, autorizzando eventualmente solo la prossima microfase6A.8. Staging, implementazioni successive, chiusura6A e6B.1 restano separati.

Un progetto motivato risolve le scelte progettuali da discutere; non rimuove i blocchi esecutivi o autorizza il cloud. **STOP6A.7 per audit indipendente.**
