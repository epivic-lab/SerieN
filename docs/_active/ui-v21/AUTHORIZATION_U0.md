# SerieN — UI V2.1 | AUTORIZZAZIONE REGIA U0

## VERDETTO

La Regia ha esaminato il rapporto `UI V2.1 — INTEGRATION READINESS REPORT`, incluso il §13 e le evidenze di acquisizione definitiva.

**APPROVO IL PACCHETTO TECNICO CODEX UI V2.1.**

Autorizzo esclusivamente la microfase **U0 — Integration Foundation & Contract Normalization**.

Non autorizzo ancora U1–U9.

## 1. Baseline obbligatoria

Repository: `epivic-lab/SerieN`

Branch di lavoro esistente:

`codex/ui-v2-integration`

Checkpoint readiness verificato:

`af67ee5c65679b7e5fa384d76a0825dff022f27d`

Baseline applicativa approvata:

`91722fbdf6671e69deebf645c3d8bf389212f421`

Main produttiva:

`184cc9ba93a6b35493f365b2ffcb20ef0645963d`

Verifica i riferimenti prima di operare.

Non creare un altro branch, non tornare a commit M2 precedenti e non effettuare merge/rebase.

## 2. Fonte tecnica

Il pacchetto Claude acquisito e validato contiene:

- Specifiche tecniche U0–U9.
- Contratti UI.
- Mapping codice/DOM.
- State machine.
- Criteri di accettazione.
- Design V2.1 approvato.
- Design V1 congelato.
- Asset e reference.
- Prompt incrementali.

Usalo come base, applicando le decisioni aggiornate della Regia e le correzioni di compatibilità del §13 del tuo rapporto.

## 3. Perimetro U0

Prepara le fondamenta documentali e contrattuali della futura integrazione.

### A. Normalizzazione della baseline

Rendi esplicita l'autorità del branch `codex/ui-v2-integration` fondato su `91722fb`.

Aggiorna i riferimenti tecnici che ancora indicano:

- `codex/ui-v21`.
- M2 `a67e0de` come baseline applicativa finale.
- M3 `252d9c3` come componente provvisorio.
- Un futuro merge/rebase M3.

M3 è già approvata e presente nella baseline.

Non modificare i materiali di design congelati: inserisci gli override nella documentazione d'integrazione.

### B. Registry definitivo dei controlli

Consolida il mapping dei 66 controlli e delle 31 schermate.

Per ogni controllo definisci:

- Identificativo stabile.
- Modulo sorgente reale.
- Selettore DOM esistente.
- Destinazione V2.1.
- Callback o API effettiva.
- Stato letto e modificato.
- Vincoli.
- Microfase d'integrazione.
- Test di accettazione.
- Eventuali adapter necessari.

Il registry deve distinguere rigorosamente codice reale, design mock e funzionalità non implementate.

### C. Risoluzione delle incompatibilità documentali

Applica queste decisioni definitive:

1. Sign out: il codice effettivo utilizza `addEventListener`; non trattarlo come `.onclick`. La futura guard deve impedire una disconnessione prematura o duplicata.
2. Exit to title: rimane disabilitato con motivazione fino all'esistenza di una destinazione reale.
3. Conferme M2: non sostituire chiamate sincrone a `window.confirm` con modali asincrone senza un adapter che conservi atomicità e comportamento.
4. Guard della sessione: usare le condizioni reali M2/M3, non lo stato mock `hasSession`.
5. `#stop` e ID della console selezionata: preservare i contratti effettivi, incluso Space.
6. `setZoom` e status Guarded Stop: non inventare API pubbliche che il codice non espone.
7. Next Switch: diagramma reale, sola lettura, nessuna azione di scambio dall'HUD.
8. Bell: un solo controller reale Guarded Stop, indipendente da UI Sound.
9. Velocità: distinguere comando percentuale e velocità dinamica; non inventare km/h.
10. Log: non introdurre severity o KPI non presenti nel motore.
11. CSS: documentare un unico ordine di caricamento verificabile; niente sostituzioni globali premature.
12. Font: Cinzel Decorative, Federo e Cutive Mono richiedono acquisizione e verifica licenze prima di U1; non considerare gli asset già completi.
13. Miniature: riutilizzare gli asset applicativi esistenti; nessuna sovrascrittura basata esclusivamente su differenze di checksum.
14. JavaScript della reference: escluso integralmente dal bundle applicativo.

### D. Piano dei test

Prepara un registry dei test da mantenere e dei nuovi test necessari per ogni microfase.

Non indebolire le asserzioni storiche R1/M1/M2/M3.

Non migrare adesso i selettori dei test verso un DOM che ancora non esiste.

Eventuali nuovi strumenti di verifica U0 devono essere isolati e non alterare i test baseline.

### E. Strategia di migrazione

Finalizza il percorso U1–U9, evidenziando per ciascuna microfase:

- File autorizzabili.
- Dipendenze.
- Rischi.
- Gate funzionali.
- Gate visuali.
- Test.
- Evidenze.
- Rollback.
- Condizione di STOP.

Nessuna microfase successiva è automaticamente autorizzata dal completamento di U0.

## 4. Attività vietate in U0

NON modificare `app.js`, `index.html`, `style.css` o i moduli runtime in `src/`.

NON installare ancora CSS, font, texture o altri asset V2.1 nell'applicazione.

NON modificare il motore R1.

NON modificare il dominio M2/M3.

NON modificare Auth, Supabase o RLS.

NON cambiare dipendenze o workflow.

NON modificare la V1 congelata.

NON iniziare U1, U2 o altre fasi.

NON eseguire merge su main o deploy.

Evita di aggiungere al repository copie inutilmente duplicate dell'intero archivio da 36,75 MB. Conserva soltanto i riferimenti e gli artefatti tecnici necessari all'integrazione, con provenienza verificabile.

## 5. Deliverable U0

Produci un checkpoint versionato sul branch esistente comprendente:

- `U0_REPORT.md`.
- Registry completo controlli/schermate.
- Tabella source → DOM → callback → test.
- Registro degli adapter necessari.
- Risoluzione dei conflitti tecnici.
- Piano U1–U9 aggiornato.
- Matrice dei test e gate.
- Inventario degli asset da acquisire.
- Manifest e provenienza del design.
- Evidenza dei file applicativi rimasti invariati.

Verifica la consistenza dei dati e, se possibile, esegui un controllo automatico dei mapping.

Non ripetere tutte le suite browser della Fase 0 senza una ragione concreta: il codice applicativo deve rimanere invariato.

## 6. Conclusione

Al termine restituisci:

**U0 READY FOR REGIA REVIEW**

oppure

**U0 BLOCKED**, con cause specifiche.

Indica commit SHA, branch, file modificati, verifiche PASS/FAIL/NOT VERIFIED e rischi residui.

**STOP dopo U0. Attendi autorizzazione esplicita per U1.**