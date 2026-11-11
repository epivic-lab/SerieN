# S2 — Riproduzione e toolchain

Prerequisiti: Linux amd64, Python 3.12, Docker Engine con socket locale
`/var/run/docker.sock`; Node 22 e npm per la regressione applicativa.
L'esecuzione locale recuperata usa Node 24.19.0 e Python 3.12.14: il relativo
output riporta 40 unità/file Node, senza fallimenti, e nove test Python.

## Verifiche senza database

```sh
python3 scripts/verify-supabase-alignment.py --check-files-only --output /tmp/serien-s2-preflight
```

Il comando verifica nomi/ordine delle tre migrazioni, SHA-256, pin dei file e
token del gate email. Non genera migrazioni né corregge storia remota.

## Replay isolato

```sh
python3 scripts/verify-supabase-alignment.py --output /tmp/serien-s2-replay
```

Il runner accetta soltanto una directory di output, non URL, project ref,
credenziali o container esistenti. Usa l'immagine PostgreSQL 17.11 fissata per
digest nel manifest; rete `none`, nessuna porta pubblicata, dati in tmpfs e nome
casuale. Docker exec raggiunge soltanto il nuovo container. I selettori di daemon
ereditati vengono rimossi per i soli subprocess Docker; il socket resta esplicito.

Bootstrap: ruoli di piattaforma necessari, default privilege osservati in public,
tabella Auth sintetica minima e `auth.uid()` di laboratorio. Nessuna identità
reale, token, allowlist o payload produttivo viene copiato. Ogni migrazione è
eseguita in una transazione. Il confronto riguarda tutti i campi esportati da
`tests/supabase-alignment/catalog.sql`, non il funzionamento dei servizi hosted.

Il confronto normalizza ordine dei record/ACL, commenti, spazi e case degli
identificatori SQL non quotati, preservando ordine dei token e valori letterali.
Non applica esclusioni ad hoc per far passare differenze. Tre controlli negativi
dimostrano il rilevamento di grant anonimo, colonna aggiuntiva e SECURITY DEFINER.

I test SQL verificano prima le reali negazioni CRUD; soltanto dopo, dentro una
transazione annullata, un ruolo probe senza BYPASSRLS riceve grant sintetici per
esercitare le policy altrimenti non raggiungibili. Quei grant non fanno parte
delle migrazioni né del catalogo equivalente. Il confronto finale verifica il
ripristino del catalogo. Un COMMIT reale di un convoglio ready vuoto deve fallire
con SQLSTATE 23514. Il container viene rimosso anche in caso di errore.

Output: `result.json`, `replayed-catalog.json`, `catalog.diff`, log dei test SQL
e prova del rifiuto al commit. Un diff non spiegato causa fallimento.

## CLI Supabase qualificata

Versione esatta 3.0.0; URL e SHA-256 dell'archivio Linux amd64 nel manifest.
Scaricare l'archivio ufficiale, verificarlo PRIMA di estrarlo e usare:

```sh
python3 scripts/qualify-supabase-cli.py --binary /tmp/serien-cli/supabase --archive /tmp/serien-cli/archive.tar.gz --output /tmp/serien-s2-cli
```

Sono eseguiti esclusivamente nove comandi di versione/help. Non viene eseguito
alcun comando database CLI, config push, link, login o repair. Lo stato CLI usa
una directory scratch, telemetria e controllo aggiornamenti sono disabilitati.
Il replay usa psql interno al container, non un target implicito della CLI.

Changelog e release ufficiali consultati nella qualifica:
[breaking change v3](https://supabase.com/changelog/supabase-cli-v3),
[release v3.0.0](https://github.com/supabase/cli/releases/tag/v3.0.0).
La v3 sceglie il locale per i comandi database; `config diff` è invece remoto
e read-only. Non utilizzare questi default come garanzia di isolamento: il runner
S2 non implementa alcun percorso verso Supabase remoto.

## CI

`.github/workflows/supabase-alignment.yml` parte solo sul branch S2 con push o
dispatch su quel ref, usa Actions fissate a commit, `contents: read`, checkout
senza credenziali persistenti e nessun secret di produzione. Scarica la CLI
verificata, esegue il laboratorio, npm ci/test/build e audit canonico Python.
Conserva artefatti non segreti per 30 giorni. Non ha job di deploy, merge o PR.

## Recupero

In caso di fallimento conservare diff e result.json e correggere il laboratorio
o riesaminare il drift. Non usare repair/reset/restore sul remoto. Il container
effimero è eliminabile; le migrazioni originali non vanno riscritte per superare
il test. Nessun rollback produttivo è necessario per il lavoro S2: produzione
non viene modificata. Una futura integrazione richiede review separata e nuova
lettura di baseline/storia/schema; se la Preview propone DDL inatteso, STOP.
