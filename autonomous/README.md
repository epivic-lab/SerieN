# Serie N Autonomous
**Stato:** specifica architetturale V0.4 (bozza) — 16 novembre 2026  
**Natura:** progetto di controllo autonomo / digital twin del plastico, **non implementazione**.

## Scopo
Un capomovimento comandabile via chat in linguaggio naturale, capace di condurre la circolazione su tre anelli A/B/C, organizzare precedenze, stop, ripartenze, scambi e manovre demo, mantenendo movimenti fluidi e rispettando la sicurezza.

Esempi:
- «Fai circolare tre locomotive sull'anello A mantenendole equidistanti».
- «Genera traffico e manovre demo».
- «Fai dare precedenza al passeggeri e ripartire il merci».
- «Ferma tutti i treni e spiegami perché».

## Architettura minima
```text
Chat -> interprete naturale (Ollama opzionale)
     -> intenti strutturati e validati
     -> dispatcher predittivo deterministico
           |-> pianificazione e priorità configurabili
           |-> stimatore posizione (osservato / stimato / perso)
           |-> interlocking e prenotazione risorse
           |-> regolatore predittivo di velocità
           |-> supervisore sicurezza globale (veto / STOP ALL)
     -> adattatore ambiente
           |-> simulatore web SerieN (inizio)
           |-> futuro controller locale Swift/Z21 + OpenCV (poi)
Supabase: soltanto configurazioni, log e scenari; non ciclo di sicurezza.
```

## Vincoli cardinali
1. In galleria **A, B, C sono tratte distinte**. Si riserva soltanto la tratta dell'anello interessato e ogni effettiva risorsa topologica condivisa.
2. Il dispatcher **non vede ground truth** nella galleria: stima il moto dall'osservazione d'ingresso e riacquisisce all'uscita.
3. Le stime non liberano risorse: la conferma di sgombero deve comprendere **tutto il convoglio**.
4. Gli scambi sono bloccati durante ingombro e fino a sgombero, comprensivi di attuazione, stabilizzazione, margini di frenatura e protezione.
5. Pericolo o stato non gestibile => **STOP globale**, motivo nella chat, ripartenza dopo verifica e consenso esplicito.
6. A parità di sicurezza, minimizzare arresti inutili, scatti, attese e cambi scambio.
7. Le precedenze sono un **profilo operativo europeo configurabile**, non una presunta scala di priorità europea universale.
8. Nessuna inferenza AI necessaria nel ciclo di controllo continuo.

## Documentazione
- [Architettura V0.4](docs/ARCHITECTURE_V0.4.md)
- [Requisiti e acceptance gate](docs/REQUIREMENTS.md)
- [Decisioni architetturali](docs/DECISIONS.md)
- [Backlog e fasi](docs/BACKLOG.md)
- [Handoff / continuità tra sessioni](docs/HANDOFF.md)

## Assetti e confini
- **SerieN web 3D:** progetto esistente sviluppato con Codex.
- **App Swift nativa di controllo Z21:** progetto distinto sviluppato con Claude.
- **Autonomous:** specifica autonoma; nessun cambiamento a motore, app o sistemi di controllo finché non approvati.

## Repositories e persistenza
**Provvisorio:** documentazione isolata nel branch `spec/serie-n-autonomous` del repository `epivic-lab/SerieN`; un nuovo repository GitHub autonomo non è ancora stato creato (l'integrazione attuale non espone l'operazione). Al momento non fare merge in `main`.  
**Fonte di verità delle specifiche tecniche:** questi Markdown versionati.  
**Google Drive:** cartella “Serie N Autonomous — Architettura e Regia” sotto “Serie N - Laboratorio”; copia consultabile della specifica e registro decisioni/stato. Sincronizzazione **manuale**, non automatica.

**Stato:** definizione preliminare, non verificata sul codice reale e non validata su hardware. Nessuna autonomia abilitata.

## Punti di accesso verificati
- [Issue di regia #26](https://github.com/epivic-lab/SerieN/issues/26) — riferimento di progetto provvisorio.
- [Cartella Google Drive](https://drive.google.com/drive/folders/1w4xvqay5Hm-xgh0-uhEmbE1vAJXOQesR).
- [Specifica consultabile su Drive](https://docs.google.com/document/d/1BRtObdOEaN00NYiDKsz883EgSr60CDmNd094F5ga5Nw/edit).
- [Registro decisioni e handoff su Drive](https://docs.google.com/document/d/1PtOSmqBY4KWVIv6Uc6tvUD-w2v0WhxbGAUsWdwjlvM0/edit).
