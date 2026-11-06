# Archivio storico E1-V / E1-V2

Archivio del 6 novembre 2026: 21 file della preparazione locale E1-V/E1-V2,
conservati integralmente, inclusi duplicati e tre log vuoti.
La struttura relativa a `docs/_active/train-persistence-auth/` è preservata.

Checkpoint precedente all’archiviazione: `c88ce237d4ece4a61ab08e50d4c14af50c34cf37`.
Gli stati BLOCKED/NOT VERIFIED nei documenti sono storici: E1 è stata poi
approvata dalla Regia **PASS OFFLINE** sul commit di verifica
`5bb447a0f614a5f68e26fcde73b19586c136d62b`,
[run CI 42139742357](https://github.com/epivic-lab/SerieN/actions/runs/42139742357).
Questo archivio non è una specifica attiva e non autorizza E2 o produzione.

`manifest-sha256.json` registra percorso originale, percorso archiviato,
SHA-256 e dimensione di ciascuno dei 21 file. README e manifest sono metadati
nuovi; gli originali archiviati non sono stati riscritti. I riferimenti relativi
interni restano quelli storici e alcuni possono puntare fuori dall’archivio.

Per recuperare un file, leggere il blob del percorso archiviato dal commit Git,
verificarne lo SHA-256 nel manifest e copiarlo nel percorso originale indicato,
solo dopo aver verificato che la destinazione sia libera. Non sovrascrivere
file esistenti. Gli hash storici si riferiscono ai checkpoint descritti nei file,
non necessariamente alla documentazione corrente.

Questi file non comprendono gli artifact della CI. Artifact e log CI richiedono
conservazione permanente separata prima della scadenza del 20 novembre 2026.
