# Train Management — gate corrente

**6A.1–6A.8 APPROVATE nei rispettivi perimetri — 6A.9 PASS tecnico di laboratorio,
audit Regia PENDING — MACROFASE6A BLOCKED — 6B NON AUTORIZZATA.**

Base approvata6A.8 `d6aa13001ae10d23b2b3c8c6e45e1dcf8f4e3764`; branch esclusivo
`feature/train-management`; R1 `348bfeff12c4005657098d89ea1d3c2ccdda9910` intoccabile.
Audit ripresa conferma checkout/lavoro6A.9 conservati, nessuno stash/WIP da ricostruire.
Main avanzato indipendentemente non importato, nessun merge/rebase/reset/clean.

[Rapporto6A.9](6A9_BROKER_GATE.md), [confini e threat model](6A9_SECURITY_BOUNDARIES.md),
[risultati](evidence/6A9/results.json), [indice suite](evidence/6A9/summary.json),
[misure effettive](evidence/6A9/measured-summary.json),
[scope/hash/scan](evidence/6A9/invariants.json).

Browser WebCrypto→ingressoHTTP senza credenzialiSQL→broker Unix privato UID distinto→
proof originale verificata→claim_nonce6A.8 COMMIT→driver pg8.23.1 TCP/SCRAM/TLS→API
private6A.5 COMMIT→verifica browser. Pool lazy a principal/versione fissi con cap16,
coda64, attesa2s, idle30s; niente SET ROLE/Docker nel data plane. Supervisor privilegiato
solo fuori banda per prepare/approve/LOGIN+complete dei job. D09=A invariata: broker
fidato, PostgreSQL non verifica P-256; migrazioni/contratti approvati intatti.

**50E2E nuovi PASS**,15sottoprove trasporto/ACL. Pairing owner/editor/reader, chiave
persistita al reload, replay dopo restart/secondo processo, revoca e keyVersion dopo
claim, CAS con backend distinti, ack perso/idempotenza, history/receipt/snapshot,
timeout/kill/risposta corrotta, lifecycle interrotto, recovery kit monouso, rotazione
con vecchia sessione negata. Journal lifecycle esclusivo/fsynced solo lab per i
candidati non ancoraLOGIN; non è un fallback del claim SQL dati né un servizio nonce
produttivo. Secret adapter file privato non certifica recovery dopo perdita volume.

Pool sotto carico con una istanza: peak16/queue64, batch96→81HTTP200/15HTTP503,
4timeout2s, idle reale31s,25LRU. Secondo broker solo prova replay/letture minime,
2connessioni aggregate; cap globale multiistanza NOT VERIFIED. Shutdown0sessioni e
assenza di tutti i container/network/volumi propri dopo cleanup verificati.

Rieseguite regressioni51/45/141SQL6A.3–6A.5,97SQL6A.8,72E2E gateway6A.6 (distinti dai
50nuovi),48HTTP e5Chromium6A.2,12+25adapter; npm37file,9Python/JMRI ebuild. Canonico,
bundle R1, runtime/UI/asset/topologia, dipendenze root e R0P01–P18 byte-identici.
Validatore sintetico chiuso6A.4–6A.5, nessun serializer/hydrator generale.

**BLOCKED per chiusura6A:** ownerless D10 non implementato, proprietà hosted di
provisioning principal/segreti/rotazione/rete Supabase/Supavisor/costi e cap globale
NOT VERIFIED; perdita host/secret store, PITR, browser alternativi e matrice visuale/
performance R1 completa non certificati. Legacy owner sintetico non vuoto conservato.
Zero query o modifiche al Supabase reale, zero staging, main/Pages/deploy, UI persistenza,
autosave/offline/outbox/asset/motore o6B. Nessuna6A.10 iniziata.

Checkpoint6A.9 identificabile con `git log -1 --format=%H -- docs/_active/train-management/6A9_BROKER_GATE.md`;
SHA remoto/locale e working tree verificati dopo push normale nella consegna finale.
**Unica prossima azione: audit indipendente Regia; STOP6A.9.**
