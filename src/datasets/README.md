# V06 R1A — isolated railway data

`v06-r1a.json` implements the existing network data contract. It is **not imported
by the application**. `createNetwork()` and `createNetwork(canonical)` retain the
legacy profile. There is no URL flag, environment switch or UI activation.

From the repository root, use the independent **Node-only** admission checker
before passing an artifact into the factory:

```js
import {readFileSync} from 'node:fs';
import {createNetwork, validateNetwork} from '../network.js';
import {validateArtifact} from '../../tools/scenario-v06/validate-r1a.js';
const bytes = readFileSync('src/datasets/v06-r1a.json');
validateArtifact(bytes); // rejects hash, schema, lineage and semantic failures
const network = createNetwork(JSON.parse(bytes));
validateNetwork(network);
```

Imports above are relative to this directory. For a root-level script use
`./src/network.js` and `./tools/scenario-v06/validate-r1a.js`. The factory accepts
an explicit data object; it is not an integrity verifier. Do not bypass admission
or treat `validateNetwork` as the full V06 validator. `validateDataset(object)`
provides semantic checks independently of the artifact digest, including for
negative tests. No new browser loader is provided.

Regenerate only V06 with `python3 tools/scenario-v06/build-r1a.py`; it never
imports the legacy generator. Reproduction is byte deterministic. A deliberate
version change requires a separately reviewed digest in the independent checker.

All 79 original routes and all R02 points are retained. IDs `V06-P000`–`V06-P078`
refer to original piece indices; nodes prefix the original `R01J*` ID with `V06-`.
Each WX path remains one complete port-to-port edge. Runtime lanes are inner
C=0, middle B=1, outer A=2. Boolean `false` maps to S0/N and `true` to S1/X;
this is a simulator selection, not certified physical polarity or an initial
command. Controller `initialState` is null.

`sourceHiddenIntervalsMm` preserves the raw R02 intervals. Runtime
`hiddenIntervalsMm` caps rounded visual endpoints at the measured edge length
(pieces 28 and 29 only). These intervals never remove edges from connectivity.
Nodes explicitly enumerate source endpoint incidences; controller ports identify
the same nodes as edge from/to. Metadata remains shared read-only; factory point
arrays are copied per instance.

Triangle manoeuvre legs are topological witnesses. Their required stop/clear/
throw/reverse event is explicit, `runtimeAdmission` is false and `stopAnchor` is
null. No safe capacity, spawn or stopping anchor is invented. The existing guard
must remain authoritative for unknown states; the router's historical Boolean
coercion alone is not admission. `physical_profile_certified` and
`runtime_circulation_verified` remain false.

Rollback: discard the isolated V06 network and create a fresh legacy instance
with `createNetwork()` or `createNetwork(canonical)`. Do not transfer Journey,
controller state or reservations between layouts. App bootstrap is unchanged.

See [R1A report](../../docs/_active/scenario-v06/R1A_OPERATIONAL_DATASET_REPORT.md)
and [evidence](../../docs/_active/scenario-v06/evidence/R1A/README.md).
