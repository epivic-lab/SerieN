> **DIRETTIVA PRODOTTO 2026-11-05 — REQUISITI FUTURI PERSISTENTI.** Fonte vincolante: [SERIEN_PRODUCT_REQUIREMENTS.md](../../product/SERIEN_PRODUCT_REQUIREMENTS.md). L'utente richiede per il futuro (1) applicazione dietro social login, (2) paywall e subscription verificati lato server, (3) multiutenza simultanea con persistente stato ferroviario privato per singolo utente/workspace e CAS fra dispositivi. Progettazione semplice e robusta; GitHub Pages + Supabase Free, nessuna dipendenza dal Mac. **6A.12-S1 PAUSA**, architettura da riallineare: Auth anonima non è la decisione finale, W non approvata come modello definitivo. Nessuna implementazione o mutazione produzione autorizzata da questa direttiva. Le annotazioni di gate sotto sono cronologia tecnica.

# Train Management — gate corrente

**6A.12-R DESIGN PROPOSTO — REVIEW REGIA PENDING — IMPLEMENTAZIONE/PRODUZIONE NON AUTORIZZATE.**

5 novembre 2026, Europe/Rome. Il cambio strategico6A.12-R supera operativamente
il piano6A.12-P, che resta storico e non autorizza hosting a pagamento.
6A.12-L sospesa; nessun WIP rilevato nei percorsi collegati, nessuna cancellazione.
6A.1–6A.11 restano approvate nei rispettivi perimetri di laboratorio; macrofase6A
aperta e R0P01–P18 non completati. Nessuna6B–6E avviata qui.

Base approvata `55d6bd6ef8211e9f136468090ff195f4ac791bde`, solo
`feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` congelata.
Checkout originale pulito su work/5c8f0f5 e stash assenti, preservati.
Git shell non raggiunge il proxy; letture GitHub autorizzate confermano checkpoint
e ancestry R1 (ahead12/behind0). Checkout isolato shallow/sparse con commit/tree/blob
verificati per hash, senza import di main o riscrittura della storia.
Dettagli del recupero nell'architettura, scratch in /workspace/work/6A12-R.

## Cinque deliverable

1. [Architettura browser-first gratuita e confine SQL](6A12R_FREE_BROWSER_ARCHITECTURE.md).
2. [Confronto identità e decisioni D09/D10](6A12R_D09_D10_DECISION.md).
3. [Audit reale in sola lettura e piano produttivo](6A12R_PRODUCTION_MIGRATION_PLAN.md).
4. [Limiti Free, fonti, dimensionamento e rischi](6A12R_FREE_LIMITS_AND_RISKS.md).
5. [Percorso breve e matrice R0P01–P18](6A12R_ROUTE_TO_COMPLETE_SERIEN.md).

Proposta W: mantenere WebCrypto P-256 e nuovi dati ownerless, Edge fidato con
attestazione interna e login SQL EXECUTE-only, claim nonce committato separatamente,
RLS su contesto verificato per transazione. Richiede **nuova decisione D09**:
non conserva identità session_user per-device o separazione UID/IPC del broker.
Compromissione Edge/issuer e credenziali privilegiate predefinite nel runtime sono
rischi espliciti. Nessun riuso diretto delle vecchie API basate sul principal.

Alternativa Auth anonima confrontata ma NON adottata: crea veri utenti Auth,
richiede deroga D10, membership/RLS e recovery dedicati; JWT non sostituisce nonce.
Proposta W conserva D10/provenienza/immutabilità e zero nuovi Auth; non dichiara
Auth0 reale, non cancella l'utente preesistente. L01 32/16 rimane FAIL storico:
cap aggregato connessioni Edge/Supavisor NOT VERIFIED e bloccante prima apertura.
Slot SQL di ammissione limitano transazioni, non connessioni.

## Audit produzione e gate

Unica destinazione futura `vehfrjgifzjjgamrgwze`, SerieN ACTIVE_HEALTHY,
Free/eu-west-3/PG17.11.0.003. Solo due migrazioni iniziali reali; dieci tabelle
pubbliche tutte esattamente0righe, Auth1, Storage0bucket/0oggetti, zeroEdge Functions.
Otto FK Auth CASCADE e13policy owner legacy ancora presenti; RLS su tutte10tabelle,
nessun grant tabella anon/authenticated nella vista role_table_grants osservata.
Nessun nuovo confine capability o immutabilità6A.5 distribuito. Advisors:1WARN
leaked password protection disabled, nessuna impostazione cambiata.
Audit parziale dichiarato: esposizione Data API, usage, ACL colonna/membership,
SSL/pooler e dipendenze esterne da completare prima di un'azione produttiva.

Backup reale NON eseguito: export completo, leggibilità e restore locale verificato
sono gate predeploy, insieme a inventario fresco, migrazioni minime revisionate,
test locali, forward-fix/rollback e feature flag server/client DISABLED.
Nessun progetto staging/clone remoto; rehearsal/restore solo locale effimero.
Approvazione del modello e approvazione di una specifica modifica produttiva sono
gate distinti; nessuna delle due è anticipata da questi documenti.

## Verifiche di questa microfase

- PASS: npm test **37unità file,0FAIL** (Node24.19.0), Python/JMRI **9test**, build,
  rigenerazione canonico senza diff. Log locali npm-test.txt/python-tests.txt/
  build.txt/canonical.txt in /workspace/work/6A12-R.
- PASS: perimetro esclusivamente cinque nuovi Markdown più PROGRESS/STATUS;
  25link locali e149righe tabellari controllati; scansione credenziali dei sette documenti.
  1784blob Git precedenti preservati salvo i due file di stato:1488materializzati
  confrontati per hash e296sparse conservati nell'indice. Rapporto locale verification.json.
- Invarianti ferroviarie/UI: nessun cambiamento a R1,150rail75bed,otto scambi,
  WX310/Journey/guardia, plancia/HUD/camera/minimappe, assets o topologia;
  canonical-layout e bundle ricostruito confrontati alla baseline.
  SHA-256 canonico e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc;
  bundle0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b.
- NOT VERIFIED in questa fase documentale: nuove suite SQL/HTTP/Chromium6A.11,
  browser/device alternativi, hardware, visuale/performance R1/5D completi;
  risultati precedenti solo ereditati, nessun nuovo PASS hosted/restore/backup.
- Sicurezza: solo SELECT e letture metadata Supabase; nessuna mutazione remota,
  creazione Auth, migrazione, deploy, secret letto/modificato o credenziale nei file.
  Nessuna modifica applicativa/backend/SQL/test/dipendenza/workflow/main.

Checkpoint atomico dei soli sette Markdown; pubblicazione fast-forward esclusiva
su feature/train-management tramite Git Data API con expected_sha e force=false,
dopo controlli e materializzazione locale del commit. SHA locale/remoto e file
verificati nella consegna; nessun esito di pubblicazione anticipato nel documento.
main remoto rilevato5c8f0f59a5914a4105a45ceef104e1e24f38163f, non modificato.

**Unica prossima azione: audit della Regia e approvazione esplicita del modello
W/D09/D10. STOP6A.12-R. La proposta6A.12-R.1 locale richiede nuova autorizzazione;
nessuna implementazione, produzione,6B–6E, main, deploy o merge autorizzati.**
