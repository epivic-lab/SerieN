# Originali V06 recuperati — integrazione ancora bloccata

Questa libreria conserva gli originali del pacchetto Drive
`SERIE_N_V3_SCENARIO_V06_V1`, senza modificarne geometria, texture o materiali.
Il lock separato contiene dimensioni e SHA-256 del manifest originale appena
recuperato il 14 novembre 2026. Nessun URL firmato o token è conservato.
La libreria non è importata dall'app e non è inclusa dalla ricetta Pages attuale.

Disponibili nove moduli (196.026.628 byte), inclusi terreno e segheria che erano
bloccati nella ripresa precedente. Mancano villaggio, edifici ferroviari e
railway_visual; technical_reference è opzionale e assente. La cache del task
precedente non era presente: i nove file attuali non coincidono con i nove
elencati nel rapporto del 13 novembre. Non sommare i due inventari.

Verifica dalla root del repository:

```sh
python3 tools/scenario-v06/check-local-assets.py
python3 tools/scenario-v06/check-local-assets.py --require-complete
```

Il secondo comando restituisce 2 finché mancano moduli indispensabili; un file
con header, dimensione o hash errati restituisce 1. La presenza di tutti i file
non costituisce ammissione al runtime o approvazione visuale. Gli originali
railway_visual richiedono la riconciliazione R02 prima di qualsiasi uso.

I riferimenti correnti dei tre moduli indispensabili mancanti usano
`sdmntprnortheu.oaiusercontent.com`, negato dal proxy 403. I link vanno
riacquisiti da Drive dopo lo sblocco; non riscriverne l'host.
