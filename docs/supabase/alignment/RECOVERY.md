# S2 — Recupero controllato dell'11 novembre 2026

Il workspace del 6 novembre è rimasto accessibile. Prima di qualsiasi modifica
sono stati letti stato Git, reflog, file non tracciati, manifest, hash e log; il
confronto con l'issue #4 conferma che quel checkpoint documentale non pubblicava
il lavoro locale. Nessun checkout, reset, clean, rebase o cancellazione eseguito.

Stato iniziale: branch locale `codex/supabase-alignment-s2`, HEAD
`46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`, zero commit S2, zero modifiche
tracciate, undici file S2 non tracciati. Riferimento locale origin/main obsoleto:
`618f538`; la baseline remota è stata verificata via API GitHub, non dedotta da
quel riferimento. Il branch S2 remoto non esisteva. Nessuna PR S2 individuata
nel checkpoint; nessuna PR viene aperta da questa ripresa.

| Classificazione alla ripresa | Evidenza |
| --- | --- |
| COMPLETATO E SALVATO SU GITHUB | Solo il mandato/checkpoint #4 e la baseline main; nessun codice S2 |
| COMPLETATO SOLO NEL WORKSPACE | Due migrazioni esatte, catalogo, bootstrap, comparator, test SQL, runner, qualifica CLI, replay PASS e regressioni/build |
| PARZIALMENTE COMPLETATO | Manifest presente; documentazione, stato finale e valutazione Preview da completare |
| NON INIZIATO | Workflow CI S2, commit, push, consegna permanente |
| BLOCCATO / NON VERIFICABILE | Valori live Auth/Data API e impostazioni complete dell'integrazione Preview |

Gli undici file recuperati sono elencati con SHA-256 in
`evidence/recovered-2026-11-06/initial-inventory.json`. Sono stati recuperati anche
28 file intermedi di evidenza/test/help: i risultati essenziali sono conservati
in quella directory, con la provenienza originaria distinta dalle verifiche di
ripresa. Nessun risultato del 6 novembre è presentato come test rieseguito l'11.

L'11 novembre una nuova SELECT della storia remota ha riconfermato i tre SHA-256
e il confronto byte-per-byte dei primi due file. Una nuova esecuzione del solo
collector read-only ha confermato che il catalogo remoto è equivalente a quello
del 6 novembre, sul quale il replay salvato aveva dato diff vuoto. Tutti i pin del
manifest sono stati ricontrollati, e la migrazione email è byte-identica a HEAD.

Problemi precedenti ricostruiti anche dalla cronologia della task: l'immagine
completa `supabase/postgres:17.11.0.018` non entrava nello spazio del worker
(`no space left on device`); il replay riuscito ha usato PostgreSQL 17.11 Alpine
con digest fissato e bootstrap esplicito. La CLI tentava di creare stato nella
home di sola lettura: la qualifica riuscita usa `SUPABASE_HOME` in scratch, senza
modificare HOME, senza login e senza target remoto. Questi problemi ambientali
non sono stati aggirati usando il database di produzione.
