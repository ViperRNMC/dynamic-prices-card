// Dynamic Prices Card v2025.10.1
// Clean implementation based on uptime-card design + price-timeline functionality
// https://github.com/ViperRNMC/dynamic-prices-card

// Translation cache
let translationCache = {};

// Load translations from external files
const loadTranslation = async (lang) => {
  if (translationCache[lang]) {
    return translationCache[lang];
  }
  
  try {
    // Try multiple possible paths for translations
    const possiblePaths = [
      '/local/community/dynamic-prices-card/',
      '/hacsfiles/dynamic-prices-card/',
      import.meta.url ? new URL('.', import.meta.url).pathname : null
    ].filter(path => path);
    
    let response;
    for (const basePath of possiblePaths) {
      try {
        response = await fetch(`${basePath}translations/${lang}.json`);
        if (response.ok) {
          translationCache[lang] = await response.json();
          return translationCache[lang];
        }
      } catch (e) {
        // Try next path
        continue;
      }
    }
  } catch (error) {
    console.warn(`Could not load translation for ${lang}, falling back to English`);
  }
  
  // Fallback to English
  if (lang !== 'en' && !translationCache.en) {
    try {
      const possiblePaths = [
        '/local/community/dynamic-prices-card/',
        '/hacsfiles/dynamic-prices-card/',
        import.meta.url ? new URL('.', import.meta.url).pathname : null
      ].filter(path => path);
      
      for (const basePath of possiblePaths) {
        try {
          const response = await fetch(`${basePath}translations/en.json`);
          if (response.ok) {
            translationCache.en = await response.json();
            return translationCache.en;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.warn('Could not load English fallback translation');
    }
  }
  
  return translationCache.en || getInlineTranslations().en;
};

// Inline fallback translations (in case external files can't be loaded)
const getInlineTranslations = () => ({
  en: {
    card: {
      no_data: 'No data available',
      missing_entity: 'Please specify entity',
      current_price: 'Current price',
      today: 'Today',
      ideal_time: 'Ideal time',
      avoid_time: 'Avoid time',
      entries: 'entries',
      avg: 'Avg',
      time_format: 'HH:mm',
      todays_price: "Today's price",
      show_from_now: 'Show from now',
      show_from_today: 'Show from start of today',
      loading: 'Loading...'
    },
    config: {
      entity: 'Entity',
      title: 'Title',
      unit: 'Unit',
      hours_to_show: 'Hours to show',
      show_from_today: 'Show from today',
      show_current: 'Show current price',
      show_average: 'Show average',
      show_time_axis: 'Show time axis',
      show_time_zones: 'Show time zones',
      show_entries: 'Show entries count',
      tooltip_enabled: 'Enable tooltips',
      show_ideal_avoid: 'Show highlights',
      highlight_mode: 'Highlight mode',
      max_highlights: 'Maximum highlights',
      layout_style: 'Layout style',
      color_theme: 'Color theme',
      bar_height: 'Bar height',
      bar_spacing: 'Bar spacing',
      basic_settings: 'Basic Settings',
      time_data_settings: 'Time & Data Settings',
      display_options: 'Display Options',
      highlight_settings: 'Highlight Settings',
      appearance_colors: 'Appearance & Colors'
    },
    options: {
      cheapest_times: 'Cheapest times',
      expensive_times: 'Most expensive times',
      standard_red_green: 'Standard (Red/Green)',
      energy_gradient_colors: 'Energy Gradient (9 Colors)',
      uptime_classic: 'Uptime Card Classic',
      price_timeline_style: 'Price Timeline Style',
      blue_to_red: 'Blue to Red',
      traffic_light: 'Traffic Light',
      bars_layout: 'Bars Layout',
      timeline_layout: 'Timeline Layout',
      timeline_colors: 'Timeline Colors'
    }
  }
});

// Localization function with support for nested keys
const localize = async (key, lang = 'en', category = 'card') => {
  const langCode = lang.toLowerCase().substring(0, 2);
  const translations = await loadTranslation(langCode);
  
  // Support nested keys like 'card.no_data' or direct keys for backward compatibility
  if (key.includes('.')) {
    const [cat, subKey] = key.split('.');
    return translations?.[cat]?.[subKey] || getInlineTranslations().en[cat]?.[subKey] || key;
  }
  
  // Direct access with category
  return translations?.[category]?.[key] || getInlineTranslations().en[category]?.[key] || key;
};

// Synchronous version for immediate use (uses cache)
const localizeSync = (key, lang = 'en', category = 'card') => {
  const langCode = lang.toLowerCase().substring(0, 2);
  const translations = translationCache[langCode] || getInlineTranslations()[langCode] || getInlineTranslations().en;
  
  if (key.includes('.')) {
    const [cat, subKey] = key.split('.');
    return translations?.[cat]?.[subKey] || getInlineTranslations().en[cat]?.[subKey] || key;
  }
  
  return translations?.[category]?.[key] || getInlineTranslations().en[category]?.[key] || key;
};

// Color themes
const COLOR_THEMES = {
  default: {
    name: 'Default (Red/Green)',
    colors: ['#45C669', '#C66445']
  },
  energy_gradient: {
    name: 'Energy Gradient',
    colors: ['#04822e', '#12A141', '#79B92C', '#C4D81D', '#F3DC0C', '#EFA51E', '#E76821', '#DC182F']
  },
  timeline: {
    name: 'Timeline Colors',
    colors: ['#1dbfac', '#ff832d']
  },
  uptime_classic: {
    name: 'Uptime Card Classic',
    colors: ['#45C669', '#C6B145', '#C66445']
  },
  blue_red: {
    name: 'Blue to Red',
    colors: ['#2196F3', '#FF5722']
  },
  green_yellow_red: {
    name: 'Traffic Light',
    colors: ['#4CAF50', '#FFEB3B', '#F44336']
  }
};

class DynamicPricesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._lang = 'en';
    
    // Preload default language
    this.initializeTranslations();
  }
  
  async initializeTranslations() {
    try {
      await loadTranslation('en');
    } catch (error) {
      console.warn('Could not preload translations:', error);
    }
  }

  setConfig(config) {
    if (!config?.entity) throw new Error(localizeSync('missing_entity', 'en', 'card'));
    
    // Format title without capitalizing every word
    const defaultTitle = config.entity ? 
      config.entity.split('.').pop().replace(/_/g, ' ').toLowerCase() : 
      'Energy prices';
    
    this._config = {
      title: defaultTitle,
      hours_to_show: 24,
      bar_spacing: 2,
      bar_height: 30,
      bar_round: 2,
      show_current: true,
      show_average: true,
      show_from_today: true, // Start from beginning of today instead of now
      show_time_axis: true,
      show_ideal_avoid: true,
      show_time_zones: false,
      show_entries: true,
      highlight_mode: 'cheapest', // 'cheapest' or 'expensive'
      max_highlights: 5,
      layout_style: 'bars', // 'bars' or 'timeline'
      unit: 'Cent',
      unit_multiplier: 1, // For converting between €/kWh and cent/kWh
      color_theme: 'default',
      custom_colors: [],
      tooltip_enabled: true,
      ...config
    };
    
    // Set unit multiplier based on unit
    if (this._config.unit.toLowerCase().includes('cent')) {
      this._config.unit_multiplier = 100;
    }
    
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this._config = this._config || {};
    // Get language from Home Assistant
    const newLang = hass?.locale?.language || hass?.language || hass?.user?.language || 'en';
    // Map some common language codes
    if (newLang.includes('nl')) this._lang = 'nl';
    else if (newLang.includes('de')) this._lang = 'de';
    else if (newLang.includes('fr')) this._lang = 'fr';
    else this._lang = 'en';
    
    // Load translations for current language if not already loaded
    if (!translationCache[this._lang]) {
      loadTranslation(this._lang).catch(() => {
        console.warn(`Failed to load translations for ${this._lang}, using fallback`);
      });
    }
    
    this.updateCard();
  }

  updateCard() {
    if (!this._hass || !this._config?.entity) return;
    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this.showError(`Entity not found: ${this._config.entity}`);
      return;
    }
    this.renderCard(entity);
  }

  showError(message) {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="error">
          <ha-icon icon="mdi:alert-circle"></ha-icon>
          <span>${message}</span>
        </div>
      </ha-card>
      ${this.getStyles()}
    `;
  }

  extractPrices(entity) {
    // Frank Energie specific: entity.attributes.prices array with {from, till, price}
    let rawPrices = [];
    
    if (entity.attributes?.prices) {
      rawPrices = entity.attributes.prices;
    } else if (entity.attributes?.data) {
      rawPrices = entity.attributes.data;
    } else if (typeof entity.state === 'string') {
      try {
        const parsed = JSON.parse(entity.state);
        rawPrices = parsed.prices || parsed.data || [];
      } catch (e) {
        console.warn('Could not parse entity state as JSON');
      }
    }

    if (!Array.isArray(rawPrices) || rawPrices.length === 0) return [];

    // Convert to consistent format and apply unit multiplier
    const prices = rawPrices.map(item => ({
      datetime: item.from || item.start || item.datetime || item.time,
      price: (item.price ?? item.value ?? item.price_per_kwh) * this._config.unit_multiplier,
      till: item.till || item.end
    })).filter(p => p.datetime && p.price !== undefined);

    if (prices.length === 0) return [];

    // Sort by datetime
    prices.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    // Get current time window - support for today + tomorrow
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startTime, endTime;
    if (this._config.show_from_today) {
      // Show from start of today
      startTime = today;
      endTime = new Date(today.getTime() + (this._config.hours_to_show * 60 * 60 * 1000));
    } else {
      // Show from current hour (include current hour even if started)
      const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      startTime = currentHourStart;
      endTime = new Date(currentHourStart.getTime() + (this._config.hours_to_show * 60 * 60 * 1000));
    }

    // Filter to relevant time window
    let relevantPrices = prices.filter(p => {
      const priceTime = new Date(p.datetime);
      return priceTime >= startTime && priceTime <= endTime;
    });

    // Always respect hours_to_show limit
    if (relevantPrices.length > this._config.hours_to_show) {
      relevantPrices = relevantPrices.slice(0, this._config.hours_to_show);
    }

    return relevantPrices.length > 0 ? relevantPrices : prices.slice(0, this._config.hours_to_show);
  }



  getAllPrices() {
    const entity = this._hass.states[this._config.entity];
    if (!entity) return [];
    
    return this.extractPrices(entity);
  }

  calculateAverage(prices) {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, p) => acc + parseFloat(p.price), 0);
    return sum / prices.length;
  }

  getCurrentPriceIndex(prices) {
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let i = 0; i < prices.length; i++) {
      const priceTime = new Date(prices[i].datetime);
      const priceHour = priceTime.getHours();
      const priceDate = priceTime.getDate();
      const currentDate = now.getDate();
      
      // Check if this price is for the current hour on the current day
      if (priceDate === currentDate && priceHour === currentHour) {
        return i;
      }
    }
    return -1; // No current price found
  }

  getIdealTimeIndices(prices, maxCount = 5) {
    if (!this._config.show_ideal_avoid || prices.length === 0) return [];
    
    const mode = this._config.highlight_mode || 'cheapest';
    
    // Simple approach: sort by price and take the highest/lowest
    const priceWithIndex = prices.map((price, index) => ({
      index,
      price: parseFloat(price.price)
    }));
    
    if (mode === 'expensive') {
      // Sort by price descending (highest first)
      priceWithIndex.sort((a, b) => b.price - a.price);
    } else {
      // Sort by price ascending (lowest first) 
      priceWithIndex.sort((a, b) => a.price - b.price);
    }
    
    // Take the top maxCount indices
    return priceWithIndex.slice(0, maxCount).map(item => item.index);
  }

  findPeaksAndValleys(prices, findPeaks = false) {
    if (prices.length < 3) return [];
    
    const results = [];
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice;
    const threshold = priceRange * 0.15; // 15% threshold for significance
    
    // Find local peaks or valleys
    for (let i = 1; i < prices.length - 1; i++) {
      const prev = priceValues[i - 1];
      const current = priceValues[i];
      const next = priceValues[i + 1];
      
      if (findPeaks) {
        // Find peaks (local maxima)
        if (current > prev && current > next && current - minPrice > threshold) {
          results.push({ index: i, value: current, significance: current - minPrice });
        }
      } else {
        // Find valleys (local minima)
        if (current < prev && current < next && maxPrice - current > threshold) {
          results.push({ index: i, value: current, significance: maxPrice - current });
        }
      }
    }
    
    // Also consider global extremes
    if (findPeaks) {
      const globalMaxIndex = priceValues.indexOf(maxPrice);
      if (!results.find(r => r.index === globalMaxIndex)) {
        results.push({ index: globalMaxIndex, value: maxPrice, significance: maxPrice - minPrice });
      }
    } else {
      const globalMinIndex = priceValues.indexOf(minPrice);
      if (!results.find(r => r.index === globalMinIndex)) {
        results.push({ index: globalMinIndex, value: minPrice, significance: maxPrice - minPrice });
      }
    }
    
    // Sort by significance and return indices
    return results
      .sort((a, b) => b.significance - a.significance)
      .map(r => r.index);
  }

  getTimeZones(prices) {
    if (!this._config.show_time_zones || prices.length === 0) return [];
    
    const zones = [];
    const minPrice = Math.min(...prices.map(p => p.price));
    const maxPrice = Math.max(...prices.map(p => p.price));
    const priceRange = maxPrice - minPrice;
    
    // Get theme colors
    const theme = COLOR_THEMES[this._config.color_theme] || COLOR_THEMES.default;
    const colors = this._config.custom_colors.length > 0 ? this._config.custom_colors : theme.colors;
    
    let currentZone = null;
    
    prices.forEach((price, index) => {
      const priceRatio = (price.price - minPrice) / priceRange;
      let zoneType, zoneColor;
      
      // Use theme colors for zones
      if (colors.length >= 3) {
        // Multi-color theme: use low/medium/high colors
        if (priceRatio <= 0.33) {
          zoneType = 'low';
          zoneColor = colors[0]; // Lowest color
        } else if (priceRatio <= 0.66) {
          zoneType = 'medium'; 
          zoneColor = colors[Math.floor(colors.length / 2)]; // Middle color
        } else {
          zoneType = 'high';
          zoneColor = colors[colors.length - 1]; // Highest color
        }
      } else {
        // Two-color theme: use low/high
        if (priceRatio <= 0.5) {
          zoneType = 'low';
          zoneColor = colors[0];
        } else {
          zoneType = 'high';
          zoneColor = colors[colors.length - 1];
        }
      }
      
      if (!currentZone || currentZone.type !== zoneType) {
        // Start new zone
        if (currentZone) {
          zones.push(currentZone);
        }
        currentZone = {
          type: zoneType,
          color: zoneColor,
          startIndex: index,
          startTime: price.datetime,
          endIndex: index,
          endTime: price.datetime
        };
      } else {
        // Extend current zone
        currentZone.endIndex = index;
        currentZone.endTime = price.datetime;
      }
    });
    
    // Add the last zone
    if (currentZone) {
      zones.push(currentZone);
    }
    
    return zones;
  }

  getIdealAvoidRanges(prices, idealIndices) {
    if (idealIndices.length === 0) return [];
    
    const ranges = [];
    idealIndices.sort((a, b) => a - b); // Sort indices
    
    let rangeStart = idealIndices[0];
    let rangeEnd = idealIndices[0];
    
    for (let i = 1; i < idealIndices.length; i++) {
      const currentIndex = idealIndices[i];
      const prevIndex = idealIndices[i - 1];
      
      // Check if consecutive or close indices (within 2 hours)
      if (currentIndex - prevIndex <= 2) {
        rangeEnd = currentIndex;
      } else {
        // End current range and start new one
        ranges.push({
          start: this.formatTime(prices[rangeStart].datetime),
          end: this.formatTime(new Date(new Date(prices[rangeEnd].datetime).getTime() + 60 * 60 * 1000))
        });
        rangeStart = currentIndex;
        rangeEnd = currentIndex;
      }
    }
    
    // Add the last range
    ranges.push({
      start: this.formatTime(prices[rangeStart].datetime),
      end: this.formatTime(new Date(new Date(prices[rangeEnd].datetime).getTime() + 60 * 60 * 1000))
    });
    
    return ranges;
  }

  renderPositionalRanges(prices, idealIndices) {
    const ranges = this.getIdealAvoidRanges(prices, idealIndices);
    const bgColor = this._config.highlight_mode === 'expensive' ? '#f44336' : 'var(--primary-color)';
    
    // Create a grid based on price positions
    return prices.map((price, index) => {
      // Check if this hour is part of any range
      const rangeForThisHour = ranges.find(range => {
        const priceHour = new Date(price.datetime).getHours();
        const rangeStartHour = parseInt(range.start.split(':')[0]);
        const rangeEndHour = parseInt(range.end.split(':')[0]);
        return priceHour >= rangeStartHour && priceHour < rangeEndHour;
      });
      
      if (rangeForThisHour && index % Math.max(1, Math.floor(prices.length / 6)) === 0) {
        return `<span class="time-range" style="background-color: ${bgColor}; color: white; padding: 2px 4px; border-radius: 8px; font-size: 10px; font-weight: 600;">${rangeForThisHour.start}-${rangeForThisHour.end}</span>`;
      } else if (index % Math.max(1, Math.floor(prices.length / 6)) === 0) {
        return `<span class="time-label">${this.formatTime(price.datetime)}</span>`;
      }
      return '<span class="time-spacer"></span>';
    }).join('');
  }

  renderPositionalRangesTimeline(prices, idealIndices) {
    const ranges = this.getIdealAvoidRanges(prices, idealIndices);
    const bgColor = this._config.highlight_mode === 'expensive' ? '#f44336' : 'var(--primary-color)';
    
    return Array.from({ length: 25 }).map((_, i) => {
      const hour = i % 24;
      const showHour = i % 6 === 0 || i === 24;
      
      // Check if this hour is part of any range
      const rangeForThisHour = ranges.find(range => {
        const rangeStartHour = parseInt(range.start.split(':')[0]);
        const rangeEndHour = parseInt(range.end.split(':')[0]);
        return hour >= rangeStartHour && hour < rangeEndHour;
      });
      
      if (rangeForThisHour && showHour) {
        return `
          <div class="pt-tick">
            <div class="pt-range" style="background-color: ${bgColor}; color: white; padding: 2px 4px; border-radius: 6px; font-size: 9px; font-weight: 600;">${rangeForThisHour.start}-${rangeForThisHour.end}</div>
          </div>
        `;
      } else if (showHour) {
        return `
          <div class="pt-tick">
            <div class="pt-dot"></div>
            <div class="pt-hour">${String(hour).padStart(2, '0')}</div>
          </div>
        `;
      }
      return `<div class="pt-tick"><div class="pt-dot pt-faded"></div></div>`;
    }).join('');
  }

  getColorForPrice(price, minPrice, maxPrice, index) {
    const theme = COLOR_THEMES[this._config.color_theme] || COLOR_THEMES.default;
    const colors = this._config.custom_colors.length > 0 ? this._config.custom_colors : theme.colors;
    
    if (colors.length === 1) {
      return colors[0];
    } else if (colors.length === 2) {
      // Simple gradient between two colors
      const ratio = (price - minPrice) / (maxPrice - minPrice);
      return ratio > 0.5 ? colors[1] : colors[0];
    } else {
      // Multi-color gradient
      const ratio = (price - minPrice) / (maxPrice - minPrice);
      const colorIndex = Math.floor(ratio * (colors.length - 1));
      return colors[Math.min(colorIndex, colors.length - 1)];
    }
  }

  formatTime(datetime) {
    const date = new Date(datetime);
    return date.toLocaleTimeString(this._lang, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  formatPrice(price) {
    const decimals = this._config.unit.toLowerCase().includes('cent') ? 1 : 2;
    return parseFloat(price).toFixed(decimals);
  }

  renderCard(entity) {
    const prices = this.getAllPrices();
    
    if (prices.length === 0) {
      this.showError(localizeSync('no_data', this._lang, 'card'));
      return;
    }
    
    const now = new Date();
    const average = this.calculateAverage(prices);
    const currentIndex = this.getCurrentPriceIndex(prices);
    const currentPrice = currentIndex >= 0 ? prices[currentIndex] : null;
    const idealIndices = this.getIdealTimeIndices(prices, this._config.max_highlights || 5);
    const timeZones = this.getTimeZones(prices);
    
    // Calculate min/max for normalization
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);

    // Timeline layout styling
    if (this._config.layout_style === 'timeline') {
      this.renderTimelineStyle(prices, average, currentIndex, currentPrice, idealIndices, timeZones, minPrice, maxPrice);
      return;
    }

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="header">
          <div class="title">${this._config.title}</div>
          ${this._config.show_current && currentPrice ? `
            <div class="status">
              <span class="current-price">${this.formatPrice(currentPrice.price)} ${this._config.unit}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="timeline-container">
          <div class="timeline">
            ${prices.map((price, index) => {
              const value = parseFloat(price.price);
              const isCurrent = index === currentIndex;
              const priceTime = new Date(price.datetime);
              const nextPriceTime = index < prices.length - 1 ? new Date(prices[index + 1].datetime) : new Date(priceTime.getTime() + 60 * 60 * 1000);
              const isPast = nextPriceTime <= now;
              const isIdeal = idealIndices.includes(index);
              
              const color = this.getColorForPrice(value, minPrice, maxPrice, index);
              const opacity = isPast ? '0.3' : (isCurrent ? '1' : '0.85');
              
              const tooltipContent = this._config.tooltip_enabled ? 
                `data-tooltip="${this.formatTime(price.datetime)}: ${this.formatPrice(value)} ${this._config.unit}"` : '';
              
              const idealClass = isIdeal ? (this._config.highlight_mode === 'expensive' ? 'avoid' : 'ideal') : '';
              const pastClass = isPast ? 'past' : '';
              
              return `
                <div class="bar ${isCurrent ? 'current' : ''} ${idealClass} ${pastClass}" 
                     ${tooltipContent}
                     style="background-color: ${color}; 
                            opacity: ${opacity};
                            height: ${this._config.bar_height}px;
                            border-radius: ${this._config.bar_round}px;
                            margin-right: ${this._config.bar_spacing}px;">
                </div>
              `;
            }).join('')}
          </div>
          
          ${this._config.show_time_axis ? `
            <div class="time-axis">
              ${this._config.show_time_zones && this._config.show_ideal_avoid && idealIndices.length > 0 ? 
                this.renderPositionalRanges(prices, idealIndices) :
                prices.map((price, index) => {
                  if (index % Math.max(1, Math.floor(prices.length / 6)) === 0) {
                    return `<span class="time-label">${this.formatTime(price.datetime)}</span>`;
                  }
                  return '<span class="time-spacer"></span>';
                }).join('')
              }
            </div>
          ` : ''}
          

        </div>

        <div class="footer">
          ${this._config.show_average ? `
            <span>${localizeSync('avg', this._lang, 'card')}: ${this.formatPrice(average)} ${this._config.unit}</span>
          ` : ''}
          ${this._config.show_ideal_avoid && idealIndices.length > 0 ? `
            <span class="ideal-indicator">
              <span class="ideal-dot ${this._config.highlight_mode === 'expensive' ? 'avoid' : 'ideal'}"></span>
              ${this._config.highlight_mode === 'expensive' ? localizeSync('avoid_time', this._lang, 'card') : localizeSync('ideal_time', this._lang, 'card')}
            </span>
          ` : ''}
          ${this._config.show_entries ? `
            <span>${prices.length} ${localizeSync('entries', this._lang, 'card')}</span>
          ` : ''}
        </div>
      </ha-card>
      ${this.getStyles()}
    `;
  }

  renderTimelineStyle(prices, average, currentIndex, currentPrice, idealIndices, timeZones, minPrice, maxPrice) {
    const now = new Date();
    const currentHour = now.getHours();
    const minutes = now.getMinutes();
    const hourProgress = minutes / 60;
    
    // Price timeline specific time label
    const timeLabel = currentPrice ? 
      `${this.formatTime(currentPrice.datetime)}-${this.formatTime(new Date(new Date(currentPrice.datetime).getTime() + 60 * 60 * 1000))}` : 
      '';

    this.shadowRoot.innerHTML = `
      <ha-card class="timeline-card">
        <div class="pt-header">
          <div class="pt-header-left">
            ${this._config.show_current ? `
              <div class="pt-price">
                <span class="pt-value">${currentPrice ? this.formatPrice(currentPrice.price) : '0'}</span>
                <span class="pt-unit">${this._config.unit}</span>
              </div>
            ` : ''}
          </div>
          ${this._config.show_current ? `
            <div class="pt-label">${this._config.title}</div>
          ` : ''}
        </div>

        <div class="pt-timeline">
          ${prices.map((price, index) => {
            const value = parseFloat(price.price);
            const isCurrent = index === currentIndex;
            const priceTime = new Date(price.datetime);
            const nextPriceTime = index < prices.length - 1 ? new Date(prices[index + 1].datetime) : new Date(priceTime.getTime() + 60 * 60 * 1000);
            const isPast = nextPriceTime <= now;
            const isIdeal = idealIndices.includes(index);
            
            // Timeline color logic using current color theme
            const color = this.getColorForPrice(value, minPrice, maxPrice, index);
            const opacity = isPast ? '0.3' : '1';
            
            // Check if next/prev segments have different colors for border radius
            const prevColor = index > 0 ? this.getColorForPrice(prices[index - 1].price, minPrice, maxPrice, index - 1) : null;
            const nextColor = index < prices.length - 1 ? this.getColorForPrice(prices[index + 1].price, minPrice, maxPrice, index + 1) : null;
            
            let borderRadius = '';
            if (prevColor !== color) {
              borderRadius += 'border-top-left-radius: 10px; border-bottom-left-radius: 10px;';
            }
            if (nextColor !== color) {
              borderRadius += 'border-top-right-radius: 10px; border-bottom-right-radius: 10px;';
            }
            
            const markerClass = isCurrent ? 'pt-marker' : '';
            const fadedClass = isPast ? 'pt-faded' : '';
            const idealClass = isIdeal ? (this._config.highlight_mode === 'expensive' ? 'pt-avoid' : 'pt-ideal') : '';
            
            // Enhanced styling for highlights in timeline
            let extraStyle = '';
            if (isIdeal) {
              if (this._config.highlight_mode === 'expensive') {
                extraStyle = 'box-shadow: inset 0 0 0 2px #f44336; border: 2px solid #f44336;';
              } else {
                extraStyle = 'box-shadow: inset 0 0 0 2px var(--primary-color); border: 2px solid var(--primary-color);';
              }
            }
            
            // Add tooltip support
            const tooltipContent = this._config.tooltip_enabled ? 
              `data-tooltip="${this.formatTime(price.datetime)}: ${this.formatPrice(value)} ${this._config.unit}"` : '';
            
            return `
              <div class="pt-slot ${markerClass} ${fadedClass} ${idealClass}" 
                   ${tooltipContent}
                   style="background: ${color}; opacity: ${opacity}; ${borderRadius}; ${extraStyle}; --progress: ${isCurrent ? hourProgress : 0}">
              </div>
            `;
          }).join('')}
        </div>

        ${this._config.show_time_axis ? `
          <div class="pt-scale">
            ${this._config.show_time_zones && this._config.show_ideal_avoid && idealIndices.length > 0 ? 
              this.renderPositionalRangesTimeline(prices, idealIndices) :
              Array.from({ length: 25 }).map((_, i) => {
                const showHour = i % 6 === 0 || i === 24;
                const hourIndex = Math.floor(i * prices.length / 24);
                const isIdealHour = hourIndex < prices.length && idealIndices.includes(hourIndex);
                const dotClass = isIdealHour ? 
                  (this._config.highlight_mode === 'expensive' ? 'pt-dot-avoid' : 'pt-dot-ideal') : 
                  (showHour ? '' : 'pt-faded');
                
                return `
                  <div class="pt-tick">
                    <div class="pt-dot ${dotClass}"></div>
                    ${showHour ? `<div class="pt-hour">${String(i % 24).padStart(2, '0')}</div>` : ''}
                  </div>
                `;
              }).join('')
            }
          </div>
        ` : ''}



        ${this._config.show_average || (this._config.show_ideal_avoid && idealIndices.length > 0) || this._config.show_entries ? `
          <div class="pt-footer">
            ${this._config.show_average ? `
              <span>${localizeSync('avg', this._lang, 'card')}: ${this.formatPrice(average)} ${this._config.unit}</span>
            ` : ''}
            ${this._config.show_ideal_avoid && idealIndices.length > 0 ? `
              <span class="ideal-indicator">
                <span class="ideal-dot ${this._config.highlight_mode === 'expensive' ? 'avoid' : 'ideal'}"></span>
                ${this._config.highlight_mode === 'expensive' ? localizeSync('avoid_time', this._lang, 'card') : localizeSync('ideal_time', this._lang, 'card')}
              </span>
            ` : ''}
            ${this._config.show_entries ? `
              <span>${prices.length} ${localizeSync('entries', this._lang, 'card')}</span>
            ` : ''}
          </div>
        ` : ''}
      </ha-card>
      ${this.getTimelineStyles()}
    `;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="loading">${localizeSync('loading', 'en', 'card')}</div>
      </ha-card>
      ${this.getStyles()}
    `;
  }

  static getStubConfig() {
    return {
      type: 'custom:dynamic-prices-card',
      entity: 'sensor.frank_energie_prijzen_huidige_elektricitetsprijs_all_in',
      title: 'Energy Prices',
      hours_to_show: 24
    };
  }

  static async getConfigForm() {
    // Preload English translations for config form
    const translations = await loadTranslation('en').catch(() => getInlineTranslations().en);
    
    return {
      preview: true,
      schema: [
        // Basic Configuration - Always visible
        {
          name: 'entity',
          required: true,
          label: translations.config?.entity || 'Entity',
          selector: {
            entity: {
              domain: ['sensor']
            }
          }
        },
        {
          name: 'title',
          label: translations.config?.title || 'Title',
          default: '',
          selector: {
            text: {}
          }
        },
        {
          name: 'unit',
          label: translations.config?.unit || 'Unit',
          default: 'Cent',
          selector: {
            select: {
              options: [
                { value: 'Cent', label: 'Cent' },
                { value: '€/kWh', label: '€/kWh' },
                { value: 'cent/kWh', label: 'cent/kWh' },
                { value: 'ct/kWh', label: 'ct/kWh' },
                { value: '$/kWh', label: '$/kWh' },
                { value: 'p/kWh', label: 'p/kWh' }
              ],
              custom_value: true,
              mode: 'dropdown'
            }
          }
        },
        
        // Time & Data Settings
        {
          name: '',
          type: 'expandable',
          title: translations.config?.time_data_settings || 'Time & Data Settings',
          icon: 'mdi:clock-outline',
          schema: [
            {
              name: 'hours_to_show',
              label: translations.config?.hours_to_show || 'Hours to show',
              default: 24,
              selector: {
                number: {
                  min: 1,
                  max: 48,
                  mode: 'box'
                }
              }
            },
            {
              name: 'show_from_today',
              label: translations.config?.show_from_today || 'Show from today',
              default: true,
              selector: {
                boolean: {}
              }
            }
          ]
        },
        
        // Display Options
        {
          name: '',
          type: 'expandable',
          title: translations.config?.display_options || 'Display Options',
          icon: 'mdi:eye-outline',
          schema: [
            {
              name: 'show_current',
              label: translations.config?.show_current || 'Show current price',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'show_average',
              label: translations.config?.show_average || 'Show average',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'show_time_axis',
              label: translations.config?.show_time_axis || 'Show time axis',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'show_time_zones',
              label: translations.config?.show_time_zones || 'Show time zones',
              default: false,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'show_entries',
              label: translations.config?.show_entries || 'Show entries count',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'tooltip_enabled',
              label: translations.config?.tooltip_enabled || 'Enable tooltips',
              default: true,
              selector: {
                boolean: {}
              }
            }
          ]
        },
        
        // Highlight Settings
        {
          name: '',
          type: 'expandable',
          title: translations.config?.highlight_settings || 'Highlight Settings',
          icon: 'mdi:star-outline',
          schema: [
            {
              name: 'show_ideal_avoid',
              label: translations.config?.show_ideal_avoid || 'Show highlights',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'highlight_mode',
              label: translations.config?.highlight_mode || 'Highlight mode',
              default: 'cheapest',
              selector: {
                select: {
                  options: [
                    { value: 'cheapest', label: translations.options?.cheapest_times || 'Cheapest times' },
                    { value: 'expensive', label: translations.options?.expensive_times || 'Most expensive times' }
                  ],
                  mode: 'dropdown'
                }
              }
            },
            {
              name: 'max_highlights',
              label: translations.config?.max_highlights || 'Maximum highlights',
              default: 5,
              selector: {
                number: {
                  min: 1,
                  max: 12,
                  mode: 'box'
                }
              }
            }
          ]
        },
        
        // Appearance Settings
        {
          name: '',
          type: 'expandable',
          title: translations.config?.appearance_colors || 'Appearance & Colors',
          icon: 'mdi:palette-outline',
          schema: [
            {
              name: 'layout_style',
              label: translations.config?.layout_style || 'Layout style',
              default: 'bars',
              selector: {
                select: {
                  options: [
                    { value: 'bars', label: translations.options?.bars_layout || 'Bars Layout' },
                    { value: 'timeline', label: translations.options?.timeline_layout || 'Timeline Layout' }
                  ],
                  mode: 'dropdown'
                }
              }
            },
            {
              name: 'color_theme',
              label: translations.config?.color_theme || 'Color theme',
              default: 'default',
              selector: {
                select: {
                  options: [
                    { value: 'default', label: translations.options?.standard_red_green || 'Standard (Red/Green)' },
                    { value: 'energy_gradient', label: translations.options?.energy_gradient_colors || 'Energy Gradient (9 Colors)' },
                    { value: 'timeline', label: translations.options?.timeline_colors || 'Timeline Colors' },
                    { value: 'uptime_classic', label: translations.options?.uptime_classic || 'Uptime Card Classic' },
                    { value: 'blue_red', label: translations.options?.blue_to_red || 'Blue to Red' },
                    { value: 'green_yellow_red', label: translations.options?.traffic_light || 'Traffic Light' }
                  ],
                  mode: 'dropdown'
                }
              }
            },
            {
              name: 'bar_height',
              label: translations.config?.bar_height || 'Bar height',
              default: 30,
              selector: {
                number: {
                  min: 10,
                  max: 100,
                  mode: 'box'
                }
              }
            },
            {
              name: 'bar_spacing',
              label: translations.config?.bar_spacing || 'Bar spacing',
              default: 2,
              selector: {
                number: {
                  min: 0,
                  max: 10,
                  mode: 'box'
                }
              }
            }
          ]
        }
      ]
    };
  }

  getStyles() {
    return `
      <style>
        :host {
          display: block;
          --color-ok: #45C669;
          --color-ko: #C66445;
          --color-half: #C6B145;
          --color-none: #C9C9C9;
          --color-turquoise-light: #1dbfac;
          --color-orange-light: #ff832d;
          --color-turquoise-dark: #1dbfac;
          --color-orange-dark: #ff832d;
        }
        
        ha-card {
          background: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 12px);
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          font-family: var(--paper-font-common-base_-_font-family, sans-serif);
          position: relative;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .title {
          font-size: 16px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        
        .status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .current-price {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        
        
        .timeline-container {
          margin: 12px 0;
          position: relative;
        }
        
        .timeline {
          display: flex;
          align-items: flex-end;
          height: ${this._config?.bar_height || 30}px;
          gap: ${this._config?.bar_spacing || 2}px;
        }
        
        .bar {
          flex: 1;
          min-width: 2px;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }
        
        .bar.past {
          filter: brightness(0.7);
        }
        
        .bar.current::after {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid var(--primary-color, #03A9F4);
        }
        
        .bar.current {
          box-shadow: 0 0 12px rgba(3, 169, 244, 0.6);
          border: 3px solid var(--primary-color, #03A9F4) !important;
          transform: scale(1.1);
          z-index: 2;
          position: relative;
        }
        
        .bar.ideal {
          border: 2px solid var(--primary-color);
          box-shadow: 0 0 6px rgba(var(--rgb-primary-color), 0.4);
        }
        
        .bar.avoid {
          border: 2px solid #f44336;
          box-shadow: 0 0 6px rgba(244, 67, 54, 0.4);
        }
        
        .bar:hover {
          opacity: 0.8 !important;
          transform: scale(1.05);
        }
        
        .bar[data-tooltip]:hover::before {
          content: attr(data-tooltip);
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary-text-color);
          color: var(--card-background-color);
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .bar[data-tooltip]:hover::after {
          content: '';
          position: absolute;
          bottom: calc(100% + 2px);
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--primary-text-color);
          z-index: 10;
        }
        
        .time-axis {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          padding: 0 2px;
          flex-wrap: wrap;
          gap: 4px;
        }

        .zone-range {
          font-variant-numeric: tabular-nums;
        }
        
        .time-label {
          font-size: 10px;
          color: var(--secondary-text-color);
        }
        
        .time-spacer {
          flex: 1;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--divider-color);
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .ideal-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .ideal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid var(--primary-color);
          background: transparent;
        }
        
        .ideal-dot.avoid {
          border-color: #f44336;
          background: #f44336;
        }
        
        .time-zones {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .time-zone {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .zone-label {
          font-weight: 600;
        }
        
        .error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f44336;
          font-size: 14px;
        }
        
        .loading {
          text-align: center;
          color: var(--secondary-text-color);
          padding: 20px;
        }
        
        @media (max-width: 600px) {
          ha-card {
            padding: 12px;
          }
          
          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .timeline {
            height: ${Math.max(20, (this._config?.bar_height || 30) * 0.7)}px;
          }
          
          .footer {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .bar[data-tooltip]:hover::before {
            font-size: 10px;
            padding: 4px 6px;
          }
        }
      </style>
    `;
  }

  getTimelineStyles() {
    return `
      <style>
        .timeline-card {
          background: var(--ha-card-background, var(--card-background-color, #fff));
          padding: 16px;
          font-family: var(--paper-font-common-base_-_font-family, sans-serif);
          color: var(--primary-text-color);
          text-align: center;
        }

        .pt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .pt-header-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }

        .pt-time {
          font-size: 14px;
          color: var(--secondary-text-color);
          line-height: 1.1;
          margin: 0;
        }

        .pt-price {
          font-size: 24px;
          font-weight: bold;
          color: var(--primary-text-color);
          line-height: 1.1;
          margin-top: 3px;
          display: flex;
          align-items: baseline;
          justify-content: center;
        }

        .pt-value {
          font-size: 28px;
          font-weight: 800;
        }

        .pt-unit {
          font-size: 14px;
          font-weight: normal;
          margin-left: 6px;
          color: var(--primary-text-color);
        }

        .pt-label {
          font-size: 14px;
          color: var(--secondary-text-color);
        }

        .pt-timeline {
          display: flex;
          margin: 8px 0;
          height: 6px;
          border-radius: 5px;
          overflow: visible;
          position: relative;
        }

        .pt-slot {
          flex: 1;
          opacity: 1;
          position: relative;
        }

        .pt-slot.pt-marker::after {
          content: "";
          position: absolute;
          top: 50%;
          left: calc(var(--progress, 0) * 100%);
          transform: translate(-50%, -50%);
          width: 3px;
          height: 14px;
          background: inherit;
          border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
          border-radius: 10px;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
        }

        .pt-slot.pt-faded {
          opacity: 0.3;
        }

        .pt-slot.pt-ideal {
          border: 2px solid var(--primary-color) !important;
          box-shadow: 0 0 8px rgba(var(--rgb-primary-color), 0.6) !important;
          transform: scaleY(1.5);
          z-index: 2;
        }

        .pt-slot.pt-avoid {
          border: 2px solid #f44336 !important;
          box-shadow: 0 0 8px rgba(244, 67, 54, 0.6) !important;
          transform: scaleY(1.5);
          z-index: 2;
        }

        .pt-slot[data-tooltip] {
          cursor: pointer;
        }

        .pt-slot[data-tooltip]:hover::before {
          content: attr(data-tooltip);
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary-text-color);
          color: var(--card-background-color);
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .pt-slot[data-tooltip]:hover::after {
          content: '';
          position: absolute;
          bottom: calc(100% + 2px);
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--primary-text-color);
          z-index: 10;
        }

        .pt-scale {
          display: grid;
          grid-template-columns: repeat(25, 1fr);
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 6px;
          width: calc(100% + (100% / 24));
          margin-left: calc(-0.5 * (100% / 24));
          margin-right: calc(-0.5 * (100% / 24));
        }

        .pt-tick {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pt-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--divider-color);
          margin-bottom: 4px;
        }

        .pt-dot.pt-faded {
          opacity: 0.4;
        }

        .pt-dot.pt-dot-ideal {
          background: var(--primary-color);
          box-shadow: 0 0 4px rgba(var(--rgb-primary-color), 0.6);
        }

        .pt-dot.pt-dot-avoid {
          background: #f44336;
          box-shadow: 0 0 4px rgba(244, 67, 54, 0.6);
        }

        .pt-hour {
          font-variant-numeric: tabular-nums;
          text-align: center;
        }

        .pt-zone-tick {
          display: flex;
          justify-content: center;
          margin: 0 4px;
        }



        .pt-zone-time {
          font-size: 11px;
          color: var(--primary-text-color);
          font-weight: 600;
          padding: 2px 6px;
          background: var(--primary-color);
          color: white;
          border-radius: 8px;
          font-variant-numeric: tabular-nums;
        }

        .pt-time-zones {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pt-time-zone {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        .pt-zone-label {
          font-weight: 600;
        }

        .pt-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--divider-color);
          flex-wrap: wrap;
          gap: 8px;
        }
      </style>
    `;
  }


}

customElements.define('dynamic-prices-card', DynamicPricesCard);

// No custom editor needed - using built-in HA form editor

// Register with HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dynamic-prices-card',
  name: 'Dynamic Prices Card',
  description: 'Modern energy price card with dual layouts and smart highlighting',
  version: '2025.10.1',
  preview: true
});

console.info(
  `%c  DYNAMIC-PRICES-CARD  %c  v2025.10.1  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);