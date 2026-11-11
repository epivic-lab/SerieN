# UI V2.1 — U1 Asset Staging & Isolated Visual Foundation

**U1 READY FOR REGIA REVIEW — STOP. U2–U9 non autorizzate.** U0 e Font Gate approvati; autorizzazioni U1 duplicate identiche conservate una volta.

Branch codex/ui-v2-integration, checkpoint iniziale locale/remoto `65b910bc25def1f0064a0758e29f8d5715314568`, baseline applicativa `91722fbdf6671e69deebf645c3d8bf389212f421`, main `184cc9ba93a6b35493f365b2ffcb20ef0645963d` verificati.

19 file staging inattivi in ui/: 5 CSS,6 texture,1 sprite,3 WOFF2 approvati,3 licenze e manifest. Unico import Google Fonts rimosso dalla copia tokens V1 con diff; CSS/token design altrimenti verbatim, sette simboli TM visivi aggiunti alla copia sprite. Nessun asset ferroviario sovrascritto, nessun index/runtime collegato ai fogli.

Fixture isolata 1440×900: HTTP200 su tutti gli asset locali, font loaded/pesi/famiglie reali, no synthetic, nessuna richiesta esterna o script/errori, offline locale PASS. Cascade misurata su sette campioni con/senza legacy: zero differenze non spiegate. Screenshot HTTP ispezionato. Build/bundle identico PASS,226file protetti byte-identici a baseline. Nessuna suite storica ripetuta o evidenza U0/PRE-U1 sovrascritta.

[Rapporto U1](U1_ASSET_STAGING_REPORT.md), [evidenze](evidence/U1/). UI integrata/altri viewport/browser/hardware NOT VERIFIED, non deducibili dal campione statico. SHA checkpoint e verifica remoto nella consegna.

Prossima azione unica: review Regia U1 e nuova autorizzazione U2. Nessun merge/rebase/reset/deploy/release.
