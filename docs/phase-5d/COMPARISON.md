| Scenario/component | Before ms/call | After ms/call | Reduction |
|---|---:|---:|---:|
| A/models | 0.0850 | 0.0530 | 37.6% |
| A/assistance | 0.2550 | 0.0817 | 68.0% |
| A/deck | 0.0028 | 0.0016 | 42.9% |
| A/simulation | 0.0383 | 0.0230 | 40.0% |
| B/models | 0.0530 | 0.0380 | 28.3% |
| B/assistance | 0.3667 | 0.1850 | 49.5% |
| B/deck | 0.0028 | 0.0016 | 42.9% |
| B/simulation | 0.5290 | 0.2167 | 59.0% |
| C/models | 0.0530 | 0.0430 | 18.9% |
| C/assistance | 0.2233 | 0.0667 | 70.1% |
| C/deck | 0.0020 | 0.0050 | -150.0% |
| C/simulation | 0.8040 | 0.1753 | 78.2% |
| D/models | 0.2290 | 0.1010 | 55.9% |
| D/assistance | 0.3500 | 0.1333 | 61.9% |
| D/deck | 0.0038 | 0.0030 | 21.1% |
| D/simulation | 4.5640 | 0.3663 | 92.0% |

Frame medians and p95 below are medians of three run statistics; pooled p95 and raw samples are in JSON. FPS = median of per-run 1000/mean frame time. Software backend only.


Before

| Scenario/quality/day/camera | Runs | Frames | Frame median ms | Frame p95 ms | Effective FPS |
|---|---:|---:|---:|---:|---:|
| A/low/48/overview | 3 | 72 | 2024.85 | 2966.60 | 0.45 |
| B/low/48/overview | 3 | 72 | 1858.25 | 3349.90 | 0.46 |
| C/low/48/overview | 3 | 72 | 1933.30 | 4966.50 | 0.38 |
| D/low/48/overview | 3 | 72 | 2008.25 | 4149.80 | 0.43 |
| C/low/95/overview | 3 | 72 | 2558.20 | 4533.20 | 0.36 |
| E/high/10/overview | 3 | 48 | 2974.95 | 9466.20 | 0.22 |
| E/high/10/follow | 3 | 48 | 2299.90 | 3233.10 | 0.44 |
| E/high/95/overview | 3 | 48 | 3083.25 | 5683.10 | 0.28 |
| E/high/95/follow | 3 | 48 | 2533.20 | 9083.00 | 0.34 |
| E/cinema/10/overview | 3 | 48 | 2033.20 | 3833.20 | 0.48 |
| E/cinema/10/follow | 3 | 48 | 2208.30 | 3049.90 | 0.45 |
| E/cinema/95/overview | 3 | 48 | 2041.60 | 3033.20 | 0.47 |
| E/cinema/95/follow | 3 | 48 | 2374.95 | 3483.20 | 0.42 |

After

| Scenario/quality/day/camera | Runs | Frames | Frame median ms | Frame p95 ms | Effective FPS |
|---|---:|---:|---:|---:|---:|
| A/low/48/overview | 3 | 72 | 1883.25 | 3149.90 | 0.48 |
| B/low/48/overview | 3 | 72 | 1725.00 | 2099.90 | 0.56 |
| C/low/48/overview | 3 | 72 | 1808.25 | 2616.60 | 0.52 |
| D/low/48/overview | 3 | 72 | 1774.85 | 2850.00 | 0.48 |
| C/low/95/overview | 3 | 72 | 1683.20 | 1833.30 | 0.59 |
| E/high/10/overview | 3 | 48 | 2516.65 | 5849.80 | 0.35 |
| E/high/10/follow | 3 | 48 | 2149.95 | 3683.20 | 0.42 |
| E/high/95/overview | 3 | 48 | 2658.20 | 4583.10 | 0.34 |
| E/high/95/follow | 3 | 48 | 2141.55 | 2683.20 | 0.46 |
| E/cinema/10/overview | 3 | 48 | 2041.60 | 2833.30 | 0.46 |
| E/cinema/10/follow | 3 | 48 | 2241.55 | 2583.30 | 0.47 |
| E/cinema/95/overview | 3 | 48 | 2116.60 | 2766.60 | 0.45 |
| E/cinema/95/follow | 3 | 48 | 2558.25 | 3333.20 | 0.40 |

| Scenario | Median change | P95 change | Repeat required |
|---|---:|---:|---|
| A/low/48/overview | -7.0% | +6.2% | False |
| B/low/48/overview | -7.2% | -37.3% | False |
| C/low/48/overview | -6.5% | -47.3% | False |
| D/low/48/overview | -11.6% | -31.3% | False |
| C/low/95/overview | -34.2% | -59.6% | False |
| E/high/10/overview | -15.4% | -38.2% | False |
| E/high/10/follow | -6.5% | +13.9% | False |
| E/high/95/overview | -13.8% | -19.4% | False |
| E/high/95/follow | -15.5% | -70.5% | False |
| E/cinema/10/overview | +0.4% | -26.1% | False |
| E/cinema/10/follow | +1.5% | -15.3% | False |
| E/cinema/95/overview | +3.7% | -8.8% | False |
| E/cinema/95/follow | +7.7% | -4.3% | False |

Negative frame change is faster; positive is slower. A flag requires a matched repetition, not automatic attribution to code.

| Revision/session | Last window end, real seconds | GC heap first → last MiB | Backing first → last MiB | Geometries | Textures |
|---|---:|---:|---:|---|---|
| Before/extended-0 | 130.8 | 27.40 → 26.61 | 94.43 → 94.43 | [402] | [50] |
| Before/extended-1 | 124.4 | 31.42 → 30.68 | 94.43 → 94.43 | [404] | [51] |
| Before/extended-2 | 139.2 | 30.46 → 30.69 | 94.43 → 94.43 | [404] | [51] |
| After/extended-0 | 126.0 | 27.16 → 25.57 | 94.44 → 94.44 | [402] | [50] |
| After/extended-1 | 147.4 | 30.01 → 30.28 | 94.44 → 94.44 | [404] | [51] |
| After/extended-2 | 144.2 | 30.32 → 30.66 | 94.44 → 94.44 | [404] | [51] |

| Revision/quality reset cycles | Samples | Geometries | Textures | GC heap first → last MiB | Backing first → last MiB |
|---|---:|---|---|---:|---:|
| Before/low | 6 | [402, 404] | [50, 51] | 27.26 → 30.89 | 94.43 → 94.43 |
| Before/high | 6 | [404] | [51] | 27.46 → 31.06 | 94.43 → 94.43 |
| Before/cinema | 6 | [405] | [69] | 28.55 → 30.84 | 94.43 → 94.43 |
| After/low | 6 | [402, 404] | [50, 51] | 26.72 → 30.36 | 94.44 → 94.44 |
| After/high | 6 | [404] | [51] | 27.81 → 30.52 | 94.44 → 94.44 |
| After/cinema | 6 | [405] | [69] | 28.90 → 31.18 | 94.44 → 94.44 |
