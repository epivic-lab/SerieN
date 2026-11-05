# SerieN — Requisiti di prodotto e architettura permanenti

**Decisione dell'utente: 5 novembre 2026.** Questo documento è la fonte persistente dei requisiti di prodotto, valida anche dopo la chiusura delle microfasi Train Management. La Regia deve leggerlo prima di autorizzare cambiamenti di autenticazione, persistenza o monetizzazione. I requisiti *futuri* sono vincoli di progettazione, non autorizzazioni ad implementarli subito.

## Principio guida
- Semplicità e robustezza: usare componenti native e collaudate prima di sviluppare infrastruttura proprietaria. Il codice e i test devono essere proporzionati al rischio. No sovraingegnerizzazione, senza sacrificare sicurezza o integrità.
- Simulatore pubblico web accessibile con un normale browser compatibile, senza software da installare e senza alcun processo sul Mac dell'utente.
- Frontend statico su GitHub Pages; backend sul progetto Supabase SerieN esistente. Preferire il piano Free e **0 euro di costi ricorrenti obbligatori**; nessun hosting esterno permanente, acquisto, add-on, staging separato o upgrade senza autorizzazione espressa.
- Sviluppo e test locali ammessi; funzionamento degli utenti finali interamente cloud/browser. Produzione diretta ammessa solo con verifica pre-deploy, protezione dei dati, backup verificato, migrazioni minimali, gate della Regia e approvazione delle specifiche scritture.

## Requisito futuro P-AUTH — applicazione dietro login
- Obiettivo di prodotto: accesso all'app tramite login, **solo social/OAuth** (ad es. Google e, quando fattibile, Apple); niente password o registrazione tradizionale gestite da SerieN.
- Identità stabile e indipendente dal provider social usato. Un account deve poter recuperare lo stesso ambiente su browser/dispositivi diversi; provider linking da progettare e validare, senza attribuzioni basate su email non verificata.
- Minimizzare i dati personali: nelle tabelle applicative non duplicare nomi, email, avatar o profili del provider. Usare un identificativo UUID pseudonimo e i soli dati strettamente necessari a diritti e stato. Supabase Auth e il processore pagamenti possono conservare dati personali nei propri sistemi: **non promettere anonimato assoluto o assenza totale di dati personali**.
- L'app oggi può restare pubblicamente fruibile: **non attivare ora un blocco login senza fase e approvazione specifiche**. Un prototipo Auth anonima è soltanto un possibile mezzo di confronto, non la decisione definitiva di prodotto.

## Requisito futuro P-PAY — paywall e subscription
- Architettura compatibile con almeno un livello gratuito e futuri piani a pagamento, con funzioni e quote differenziabili senza cambiare identità o salvataggi.
- Autorizzazioni/entitlement determinati **lato server** e associati all'identificativo utente; non fidarsi di flag JavaScript, localStorage, JWT stantii o metadata modificabili dall'utente.
- Separare dati ferroviari, identità, stato dell'abbonamento e provider di pagamento. Un processore esterno gestirà eventuali pagamenti, fatture e dati carta; il DB SerieN conserva solo riferimenti e stato indispensabili. Webhook verificati/idempotenti se attivati.
- Un abbonamento scaduto non cancella automaticamente i dati ferroviari: limitare l'accesso alle funzioni previste, conservare lo storico secondo regole future esplicite. Non introdurre paywall o pagamenti ora.
- Poiché il codice frontend su GitHub Pages è pubblico, una funzione realmente premium deve essere protetta dalle verifiche server, non soltanto nascosta nell'interfaccia.

## Requisito futuro P-MULTI — multiutenza simultanea e persistenza privata
- Ogni account ha uno o più workspace ferroviari identificati stabilmente; **tutti** i treni, composizioni, ordine/orientamento, posizioni, inventario, scambi, stato operativo, Journey, missioni, preferenze e storico revisioni sono associati al workspace e a un proprietario o membership autorizzata.
- Più utenti differenti possono usare contemporaneamente il simulatore senza interferire: isolation RLS e autorizzazione verificata a ogni accesso, nessuna lettura/scrittura trasversale, no UUID indovinabile come autorizzazione.
- Lo stesso utente può usare più dispositivi/browser. Gestire modifiche concorrenti tramite revisioni/CAS, ricevute idempotenti e risoluzione esplicita dei conflitti; niente sovrascritture silenziose o last-write-wins non autorizzato.
- Save/restore deve coprire lo stato reale del simulatore, non soltanto fixture sintetiche. Snapshot e receipt confermati conservano integrità e coerenza, incluse le revisioni storiche.
- Multiutenza simultanea **non significa** che servano collaborazione real-time o simulazione server-side condivisa: ogni browser esegue localmente la propria simulazione; server conserva e autorizza i dati. Condivisione di workspace/ruoli è un'estensione possibile, non un obbligo immediato.

## Implicazioni per decisioni tecniche
- Disegnare associazione account ↔ membership ↔ workspace distinta da identità OAuth e tabelle di salvataggio, così l'aggiunta di social login e paywall non obbliga a riscrivere le revisioni.
- D09 (principal SQL per device), D10 (ownerless/no nuovi Auth) e la proposta 6A.12-R W sono decisioni storiche o in revisione, **non motivi per impedire i nuovi requisiti**. Qualunque loro modifica richiede decisione esplicita della Regia, preservazione degli invarianti utili (RLS, CAS, idempotenza, storico e sicurezza) e migrazioni controllate.
- Preferire Auth sociale Supabase + RLS/RPC nativi se sufficienti; evitare broker, HMAC/attestazioni custom, ruoli SQL per device, orchestratori e secret manager esterni senza necessità dimostrata.
- Ogni modifica di prodotto deve distinguere: (a) compatibilità futura da preparare ora; (b) implementazione autorizzata in una microfase; (c) messa in produzione autorizzata separatamente.
- Macrofase 6A e 6B+ non si chiudono per l'esistenza di questa specifica. Baseline ferroviaria R1, geometria, simulazione e interfacce approvate rimangono congelate finché non esplicitamente autorizzate.

## Stato al momento della decisione
- **P-AUTH, P-PAY e P-MULTI sono requisiti futuri approvati come vincoli; implementazione NON autorizzata.**
- **Codex 6A.12-S1 in PAUSA** per riallineamento dell'architettura: non proseguire con un sistema anonimo o ownerless definitivo prima di aver recepito il login sociale futuro.
- Nessun commit di codice, migrazione, login, paywall o modifica Supabase è autorizzato da questa decisione.
