# S2 — Configurazioni esterne e gate PR

I tool Supabase connessi permettono progetto, storia, cataloghi e branch, ma non
espongono le configurazioni complete Auth/Data API o l'intera associazione GitHub.
I valori assenti restano `null / NOT VERIFIED` nel manifest: nessun default è
stato trasformato in un fatto sul progetto reale.

| Impostazione | Controllo in sola lettura da completare |
| --- | --- |
| Provider Auth, anonymous sign-in, signup | Dashboard Authentication: leggere metodi/provider e impostazioni, senza Save o nuovi login |
| Site URL e redirect allowlist | Authentication → URL Configuration; registrare solo URL non segreti |
| JWT expiry e MFA | Leggere configurazioni Auth pertinenti, senza leggere chiavi JWT o token |
| Rate limit e protezione password | Leggere configurazioni Auth/Security; non attivare opzioni durante l'audit |
| Exposed schemas, extra search path, max rows | Integrations → Data API → Settings, senza modificare selezioni |
| Repo, working directory, production branch, deploy, automatic branching | Project Settings → Integrations → GitHub, senza salvare o riconnettere |

Con accesso amministrativo read-only, un'alternativa è leggere i corrispondenti
endpoint GET della Management API. Estrarre soltanto i campi non segreti elencati;
non pubblicare risposte complete che potrebbero contenere segreti provider/SMTP.
L'help qualificato di `supabase config diff` dichiara operazione read-only e scope
`auth_config_read`, `data_api_config_read` e altri scope di lettura. Non è stato
eseguito contro produzione: non esiste ancora una configurazione locale completa
da confrontare, e un diff con valori di default non certifica i valori mancanti.

## Preview: PR non aperta

La documentazione [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
descrive automatic branching e applicazione automatica delle migrazioni. La
[guida deployment](https://supabase.com/docs/guides/deployment) distingue deploy
da main e preview a pagamento. Il piano corrente dell'organizzazione è Free;
list_branches restituisce solo il record main, collegato al progetto principale,
ancora MIGRATIONS_FAILED con timestamp 29 ottobre. Il progetto è ACTIVE_HEALTHY.

Queste osservazioni e la documentazione generale non sono una verifica completa
dei toggle live o dell'effetto di un evento PR su questa integrazione. Il vincolo
della Regia richiede quella prova: **non aprire la PR**. Non viene disattivata né
aggirata Supabase Preview. Il checkpoint del branch S2, espressamente autorizzato,
resta distinto dall'apertura PR e non modifica main, il cui ref è verificato.

Prima di una futura PR occorre confermare mapping e opzioni live, target delle
esecuzioni e assenza di seed/config/functions applicabili al progetto produttivo.
S2 non aggiunge config.toml, seed, functions o versioni nuove: ripristina soltanto
due versioni già registrate. Questo riduce il delta atteso, ma non autorizza una
PR sulla base di un comportamento non dimostrato. Nessun test provocativo della
Preview viene eseguito per scoprirne gli effetti.

Il vecchio record MIGRATIONS_FAILED non viene riparato o cancellato. Un eventuale
esito successivo va osservato nella futura fase autorizzata; healthy e cronologia
corretta non dimostrano da soli la risoluzione di quel metadata storico.
