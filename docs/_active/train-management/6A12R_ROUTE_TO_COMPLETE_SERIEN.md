# 6A.12-R — Percorso breve per completare SerieN

**Solo roadmap di questa revisione, non autorizzazione a implementare altre fasi.**
5 novembre 2026, Europe/Rome; `feature/train-management`, base
`55d6bd6ef8211e9f136468090ff195f4ac791bde`. La6A.12-P è storia, non istruzione
per acquistare hosting. La precedente6A.12-L è sospesa; nessun suo WIP rilevato
nei checkout disponibili, nessun file cancellato. Nessun nuovo staging.

## Risultato da consegnare

Una persona apre Pages in un browser compatibile, compone e usa i convogli,
salva e ritrova **tutto lo stato dichiarato**; su altro device autorizzato recupera
lo stesso workspace. Restore sempre fermo fino a Riprendi, senza perdere Journey,
loose stock, scambi, identità o storico. In caso di rete assente continua locale
con checkpoint confermati e pending chiari. Il Mac non serve al funzionamento.

Le prove6A.3–6A.11 dimostrano sicurezza/atomicità su **profilo sintetico chiuso**.
Non consegnano serializer, hydrator, compositore persistente o autosave/offline.
Leggere [contratto completo6A.1](6A1_CONTRACT.md), [DTO](STATE_SCHEMA.json),
[mappingR0](R0_ACCEPTANCE_MAPPING.md) e [regressioni6A.11](6A11_REGRESSION_MATRIX.md).
L'originale R0 integrale non è nel checkout; i18criteri originali sono trascritti
nel mapping. Non inventare requisiti o dichiarare6B–6E completate.

## Sequenza proposta, un gate per microfase

| Fase futura proposta | Lavoro minimo concreto | Uscita verificabile / STOP |
|---|---|---|
| 6A.12-R.1 — Confine W locale |Dopo scelta Regia: proof Deno, MAC/encoding, claim separato, dispatch/RLS, lifecycle e ammissione, zero servizio persistente |Replay su più worker/restart/rollback, isolamento A/B, revoca/CAS/receipt e secret scan PASS; specifica migrazione revisionabile; nessun deploy |
| 6B.1 — Identità e capture generale |Adapter UUID durevoli, manifesto modelli verificati, capture sincrona al confine RAF stabile, schema/semantica generale |Stato reale3/4treni+loose/Journey completo+clock/UI; DTO senza DOM/Three; nessun cambiamento topologia/moto |
| 6B.2 — Hydrate fermo e round-trip locale |Candidate separata, asset esatti, scambi/Journey/guard/missioni/UI/clock, swap atomico; gate READY_STOPPED |capture→hydrate→capture uguale normalizzato;10min/24h zero tick; fonte corrotta conserva stato precedente |
| 6B.3 — Journal/outbox e cloud adapter |IndexedDB transazionale, una richiesta in volo/layout, envelope immutabile, CAS e receipt, pending/backoff/export; doppia tab |Quota/eviction/restart/offline/reconnect/ack perso senza duplicati; UI locale/cloud precisa, nessun falso successo |
| 6A.12-R.P — Gate produttivo esatto |Inventario/backup+restore, rehearsal su schema reale, artifact/migrazioni, feature flag DISABLED e approvazione specifica |Solo dopo gate separato, migrazione/Edge canary sul progetto esistente e cap gestito verificato; niente nuovo staging |
| 6C — Catalogo e rappresentazioni |Collegare catalogo versionato agli asset già approvati, cambio grafico transazionale e validazione hash/dimensioni/ganci |Asset mancante/diverso blocca cambio; identità/ingombri logici fermi; nessun upload/conversione server necessario |
| 6D — Compositore/orientamenti/ricovero |Persistenza ordine/membri/±1, ganci, sgancio/riaggancio, inventoryStorage/park/release/slot e vincoli |Composizione e pose restaurate, una collocazione/item, nessun ingresso in occupato; adapter−1 provato nel motore |
| 6E — Chiusura integrata |Tutti R0P01–P18 end-to-end, browser diversi, guasti e budget R1/5D, manuale recovery |Matrice completa con prove e limiti hardware, audit Regia; 5E finale sicurezza resta fase distinta secondo governance |

R.P si colloca dopo il prototipo sicuro e il percorso locale utilizzabile, così
il primo rollout cloud serve una funzionalità concreta. La migrazione può essere
preparata prima, ma non resta motivo per rinviare capture/restore/compositore.
Ogni riga è una proposta di contenuto, da suddividere se serve un gate circoscritto;
non amplia l'autorizzazione di questa conversazione. Stime di calendario/costo di
sviluppo non disponibili: non promettere completamento in una singola sottofase.

Per non ripetere l'infrastruttura: una prova locale W, un pacchetto minimo di
schema, un solo backend/progetto, nessun secret manager esterno o orchestratore.
Se W fallisce un gate, riportare il motivo e la scelta concreta alla Regia;
non aprire un altro hosting a pagamento o adottare AAuth di nascosto.

## Tracciabilità dei18criteri R0 ancora aperti

"Lab PASS" indica evidenza approvata ereditata, **non esecuzione in6A.12-R** e
non PASS completo del simulatore. Nessun criterio viene cancellato dal backlog.

