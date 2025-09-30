// Lokalisatie
const languages = {
  en: {
    no_data: "No data available",
    missing_entity: "Please specify entity in the config",
    label_current_price: "Current price",
    label_average_price: "Average price",
    label_today_price: "Today's price",
    label_tomorrow_price: "Tomorrow's price",
    unit_cent: "Cent",
    min_price: "Min",
    max_price: "Max",
    now: "Now",
    avg: "Avg"
  },
  nl: {
    no_data: "Geen gegevens beschikbaar",
    missing_entity: "Specificeer de entity in de configuratie",
    label_current_price: "Huidige prijs",
    label_average_price: "Gemiddelde prijs",
    label_today_price: "Prijs van vandaag",
    label_tomorrow_price: "Prijs van morgen",
    unit_cent: "Cent",
    min_price: "Min",
    max_price: "Max",
    now: "Nu",
    avg: "Gem"
  }
};

function localize(key, lang = 'en') {
  return languages[lang]?.[key] || languages['en'][key] || key;
}

class DynamicPricesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this.selectedHour = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error(localize('missing_entity'));
    }
    
    this._config = {
      entity: config.entity,
      title: config.title || 'Dynamic Prices',
      hours: config.hours || 24,
      timeline: config.timeline !== false,
      slider: config.slider === true,
      color_coding: config.color_coding !== false,
      average_entity: config.average_entity,
      unit_in_cents: config.unit_in_cents === true,
      theme: config.theme || 'auto'
    };
    
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    // Ensure config object exists to avoid runtime errors when hass is set before setConfig
    this._config = this._config || {};
    this._lang = hass?.locale?.language || hass?.language || 'en';
    this.updateCard();
  }

  updateCard() {
    if (!this._hass || !this._config || !this._config.entity) return;
    
    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this.showError('Entity not found: ' + this._config.entity);
      return;
    }
    
    this.renderChart(entity);
  }

  showError(message) {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="error">
          <ha-icon icon="mdi:alert-circle"></ha-icon>
          <div>${message}</div>
        </div>
      </ha-card>
      ${this.getStyles()}
    `;
  }

  render() {
    if (this._config.timeline === false) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="circle-container">
            <div class="circle-chart" id="circle-chart"></div>
            <div class="circle-text" id="circle-text"></div>
          </div>
          ${this._config.slider ? '<div class="slider-container" id="slider-container"></div>' : ''}
        </ha-card>
        ${this.getStyles()}
      `;
    } else {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="card-header">
            <div class="header-left">
              <div class="time" id="time-label"></div>
              <div class="price" id="current-price">
                <span class="value"></span>
                <span class="unit"></span>
              </div>
            </div>
            <div class="label">${this._config.title}</div>
          </div>
          <div class="timeline-container">
            <div class="timeline" id="timeline"></div>
            <div class="scale" id="scale"></div>
          </div>
        </ha-card>
        ${this.getStyles()}
      `;
    }
  }

  renderChart(entity) {
    const prices = this.extractPrices(entity);
    
    if (!prices || prices.length === 0) {
      this.showError(localize('no_data', this._lang));
      return;
    }

    if (this._config.timeline === false) {
      this.renderCircleView(prices);
    } else {
      this.renderTimelineView(prices);
    }
  }

  renderTimelineView(prices) {
    const timeline = this.shadowRoot.getElementById('timeline');
    const scale = this.shadowRoot.getElementById('scale');
    const timeLabel = this.shadowRoot.getElementById('time-label');
    const currentPrice = this.shadowRoot.getElementById('current-price');
    
    if (!timeline || !scale) return;

    const now = new Date();
    const currentHour = now.getHours();
    const avgPrice = this.calculateAverage(prices);
    
    timeline.innerHTML = prices.map((price, i) => {
      const isAboveAvg = parseFloat(price.price) > avgPrice;
      const color = this._config.color_coding ? 
        (isAboveAvg ? 'var(--orange-color)' : 'var(--turquoise-color)') : 
        'var(--primary-color)';
      
      const faded = i < currentHour ? 'faded' : '';
      const marker = i === currentHour ? 'marker' : '';
      
      return `<div class="slot ${faded} ${marker}" style="background: ${color};"></div>`;
    }).join('');
    
    scale.innerHTML = Array.from({ length: 25 }).map((_, i) => {
      const showHour = i % 6 === 0 || i === 24;
      return `
        <div class="tick">
          <div class="dot ${showHour ? '' : 'faded'}"></div>
          ${showHour ? `<div class="hour">${String(i % 24).padStart(2, '0')}</div>` : ''}
        </div>
      `;
    }).join('');
    
    const currentPriceData = prices[currentHour];
    if (currentPriceData && currentPrice) {
      const price = parseFloat(currentPriceData.price);
      const formattedPrice = this._config.unit_in_cents ? (price * 100).toFixed(0) : price.toFixed(3);
      const unit = this._config.unit_in_cents ? localize('unit_cent', this._lang) : '€/kWh';
      
      currentPrice.querySelector('.value').textContent = formattedPrice;
      currentPrice.querySelector('.unit').textContent = unit;
    }
    
    if (timeLabel) {
      const timeString = `${String(currentHour).padStart(2, '0')}:00-${String((currentHour + 1) % 24).padStart(2, '0')}:00`;
      timeLabel.textContent = timeString;
    }
  }

  renderCircleView(prices) {
    const circleChart = this.shadowRoot.getElementById('circle-chart');
    const circleText = this.shadowRoot.getElementById('circle-text');
    const sliderContainer = this.shadowRoot.getElementById('slider-container');
    
    if (!circleChart || !circleText) return;

    const now = new Date();
    const currentHour = now.getHours();
    const hourToShow = this._config.slider ? (this.selectedHour ?? currentHour) : currentHour;
    
    const avgPrice = this.calculateAverage(prices);
    const currentPriceData = prices[hourToShow];
    
    if (!currentPriceData) return;
    
    const currentPrice = parseFloat(currentPriceData.price);
    const minPrice = Math.min(...prices.map(p => parseFloat(p.price)));
    const maxPrice = Math.max(...prices.map(p => parseFloat(p.price)));
    
    const rawRatio = (currentPrice - minPrice) / (maxPrice - minPrice || 1);
    const ratio = 0.05 + rawRatio * 0.9;
    
    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - ratio);
    
    const circleColor = this._config.color_coding ?
      (currentPrice > avgPrice ? 'var(--orange-color)' : 'var(--turquoise-color)') :
      'var(--primary-color)';
    
    circleChart.innerHTML = `
      <svg width="150" height="150">
        <circle cx="75" cy="75" r="${radius}" stroke="var(--divider-color)" stroke-width="10" fill="none" opacity="0.2"></circle>
        <circle cx="75" cy="75" r="${radius}" stroke="${circleColor}" stroke-width="10" fill="none" 
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
                stroke-linecap="round" transform="rotate(-90 75 75)"></circle>
      </svg>
    `;
    
    const formattedPrice = this._config.unit_in_cents ? (currentPrice * 100).toFixed(0) : currentPrice.toFixed(3);
    const unit = this._config.unit_in_cents ? localize('unit_cent', this._lang) : '€/kWh';
    const timeLabel = `${String(hourToShow).padStart(2, '0')}:00-${String((hourToShow + 1) % 24).padStart(2, '0')}:00`;
    
    circleText.innerHTML = `
      <div class="price">
        <span class="value">${formattedPrice}</span>
        <span class="unit">${unit}</span>
      </div>
      <div class="time">${timeLabel}</div>
    `;
    
    if (this._config.slider && sliderContainer) {
      sliderContainer.innerHTML = `
        <input type="range" min="0" max="23" value="${hourToShow}" 
               class="time-slider" id="time-slider">
      `;
      
      const slider = this.shadowRoot.getElementById('time-slider');
      slider?.addEventListener('input', (e) => {
        this.selectedHour = parseInt(e.target.value, 10);
        this.renderCircleView(prices);
      });
    }
  }

  extractPrices(entity) {
    let prices = [];
    
    if (entity.attributes?.prices) {
      prices = entity.attributes.prices;
    } else if (entity.attributes?.data) {
      prices = entity.attributes.data.map(item => ({
        datetime: item.start_time,
        price: item.price_per_kwh
      }));
    } else {
      return [];
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + (this._config.hours * 60 * 60 * 1000));
    
    return prices
      .filter(price => {
        const priceTime = new Date(price.datetime);
        return priceTime >= now && priceTime <= endTime;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }

  calculateAverage(prices) {
    if (this._config.average_entity && this._hass) {
      const avgEntity = this._hass.states[this._config.average_entity];
      if (avgEntity) {
        return parseFloat(avgEntity.state);
      }
    }
    
    const priceValues = prices.map(p => parseFloat(p.price));
    return priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
  }

  static getConfigElement() {
    return document.createElement('dynamic-prices-card-editor');
  }

  static getStubConfig() {
    return {
      entity: '',
      title: 'Dynamic Prices',
      timeline: true,
      theme: 'auto'
    };
  }

  getCardSize() {
    return this._config.timeline === false ? 2 : 3;
  }

  getStyles() {
    return `
      <style>
        :host {
          display: block;
          --orange-color: #ff832d;
          --turquoise-color: #1dbfac;
        }
        
        ha-card {
          background: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          padding: 16px;
          margin: 4px;
          font-family: var(--paper-font-common-base_-_font-family, sans-serif);
          color: var(--primary-text-color, #333);
          text-align: center;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .header-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        
        .time {
          font-size: 14px;
          color: var(--secondary-text-color, #666);
          line-height: 1.1;
        }
        
        .price {
          font-size: 24px;
          font-weight: bold;
          color: var(--primary-text-color, #333);
          line-height: 1.1;
          display: flex;
          align-items: baseline;
        }
        
        .price .value {
          font-size: 28px;
          font-weight: 800;
        }
        
        .price .unit {
          font-size: 14px;
          font-weight: normal;
          margin-left: 6px;
          color: var(--primary-text-color, #333);
        }
        
        .label {
          font-size: 14px;
          color: var(--secondary-text-color, #666);
        }
        
        .timeline {
          display: flex;
          margin: 8px 0;
          height: 6px;
          border-radius: 3px;
          overflow: visible;
        }
        
        .slot {
          flex: 1;
          opacity: 1;
          position: relative;
        }
        
        .slot.faded {
          opacity: 0.3;
        }
        
        .slot.marker::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 3px;
          height: 14px;
          background: inherit;
          border: 2px solid var(--card-background-color, #fff);
          border-radius: 10px;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
        }
        
        .scale {
          display: grid;
          grid-template-columns: repeat(25, 1fr);
          font-size: 12px;
          color: var(--secondary-text-color, #666);
          margin-top: 6px;
        }
        
        .scale .tick {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .scale .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--divider-color, #656c72);
          margin-bottom: 4px;
        }
        
        .scale .dot.faded {
          opacity: 0.4;
        }
        
        .scale .hour {
          font-variant-numeric: tabular-nums;
          text-align: center;
        }
        
        .circle-container {
          position: relative;
          width: 150px;
          height: 150px;
          margin: 0 auto;
        }
        
        .circle-chart {
          width: 100%;
          height: 100%;
        }
        
        .circle-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        .circle-text .value {
          font-size: 28px;
          font-weight: bold;
          color: var(--primary-text-color, #333);
        }
        
        .circle-text .unit {
          font-size: 16px;
          margin-left: 4px;
          color: var(--primary-text-color, #333);
        }
        
        .circle-text .time {
          font-size: 14px;
          color: var(--secondary-text-color, #666);
        }
        
        .slider-container {
          margin-top: 16px;
        }
        
        .time-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 5px;
          background: var(--primary-color, #03a9f4);
          outline: none;
          opacity: 0.9;
        }
        
        .time-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-color, var(--primary-color));
          cursor: pointer;
        }
        
        .time-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent-color, var(--primary-color));
          cursor: pointer;
          border: none;
        }
        
        .error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f44336;
          padding: 16px;
        }
        
        @media (max-width: 600px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .circle-container {
            width: 120px;
            height: 120px;
          }
        }
      </style>
    `;
  }
}

// Visual Editor
class DynamicPricesCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      entity: '',
      title: 'Dynamic Prices',
      timeline: true,
      slider: false,
      theme: 'auto',
      color_coding: true,
      unit_in_cents: false,
      hours: 24,
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    // Ensure config exists: HA may call hass before setConfig on the editor
    this._config = this._config || {};
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
  }

  _render() {
    if (!this._hass) return;

    this.innerHTML = `
      <div class="card-config">
        <div class="option">
          <ha-textfield
            label="Entity (verplicht)"
            .value="${this._config.entity}"
            .configValue="${'entity'}"
            @input="${this._valueChanged}"
          ></ha-textfield>
        </div>
        
        <div class="option">
          <ha-textfield
            label="Titel"
            .value="${this._config.title}"
            .configValue="${'title'}"
            @input="${this._valueChanged}"
          ></ha-textfield>
        </div>
        
        <div class="option">
          <ha-formfield label="Timeline weergave">
            <ha-switch
              .checked="${this._config.timeline}"
              .configValue="${'timeline'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>
        
        <div class="option">
          <ha-formfield label="Tijdslider (alleen cirkel modus)">
            <ha-switch
              .checked="${this._config.slider}"
              .configValue="${'slider'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>
        
        <div class="option">
          <ha-formfield label="Kleurcodering (boven/onder gemiddelde)">
            <ha-switch
              .checked="${this._config.color_coding}"
              .configValue="${'color_coding'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>
        
        <div class="option">
          <ha-formfield label="Toon prijzen in centen">
            <ha-switch
              .checked="${this._config.unit_in_cents}"
              .configValue="${'unit_in_cents'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>
      </div>
      
      <style>
        .card-config {
          padding: 16px;
        }
        .option {
          margin-bottom: 16px;
        }
      </style>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    
    const target = ev.target;
    const configValue = target.configValue;
    
    if (configValue) {
      const value = target.checked !== undefined ? target.checked : target.value;
      this._config = { ...this._config, [configValue]: value };
      
      const event = new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    }
  }
}

customElements.define('dynamic-prices-card', DynamicPricesCard);
customElements.define('dynamic-prices-card-editor', DynamicPricesCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dynamic-prices-card',
  name: 'Dynamic Prices Card',
  description: 'A card to display dynamic energy prices with timeline and circle views',
  preview: false
});