# 6A.10 — Ownerless integration gate

**PASS tecnico nel laboratorio isolato; audit Regia PENDING. Macrofase6A ancora
BLOCKED. Nessuna6A.11 o6B avviata.** Data5novembre2026 (Europe/Rome).

Base6A.9 approvata `d7075c3a980f554ba8111f5a5478279f5ff6ddbd`, solo
`feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` immutabile.
Checkout/HEAD/working tree/ascendenza verificati prima delle modifiche. Main resta
indipendente e non viene importato. Nessun reset/clean/merge/rebase/force-push.
L'autorizzazione della Regia supera gli STOP documentali storici solo per6A.10.

## Risultato decisivo

**185 controlli SQL ownerless PASS e50 E2E Chromium/broker PASS su C/D ownerless.**
Il target PostgreSQL17.11 ha inizialmente2utenti Auth, due owner distinti, dati in
tutte le dieci tabelle applicative,4snapshot e4receipt. A/B esistono con provenienza
legacy e head1. Dopo il cutover e DELETE Auth nella sola fixture:

- **COUNT(auth.users)=0**, anche in entrambe le basi di test rimaste attive;
- registro privato con esattamente i2owner storici verificati, senza FK Auth;
- tutte le48righe pubbliche originali più2head identiche nella fixture primaria;
- C/D creati senza Auth con ownerNULL, domain workspace valido e head0 iniziale;
- nessuno snapshot/receipt inventato dalla procedura di creazione;
- C percorre tutte le API via Chromium→P-256→ingresso separato→broker6A.9→claim
  nonce COMMIT→principal dispositivo/TLS/SCRAM→PostgreSQL ownerless→COMMIT→verifica;
- D partecipa a pairing/letture/isolation/pool nel percorso browser e salva con lo
  stesso request_id di C sul clone SQL, con receipt e snapshot ownerNULL;
- su copia separata A/B committano nuova revisione2 ownerNULL e leggono revisione1;
- ogni snapshot/receipt storico, payload/digest/result/context/timestamp/ID resta
  intatto; nessuna disabilitazione di trigger o account Auth sostitutivo.

Prove: [zero Auth](evidence/6A10/zero-auth-proof.json),
[manifest iniziale](evidence/6A10/manifest-before.json),
[dopo DDL](evidence/6A10/manifest-after-ddl.json),
[prima del browser](evidence/6A10/manifest-before-browser.json),
[dopo browser](evidence/6A10/manifest-after-browser.json),
[clone strutturale](evidence/6A10/manifest-structural-final.json),
[compatibilità A/B](evidence/6A10/manifest-compat-final.json).
I namespace dei manifest distinguono copie e fixture primaria: nessuna revisione
confermata viene eliminata per riportare la primaria a head0.

## Migrazione, creator e sicurezza

Nuova proposta additiva `20261105090212_serien_ownerless_cutover.sql`, creata con
CLI Supabase3.0.0 secondo help corrente, in container effimero **network none**;
[log](evidence/6A10/cli-create.txt) e [help](evidence/6A10/cli-new-help.txt).
La CLI host aveva HOME read-only: eseguita la stessa CLI nel container, senza
cambiare HOME o configurazioni proxy. Nessuna chiamata CLI a progetto remoto.
Le quattro migrazioni6A.3–6A.8 e tutti i contratti restano byte-identici.

[Inventario e dipendenze](6A10_CONSTRAINT_INVENTORY.md) descrive8FK Auth→0,7domain FK,
NOT NULL/default/generated, unique/indici, trigger, funzioni/SECURITY DEFINER,
RLS/ACL/default creator e cascade indirette. Sostituzioni RESTRICT validate prima
della rimozione Auth nello stesso BEGIN sotto lock5s/statement30s. Provenienza
copiata soltanto da owner esistenti verificati. Nessuna migrazione automatica del
legacy verso workspace o riscrittura degli snapshot/receipt.

Owner nullable senza auth.uid(); CHECK ownership totale e generated ownership_key
NOT NULL. Le FK domain e tutti gli ID parent obbligatori restano; una FK owner che
salta su NULL non disattiva una domain FK. Nuova unicità inventory per dominio;
vecchi indici identity e deduplica receipt conservati. Identity guard sui mutabili
e ownerNULL per ogni nuova INSERT workspace. I vecchi owner non nulli restano nei
parent/proiezioni come provenienza, mai come autorizzazione Auth.

SaveCheckpoint mantiene il codice6A.5 cambiando **soltanto l'assegnazione owner dei
nuovi checkpoint a NULL**, anche su A/B: nessuna modifica a profilo chiuso,
canonicalizzazione, quote, lock, CAS, idempotenza, risultato, owner SQL limitato o
ACL. Il confronto sorgente automatico verifica esattamente questa differenza.
Gli archivi esistenti non sono aggiornati. Gli otto campi owner non ricevono più
un default Auth; i vecchi FK compositi owner restano per compatibilità legacy.

