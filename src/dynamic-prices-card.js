// Import lokalisatie
import { localize } from './localization.js';

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
      refresh_interval: config.refresh_interval || 30,
      show_current_price: config.show_current_price !== false,
      show_average: config.show_average !== false,
      price_unit: config.price_unit || '€/kWh',
      chart_type: config.chart_type || 'line',
      color_scheme: config.color_scheme || 'dynamic',
      height: config.height || 200,
      animations: config.animations !== false,
      show_grid: config.show_grid !== false,
      show_legend: config.show_legend !== false,
      theme: config.theme || 'auto',
      // Nieuwe opties geïnspireerd door price-timeline-card
      timeline: config.timeline !== false, // timeline (true) of circle (false) view
      slider: config.slider === true, // slider voor tijdselectie (alleen circle view)
      color_coding: config.color_coding !== false, // kleur coding boven/onder gemiddelde
      average_entity: config.average_entity, // aparte gemiddelde entity (optioneel)
      unit_in_cents: config.unit_in_cents === true // toon prijzen in centen
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
      // Circle view
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
      // Timeline view (standaard)
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
    const minutes = now.getMinutes();
    const hourProgress = minutes / 60;
    
    // Bereken gemiddelde voor kleur coding
    const avgPrice = this.calculateAverage(prices);
    
    // Timeline slots
    timeline.innerHTML = prices.map((price, i) => {
      const isAboveAvg = parseFloat(price.price) > avgPrice;
      const color = this._config.color_coding ? 
        (isAboveAvg ? 'var(--orange-color)' : 'var(--turquoise-color)') : 
        'var(--primary-color)';
      
      const faded = i < currentHour ? 'faded' : '';
      const marker = i === currentHour ? 'marker' : '';
      
      // Border radius voor aaneengesloten kleuren
      const prevColor = i > 0 ? (parseFloat(prices[i - 1].price) > avgPrice ? 'var(--orange-color)' : 'var(--turquoise-color)') : null;
      const nextColor = i < prices.length - 1 ? (parseFloat(prices[i + 1].price) > avgPrice ? 'var(--orange-color)' : 'var(--turquoise-color)') : null;
      
      let borderRadius = '';
      if (prevColor !== color) borderRadius += 'border-top-left-radius: 3px; border-bottom-left-radius: 3px;';
      if (nextColor !== color) borderRadius += 'border-top-right-radius: 3px; border-bottom-right-radius: 3px;';
      
      return `<div class="slot ${faded} ${marker}" style="background: ${color}; ${borderRadius}; --progress: ${i === currentHour ? hourProgress : 0}"></div>`;
    }).join('');
    
    // Scale met uurmarkeringen
    scale.innerHTML = Array.from({ length: 25 }).map((_, i) => {
      const showHour = i % 6 === 0 || i === 24;
      return `
        <div class="tick">
          <div class="dot ${showHour ? '' : 'faded'}"></div>
          ${showHour ? `<div class="hour">${String(i % 24).padStart(2, '0')}</div>` : ''}
        </div>
      `;
    }).join('');
    
    // Update current price display
    const currentPriceData = prices[currentHour];
    if (currentPriceData && currentPrice) {
      const price = parseFloat(currentPriceData.price);
      const formattedPrice = this._config.unit_in_cents ? (price * 100).toFixed(0) : price.toFixed(3);
      const unit = this._config.unit_in_cents ? localize('unit_cent', this._lang) : this._config.price_unit;
      
      currentPrice.querySelector('.value').textContent = formattedPrice;
      currentPrice.querySelector('.unit').textContent = unit;
    }
    
    // Update tijd label
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
    
    // Circle progress berekening
    const rawRatio = (currentPrice - minPrice) / (maxPrice - minPrice || 1);
    const ratio = 0.05 + rawRatio * 0.9;
    
    const radius = 65;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - ratio);
    
    const circleColor = this._config.color_coding ?
      (currentPrice > avgPrice ? 'var(--orange-color)' : 'var(--turquoise-color)') :
      'var(--primary-color)';
    
    // SVG circle
    circleChart.innerHTML = `
      <svg width="150" height="150">
        <circle cx="75" cy="75" r="${radius}" stroke="var(--divider-color)" stroke-width="10" fill="none" opacity="0.2"></circle>
        <circle cx="75" cy="75" r="${radius}" stroke="${circleColor}" stroke-width="10" fill="none" 
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
                stroke-linecap="round" transform="rotate(-90 75 75)"></circle>
      </svg>
    `;
    
    // Circle text
    const formattedPrice = this._config.unit_in_cents ? (currentPrice * 100).toFixed(0) : currentPrice.toFixed(3);
    const unit = this._config.unit_in_cents ? localize('unit_cent', this._lang) : this._config.price_unit;
    const timeLabel = `${String(hourToShow).padStart(2, '0')}:00-${String((hourToShow + 1) % 24).padStart(2, '0')}:00`;
    
    circleText.innerHTML = `
      <div class="price">
        <span class="value">${formattedPrice}</span>
        <span class="unit">${unit}</span>
      </div>
      <div class="time">${timeLabel}</div>
    `;
    
    // Slider (alleen in circle mode)
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
    // Ondersteuning voor verschillende data formaten
    let prices = [];
    
    if (entity.attributes?.prices) {
      // Frank Energie formaat: { from, till, price }
      if (entity.attributes.prices.length > 0 && 
          entity.attributes.prices[0].from && 
          entity.attributes.prices[0].till && 
          entity.attributes.prices[0].price !== undefined) {
        prices = entity.attributes.prices.map(item => ({
          datetime: item.from,
          price: item.price
        }));
      } 
      // Price-timeline-card formaat: { time, price }
      else if (entity.attributes.prices.length > 0 && 
               entity.attributes.prices[0].time && 
               entity.attributes.prices[0].price !== undefined) {
        prices = entity.attributes.prices.map(item => ({
          datetime: item.time,
          price: item.price
        }));
      } 
      // Direct prices array (legacy)
      else {
        prices = entity.attributes.prices;
      }
    } else if (entity.attributes?.data) {
      // Price-timeline-card formaat via data attribute
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
    
    // Bereken zelf het gemiddelde
    const priceValues = prices.map(p => parseFloat(p.price));
    return priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
  }

  // Static editor configuratie voor HACS
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
        
        /* Timeline View Styles */
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
        
        .timeline-container {
          margin-top: 8px;
        }
        
        .timeline {
          display: flex;
          margin: 8px 0;
          height: 6px;
          border-radius: 3px;
          overflow: visible;
          position: relative;
        }
        
        .slot {
          flex: 1;
          opacity: 1;
          position: relative;
          transition: opacity 0.2s ease;
        }
        
        .slot.faded {
          opacity: 0.3;
        }
        
        .slot.marker::after {
          content: '';
          position: absolute;
          top: 50%;
          left: calc(var(--progress, 0) * 100%);
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
          width: calc(100% + (100% / 24));
          margin-left: calc(-0.5 * (100% / 24));
          margin-right: calc(-0.5 * (100% / 24));
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
        
        /* Circle View Styles */
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
        
        .circle-text .price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          margin-bottom: 4px;
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
        
        /* Slider Styles */
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
          transition: background 0.3s;
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
        
        /* Error Styles */
        .error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f44336;
          padding: 16px;
          text-align: center;
        }
        
        .error ha-icon {
          --mdc-icon-size: 24px;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .header-left {
            align-self: stretch;
          }
          
          .circle-container {
            width: 120px;
            height: 120px;
          }
          
          .circle-text .value {
            font-size: 24px;
          }
          
          .circle-text .unit {
            font-size: 14px;
          }
        }
      </style>
    `;
  }

  getCardSize() {
    return 3;
  }
}

// Visual Editor voor HACS
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
    // Ensure config exists: Home Assistant may set hass on the editor before setConfig
    this._config = this._config || {};
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
  }

  _render() {
    if (!this._hass) return;

    const lang = this._hass.locale?.language || this._hass.language || 'en';
    
    this.innerHTML = `
      <div class="card-config">
        <div class="option">
          <paper-input
            label="${localize('entity', lang)} (verplicht)"
            .value="${this._config.entity}"
            .configValue="${'entity'}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        
        <div class="option">
          <paper-input
            label="${localize('title', lang)}"
            .value="${this._config.title}"
            .configValue="${'title'}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        
        <div class="option">
          <paper-dropdown-menu label="Weergave modus">
            <paper-listbox slot="dropdown-content" .selected="${this._config.timeline ? 0 : 1}" .configValue="${'timeline'}" @iron-select="${this._timelineChanged}">
              <paper-item>Timeline</paper-item>
              <paper-item>Cirkel</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        
        <div class="option">
          <paper-toggle-button
            .checked="${this._config.slider}"
            .configValue="${'slider'}"
            @change="${this._valueChanged}"
          >Tijdslider tonen (alleen cirkel modus)</paper-toggle-button>
        </div>
        
        <div class="option">
          <paper-dropdown-menu label="Thema">
            <paper-listbox slot="dropdown-content" .selected="${['light', 'dark', 'auto'].indexOf(this._config.theme)}" .configValue="${'theme'}" @iron-select="${this._themeChanged}">
              <paper-item>Licht</paper-item>
              <paper-item>Donker</paper-item>
              <paper-item>Automatisch</paper-item>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
        
        <div class="option">
          <paper-toggle-button
            .checked="${this._config.color_coding}"
            .configValue="${'color_coding'}"
            @change="${this._valueChanged}"
          >Kleurcodering (boven/onder gemiddelde)</paper-toggle-button>
        </div>
        
        <div class="option">
          <paper-toggle-button
            .checked="${this._config.unit_in_cents}"
            .configValue="${'unit_in_cents'}"
            @change="${this._valueChanged}"
          >Toon prijzen in centen</paper-toggle-button>
        </div>
        
        <div class="option">
          <paper-input
            label="Aantal uren"
            type="number"
            .value="${this._config.hours}"
            .configValue="${'hours'}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
      </div>
      
      <style>
        .card-config {
          padding: 16px;
        }
        .option {
          margin-bottom: 16px;
        }
        paper-toggle-button {
          padding: 8px 0;
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
      
      if (configValue === 'hours') {
        this._config = { ...this._config, [configValue]: parseInt(value) || 24 };
      } else {
        this._config = { ...this._config, [configValue]: value };
      }
      
      this._fireEvent('config-changed', { config: this._config });
    }
  }

  _timelineChanged(ev) {
    if (!this._config || !this._hass) return;
    
    const selected = ev.detail.item.innerText;
    const timeline = selected === 'Timeline';
    
    this._config = { ...this._config, timeline };
    this._fireEvent('config-changed', { config: this._config });
  }

  _themeChanged(ev) {
    if (!this._config || !this._hass) return;
    
    const themes = ['light', 'dark', 'auto'];
    const theme = themes[ev.detail.item.index] || 'auto';
    
    this._config = { ...this._config, theme };
    this._fireEvent('config-changed', { config: this._config });
  }

  _fireEvent(type, detail) {
    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('dynamic-prices-card', DynamicPricesCard);
customElements.define('dynamic-prices-card-editor', DynamicPricesCardEditor);

// Add to Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dynamic-prices-card',
  name: 'Dynamic Prices Card',
  description: 'A card to display dynamic energy prices with timeline and circle views',
  preview: false
});