# 6A.7 — Provenienza della consultazione pubblica

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

Consultazione del 4 novembre 2026, nessuna chiamata a un progetto Supabase. I riferimenti S/PG sono definiti nel [D09](../../6A7_ARCHITECTURE_DECISIONS.md). Gli estratti non attestano configurazioni del progetto.

| Fonte/canale | Estratto verificato | Conseguenza |
|---|---|---|
| S01, Supabase search_docs | “Use the direct connection string”; “Use pooler session mode ... from persistent clients on IPv4-only networks” | Direct per backend persistente; session fallback IPv4 da collaudare |
| S01, search_docs | “Transaction mode does not support prepared statements” | Non assumere equivalenza session/transaction |
| S02, search_docs | “The actual values depend on your concurrent peak connection usage” | Cap con riserva ai servizi e misure effettive |
| S03, search_docs | “we recommend that you create a new user for every service” | Credenziali server distinte, non postgres nel worker; delegabilità lifecycle ancora da provare |
| S04, search_docs | verify-full: “verifies the CA certificate, and confirms the hostname matches” | Client TLS con CA e hostname |
| S05, search_docs | “By default, database functions can be executed by any role” | Revoca PUBLIC e ACL atomiche |
| S07, search_docs e sorgente Supabase GitHub | “Supabase DOES NOT RECOMMEND any new usage of pgsodium” | B non assume pgsodium o una funzione P-256 non verificata |
| S08, search_docs | “Supabase is moving the platform default to revoke these automatic grants” | Inventario ACL per creator e oggetto, nessun default assunto |
| PG01, sorgente ufficiale REL_17_STABLE/ddl.sgml | “a check constraint is satisfied if the check expression evaluates to true or the null value” | CHECK espliciti e ownership_key NOT NULL |
| PG01, stessa fonte | “a referencing row need not satisfy the foreign key constraint if any of its referencing columns are null” | Domain FK con componenti non nulle |
| PG01, stessa fonte | “Table owners normally bypass row security as well” | Executor non proprietario tabelle e NOBYPASSRLS |
| PG02, create_function.sgml | “create it and set the privileges within a single transaction” | Nessuna finestra EXECUTE PUBLIC |
| PG05, pgcrypto.sgml | `hmac(data bytea, key bytea, type text) returns bytea` | Primitiva C documentata; protocollo attestato e P-256 non dimostrati |

Fetch diretti di `https://supabase.com/changelog.md`, pagina connessioni markdown e pagina PostgreSQL CREATE FUNCTION: `Tunnel connection failed: 403 Forbidden`. Nessuna modifica del proxy o tentativo di aggirarlo. Consultazione alternativa supportata: strumento documentazione Supabase; sorgenti ufficiali PostgreSQL su `raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/doc/src/sgml/` (`ddl.sgml`, `user-manag.sgml`, `libpq.sgml`, `ref/create_function.sgml`, `pgcrypto.sgml`), tutti HTTP200. Nessun codice di dipendenza eseguito dalle fonti.

Changelog completo NOT VERIFIED; non si dichiara assenza di breaking change. Prima di implementazione/staging ricontrollare versioni/changelog e cataloghi effettivi, in particolare ACL automatiche e disponibilità custom role/estensioni. Le fonti SGML17 sono versionate per major; non implicano che il servizio gestito usi ogni configurazione descritta.
