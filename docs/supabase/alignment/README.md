# SerieN — S2 Recovery & Alignment

Baseline obbligatoria: `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`.
Branch autorizzato: `codex/supabase-alignment-s2`.
[Checkpoint permanente #4](https://github.com/epivic-lab/SerieN/issues/4).

Questa consegna recupera due migrazioni storiche e un laboratorio riproducibile;
non applica SQL al progetto remoto e non abilita persistenza, E1, M2 o redesign.

- [Recupero del lavoro precedente](RECOVERY.md)
- [Risultati e limiti](RESULTS.md)
- [Riproduzione e toolchain](REPRODUCE.md)
- [Auth, Data API e sicurezza Preview](EXTERNAL_CONFIGURATION.md)
- [Manifest e hash](manifest.json)
- [Catalogo remoto osservato, senza dati](remote-catalog.json)

Il manifest registra la fonte remota delle tre versioni. I primi due file sono
byte-identici ai testi storici, inclusa la newline iniziale. La migrazione email
rimane identica a quella di main: solo commenti/spazi differiscono dal testo
storico; i token SQL e il catalogo risultante coincidono nel perimetro collaudato.

Il laboratorio ricrea il livello PostgreSQL applicativo con un adattatore Auth
sintetico e i default privilege pubblici osservati. Non è un clone di GoTrue,
PostgREST, Google OAuth o della configurazione di integrazione Supabase.

Nessuna PR finché il comportamento della Preview non è verificato sul progetto.
La presenza del workflow isolato non sostituisce né disabilita Supabase Preview.
