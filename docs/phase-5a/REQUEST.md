# SERIEN — FASE 5
## Engineering Hardening, Reliability, Performance & Security
### Master Roadmap e istruzioni operative per Codex

**Progetto:** SerieN Autumn Railways
**Repository autorizzato:** `epivic-lab/SerieN`
**Versione:** Phase 5 — Master Plan 1.0
**Stato iniziale:** Fasi 0–4 dichiarate completate; da verificare mediante audit.

---

# 1. MISSIONE

SerieN è un simulatore ferroviario tridimensionale basato su un plastico reale in scala N (1:160), realizzato con binari Kato Unitrack.

Il software comprende, tra le altre funzionalità:

- Tre anelli ferroviari.
- Quattro tronchini e un lungo runaround.
- Due crossover WX310.
- Gestione degli scambi.
- Simulazione simultanea di più convogli.
- Tre consolle di guida dinamiche.
- Miniature delle locomotive e minimappe ferroviarie.
- Next Switch HUD.
- Gestione di aggancio e sgancio.
- Rendering tridimensionale del plastico.
- Materiale rotabile 3D.
- Scenografia autunnale.
- Missioni e operazioni ferroviarie.

La configurazione iniziale del plastico non prevede gallerie.

Le prime quattro fasi di sviluppo sono state completate secondo la precedente roadmap, ma il loro effettivo stato deve essere verificato.

Il codice complessivo supera le 8.000 righe.

La priorità della Fase 5 non è ampliare le funzionalità, bensì raggiungere un elevato livello di:

1. Qualità ingegneristica.
2. Modularità.
3. Affidabilità operativa.
4. Prestazioni.
5. Sicurezza informatica.
6. Testabilità.
7. Manutenibilità.
8. Recuperabilità dopo interruzioni dell'ambiente di sviluppo.

**Principio fondamentale: migliorare profondamente il software senza compromettere ciò che già funziona.**

---

# 2. VINCOLI INDEROGABILI

## Protezione dei repository

Opera esclusivamente sul repository `epivic-lab/SerieN`.

Non modificare, eliminare, riorganizzare o aggiornare:

- `first`
- `SerieN Control`
- Qualsiasi altro repository

Non introdurre integrazioni tra SerieN e SerieN Control.

## Protezione delle funzionalità

Non modificare arbitrariamente:
- Geometria ferroviaria.
- Topologia del tracciato.
- Raggi Kato.
- Posizione degli scambi.
- Logica delle missioni.
- Comportamento dei convogli.
- API e contratti interni già utilizzati.

Le modifiche funzionali devono essere giustificate da bug verificati o necessità architetturali documentate.

## Controllo del rischio

Non eseguire riscritture generalizzate.

Ogni intervento deve possedere:
- Motivazione tecnica.
- Impatto previsto.
- Rischio di regressione.
- Test di verifica.
- Strategia di ripristino.

Non introdurre dipendenze aggiuntive senza una motivazione documentata.

---

# 3. STRUTTURA UFFICIALE DELLA FASE 5

La Fase 5 è suddivisa in cinque sottofasi autonome e sequenziali.

## FASE 5A — Audit tecnico e Security Assessment

**Obiettivo:** comprendere integralmente lo stato attuale del codice e definire un piano di miglioramento fondato su evidenze.

### Analisi architetturale

Verifica:
- Organizzazione del repository.
- Responsabilità dei moduli.
- Dipendenze interne.
- Accoppiamento fra componenti.
- Dipendenze circolari.
- Codice duplicato.
- Funzioni e componenti eccessivamente complessi.
- Gestione degli errori.
- Gestione dello stato applicativo.
- Codice inutilizzato.
- Qualità dei tipi e delle interfacce.

Individua eventuali moduli che richiedono reengineering.

### Analisi del motore ferroviario

Esamina:
- Modello canonico del tracciato.
- Gestione delle posizioni.
- Movimento dei convogli.
- Transizioni fra segmenti.
- Scambi e crossover.
- Occupazione dei binari.
- Prevenzione dei conflitti.
- Inversione di marcia.
- Accoppiamento e sgancio.
- Gestione del runaround.
- Sincronizzazione delle minimappe.
- Next Switch HUD.

