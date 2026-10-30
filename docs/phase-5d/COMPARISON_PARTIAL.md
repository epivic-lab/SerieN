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
| E/high/95/follow | 2 | 32 | 2741.53 | 15307.75 | 0.27 |
