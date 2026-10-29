# SERIEN — FASE 5D
## Performance Engineering, Profiling & Deep Optimization

**Repository autorizzato:** `epivic-lab/SerieN`  
**Fase corrente:** 5D — Ottimizzazione delle prestazioni  
**Prerequisiti:** Fasi 5A, 5B e 5C completate.

## 1. MISSIONE

SerieN Autumn Railways è un simulatore ferroviario tridimensionale in scala N (1:160), con tracciato Kato Unitrack, tre anelli concentrici, quattro tronchini, runaround, scambi e crossover, locomotive e rotabili animati, scenografia autunnale, consolle di guida dinamiche, minimappe e Next Switch HUD.

Dopo l'audit tecnico, il refactoring architetturale e la verifica dei comportamenti ferroviari, voglio affrontare un'ottimizzazione profonda e professionale delle prestazioni.

**Non voglio una semplice pulizia del codice. Voglio un vero intervento di performance engineering, guidato da misurazioni verificabili.**

Obiettivi:

1. Migliorare la fluidità del rendering 3D.
2. Ridurre il consumo di CPU e GPU.
3. Ridurre allocazioni inutili e possibili perdite di memoria.
4. Ottimizzare l'esecuzione della simulazione ferroviaria.
5. Migliorare la reattività dell'interfaccia.
6. Ottimizzare il caricamento e la gestione degli asset.
7. Ridurre i rallentamenti durante l'esecuzione simultanea di più convogli.
8. Garantire prestazioni stabili anche durante sessioni prolungate.
9. Preservare integralmente qualità visiva e funzionalità.

Non aggiungere nuove funzionalità estranee a questi obiettivi.

---

## 2. VERIFICA DELLO STATO INIZIALE

Prima di modificare il codice:

- Leggi `docs/ROADMAP_PHASE5.md`, `PROGRESS.md` e i report delle fasi precedenti, se presenti.
- Verifica lo stato Git, il branch e l'ultimo commit.
- Identifica le modifiche non committate.
- Verifica che la Fase 5C sia effettivamente integrata nel codice corrente.
- Esegui build e test disponibili.
- Identifica le principali componenti dell'architettura.

Non sovrascrivere modifiche preesistenti e non ripetere genericamente i refactoring della Fase 5B.

Crea un checkpoint Git recuperabile prima degli interventi significativi, evitando commit vuoti.

Se mancano strumenti di misurazione, predisponi un sistema leggero e ripetibile di profiling, senza introdurre dipendenze pesanti non necessarie.

---

## 3. BASELINE PRESTAZIONALE OBBLIGATORIA

**Misura le prestazioni prima di ottimizzare.**

Utilizza il browser e gli strumenti di profiling disponibili nell'ambiente.

Definisci scenari ripetibili:

**Scenario A — Idle**
- Plastico completamente caricato.
- Nessun convoglio in movimento.
- Rendering e interfaccia attivi.

**Scenario B — Single Train**
- Una locomotiva in movimento continuo.
- Scenografia e rendering attivi.
- Consolle e minimappa aggiornate.

**Scenario C — Three Trains**
- Tre convogli contemporaneamente in movimento.
- Tre consolle dinamiche.
- Minimap e Next Switch HUD attivi.
- Gestione degli scambi secondo la logica già validata.

**Scenario D — Intensive Operations**
- Tre convogli e ulteriori rotabili presenti.
- Interazioni con consolle e scambi.
- Operazioni ferroviarie supportate dal sistema.
- Variazioni di velocità e direzione.

**Scenario E — Graphics Stress**
- Qualità grafica più elevata disponibile.
- Illuminazione diurna e notturna.
- Scena completa e rotabili visibili.
- Inquadrature differenti.

**Scenario F — Extended Session**
- Simulazione prolungata.
- Osservazione della memoria.
- Verifica di rallentamenti progressivi.
- Verifica di risorse non rilasciate.

