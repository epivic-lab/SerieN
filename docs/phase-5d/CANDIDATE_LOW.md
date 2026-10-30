# Confronto di produzione Low — checkpoint parziale

> Checkpoint storico. La 5D è ora conclusa: stato corrente, prove finali e provenienza in [PERFORMANCE_AUDIT_5D.md](../PERFORMANCE_AUDIT_5D.md).

Tre ripetizioni × 24 frame per condizione; viewport 650×760, DPR 1, Chromium/SwiftShader. Nessun override del clock o cambio dei dettagli. Valori mediani delle tre statistiche per run. Nessuna soglia superata; non attribuire i cambiamenti di tempi software alla sola CPU ottimizzata. High/Cinema e F ancora da completare.

| Scenario | Prima ms/frame | Dopo ms/frame | Mediana | P95 |
|---|---:|---:|---:|---:|
| A/low/48/overview | 2024.85 | 1883.25 | -7.0% | +6.2% |
| B/low/48/overview | 1858.25 | 1725.00 | -7.2% | -37.3% |
| C/low/48/overview | 1933.30 | 1808.25 | -6.5% | -47.3% |
| D/low/48/overview | 2008.25 | 1774.85 | -11.6% | -31.3% |
| C/low/95/overview | 2558.20 | 1683.20 | -34.2% | -59.6% |

Comandi sintetici D dentro il RAF: mediana del tempo sincrono del gestore 6,1 → 6,2 ms. STOP ALL osservato 1,0–1,6 ms prima e 0,8–3,0 ms dopo. Non è una misura di latenza end-to-end del puntatore o del prossimo frame. Nessun throttling o ritardo intenzionale aggiunto.
