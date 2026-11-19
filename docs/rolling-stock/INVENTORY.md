# Inventario degli asset 3D di SerieN

Rilevazione Drive del **19 novembre 2026**. Nelle cinque sottocartelle sono presenti **27 file**, di cui 20 GLB e 7 ZIP. Due modelli sono già integrati in `main`. La Union Pacific Big Boy è l’unico rotabile in lavorazione.

Le intestazioni riprendono i nomi esatti delle cartelle nella libreria Drive fornita dall’utente. Le dimensioni sono espresse in MB decimali. Le licenze esplicitate sono state lette dai sorgenti o dalle attribuzioni versionate. Per le altre voci restano da verificare licenza, provenienza e possibilità di ridistribuzione prima dell’integrazione.

**Ripresa L02.** Aprire il [rapporto Big Boy](../_active/rolling-stock/STATUS.md#l02-a--union-pacific-big-boy), recuperare il sorgente da `01_Locomotive` e confrontarne lo SHA-256 con il [rilievo geometrico](../_active/rolling-stock/evidence/L02-A/geometry.json). La sequenza di lavoro delle altre voci è da definire.

## `01_Locomotive` · 9 file

| File sorgente | MB | Stato | Verifica per la ripresa |
| --- | ---: | --- | --- |
| `steam_locomotive_union_pacific_bigboy.glb` | 125,11 | In lavorazione · L02-A | Preparare la variante ottimizzata e mappare l’articolazione. [Rapporto L02](../_active/rolling-stock/STATUS.md#l02-a--union-pacific-big-boy) |
| `reading_i10sa_steam_locomotive.glb` | 34,94 | Da lavorare | Verificare scala, rapporto motrice–tender e parti del biellismo. |
| `br52_steam_locomotive_animation.glb` | 29,93 | Da lavorare | Ispezionare le clip e verificare la sincronizzazione alla distanza percorsa. |
| `steam_locomotive_drb_baureihe_50.glb` | 2,21 | Da lavorare | Verificare suddivisione motrice/tender, ruote e bielle. |
| `diesel_locomotive_tep70.glb` | 34,16 | Da lavorare | Verificare carrelli, assi di rotazione e costo delle texture. |
| `henschel_dhg_500_c.glb` | 0,27 | Integrata · L01 | [PR #28](https://github.com/epivic-lab/SerieN/pull/28) · [asset runtime](../../assets/rolling-stock/henschel-dhg-500-c/ATTRIBUTION.md). |
| `drb_01.10_steam_locomotive_low_poly.glb` | 5,09 | Da lavorare | Trattare la BR 01.10 come variante distinta dalla BR 01 integrata. |
| `br_01_german_steam_locomotive.glb` | 123,72 | Integrata · BR 01 | [PR #22](https://github.com/epivic-lab/SerieN/pull/22) · [asset runtime](../../assets/br01/ATTRIBUTION.md). |
| `electric_freight_locomotive.glb` | 21,45 | Da lavorare | GLB CC BY 4.0. Verificare carrelli, dimensioni e pantografi. |

## `02_Carrozze_passeggeri` · 7 file

| File sorgente | MB | Stato | Verifica per la ripresa |
| --- | ---: | --- | --- |
| `wright__sons_second_class_railway_carriage.glb` | 45,56 | Da lavorare | Verificare rodiggio, scala e costo delle texture. |
| `blue_indonesian_train_coach.glb` | 27,31 | Da lavorare | Verificare carrelli, ingombro e agganci. |
| `train_-_mark_3_carriage_buffet_rail_blue.glb` | 15,3 | Da lavorare | Verificare scala e carrelli in coppia con la Mark 3 Standard Open. |
| `train_-_mark_3_carriage_std_open_rail_blue.glb` | 15,19 | Da lavorare | Verificare scala e carrelli in coppia con la Mark 3 Buffet. |
| `coach.glb` | 1,15 | Da identificare | Titolo generico. Confrontare con `coach.zip` prima di assegnare una voce di catalogo. |
| `polar_express_coach_with_observation.glb` | 5,09 | Da lavorare | Verificare carrozza di osservazione, orientamento e agganci. |
| `gwr_coach.glb` | 7,85 | Da lavorare | GLB CC BY-NC 4.0. Verificare scala e carrelli. |

## `03_Carri_merci` · 4 file

| File sorgente | MB | Stato | Verifica per la ripresa |
| --- | ---: | --- | --- |
| `railway_boxcar_freight_wagon__detailed_3d_model.glb` | 0,8 | Da lavorare | Verificare assi o carrelli e posizione dei ganci. |
| `authentic_3d_indian_petrol-wagon_train_model.glb` | 231,21 | Da lavorare | Misurare geometria e texture per ridurre il costo del sorgente. |
| `train_liquid_tanker_wagon_queensland_railway_wse.glb` | 60,56 | Da lavorare | Verificare carrelli e costo delle texture. |
| `eanos_open_wagon.glb` | 0,61 | Da lavorare | Misurare ingombro e verificare carrelli e agganci. |

## `04_ZIP_da_verificare` · 6 file

| File sorgente | MB | Stato | Verifica per la ripresa |
| --- | ---: | --- | --- |
| `train.zip` | 12,31 | Da identificare | Contiene `source/train.glb`. Verificare identità e provenienza. |
| `train-with-interior-low-poly.zip` | 5,99 | Da verificare | Contiene un FBX e texture. Controllare identità e parti interne. |
| `train-freight-compartment.zip` | 2,24 | Da verificare | Contiene un RAR. Verificare formato, identità e provenienza del contenuto. |
| `old-amtrak-coach-car.zip` | 22,39 | Da verificare | Contiene un FBX e texture. Verificare scala e separabilità dei carrelli. |
| `industrial-train-dr14.zip` | 5,42 | Da verificare | Contiene un FBX e texture. Verificare parti mobili e provenienza. |
| `coach.zip` | 4,4 | Da identificare | Contiene `source/37295_fbx.zip`. Confrontare con `coach.glb`. |

## `05_Scenografia` · 1 file

| File sorgente | MB | Stato | Verifica per la ripresa |
| --- | ---: | --- | --- |
| `st-bartholomews-gatehouse.zip` | 23,1 | Scenografia | Contiene `source/Exports.7z`. Asset scenografico. |
