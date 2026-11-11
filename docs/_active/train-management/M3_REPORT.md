# M3 — Deposito e inventario

M2 approvata dalla Regia a `a67e0de7fa01a968152cf47af3a744ea39034bcc`. Branch esistente `codex/train-management-m2`; main remoto `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, verificati prima di modificare codice. Working tree iniziale pulito.

## Fase A

[Contratto e verifica R1](M3_CONTRACT.md): distinte cinque categorie di identità, definita disponibilità/prenotazione dei record virtuali e riconciliazione con i confermati M2. Nessun trasferimento fisico disponibile: il comando addTrain esistente è un inserimento particolare, non il trasferimento di un record inventario; reset e diagnostica non sono operazioni di deposito.

Soluzione isolata confermata: nessuna modifica R1 necessaria, ingresso/uscita disabilitati. Il mandato autorizza B a questa condizione e C dopo l'implementazione, con checkpoint e STOP finale. Nessuna persistenza, release, main, deploy, E1 o redesign.

Baseline: verifiche in evidence/M3/baseline. B e C ancora NOT VERIFIED in questo checkpoint di contratto.
