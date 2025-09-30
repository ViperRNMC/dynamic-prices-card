class DynamicPricesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Entity is required');
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
      theme: config.theme || 'auto'
    };
    
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.updateCard();
  }

  updateCard() {
    if (!this._hass || !this._config.entity) return;
    
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
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <div class="title">${this._config.title}</div>
          <div class="info-row" id="info-row"></div>
        </div>
        <div class="card-content">
          <div class="chart-container">
            <canvas id="price-chart" width="400" height="${this._config.height}"></canvas>
          </div>
          <div class="price-info" id="price-info"></div>
        </div>
      </ha-card>
      ${this.getStyles()}
    `;
  }

  renderChart(entity) {
    const canvas = this.shadowRoot.getElementById('price-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const prices = this.extractPrices(entity);
    
    if (!prices || prices.length === 0) {
      this.showError('No price data available');
      return;
    }

    this.drawChart(ctx, canvas, prices);
    this.updateInfoRow(entity, prices);
  }

  extractPrices(entity) {
    if (!entity.attributes || !entity.attributes.prices) {
      return [];
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + (this._config.hours * 60 * 60 * 1000));
    
    return entity.attributes.prices
      .filter(price => {
        const priceTime = new Date(price.datetime);
        return priceTime >= now && priceTime <= endTime;
      })
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }

  drawChart(ctx, canvas, prices) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    ctx.clearRect(0, 0, width, height);

    if (prices.length === 0) return;

    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice || 1;

    const colors = this.getColors();
    
    if (this._config.show_grid) {
      this.drawGrid(ctx, padding, chartWidth, chartHeight, colors.grid);
    }

    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    ctx.beginPath();

    prices.forEach((price, index) => {
      const x = padding + (index / (prices.length - 1)) * chartWidth;
      const y = padding + ((maxPrice - parseFloat(price.price)) / priceRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    if (this._config.chart_type === 'area') {
      ctx.fillStyle = colors.area;
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    this.drawCurrentTimeIndicator(ctx, padding, chartWidth, chartHeight, prices, colors.current);

    prices.forEach((price, index) => {
      const x = padding + (index / (prices.length - 1)) * chartWidth;
      const y = padding + ((maxPrice - parseFloat(price.price)) / priceRange) * chartHeight;
      
      ctx.fillStyle = colors.point;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    this.drawAxesLabels(ctx, padding, chartWidth, chartHeight, prices, minPrice, maxPrice, colors.text);
  }

  drawGrid(ctx, padding, chartWidth, chartHeight, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 6; i++) {
      const x = padding + (i / 6) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }
    
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
  }

  drawCurrentTimeIndicator(ctx, padding, chartWidth, chartHeight, prices, color) {
    if (prices.length === 0) return;
    
    const now = new Date();
    const firstTime = new Date(prices[0].datetime);
    const lastTime = new Date(prices[prices.length - 1].datetime);
    
    if (now >= firstTime && now <= lastTime) {
      const totalHours = (lastTime - firstTime) / (1000 * 60 * 60);
      const currentHours = (now - firstTime) / (1000 * 60 * 60);
      const x = padding + (currentHours / totalHours) * chartWidth;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawAxesLabels(ctx, padding, chartWidth, chartHeight, prices, minPrice, maxPrice, color) {
    ctx.fillStyle = color;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    const timeStep = Math.max(1, Math.floor(prices.length / 6));
    for (let i = 0; i < prices.length; i += timeStep) {
      const x = padding + (i / (prices.length - 1)) * chartWidth;
      const time = new Date(prices[i].datetime);
      const label = time.getHours().toString().padStart(2, '0') + ':00';
      ctx.fillText(label, x, padding + chartHeight + 15);
    }
    
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (i / 5) * (maxPrice - minPrice);
      const y = padding + (i / 5) * chartHeight;
      ctx.fillText(price.toFixed(3), padding - 5, y + 3);
    }
  }

  updateInfoRow(entity, prices) {
    const infoRow = this.shadowRoot.getElementById('info-row');
    const priceInfo = this.shadowRoot.getElementById('price-info');
    
    if (!infoRow || !priceInfo) return;
    
    const currentPrice = parseFloat(entity.state);
    const priceValues = prices.map(p => parseFloat(p.price));
    const avgPrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    
    let infoContent = '';
    if (this._config.show_current_price) {
      infoContent += `<div class="current-price">Nu: ${currentPrice.toFixed(3)} ${this._config.price_unit}</div>`;
    }
    if (this._config.show_average) {
      infoContent += `<div class="avg-price">Gem: ${avgPrice.toFixed(3)} ${this._config.price_unit}</div>`;
    }
    
    infoRow.innerHTML = infoContent;
    
    priceInfo.innerHTML = `
      <div class="price-stats">
        <div class="stat-item">
          <span class="stat-label">Min</span>
          <span class="stat-value min-price">${minPrice.toFixed(3)} ${this._config.price_unit}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Max</span>
          <span class="stat-value max-price">${maxPrice.toFixed(3)} ${this._config.price_unit}</span>
        </div>
      </div>
    `;
  }

  getColors() {
    const isDark = this.isDarkTheme();
    
    const colorSchemes = {
      dynamic: {
        line: isDark ? '#4fc3f7' : '#0288d1',
        area: isDark ? 'rgba(79, 195, 247, 0.1)' : 'rgba(2, 136, 209, 0.1)',
        point: isDark ? '#4fc3f7' : '#0288d1',
        grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        text: isDark ? '#ffffff' : '#333333',
        current: '#ff5722'
      },
      green: {
        line: '#4caf50',
        area: 'rgba(76, 175, 80, 0.1)',
        point: '#4caf50',
        grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        text: isDark ? '#ffffff' : '#333333',
        current: '#ff5722'
      }
    };
    
    return colorSchemes[this._config.color_scheme] || colorSchemes.dynamic;
  }

  isDarkTheme() {
    if (this._config.theme === 'dark') return true;
    if (this._config.theme === 'light') return false;
    
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  getStyles() {
    return `
      <style>
        :host {
          display: block;
        }
        
        ha-card {
          background: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          padding: 16px;
          margin: 4px;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .title {
          font-size: 18px;
          font-weight: 500;
          color: var(--primary-text-color, #333);
        }
        
        .info-row {
          display: flex;
          gap: 16px;
          font-size: 14px;
        }
        
        .current-price {
          color: var(--primary-color, #03a9f4);
          font-weight: 600;
        }
        
        .avg-price {
          color: var(--secondary-text-color, #666);
        }
        
        .chart-container {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }
        
        #price-chart {
          max-width: 100%;
          height: auto;
        }
        
        .price-stats {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          padding: 8px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 8px;
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--secondary-text-color, #666);
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 14px;
          font-weight: 600;
        }
        
        .min-price {
          color: #4caf50;
        }
        
        .max-price {
          color: #f44336;
        }
        
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
        
        @media (max-width: 600px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .info-row {
            align-self: stretch;
          }
          
          .price-stats {
            flex-direction: column;
            gap: 8px;
          }
        }
      </style>
    `;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('dynamic-prices-card', DynamicPricesCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dynamic-prices-card',
  name: 'Dynamic Prices Card',
  description: 'A card to display dynamic energy prices for the next 24 hours'
});