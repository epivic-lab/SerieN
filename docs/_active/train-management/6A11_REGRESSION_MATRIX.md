# 6A.11 — Regressioni e matrice R0 originale

Tutte le righe PASS seguenti derivano da esecuzioni nuove di questa microfase.
[Registro machine-readable](evidence/6A11/regression-matrix.json). Non sommare
unità differenti, sottocasi o ripetizioni per inventare un totale.

| Suite | Unità effettiva / esito | Evidenza |
|---|---|---|
|6A.2 capability HTTP |48test PASS |[JSON](evidence/6A11/capability-security.json),[log](evidence/6A11/capability-security.txt) |
|6A.2 Chromium |5scenari PASS,154.0.8037.57 |[JSON](evidence/6A11/capability-browser.json) |
|6A.3 SQL |51casi PASS |[JSON](evidence/6A11/regression-6A3.json) |
|6A.4 SQL |45casi PASS |[JSON](evidence/6A11/regression-6A4.json) |
|6A.4 envelope adapter |12test PASS |[log](evidence/6A11/adapter6A4.txt) |
|6A.5 SQL |141casi PASS |[JSON](evidence/6A11/regression-6A5.json) |
|6A.5 history adapter |25test PASS |[log](evidence/6A11/adapter6A5.txt) |
|6A.6 gateway |72casi PASS, rieseguiti dopo ultima correzione nonce |[JSON](evidence/6A11/regression-6A6-final.json),[log](evidence/6A11/regression-6A6-final.txt) |
|6A.7 design |Contratti D09/D10 e matrice immutati; nessuna suite eseguibile inventata |[invarianti](evidence/6A11/invariants.json) |
|6A.8 lifecycle SQL |97casi PASS |[JSON](evidence/6A11/regression-6A8.json) |
|6A.9 broker |50E2E PASS nel perimetro approvato; non cap globale |[JSON](evidence/6A11/regression-6A9.json) |
|6A.10 ownerless |185SQL+50E2E PASS |[SQL](evidence/6A11/regression-6A10-ownerless-sql.json),[E2E](evidence/6A11/regression-6A10.json),[Auth0](evidence/6A11/regression-6A10-zero-auth-proof.json) |
|npm test |37unità file,0failure; non spacciate per numero assertion interne |[log](evidence/6A11/npm-test.txt) |
|Python/JMRI |9test PASS |[log](evidence/6A11/python.txt) |
|npm run build |PASS, bundle immutato |[log](evidence/6A11/build.txt) |
|R1 sorgenti/asset/contratti |Byte-identici alla base, salvo fix backend elencati |[invarianti](evidence/6A11/invariants.json) |
|R1 matrice visuale/performance completa |NOT VERIFIED; non eseguita qui |Richiede campagna dedicata |

I test Node/JMRI correnti coprono nel proprio perimetro rete/topologia/geometria,
interasse, routing/scambi, Journey/collisioni/guardie, WX310, comandi, consist,
HUD/presentazione e risorse. L'hash canonico/bundle e il confronto di tutti i file
R1 dimostrano assenza di modifiche; non sostituiscono prove browser/visuali o
benchmark comparabili. Nessuna modifica di dipendenze/asset per ottenere PASS.

## R0 P01–P18

Criteri e numerazione originali in [mapping approvato](R0_ACCEPTANCE_MAPPING.md),
che resta intatto. «6A locale» riguarda soltanto infrastruttura/profilo sintetico.
La colonna «R0 completo» riguarda l'accettazione del simulatore reale e non viene
promossa per una prova JSON/SQL. NON si anticipano6B–6E.

| ID originale / criterio | 6A locale verificato in questa fase | R0 completo |
|---|---|---|
|P01 Identità stabili save/load |ID/FK/digest sintetici e legacy conservati PASS; nessun hydrate runtime |NOT VERIFIED |
|P02 Composizione/ordine/±1/ganci |Regressioni Node invarianti PASS; nessun restore compositore |NOT VERIFIED |
|P03 Detached edge/s/Journey/ingombro |Regressioni ferroviarie esistenti PASS; persistenza detached runtime assente |NOT VERIFIED |
|P04 Locomotive/stato operativo |Suite R1 Node PASS; nessun round-trip operativo |NOT VERIFIED |
|P05 Otto scambi/effetti/zero eventi spurii |Sorgenti R1 invariati e suite scambi PASS; nessun hydrate con contatori evento |NOT VERIFIED |
|P06 Missioni/UI/HUD/vista |Regressioni presentazione e bundle PASS; restore UI assente |NOT VERIFIED |
|P07 Tempo10min/24h/zero tick |Nessuna chiusura/ripresa simulatore implementata o provata |NOT VERIFIED |
|P08 capture/hydrate/capture |Validatore sintetico chiuso soltanto; nessun serializer/hydrator generale |NOT VERIFIED |
|P09 Atomicità ogni substep |PASS SQL fault6substep/deferred/kill/timeout e gateway reale, nessun parziale |NOT VERIFIED end-to-end simulatore |
|P10 Idempotenza |PASS receipt stabile, dup concorrenti, digest mismatch409, head/quota/ack perso |NOT VERIFIED integrazione simulatore |
|P11 Concorrenza due tab/device |PASS due browser/backend distinti CAS etrace replay; journal/outbox condiviso assente |NOT VERIFIED criterio completo |
|P12 Offline/backoff/reconnect |Non implementato; retry HTTP backend non equivale a outbox/offline |NOT VERIFIED |
|P13 Corruzione/compatibilità/reset |PASS digest snapshot/risposta browser, topology sintetica, storico intatto |NOT VERIFIED restore/asset reali |
|P14 Autorizzazione/assenza segreti |PASS A01–A15 e expiry grant/sessione calda nel lab; hosting/OS/XSS non certificati |NOT VERIFIED hosted/audit completo |
|P15 Quota/abuso |PASS cap/code/limiti singolo; **FAIL cap aggregato doppio32/16** |NOT VERIFIED produzione; FAIL multi locale |
|P16 Asset/switch grafico sicuro |Byte-invariant asset PASS; nessun test restore/switch6C |NOT VERIFIED |
|P17 Ricovero/park/release/slot |Solo regressioni già esistenti; nessun nuovo ricovero o restore |NOT VERIFIED |
|P18 R1 S0–S7/5C/5D visuale/perf |PASS suite Node/JMRI/build e file/hash; campagna completa non eseguita |NOT VERIFIED |

Gli esiti locali non riscrivono i criteri R0 né autorizzano funzioni future.
Unica prossima azione: audit indipendente della Regia sul checkpoint6A.11.