Misura, dove tecnicamente disponibile:

- FPS medi.
- Frame time medio e al 95° percentile.
- Picchi di frame time e stuttering.
- Tempo di esecuzione del ciclo di simulazione.
- Draw calls.
- Triangoli renderizzati.
- Memoria JavaScript.
- Geometrie e texture residenti.
- Tempi di caricamento.
- Dimensione del bundle.
- Eventuali long task del thread principale.

Registra browser, sistema operativo, risoluzione, device pixel ratio, qualità grafica, durata delle acquisizioni e condizioni di prova.

Ripeti i benchmark nelle stesse condizioni per il confronto prima/dopo, con un numero di campioni adeguato.

Distingui sempre le misure reali dalle stime. Le statistiche `renderer.info.memory` non rappresentano necessariamente l'effettivo consumo di memoria GPU.

Se alcuni strumenti non sono disponibili, segnala esplicitamente quali metriche non hai potuto rilevare.

Produci una tabella iniziale delle prestazioni.

---

## 4. AUDIT DEL RENDERING 3D

Analizza il rendering effettivamente utilizzato da SerieN, inclusi Three.js e WebGL.

Verifica:

- Frequenza e organizzazione del render loop.
- Utilizzo di `requestAnimationFrame`.
- Aggiornamento della camera.
- Aggiornamento delle trasformazioni.
- Calcolo delle matrici.
- Gestione delle luci e delle ombre.
- Materiali e shader.
- Numero di draw calls.
- Geometrie duplicate.
- Possibilità di condivisione di geometrie e materiali.
- Opportunità di instancing.
- Frustum culling.
- Livelli di dettaglio, dove realmente utili.
- Trasparenze e overdraw.
- Creazione e distruzione di risorse WebGL.
- Operazioni ripetute inutilmente a ogni frame.

Presta particolare attenzione a:

- Alberi della scenografia autunnale.
- Vegetazione.
- Edifici.
- Ballast e binari.
- Elementi decorativi.
- Materiale rotabile.
- Ombre.
- Illuminazione ambientale.

**Preserva il livello di dettaglio visibile e l'aspetto della scena.**

Non disattivare ombre, semplificare pesantemente gli alberi o ridurre indiscriminatamente le texture per ottenere benchmark migliori.

Privilegia ottimizzazioni strutturali rispetto a compromessi estetici.

---

## 5. MATERIALE ROTABILE E ANIMAZIONI

La Fase 4 ha introdotto miglioramenti ai modelli e alle animazioni delle locomotive e dei vagoni.

Verifica:

- Aggiornamento delle ruote.
- Animazione del biellismo delle locomotive a vapore.
- Trasformazioni dei carrelli.
- Orientamento sui binari.
- Posizionamento dei vagoni.
- Calcolo delle distanze.
- Aggiornamento delle composizioni.
- Gestione dei modelli non visibili.
- Riutilizzo delle geometrie.
- Gestione delle texture.

Individua e rimuovi allocazioni ripetute non necessarie durante l'animazione.

Valuta il riutilizzo di vettori, matrici, quaternioni e strutture temporanee, ma soltanto dove esiste un beneficio concreto.

Non alterare il comportamento cinematico già validato.

---

## 6. MOTORE DI SIMULAZIONE FERROVIARIA

Analizza i costi computazionali della simulazione.

Verifica:

- Aggiornamento delle posizioni.
- Ricerca dei segmenti ferroviari.
- Instradamenti nel grafo.
- Calcolo delle distanze lungo il tracciato.
- Ricerca del prossimo scambio.
- Gestione dell'occupazione.
- Rilevamento dei conflitti.
- Calcolo della posizione dei vagoni.
- Aggiornamento dello stato dei convogli.

Cerca calcoli ridondanti, attraversamenti inutili del grafo e ricostruzioni ripetute di dati che potrebbero essere memorizzati.

