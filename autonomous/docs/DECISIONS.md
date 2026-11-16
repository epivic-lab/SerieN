# Architecture Decision Record — Serie N Autonomous
**V0.4 · 2026-11-16** — Registro decisioni, modificabile attraverso ADR successive.

## ADR-001 — AI ai margini, determinismo nel controllo
**Scelta:** Ollama parser/stratega opzionale; dispatcher, safety e interlocking deterministici, autonomi dall'LLM. **Motivo:** latenza, affidabilità e consumi Mac M2 16 GB.

## ADR-002 — Un solo sistema logico, pochi componenti
**Scelta:** MVP come libreria TypeScript con moduli logici, non microservizi. Supabase solo persistenza; nessun server AI obbligatorio. **Conseguenza:** riduce costi/complessità ma impone isolamento esplicito per futuro uso fisico persistente.

## ADR-003 — Parità di osservabilità reale/simulata
**Scelta:** ground truth del simulatore in galleria vietata al dispatcher; posizione stimata dalla velocità osservata all'ingresso; correzione a riemersione; test con accesso a ground truth in modulo separato.

## ADR-004 — Sezioni galleria indipendenti
**Scelta:** `tunnel_A`, `tunnel_B`, `tunnel_C` sono tre risorse distinte. Si blocca solo la sezione occupata e le effettive zone di conflitto condivise.

## ADR-005 — Sgombro confermato, non presunto
**Scelta:** non liberare risorsa nascosta per sola previsione di tempo; occorre prova osservativa della coda o sensore equivalente. Senza prova, stato conservativo.

## ADR-006 — Interlocking con ingombro totale
**Scelta:** scambi bloccati prima di entrata in zona critica e finché l'ultimo vagone sgombra; includere tempi fisici e margini. Comando ricevuto non equivale a feedback posizione.

## ADR-007 — Veto e stop globale
**Scelta:** pericolo/condizione non gestibile -> STOP_ALL deterministico, reason code, chat, log e riavvio autorizzato. Il controllo ordinario locale può arrestare un singolo treno in normali precedenze, senza abuso di STOP_ALL.

## ADR-008 — Fluidità come obiettivo subordinato
**Scelta:** predizione, riserve granulari, rampe morbide, meno arresti e meno oscillazioni; sicurezza sempre prima.

## ADR-009 — Precedenze configurabili
**Scelta:** profilo «European Conventional» come euristica personalizzabile; nessuna pretesa che esista una scala vincolante unica europea.

## ADR-010 — Confini delle applicazioni
**Scelta:** SerieN web (Codex), app Swift Z21 (Claude), controller Autonomous distinti. All'inizio soltanto simulazione; nessuna modifica non autorizzata a hardware o motori.

## ADR-011 — Fonte di verità
**Scelta:** Markdown GitHub versionati canonici; Google Drive copia editoriale/indice/stato con sincronizzazione manuale. Collocazione GitHub temporanea: branch separato `spec/serie-n-autonomous` del repo SerieN, non nuovo repo (non disponibile come azione nella connessione corrente). Non fare merge fino ad audit/approvazione.
