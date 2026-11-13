# Candidato V06 R0.1 — offline

`track.json` è un candidato geometrico/topologico di laboratorio, non un profilo runtime attivo. [Rapporto e blocco di fedeltà WX](../../R01_CONTINUITY_RESOLUTION_REPORT.md).

- 79 `pieces`, ID originali conservati, punti PLAN in mm; quota ferro 8,4 mm, scala N già applicata.
- `points` è il percorso completo S→E; `length_mm` viene ricalcolata. Per le quattro diagonali WX S→E rimane da destra a sinistra; `profile.primitives` descrive invece la costruzione da sinistra a destra.
- `from_node`/`to_node` rinviano a `junctions` con coordinate esattamente uguali; nessun alias metrico, nessun nodo nel diamond. I nodi non sono da soli autorizzazioni di transito.
- `unit`/`required_state` identificano i percorsi alternativi. Vietata la prosecuzione fra due percorsi consecutivi della stessa unit, compreso N07.C→B. Inversione e commutazione richiedono manovra sul comune, arresto e unit libera.
- Registro controller e truth table ereditano la proposta funzionale R0. Il dataset distingue i percorsi dagli aghi fisici, la cui geometria/attuazione resta mancante.
- `reconciliation` registra correzioni locali, supporti e tangenti; `profile` registra i fit WX non certificati. Le polilinee sorgente e tutti i dati di confronto sono in `../../evidence/R01/`.
- Gli intervalli nascosti sono preservati; i nove pezzi interessati non vengono esclusi dal grafo.
- Terminali: `20.S` e `43.S` con tampone, `51.S` fine aperta. Nessun anchor sicuro o capacità certificata è implicito nel raggiungimento del terminale.

Non importare questo file nel simulatore prima del gate Regia e dell'autorizzazione R1. La continuità candidata verificata non certifica profilo fisico WX, visuale, occupazione, collision prevention o dinamica del motore.
