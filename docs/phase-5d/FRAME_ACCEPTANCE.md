# 5D.6 — Confronto frame completo

> Checkpoint storico. La 5D è ora conclusa: stato corrente, prove finali e provenienza in [PERFORMANCE_AUDIT_5D.md](../PERFORMANCE_AUDIT_5D.md).

39 acquisizioni per revisione, 744 frame ciascuna (24 Low, 16 High/Cinema per run, tre ripetizioni, tre warmup). Totale 1.488 frame misurati. Stesso browser/backend software, viewport 650×760, DPR 1, clock e rendering normali, qualità esplicita. Errori JavaScript e richieste fallite: zero su entrambe le revisioni.

| Scenario/qualità/giorno/camera | Prima ms/frame | Dopo ms/frame | Variazione mediana | Variazione p95 |
|---|---:|---:|---:|---:|
| A/low/48/overview | 2024.85 | 1883.25 | -7.0% | +6.2% |
| B/low/48/overview | 1858.25 | 1725.00 | -7.2% | -37.3% |
| C/low/48/overview | 1933.30 | 1808.25 | -6.5% | -47.3% |
| D/low/48/overview | 2008.25 | 1774.85 | -11.6% | -31.3% |
| C/low/95/overview | 2558.20 | 1683.20 | -34.2% | -59.6% |
| E/high/10/overview | 2974.95 | 2516.65 | -15.4% | -38.2% |
| E/high/10/follow | 2299.90 | 2149.95 | -6.5% | +13.9% |
| E/high/95/overview | 3083.25 | 2658.20 | -13.8% | -19.4% |
| E/high/95/follow | 2533.20 | 2141.55 | -15.5% | -70.5% |
| E/cinema/10/overview | 2033.20 | 2041.60 | +0.4% | -26.1% |
| E/cinema/10/follow | 2208.30 | 2241.55 | +1.5% | -15.3% |
| E/cinema/95/overview | 2041.60 | 2116.60 | +3.7% | -8.8% |
| E/cinema/95/follow | 2374.95 | 2558.25 | +7.7% | -4.3% |

Nessuno scenario supera +10% nella mediana o +15% nel p95; nessuna ripetizione correttiva richiesta dal budget. I risultati includono variazioni positive e negative: non sono una prova di accelerazione GPU o di FPS desktop. Nessuna riduzione di qualità per produrre i dati. Le immagini statiche prima/dopo sono pixel-identiche.

Le statistiche sono mediane delle tre statistiche per run; per 16 campioni il p95 del run coincide con il massimo. Dati grezzi, p95 pooled, picchi, long task e tempi sincroni dei comandi restano disponibili nel riepilogo finale. La baseline comprende 26 acquisizioni salvate nella sessione precedente e 13 riprese con la medesima configurazione; metadati di entrambe conservati. Le posizioni finali dinamiche sono registrate perché il browser usa RAF e clock reali: questo non è un replay di pose sintetiche.

Questa verifica chiude il gate frame; la chiusura generale attende sessioni F e verifica memoria.
