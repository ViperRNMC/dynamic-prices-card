# Voorbeeldconfiguraties voor Dynamic Prices Card

## Timeline weergave (standaard)

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Energieprijzen vandaag
timeline: true
color_coding: true
```

## Cirkel weergave basis

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Huidige energieprijs
timeline: false
```

## Cirkel weergave met tijdslider

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Energieprijzen navigatie
timeline: false
slider: true
```

## Prijzen in centen weergave

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Energieprijzen (centen)
unit_in_cents: true
timeline: true
```

## Configuratie voor verschillende leveranciers

### Nordpool

```yaml
type: custom:dynamic-prices-card
entity: sensor.nordpool_kwh_nl_eur_3_095_0
title: Nordpool prijzen
price_unit: "€/kWh"
color_scheme: "dynamic"
```

### Tibber

```yaml
type: custom:dynamic-prices-card
entity: sensor.electricity_price_tibber
title: Tibber prijzen
price_unit: "€/kWh"
color_scheme: "green"
```

### ENTSO-E

```yaml
type: custom:dynamic-prices-card
entity: sensor.entsoe_average_electricity_price_today
title: ENTSO-E prijzen
price_unit: "€/MWh"
color_scheme: "blue"
```

## Compacte weergave voor kleine ruimtes

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: Prijzen
hours: 12
height: 150
show_current_price: true
show_average: false
show_grid: false
chart_type: "line"
```

## Volledig dashboard voorbeeld

```yaml
type: vertical-stack
cards:
  - type: custom:dynamic-prices-card
    entity: sensor.nordpool_kwh_nl_eur_3_095_0
    title: Energieprijzen vandaag
    hours: 24
    chart_type: "area"
    color_scheme: "dynamic"
    height: 200
    
  - type: horizontal-stack
    cards:
      - type: custom:dynamic-prices-card
        entity: sensor.nordpool_kwh_nl_eur_3_095_0
        title: Komende 6u
        hours: 6
        height: 150
        show_average: false
        chart_type: "line"
        
      - type: custom:dynamic-prices-card
        entity: sensor.nordpool_kwh_nl_eur_3_095_0
        title: Morgen
        hours: 24
        height: 150
        show_current_price: false
        chart_type: "bar"
```

## Thema-specifieke configuraties

### Dark theme

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: Energieprijzen
theme: "dark"
color_scheme: "dynamic"
```

### Light theme

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: Energieprijzen
theme: "light"
color_scheme: "green"
```

## Mobiele weergave

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: Prijzen
hours: 12
height: 180
show_grid: false
chart_type: "area"
color_scheme: "dynamic"
```