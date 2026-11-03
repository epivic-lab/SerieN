# Fase 5C — Affidabilità ferroviaria

> Stato attuale: **5C chiusa** dopo la verifica indipendente e le successive correzioni. [Rapporto conclusivo](PHASE5C_CLOSURE.md). Questo documento conserva il primo blocco R01–R03 e le sue prove storiche.

Baseline: `954461e` (5B), branch `reliability/phase-5c`. Correzioni motivate dall'audit 5A, non da nuove funzionalità. Nessuna modifica alla geometria, alla topologia Kato/RailModeller, alle missioni o al deployment. Nessuna galleria.

## Correzioni

- **R01:** `railway-conflicts.js` confronta gli inviluppi orientati sul piano usando asse, ganci e larghezza del mezzo anche quando i centri occupano edge diversi. La regola preesistente sullo stesso edge resta conservativa; scompare la dipendenza dalla sola soglia cross-edge di 17 mm. Test di corpi sovrapposti tra T47/T46, conflitto perpendicolare e indipendenza di binari paralleli a 33 mm. Anche la protezione verso carri fermi usa il medesimo predicato, mantenendo il controllo del verso d'avvicinamento.
- **R02:** ogni carro sganciato conserva una copia indipendente dei segmenti del Journey e la coordinata del proprio centro. `occupiedRanges` ne proietta l'intero ingombro attraverso i giunti: la carrozza a s=5 su T47 occupa anche TO4:AC. La storia non cambia quando il treno prosegue o modifica la propria ribbon. Per fixture legacy senza storia resta un fallback single-edge; nessun percorso viene inventato. Il runtime crea gli sganciati con storia.
- **R03:** costruttore/posizionamento, locate/ensure/move/reconcile e FixedClock rifiutano valori non finiti o limiti non validi prima delle mutazioni. Anche la velocità comandata rifiuta NaN/Infinity. Input numerici validi e passo fisso restano invariati.
- **Operazioni rifiutate:** il cambio modelli ripristina segmenti e stato diagnostico precedente se lo spazio non basta; il posizionamento diagnostico controlla una candidata (coda e fronte) prima di sostituire il Journey. Un aggancio senza spazio ripristina la ribbon. Nessun carro viene trasferito in caso di fallimento.
- **Sincronizzazione:** dopo un aggancio/sgancio riuscito le mesh vengono aggiornate prima della UI. Il test browser ha rilevato che, con la nuova protezione, il riaggancio poteva avvenire entro la tolleranza esistente di 3,5 mm lasciando temporaneamente la mesh nella posizione precedente. La tolleranza non è stata aumentata.

## Verifiche

- 109 test Node passati: 106 precedenti e tre nuovi test mirati R01/R02/R03. [Log](phase-5c/node-tests.txt).
- 9 test Python JMRI passati; build riuscita. [Log Python](phase-5c/python-tests.txt).
- Regressione browser operativa: anelli nei due sensi, scambi/crossover, quarto convoglio e MRU, protezioni e HUD, entrambi i rami del runaround, STOP ALL, quattro viewport. [Log](phase-5c/browser-operations.txt).
- Browser Fase 4: tre convogli, ruote/bielle, arresti, inversioni, aggancio/sgancio e ritorno al carro, quattro terminali con locomotore corto, consolle, Low/High e responsive. [Log](phase-5c/browser-phase-four.txt).
- Caso R01 ripetuto nel browser reale: le locomotive in conflitto T47/T46 vengono fermate. [Evidenza](phase-5c/collision-browser.json).
- Rifiuto del cambio Kenney→nativo senza spazio a T39 e del posizionamento oltre l'inviluppo del terminale: Journey precedenti conservati. [Test](../tests/browser-phase-five-c.py), [esito](phase-5c/atomic-browser.json).

Gli output browser sono locali e isolati; nessun collaudo sul sito pubblico viene attribuito a questa versione non pubblicata. Chromium/SwiftShader non certifica prestazioni GPU fisiche.

## Rischio, rollback e limiti

Impatto previsto: arresti più conservativi rispetto al vecchio predicato, occupazione completa degli sganciati e rifiuto esplicito degli input invalidi. Il conflitto sul piano usa rettangoli orientati, non la mesh dettagliata o una simulazione continua dei corpi; le protezioni sono campionate dal ciclo esistente. Non è una certificazione di sicurezza ferroviaria fisica né una prova esaustiva di ogni combinazione di composizione e manovra. Restano i limiti metrologici già documentati su WX310, fouling e rotabili.

Nessuna modifica funzionale alle missioni, alle connessioni o ai comandi validi è stata introdotta senza il difetto documentato. Contratti diagnostici con input non validi ora generano RangeError intenzionalmente; non va preservata la corruzione precedente per soddisfare un oracle storico.

Checkpoint applicativo: `d85892f`; checkpoint documentale: commit che introduce questo report e aggiorna PROGRESS. Rollback tramite revert su branch dedicato, in ordine inverso e con working tree verificato, mai reset distruttivo. Nessun push/deployment; 5D e 5E richiedono nuove istruzioni.
