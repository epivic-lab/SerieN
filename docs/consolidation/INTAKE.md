# Audit alla ripresa · 28 ottobre 2026

Repository autorizzato: `epivic-lab/SerieN`. Branch attiva: `work`. Nessun accesso in scrittura a `first`, `SerieN Control` o altri repository.

- `origin/main`, verificato con `git fetch`, era a `408cc5f` (v0.7). L'ultimo workflow Pages pubblico risultava il run `40586948233`, relativo a quel commit.
- Due commit locali conservavano lavoro successivo: `0950168` (tre consolle, miniature reali, minimappe), `20f995b` (audit XML con sorgente originale).
- La migrazione XML era incompleta: sette sorgenti modificati e nuovi dati/script non committati. Build eseguibile, ma test ancora legati ai 33 archi precedenti. Nessuna pubblicazione della migrazione risultava avvenuta.
- Ripristino creato prima di proseguire: `b7de605`, branch `restore/phase-zero-intake`. Conserva anche la migrazione interrotta, senza presentarla come versione validata.
- Pull request: API GitHub GraphQL non disponibile nell'ambiente (403); la pagina pubblica `/pulls` con filtro predefinito aperte non mostrava risultati. Non sono state chiuse, modificate o unite PR.
- Dipendenze installate e lockfile: Three.js 0.163.0, esbuild 0.25.12. Applicazione statica, nessun backend o CDN necessario. Build `npm run build`; avvio `npm start`, browser su `http://localhost:8000`.
- Workflow Pages: push su `main` → Node 22 → `npm ci` → test → build → artifact `_site` → deploy Pages. Il pacchetto di distribuzione andava esteso alla nuova documentazione canonica e alle prove della plancia.
- Documenti non tracciati preesistenti (`ARCHITECTURE-REVIEW.md`, `REFERENCE-INTAKE.md`, `TRACK-REFERENCE.md`) conservati, letti e registrati come materiale storico; le osservazioni superate sono annotate, non eliminate.

## Architettura consolidata

Un solo oggetto `network` fornisce binari e nodi; un solo array `trains` conserva stato e Journey dei convogli. Il motore (`simulation.js`) è indipendente da DOM e Three.js. Plancia e HUD leggono questo stato e invocano i comandi dell'applicazione. La plancia mantiene soltanto recenza, riferimenti DOM e cache di presentazione. Nessun renderer o ciclo di simulazione aggiuntivo per le consolle.

Il codice inutilizzato per trasferimenti basati sulla frazione di anello, la tabella dei vecchi gruppi scambi e il routing di ripiego sono stati rimossi dopo verifica dei riferimenti. La vecchia rete a 33 archi rimane esclusivamente nell'archivio `docs/phase-0/baseline`, verificata contro il lock storico e mai importata dal gioco.

I vecchi test browser `browser-next-switch.py` e `browser-release.py` facevano riferimento agli ID approssimativi e al pulsante HUD rimosso. Sono stati sostituiti dalla suite `browser-phase-zero.py`, con controllo degli scambi occupati e scadenza dell’overlay; le verifiche di plancia, rotabili e reset rimangono in suite dedicate.
