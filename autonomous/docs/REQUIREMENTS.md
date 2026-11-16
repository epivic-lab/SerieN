# Requisiti e criteri di accettazione — V0.4
**Stato:** bozza. Ogni test deve produrre log e replay; tutti i numeri operativi (margini, velocità, latenze) saranno fissati dopo l'audit.

| ID | Requisito | Criterio di accettazione |
|---|---|---|
| R-01 | Chat naturale per scenario, stop, precedenza, diagnosi | Intento validato o rifiuto esplicito; niente comando libero dell'AI ad attuatori |
| R-02 | 3 loco equidistanti su A | Nessuna violazione; convergenza graduale entro tolleranza misurata, o diagnosi impossibilità |
| R-03 | Demo autonoma | Scenario riproducibile con seed; route/stop/manovra spiegati |
| R-04 | Percezione realistica | Il controller non riceve mai ground truth di convogli occultati |
| R-05 | Gallerie A/B/C separate | Un treno in A non blocca B e C se le loro risorse non confliggono |
| R-06 | Stima in galleria | Velocità e transito stimati, incertezza cresce, correzione all'uscita |
| R-07 | Sicurezza occupazione | Sezione nascosta non libera per sola scadenza tempo; confermata coda |
| R-08 | Scambi interlocked | Nessuna commutazione sotto convoglio, incluse coda, approcci, attuazione/stabilizzazione |
| R-09 | Dispatcher predittivo | Prenota in anticipo; riduce fermate non necessarie e osc. velocità |
| R-10 | Precedenze | Profilo europeo convenzionale configurabile; vincoli sicurezza prevalgono |
| R-11 | GLOBAL STOP motivato | Tutti i treni ricevono stop pericolo/non gestibile, log e spiegazione chiara |
| R-12 | Riavvio protetto | Nessun auto-resume dopo evento critico; stato verificato e conferma utente |
| R-13 | AI opzionale | Chiusura Ollama non interrompe il controllo già in corso |
| R-14 | Front-end agnostico | Futuri adapter OpenCV/Z21/Swift senza riscrivere dispatcher |
| R-15 | Persistenza non critica | Supabase fuori da loop di sicurezza e low-latency |
| R-16 | Audit preliminare | Disponibilità API, topologia, frenatura, feedback documentati prima del codice |

**Gate G0 (specifica):** requisiti e ambiguità registrati.
**Gate G1 (audit):** API SerieN e topologia mappate, scenari testabili.
**Gate G2 (motore deterministico in web):** test sicurezza/galleria/scambi PASS senza LLM.
**Gate G3 (chat):** intenti robusti, log e motivazioni.
**Gate G4 (digital twin reale):** solo dopo progettazione fail-safe hardware e verifiche Z21.
