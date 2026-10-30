# 5D.5 — Ritenzione Bloom riprodotta e corretta

I cicli memoria hanno motivato una verifica separata della proprietà dei materiali, oltre ai contatori di texture/geometrie. Three r163 conserva gli ShaderMaterial usati in `WebGLShaderCache.materialCache`, una Map con riferimenti forti; `UnrealBloomPass.dispose()` non rilascia `materialHighPassFilter`.

## Prova effettiva, non sola lettura del codice

Sonda browser con cache reale esposta solo nel bundle diagnostico. Dopo tre sequenze Cinema → Low, senza correzione i materiali HighPass ancora registrati sono **1, 2, 3**. Il test Node con UnrealBloomPass e WebGLShaderCache reali fallisce nello stesso modo: un proprietario resta invece di zero.

Il rilascio centralizzato in `disposePresentationPass` conserva i cleanup SSAO/noise già presenti e aggiunge il materiale Bloom omesso dalla libreria. Dopo la correzione la sonda browser restituisce **0, 0, 0**; il test Node passa. I tre riferimenti precedenti condividevano un programma: i programmi GPU residenti dopo Low passano da 54 a 53 in questa fixture. Non è una misura di byte GPU.

Le immagini finali Cinema e Low sono pixel-identiche prima/dopo. Sessione aggiuntiva sul codice corretto: **138,9 s reali**, tre convogli in movimento dopo tre cicli, cache HighPass sempre vuota in Low e 118 listener costanti (fixture con tre convogli, distinta dalla fixture F con quattro). L’heap di questa sonda viene letto dopo l’allocazione diagnostica e non va confuso con l’heap dopo tutte le sonde/GC del confronto F principale.

## Provenienza e regressioni

Il confronto principale CPU/RAF/F usa baseline `303525c` e candidato `5ae8ee9`, con sei sessioni e 36 cicli. Ha dimostrato i guadagni CPU e nessuna regressione frame oltre budget, ma non il corretto rilascio di ogni materiale: la sonda supplementare ha identificato questa ritenzione preesistente. Non attribuire al solo Bloom tutta la crescita iniziale dell’heap, che include cache e shader appena usati.

La correzione modifica esclusivamente il rilascio quando si lascia Cinema. Il metodo che renderizza i frame resta byte-identico (`regression/cleanup-provenance.json`); il clock, il motore, i rotabili e l’interfaccia non cambiano. La matrice normale misura Low/High prima di Cinema e resta in Cinema negli ultimi scenari: la nuova istruzione di rilascio non è eseguita nelle finestre temporizzate. Si conservano quelle misure e si ripetono i controlli pertinenti al ciclo di vita: cache reale, immagini, durata aggiuntiva, suite Node e build, confronto visivo esteso e Pages sulla build finale.

Prove nuove in `regression/retention-*`, log del test rosso/verde e suite finale di 131 casi. La prima sonda è stata interrotta perché l’osservatore cercava il sorgente Three anziché il modulo già aggregato da esbuild; log conservato come errore di strumentazione, non come regressione dell’applicazione. La sonda corretta riproduce e verifica il difetto reale.
