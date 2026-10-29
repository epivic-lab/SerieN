# SERIEN — FASE 4
## Audit, integrazione e sviluppo della fase successiva

### 0. Premessa obbligatoria

Stiamo riprendendo lo sviluppo di SerieN dopo il completamento della Fase 3.

Repository autorizzato: `epivic-lab/SerieN`.

**Non modificare i repository `first` e `SerieN Control`.**

Prima di iniziare, recupera dal repository, dai commit, dalla documentazione e dal contesto di lavoro disponibile la roadmap originale di SerieN.

Individua:
- La definizione originale della Fase 4.
- I risultati effettivi della Fase 3.
- Eventuali attività incomplete.
- Le dipendenze necessarie per iniziare la Fase 4.

Se esiste una definizione precedente della Fase 4, **rispettala come riferimento prioritario**. Non sostituirla con una nuova fase inventata.

Se non è recuperabile, utilizza il seguente piano proposto, documentando la scelta.

---

## 1. Obiettivo proposto della Fase 4

Portare il materiale rotabile di SerieN a un livello grafico e funzionale più realistico, coerente con l'ambientazione ferroviaria tedesca delle epoche III/IV.

Il simulatore deve mantenere la fedeltà al plastico reale e al tracciato RailModeller.

La Fase 4 dovrà migliorare:

1. Qualità tridimensionale delle locomotive.
2. Qualità di carri merci e carrozze.
3. Animazioni di ruote, carrelli e biellismi.
4. Composizione e scomposizione dei convogli.
5. Corretto movimento del materiale rotabile sui binari.
6. Coerenza delle miniature nelle tre consolle.
7. Prestazioni grafiche e gestione degli asset.

## 2. Audit iniziale

Esamina tutti i modelli di materiale rotabile già presenti nel simulatore.

Per ciascuno documenta:
- Identificativo e prototipo rappresentato.
- Sorgente del modello.
- Formato dei file.
- Numero di triangoli e dimensioni delle texture, quando ricavabili.
- Qualità della geometria.
- Materiali e texture.
- Struttura delle animazioni.
- Corretto orientamento e dimensionamento.
- Compatibilità con il sistema di movimento ferroviario.
- Licenza di utilizzo.

Non sostituire modelli validi senza un miglioramento concreto e verificabile.

## 3. Locomotive prioritarie

Privilegia questi modelli:

**BR 055 — Locomotiva a vapore**
- Sagoma fedele al prototipo.
- Caldaia, fumaiolo, cabina e tender corretti.
- Ruote motrici e bielle visibili.
- Animazione sincronizzata con la velocità.
- Livrea coerente con la DB di epoca III.

**BR 260 / V60 — Diesel da manovra**
- Proporzioni realistiche.
- Cabina decentrata.
- Ruote e trasmissione coerenti con il prototipo.
- Livrea adeguata all'ambientazione.
- Comportamento credibile alle basse velocità.

**Altre locomotive**
- Mantieni tutti gli altri modelli già funzionanti.
- Predisponi un catalogo estendibile a BR 44, BR 212, BR 232 e altre locomotive future.
- Non aggiungere modelli privi di una licenza compatibile con il repository.

Non utilizzare un modello genericamente somigliante attribuendogli un'identità storica inesatta.

## 4. Vagoni e carrozze

Realizza o integra materiale rotabile coerente con le locomotive:

- Carri merci chiusi.
- Carri aperti.
- Carri cisterna.
- Carri pianale.
- Carrozze passeggeri DB delle epoche III/IV.

Utilizza lunghezze in scala coerenti con i prototipi.

Ogni elemento deve possedere un identificativo, una lunghezza reale in millimetri nel modello 1:160 e punti di aggancio coerenti.

Le composizioni devono essere rappresentate correttamente anche nelle curve strette del plastico.

## 5. Animazione e movimento

Il movimento delle locomotive deve dipendere dalla geometria ferroviaria canonica.

