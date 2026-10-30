# Confronto di produzione High — checkpoint parziale

> Checkpoint storico. La 5D è ora conclusa: stato corrente, prove finali e provenienza in [PERFORMANCE_AUDIT_5D.md](../PERFORMANCE_AUDIT_5D.md).

Tre ripetizioni × 16 frame per condizione, con tre frame di warmup, viewport 650×760 e DPR 1. Stesso Chromium/SwiftShader, rendering e clock normali. Nessuna soglia superata. Il p95 di ciascun run da 16 campioni coincide col massimo; dati grezzi e p95 pooled nel riepilogo permettono di valutare i picchi. Non estrapolare a GPU fisiche.

| Scenario | Prima ms/frame | Dopo ms/frame | Mediana | P95 |
|---|---:|---:|---:|---:|
| E/high/10/overview | 2974.95 | 2516.65 | -15.4% | -38.2% |
| E/high/10/follow | 2299.90 | 2149.95 | -6.5% | +13.9% |
| E/high/95/overview | 3083.25 | 2658.20 | -13.8% | -19.4% |
| E/high/95/follow | 2533.20 | 2141.55 | -15.5% | -70.5% |

Low e High completi; Cinema e stabilità F ancora in corso. Non dichiarare chiusa la fase con questo documento.
