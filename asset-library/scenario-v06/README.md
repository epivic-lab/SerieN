# Originali V06 recuperati — integrazione ancora bloccata

Questa libreria conserva gli originali del pacchetto Drive
`SERIE_N_V3_SCENARIO_V06_V1`, senza modificarne geometria, texture o materiali.
Il lock separato contiene dimensioni e SHA-256 del manifest originale appena
recuperato il 14 novembre 2026. Nessun URL firmato o token è conservato.
La libreria non è importata dall'app e non è inclusa dalla ricetta Pages attuale.

Disponibili dodici originali (327.862.948 byte): undici moduli obbligatori e
technical_reference opzionale. Manca soltanto railway_service_buildings.glb
(36.688.380 byte); il nuovo riferimento usa sdmntprukwest.oaiusercontent.com,
ancora respinto dal proxy. La macchina corrente osserva ancora la revisione1
con la precedente lista Denmark/epivic-lab.github.io. Applicare la nuova regola
alla macchina in esecuzione; non basta aggiornare una configurazione futura.

Verifica dalla root del repository:

```sh
python3 tools/scenario-v06/check-local-assets.py
python3 tools/scenario-v06/check-local-assets.py --require-complete
```

Il secondo comando restituisce 2 finché mancano moduli indispensabili; un file
con header, dimensione o hash errati restituisce 1. La presenza di tutti i file
non costituisce ammissione al runtime o approvazione visuale. Gli originali
railway_visual richiedono la riconciliazione R02 prima di qualsiasi uso.

Il dominio dei riferimenti autenticati può cambiare a ogni acquisizione.
Riacquisire il link dopo lo sblocco; non riscriverne l'host.
