import json
from pathlib import Path
root=Path(__file__).resolve().parents[3];docs=root/'docs/_active/train-management';ev=docs/'evidence/6A11'
x=json.loads((ev/'results.json').read_text());tests=x['tests']
# These references include the unchanged base checks as well as new Axx checks.
selectors={
'A01':['A01'],
'A02':['A02','08 reader Save','14 compact receipt'],
'A03':['A03','17 recovery'],
'A04':['A04','01 approved owner','SQL ceiling'],
'A05':['09 A cannot read B','wrong principal'],
'A06':['A06','02 invalid','10 altered','06 revoked','07 key version'],
'A07':['A07','03 identical','04 replay','05 replay','failed Save after durable claim','claim response lost'],
'A08':['A08','15 response lost'],
'A09':['16 real distinct'],
'A10':['A10','19 revoke'],
'A11':['A11','23 old open','13 SQL rejects'],
'A12':['A12','pair key different','forged invitation','scope injected','recovery kit','job incomplete'],
'A13':['A13','11 ingress','12 separate','18 browser catches'],
'A14':['A14','13 real password','definer observes'],
'A15':['A15','20 statement','20 kill','unreachable','18 browser','failed Save','claim response lost','04 actual'],
'A16':['A16','21 default','21 two-second','22 real idle','22 LRU','25 storage','25 nonce','27 graceful']}
observations={
'A01':('400/403 solo error, dati/autorità/job immutati, zero nuove lease; Origin valido e nessuna chiave.', 'HTTP/parser e proof, prima del pool'),
'A02':('Reader legge head/snapshot/history e receipt propria dopo downgrade; Save/Recover403; invite404. Oracoli SQL reader anche nella suite185.', 'HTTP/proof; SQL authorize scope'),
'A03':('Editor firma Save e recovery CAS; invito pubblico404, revoca/approve raw42501; receipt altrui404.', 'HTTP route; SQL scope e ACL'),
'A04':('Owner attivato solo da job privato key-bound; redeem ceiling editor nega job owner; nessuna route admin né privilegio DDL.', 'SQL lifecycle ceiling, ACL; HTTP'),
'A05':('A→B403 senza dati B; binding principal errato403. SQL185 distingue84FK fra domini e parent discordi, inclusi legacy/NULL.', 'HTTP proof/binding; SQL authorize; domain FK23503'),
'A06':('Firma/nonce/versione/key_id/tempo/epoch negati; sessione calda con expiry/epoch mutate403; trusted config stale workspaceEpoch/keyVersion403; downgrade SQL nega anche con scope cache owner.', 'Proof prima pool oppure authorize SQL corrente'),
'A07':('Gara due processi/distinti backend:200+409, una sola riga nonce; SIGKILL/restart e rollback Save non annullano claim committato.', 'Unicità/claim SQL durevole; REPLAY409'),
'A08':('8stesse proof:1successo+7replay;8nonce diversi stesso request_id:una receipt/revisione; ack perso e quota piena/head avanzato retry identico; digest diverso409.', 'Claim SQL vs idempotenza API separati'),
'A09':('Due browser/backend contemporanei sotto lock:200(rev3)+409REVISION_CONFLICT; head avanza una volta e nessun parziale.', 'CAS/lock/transazione SQL'),
'A10':('Save sospeso dopo claim, revoca COMMIT, poi403;9letture concorrenti sospese dopo claim tutte403 dopo revoca. Nessun dato protetto nelle risposte.', 'Lock/authorize SQL dopo revoca'),
'A11':('Nuovo principal/password e vecchia sessione negati; SIGKILL durante rotazione ripreso dallo stesso job; vecchio ruolo NOLOGIN, vecchia read in-flight403; receipt precedente identica.', 'SQL binding/key_version e lifecycle; proof old-key'),
'A12':('Job candidato/fingerprint/token/scope manipolati negati; crash prima/dopo activation risposte503 poi202/200,1binding; kit consumato resta negato dopo ulteriori crash.', 'HTTP schema/proof; ceiling SQL; journal job durevole'),
'A13':('RPC principal arbitrario negato; UID/mount/socket/nessuna rete SQL ingresso verificati; admin/static path404, risposta alterata bloccata dal browser; segreti assenti nei4asset serviti.', 'Broker ricalcola proof; Unix ACL/UID/mount; verifica browser'),
'A14':('Owner/editor raw SELECT/DML/CREATE/ALTER/GRANT/helper/revoke/approve42501; SET ROLE authorizer/executor/altrui negato. GUC JWT/workspace e ROLE worker non cambiano session_user, foreign read FORBIDDEN. Provisioning con membership addizionale respinto. RLS e7domain FK testate separatamente nei185.', 'ACL42501; RLS risultato vuoto; constraint23503/23514'),
'A15':('Timeout/kill backend dopo INSERT rollback; ack HTTP perso dopo COMMIT retry identico; kill broker/ingresso e SIGKILL Chromium dopo Save COMMIT nella fixture ownerless, digest alterato rifiutato. Config secret assente503 anche warm; journal000 lifecycle503/jobAPPROVED, dati indipendenti. Nessuna prova host/storage loss.', 'SQL transazione; error mapper; processo e store conservato'),
'A16':('Singolo:PG16,queue64,timeout2s,LRU/idle30s,workspaceB6successi nel picco; body413/header431/408,burst429,quote/page/response/audit senza parziali. Doppio:PG32, cap globale16 FAIL; diagnostica esclusa dai PASS.', 'HTTP limit; pool; quote SQL; multiistanza non supportata')}
rows=[];md=[]
for line in (docs/'6A7_EXECUTION_PLAN.md').read_text().splitlines():
 if not line.startswith('| A'):continue
 fields=[s.strip() for s in line.strip('|').split('|')];i,actor,expected=fields
 selected=[(j,t) for j,t in enumerate(tests) if any(s in t['test'] for s in selectors[i])];assert selected,i
 observed,layers=observations[i];result='PASS' if i!='A16' else 'FAIL'
 rows.append(dict(id=i,setup='Mixed legacy A/B plus ownerless C/D; Auth0, owner/editor/reader, confirmed revisions; details in referenced test setup and states.',action=actor,expected=expected,observed=observed,denialLayers=layers,result=result,supportedSingleBrokerResult='PASS',failureScope='Global resource budget in diagnostic two-worker mode' if i=='A16' else None,checks=[dict(test=t['test'],pointer=f'results.json#/tests/{j}',before=t['before'],after=t['after'],result=t['result']) for j,t in selected],additionalSql='ownerless-sql.json / states; RLS, FK/NULL, restore/legacy and per-role APIs',limitations='Multi-broker global resource support FAIL; hosting/host-loss NV' if i=='A16' else 'Lab only'))
 md.append(f'| {i} | {actor} | {expected} | {observed} | {layers} | {result} |')
