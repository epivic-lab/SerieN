# M3 — Deposito e inventario

M2 approvata dalla Regia a `a67e0de7fa01a968152cf47af3a744ea39034bcc`. Branch esistente `codex/train-management-m2`; main remoto `184cc9ba93a6b35493f365b2ffcb20ef0645963d`, verificati prima di modificare codice. Working tree iniziale pulito.

## Fase A

[Contratto e verifica R1](M3_CONTRACT.md): distinte cinque categorie di identità, definita disponibilità/prenotazione dei record virtuali e riconciliazione con i confermati M2. Nessun trasferimento fisico disponibile: il comando addTrain esistente è un inserimento particolare, non il trasferimento di un record inventario; reset e diagnostica non sono operazioni di deposito.

Soluzione isolata confermata: nessuna modifica R1 necessaria, ingresso/uscita disabilitati. Il mandato autorizza B a questa condizione e C dopo l'implementazione, con checkpoint e STOP finale. Nessuna persistenza, release, main, deploy, E1 o redesign.

Baseline: verifiche in evidence/M3/baseline. B e C ancora NOT VERIFIED in questo checkpoint di contratto.

## Fase B — minimo utilizzabile

Implementata vista Depot nella finestra M1/M2. Catalogo unico di 14 modelli e miniature già presenti; nessun nuovo asset, renderer o dipendenza. Record di inventario in RAM con ID `depot:<UUID>` e codice D001… stabile nella sessione, anche per modelli uguali. Stati Available/Reserved for planning, assegnazione esclusiva a un posto confermato con modello uguale, rilascio e rimozione solo virtuali. Un elemento prenotato richiede rilascio prima della rimozione.

Riferimenti `(projectId, vehicleId)` nel solo inventario: M2 non viene mutato. Getter di snapshot read-only nella vista Projects; nessuna modifica al dominio `src/train-projects.js`. Riordino/rinomina/orientamento mantengono la prenotazione; modifiche non confermate e annullamento usano i confermati originali; conferma che rimuove/cambia un posto rilascia il riferimento con avviso, senza sostituzione automatica con modelli uguali.

Liste distinte di posti progettati virtuali (con avviso di bozza aperta) e stock R1 fisico in sola lettura, agganciato o sganciato sul binario. Il reset aggiorna la generazione e l'insieme fisico senza perdere inventario o progetti. Nessun gruppo fisico viene detenuto dal deposito. Ingresso/uscita disabilitati con spiegazione; nessun richiamo a reset/addTrain/diagnostica o comandi ferroviari dal codice M3. Guard beforeunload esteso all'inventario; dispose libera store/UI/handler. Nessuna modifica ad app.js.

### Prove B

- **254 Node, 9 Python, build, canonico rigenerato invariato: PASS**. Nove nuovi test di dominio, inclusi errori atomici, identità duplicate distinte, riferimenti M2, annullamento/conferma/riordino, riconciliazione e reset.
- **Browser funzionale M3 PASS**, nove gruppi sul bundle minificato, auth locale e rendering su richiesta. Desktop 1440×1000, tablet 1024×768 e 768×1024, tap create/remove, controlli ≥44px, nessun overflow. Zero errori pagina, risposte HTTP fallite o richieste fallite. Prove in evidence/M3/implementation.
- **Lifecycle PASS**: inventario senza progetti attiva guard; close/reopen conserva record; rimozione ultimo record rimuove guard; dispose e 25 cicli create/open/add/dispose senza residui osservabili. Evento beforeunload sintetico, non una prova della presentazione del prompt nativo.
- Primo avvio del test browser FAIL del predicato: restituiva il callback del frame, che Playwright invocava senza timestamp. Corretto con `Boolean(...)`; codice applicativo e bundle invariati. Fallimento originale conservato. Esecuzione conclusiva PASS.

C ancora NOT VERIFIED a questo checkpoint. Prossima azione: regressioni M1/M1.1/M2/R1 e prova nativa con tre treni, senza altre funzionalità.
