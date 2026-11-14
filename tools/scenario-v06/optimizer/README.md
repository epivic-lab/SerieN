# Derivati V06, toolchain solo offline

Dalla root del repository, Node 22:

```sh
npm ci --prefix tools/scenario-v06/optimizer
npm run build --prefix tools/scenario-v06/optimizer
python3 tools/scenario-v06/check-local-assets.py --require-complete
```

Il lockfile fissa glTF Transform 4.2.1 e meshoptimizer 0.23.0. Queste dipendenze
non appartengono al package dell'app, non entrano nel bundle e non sono decoder
richiesti dal browser. La rigenerazione finale è stata ripetuta: inventario e
SHA di tutti i derivati identici. Il pin runtime è
`V06_OPTIMIZED_LOCK_SHA256` in `src/scenario-v06-scene.js`.

Il builder legge e verifica gli originali contro l'inventario immutato; scrive
solo `assets/scenario-v06/optimized/*.glb` e `optimized-lock.json`. Non usa il
GLB ferroviario né il riferimento tecnico. Per ogni modulo registra triangoli,
byte, opzioni, hash sorgente/derivato, ingombri e verifica matrici dei nodi e
attributi delle istanze invariati. Il cambio di ingombro oltre 1 mm interrompe
la generazione; il massimo osservato è 0,6592 mm sulle rocce.

La semplificazione è limitata dall'errore, quindi non forza tutti i moduli al
5% nominale. Terreno, montagna, portali e stazione bloccano i bordi e conservano
esattamente gli ingombri; nessuna traslazione/scala correttiva. I moduli
decorativi usano tolleranze locali registrate nell'inventario. Dedup/prune
eliminano solo dati ridondanti/non referenziati. Materiali e texture restano
quelli originali; High li usa con tutte le istanze. Low usa Lambert, il 30%
distribuito delle istanze decorative anche nei gruppi piccoli e nasconde i
ciuffi d'erba, mantenendo il terreno texturizzato. Gli oggetti per il picking
non vengono spostati o sostituiti con proxy.

L'inventario ottimizzato è verificato tramite pin prima di leggere i suoi URL;
ogni modulo è poi verificato per dimensione e SHA prima del parse. Non esiste
fallback silenzioso verso un asset diverso. Le immagini comparative e la prova
di rigenerazione sono in `docs/_active/scenario-v06/evidence/V06_FINALIZE/`.
