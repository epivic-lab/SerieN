# 6A.10 — inventario e conservazione D10

Inventario effettivo del PostgreSQL17 isolato, non del Supabase reale. Fonti complete:
[evidence/6A10/inventory-before.json](evidence/6A10/inventory-before.json),
[inventory-after.json](evidence/6A10/inventory-after.json),
[inventory-restored.json](evidence/6A10/inventory-restored.json),
[manifest originale](evidence/6A10/manifest-before.json),
[manifest dopo DDL](evidence/6A10/manifest-after-ddl.json).
Il collector include tutte le colonne/default/NOT NULL/generated/ACL,219→234constraint,
indici, trigger interni ed esterni, corpi/owner/ACL/search_path delle funzioni,
RLS/FORCE/policy, default ACL per creator e dipendenze pg_depend.

Otto FK Auth verificate, tutte owner_id→auth.users(id) ON DELETE CASCADE, una per
ognuna delle otto tabelle sotto. Il preflight rifiuta qualsiasi FK Auth extra,
owner non risolvibile, generated domain inatteso o duplicato inventory per dominio.
È intenzionalmente fail-closed sul catalogo sintetico inventariato: un ambiente
gestito con ulteriori dipendenze Auth necessita inventario e autorizzazione propri;
questa migrazione non è dichiarata pronta per applicazione Supabase.

| Tabella | Prima | Dopo / vincoli conservati |
|---|---|---|
| stock_items | Owner NOT NULL/default auth.uid; Auth CASCADE; unique(owner,inventory) | Owner nullable senza default; provenienza RESTRICT; generated domain NOT NULL; unique parziale(domain,inventory) validata prima di ritirare la vecchia; model FK RESTRICT e unique(id,owner)/(id,domain) intatte |
| consists | Owner Auth; unique(id,owner)/(id,domain); ready deferred | Provenienza/domain totali, ready/revision/orientamento e indici intatti |
| consist_members | Owner Auth, parent/item ID NOT NULL; due FK owner e due domain; ordinal/item unique | Entrambe le domain FK sempre operative con ownerNULL; FK owner compatibili col legacy; contiguità, locomotiva0 e wagon successivi intatti |
| layouts | Owner Auth; topology/schema; unique(id,owner)/(id,domain)/(workspace,id) | Vecchi owner conservati; nuovi layout ownerNULL; topologia identica; unique intatte |
| layout_placements | Owner Auth; consist/layout owner/domain; edge/layout FK e ready/position | Due domain FK obbligatorie; stessi check edge/s/heading/Journey e versioni |
| loose_stock_placements | Owner Auth; item/layout owner/domain; esclusione member/loose | Due domain FK obbligatorie; stessi check e trigger, Journey/state_version conservati |
| layout_snapshots | Owner Auth; layout owner/domain, unique(layout,revision), tuple workspace/layout/snapshot/revision/digest | Nuove INSERT workspace ownerNULL; sette domain FK complessive intatte; immutabilità, metadata/checksum/compatibilità e indici intatti; nessun UPDATE storico |
| operation_receipts | Owner Auth; receipt_id PK, unique(workspace,request), legacy partial unique; tuple snapshot e completezza contesto | Nessun cambio a PK/idempotenza/result/request_context/auth_context/timestamp; nuova provenienza RESTRICT; nuove INSERT ownerNULL |

`stock_models` resta catalogo globale: nessuna riscrittura o nuovo modello da parte
del creator; C/D riusano i due modelli certificati del profilo sorgente. Ritirata
soltanto la policy Auth signed-in. `layout_segments` mantiene PK(layout,edge) e FK
parent CASCADE, nessun owner aggiunto; C/D creano la stessa proiezione sintetica
T47/248mm sotto layout nuovo con hash canonico invariato. Nessuna geometria R1 cambia.

Il registro `legacy_owners` contiene solo i due UUID storici verificati, istante di
backfill e versione6A10; nessuna email/password/JWT/Auth FK o autorizzazione runtime.
Nuove FK RESTRICT sono aggiunte e validate prima di togliere le otto CASCADE Auth,
nella stessa transazione sotto lock ordinati. Nessuna finestra esterna senza FK.
Le CASCADE interne fra parent/child restano: eliminare Auth non può più avviarle.

L'espressione generated è byte-identica all'expand6A.3: legacy:owner se workspaceNULL,
workspace:id altrimenti. Aggiunti NOT NULL e CHECK(owner IS NOT NULL OR workspace IS
NOT NULL) su tutte le otto tabelle. I sette FK path con ID parent NOT NULL sono
esercitati con ownerNULL su tutte le12coppie ordinate A/B/C/D:84dinieghi23503, con
nome della domain FK e nessun ACL42501 usato come prova referenziale. NULL/NULL è
respinto su tutte le otto tabelle; generated override, tuple receipt/head incomplete,
legacy→workspace e legacy owner1→owner2 sono provati separatamente.

Le righe mutabili impediscono cambio di PK/owner/workspace. Le INSERT workspace
richiedono ownerNULL su tutte le otto tabelle; gli owner non nulli già esistenti
rimangono provenienza e possono restare nei parent/proiezioni. SaveCheckpoint6A.5 è
riprodotta nella nuova migrazione cambiando esclusivamente l'assegnazione del nuovo
owner a NULL: medesimi validatore chiuso, lock, CAS, idempotenza, digest, quote,
receipt, owner SQL limitato e ACL. Le migrazioni6A.3–6A.8 non sono modificate.

Immutabilità snapshot/receipt e head→snapshot→receipt, FK catalogo/proiezioni, unique
ordinal/item/receipt e vincoli deferred rimangono attivi. Nessun trigger disabilitato,
nessun DROP CASCADE, nessuna riscrittura di ID/payload/digest/timestamp/result.
I manifest confrontano ogni riga pubblica e head originale, prima/dopo DDL, Auth
delete e browser. I nuovi dati C/D sono distinguibili; la fixture primaria non
aggiorna A/B. La prova di nuova scrittura compatibile A/B avviene su copia isolata,
con nuova revisione2 ownerNULL e revisione1 ancora leggibile.
