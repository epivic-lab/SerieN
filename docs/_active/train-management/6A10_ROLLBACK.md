# 6A.10 — rollback e recovery verificabili

D10 resta vincolante; la nuova migrazione è soltanto una proposta applicata al
PostgreSQL17 isolato. Nessun down o deploy gestito autorizzato.

| Momento | Prova locale | Azione sicura e condizioni |
|---|---|---|
| Prima del commit DDL | Errore SQL dopo ciascuno dei14passaggi: catalogo, ruoli e tutte le righe identici | ROLLBACK automatico della transazione, compresi FK/ACL/funzioni/registro. Nessuna disabilitazione di trigger |
| Backup precedente | pg_dump sintetico completo ripristinato su copia e confrontato con inventario e dati | Conservare dump/manifest/ACL/versioni e prova restore. Il confronto normalizza soltanto nomi RI/TOAST generati e rappresentazione ACL equivalente |
| Dopo DDL, prima di Auth delete e prime righe ownerless | REVOKE del solo creator→operatore negato; zero righe ownerNULL e tutti gli owner ancora risolti in Auth | Mantenere il percorso nuovo chiuso e lo schema espanso. Per un ritorno precedente servono anche freeze control-plane, export degli eventuali job/approvazioni e verifica completa delle vecchie FK/unique/default. Nessun down in-place dichiarato collaudato |
| Dopo eliminazione Auth | COUNT0 con dati storici intatti | La condizione di ripristino FK Auth non vale più. Nessun account fittizio per soddisfarla; conservare schema espanso e procedere con forward-fix |
| Dopo prima scrittura ownerless | Sul clone con revisioni1–3, REVOKE Save/Recover→write negato; ReadHead ancora200/revisione3, dati identici | Contenimento read-only dimostrato. Nessun NOT NULL owner reintrodotto, nessuna cancellazione di revisioni/ricevute/provenienza |
| Eventuale restore dopo nuove scritture | NOT VERIFIED su hosting | Richiede backup verificato, export durabile di ogni checkpoint/ricevuta post-backup, replay CAS/idempotente e riconciliazione su copia. Se non dimostrato, restare read-only e sottoporre la decisione alla Regia |

Le copie `n10_restore` e `n10_compat` vengono rimosse dopo la loro verifica; gli
originali della fixture primaria rimangono intatti. Il clone strutturale resta
separato dal C/D usato dal browser. Infine il runner rimuove esclusivamente le
risorse effimere nominate da lui. DROP DATABASE è solo cleanup di copie sintetiche
create dal test, non un rollback dei dati applicativi. Non compare DROP CASCADE.

Il rollback DDL non è il replay di una receipt di successo: nessun fault può
trasformare un errore in conferma parziale. La nonce dati viene committata prima
nel broker6A.9, quindi un Save fallito conserva il nonce e richiede una proof nuova.
Il request_id/envelope già confermato invece resta idempotente anche dopo head
avanzato. I test confermano entrambi i casi.

Read-only significa qui nessun nuovo checkpoint o modifica delle proiezioni. Claim
nonce, rate e audit delle letture restano operativi secondo6A.8/6A.5; non è il flag
PostgreSQL transaction_read_only, che bloccherebbe quel protocollo.
