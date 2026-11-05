# 6B.1 — Proposta per il salvataggio Auth Google (NON APPLICATA)

Questa è una proposta di protocollo e privilegi, non una migrazione eseguibile.
Nessuna query o scrittura è stata eseguita sul progetto `vehfrjgifzjjgamrgwze`.
Le tabelle/constraint storiche 6A.3 sono un riferimento; prima della futura
implementazione vanno confrontate con catalogo, trigger, ruoli e dieci policy
restrittive **effettivi**. Non importare D09/D10 o SQL ownerless.

## Identità, workspace e autorizzazione

Riutilizzare il client della pagina Google, tramite dipendenza esplicita; non
creare un secondo client. Il futuro adapter usa `auth.getUser()` e
`serien_access_allowed()` per lo stato dell'interfaccia. Il server rivalida sempre:
`auth.uid() IS NOT NULL`, allowlist e `owner_id = auth.uid()`; niente email nel DTO,
owner/UUID accettati come prova, user_metadata o service_role nel browser.

Per il primo workspace personale, associare il contesto persistente a una riga
`layouts` posseduta da `auth.uid()`; `workspaceId` può identificare quel workspace
personale e `layoutId` la sua topologia, mediante un binding server verificato.
Se tale binding non è già rappresentato, aggiungere soltanto la relazione minima
workspace–owner–layout (FK composite), dopo audit e autorizzazione. I UUID
`bindLocalContext` del laboratorio 6B.1 **non sono questo binding**.

Riusare `layout_snapshots` e `operation_receipts` per documenti immutabili e
ricevute. Aggiungere solo se assenti head/revision e vincoli per owner/context.
Non creare altri servizi, Edge Functions, principal per dispositivo o broker.
Non riscrivere in questa fase proiezioni ferroviarie: il documento versionato è
il checkpoint completo. Se una futura API modifica anche le proiezioni, deve
farlo nella medesima transazione, mai con N chiamate frontend.

## API minima

- `serien_read_head(workspace_id, layout_id)`: revisione decimale, snapshot ID,
  digest e versione; head nuovo `0`, snapshot nullo.
- `serien_read_snapshot(workspace_id, layout_id, revision)`: documento e ricevuta.
  Storico paginato per revisione, stesso controllo owner/allowlist.
- `serien_save_checkpoint(workspace_id, layout_id, expected_revision text,
  request_id uuid, state jsonb)`: ricevuta `{revision, snapshotId, request_id,
  digest, committedAt}`; il server non accetta `owner_id` come parametro.

Revisioni stringhe decimali canoniche, fino a signed bigint; request_id creato
una volta prima del primo invio e riusato per ogni retry dello stesso envelope.
Digest ricalcolato dal server su una rappresentazione canonica concordata
(JCS RFC8785, **non** il semplice JSON.stringify o jsonb::text); includere
operazione, workspace, layout, revisione attesa e documento. Limite 2 MiB prima
del parsing/canonicalizzazione, schema v1 chiuso e compatibilità/catalogo fissati.
I controlli browser di geometria e collisione non conferiscono autorizzazione al
DB; il server deve ripetere controlli strutturali, referenziali e compatibilità.

## Transazione CAS e idempotenza

1. Verificare sessione/allowlist e binding owner. Acquisire un lock transazionale
   per `(auth.uid(), request_id)` **prima** del lock head. Impedisce due richieste
   con lo stesso ID su layout diversi di superare la deduplica insieme.
2. Bloccare la riga head/layout autorizzata con `FOR UPDATE`. Ricontrollare
   allowlist/proprietà sotto lock; una rimozione allowlist concorrente deve avere
   un ordine di lock concordato con il percorso amministrativo di revoca.
3. Cercare la ricevuta `(owner_id, request_id)` prima del CAS: stesso envelope
   canonico restituisce la ricevuta originaria anche se head è avanzata; stesso
   request_id con envelope differente produce `IDEMPOTENCY_KEY_REUSED` senza
   scritture. Il confronto include layout, operation e revisione attesa.
4. Se head è diversa da expected_revision: `REVISION_CONFLICT` (HTTP 409 tramite
   mapping esplicito del client/API), nessun documento o receipt di successo.
5. Validare integralmente il documento; inserire snapshot immutabile R+1,
   aggiornare head con condizione CAS, inserire receipt e committare insieme.
   Eccezione in qualunque punto annulla tutto. Overflow bigint rifiutato.