(ev/'security-matrix.json').write_text(json.dumps(dict(source='6A7_EXECUTION_PLAN.md A01–A16 unchanged',cases=rows),indent=2,ensure_ascii=False)+'\n')
(docs/'6A11_SECURITY_MATRIX.md').write_text('''# 6A.11 — Matrice A01–A16

Criteri originali ripresi integralmente da [6A.7](6A7_EXECUTION_PLAN.md).
Esiti del laboratorio corrente, non approvazioni della Regia o staging.
Setup comune: fixture mista legacy A/B, Auth0, ownerless C/D, owner/editor/reader,
più revisioni/receipt confermate; precondizioni specifiche nel campo setup e negli
oracoli di ogni test. Azioni con firma P-256 e HTTP reali, SQL reale; probe raw
SQL soltanto dal supervisore fuori banda, mai da route pubbliche.

[JSON della matrice](evidence/6A11/security-matrix.json) collega ogni riga a indici
esatti di [results.json](evidence/6A11/results.json), con before/after SQL e
observed. Le mappe states/authorityStates contengono le righe integrali referenziate
per hash. auditMarkers associa request_id firmato a claim/dataCOMMIT. Per ogni
403/errore dati si verifica anche risposta error-only, immutabilità dati e, nei
denied helper, identità autorità/job; il claim nonce o audit di diniego previsto
può crescere e non è confuso con una scrittura applicativa non autorizzata.
I check di controllo/manipolazione fixture descrivono esplicitamente il cambiamento
operatore: non pretendono before=after per revoca, rotazione, CAS o fault orphan.
Gli oracoli sono nelle [estensioni](../../../tests/db/6A11/extensions.js) e
[suite integrata](../../../tests/db/6A11/adversarial.test.js).

| ID | Attore/azione originale | Atteso originale | Osservato | Livello del diniego | Esito |
|---|---|---|---|---|---|
'''+ '\n'.join(md)+'''

Le185prove [SQL ownerless](evidence/6A11/ownerless-sql.json) separano ACL, RLS e
constraint: non si deduce una RLS efficace da un solo42501. Il supervisore concede
SELECT temporaneo esclusivamente nel clone per dimostrare l'assenza di righe con
GUC legacy; nessun ampliamento permanente né modifica alle migrazioni. Tutte7FK
domain hanno84negativi fra12combinazioni, anche ownerNULL. Scope reader/editor,
CAS, recovery/immutabilità e ownerless compatibilità esercitati su SQL.

A07 sicurezza replay **PASS anche su due broker**; A16 budget globale **FAIL**.
I111PASS e la diagnostica separata non diventano un PASS di disponibilità multi.
''')