Verifica:
- Allineamento al centro del binario.
- Orientamento corretto lungo le curve.
- Rotazione dei carrelli quando presenti.
- Rotazione delle ruote in funzione della distanza percorsa.
- Animazione dei biellismi sulle locomotive a vapore, quando supportata dal modello.
- Distanza corretta fra locomotive e vagoni.
- Assenza di salti durante il passaggio sugli scambi.
- Assenza di compenetrazioni visive nelle curve.

Non usare animazioni puramente decorative scollegate dal movimento effettivo.

## 6. Aggancio e sgancio

Consolida il sistema di composizione dei convogli.

I comandi di aggancio e sgancio devono:
- Agire sui rotabili effettivamente presenti.
- Mantenere le corrette posizioni sul tracciato.
- Aggiornare la composizione nella consolle.
- Rispettare la direzione e la distanza fra i mezzi.
- Evitare duplicazioni o scomparsa di vagoni.
- Consentire manovre realistiche nei quattro tronchini e nel runaround.

Le operazioni devono essere verificabili tramite test.

## 7. Integrazione nell'interfaccia

Le tre consolle dinamiche devono mostrare miniature coerenti con i modelli effettivi.

Prevedi:
- Miniatura riconoscibile della locomotiva.
- Nome e tipologia.
- Numero di rotabili agganciati.
- Lunghezza complessiva del convoglio, quando determinabile.
- Stato operativo.
- Minimappa sincronizzata con la posizione del locomotore.

Non modificare l'architettura generale dell'interfaccia, salvo miglioramenti strettamente necessari.

Mantieni il Next Switch HUD collegato al grafo ferroviario già validato.

## 8. Prestazioni

Ottimizza la visualizzazione senza impoverire eccessivamente i modelli principali.

Valuta:
- Geometrie alleggerite.
- Livelli di dettaglio.
- Texture compresse.
- Condivisione dei materiali.
- Caricamento asincrono.
- Caching delle miniature.
- Eliminazione di risorse GPU inutilizzate.

La presenza contemporanea di più locomotive e carri non deve causare rallentamenti eccessivi.

## 9. Vincoli fondamentali

- Non alterare la geometria del tracciato RailModeller.
- Non ricostruire arbitrariamente gli scambi.
- Non modificare i tre anelli, quattro tronchini o il runaround.
- Non introdurre gallerie.
- Non interrompere le funzionalità operative esistenti.
- Non utilizzare asset esterni senza aver verificato e documentato la licenza.
- Non modificare altri repository.
- Non presentare placeholder come modelli definitivi.

## 10. Collaudo

Esegui test per verificare:

1. Tre convogli in movimento simultaneo.
2. Corretta animazione delle locomotive.
3. Movimento nei due sensi di marcia.
4. Curve e scambi.
5. Aggancio e sgancio.
6. Manovre nel runaround.
7. Composizioni di lunghezza differente.
8. Aggiornamento delle tre consolle.
9. Funzionamento del Next Switch HUD.
10. Prestazioni desktop.
11. Assenza di errori bloccanti nel browser.
12. Corretto caricamento degli asset su GitHub Pages.

Distingui i test effettivamente eseguiti dalle funzionalità soltanto ispezionate nel codice.

## 11. Consegna della Fase 4

Al completamento:

- Verifica che il progetto compili.
- Esegui i test disponibili.
- Registra le modifiche in commit ordinati.
- Aggiorna la documentazione.
- Pubblica attraverso il workflow esistente, se previsto e autorizzato.
- Produci un report conclusivo.

Il report deve comprendere:
- Funzionalità completate.
- Materiale rotabile integrato o modificato.
- Asset e relative licenze.
- Test superati e non superati.
- Problemi residui.
- Commit finale.
- Stato della Fase 4 rispetto alla roadmap originale.

**Procedi autonomamente con le attività che rientrano nella Fase 4 effettiva del progetto, preservando il lavoro precedente. Non considerare completate funzionalità che non sono state collaudate.**

Obiettivo: rendere SerieN un simulatore ferroviario sempre più fedele, curato e credibile, senza compromettere la stabilità raggiunta nelle fasi precedenti.