6. Un timeout dopo commit richiede retry identico: non generare un nuovo ID,
   non dedurre successo dal solo timeout. Nessun UPDATE/DELETE dello storico.

Due sessioni dello stesso utente leggono la stessa base R: una sola può scrivere
R+1; la seconda conserva la propria copia e riceve conflitto. Nessun last-write-
wins, merge automatico di Journey o retry con revisione aggiornata di nascosto.
Il recupero da storico crea una **nuova** revisione con nuovo request_id e CAS,
indicando la revisione sorgente; non muove head all'indietro. Un futuro journal
condiviso tra tab deve memorizzare envelope immutabile e ricevuta atomicamente e
coordinare gli invii; BroadcastChannel/Web Locks aiutano l'UX, CAS resta decisivo.

## Privilegi minimi: affrontare il mancato GRANT

L'assenza attuale di privilegi `authenticated` è attesa: la 6B.1 non la aggira.
Una funzione `SECURITY INVOKER` con nessun privilegio sulle tabelle fallirebbe;
concedere CRUD al chiamante permetterebbe di aggirare il protocollo CAS/RPC.

Proposta da sottoporre al gate successivo: sole funzioni **specifiche** per
head/read/save, owned da un ruolo tecnico `NOLOGIN NOBYPASSRLS`, non proprietario
delle tabelle, non membro di postgres/service_role/authenticated. Nessuna funzione
generica (SQL dinamico, nome tabella, owner arbitrario). Il ruolo ha solo SELECT
su binding/layout/snapshot/receipt, INSERT su snapshot/receipt e UPDATE delle sole
colonne head; nessun DELETE, DDL, CREATE schema o modifica di owner/catalogo.
La creazione del binding iniziale richiede una RPC distinta, altrettanto limitata.

Se necessario, queste sole RPC possono essere `SECURITY DEFINER` con
`search_path=''`, oggetti qualificati e ownership del ruolo tecnico limitato;
**non** del ruolo postgres e **non** come correzione generica dei permessi.
RLS resta attiva e non bypassata: il ruolo tecnico deve avere policy esplicite
owner **e allowlist** (USING e WITH CHECK), preservando tutte quelle esistenti.
Non basta la sola clausola `TO authenticated`. Nessuna membership del ruolo
tecnico per anon/authenticated, nessun SET ROLE dal browser.

Esempio di superficie GRANT da completare con firme verificate:

```sql
-- SOLO proposta; non presente in supabase/migrations e non applicata.
REVOKE ALL ON FUNCTION public.serien_save_checkpoint(uuid,uuid,text,uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.serien_save_checkpoint(uuid,uuid,text,uuid,jsonb)
  TO authenticated;
-- Stesso REVOKE/GRANT soltanto per le due RPC read autorizzate.
-- Nessun GRANT CRUD sulle tabelle pubbliche ad authenticated/anon.
```

Schema privato per helper interni non esposti; nessun EXECUTE PUBLIC implicito.
Il ruolo tecnico non può leggere la allowlist privata direttamente: usa il
predicato verificato esistente, con permesso EXECUTE mirato da auditare. Le policy
sono valutate con `auth.uid()` del JWT originale anche dentro la RPC; testare
esplicitamente il comportamento sotto il ruolo tecnico, senza assumere che le
policy `TO authenticated` si applichino anche a esso. Nessun privilegio è concesso
finché questa configurazione non supera audit e test in DB locale.

## Gate richiesto prima del primo save

Isolamento A/B e account escluso; JWT assente/scaduto; accesso diretto Data API
negato; nessun owner reassignment; FORCE/RLS e ruolo RPC senza bypass; catalogo e
binding coerenti; due sessioni concorrenti; ID uguale/digest diverso; risposta
persa; fault dopo ciascuna scrittura; storico immutabile; revoca concorrente;
quote; SQL injection e search_path; advisors. Il collaudo del secondo account
Google autorizzato resta pendente. Questi sono test futuri, non PASS della 6B.1.

Riferimenti consultati: Supabase docs Auth Users e RLS tramite search_docs.
Il fetch del changelog pubblico ha ricevuto HTTP 403 dall'ambiente; non si
asserisce una verifica completa del changelog. Nessuna dipendenza aggiornata.
