# Dynamic Prices Card

[![HACS Default](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/hacs/integration)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/ViperRNMC/dynamic-prices-card)](https://github.com/ViperRNMC/dynamic-prices-card/releases)

Een aangepaste Lovelace kaart voor Home Assistant die dynamische energieprijzen toont voor de komende 24 uur.

## Features

- 📊 Grafiek van energieprijzen voor de komende 24 uur
- 🎨 Aanpasbare kleuren en stijlen
- ⚡ Realtime updates
- 📱 Responsive design
- 🌟 Ondersteuning voor verschillende energieleveranciers
- 💰 Prijs highlights (hoogste/laagste)
- ⏰ Huidige tijd indicator

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

### Basis configuratie

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: Energieprijzen komende 24u
```

### Geavanceerde configuratie

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: Energieprijzen komende 24u
hours: 24
refresh_interval: 30
show_current_price: true
show_average: true
price_unit: "€/kWh"
chart_type: "line"
color_scheme: "dynamic"
height: 200
animations: true
show_grid: true
show_legend: true
theme: "auto"
```

## Configuratie opties

| Naam | Type | Default | Beschrijving |
|------|------|---------|--------------|
| `entity` | string | **Verplicht** | De sensor entity voor energieprijzen |
| `title` | string | "Dynamic Prices" | Titel van de kaart |
| `hours` | number | 24 | Aantal uren om te tonen |
| `refresh_interval` | number | 30 | Refresh interval in seconden |
| `show_current_price` | boolean | true | Toon huidige prijs |
| `show_average` | boolean | true | Toon gemiddelde prijs |
| `price_unit` | string | "€/kWh" | Eenheid voor prijsweergave |
| `chart_type` | string | "line" | Type grafiek (line, bar, area) |
| `color_scheme` | string | "dynamic" | Kleurenschema (dynamic, green, blue, red) |
| `height` | number | 200 | Hoogte van de grafiek in pixels |
| `animations` | boolean | true | Schakel animaties in/uit |
| `show_grid` | boolean | true | Toon rasterlijnen |
| `show_legend` | boolean | true | Toon legenda |
| `theme` | string | "auto" | Thema (auto, light, dark) |

## Sensor vereisten

De kaart verwacht een sensor die prijsdata levert in het volgende formaat:

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
- Nordpool sensor
- ENTSO-E sensor
- Tibber sensor
- Energyzero sensor
- Andere energieprijs sensoren die het bovenstaande formaat gebruiken

## Ontwikkeling

```bash
npm install
npm run watch
```

## Bijdragen

Pull requests zijn welkom! Voor grote wijzigingen, open eerst een issue om te bespreken wat je wilt veranderen.

## Licentie

[MIT](LICENSE)