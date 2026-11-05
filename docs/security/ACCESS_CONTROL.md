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

## Prima della pubblicazione su main (BLOCCANTE)
1. Preparare il progetto OAuth Google nella Google Cloud Console, con scope minimi.
2. Configurare **Google provider** in Supabase Auth e il callback
   `https://vehfrjgifzjjgamrgwze.supabase.co/auth/v1/callback`.
3. Impostare/consentire come redirect in Supabase
   `https://epivic-lab.github.io/SerieN/`.
4. Testare con ciascuna delle due identità autorizzate, una non autorizzata,
   una sessione nulla, login/logout, refresh e browser differenti.
5. Verificare che i tre casi negati non importino il gioco e che i dati rimangano
   non leggibili tramite API. Non concedere permessi larghi per superare il test.
6. Solo dopo esito PASS, autorizzare separatamente la modifica a `main`, che
   innesca la pubblicazione automatica su Pages.
Non configurare OAuth sulla base di password o client secret incollati in chat:
i segreti vanno inseriti nelle dashboard dei provider.

### Rischi noti
- Senza OAuth configurato, nessuno dei due utenti può entrare: il gate fallisce
  chiuso. Non pubblicare la modifica finché non è confermato.
- La verifica client non protegge il bundle pubblico da download diretto.
- I salvataggi cloud nominativi non sono ancora implementati: autenticazione e
  persistenza ferroviaria sono attività diverse.
- Google OAuth potrebbe creare utenti Auth non autorizzati. La lista privata
  non è un controllo **prima** del signup, ma nega l'accesso applicativo.
