# SerieN · Autumn Railways

Simulatore ferroviario web indipendente dal progetto **First**.

**Apri il gioco:** https://epivic-lab.github.io/SerieN/

## Versione 0.1 — prototipo isometrico

- Vista isometrica illustrata del plastico autunnale in scala N, 150 × 70 cm.
- Tre anelli ispirati ai raggi Kato R249, R282, R315.
- Tre locomotive selezionabili: BR 055, BR 216, BR 260.
- Consolle con velocità indipendenti, direzione, stop e luci simulate.
- Scambi cliccabili, inclusi due WX310 e deviatoi del fascio.
- Carri agganciabili/sganciabili in modo semplificato e quattro missioni.
- Giorno, tramonto e notte.
- Solo HTML/CSS/JavaScript: nessuna libreria o build necessaria.

### Stato della fedeltà al tracciato

Questa **non è ancora una replica geometrica esatta** del file RailModeller: l'organizzazione del fascio merci, le connessioni degli scambi, i punti di fermata e la fisica degli agganci sono approssimati. Il gioco è una prima base di sviluppo visuale e funzionale, non un emulatore ferroviario certificato. I movimenti non comandano la Z21 reale.

### Pubblicazione

GitHub Pages via workflow in `.github/workflows/pages.yml`. Per la prima attivazione, in **Settings → Pages → Build and deployment → Source**, selezionare **GitHub Actions**.

## Prossimi miglioramenti

1. Importazione topologica verificata del file RailModeller `.layout`, con lunghezze e scambi reali.
2. Supporto a instradamento completo dei quattro tronchini e runaround.
3. Movimento realistico dei carri con aggancio su estremità e controllo di occupazione.
4. Vista 3D/isometrica più ricca, dettagli e animazioni alla Train Station 3.

© progetto amatoriale originale. Non affiliato a Roco, Kato o agli editori dei giochi citati.
