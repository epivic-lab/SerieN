# SerieN · Autumn Railways

Gioco ferroviario web per il plastico Kato Unitrack scala N dell'utente, sviluppato come progetto autonomo. **Non modifica e non dipende da [First](https://github.com/epivic-lab/first).**

**[▶ Apri SerieN](https://epivic-lab.github.io/SerieN/)**

## v0.2 — Ricostruzione tridimensionale

- Vista 3D volumetrica con telecamera orbitale, paesaggio autunnale, alberi, edifici, massicciata, traverse, rotaie, treni e luce regolabile.
- Interfaccia di guida **orizzontale sotto il plastico**: selezione BR 055, BR 216 e BR 260, velocità indipendente, direzione, stop, luci e composizione dei carri.
- Tre anelli con raggi nominali R249, R282 e R315.
- Quattro tronchini (tre sul lato sinistro, uno a destra) e **runaround lungo**, composto da **due percorsi raccordati alle estremità**, con punti di instradamento.
- Due WX310 e comandi degli scambi del fascio merci, azionabili sia dalla mappa 3D sia dalla barra laterale.
- Quattro missioni introduttive, tra cui una dedicata al runaround.
- Gioco statico pubblicabile su GitHub Pages, senza backend.

## Limiti e prossimi passi

**La geometria 3D e l'instradamento dei binari di manovra sono approssimazioni del layout originale, non ancora una conversione CAD esatta del file RailModeller.** In particolare, il runaround è ora presente con entrambi i raccordi ma tutti gli itinerari, gli incroci e la logica di aggancio ferroviaria restano da validare contro la planimetria. Non dichiarare simulazione 1:1.

La resa grafica è una base procedurale Three.js, **non ancora paragonabile per ricchezza a un titolo commerciale come Train Station 3**. Per avvicinarla all'obiettivo servono modelli e texture 3D dedicati, illuminazione/ombre curate, animazioni e una rete topologica tratta dal layout reale.

Le risorse Three.js sono caricate da jsDelivr quando il browser è connesso a Internet.

## Vedere la precedente versione

[Prototipo originale v0.1](./legacy-v0.1.html) (salvato prima della revisione).

## Deploy

Il workflow GitHub Actions distribuisce automaticamente il branch \`main\` su GitHub Pages. Non è necessario compilare nulla.

## Indipendenza da Z21

Non si collega né invia comandi alla Z21 fisica. È una simulazione per sperimentare la guida e immaginare le missioni.

© Progetto amatoriale indipendente, senza affiliazione a Kato, Roco o ai titoli videoludici citati come riferimenti stilistici.
