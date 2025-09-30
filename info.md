# Dynamic Prices Card - Technische Informatie

## Architectuur

De Dynamic Prices Card is gebouwd als een Custom Element voor Home Assistant's Lovelace frontend. Het gebruikt moderne web technologieën om een responsieve en performante gebruikerservaring te bieden.

### Hoofdcomponenten

1. **DynamicPricesCard Class**: De hoofdklasse die HTMLElement uitbreidt
2. **Shadow DOM**: Voor geïsoleerde styling en DOM manipulatie
3. **Canvas Rendering**: Voor performante grafiek weergave
4. **Responsive Design**: Automatische aanpassing aan schermgroottes

## Data Formaat

De kaart verwacht prijsdata van een Home Assistant sensor in het volgende formaat:

```json
{
  "state": "0.23456",
  "attributes": {
    "prices": [
      {
        "datetime": "2024-09-30T00:00:00+02:00",
        "price": 0.23456
      },
      {
        "datetime": "2024-09-30T01:00:00+02:00", 
        "price": 0.25123
      }
    ],
    "unit_of_measurement": "€/kWh"
  }
}
```

### Vereiste Velden

- `state`: Huidige prijs als string of nummer
- `attributes.prices`: Array van prijsobjecten
- `attributes.prices[].datetime`: ISO 8601 timestamp
- `attributes.prices[].price`: Numerieke prijs waarde

## Rendering Pipeline

1. **Data Extractie**: Filtert prijsdata voor de gewenste tijdsperiode
2. **Scaling Berekening**: Bepaalt min/max waarden voor grafiek schaling
3. **Canvas Setup**: Initialiseert canvas met juiste afmetingen
4. **Grid Rendering**: Tekent achtergrond raster (optioneel)
5. **Chart Drawing**: Rendert de hoofdgrafiek (lijn/area/bar)
6. **Indicators**: Voegt huidige tijd indicator toe
7. **Labels**: Plaatst tijd- en prijslabels
8. **Statistics**: Berekent en toont min/max/gemiddelde waarden

## Performance Optimalisaties

### Canvas Rendering
- Gebruikt native Canvas API voor optimale performance
- Minimale DOM manipulatie
- Efficiënte redraw algoritmes

### Memory Management
- Automatische cleanup van event listeners
- Gecontroleerde update cycles
- Minimaal geheugengebruik

### Network Efficiency
- Gebruikt bestaande Home Assistant data streams
- Geen extra API calls nodig
- Intelligent caching van berekeningen

## Browser Compatibiliteit

### Ondersteunde Browsers
- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 88+)

### Vereiste APIs
- Custom Elements v1
- Shadow DOM v1
- Canvas 2D Context
- ES6 Classes
- CSS Custom Properties

## Configuratie Validatie

De kaart valideert alle configuratie opties bij initialisatie:

```javascript
// Verplichte velden
if (!config.entity) {
  throw new Error('Entity is required');
}

// Type validatie
hours: parseInt(config.hours) || 24
refresh_interval: parseInt(config.refresh_interval) || 30
show_current_price: config.show_current_price !== false
```

## Event Handling

### Home Assistant Events
- `hass-changed`: Automatische updates bij data wijzigingen
- `config-changed`: Herconfiguratie van de kaart
- `theme-changed`: Dynamische theme updates

### Custom Events
- Geen externe events - volledig self-contained
- Interne state management voor performance

## Foutafhandeling

### Data Validatie
```javascript
if (!entity.attributes || !entity.attributes.prices) {
  this.showError('No price data available');
  return;
}
```

### Graceful Degradation
- Fallback naar basis weergave bij missende data
- Gebruiksvriendelijke foutmeldingen
- Automatisch herstel bij data terugkeer

## Styling System

### CSS Custom Properties
De kaart respecteert Home Assistant theme variabelen:

```css
background: var(--card-background-color, #fff);
color: var(--primary-text-color, #333);
border-radius: var(--ha-card-border-radius, 12px);
```

### Responsive Breakpoints
```css
@media (max-width: 600px) {
  .card-header {
    flex-direction: column;
  }
}
```

## Internationalisatie

### Ondersteunde Talen
- Nederlands (standaard)
- Engels (fallback)

### Lokalisatie Punten
- Tijdsformaten (24-uurs notatie)
- Decimaal scheidingsteken
- Valuta symbolen
- Error berichten

## Extensibiliteit

### Theme Systeem
Eenvoudig uitbreidbaar met nieuwe kleurenschema's:

```javascript
const colorSchemes = {
  custom: {
    line: '#custom-color',
    area: 'rgba(custom, 0.1)',
    // ...
  }
};
```

### Chart Types
Nieuwe chart types kunnen toegevoegd worden via de `chart_type` configuratie.

## Debuggen

### Console Logging
In development mode kunnen debug logs ingeschakeld worden:

```javascript
console.debug('DynamicPricesCard: Rendering chart with', prices.length, 'data points');
```

### Error Reporting
Alle errors worden naar de browser console gestuurd en visueel getoond aan de gebruiker.