[ACL/RLS e confine operatore](6A10_ACL_MATRIX.md): ledger privato senza grant dati;
nessuna policy Auth residua e nessun nuovo grant anon/authenticated. Anche con
SELECT temporaneo nel clone, authenticated con claim dell'owner storico vede
zero righe su tutte le dieci tabelle; i grant sono poi annullati. I dinieghi FK sono
misurati sotto maintenance con ACL effettivo e SQLSTATE23503, separati da42501.

Il creator privato accetta solo job_id preapprovato fuori banda, vincolato a
session_user/gruppo operatore SQL non amministrativo. Role/target/source/audience
sono nel job server, non scelti dal browser. Executor NOLOGIN/NOBYPASSRLS/non
proprietario tabelle con RLS job-bound; nessun CREATEROLE o potere su capacità,
checkpoint o catalogo DML. Il broker non eredita quei ruoli. La procedura usa solo
il profilo certificato train+loose, crea nuove identità applicative e head0; retry
stesso job restituisce il medesimo esito iniziale senza doppia creazione. Nessun
endpoint amministrativo HTTP nuovo, catalogo generale o serializer/hydrator.

## O01–O14 — matrice autorizzata

[Test SQL](evidence/6A10/ownerless-sql.json) con185attesi/osservati e before/after,
sei stati applicativi deduplicati; [E2E](evidence/6A10/results.json) con50check,
stati/autorità redatti, nonce e job; [log completo](evidence/6A10/ownerless-tests.txt).
Le negazioni devono lasciare identico lo stato applicativo. Creazione, nuovi
checkpoint, CAS/recovery e revoca cambiano soltanto il contesto autorizzato.

| ID | Prova effettiva e oracle | Esito locale |
|---|---|---|
| O01 dataset misto |2owner Auth; dieci tabelle non vuote; ready/member/loose/placement;4snapshot/receipt e A/Bhead1; catalogo e pg_dump completi | PASS |
| O02 provenienza | Backfill dei soli2owner verificati; FK RESTRICT validate prima di staccare Auth; ogni riga identica | PASS |
| O03 zero Auth | Delete dei2utenti dopo detach; primary e clone strutturale entrambi0; C/D creati e salvati senza Auth | PASS |
| O04 ownerless | Otto tabelle con nuove righe ownerNULL; generated domain workspace valido; creator C/Dhead0 e nessun archivio inventato; job idempotente | PASS |
| O05 NULL matrix | NULL/NULL respinto su tutte8; workspace inesistente, generated override, parentID mancante, tuple receipt/head incomplete e identity mutation negate | PASS |
| O06 domini |7FKpath×12coppie ordinate A/B/C/D→84errori23503 con nome domain FK; legacy→workspace e owner1→owner2 negati; receipt C non può referenziare snapshot D | PASS |
| O07 ferroviari | Locomotiva0/wagon successivi, contiguità ready deferred, member/loose esclusivi, edge/s/heading, topology/STOPPED/8booleani; Journey originale esatto | PASS nel profilo chiuso |
| O08 atomicità | Fault reali dopo snapshot/train/loose/head/receipt/audit e constraint deferred; timeout4s e backend kill attraverso broker ownerless; nessun parziale | PASS |
| O09 CAS/idempotenza | Due browser e backend distinti:200/409; C/D stesso request_id indipendente; nuova nonce/stesso envelope dopo ack perso o head avanzato; digest/attore diversi negati; A/Bcompatibile | PASS |
| O10 storico | ReadSnapshot/ListHistory/ReadReceipt/RecoverRevision; nuova revisione non distruttiva, sorgente verificata, UPDATE/DELETE confermati negati; manifest originali identici | PASS |
| O11 eliminazione Auth | Auth delete non avvia alcuna cascade SerieN; DELETE ledger referenziato23503 con ACL maintenance; immutabilità attiva | PASS |
| O12 autorizzazione | Owner/editor/reader/revoked/cross-workspace; anon/Auth/raw/helper negati; RLS con claim vecchio owner; operator non autoapprova/crea ruoli/workspace raw; job foreign/unapproved negati | PASS |
| O13 inventory | Stesso codice C/D accettato; stesso dominio/legacy owner duplicato23505; preflight rifiuta conflitti senza rinomina | PASS |
| O14 rollback/recovery |14punti fault DDL incluso preCOMMIT, catalogo/ruoli/dati identici; restore copia provato; creator disabilitabile prima dei dati; dopo prime scritture read-only conserva head3 | PASS nel perimetro dichiarato |

Gli invarianti ferroviari non equivalgono a cattura/restore del simulatore. Il
profilo6A.4–6A.5 rimane volutamente chiuso. Nessuna modifica o nuova accettazione
per train engine, Journey reale, geometrie, WX310, HUD/console/camera o asset.

## Rollback e limiti delle prove

[Piano verificato](6A10_ROLLBACK.md): rollback transazionale dei14punti; backup
sintetico completo restaurato su copia con confronto dati e inventario/ACL effettivi.
Il dump verificato byte-esatto è in [backup.raw.json](evidence/6A10/backup.raw.json);
backup.sql rimuove soltanto la riga vuota finale dopo unrestrict per il controllo
whitespace Git, con entrambi gli hash conservati. Il restore cambia nomi fisici RI/TOAST basati su OID e può usare ACL owner-only
impliciti: entrambe le rappresentazioni raw sono conservate, semanticamente
normalizzate solo nel confronto schema. Nessun ID/riferimento applicativo è normalizzato.

