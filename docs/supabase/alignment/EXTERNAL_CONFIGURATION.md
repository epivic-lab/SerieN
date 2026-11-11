# S2 — Configurazioni esterne e gate PR

I tool Supabase connessi permettono progetto, storia, cataloghi e branch, ma non
espongono le configurazioni complete Auth/Data API. I relativi valori assenti
restano `null / NOT VERIFIED` nel manifest, senza valori dedotti dai default.

La Regia ha fornito in S3 le impostazioni osservate nello screenshot dashboard
GitHub Integration dell'11 novembre 2026: repository epivic-lab/SerieN, working
directory `.`, deploy to production attivo, production branch main, automatic
branching disattivato e nessuna Preview automatica nel piano corrente. Il
manifest le distingue come **USER_VERIFIED**, non come nuove letture autonome
di Codex. Nessuna impostazione è stata modificata.

| Impostazione | Controllo in sola lettura da completare |
| --- | --- |
| Provider Auth, anonymous sign-in, signup | Dashboard Authentication: leggere metodi/provider e impostazioni, senza Save o nuovi login |
| Site URL e redirect allowlist | Authentication → URL Configuration; registrare solo URL non segreti |
| JWT expiry e MFA | Leggere configurazioni Auth pertinenti, senza leggere chiavi JWT o token |
| Rate limit e protezione password | Leggere configurazioni Auth/Security; non attivare opzioni durante l'audit |
| Exposed schemas, extra search path, max rows | Integrations → Data API → Settings, senza modificare selezioni |
| Repo, working directory, production branch, deploy, automatic branching | USER_VERIFIED dalla Regia in S3; eventuale riconferma via Project Settings → Integrations → GitHub, senza salvare o riconnettere |

Con accesso amministrativo read-only, un'alternativa è leggere i corrispondenti
endpoint GET della Management API. Estrarre soltanto i campi non segreti elencati;
non pubblicare risposte complete che potrebbero contenere segreti provider/SMTP.
L'help qualificato di `supabase config diff` dichiara operazione read-only e scope
`auth_config_read`, `data_api_config_read` e altri scope di lettura. Non è stato
eseguito contro produzione: non esiste ancora una configurazione locale completa
da confrontare, e un diff con valori di default non certifica i valori mancanti.

## Preview: autorizzazione S3 alla sola Draft PR

La documentazione [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
descrive automatic branching e applicazione automatica delle migrazioni. La
[guida deployment](https://supabase.com/docs/guides/deployment) distingue deploy
da main e preview a pagamento. Il piano corrente dell'organizzazione è Free;
list_branches restituisce solo il record main, collegato al progetto principale,
ancora MIGRATIONS_FAILED con timestamp 29 ottobre. Il progetto è ACTIVE_HEALTHY.

In S2 queste osservazioni non dimostravano i toggle live e la PR non era stata
aperta. La successiva evidenza dashboard della Regia e il mandato S3 autorizzano
ora una **Draft PR di solo allineamento storico**, dopo diff e test conformi.
Non vengono richiesti né creati ambienti Preview a pagamento. Supabase Preview
non viene disattivata o aggirata: ogni check viene letto e riportato.

La release non aggiunge config.toml, seed, functions o versioni nuove: ripristina
soltanto due versioni già registrate. Storia e catalogo remoto sono confrontati
prima e dopo l'apertura PR. Se un processo automatico tenta operazioni produttive
inattese, STOP e segnalazione immediata: nessun tentativo di repair o correzione
produttiva è autorizzato.

**Il merge su main può avviare automaticamente il deployment Supabase**, perché
deploy to production è attivo. Anche il workflow Pages preesistente parte sui
push a main. Il merge non viene eseguito in S3; richiede ulteriore autorizzazione
della Regia e osservazione dell'esecuzione gestita. Sono attese zero migrazioni
pendenti, non una nuova applicazione del DDL storico. Tale attesa è verificabile
dalla storia ma non viene presentata come esito di un merge non eseguito.

Il vecchio record MIGRATIONS_FAILED non viene riparato o cancellato. Un eventuale
esito successivo va osservato nella futura fase autorizzata; healthy e cronologia
corretta non dimostrano da soli la risoluzione di quel metadata storico.
