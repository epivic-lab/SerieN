# M2 — Milestone A, compositore

Mandato 11 novembre 2026: completare esclusivamente A, in incrementi con commit/checkpoint, poi STOP per Regia. Questa istruzione specifica autorizza l'intera milestone e prevale sulle pause generiche fra microfasi di AGENTS. Nessun M3, persistenza, merge, deploy o redesign.

## Baseline verificata

- Checkout iniziale pulito `work` a `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`.
- `git ls-remote origin refs/heads/main`: `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, coincidente con il mandato. Fetch e nuovo branch `codex/train-management-m2` da tale commit; nessuna modifica ad altri branch.
- Baseline: 234 Node PASS, build PASS (evidence/M2/baseline-*).
- M1/M1.1 presenti: catalogo 14 modelli, viste pure, PNG laterali/manifest, consistLayout e vista SVG con zoom/Fit.
- M2-A non reperita come documento nel checkout: contratti verificati nel codice effettivo `src/fleet-commands.js`, `src/consist.js`, `src/railway-state.js`, reset e dispatcher in app.js. Nessuna deduzione da analisi non disponibile.
- Tre migrazioni versionate presenti; workflow Supabase isolato su main/PR, senza deploy. Backend/Auth/RLS/RPC/privilegi restano fuori perimetro, nessun collegamento al cloud per i progetti.

## Incremento 1 — dominio

Catalogo normalizzato delle stesse 14 identità del manifest M1.1. Store in RAM separato per bozza e progetti confermati, copie difensive, UUID progettati distinti da UUID fisici, limite una locomotiva iniziale e cinque rimorchi. Aggiunta/rimozione/ordine/orientamento, rinomina, conferma/annullamento, dirty state, copia per valore dal reale. Confronto ordine/modello/identità/orientamento e generazione per reset. Indicazioni conservative dei comandi R1, senza dispatcher nuovo o applicazione di progetti.

Sette nuovi test di dominio: lifecycle e rollback, modelli identici distinti, guardie e atomicità degli errori, copia senza effetti, modifiche esterne/reset, limiti R1. Evidenze in evidence/M2/domain. Interfaccia M2 e integrazione browser ancora NOT VERIFIED a questo checkpoint.

## Limiti intenzionali

Confermare significa conservare un progetto nella sessione corrente, senza effetti sulla simulazione. Ricaricare/chiudere la pagina perde i progetti: persistenza rinviata a C. Nessun inventario deposito o assegnazione di materiale fisico. Nessun pulsante di applicazione globale. I comandi fisici singoli restano nelle console R1 già esistenti; il compositore descrive i vincoli, non attribuisce permessi spaziali. Orientamento per veicolo solo progettato, non disponibile nel motore R1.

## Stato

Milestone A IN CORSO. Nessun verdetto READY finché integrazione e collaudo non sono completati.
