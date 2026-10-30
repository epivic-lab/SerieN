| Scenario/component | Before ms/call | After ms/call | Reduction |
|---|---:|---:|---:|

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

| Scenario | Median change | P95 change | Repeat required |
|---|---:|---:|---|

Negative frame change is faster; positive is slower. A flag requires a matched repetition, not automatic attribution to code.
