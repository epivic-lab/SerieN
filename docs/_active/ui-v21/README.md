# UI V2.1 — autorità d'integrazione normalizzata

**Stato corrente — UI V2.1 VISUAL PARITY HOTFIX: READY FOR REGIA VISUAL REVIEW.** Il mandato completo autorizza la ricostruzione sul solo branch `codex/ui-v21-visual-parity`, derivato dalla produzione `d77b8aa2710fa474fdb069b204705364b4a9e7e6`, e la consegna in PR Draft. La UI pubblicata resta in attesa di accettazione visiva; i precedenti verdetti tecnici non valgono come approvazione estetica.

Ripristinate la griglia Claude e le superfici originali: a1692×877 dock502→156px e viewport300→612,11px, tre console visibili e quattro pannelli sidebar. Cinque viewport desktop con scarto0px dei bounding box esterni rispetto al vero HTML `cf2c29a`; sette confronti completi, adattamenti mobile/tablet dichiarati. PASS254Node,9Python,build/canonico,11scenari5C,6gruppi UI/HUD con16stati,5gruppi RAF nativo/125frame,5gruppi picking/cleanup,28stati missione e sette controlli console/overflow. Ultimo affinamento solo CSS delle missioni strette, con provenienza e verifica mirata distinte.

Motore,150rotaie,topologia,8scambi/WX310,R1,M1/M2/M3,Auth/Supabase/RLS/persistenza,asset e CSS frozen,workflow e dipendenze preservati;132file protetti byte-identici. Prove browser con bootstrap Auth solo locale; OAuth live, hardware fisico/altri browser e certificazione WCAG completa NOT VERIFIED. Produzione e PR #7 documentale non modificate.

Prevalgono il mandato completo hotfix e [STATUS.md](STATUS.md). Consegna corrente: [VISUAL_PARITY_REPORT.md](VISUAL_PARITY_REPORT.md) e [galleria](evidence/VISUAL_PARITY/GALLERY.md). Stop alla PR Draft per accettazione visiva; nessun merge/deploy.

## Provenienza U0 e integrazione precedente — storica

La tabella seguente descrive il mandato originario d’integrazione. Branch e main storici non sono l’autorità del nuovo hotfix.

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
