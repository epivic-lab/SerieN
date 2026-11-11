# RELEASE FINALE S2/S3 — 11 novembre 2026

**RELEASE COMPLETE per l'allineamento storico e i deployment automatici.**
Smoke autenticazione browser PARTIAL per restrizione di rete del worker; login
Google umano e configurazioni live Auth/Data API NON certificati.

## Merge autorizzato ed eseguito

PR [#5](https://github.com/epivic-lab/SerieN/pull/5), portata da Draft a Ready dopo
riconferma di SHA, diff e check. Solo merge commit, senza squash/rebase:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Parent: main precedente `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b` e head approvato
`6e2ecbe0891b8740b44e28d8748fd6bb64b65101`. Tree del merge identico al tree
dell'head approvato. Main remota verificata sul merge; nessuna modifica aggiunta
prima del merge. Le sole evidenze finali vengono conservate sul branch dedicato,
senza secondo merge e senza push diretto a main.

## Processi automatici osservati

| Processo sul merge | Esito |
| --- | --- |
| [CI permanente 43007661441](https://github.com/epivic-lab/SerieN/actions/runs/43007661441) | SUCCESS: replay isolato, confronto catalogo, sicurezza/integrità, 234 Node, 9 Python, build |
| [Pages 43007661601](https://github.com/epivic-lab/SerieN/actions/runs/43007661601) | SUCCESS: 234 Node, 9 Python, build e pubblicazione |
| Supabase Preview, check 130479586381 sul merge | SUCCESS dell'integrazione sul branch produttivo main |

Run Supabase osservato nei log: `451b413ee7354ac79b1876bcd021d4c8`,
11 novembre 10:56:04–10:56:42 UTC. Clone main, health check, configurazione
saltata per branch protetta, **All migrations are up to date**, seed saltato,
**No functions to deploy**. Nessun nuovo DDL o intervento manuale eseguito.

## Backend dopo il deployment

Progetto ACTIVE_HEALTHY. Esattamente tre migrazioni, stesso ordine/versioni e
SHA-256 remoti del preflight/S1. Il confronto catalogo pre/post è vuoto: 11 tabelle
incl. allowlist, 83 colonne, 77 vincoli, 28 indici, 10 funzioni, 14 trigger, 23
policy, sei record di default privilege e 33 tuple di privilegi effettivi.
Nessuna RPC E1 o ruolo serien sperimentale. Unico RPC custom pubblico:
serien_access_allowed(). Nessuna nuova branch Supabase: stesso unico record main.

Il record che prima riportava MIGRATIONS_FAILED ora riporta FUNCTIONS_DEPLOYED.
Il suo updated_at restituito dall'API rimane però al 29 ottobre: non si assume
che il timestamp o l'incidente storico siano stati riparati. La riuscita corrente
è provata dai nuovi check e log; il messaggio FUNCTIONS_DEPLOYED non significa
che sia stata aggiunta una funzione, dato che i log dicono il contrario.

## Smoke online effettivo

GET HTTPS con verifica TLS e cache bypassata: HTTP 200 e SHA-256 identici alla
release per index.html, auth-gate.js, auth-gate-core.js, style.css, dist/game.js
e il nuovo dossier S3.md. Il bundle servito è
`e64d3efc7915456a33ce6c539afa298c577623d49fffea0e12438ded7a13222c`.
Il gate client, il relativo RPC e le policy risultano invariati.

Chromium reale, profilo anonimo, nessun bypass/override di rete o autenticazione:
pagina HTTP 200; gate visibile, body bloccato e runtime non caricato. Il proxy
del worker nega il CONNECT a esm.sh (403, curl 56; Chromium
ERR_TUNNEL_CONNECTION_FAILED), impedendo l'import dell'SDK. La pagina mostra
correttamente il fallback “Autenticazione temporaneamente non disponibile”.
Viewport desktop e mobile verificati senza overflow. **Questo non è un PASS del
normale flusso Google:** nessun login tentato, nessun nuovo utente/sessione creato.
Nessuna restrizione aggirata e nessuna configurazione di rete o prodotto cambiata.

La verifica esterna necessaria per certificare il flusso autenticato è aprire il
sito da un browser umano con accesso al CDN e un account già autorizzato, quindi
verificare login e caricamento del simulatore. Questo limite non viene scambiato
per una modifica o un fallimento dell'allineamento DB, che ha esito verificato.

## Evidenze e limiti

`evidence/release-2026-11-11/` contiene verifiche/ID dei processi, history hash,
log Supabase sanificati, checksum del catalogo pre/post, diff vuoto e risultati
smoke HTTP/browser con intestazioni del diniego proxy.

Auth/Data API rimangono NOT VERIFIED nei valori già indicati nel manifest e in
EXTERNAL_CONFIGURATION.md. Nessuna dichiarazione di certificazione OAuth,
provider, redirect, JWT/MFA/rate limit o exposed schemas. Nessun M2, E1, redesign,
repair, reset, restore, rollback o correzione produttiva eseguita.

**STOP dopo questo rapporto. Nessuna fase successiva autorizzata.**
