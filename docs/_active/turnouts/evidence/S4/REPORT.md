# S4 — Checkpoint intermedio, NON conclusa

**PAUSA richiesta dall'utente per riprendere domani. S4 incompleta, approvazione grafica pendente. S5 non iniziata.**

Baseline pulita e remoto verificato: `feature/turnouts` a `fd32b43fe9438980bde798fd76773f8af2f3f5fc`, S0–S3 presenti. S3 B ufficialmente approvata nella richiesta S4, mantenuta identica e impostata come default. Origin/main iniziale `6487f61612818c8cd46d882741cfa1ca96ac5a16`. Le evidenze comparative S3 sono preservate.

## Implementazione salvata

[Contratto S4](../../S4_ROUTES.md). Tre moduli separano proiezione pura S1, osservazione read-only Journey e rendering. Traccia rossa #EF5066 sulla polilinea canonica, piccole punte, comparsa 340 ms e idle fermo. Sei semplici: un percorso selezionato; WX310: due percorsi in ciascuno stato. Senza approccio determinato: punte bidirezionali; con velocità reale: verso osservato, anche in retromarcia con ultimo veicolo. Provenienze concorrenti opposte: bidirezionale. UNKNOWN nasconde le frecce del dispositivo. Il rosso non concede via libera.

Venti geometrie nuove, otto materiali, nessuna modifica alle rotaie o ai letti; nessuna luce/postFX, nuovo RAF o listener del modulo. Profondità attiva, overlay esclusi dal picking. Parametri centralizzati, reduced motion e dispose implementati. Integrazione minima app: default B, aggiornamento/cleanup e preferenza condivisa. Nessuna modifica al motore di sicurezza, nuove frenate, STOP/audio, backend o dipendenze.

## Esiti effettivi finora

| Verifica | Esito |
|---|---|
| `npm test` | **PASS: 194**, nessun fallimento/saltato — [log](tests/node-tests.txt) |
| Python JMRI | **PASS: 9** — [log](tests/python-tests.txt) |
| `npm run build` | **PASS** — [log](tests/build.txt) |
| Canonico rigenerato senza diff | **PASS**, SHA-256 `e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc` |
| Fonti/asset/dipendenze e funzioni bloccate | **PASS:** 64 file identici a S3 e cinque funzioni applicative identiche, inclusi requestToggle e dinamica — [dati](tests/invariants.json) |
| Screenshot reali, tutti8 / due stati / giorno-notte | **PASS** — [galleria](visual/GALLERY.md), [pagina HTML](visual/index.html) |
| B approvata preservata | **PASS:** sei confronti con frecce nascoste pixel-identici al render B di S3 |
| WX: immagini di provenienze opposte | **PASS:** stesso percorso osservato nei versi opposti per entrambi i WX e stati |
| Tre fasi di comparsa | **PASS:** frame originali distinti a 0/170/340 ms, progressi 0/0,5/1 — [verifiche](visual/comparison.json) |
| Nuova suite browser funzionale S4 | **INTERROTTA su richiesta utente**, prima di un esito; NON verificata |
| Regressioni browser S1/S2, 5C e Phase0 su S4 | **NOT VERIFIED**, ancora da eseguire |
| Materiali/texture runtime e GPU cleanup S4 | **NOT VERIFIED**, test implementato ma interrotto |
| Prestazioni S4 contro 5D/S3 | **NOT VERIFIED**, script pronto, misure non iniziate |
| GPU/touch fisici e matrice completa 5D | **NOT VERIFIED** |

I test Node coprono tutti gli otto controlli nei due stati, accessi e versi, polilinea effettiva, UNKNOWN, provenienze concorrenti, velocità reale anziché comando, retromarcia con carro, caching, animazione e rilascio risorse. Questi test non sostituiscono i controlli browser ancora pendenti.

Gli screenshot sono originali WebGL, camera/zoom/luce/seed registrati in [capture.json](visual/capture.json). La prima acquisizione è stata scartata dopo un errore della fixture: punto a 100 mm fuori da un raccordo lungo 62 mm. La definitiva usa una Journey per risalire di 120 mm dal WX ed è stata completata e validata integralmente. Nessuna geometria o protezione modificata per risolvere la fixture. Solo l'acquisizione definitiva è consegnata.

Valutazione preliminare: rosso e B restano distinguibili nelle immagini ispezionate, i due percorsi WX sono separati e senza nodo centrale. La resa nelle viste generali è discreta e richiede revisione umana. **Nessuna approvazione estetica S4 dichiarata.**

Sicurezza minima: ID/nuovi numeri validati, scan circoscritto dei runtime senza segreti, build senza hook di profiling, nessuna dipendenza/rete/backend aggiunta. Non è l'audit 5E.

## Ripresa e checkpoint

[RESUME.md](RESUME.md) contiene l'ordine di ripresa, i comandi e i rischi da verificare. Commit intermedio: quello che introduce questo rapporto, risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S4/REPORT.md`. SHA e checkpoint remoto effettivi nella consegna all'utente, solo `feature/turnouts`; nessun merge/reset/rebase/force-push/deployment o push main.

**STOP richiesto dall'utente. Riprendere S4, non S5.**
