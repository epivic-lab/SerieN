# Cache browser — proposta derivata da CACHE-1

## Obiettivo

Evitare il riscaricamento delle risorse statiche immutate; rilevare nuove release senza API server dedicata. Hosting GitHub Pages sotto `/SerieN/`. Nessuna modifica a geometria, dinamica, camera, UI, gestione treni, database o autorizzazioni. Nessuna promessa di simulazione offline: accesso verificato online come oggi.

## Strategia proposta, non ancora implementata

1. Manifest di build deterministico (versione di release, URL relativo, SHA-256, dimensione) per l'effettiva chiusura delle dipendenze pubbliche. Chiavi basate sul contenuto; evitare query version fisse usate come unica invalidazione.
2. Service worker con scope `/SerieN/`, cache esplicite con prefisso esclusivo SerieN. App shell coerente per release. Manifest/controllo aggiornamento richiedono revalidazione di rete, non risposta indefinitamente cache-first.
3. Scenario su richiesta: dataset, asset-lock, optimized-lock, soli moduli scelti da loadV06Scene (11 ottimizzati e technical_reference originale). Non precache dei 561 MiB di assets, non originali duplicati, railway_visual escluso come nel loader corrente.
4. UI: HTML, CSS realmente collegati, bundle, moduli statici del gate; font/texture e miniature effettivamente usati, piano SVG. BR01 e Kenney scaricati e conservati solo al primo utilizzo. Nessun prefetch di archivi o documenti di sviluppo, PDF e modelli non usati.
5. Ogni nuovo file deve essere valido prima di salvarlo (HTTP 200, origine/percorso consentiti, dimensione/hash). Le verifiche SHA-256 già nel loader restano operative anche per byte provenienti dalla cache. Non conservare errori, redirect opachi o risposte parziali.
6. Un aggiornamento scarica solo gli hash mancanti. Riutilizza i byte invariati e prepara una versione completa prima dell'attivazione. In caso di errore conserva la precedente versione coerente; non mescolare dataset/lock/bundle di release diverse.
7. Nessun reload durante una simulazione. Attivazione alla successiva apertura sicura o dopo conferma esplicita dell'utente; tab contemporanee restano coerenti con la propria release. Pulizia solo dei file SerieN non più referenziati dalle release ancora utilizzate. Evitare skipWaiting/clients.claim indiscriminati.
8. Quote: gestione QuotaExceededError e cache eliminate dal browser, fallback alla rete, limite/evizione selettiva; niente dipendenza funzionale dalla persistenza. I moduli grandi e l'eventuale doppia copia in aggiornamento richiedono prove dedicate.
9. Eventuale comando «Svuota cache delle risorse» limitato alle cache SerieN: preservare progetti e sessioni, non cancellare indiscriminatamente localStorage/IndexedDB. Un reset globale della cache a ogni deploy vanificherebbe il risparmio.

## Esclusioni di sicurezza

Non intercettare API/Auth/OAuth, risposte autenticate, POST o origini esterne; non memorizzare token o dati utente. Le dipendenze esterne di autenticazione restano fuori dal nuovo caching. Disponibilità dei file offline non equivale a permesso d'accesso. Nessun cambiamento Supabase o controllo d'accesso richiesto. Cache solo di risorse statiche pubbliche esplicitamente elencate.

## Gate futuri (da autorizzare per singola sottofase)

- CACHE-1R: chiarire/chiudere la riproducibilità della baseline, fermarsi.
- CACHE-2: implementazione con test cold/warm, revisione selettiva, hash errato, errore rete/quota, due tab, sottopercorso Pages, rimozione cache senza perdita dati, auth invariata e regressioni pertinenti. Checkpoint sul branch dedicato, STOP.
- Integrazione e pubblicazione restano soggette ad autorizzazione separata; solo allora verifica sul sito pubblico di un aggiornamento reale.

Misura di successo proposta: seconda visita senza riscaricare i GLB invariati quando lo storage è disponibile; aggiornamento di una risorsa con download limitato a quella e ai metadati necessari. Misurare separatamente rete, hash, parsing GLB, costruzione della scena e caricamento GPU.
