# S6 — STOP scenico e campanello

S6 completata tecnicamente; review tecnica e artistica della Regia PENDING. S7 NON iniziata.
La richiesta S6 attesta la revisione S5 della Regia e autorizza questa sola fase.
Baseline pulita `feature/turnouts` a `ca9d419b40dae8b54181fcd0524af492c80b570b`,
con codice S5 `8321979af164f80ecfdcac4a9d884712ccd98031` presente.
Commit locale richiesto: `feat(turnouts): render guarded stop and bell`;
SHA risolvibile con `git log -1 --format=%H -- docs/_active/turnouts/evidence/S6/REPORT.md`.
**Nessun push autorizzato nella richiesta S6; nessun push eseguito.**

## Implementazione circoscritta

Tre moduli: `guarded-stop-view.js` osserva esclusivamente `train.guard` e Journey;
`guarded-stop-scene.js` proietta il feedback nella scena; `guarded-stop-bell.js`
coordina un solo AudioContext globale. `app.js` collega update al RAF già esistente,
reduced motion e silenzio immediato ai comandi/lifecycle. Nessun rilevatore di pericolo aggiunto.

La proiezione richiede GUARDED_STOP, UNSAFE/UNKNOWN, intervento effettivo e richiesta
attiva o velocità residua. Distingue frenata da arresto; un normale STOP/parcheggio
non genera il cartello. La boundary viene risolta sulla geometria canonica; per
conflitti fisici privi di boundary si usa la posizione del gancio di testa sul Journey
coperto. Se il riferimento non è determinabile, restano messaggio accessibile e
segnalazione sonora: nessuna posizione inventata. S6 non concede movimento.

Cartello ottagonale opaco rosso, raggio2.8mm, spessore0.35mm, centro a17mm dal
terreno; palo metallico16mm con raggio0.18–0.22mm, base0.4mm. Testo STOP su entrambe
le facce. Emersione400ms con micro-overshoot limitato, rientro300ms; permanenza
immobile e reduced motion immediato. Nessun bloom, luce o shader animato aggiunto.

Posa derivata da tangente/normale canonica, candidati laterali ±24/30/36/42mm.
Raycast del terreno effettivo, anche dopo il batching5D (identificazione del suo
materiale esistente); distanza da tutte le polilinee ferroviarie almeno21mm,
comprendente corridoio18mm e raggio3mm. Controllo dei triangoli world-space della
scenografia, istanze comprese, e ingombri dei rotabili reali e carri sganciati.
Candidati incompatibili scartati; nessuno spostamento di rotaie/scenografia.
Le pose fallite vengono riprovate al massimo ogni secondo, quelle valide riusate.
Una variazione di riferimento non lascia un segnale nella vecchia posizione.

Campanello originale sintetizzato: tre parziali sinusoidali840/2113/3864Hz,
attacco8ms, decadimento650ms, ripetizione1800ms e volume moderato. Una sola voce
logica globale, indipendente dal numero di rischi. Nessuna registrazione/libreria.
AudioContext creato solo dopo gesto trusted; controllo MUTE nativo con aria-pressed,
mouse/tastiera/touch. Silenzio immediato su mute, fine rischi, pausa, hidden,
pagehide, reset e dispose; resume asincrono ricontrolla lo stato corrente.
Messaggio `Approach blocked`, motivo e frenata/arresto in una regione aria-live;
plancia e altezza console invariate. Frecce S4 continuano a indicare itinerario.

## Verifiche eseguite in S6

- `npm test`: **220 PASS**, zero fallimenti/skip (217 preesistenti e3 test S6).
- `npm run build`: **PASS**.
- Python/JMRI: **9 PASS**; rigenerazione canonico senza diff.
- Browser S6 Chromium/SwiftShader: **PASS**. Guardia nativa Y4C, animazione,
  reduced motion, MUTE mouse/Enter/touch CDP, gesture gate e pausa, due guardie
  reali e due segnali, inversione sicura con un solo rischio residuo, correzione
  con treno ancora fermo senza ripartenza automatica, STOP ALL, reset e dispose.
  Il confronto render con/senza segnale verifica anche pixel realmente disegnati.
- Regressioni browser **S4, S2 e5C PASS** (matrice5C undici scenari), esiti e log
  conservati. Suite S4 include WX310, direzioni/stati e glowB; nessuna suite storica
  viene presentata come una nuova esecuzione S5 completa.
- S5 mirata: dopo dispose totale di S6, caso nativo150mm/s, gap40mm ed elapsed60s:
  GUARDED_STOP e distanza finale30.000002mm. Protezione operativa senza feedback.
  Le fonti del motore S5, router/Journey e dispatcher rimangono identiche alla baseline.

[Provenienza e comandi](commands.json), [telemetria S6](browser/browser.json),
[regressioni](tests/regressions.json), [invarianti](tests/invariants.json),
[galleria e campanello](visual/GALLERY.md). Le suite sono state eseguite prima del
commit sul contenuto runtime consegnato; gli aggiornamenti successivi sono documentali.

## Risorse e limiti della misura

Quattro geometrie, tre materiali e una texture condivisi fra tutti i segnali;
unità riusate per identità treno. Nessun nuovo RAF, listener rimosso al dispose.
Costo medio update0.092ms su100chiamate; prima ricerca posa88.6ms. La ricerca iniziale è sincrona e può costare una singola pausa di questo ordine. Sono campioni
locali SwiftShader, non FPS hardware né un confronto completo5D.
Il dispose libera esattamente4 geometrie e1 texture GPU; nessuna voce o timer audio
residuo, gruppo vuoto anche dopo secondo dispose. Memoria stabile nel campione
ripetuto100update; nessuna nuova dipendenza, API remota o credenziale.

Verifica sorgenti: tutti i1225 file già tracciati confrontati con baseline; soltanto
`app.js` differisce prima degli aggiornamenti documentali. Sono preservati i builder
delle150rotaie/75letti, asset, geometrie Kato, massicciata, grafo, S5, ottimizzazioni5D,
glowB e frecce340ms. Hash canonico
`e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`.
Master Spec PDF/MD invariata. Scan mirato credenziali e controllo bundle senza hook
di profiling: PASS. Nessuna modifica backend/Supabase, altro repository o Z21.

## Limiti e consegna

GPU fisica, touch hardware, lettore di schermo e giudizio acustico su altoparlanti:
**NOT VERIFIED**. Il WAV è un rendering OfflineAudioContext dello stesso DSP,
non prova di ascolto fisico. Le sequenze sono frame a clock controllato, non video
realtime. Non ripetuti audit completo S5, matrice completa5D o test conclusivi S7,
come richiesto. Un sito senza spazio geometricamente valido non mostra il cartello;
protezione e avviso accessibile restano attivi. Visibilità da ogni camera non garantita:
il cartello è un oggetto scenico con occlusione reale.

**STOP dopo S6.** Attendere review tecnica e artistica della Regia su cartello,
animazione e campanello. Nessuna approvazione estetica dedotta dai test; S7 richiede
nuova autorizzazione. Il divieto di push S6 dell'utente prevale sul protocollo AGENTS.
