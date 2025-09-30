# Dynamic Prices Card

[![Version](https://img.shields.io/badge/version-2025.10.1-blue.svg)](https://github.com/ViperRNMC/dynamic-prices-card/releases)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

A modern Home Assistant Lovelace card for displaying energy prices with dynamic layouts and intelligent highlighting. Inspired by the clean design of the [Uptime Card](https://github.com/dylandoamaral/uptime-card) and the timeline functionality of the [Price Timeline Card](https://github.com/Neisi/ha-price-timeline-card).

## ✨ Features

### 🎨 **Dual Layout System**
- **Bars Layout**: Classic bar chart visualization
- **Timeline Layout**: Continuous timeline with rounded segments

### � **Smart Price Highlighting** 
- Dynamic peak and valley detection
- Configurable highlight count (1-12 periods)
- Choose between cheapest or most expensive periods
- Visual indicators with customizable colors

### 🌍 **Multi-Language Support**
- English, Dutch, German, and French
- Automatic language detection from Home Assistant
- Fully localized configuration interface

### 🎨 **Rich Color Themes**
- Standard (Red/Green)
- Energy Gradient (9 colors)
- Timeline Colors (Turquoise/Orange) 
- Uptime Card Classic
- Blue to Red gradient
- Traffic Light (Green/Yellow/Red)

### ⚙️ **Flexible Configuration**
- Expandable configuration sections
- Live preview in configuration UI
- Support for multiple units (Cent, €/kWh, etc.)
- Configurable time ranges and display options
- Tooltip support with price details

## 🚀 Installation

### HACS (Recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ViperRNMC&repository=dynamic-prices-card&category=frontend)

**Or manually:**

1. Ensure [HACS](https://hacs.xyz/) is installed
2. Go to **HACS** → **Frontend** 
3. Click **"Explore & Download Repositories"**
4. Search for **"Dynamic Prices Card"**
5. Click **Download**
6. Restart Home Assistant
7. Clear browser cache (Ctrl+F5)

### Manual Installation

1. Download `dynamic-prices-card.js` from the [latest release](https://github.com/ViperRNMC/dynamic-prices-card/releases)
2. Copy to `config/www/community/dynamic-prices-card/`
3. Add to Lovelace resources:

```yaml
resources:
  - url: /hacsfiles/dynamic-prices-card/dynamic-prices-card.js
    type: module
```

## 📝 Configuration

### Basic Configuration

```yaml
type: custom:dynamic-prices-card
entity: sensor.frank_energie_prijzen_huidige_elektricitetsprijs_all_in
title: "Energy Prices"
layout_style: timeline
color_theme: timeline
unit: Cent
```

### Advanced Configuration

```yaml
type: custom:dynamic-prices-card
entity: sensor.energy_prices
title: "Today's Energy Prices"
layout_style: timeline          # 'bars' or 'timeline'
color_theme: energy_gradient    # Color scheme
unit: Cent                      # Display unit
hours_to_show: 24              # Hours to display
show_from_today: true          # Start from beginning of day
highlight_mode: cheapest       # 'cheapest' or 'expensive'  
max_highlights: 5              # Number of periods to highlight
show_current: true             # Show current price
show_average: true             # Show average price
show_time_axis: true           # Show time labels
show_time_zones: false         # Show price zones
tooltip_enabled: true          # Enable hover tooltips
bar_height: 30                 # Bar height (bars layout only)
bar_spacing: 2                 # Bar spacing (bars layout only)
```

## 📊 Layout Styles

### Bars Layout
Traditional bar chart with individual price bars:
- Configurable bar height and spacing
- Current price highlighting with arrow indicator
- Hover tooltips with time and price information

### Timeline Layout  
Continuous timeline inspired by the [Price Timeline Card](https://github.com/Neisi/ha-price-timeline-card):
- Seamless price segments with rounded corners
- Current time marker with progress indication
- Compact header with time range and current price

## 🎨 Color Themes

| Theme | Description | Best For |
|-------|-------------|----------|
| `default` | Red/Green standard | General use |
| `energy_gradient` | 9-color energy scale | Detailed price analysis |
| `timeline` | Turquoise/Orange | Timeline layout |
| `uptime_classic` | Inspired by [Uptime Card](https://github.com/dylandoamaral/uptime-card) | Clean minimal look |
| `blue_red` | Blue to red gradient | Temperature-like visualization |
| `green_yellow_red` | Traffic light colors | Quick good/bad/neutral indication |

## 🔧 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **Required** | Energy price sensor entity ID |
| `title` | string | Entity name | Card title |
| `layout_style` | string | `bars` | Layout: `bars` or `timeline` |
| `color_theme` | string | `default` | Color scheme |
| `unit` | string | `Cent` | Display unit |
| `hours_to_show` | number | 24 | Hours to display (1-48) |
| `show_from_today` | boolean | true | Start from beginning of day |
| `highlight_mode` | string | `cheapest` | Highlight: `cheapest` or `expensive` |
| `max_highlights` | number | 5 | Number of periods to highlight (1-12) |
| `show_current` | boolean | true | Show current price |
| `show_average` | boolean | true | Show average price |
| `show_time_axis` | boolean | true | Show time labels |
| `show_time_zones` | boolean | false | Show price zones |
| `tooltip_enabled` | boolean | true | Enable hover tooltips |
| `bar_height` | number | 30 | Bar height in pixels (bars layout) |
| `bar_spacing` | number | 2 | Bar spacing in pixels (bars layout) |

## 🔌 Supported Data Sources

The card works with energy price sensors that provide data in the following format:

```json
{
  "attributes": {
    "prices": [
      {
        "from": "2025-10-01T00:00:00+00:00",
        "till": "2025-10-01T01:00:00+00:00", 
        "price": 0.25
      }
    ]
  }
}
```

### Compatible Integrations
- [Frank Energie](https://github.com/klaasnicolaas/python-frank-energie)
- [Nordpool](https://github.com/custom-components/nordpool)
- [ENTSO-E](https://github.com/JaccoR/hass-entso-e)
- [Tibber](https://github.com/Danielhiversen/home_assistant_tibber)
- [EnergyZero](https://github.com/klaasnicolaas/python-energyzero)
- Any integration providing hourly price data

```

## 🌍 Supported Languages

- **🇺🇸 English** (Default)
- **🇳🇱 Nederlands** (Dutch)
- **🇩🇪 Deutsch** (German)  
- **🇫🇷 Français** (French)

Language is automatically detected from your Home Assistant configuration.

## 💡 Inspiration & Credits

This card combines the best of both worlds:
- **Layout & Design**: Inspired by the clean, modern design principles of [dylandoamaral/uptime-card](https://github.com/dylandoamaral/uptime-card)
- **Timeline Functionality**: Timeline layout inspired by [Neisi/ha-price-timeline-card](https://github.com/Neisi/ha-price-timeline-card)

## 🐛 Issues & Feature Requests

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/ViperRNMC/dynamic-prices-card/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Version**: 2025.10.1  
**Compatibility**: Home Assistant 2024.1+  
**HACS**: Custom Repository