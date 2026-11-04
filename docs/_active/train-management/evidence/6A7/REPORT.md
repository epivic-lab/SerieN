# 6A.7 — Rapporto documentale alla Regia

**6A.6 TECHNICAL PASS — 6A MACRO GATE BLOCKED — 6B NOT AUTHORIZED.**

## Esito e raccomandazioni

Completata la sola progettazione 6A.7, soggetta ad audit indipendente. Nessuna soluzione correttiva implementata. D09/D10 non diventano approvate per effetto di questo rapporto.

- [D09](../../6A7_ARCHITECTURE_DECISIONS.md): scelta unica A, principal SQL per dispositivo/versione con broker privato fidato, connessioni lazy/LRU e cap aggregato, direct TLS iniziale. Confronto sicurezza/complessità/scala/costo/manutenzione/reversibilità/impatto con B e C; primitive documentate distinte da prove locali e staging. Il broker compromesso può impersonare i device assegnati: limite esplicito da accettare o respingere.
- [D10](../../6A7_OWNERLESS_CUTOVER.md): ownerNULL per nuovi workspace; owner storici come provenienza privata senza FK Auth, generated domain key non nulla e FK composite obbligatorie. Nessuna riscrittura di snapshot/ricevute/ID; archivio legacy conservato. Backfill della sola provenienza; niente account fittizi o promozione automatica legacy.
- [Piano](../../6A7_EXECUTION_PLAN.md): sei interventi proposti 6A.8–6A.13, con componenti/dipendenze/rischi/PASS/FAIL/rollback/autorizzazioni; matrice A01–A16. D10 aggiunge O01–O14, incluso legacy non vuoto con tutti gli utenti Auth eliminati nella sola fixture prima di creare nuovi workspace.
- [Rischi/evidenze](../../6A7_RISKS_AND_EVIDENCE.md): diciotto rischi con controllo/prova residua. [Fonti pubbliche](SOURCES.md), aggiornati PROGRESS e STATUS. Nessun criterio R0 o contratto approvato modificato.

## Recupero e confine operativo

Checkout iniziale: branch work, HEAD R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910`, working tree pulito. L'ultima richiesta autorizza esplicitamente fetch/passaggio al checkpoint corretto. Fetch con accesso rete autorizzato del solo ref `feature/train-management`: remoto `5d65a32ff392dabf7e57c040981598f5af398e05`, oggetto locale verificato prima della progettazione.

Il primo `git switch --create ... --track origin/feature/train-management` ha fallito la configurazione tracking perché il refspec configurato non classificava quel ref come branch remoto tracciabile. L'operazione aveva già caricato nell'index/tree i file del checkpoint, lasciando HEAD su work. Correzione non distruttiva con `git switch --no-track --create feature/train-management 5d65a32ff392dabf7e57c040981598f5af398e05`: HEAD esatto e working tree pulito verificati prima della progettazione. Nessun reset, ricostruzione commit, force-push, merge/rebase o modifica main.

Letti AGENTS integralmente, progressi recenti/STATUS, contratti 6A.1–6A.6, gate6A.6, mapping R0 P01–P18, schema/SQL e prototipi pertinenti. D01–D08 preservate tramite contratti approvati; l'originale R0 integrale non è nel checkout, confronto integrale NOT VERIFIED. La Regia ha fornito durante6A.2 i criteri originali R0.13, presenti nel mapping: non sono stati rinumerati o sostituiti.

Supabase reale: **zero query**, zero DDL/DML/ruoli/Auth/RLS/grant/config/Edge/deploy; usato soltanto search_docs pubblico. Changelog/pagine dirette403 dal proxy; primitive PostgreSQL consultate nei sorgenti ufficiali GitHub e documentazione Supabase via connettore, senza modificare rete/proxy. Nessuna dipendenza nuova installata, nessun container o gateway avviato in6A.7.

## Verifiche effettive della presente microfase

| Verifica | Esito | Evidenza / limite |
|---|---|---|
| npm test | PASS, 37 file, zero fail/cancel/skip | [npm-test.txt](npm-test.txt); non si inventa un nuovo conteggio di test interni |
| Python/JMRI | PASS, 9 test | [python-tests.txt](python-tests.txt), `python3 -m unittest discover -s tests -p '*_test.py' -v` |
| Build | PASS | [build.txt](build.txt); bundle ricostruito con hash R1 |
| Perimetro e integrità | PASS nel controllo locale | [invariants.json](invariants.json): confronto file tracciati con6A.6, whitelist doc, canonico/bundle, SQL/contratti/R0 preservati |
| Link locali documenti nuovi e STATUS/nota PROGRESS6A.7 | PASS nel controllo locale | Stesso invariants.json; niente link locali mancanti |
| Sicurezza artefatti | PASS scansione delimitata | Stesso invariants.json: pattern credenziali/private key/JWT nei nuovi documenti/log; nessuna attestazione di audit globale |
| Diff/whitespace | PASS | `git diff --check` e controllo staged prima del commit |
| SQL/HTTP/browser6A.2–6A.6 | EREDITATI, non rieseguiti | [summary6A.6](../6A6/summary.md) e relativi log al checkpoint approvato, immutati; nessun codice cambiato |
| Nuova A operativa, replay durevole, lifecycle e ownerless | NOT VERIFIED/NON IMPLEMENTATI | Piani A01–A16/O01–O14; nessun risultato futuro presentato come eseguito |
| Supabase staging/TLS/pooler/delegabilità/costi/restore | NOT VERIFIED | Ambiente e operazioni da autorizzare separatamente |
| R1 visuale/prestazionale/hardware completo | NOT VERIFIED in6A.7 | Nessun runtime/asset cambiato; suite Node/JMRI/build e hash non sostituiscono la matrice completa |

Gli oracoli futuri non sono test eseguiti in questa fase design-only. La matrice R0 nel gate6A.6 mantiene gli esiti precedenti: nessuna estensione a serializer/hydrator/autosave/offline/compositore/asset/ricovero o6B–6E.

## Checkpoint, decisioni e STOP

Scope consentito: i quattro documenti6A.7, le sole evidenze documentali6A.7, PROGRESS e STATUS. Nessun file SQL, test/prototipo eseguibile, package, simulatore, topologia, Journey/routing/WX/guardie/HUD/console o asset modificato. I file precedenti, incluse evidenze6A.1–6A.6 e gate storico, restano uguali al checkpoint approvato.

Commit atomico di questa consegna risolvibile con `git log -1 --format=%H -- docs/_active/train-management/evidence/6A7/REPORT.md`. Push normale esplicito solo `HEAD:refs/heads/feature/train-management`, previa verifica SHA remoto/base e ascendenza; verifica SHA locale/remoto, file pubblicati e working tree dopo push nella risposta finale. Questo testo non anticipa il successo di un'operazione Git futura. Se pubblicazione o verifica falliscono: BLOCKED, lavoro conservato, nessun overwrite del remoto.

La Regia deve valutare D09=A, fiducia nel broker e costo/cap; D10 e semantica della provenienza legacy; piano e test correttivi. Solo dopo approvazione potrà autorizzare la proposta6A.8. Nessun permesso staging/produzione o chiusura6A dedotto. **STOP dopo6A.7; nessuna6B.**
