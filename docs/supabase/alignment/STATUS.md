# S3 — Preparazione Draft PR e gate prima del merge

- Baseline main: `46f2655f4a5d332c2ea6adac2fb895b37ed87c4b`.
- S2 tecnicamente approvata: `a864de9f17c71775d60746f6432618343b8299ac`, CI 43003338052 PASS.
- Branch unico: `codex/supabase-alignment-s2`; nessuna integrazione sperimentale.
- Modifica S3: CI permanente su PR main, push main/S2 pertinenti e dispatch main/S2; documentazione aggiornata.
- GitHub Integration: USER_VERIFIED dalla Regia l'11 novembre; automatic branching disattivato, deploy produttivo su main attivo, working directory `.`.
- Draft PR: autorizzata dopo verifiche conformi. Nessun ambiente Preview a pagamento richiesto.
- Auth e Data API: valori ancora NOT VERIFIED, separati dalle impostazioni GitHub Integration ora confermate.
- Esiti del nuovo commit e della PR: leggere CI/check e rapporto S3 finale; nessun successo dedotto dalla presenza del YAML.
- Produzione: soltanto letture di storia/catalogo/stato e confronto prima/dopo; nessuna modifica autorizzata.
- Merge: **NON ESEGUITO**, può avviare deployment Supabase e Pages. Autorizzazione separata della Regia obbligatoria.

Vedere [S3](S3.md). STOP dopo Draft PR e rapporto, senza merge o ulteriori fasi.
