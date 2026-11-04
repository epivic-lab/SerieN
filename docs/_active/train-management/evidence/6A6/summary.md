# Risultati osservati 6A.6

Integrazione reale: **72 PASS**, Chromium 154.0.8037.57; PostgreSQL17.11, Node24.19.0, Python3.12.14, Playwright1.56.1. Zero FAIL nella suite finale. Gate macrofase **BLOCKED** per hosting/provisioning e ownerless cutover.

| Verifica | Esito | Evidenza |
|---|---|---|
| Nuova integrazione Browser/HTTP/PG | 72 PASS | results.json / integration.txt |
| Regressione SQL6A.3 | 51 PASS | regression-6A3.json |
| Regressione SQL6A.4 | 45 PASS | regression-6A4.json |
| Regressione SQL6A.5 | 141 PASS | regression-6A5.json |
| Capability HTTP6A.2 | 48 PASS | security.json |
| Capability browser | 5 PASS | capability-browser.json |
| Adapter6A.4/6A.5 | 12+25 PASS | adapters.txt |
| npm test | 37 file /220 test PASS | npm-test.txt |
| Python/JMRI | 9 PASS | python-test.txt |
| Build | PASS, bundle R1 | build.txt |
| Smoke browser simulatore | PASS, geometrie348→348 | r1-smoke.json |

## Latenza e dimensioni

Chromium headless real local HTTP; wall time includes Playwright and Docker/psql; JSON UTF-8 operation body/response bytes, not full proof/headers; single run no production throughput claim. Le righe aggregano solo risposte200; timeout, fault e prove di disconnect sono nei campioni grezzi e non sono benchmark del servizio. La durata delle Promise Playwright include lavoro del driver; un solo run, nessun warmup statistico, nessuna stima Supabase o comparazione con hardware5D. Il confronto descrive il run locale, che include fault e rendezvous intenzionali: p95 ReadHead include la pausa SQL2s per revoca, p95 SaveCheckpoint il blocker CAS2s. Questi valori non stimano la latenza ordinaria del servizio; n=1 non rappresenta una distribuzione statistica.

| Operazione | n200 | p50 ms | p95 ms | corpo JSON byte min–max | risposta JSON byte min–max | wire reale firmato byte min–max |
|---|---:|---:|---:|---:|---:|---:|
| ReadHead | 5 | 72.48 | 2236.09 | 2–2 | 202–372 | 808–808 |
| ReadSnapshot | 3 | 12.94 | 148.89 | 16–16 | 4808–4808 | 830–830 |
| ListHistory | 3 | 7.36 | 10.83 | 42–43 | 218–384 | 854–855 |
| ReadReceipt | 1 | 72.75 | 72.75 | 52–52 | 693–693 | 864–864 |
| SaveCheckpoint | 8 | 83.29 | 2106.84 | 4072–4072 | 693–694 | 4890–4890 |
| RecoverRevision | 1 | 19.72 | 19.72 | 45–45 | 694–694 | 865–865 |

Wire è postDataBuffer della richiesta effettiva Chromium (include proof/firma, esclude header/TCP); il massimo può comprendere richieste negate della stessa operazione. Risposta è JSON ricevuto, senza header. Eccesso2MiB e pagina21 respinti; response cap100byte SQL in fixture causa413; quote5revisioni e1byte logico storage negano il nuovo save conservando lo storico. Retry del primo ID sotto quota restituisce la vecchia ricevuta.

Tentativi di sviluppo non riusciti: bootstrap senza api_limits per workspace post-migrazione, attese FORBIDDEN anziché NOT_FOUND per ricevuta altrui e per route inesistente. Corretti provisioning e oracoli secondo contratti; suite completa finale ripetuta. Non sono PASS retroattivi.

La regressione smoke usa una copia temporanea dello script originale con la sola destinazione output spostata in work/, preservando docs/consolidation/smoke-result.json. Sorgenti/bundle R1 invariati; non sono nuove misure completeS0–S7/5C/5D. Gli stati DB degli scenari sono sintetici e non contengono private key, token pairing/recovery o credenziali produttive.