| R0 | Indispensabile per completamento | Prova/fase ancora necessaria |
|---|---|---|
| P01 Identità |UUID stabili item/consist/workspace e nessun duplicato/missing |6B.1/2 round-trip reale e riapertura journal,6E |
| P02 Composizione |Ordine, orientamenti±1 e geometrie/ganci; max4treni/5carri R1 |6B identità,6C manifest,6D adapter−1/compositore,6E |
| P03 Detached |edge/s/heading e Journey/ingombro completi anche giunti/WX |6B.1/2 capture/hydrate e6D riaggancio con identità |
| P04 Locomotive |R1+quarto, speed/requested/velocity/dir/luci/odometro/safety/routeContext |6B round-trip e primo tick dopo Riprendi identico,6E |
| P05 Scambi |Otto ID/booleani; glow/frecce/guard derivati |Hydrate con contatori zero command/event/bell prima di resume,6B/6E |
| P06 Missioni/UI |Progresso, selezione/LRU, tre console/HUD/vista dichiarati |6B.2 restore campi e controlli reali,6E |
| P07 Tempo |Nessuna avanzata chiuso10min/24h; velocità conservata e gate fermo |6B.2 clock/tick/accumulatore, zero tick fino a Riprendi |
| P08 Round-trip |capture(hydrate(capture(S))) uguale normalizzato |6B.1/2 runtime reale, nessuna fixture JSON spacciata per restore |
| P09 Atomicità |Vecchia o nuova head intera a ogni guasto |Lab PASS; nuovo W e client reale fault substep/deferred/kill,6E |
| P10 Idempotenza |request_id/digest/receipt invariati, mismatch negato |Lab PASS; nuova API/outbox/ACKperso e retry dopo head avanzata,6B.3/6E |
| P11 Concorrenza |Due tab e due device,409 e recovery non distruttivo |Lab CAS parziale; journal condiviso, receipt perse e UX conflitto,6B.3/6E |
| P12 Offline |Checkpoint locali durabili, pending/backoff e reconnect multi-coda |6B.3 crash prima/dopo invio/commit, ordine e deduplica,6E |
| P13 Corruzione |Checksum/topology/schema/asset invalidi bloccano restore senza reset |Lab integrità parziale; candidata reale quarantinata e revisione precedente integra,6B/6C |
| P14 Autorizzazione |Senza capacità/revocata/scaduta/altro workspace zero accessi; zero segreti bundle |Nuovo W test locali/gestiti, recovery/device e browser,6E; audit5E distinto |
| P15 Quote/abuso |Limiti payload/throughput e nessun privilegio pubblico |L01 storico FAIL multi; nuovo cap e ingress/DB/workspace budget provati prima apertura |
| P16 Asset |Hash/permesso/dimensioni/ganci corretti anche nel cambio in sessione |6C con missing/hasherrato e confronto geometrie; no fallback incompatibile |
| P17 Ricovero |park/release/slot persistenti, una posizione/loco, binario occupato protetto |6D fixture fisica su binari canonici e restore6B/6E; nessun nuovo asset shed implicito |
| P18 R1 |RegressioniS0–S7/5C/5D,150rail75bed, guardie/WX/UI, memoria/performance |Ogni implementazione invarianti;6E matrice browser e campagna comparabile R1/5D |

## Indispensabile e rinviabile

Per il primo rilascio di persistenza: capture/hydrate generale, salvataggio manuale,
recupero revisioni, journal/outbox offline, pairing/recovery e isolamento sicuri,
flag e backup. Le caratteristiche R0 su orientamenti, compositore, catalogo e
ricovero possono arrivare dopo il primo percorso save/restore, **ma restano obbligatorie
per dichiarare Train Management completo**. Non consegnare come completa una sola
demo di persistenza o il profilo sintetico.

Rinviabili senza cambiare quei criteri: realtime collaborativo/cursori, presenza,
sync a ogni tick, autosave frequente, app native/PWA installabile, import/conversione
asset arbitrari, nuovi tracciati/scenografie, social account e login con registrazione,
multi-regione/HA, broker autoscalati e servizi esterni. Eventuale autosave lento
va dimensionato contro storico immutabile e Free, non è prerequisito del primo save.

Browser target da provare: Chromium/Firefox/WebKit desktop, Safari iOS e Chrome
Android su hardware quando disponibile; controllare WebGL2, WebCrypto HTTPS,
IndexedDB CryptoKey, storage quota/eviction, gesture audio, touch e lifecycle.
Feature detection con errore comprensibile e export locale dove possibile;
nessun fallback che esporti la chiave privata o disabiliti firme/RLS. "Browser
compatibile" non promette ogni browser o storage privato durabile indefinitamente.

## Gate di questa consegna6A.12-R

Esclusivamente cinque nuovi Markdown, più PROGRESS e STATUS aggiornati; vecchia
6A.12-P preservata ma superata operativamente,6A.12-L sospesa. Nessuna modifica
ad applicazione, SQL, migrazioni, test, dipendenze, assets, workflow o main.
Verifiche ed esito finale nel STATUS; log locali in `/workspace/work/6A12-R/`.
Invarianti R1/canonico/UI/backend verificabili per hash rispetto al checkpoint;
nessun nuovo screenshot/benchmark o PASS hosted dedotto da essi.

Checkpoint atomico e fast-forward del solo branch dedicato, SHA effettivo nella
consegna dopo verifica remota. **Unica prossima azione: audit Regia e decisione
sul modello W/D09/D10. STOP6A.12-R;6A.12-R.1, produzione e6B–6E non autorizzate.**