Verifica che tutte le rappresentazioni condividano dati coerenti.

### Analisi del rendering

Esamina:
- Render loop.
- Scena 3D.
- Geometrie.
- Texture.
- Materiali.
- Illuminazione.
- Gestione degli asset.
- Memoria GPU.
- Eventuali memory leak.
- Caricamenti ripetuti.
- Aggiornamenti inutili.
- Scalabilità con più convogli.

### Security assessment

Analizza:
- Dipendenze vulnerabili.
- XSS e injection nei punti di ingresso pertinenti.
- Input non validati.
- Utilizzo di `innerHTML` o API equivalenti.
- Gestione degli URL esterni.
- Asset di terze parti.
- Codice incorporato da fonti esterne.
- Eventuali credenziali o segreti presenti nel codice o nella cronologia.
- Configurazione GitHub Pages.
- GitHub Actions.
- Permessi dei workflow.
- Dependency pinning.
- Content Security Policy.
- Risorse caricate da domini esterni.
- Possibili rischi di supply-chain attack.

Distingui vulnerabilità confermate, rischi potenziali e raccomandazioni preventive.

Non eseguire penetration test su servizi esterni.

### Test e qualità

Valuta:
- Test automatici esistenti.
- Copertura dei moduli critici.
- Test di regressione.
- Test end-to-end.
- Test della topologia ferroviaria.
- Test di rendering.
- Test delle interazioni.
- Verifiche della build.
- Affidabilità del deployment.

### Deliverable 5A

Crea:

`docs/ENGINEERING_AUDIT.md`

Il documento deve contenere:

1. Executive summary.
2. Commit e branch analizzati.
3. Architettura corrente.
4. Mappa delle dipendenze.
5. Problemi tecnici identificati.
6. Evidenza concreta per ogni problema.
7. Classificazione per severità, probabilità e impatto.
8. Vulnerabilità confermate e rischi potenziali.
9. Interventi raccomandati.
10. Priorità e dipendenze.
11. Rischi di regressione.
12. Test mancanti.
13. Criteri di accettazione per le fasi 5B–5E.

**Durante la Fase 5A non modificare il codice applicativo.**

Sono consentiti soltanto audit, test non distruttivi e aggiornamenti documentali.

---

## FASE 5B — Refactoring architetturale

**Obiettivo:** rendere SerieN più modulare, comprensibile e manutenibile.

Interventi possibili:
- Separazione dei moduli per responsabilità.
- Eliminazione delle duplicazioni.
- Consolidamento dello stato applicativo.
- Introduzione di interfacce coerenti.
- Riduzione delle dipendenze circolari.
- Semplificazione delle funzioni complesse.
- Revisione della gestione degli eventi.
- Ottimizzazione della struttura delle cartelle.
- Eliminazione del codice morto.
- Reengineering mirato delle parti problematiche.
- Introduzione di test per i moduli rifattorizzati.

Non modificare il comportamento osservabile senza una motivazione tecnica verificata.

### Deliverable 5B

- Codice rifattorizzato.
- Test di regressione.
- Documentazione architetturale.
- Report delle modifiche.
- Commit recuperabile.

---

## FASE 5C — Affidabilità dei comportamenti ferroviari

**Obiettivo:** garantire che la simulazione sia logicamente coerente e stabile anche nelle condizioni limite.

Verificare e correggere:
- Continuità dei tre anelli.
- Transizioni tra segmenti.
- Instradamento sugli scambi.
- Funzionamento dei crossover WX310.
- Accesso ai quattro tronchini.
- Manovre nel runaround.
- Movimento simultaneo dei convogli.
- Cambi di direzione.
- Arresti.
- Occupazione dei binari.
- Conflitti fra convogli.
- Aggancio e sgancio.
- Lunghezze delle composizioni.
- Sincronizzazione fra modello ferroviario e rendering.
- Sincronizzazione delle tre consolle.
- Correttezza delle minimappe.
- Next Switch HUD.

Testare anche casi limite:
- Scambio modificato mentre un treno si avvicina.
- Convoglio fermo su uno scambio.
- Inversione vicino a un terminale.
- Cambio della locomotiva attiva.
- Rimozione di una consolle dalla plancia dinamica.
- Aggancio e sgancio in curva, se consentiti.
- Due convogli che richiedono la stessa tratta.

