# S2 — Recovery & Alignment Status

Rapporto locale prima del checkpoint del branch; 11 novembre 2026, Europe/Zurich.
Il commit di consegna è quello che introduce questo rapporto: risolvibile con
`git log -1 --format=%H -- docs/supabase/alignment/RESULTS.md`.

## Recupero e baseline

Recuperati tutti gli undici file non committati S2 e i log della precedente
esecuzione. Nessun lavoro applicativo è stato ricreato o importato da E1.
Branch locale già esistente e riutilizzato, senza checkout/reset/rebase:
`codex/supabase-alignment-s2`, base `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`.
All'inizio della ripresa non esistevano commit S2 locali o remoti, né branch S2
su GitHub. Main remota è stata riconfermata alla baseline.

## Migrazioni

| Versione | SHA-256 del file locale | Risultato |
| --- | --- | --- |
| 20261029230530 | `30cef69efb7a798152f13d33922e03192410207c5058d271bfd85c2c73d38754` | PASS, testo remoto originale byte-identico |
| 20261029230558 | `097dc090f224bbba8cd614a557d5c736b4f881b67f0ab5ac8e25f8c44fcbc849` | PASS, testo remoto originale byte-identico |
| 20261105155420 | `85a83a622d4b192158278663136133178826e29941c0e2585da29e7652e6e06e` | PASS, file main invariato |

Il terzo testo remoto ha SHA-256
`3db4ee578dfe8efb1c6e877fc2175238f2f1ba312cbc9d3384a04c74f8f7cbc7`.
Le differenze sono commenti e formattazione; confronto dei token SQL e replay
del file locale danno equivalenza nel catalogo osservato. Il file non viene
riscritto per far coincidere gli hash. Nessuna nuova versione sostitutiva.

## Risultati effettivi recuperati del 6 novembre

| Verifica | Esito e limiti |
| --- | --- |
| CLI 3.0.0 | PASS archivio ufficiale SHA-256, versione e nove comandi versione/help; nessun comando database CLI eseguito |
| PostgreSQL effimero | PASS 17.11 Alpine, digest fissato, rete none, zero porte, tmpfs, container rimosso |
| Replay | PASS tutte e tre le migrazioni, singola transazione per file |
| Confronto catalogo | PASS, diff vuoto: 11 tabelle incl. allowlist, 83 colonne, 77 vincoli, 28 indici, 10 funzioni, 14 trigger, 23 policy, 6 default privilege e 33 tuple di privilegi effettivi |
| Comparator controlli negativi | PASS rilevati grant anonimo, colonna inattesa e funzione resa SECURITY DEFINER; rollback delle probe |
| Accesso | PASS allowlisted confermati A/B, outsider, non confermato, identità assente e revoca allowlist |
| Grant reali | PASS CRUD diretto negato anche al proprietario, RPC anonima e accesso schemi privati negati |
| Policy owner | PASS tutte le dieci tabelle con ruolo probe temporaneo NOBYPASSRLS; nessun ampliamento dell'ACL baseline |
| Integrità | PASS FK owner, unicità, ordine locomotiva/vagoni, assegnazione, ready, collocazione e snapshot |
| Commit differito | PASS COMMIT reale rifiutato con 23514 per convoglio ready vuoto |
| Pulizia | PASS catalogo ripristinato dopo rollback e fixture sintetiche annullate |
| Applicazione Node 24 | PASS 40 unità/file, zero fallimenti/saltati secondo l'output recuperato; non dichiarati 234 casi su questo runtime |
| Python JMRI | PASS 9 test |
| Build | PASS esbuild 0.25.12 |

Log permanenti: `evidence/recovered-2026-11-06/`. La prova negativa al commit è un
errore atteso del test: non un fallimento della migrazione o del database remoto.

## Verifiche della ripresa

L'11 novembre: tutti i pin dei file recuperati coincidono; nuove SELECT della
storia e del catalogo remoto confermano hash e assenza di differenze rispetto
alla fotografia che aveva superato il replay. Il runner file-only è PASS.
Il daemon Docker è nuovamente disponibile e nessun container S2 è rimasto attivo.
Non viene dichiarata una nuova esecuzione locale dei test del 6 novembre.

È stato aggiunto il workflow `.github/workflows/supabase-alignment.yml`, senza
secret produttivi, rete database esterna, job di deploy o modifiche Preview.
Alla redazione pre-commit il workflow non era ancora stato pubblicato/eseguito:
**CI remota NOT VERIFIED fino alla lettura del run sullo SHA consegnato**.
Il run dopo il push autorizzato e i relativi artefatti costituiscono la prova
CI corrente; la consegna finale deve indicare esattamente SHA/run/conclusione.

Diff applicativo contro la baseline: nessun cambiamento a R1/M1/M2, UI, asset,
Auth client, dipendenze, geometria o workflow Pages. Test browser/UI e OAuth reali
non rieseguiti: non sono sostituiti dai controlli SQL.

## Divergenze e limiti residui

Nessuna differenza non spiegata nei campi del catalogo applicativo confrontato.
Restano esterni al replay: GoTrue/JWT/Google, PostgREST/Data API, schemi e servizi
di piattaforma, impostazioni live dell'integrazione e portabilità completa delle
collation/librerie di sistema. L'immagine Alpine e il bootstrap sintetico non
certificano la replica dell'intero servizio hosted. Valori mancanti Auth/Data API
rimangono NOT VERIFIED, senza valori indovinati nel manifest.

Produzione ancora ACTIVE_HEALTHY, tre migrazioni; record storico main
MIGRATIONS_FAILED invariato. Nessun repair né cambio RLS/Auth/grant/utenti/segreti.

## PR e decisione

PR **non aperta**: manca la verifica completa delle impostazioni live Preview
richiesta dalla Regia. Il branch S2 è l'unico checkpoint pubblicabile autorizzato;
main e il progetto remoto restano invariati. Vedere EXTERNAL_CONFIGURATION.md.

La candidatura **S2 READY FOR REVIEW** richiede checkpoint remoto verificato e
CI isolata riuscita sul commit consegnato; in caso contrario **S2 BLOCKED**.
Questo non dichiara S3 conclusa, non autorizza una PR non verificata e non
autorizza merge, deploy, nuova UI o persistenza cloud. STOP dopo consegna.
