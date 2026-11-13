# Scenario V06 — M0.1 / M0.1-R

**AUDIT COMPLETATO — IN ATTESA DI QUALITY GATE REGIA.** Consegna documentale pronta al checkpoint remoto; SHA effettivo, esito del push, confronto dei file remoti e PR sono verificati nella consegna finale. Un push fallito non vale come pubblicazione completata.

La Regia ha autorizzato il completamento delle pubblicazioni in questa sessione. Destinazione esclusiva: `codex/scenario-v06-audit-m01r`, derivato da `f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1`, in worktree documentale separato. Nessun merge/main/deploy o avvio di M0.2.

Il [rapporto](M01_AUDIT_REPORT.md) integra la decisione vincolante di migrare anche geometria e topologia operative a V06. L'addendum §15 prevale sulle strategie storiche. **NO-GO implementazione** finché il contratto AS-BUILT e le altre dipendenze non sono verificati e approvati.

Verifiche M0.1-R conservate: **254 test Node PASS, 9 test JMRI PASS, build PASS**. Per la pubblicazione sono riusate per identità dei 4.037 file della baseline verificata prima degli aggiornamenti documentali; non sono dichiarate nuove esecuzioni browser, V06 o hardware. Bundle: `1ac2022b781311ca3fcc03e6373a55fc56c45eabd714c56694e7107d12352378`.

I soli cambi previsti nel checkpoint sono rapporto, indice/stato/evidenze scenario e appendice PROGRESS. Codice, geometria, UI V2.1, dipendenze, workflow, asset e Supabase rimangono invariati. Le evidenze non includono GLB, sorgenti Drive completi, credenziali o URL firmati.

**Prossima azione:** review indipendente della Regia sul documento e sulle condizioni di autorizzazione; nessuna implementazione automatica.