Dopo DDL prima delle nuove scritture, disabilitato davvero il creator e verificate
le condizioni necessarie di reversibilità. Non si dichiara un down in-place dopo
eliminazione Auth. Dopo nuovi checkpoint e Auth0, revoke Save/Recover sul clone
nega scritture ma ReadHead conserva revisione3 e stato identico. Non si reintroduce
owner NOT NULL, non si ricrea Auth e non si elimina alcun checkpoint per tornare
alla base. Restore+replay post-write, PITR/host crash e secret-store loss **NOT VERIFIED**;
la soluzione collaudata è contenimento read-only con forward-fix da decidere.

I tentativi diagnostici hanno distinto i nomi RI/TOAST e ACL equivalenti durante
restore, corretto gli input dei test per isolare i vincoli, il mapping dei nuovi
segments al parent layout e due variabili/helper del runner. Non sono dichiarati
suite PASS. L'esecuzione finale completa usa gli stessi sorgenti registrati negli
[inputs](evidence/6A10/inputs.json); nessuna specifica/constraint approvata è stata
rimossa per far passare un test.

## Misure, regressioni e invarianti

[Misure ownerless](evidence/6A10/measured-summary.json):238campioni HTTP, p50
259.97ms/p953050.63ms/max4016.24ms, con fault/lock deliberati. Body risposta
p50288/p95372/max4808byte; non include framing/TLS e non misura capacità hosting.
Pool cap16/coda64 rispettati; batch96→80HTTP200/16backpressure503,4timeout2s, idle
reale31s e23LRU. Secondo broker solo replay/letture minime,2connessioni aggregate;
coordinamento cap globale **NOT VERIFIED**, seconda istanza rimossa prima del carico.
SQLoperator/lifecycle privilegiati restano fuori banda e separati dal data plane.

Rieseguite realmente le suite baseline su fixture separate:51SQL6A.3,45SQL6A.4,
141SQL6A.5,97SQL6A.8,72gateway6A.6,**50broker6A.9 originale legacy**,48HTTP e5Chromium
capability6A.2;12+25adapter; npm37file,9Python/JMRI ebuild. Queste50legacy sono
**distinte** dalle50ownerless; i runner approvati non sono modificati. Le regressioni
SQL storiche collaudano le loro migrazioni originali;185SQL e50ownerless collaudano
la nuova migrazione. [Indice/log](evidence/6A10/summary.json). Le evidenze storiche
6A.1–6A.9 sono preservate, non spacciate per nuove prove di hosting.

[Scope/hash/segreti](evidence/6A10/invariants.json): baseline6A.9 conservata salvo
PROGRESS/STATUS, una sola migrazione e nuovi test/documenti6A.10. Sorgenti broker/
gateway/adapter e tutte le dipendenze R1 intatte. Canonico SHA256
`e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc`;
bundle R1 `0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b`.
Il dump contiene solo fixture sintetiche e precede i ticket/secret browser;
nessuna password SQL, chiave privata o materiale di recovery è conservato.
[Cleanup](evidence/6A10/cleanup.json):4container,2network e5volumi propri assenti.

## R0 e proprietà ancora aperte

[R0P01–P18 originale](R0_ACCEPTANCE_MAPPING.md) rimane byte-identica. Esiti completi:
P01–P08 NOT VERIFIED (runtime capture/hydrate/composizione/tempo/UI non implementati);
P09/P10 PASS nel laboratorio per atomicità/idempotenza; P11–P13 NOT VERIFIED completi
(CAS/retry/corruzione backend PASS, mancano journal client/offline/restore/asset);
P14/P15 PASS locali, NOT VERIFIED per hosting; P16/P17 NOT VERIFIED; P18 PASS scope/
hash/Node/JMRI/build, NOT VERIFIED matrice visuale/performance S0–S7/5C/5D completa.
Nessun PASS di serializer/hydrator o del futuro gameplay deriva da questi test.

Zero query o modifiche al Supabase reale, zero staging, nessun Auth/RLS/ruolo/cloud/
Edge/deploy/main/Pages. Changelog pubblico403 tramite proxy; documentazione pubblica
Auth/RLS consultata tramite search_docs, senza interrogare un progetto. Proprietà
Supabase gestito/Supavisor, inventario diverso dal laboratorio, operatore/secret
manager produttivi, cap globale, costi/churn ruoli, crash host/PITR e recovery dopo
perdita dei segreti rimangono **NOT VERIFIED**. Nessuna6A.11,6A.12 o6B avviata.

Checkpoint atomico: commit che introduce questo rapporto, identificabile con
`git log -1 --format=%H -- docs/_active/train-management/6A10_OWNERLESS_GATE.md`.
Push normale solo feature/train-management; SHA locale/remoto e working tree sono
verificati nella consegna dopo il push. **STOP6A.10; unica prossima azione: audit
indipendente Regia. La macrofase6A non è chiusa.**

**Approvi il passaggio alla sottofase 6A.11?**
