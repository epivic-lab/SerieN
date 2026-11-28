# Union Pacific Big Boy — rapporto permanente L02

27 novembre 2026. Repository `epivic-lab/SerieN`. Sottofasi L02-A–G raccolte nella
consegna L02-H, autorizzata dalla Regia per audit, PR e rilascio controllato.

**Rilascio completato e chiusura L02-I verificata il 28 novembre 2026.**
[PR #29](https://github.com/epivic-lab/SerieN/pull/29) unita a main con SHA
`4809567631f273bde0f96231671f8dbd55f6e381`.
[CI PASS](https://github.com/epivic-lab/SerieN/actions/runs/46140609421) ·
[Pages PASS](https://github.com/epivic-lab/SerieN/actions/runs/46140901041) ·
[Applicazione pubblicata](https://epivic-lab.github.io/SerieN/).

La verifica pubblica ripetuta in I conferma hash, asset, worker e Auth invariati.
16 test mirati, 9 JMRI e build PASS; la suite completa di rilascio resta 589/589.
[Verbale e prove permanenti L02-I](evidence/L02-I/README.md).
Questa chiusura documentale non modifica il runtime e non avvia un nuovo deploy.

## Funzione consegnata

Train Management → On the layout → **Add Big Boy + tender** carica il modello su
richiesta e lo inserisce solo dove trova spazio per l'unità completa. Catalogo,
miniatura, vista laterale e progetti condividono l'identità `native-big-boy`.
La motrice con tender è un'unica unità fissa, con ingombro protetto di 260 mm
(128 mm davanti e 132 mm dietro l'origine). Non si può sganciare il tender;
gli agganci esterni sono rifiutati senza mutazioni. Selezione, avanti, STOP,
inversione, luci e rimozione utilizzano i comandi del simulatore.

Sette corpi articolati e 19 assi seguono la Journey esistente. Gli otto assi motori
hanno quartatura corretta; quattro biellismi nominali e il timone sono animati
in base all'odometro firmato. Le forme ferroviarie non sono state adattate al modello.

## Provenienza e risorse

Opera originale: **Steam Locomotive 'Union Pacific BigBoy'**, **Footloose**,
CC BY 4.0. [Attribuzione e trasformazioni](../../assets/rolling-stock/big-boy/ATTRIBUTION.md).
Asset runtime: `assets/rolling-stock/big-boy/model.glb`, 28.210.816 byte,
SHA-256 `14622eac1e9dc20e58411ceea59cf7ea053724936c637dbd2413596a5ba331e1`.
Il GLB qualificato L02-D è immutato. Ruote quartate, sostituzione del biellismo e
rilievo laterale dei supporti sono trasformazioni al caricamento, con manifest
versionati. Il file non richiede risorse esterne: buffer e immagini sono incorporati.
Il caricamento avviene alla richiesta dell'utente, non all'avvio dell'applicazione.

La distribuzione è una ricostruzione **visiva nominale**, non una certificazione
dimensionale da disegni ALCO. Il codice qualificato è condiviso fra banco e runtime
in `src/big-boy/`; il builder è `src/big-boy.js`. La sorgente GLB e le texture sono
condivise nella cache di sessione, mentre le geometrie delle istanze vengono
rilasciate alla rimozione. Le anteprime sono render del modello reale.

## Sicurezza ferroviaria e invarianti

I rettangoli dei sette corpi, derivati dai vertici referenziati, ricevono margine
longitudinale di 1 mm e laterale di 2,5 mm. Il loro inviluppo convesso articolato
entra nei controlli esistenti di spawn, conflitto e movimento campionato.
Il risultato è conservativo: può arrestare il treno prima del contatto visivo.
Le occupazioni coprono l'intera unità; uno scambio occupato rimane non manovrabile.

Nessuna modifica a rete, layout canonico, 150 mesh ferroviarie Legacy, controller,
scenografia, plancia, camera/HUD, integratore, guardia ferroviaria o Auth. Il solo
adattamento della logica anticollisione accetta una sagoma articolata dal Big Boy;
il percorso dei rotabili preesistenti resta invariato. Nessuna dipendenza runtime,
credenziale, servizio esterno, eval o HTML dinamico aggiunto. Configurazione Pages
esistente conservata; il service worker verifica gli hash degli asset statici.

## Evidenze della qualifica

- L02-F: 648 configurazioni senza riscontri non consentiti nel controllo BVH
  campionato, con esclusioni esplicite per giunti e attacchi. Errore massimo dalla
  quartatura nominale 0,078934°; scarto massimo di spostamento 0,009342 mm.
- L02-G: Legacy/V06, 19 assi, STOP, inversione, luci, giro normale oltre 4.387 mm
  tra campioni estremi; 15 tratti Legacy e 17 V06. Due cicli aggiunta/rimozione:
  memoria residua stabile, 239 geometrie e 78 texture. CPU diagnostica a treni
  fermi p50 1,6–1,7 ms e p95 2,5–2,6 ms; non sono FPS o tempi GPU.
- L02-H: 589 test generali, inclusi cinque dedicati al Big Boy; 11 cinematici,
  nove JMRI e build. Pacchetto Pages con tutte le 68 risorse del manifest, senza
  riferimenti runtime alle prove in `docs/_active/`.
- Il test dedicato di avvicinamento frontale ferma due treni prima della
  compenetrazione. Sulla curva R249 nei due sensi, a quattro fasi, tutti i vertici
  renderizzati sono contenuti nella sagoma protetta.

[Prove L02-F](../_active/rolling-stock/evidence/L02-F/README.md) ·
[Prove L02-G](../_active/rolling-stock/evidence/L02-G/README.md) ·
[Audit L02-H](../_active/rolling-stock/evidence/L02-H/README.md).
La validazione Linux della PR e il deploy restano identificati dai run collegati
alla PR. La verifica pubblica confronta manifest, bundle, GLB, anteprime, worker e
Auth con la build qualificata; controlla il cancello Auth senza login o bypass.

## Limiti e consegna alla Regia

R150 conserva il FAIL storico. Non sono certificati ogni itinerario deviato, ogni
combinazione di quattro treni, il contatto continuo ruota/scambio, carichi o ciclo
del vapore. Cutoff fisso e cinematica nominale. Agganci esterni non disponibili.
Audio udibile e intero percorso di autenticazione personale NOT VERIFIED.
Le prove funzionali pre-rilascio usano una fixture Auth solo nella pagina di test.

La Regia ha autorizzato L02-I rispondendo «si» alla proposta di verifica finale.
La verifica tecnica post-rilascio è conclusa; non si attribuisce all'utente un
collaudo manuale indipendente non osservato. **Nessuna sottofase successiva prevista.**
Nuovi rotabili, estensioni e modifiche richiedono una nuova richiesta.