La simulazione non deve inventare percorsi o stati di occupazione.

### Deliverable 5C

- Motore ferroviario corretto e verificato.
- Suite di test operativi.
- Report delle anomalie corrette.
- Commit recuperabile.

---

## FASE 5D — Performance Optimization

**Obiettivo:** migliorare la fluidità e ridurre il consumo di risorse.

Misurare prima di intervenire.

### Ambiti

- CPU e memoria.
- GPU e WebGL.
- Render loop.
- Frame timing.
- Aggiornamenti React/UI, se pertinente allo stack effettivo.
- Event handling.
- Allocazioni ripetute.
- Texture e geometrie.
- Shader.
- Caching degli asset.
- Caricamento asincrono.
- Livelli di dettaglio.
- Instancing.
- Aggiornamento delle minimappe.
- Calcolo delle posizioni ferroviarie.

Effettuare benchmark ripetibili con:
- Plastico vuoto.
- Un convoglio in movimento.
- Tre convogli simultanei.
- Più locomotive e vagoni.
- Scambi e HUD attivi.
- Illuminazione e rendering alla qualità prevista.

Documentare le condizioni hardware e software dei test.

### Deliverable 5D

- Report delle misure iniziali.
- Ottimizzazioni applicate.
- Benchmark prima/dopo.
- Eventuali regressioni.
- Commit recuperabile.

Non dichiarare miglioramenti prestazionali privi di misurazioni.

---

## FASE 5E — Cybersecurity Hardening e stabilizzazione

**Obiettivo:** ridurre concretamente i rischi di sicurezza e introdurre controlli permanenti.

### Attività

- Correzione delle vulnerabilità confermate.
- Verifica e aggiornamento delle dipendenze.
- Protezione contro XSS nei punti di ingresso pertinenti.
- Validazione degli input.
- Gestione sicura dei contenuti esterni.
- Verifica degli asset importati.
- Introduzione o miglioramento di Content Security Policy compatibile con WebGL e con il deployment effettivo.
- Riduzione dei permessi GitHub Actions.
- Protezione dei segreti.
- Controlli sulle dipendenze e sulle action di terze parti.
- Verifica delle impostazioni di deployment.
- Controlli automatici nella CI.
- Documentazione della sicurezza.
- Test di regressione complessivo.

Le misure devono essere proporzionate alla reale architettura dell'applicazione.

Non applicare configurazioni di sicurezza soltanto perché considerate best practice generiche, senza verificarne l'efficacia e la compatibilità.

Non eseguire scansioni offensive contro servizi esterni.

### Deliverable 5E

- Correzioni documentate.
- Security assessment finale.
- Controlli automatici di sicurezza.
- Test applicativi.
- Report dei rischi residui.
- Versione stabile verificata.

Non dichiarare SerieN immune da attacchi informatici.

---

# 4. RECUPERABILITÀ DEL LAVORO

In passato lo sviluppo è stato interrotto dal raggiungimento dei limiti di utilizzo di Codex e dalla perdita dell'ambiente operativo.

Da questa fase in avanti il progetto deve essere recuperabile anche da una sessione Codex completamente nuova.

## Documentazione obbligatoria

Crea e mantieni:

`docs/ROADMAP_PHASE5.md`

Contiene:
- Definizioni ufficiali delle fasi 5A–5E.
- Obiettivi.
- Deliverable.
- Criteri di accettazione.
- Dipendenze.
- Stato di avanzamento.

Crea e mantieni:

`PROGRESS.md`

Contiene:
- Fase corrente.
- Ultima attività completata.
- Commit di riferimento.
- File modificati.
- Test eseguiti.
- Problemi aperti.
- Prossima attività raccomandata.
- Eventuali modifiche non committate.
- Istruzioni per riprendere il lavoro.

## Gestione Git

Prima delle modifiche applicative:
- Verifica il branch corrente.
- Verifica lo stato del repository.
- Identifica il commit stabile.
- Crea una branch di lavoro dedicata quando appropriato.
- Non sovrascrivere modifiche non ancora salvate.

