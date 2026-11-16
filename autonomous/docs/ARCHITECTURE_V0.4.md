# Serie N Autonomous — Specifica architetturale V0.4
**Data:** 2026-11-16 · **Stato:** Draft / decisioni di principio approvate nel dialogo; fattibilità software e hardware da verificare.

## 1. Visione e confini
Sviluppare un sistema di guida autonoma per SerieN tramite chat in linguaggio naturale, con successive integrazioni al plastico reale. Primo target: simulatore web; nessuna modifica al simulatore, alla app Swift o alla Z21 in questa fase.

### Casi d'uso essenziali
- \`MAINTAIN_SPACING(loop=A, trains=3)\`: convergenza morbida a tre locomotive equidistanti lungo la lunghezza di percorso, con margini frenatura/ingombro.
- \`GENERATE_DEMO(duration=15m)\`: movimento coordinato, precedenze, soste, manovre riproducibili e spiegabili.
- \`YIELD_PRIORITY(train=merci, to=passeggeri)\`: applicare una precedenza solo se c'è un itinerario fisicamente sicuro.
- \`STOP_ALL\`, \`PAUSE\`, \`RESUME\`, \`WHY_STOPPED(train)\`.
- \`CLOSE_RESOURCE\`, \`OPEN_RESOURCE\` per indisponibilità simulate.

## 2. Vista d'insieme
**Livello 1 — Chat/Intent Parser:** modello Ollama locale opzionale e sostituibile, o parser deterministico per comandi critici. Produce una grammatica limitata di intenti JSON validati; NON produce comandi arbitrari per Z21/scambi. Interpreta richieste e fornisce spiegazioni in linguaggio naturale; no ciclo di inferenza continuo.

**Livello 2 — Dispatcher predittivo:** un'unica libreria TypeScript in-process per MVP web, organizzata in sottosistemi logici (topologia, pianificazione, interlocking, stima, regolazione, safety). Il ciclo operativo continua anche senza Ollama. Usa piano temporale corto e ricalcolo a eventi; aggiornamenti rapidi localizzati per velocità e sicurezza, senza interrogare database/cloud nel percorso critico.

**Livello 3 — Environment Adapter:** stesso protocollo logico per simulatore e plastico. Il simulatore espone solo osservazioni che il mondo fisico permetterebbe di rilevare; OpenCV può sostituirlo in futuro. Per uso reale, il dispatcher e il safety runner devono essere persistenti in processo locale, NON esclusivamente in una scheda browser.

**Supabase**: configurazioni, profili rotabili, eventi, replay e scenari; non arbitro in real-time e non host di Ollama.

## 3. Topologia e prenotazioni
Rappresentare la rete come grafo diretto e risorse geometriche occupabili:
- segmenti di binario, sezioni oscurate \`tunnel_A\`, \`tunnel_B\`, \`tunnel_C\`;
- scambi, cuori, zone di conflitto, zone d'ingombro e sovrapposizione tra itinerari;
- zone di approccio/overlap frenatura, bordi di liberazione coda;
- lunghezze reali di loco + vagoni, direzione e profilo frenatura.

Le tre sezioni di galleria sono **indipendenti**: un convoglio in A non blocca B né C, tranne effettive interferenze condivise registrate dal grafo. Una sezione nascosta può essere trattata come un blocco esclusivo nella prima versione.

L'occupazione di una risorsa nasce da conferma osservativa o da prudente stima di possibile ingombro. La riserva preventiva e l'occupazione effettiva sono due stati distinti. Ogni itinerario richiede risorse libere/riservabili con validazione atomica e revoca sicura.

## 4. Percezione e stima in galleria
Il simulatore conosce la posizione vera, ma il controller non deve riceverla per i tratti non visibili. Uno strato \`Observation Adapter\` maschera i tratti nascosti prima che l'osservazione arrivi al dispatcher.

Stati: \`OBSERVED\` (posizione visibile con timestamp e incertezza), \`ESTIMATED\` (propagazione velocità/accelerazione dopo ingresso), \`LOST\` (scaduta finestra o incertezza troppo alta).

All'ingresso: registrare ultimi campioni, \`v_est\`, tempo monotono, direzione, itinerario, testa/coda, identificativo convoglio e profilo di movimento. In galleria: propagare stima e intervallo d'incertezza crescente; usare comandi di velocità e modello di inerzia, non un accesso alla ground truth. Al riavvistamento: correggere immediatamente posizione e velocità, registrare errore modello.

**Regola dura:** la scadenza del tempo di percorrenza atteso NON libera la sezione. Lo sgombero completo deve essere confermato tramite osservazione della coda, osservazione della testa oltre distanza pari alla lunghezza del treno con margine appropriato, oppure sensore d'occupazione/ulteriore evidenza verificata. Se non confermabile, risorsa resta occupata, e il sistema degrada fino a stop se il conflitto lo impone. Scostamenti e perdite sensoriali producono diagnostica.

Durante test, la ground truth interna è disponibile solo al modulo di test e all'analisi errore, mai al planner/safety online.

## 5. Interlocking scambi
Per ogni scambio:
1. prenotare risorsa di conflitto + approcci e itinerario;
2. stimare \`latest_safe_throw_time\` da velocità, frenatura, attuazione, stabilizzazione, comunicazione e margini;
3. azionare solo se **nessun convoglio impegna né può entrare nella zona di protezione durante il movimento**;
4. controllare stato comandato e, nel mondo reale, distinguere conferma reale di posizione da mera ricezione comando;
5. bloccare scambio per tutta la percorrenza, fino all'effettivo sgombero della coda + margine;
6. liberare e preparare nuova rotta incompatibile solo quando sicuro.

Se conferma fisica di posizione o sgombero non è disponibile, usare un profilo conservativo e marcare la limitazione, non dichiarare arbitrariamente \`CONFIRMED\`.

Prevenire deadlock di risorse con pianificazione di itinerario, ordinamento canonico, timeout diagnostici e stop del movimento interessato quando non risolvibile.

## 6. Controllo predittivo e fluidità
Priorità lessicografica:
1. sicurezza e non conflitto;
2. fattibilità itinerari e limiti cinematici;
3. fluidità: ridurre fermate complete, freno/accelerazioni brusche, oscillazioni di velocità;
4. rispetto precedenze e tempi di esercizio configurati;
5. throughput e uso efficiente delle tre linee.

Regolatore con speed envelope derivato da distanza frenatura, occupazioni, limiti dei convogli, tempi scambio; applicare rampe di accelerazione/frenatura e isteresi per evitare continue correzioni. Prenotare preventivamente itinerari. «Equidistanti» riferito alla distanza lungo percorso, non alla geometria XYZ; raggiungimento possibile solo se spazio utile e lunghezze/margini lo consentono.

Sui convogli in galleria si può pianificare con stimatore, ma non autorizzare conflitti o liberazioni basandosi solo su stima.

## 7. Precedenze «European Conventional»
Non esiste una singola priorità universale europea valido ovunque. Definire **profili configurabili** per sessione (preferenze per passeggeri veloci, regionali, merci, manovre; puntualità, priorità assegnata, minimizzazione ritardi). Una precedenza non supera mai interlocking, frenatura e occupazione. Il motore deve spiegare ogni decisione (es. «merci M02 attende perché scambio WX310 riservato al passeggeri P01»).

La prima versione NON pretende simulare segnalamento nazionale, ERTMS/ETCS o normativa di esercizio in modo certificato.

## 8. Safety supervisor e GLOBAL STOP
Indipendente da Ollama; applica veto a ogni comando. Se pericolo reale o stato ambiguo non gestibile: \`GLOBAL_STOP(reason_code, affected_resources, evidence, timestamp)\`; invia arresto a tutti i treni tramite via deterministica, non chat; conserva riserve, blocca restart automatico, espone motivo in chat e log; serve verifica di nuovo stato e consenso esplicito al riavvio.

STOP di sicurezza nel mondo reale non significa frenata istantanea: le distanze di sicurezza devono già includere ritardi, inerzia, perdita comunicazione. Per perdita controllo del browser nel simulatore, fail-safe esplicito.

## 9. Contratto eventi e comandi (bozza)
\`\`\`json
{
  "type": "train_observation",
  "time_monotonic_ms": 12345,
  "topology_version": "V3",
  "train_id": "BR01",
  "track_id": "A",
  "head_s_mm": 1250,
  "train_length_mm": 118,
  "speed_mm_s": 32,
  "direction": 1,
  "localization": "OBSERVED",
  "position_sigma_mm": 6,
  "source": "sim_observer"
}
\`\`\`
Eventi minimi: \`train_observation\`, \`resource_occupancy\`, \`turnout_feedback\`, \`command_ack\`, \`sensor_health\`, \`global_stop\`. Comandi minimi: \`set_speed_target\`, \`request_route\`, \`set_turnout\`, \`stop_all\`. Il controller non deve fidarsi ciecamente degli ack: un ACK di comando non dimostra che lo scambio fisico si sia mosso.

Campi, unità, clock, identificatori e topologia saranno verificati con l'attuale codice SerieN prima di stabilire lo schema definitivo.

## 10. Sicurezza logica e accesso
Niente accesso diretto Ollama ai comandi attuatori, soltanto JSON consentiti da schema + verifica dei permessi. Chat remote non possono impartire azioni fisiche senza canale autenticato e conferma, se previsto. Supabase richiede RLS e non deve esporre segreti/chiavi service role nel browser. I log spiegano intenti, comandi, veti, scambi e motivi degli stop.

## 11. Piano di validazione
- Replay deterministico, simulatore con posizioni nascoste, test ground truth separati.
- 3 treni su A: convergenza equidistanza senza violazione di distanza di sicurezza; tolleranza da fissare dopo ricognizione.
- 3 anelli in galleria: blocco solo della sezione pertinente; traffico parallelo B/C non ostacolato se risorse indipendenti.
- Mancata uscita, speed drift, arresto in galleria: non liberare riserva per timeout.
- Scambi: con mutazione ordine eventi, ritardo attuazione, coda lunga, interlocking sempre rispettato.
- Conflitto irrisolvibile: stop di tutti con reason code e spiegazione; nessun riavvio automatico.
- Misurare jerk/oscillazioni velocità, arresti non necessari, utilizzo tratte, completamento missioni.
- Test perdita Ollama: controllo deterministico prosegue; perdita dispatcher/sensore critico: safe stop.

## 12. Assunzioni da auditare, non dati già verificati
Esatte API di SerieN, identificativi e geometria scambi, lunghezze/coordinate percorsi, topologia V3, capacità di osservazione e frenatura di ogni loco, conferme reali della Z21, compatibilità sensori e OS/processo di controllo. Nessuna implementazione finché non esiste audit del codice con risultati e criteri di accettazione.
