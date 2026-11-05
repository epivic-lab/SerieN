# SerieN — accesso ristretto

Questa versione introduce un blocco del **simulatore nell'interfaccia browser**:
il bundle di gioco si carica solo dopo sessione Supabase valida e risposta
`true` da `public.serien_access_allowed()`, che controlla un'email confermata e
presente nella allowlist privata `serien_access.allowed_emails`.

## Importante: limiti strutturali
GitHub Pages serve **file statici pubblici**. Il blocco nel browser non rende
privati HTML, JavaScript, asset e sorgenti presenti nel repository pubblico.
Non esiste protezione server-side della distribuzione statica. Tutti i dati
persistiti devono essere protetti da RLS/RPC: mai fidarsi del solo gate UI.

## Backend reale
- Il progetto Supabase contiene la migration `20261105155420` con schema privato,
  helper `serien_access_allowed`, dieci policy RLS restrictive.
- Le **due** email autorizzate sono custodite soltanto nel database, non nel repo.
- Il controllo richiede `auth.uid()`, `auth.users.email_confirmed_at` e corrispondenza esatta
  normalizzata; gli utenti Auth non autorizzati possono autenticarsi ma NON
  accedere al simulatore né ai dati ferroviari protetti.
- Gli utenti Auth esistenti non vengono eliminati; la persistenza per utente
  non è ancora stata integrata nel simulatore, quindi non è dichiarata funzionante.
- Il client usa unicamente una publishable key, mai service_role.

## Stato di attivazione — 2026-11-05

L'utente ha autorizzato espressamente l'accesso riservato e ha comunicato il completamento della rotazione OAuth. È stata inoltre pubblicata la pagina di prova separata `/SerieN/docs/auth-preview/`, con deploy GitHub Actions concluso con successo. Il test manuale con l'account principale ha mostrato ACCESSO AUTORIZZATO; l'utente ha confermato anche il rifiuto di un account non incluso nell'allowlist.

**Non dichiarati PASS:** prova del login di Sergio (rimandata per scelta dell'utente), prove con browser/dispositivi multipli, audit visuale completo del simulatore dopo la protezione. La rotazione e disattivazione della vecchia credenziale sono state comunicate dall'utente, non verificate in una console amministrativa dalla Regia.

La pubblicazione su main attiva esclusivamente la **schermata di login per avviare il gioco**. Non aggiunge la persistenza cloud, social login diversi da Google o paywall. Il codice statico continua a essere liberamente scaricabile da GitHub Pages.

**Verifiche post-deploy da fare:**
- Controllare Actions Pages = SUCCESS e pagina principale in finestra privata.
- Fare login con l'account principale e verificare caricamento delle locomotive, scambi, plancia e 3D.
- Logout, refresh e login negato per un account non autorizzato.
- Appena possibile, verificare login con Sergio e la sua sessione da un dispositivo diverso.
- Se il gate blocca l'account autorizzato o il gioco non viene caricato, bloccare la pubblicazione di ulteriori modifiche e ripristinare il precedente `index.html` e workflow dallo SHA `695174fdf44f107dddda35d4a7086d2594c2fb7d`, con nuovo commit di rollback non distruttivo su main. La migrazione RLS server-side **non** va rimossa nel rollback UI.

### Rischi noti
- Senza OAuth configurato, nessuno dei due utenti può entrare: il gate fallisce
  chiuso. Non pubblicare la modifica finché non è confermato.
- La verifica client non protegge il bundle pubblico da download diretto.
- I salvataggi cloud nominativi non sono ancora implementati: autenticazione e
  persistenza ferroviaria sono attività diverse.
- Google OAuth potrebbe creare utenti Auth non autorizzati. La lista privata
  non è un controllo **prima** del signup, ma nega l'accesso applicativo.
