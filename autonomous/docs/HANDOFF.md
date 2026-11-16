# Handoff / come riprendere il lavoro
**Ultimo checkpoint:** 2026-11-16 — V0.4, fase esclusivamente documentale.

## Prossima sessione
1. Leggere \`autonomous/README.md\`, \`docs/ARCHITECTURE_V0.4.md\`, \`docs/REQUIREMENTS.md\`, \`docs/DECISIONS.md\`, \`docs/BACKLOG.md\` sul branch \`spec/serie-n-autonomous\`.
2. Non considerare verificata la topologia o le API del simulatore: effettuare P1 audit read-only prima di progettare integrazioni concrete.
3. Non modificare \`main\` di SerieN, app Swift e Z21; non avviare implementazione autonomamente.
4. Trasferire contenuti a repository GitHub indipendente quando la creazione sarà disponibile, mantenendo documenti e issue collegati.
5. Aggiornare Google Drive dopo ogni decisione rilevante; indicare sempre versione e commit.

## Parametri di contesto
- Plastico fisico: Serie N V3, base **150 × 70 cm**.
- Tre anelli anche nella galleria; A/B/C separati.
- SerieN web 3D creato con Codex, app nativa Swift di comando Z21 con Claude.
- Controller pensa con osservazioni realistiche: posizione **in galleria non osservata**.
- STOP globale motivato per pericolo/impasse; riavvio non automatico.
- Scambi impegnati dall'intero treno, con tempi di attuazione e margini.
- Massima fluidità entro i limiti di sicurezza.
- Mac M2 16 GB: Ollama opzionale e leggero.
- Supabase non fa controllo realtime.

## Decisioni aperte
- Repo GitHub indipendente e accessi.
- Geometria e confini esatti delle sezioni nascoste / scambi su mappa V3.
- Conferma fisica di sgombero coda e posizione scambio; alternative sensori.
- Frequenze controllo / latenza / frenatura / clock / distanze minime dopo audit.
- Limiti del browser e grado minimo di autonomia supervisonata.
- Nomi e versionamento dello schema eventi.
