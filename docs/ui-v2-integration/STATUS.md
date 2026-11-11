# UI V2.1 — Fase 0 / acquisizione Google Drive

**BLOCKED: connettore Drive accessibile, materializzazione nel workspace negata dalla policy di rete.**

Metadati e fetch raw del file `1lZ9zmhbh8HwDC1ILd5OqeKJCrV0fm2i8` PASS: `serien-codex-package-ui-v21.zip`, application/zip dichiarato, 36.752.894 byte. Il riferimento temporaneo su `sdmntprnortheu.oaiusercontent.com` restituisce HTTP 403; accesso diretto a `drive.google.com` fallisce CONNECT 403. Entrambi i domini mancano nell'allowlist enforced corrente. Nessun diniego dei permessi del file Drive osservato.

ZIP locale, CRC/checksum/manifest, contenuto tecnico/design e confronto dei contratti **NOT VERIFIED**. [Rapporto §12](REPORT.md), [evidenza](evidence/drive-acquisition/result.json).

Branch mantenuto `codex/ui-v2-integration`, checkpoint iniziale `e48dd96`; main `184cc9b`, M2/M3 `91722fb`, V1 invariati e verificati. Codice applicativo identico alla baseline, bundle/canonico invariati. Test non ripetuti come da mandato; risultati della precedente Fase 0 conservati con provenienza.

**Prossima azione:** autorizzare nelle impostazioni di rete il dominio di download del connettore e ripetere con link fresco, oppure rendere disponibili parti sotto 32 MiB. Poi completare l'audit. Nessuna modifica applicativa/merge/deploy; **STOP per la Regia**, implementazione non avviata.
