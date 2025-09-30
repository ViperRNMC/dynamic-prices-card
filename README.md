# Dynamic Prices Card

[![HACS Default](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/integration)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/ViperRNMC/dynamic-prices-card)](https://github.com/ViperRNMC/dynamic-prices-card/releases)

Een geavanceerde Lovelace kaart voor Home Assistant die dynamische energieprijzen visualiseert in zowel timeline als cirkel weergave. Geïnspireerd door price-timeline-card met uitgebreide functionaliteit.

## ✨ Features

### 📊 Dubbele weergavemodi
- **Timeline modus**: Horizontale balkengrafiek met uurlijkse prijzen
- **Cirkel modus**: Elegante cirkelweergave met huidige prijs focus

### 🎨 Intelligente kleurcodering  
- Automatische kleuring boven/onder daggemiddelde
- Turquoise voor lage prijzen, oranje voor hoge prijzen
- Aanpasbare kleurenschema's

### 📱 Geavanceerde interactie
- **Tijdslider**: Navigeer door uren (cirkel modus)
- **Responsief ontwerp**: Werkt perfect op alle schermgroottes
- **Huidige tijd indicator**: Duidelijke markering van nu

### ⚡ Uitgebreide ondersteuning
- **Meerdere data formaten**: Nordpool, Tibber, ENTSO-E, Frank Energie, price-timeline-card
- **Flexibele eenheden**: €/kWh of centen weergave
- **Lokalisatie**: Nederlands en Engels
- **Theme ondersteuning**: Light, dark en automatisch

## Installatie

### HACS (Aanbevolen)

1. Open HACS in Home Assistant
2. Ga naar "Frontend"
3. Klik op de drie stippen in de rechterbovenhoek
4. Selecteer "Custom repositories"
5. Voeg `https://github.com/ViperRNMC/dynamic-prices-card` toe
6. Selecteer categorie "Lovelace"
7. Klik "Add"
8. Zoek naar "Dynamic Prices Card" en installeer

### Handmatige installatie

1. Download `dynamic-prices-card.js` van de [releases](https://github.com/ViperRNMC/dynamic-prices-card/releases)
2. Plaats het bestand in `config/www/`
3. Voeg het volgende toe aan je Lovelace resources:

```yaml
resources:
  - url: /local/dynamic-prices-card.js
    type: module
```

## Configuratie

### Timeline weergave (standaard)

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Energieprijzen vandaag
```

### Cirkel weergave met slider

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Energieprijzen 
timeline: false
slider: true
```

### Frank Energie configuratie

```yaml
# Basis configuratie voor Frank Energie
type: custom:dynamic-prices-card
entity: sensor.current_electricity_price_all_in
title: Frank Energie Prijzen
timeline: true
hours: 24
color_coding: true
unit_in_cents: false
```

```yaml
# Frank Energie met cirkel weergave
type: custom:dynamic-prices-card
entity: sensor.current_electricity_price_all_in
title: Frank Energie
timeline: false
slider: true
color_coding: true
```

```yaml
# Frank Energie met meerdere sensoren
type: custom:dynamic-prices-card
entity: sensor.current_electricity_price_all_in
title: Elektriciteit (All-in)
average_entity: sensor.average_electricity_price_today_all_in
timeline: true
hours: 48
```

### Geavanceerde configuratie

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Energieprijzen komende 24u
timeline: true
hours: 24
color_coding: true
unit_in_cents: false
theme: auto
average_entity: sensor.nordpool_average_price  # optioneel
```

## 🔧 Configuratie opties

| Parameter | Type | Default | Beschrijving |
|-----------|------|---------|--------------|
| `entity` | string | **Verplicht** | Sensor entity voor energieprijzen |
| `title` | string | "Dynamic Prices" | Titel van de kaart |
| `timeline` | boolean | `true` | Timeline (`true`) of cirkel (`false`) weergave |
| `slider` | boolean | `false` | Tijdslider voor navigatie (alleen cirkel modus) |
| `hours` | number | 24 | Aantal uren om te tonen |
| `color_coding` | boolean | `true` | Kleurcodering boven/onder gemiddelde |
| `unit_in_cents` | boolean | `false` | Toon prijzen in centen in plaats van €/kWh |
| `theme` | string | `"auto"` | Thema: `light`, `dark`, of `auto` |
| `average_entity` | string | - | Optionele aparte entity voor daggemiddelde |

## 🔌 Frank Energie Integratie

Deze kaart heeft speciale ondersteuning voor de [Frank Energie Home Assistant integratie](https://github.com/HiDiHo01/home-assistant-frank_energie).

### Ondersteunde Frank Energie sensoren:
- **Elektriciteit**: `sensor.current_electricity_price_all_in`
- **Gas**: `sensor.current_gas_price_all_in` 
- **Gemiddelden**: `sensor.average_electricity_price_*`
- **Min/Max**: `sensor.*_min`, `sensor.*_max`
- **Upcoming**: `sensor.*_upcoming_*`

### Frank Energie data formaat:
```json
{
  "state": "0.234",
  "attributes": {
    "prices": [
      {
        "from": "2024-01-01T00:00:00+01:00",
        "till": "2024-01-01T01:00:00+01:00",
        "price": 0.234
      }
    ]
  }
}
```

## Sensor vereisten

De kaart verwacht een sensor die prijsdata levert in een van de ondersteunde formaten:

### Algemeen formaat:
```json
{
  "state": "0.23",
  "attributes": {
    "prices": [
      {
        "datetime": "2024-01-01T00:00:00+01:00",
        "price": 0.23
      },
      {
        "datetime": "2024-01-01T01:00:00+01:00", 
        "price": 0.25
      }
    ],
    "unit_of_measurement": "€/kWh"
  }
}
```

## Compatibele sensoren

Deze kaart werkt goed met:
- **Nordpool sensor**: Gebruikt `raw_today` en `raw_tomorrow` attributen
- **ENTSO-E sensor**: Gebruikt `data` attribuut met prijslijst
- **Tibber sensor**: Gebruikt `current_price` en prijslijsten
- **Frank Energie sensor**: Gebruikt `prices` attribuut met `from`, `till`, `price` formaat
  - `sensor.current_electricity_price_all_in` - Huidige elektriciteitsprijs (All-in)
  - `sensor.current_gas_price_all_in` - Huidige gasprijs (All-in)
  - `sensor.average_electricity_price_today_all_in` - Gemiddelde elektriciteitsprijs vandaag
  - Automatische detectie van Frank Energie formaat
- **Price-timeline-card sensoren**: Gebruikt `prices` attribuut met `time`, `price` formaat
- **Energyzero sensor**: Vergelijkbare formaten als bovenstaande
- **Andere energieprijs sensoren**: Die bovenstaande formaten gebruiken

## Ontwikkeling

```bash
npm install
npm run watch
```

## Bijdragen

Pull requests zijn welkom! Voor grote wijzigingen, open eerst een issue om te bespreken wat je wilt veranderen.

## Licentie

[MIT](LICENSE)