Durante lo sviluppo:
- Effettua commit piccoli e coerenti.
- Verifica i test prima dei commit significativi.
- Non accumulare grandi quantità di modifiche non registrate.
- Aggiorna `PROGRESS.md` al termine di ogni blocco significativo.

Al termine di ogni sottofase deve esistere un punto di ripristino verificabile.

---

# 5. GESTIONE DEI LIMITI DI CODEX

Il lavoro deve essere progettato per sopravvivere a eventuali interruzioni improvvise.

Regole:

1. Dividi le attività complesse in interventi autonomi.
2. Evita di modificare simultaneamente molti moduli senza test intermedi.
3. Conserva frequentemente il progresso su Git.
4. Non affidare informazioni critiche esclusivamente alla conversazione.
5. Registra le decisioni tecniche nei documenti del repository.
6. Non lasciare refactoring incompleti su branch considerate stabili.
7. Mantieni sempre un percorso di rollback.
8. Al riavvio di una sessione, leggi `PROGRESS.md` e `docs/ROADMAP_PHASE5.md` prima di procedere.

---

# 6. QUALITY GATES

Ogni sottofase deve superare controlli di qualità prima di essere dichiarata completata.

I controlli applicabili comprendono:

- Compilazione riuscita.
- Test automatici superati.
- Nessuna nuova regressione nota.
- Documentazione aggiornata.
- Nessuna modifica non autorizzata ad altri repository.
- Nessuna alterazione immotivata del tracciato.
- Nessun asset mancante.
- Nessuna vulnerabilità critica nota introdotta.
- Commit identificabile.
- Stato aggiornato in `PROGRESS.md`.

Non dichiarare superato un test non effettivamente eseguito.

Distingui sempre:
- Verificato automaticamente.
- Verificato manualmente.
- Ispezionato nel codice.
- Non verificato.

---

# 7. GOVERNANCE DELLE FASI

Le sottofasi devono essere eseguite separatamente.

**Non iniziare la sottofase successiva senza una nuova istruzione esplicita dell'utente.**

L'ordine previsto è:

5A → 5B → 5C → 5D → 5E

Eventuali modifiche all'ordine devono essere motivate da dipendenze tecniche o vulnerabilità urgenti.

Se durante una sottofase viene identificata una vulnerabilità critica, documentala immediatamente e raccomanda la mitigazione appropriata. Non introdurre modifiche applicative fuori ambito senza autorizzazione, salvo interventi strettamente necessari a evitare un danno immediato e consentiti dall'ambiente.

---

# 8. ISTRUZIONE OPERATIVA PER LA PROSSIMA SESSIONE

**Avvia esclusivamente la Fase 5A.**

Sequenza:

1. Recupera lo stato effettivo del repository.
2. Leggi la documentazione disponibile.
3. Identifica il commit stabile più recente.
4. Esegui l'audit completo.
5. Esegui controlli e test non distruttivi.
6. Crea `docs/ROADMAP_PHASE5.md`.
7. Crea `docs/ENGINEERING_AUDIT.md`.
8. Crea o aggiorna `PROGRESS.md`.
9. Registra la documentazione in un commit dedicato, se l'ambiente lo consente.
10. Produci il rapporto finale della Fase 5A.

Non modificare codice applicativo.

Non modificare il deployment.

Non iniziare la Fase 5B.

## Rapporto finale richiesto

Presenta:

- Stato reale del repository.
- Commit di riferimento.
- Problemi principali individuati.
- Rischi di cybersecurity.
- Problemi prestazionali.
- Opportunità di reengineering.
- Copertura dei test.
- Priorità degli interventi.
- Roadmap dettagliata per 5B–5E.
- Problemi bloccanti.
- Stato della documentazione.
- Commit conclusivo.

Concludi indicando il primo intervento raccomandato per la Fase 5B, senza eseguirlo.

---

# PRINCIPIO CONCLUSIVO

La Fase 5 deve trasformare SerieN da un prototipo funzionalmente ricco in un'applicazione software robusta, verificabile, efficiente e manutenibile.

**Prima la stabilità. Poi l'ottimizzazione. Infine le nuove funzionalità.**