Valuta caching, precomputazione e indicizzazione soltanto quando appropriati.

**La topologia del tracciato è una fonte di verità canonica.**

Non semplificare la geometria e non utilizzare approssimazioni euclidee quando è necessaria una distanza ferroviaria lungo il grafo.

Mantieni determinismo e coerenza della simulazione anche quando gli FPS variano.

Se necessario, valuta la separazione del passo logico della simulazione dalla frequenza di rendering, documentando accuratamente le implicazioni.

---

## 7. INTERFACCIA E CONSOLLE

Analizza:

- Tre consolle dinamiche.
- Controlli di velocità.
- Selezione delle locomotive.
- Minimap ferroviarie.
- Posizioni dei convogli.
- Next Switch HUD.
- Pannello scambi.
- Indicatori di stato.
- Aggiornamento delle miniature.

Verifica:

- Manipolazioni DOM ripetute.
- Event listener duplicati.
- Render UI non necessari.
- Aggiornamenti troppo frequenti.
- Ricalcolo delle minimappe.
- Gestione dello stato condiviso.
- Sincronizzazione fra motore e interfaccia.

Riduci il lavoro superfluo senza introdurre ritardi percepibili nei comandi.

La risposta a STOP, STOP ALL, inversioni e comandi critici deve rimanere immediata rispetto ai limiti del sistema.

---

## 8. ASSET, CARICAMENTO E MEMORIA

Analizza:

- Dimensione e struttura del bundle.
- Caricamento delle texture.
- Modelli 3D.
- Materiali.
- Immagini delle locomotive.
- Asset scenografici.
- Cache.
- Risorse temporanee.
- Rilascio della memoria.
- Eventuali listener e riferimenti persistenti non necessari.

Valuta:

- Lazy loading quando appropriato.
- Precaricamento delle risorse critiche.
- Compressione e ottimizzazione degli asset.
- Riutilizzo dei materiali.
- Eliminazione delle risorse duplicate.
- Migliore gestione delle fasi di inizializzazione.
- Riduzione del JavaScript iniziale, se misurabilmente utile.

Non introdurre caricamenti tardivi che provochino scatti quando entra in scena una locomotiva o viene aperta una consolle.

---

## 9. MODALITÀ DI ESECUZIONE

Organizza gli interventi in piccoli blocchi indipendenti.

Ordine raccomandato:

**5D.1 — Profiling e baseline**
Misurazioni e individuazione dei colli di bottiglia.

**5D.2 — Rendering**
Ottimizzazioni WebGL e gestione della scena.

**5D.3 — Simulazione**
Ottimizzazione dei calcoli ferroviari e delle animazioni.

**5D.4 — Interfaccia**
Ottimizzazione delle consolle, minimappe e HUD.

**5D.5 — Asset e memoria**
Ottimizzazione del caricamento e gestione delle risorse.

**5D.6 — Benchmark finale e regressione**
Verifica quantitativa dei miglioramenti e della stabilità.

Questi blocchi appartengono alla medesima Fase 5D e possono essere eseguiti nella sessione corrente se le risorse lo consentono.

Non sacrificare la recuperabilità per completare tutto in una sola esecuzione.

Per ogni blocco:
1. Identifica il problema misurato.
2. Proponi la soluzione.
3. Implementa la modifica più circoscritta efficace.
4. Esegui i test pertinenti.
5. Confronta le prestazioni.
6. Registra il risultato.
7. Effettua un commit coerente.
8. Aggiorna `PROGRESS.md`.

Se un intervento non produce benefici misurabili, rivalutalo o ripristina la soluzione precedente.

Se emerge una reingegnerizzazione particolarmente invasiva, documenta vantaggi, rischi e piano di migrazione prima di procedere; non eseguirla automaticamente.

---

## 10. VINCOLI DI PROGETTO

Non modificare:

