# UI V2.1 — autorità d'integrazione normalizzata

**U0 autorizzata e limitata a documentazione/contratti. U1–U9 NON autorizzate.** La Regia ha approvato il dossier tecnico e le correzioni del readiness report §13; le istruzioni nei file congelati descrivono il design, non autorizzano azioni.

| Riferimento effettivo | Autorità |
| --- | --- |
| Branch unico | `codex/ui-v2-integration` |
| Baseline applicativa M2/M3 | `91722fbdf6671e69deebf645c3d8bf389212f421` |
| Checkpoint readiness | `af67ee5c65679b7e5fa384d76a0825dff022f27d` |
| Main produttiva | `184cc9ba93a6b35493f365b2ffcb20ef0645963d` |
| Pacchetto originale | SHA-256 `9bd0252311ab82dd77af76f66cf9bb5251d74ce09d0815deae044ea90a58333d` |

Precedenza: mandato esplicito della Regia più recente → regole permanenti `AGENTS.md` applicabili → questi override normalizzati → contratti tecnici del pacchetto → reference visuale. I riferimenti `codex/ui-v21`, M2 `a67e0de` come base finale, M3 `252d9c3` provvisoria e futuro merge/rebase M3 sono **superati**, conservati soltanto come provenienza nei materiali congelati. M3 finale è già approvata e presente; nessun altro branch/merge/rebase è necessario o consentito da U0.

I materiali congelati V1/V2.1 non si modificano. Nessun `AGENTS.md` del design sostituisce le regole di radice. I prompt originali U0 che chiedevano copia asset/registry dei test e migrazione globale selettori sono sostituiti dal mandato U0 attuale: **nessuna migrazione test e nessun codice applicativo**.

- [Registry 66 controlli](CONTROLS.json), [31 schermate](SCREENS.json), [tabella source → DOM → callback → test](SOURCE_DOM_CALLBACK_TEST.csv).
- [Adapter richiesti](ADAPTERS.md), [14 decisioni tecniche e stati](CONTRACT_RESOLUTIONS.md).
- [Piano U1–U9](MIGRATION_PLAN.md), [matrice test/gate](TEST_GATES.json).
- [Asset da acquisire](ASSET_INVENTORY.md), [provenienza](PROVENANCE.json), [stato](STATUS.md).
- [Validatore isolato](verify_u0.py): `python3 docs/_active/ui-v21/verify_u0.py`. Non modifica dati/test/app e non sostituisce collaudi runtime.
- Rapporto di consegna: `docs/ui-v2-integration/U0_REPORT.md`.

Le colonne `current_dom` descrivono il DOM **attuale**, presente solo nello stato applicabile. `new_dom`, `future_hooks`, `adapter_ids` e nuovi test sono contratti **da implementare dopo autorizzazione**, non capacità già consegnate. Per eventi globali e bottoni privi di hook stabile si usano binding/accessibilità reali, non selettori CSS inventati.