- Repository `first`.
- Repository `SerieN Control`.
- Geometria canonica del plastico.
- Tre anelli.
- Quattro tronchini.
- Runaround.
- Scambi e crossover.
- Logica ferroviaria validata dalla Fase 5C.
- Comportamento operativo dei treni.
- Funzioni delle consolle.
- Next Switch HUD.
- Configurazione scenografica senza gallerie.

Non eliminare dettagli visivi per ottenere artificialmente risultati prestazionali migliori.

Non aggiungere nuove funzionalità.

Non introdurre nuove dipendenze senza una motivazione tecnica verificabile.

Non alterare la versione pubblica senza le verifiche previste.

---

## 11. TEST DI REGRESSIONE

Al termine degli interventi verifica:

1. Build completa.
2. Suite di test esistente.
3. Corretto caricamento del plastico.
4. Tre convogli contemporanei.
5. Scambi e crossover.
6. Quattro tronchini e runaround.
7. Aggancio e sgancio.
8. Consolle dinamiche.
9. Minimap.
10. Next Switch HUD.
11. STOP e STOP ALL.
12. Qualità grafica diurna e notturna.
13. Animazioni di locomotive e vagoni.
14. Compatibilità con GitHub Pages.
15. Assenza di nuove perdite di memoria riscontrabili.

Le ottimizzazioni non devono introdurre regressioni funzionali.

Distingui sempre tra test automatici, manuali e verifiche non eseguibili nell'ambiente corrente.

---

## 12. DELIVERABLE

Crea:

`docs/PERFORMANCE_AUDIT_5D.md`

Deve contenere:

- Architettura e componenti analizzati.
- Profiling iniziale.
- Colli di bottiglia individuati.
- Interventi effettuati.
- Motivazioni tecniche.
- Benchmark prima/dopo.
- Miglioramenti effettivamente misurati.
- Eventuali regressioni.
- Problemi residui.
- Opportunità future.

Aggiorna:

`docs/ROADMAP_PHASE5.md`

`PROGRESS.md`

Mantieni commit frequenti e recuperabili.

Evita grandi modifiche non committate.

Non effettuare merge o deployment automatici non previsti dalle procedure del repository.

---

## 13. CRITERI DI COMPLETAMENTO

La Fase 5D può essere dichiarata completata soltanto se:

- Sono state raccolte misure prestazionali iniziali.
- Sono stati individuati i principali colli di bottiglia.
- Gli interventi sono stati verificati.
- È disponibile un confronto prima/dopo per le metriche effettivamente misurabili.
- Non risultano regressioni funzionali note introdotte.
- La qualità grafica è stata preservata.
- I test applicabili sono stati eseguiti.
- La documentazione è aggiornata.
- Le modifiche sono recuperabili tramite Git.

Se non è possibile dimostrare un miglioramento quantitativo per una particolare area, descrivi onestamente i limiti della verifica.

Non inventare valori di FPS, memoria o prestazioni.

---

## 14. RAPPORTO FINALE

Al termine produci una sintesi con:

1. Stato della Fase 5D.
2. Principali colli di bottiglia individuati.
3. Ottimizzazioni realizzate.
4. Risultati quantitativi prima/dopo.
5. Eventuali compromessi introdotti.
6. Test superati e non superati.
7. Problemi residui e rischi.
8. Commit conclusivo.
9. Stato della documentazione.
10. Valutazione della prontezza per la Fase 5E.

**Non avviare la Fase 5E.**

### Principio guida

Ottimizzare ciò che è realmente costoso, non ciò che appare complicato.

Una modifica tecnicamente elegante ma priva di benefici misurabili non è automaticamente un miglioramento.

L'obiettivo è rendere SerieN sensibilmente più fluido, reattivo, efficiente e robusto, mantenendo intatta l'esperienza ferroviaria e visiva costruita fino a oggi.

**Inizia la Fase 5D autonomamente, procedendo per interventi misurabili, testati e recuperabili.**