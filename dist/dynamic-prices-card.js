// Dynamic Prices Card v2025.10.1
// Clean implementation based on uptime-card design + price-timeline functionality
// https://github.com/ViperRNMC/dynamic-prices-card

// Translation cache with size limit to prevent memory leaks
let translationCache = {};
const MAX_CACHE_SIZE = 10;

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
          // Cleanup cache if it gets too large
          const cacheKeys = Object.keys(translationCache);
          if (cacheKeys.length >= MAX_CACHE_SIZE) {
            // Remove oldest entries (keep en and most recent)
            const keysToRemove = cacheKeys.filter(k => k !== 'en').slice(0, -2);
            keysToRemove.forEach(k => delete translationCache[k]);
          }
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

  // Compute "nice" axis min/max and step for readable tick values
  getNiceScale(min, max, maxTicks = 3, zeroBaselinePreferred = true) {
    const niceNum = (range, round) => {
      const exponent = Math.floor(Math.log10(range || 1));
      const fraction = (range || 1) / Math.pow(10, exponent);
      let niceFraction;
      if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
      } else {
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
      }
      return niceFraction * Math.pow(10, exponent);
    };

    // Optionally prefer a zero baseline when all values are positive
    if (zeroBaselinePreferred && min >= 0) min = 0;

    if (max === min) {
      // Avoid zero range — create a small span
      const pad = Math.abs(max) * 0.1 || 0.1;
      max += pad;
      min -= pad;
      if (zeroBaselinePreferred && min >= 0) min = 0;
    }

    const range = niceNum(max - min, false);
    const tickSpacing = niceNum(range / Math.max(2, maxTicks - 1), true);
    const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
    const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
    return { niceMin, niceMax, tickSpacing };
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
          bar_height: config.bar_height || 15,
      bar_round: 2,
      show_current: true,
      show_average: true,
      show_from_today: true, // Start from beginning of today instead of now
      show_time_axis: true,
      show_ideal_avoid: true,
      show_time_zones: false,
      show_optimal_zones: true, // Show optimal time zones in bars/timeline
      show_avoid_zones: true, // Show avoid time zones in bars/timeline
      show_entries: true,
      highlight_mode: 'cheapest', // 'cheapest' or 'expensive'
      max_highlights: 5,
      layout_style: 'bars', // 'bars', 'timeline', or 'graph'
      indicator_position: 'bottom', // 'top' or 'bottom'
      unit: 'Cent',
      unit_multiplier: 1, // For converting between €/kWh and cent/kWh
      decimal_precision: undefined, // Auto-detect based on unit (cent=1, euro=2) or custom value
      color_theme: 'default',
      custom_colors: [],
      tooltip_enabled: true,
      // Grid management settings
      grid_mode: 'consumption', // 'consumption' or 'feed_in'
      // Note: Feed-in follows Frank Energie rules: market price - inkoopvergoeding (no energy tax)
      show_optimal_periods: true, // Show optimal periods for consumption/feed-in
      show_avoid_periods: true, // Show periods to avoid consumption/feed-in
      avoid_threshold_type: 'percentage', // 'percentage', 'absolute', 'negative'
      avoid_threshold_value: 80, // Above 80th percentile or absolute value
      // Price calculation settings - simplified universal structure
      enable_price_calculation: false,      // Enable price calculations

      grid_compensation: '0.01815',         // Grid consumption compensation (€/kWh or entity)
      feedin_compensation: '0.01271',       // Feed-in inkoopvergoeding (€/kWh or entity) - subtracted from market price
      energy_tax: '0.12286',               // Energy tax (€/kWh or entity) - consumption only
      vat_rate: '0',                       // VAT rate (% or entity) - applied to final price
      ...config
    };
    
    // Auto-detect unit multiplier based on unit
    if (config.unit_multiplier === undefined) {
      const unit = this._config.unit.toLowerCase();
      if (unit.includes('cent') || unit.includes('ct')) {
        this._config.unit_multiplier = 100; // cent = euro * 100
      } else if (unit.includes('€') || unit.includes('eur')) {
        this._config.unit_multiplier = 1; // euro = euro * 1
      }
    }
    
    // Backward compatibility: convert old show_ideal_avoid to new optimal/avoid settings
    if (config.show_ideal_avoid !== undefined && config.show_optimal_periods === undefined) {
      this._config.show_optimal_periods = config.show_ideal_avoid;
      this._config.show_avoid_periods = config.show_ideal_avoid;
    }
    
    // Set unit multiplier based on unit
    if (this._config.unit.toLowerCase().includes('cent')) {
      this._config.unit_multiplier = 100;
    }
    
    // Grid mode logic
    if (this._config.grid_mode === 'feed_in') {
      // For feed-in mode, we want to highlight high price times (when it's good to feed back to grid)
      this._config.highlight_mode = 'expensive';
    } else {
      // For consumption mode, we want to highlight low price times (when it's good to consume from grid)
      this._config.highlight_mode = this._config.highlight_mode || 'cheapest';
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
    // Support multiple price data formats
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

    // Convert to consistent format and apply price calculations (keep everything in €/kWh)
    const prices = rawPrices.map(item => {
      const basePrice = item.price ?? item.value ?? item.price_per_kwh; // Always in €/kWh
      const calculatedPrice = this.calculatePrice(basePrice, this._config.grid_mode !== 'feed_in');
      return {
        datetime: item.from || item.start || item.datetime || item.time,
        price: calculatedPrice, // Store in €/kWh - formatPrice will convert for display
        originalPrice: basePrice, // Original market price in €/kWh
        till: item.till || item.end
      };
    }).filter(p => p.datetime && p.price !== undefined);

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
    const entityKey = this._config.entity;
    const entity = this._hass.states[entityKey];
    if (!entity) return [];
    
    const basePrices = this.extractPrices(entity);
    
    return basePrices;
  }

  calculatePrice(basePrice, isConsumption = true) {
    // If price calculation is disabled, return base price
    if (!this._config.enable_price_calculation) {
      return basePrice;
    }
    
    let calculatedPrice = parseFloat(basePrice);
    
    // All calculations are done in €/kWh (base unit)
    // If display unit is cent, conversion happens in formatPrice()
    
    if (isConsumption) {
      // CONSUMPTION: Market price + grid compensation + energy tax
      const gridCompensation = this.getValueOrEntityValue('grid_compensation', 0.01815);
      calculatedPrice += gridCompensation;
      
      // Add energy tax (only for consumption)
      const energyTax = this.getValueOrEntityValue('energy_tax', 0.12286);
      calculatedPrice += energyTax;
    } else {
      // FEED-IN (Frank Energie rules): (Market price + VAT) - inkoopvergoeding (no energy tax)
      // First apply VAT to market price
      const vatRate = this.getValueOrEntityValue('vat_rate', 0);
      if (vatRate > 0) {
        const vatMultiplier = vatRate > 1 ? (vatRate / 100) : vatRate;
        calculatedPrice *= (1 + vatMultiplier);
      }
      
      // Then subtract inkoopvergoeding (already incl. VAT)
      const feedinCompensation = this.getValueOrEntityValue('feedin_compensation', 0.01271);
      calculatedPrice -= feedinCompensation;
    }
    
    // Apply VAT if configured (only for consumption - feed-in VAT already applied above)
    const vatRate = this.getValueOrEntityValue('vat_rate', 0);
    if (vatRate > 0 && isConsumption) {
      // If value > 1, treat as percentage (e.g., 21 = 21%)
      const vatMultiplier = vatRate > 1 ? (vatRate / 100) : vatRate;
      calculatedPrice *= (1 + vatMultiplier);
    }
    
    // Return price in €/kWh - formatPrice() will handle unit conversion for display
    return calculatedPrice;
  }
  
  getValueOrEntityValue(configKey, defaultValue) {
    const configValue = this._config[configKey];
    if (!configValue) return defaultValue;
    
    // If it looks like an entity (contains a dot), try to get entity value
    if (typeof configValue === 'string' && configValue.includes('.')) {
      const entityState = this._hass?.states?.[configValue];
      if (entityState && !isNaN(parseFloat(entityState.state))) {
        return parseFloat(entityState.state);
      }
      // If entity not found or invalid, try to parse as number
      return isNaN(parseFloat(configValue)) ? defaultValue : parseFloat(configValue);
    }
    
    // Otherwise parse as number
    return isNaN(parseFloat(configValue)) ? defaultValue : parseFloat(configValue);
  }
  


  calculateAverage(prices) {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, p) => acc + p.price, 0); // Use already calculated prices
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
    if (!this._config.show_optimal_periods || prices.length === 0) return [];
    
    // Grid mode determines ideal time logic
    const gridMode = this._config.grid_mode || 'consumption';
    
    const priceWithIndex = prices.map((price, index) => ({
      index,
      price: parseFloat(price.price)
    }));
    
    if (gridMode === 'feed_in') {
      // For feed-in: prefer highest prices (best time to sell energy back to grid)
      priceWithIndex.sort((a, b) => b.price - a.price);
    } else {
      // For consumption: prefer lowest prices (best time to use energy from grid)
      priceWithIndex.sort((a, b) => a.price - b.price);
    }
    
    // Take the top maxCount indices
    return priceWithIndex.slice(0, maxCount).map(item => item.index);
  }

  getAvoidTimeIndices(prices, maxCount = 3) {
    if (!this._config.show_avoid_periods || prices.length === 0) return [];
    
    const gridMode = this._config.grid_mode || 'consumption';
    const thresholdType = this._config.avoid_threshold_type || 'percentage';
    const thresholdValue = this._config.avoid_threshold_value || 80;
    
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    
    let avoidIndices = [];
    
    if (thresholdType === 'negative') {
      // For feed-in: avoid negative prices (costs money to feed back)
      avoidIndices = prices
        .map((price, index) => ({ index, price: parseFloat(price.price) }))
        .filter(item => item.price < 0)
        .map(item => item.index);
    } else if (thresholdType === 'percentage') {
      // Percentage-based threshold
      const thresholdPrice = gridMode === 'feed_in' 
        ? minPrice + ((maxPrice - minPrice) * (100 - thresholdValue) / 100) // Low prices for feed-in
        : minPrice + ((maxPrice - minPrice) * thresholdValue / 100); // High prices for consumption
      
      avoidIndices = prices
        .map((price, index) => ({ index, price: parseFloat(price.price) }))
        .filter(item => gridMode === 'feed_in' ? item.price < thresholdPrice : item.price > thresholdPrice)
        .sort((a, b) => gridMode === 'feed_in' ? a.price - b.price : b.price - a.price)
        .slice(0, maxCount)
        .map(item => item.index);
    } else if (thresholdType === 'absolute') {
      // Absolute price threshold
      avoidIndices = prices
        .map((price, index) => ({ index, price: parseFloat(price.price) }))
        .filter(item => gridMode === 'feed_in' ? item.price < thresholdValue : item.price > thresholdValue)
        .slice(0, maxCount)
        .map(item => item.index);
    }
    
    return avoidIndices;
  }



  getTimeZones(prices) {
    if ((!this._config.show_optimal_zones && !this._config.show_avoid_zones) || prices.length === 0) return [];
    
    const zones = [];
    // Reuse existing price values if available, otherwise calculate
    let minPrice, maxPrice;
    if (prices.length > 0) {
      const priceValues = prices.map(p => parseFloat(p.price));
      minPrice = Math.min(...priceValues);
      maxPrice = Math.max(...priceValues);
    } else {
      minPrice = maxPrice = 0;
    }
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



  renderPositionalRanges(prices, idealIndices, avoidIndices) {
    // Find consecutive ideal and avoid time ranges
    const optimalRanges = this._config.show_optimal_zones ? this.getIdealTimeRanges(prices, idealIndices) : [];
    const avoidRanges = this._config.show_avoid_zones ? this.getIdealTimeRanges(prices, avoidIndices) : [];

    // Get dynamic colors from color scheme
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const optimalColor = this.getOptimalAvoidColor(true, false, minPrice, maxPrice) || '#4CAF50';
    const avoidColor = this.getOptimalAvoidColor(false, true, minPrice, maxPrice) || '#f44336';

    const allRanges = [
      ...optimalRanges.map(r => ({ ...r, type: 'optimal', color: optimalColor })),
      ...avoidRanges.map(r => ({ ...r, type: 'avoid', color: avoidColor }))
    ].sort((a, b) => a.startIndex - b.startIndex);

    const used = new Set();
    const step = this.getTimelineTickStep(prices.length);

    return prices.map((price, index) => {
      const hour = new Date(price.datetime).getHours();
      const showHour = index % Math.max(1, step) === 0;
      const range = allRanges.find(r => r.startIndex === index);
      if (range && !used.has(index)) {
        for (let i = 0; i < range.span; i++) used.add(index + i);
        const label = range.single ? `${range.startHour}` : `${range.startHour}-${range.endHour}`;
        const padding = label.length > 2 ? '3px 5px' : '3px 4px';
        const fontSize = range.span >= 3 ? 'var(--chip-font-size, 10px)' : 'calc(var(--chip-font-size, 10px) - 1px)';
        
        // Use simple flex approach to match bars exactly
        let flexSpan = '';
        for (let i = 0; i < range.span; i++) {
          flexSpan += '<div class="bar-tick" style="flex: 1;"></div>';
        }
        
        return `
          <div class="bar-tick-range" style="display:contents;">
            ${Array(range.span).fill(0).map((_, i) => i === Math.floor(range.span / 2) ? 
              `<div class="bar-tick" style="flex: 1; display:flex; align-items:center; justify-content:center;">
                <div class="zone-chip" style="background:${range.color}; color:#fff; padding:${padding}; border-radius:6px; line-height:1.2; white-space:nowrap; text-align:center; font-size: ${fontSize}; position:absolute; z-index:10;">
                  ${label}
                </div>
              </div>` : 
              `<div class="bar-tick" style="flex: 1;"></div>`
            ).join('')}
          </div>
        `;
      }
      if (used.has(index)) return '';
      
      // Individual time slot
      return `
        <div class="bar-tick" style="flex: 1; display:flex; align-items:center; justify-content:center;">
          ${showHour ? `<div class="time-label">${String(hour).padStart(2,'0')}</div>` : ''}
        </div>
      `;
    }).filter(Boolean).join('');
  }

  getIdealTimeRanges(prices, idealIndices) {
    if (idealIndices.length === 0) return [];
    
    const ranges = [];
    const sortedIndices = [...idealIndices].sort((a, b) => a - b);
    
    let rangeStart = sortedIndices[0];
    let rangeEnd = sortedIndices[0];
    
    for (let i = 1; i < sortedIndices.length; i++) {
      const currentIndex = sortedIndices[i];
      const prevIndex = sortedIndices[i - 1];
      
      // Check if truly consecutive indices (exactly 1 apart)
      if (currentIndex - prevIndex === 1) {
        rangeEnd = currentIndex;
      } else {
        // End current range and start new one
        const startHour = new Date(prices[rangeStart].datetime).getHours();
        const endHour = new Date(prices[rangeEnd].datetime).getHours();
        
        // Add range with start index for positioning
        if (rangeStart === rangeEnd) {
          ranges.push({ 
            startHour, 
            endHour: startHour, 
            single: true, 
            startIndex: rangeStart,
            span: 1
          });
        } else {
          ranges.push({ 
            startHour, 
            endHour,
            startIndex: rangeStart,
            span: rangeEnd - rangeStart + 1
          });
        }
        
        rangeStart = currentIndex;
        rangeEnd = currentIndex;
      }
    }
    
    // Add the last range
    const startHour = new Date(prices[rangeStart].datetime).getHours();
    const endHour = new Date(prices[rangeEnd].datetime).getHours();
    
    if (rangeStart === rangeEnd) {
      ranges.push({ 
        startHour, 
        endHour: startHour, 
        single: true, 
        startIndex: rangeStart,
        span: 1
      });
    } else {
      ranges.push({ 
        startHour, 
        endHour,
        startIndex: rangeStart,
        span: rangeEnd - rangeStart + 1
      });
    }
    
    return ranges;
  }

  renderPositionalRangesTimeline(prices, idealIndices, avoidIndices) {
    // Find consecutive ideal and avoid time ranges
    const optimalRanges = this._config.show_optimal_zones ? this.getIdealTimeRanges(prices, idealIndices) : [];
    const avoidRanges = this._config.show_avoid_zones ? this.getIdealTimeRanges(prices, avoidIndices) : [];

    // Get dynamic colors from color scheme
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const optimalColor = this.getOptimalAvoidColor(true, false, minPrice, maxPrice) || '#4CAF50';
    const avoidColor = this.getOptimalAvoidColor(false, true, minPrice, maxPrice) || '#f44336';

    const allRanges = [
      ...optimalRanges.map(r => ({ ...r, type: 'optimal', color: optimalColor })),
      ...avoidRanges.map(r => ({ ...r, type: 'avoid', color: avoidColor }))
    ].sort((a, b) => a.startIndex - b.startIndex);

  const total = prices.length;
  const step = this.getTimelineTickStep(total);

    // Build chips layer (absolute positioned across the axis)
    const chipsHtml = allRanges.map(range => {
      const left = (range.startIndex / total) * 100;
      const width = (range.span / total) * 100;
      const label = range.single ? range.startHour : `${range.startHour}-${range.endHour}`;
      const padding = label.toString().length > 2 ? '2px 4px' : '2px 3px';
      return `<div class="pt-chip ${range.type === 'optimal' ? 'pt-chip-ideal' : 'pt-chip-avoid'}" style="left: ${left}%; width: ${width}%; background-color: ${range.color}; padding: ${padding};">${label}</div>`;
    }).join('');

    // Build per-hour tick row with a dot for every hour
    const ticksHtml = prices.map((price, index) => {
      const hour = new Date(price.datetime).getHours();
      let showHour = index % Math.max(1, step) === 0;
      const isIdeal = idealIndices.includes(index);
      const isAvoid = avoidIndices.includes(index);
      const dotClass = isIdeal ? 'pt-dot-ideal' : (isAvoid ? 'pt-dot-avoid' : 'pt-faded');
      return `
        <div class="pt-tick" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 0; box-sizing: border-box;">
          <div class="pt-dot ${dotClass}"></div>
          ${showHour ? `<div class="pt-hour" style="margin-top: 4px;">${String(hour).padStart(2, '0')}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="pt-chip-layer">${chipsHtml}</div>
      <div class="pt-ticks">${ticksHtml}</div>
    `;
  }

  renderBasicTimeAxis(prices) {
    const step = this.getTimelineTickStep(prices.length);
    return prices.map((price, index) => {
      const showLabel = index % Math.max(1, step) === 0;
      
      if (showLabel) {
        const hour = new Date(price.datetime).getHours();
        return `<span class="time-label" style="flex: 1; display: flex; justify-content: center; align-items: center; text-align: center;">${String(hour).padStart(2, '0')}</span>`;
      }
      return `<span class="time-spacer" style="flex: 1;"></span>`;
    }).join('');
  }

  renderBasicTimelineAxis(prices, idealIndices, avoidIndices) {
    const step = this.getTimelineTickStep(prices.length);
    return prices.map((price, index) => {
          const showLabel = index % Math.max(1, step) === 0;
          const hour = new Date(price.datetime).getHours();
          
          if (showLabel) {
            return `
              <div class="pt-tick" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 0;">
                <div class="pt-time-label">${String(hour).padStart(2, '0')}</div>
              </div>
            `;
          }
          return `
            <div class="pt-tick" style="flex: 1; min-width: 0;">
            </div>
          `;
    }).join('');
  }

  renderCleanTimelineAxis(prices) {
    // Create timeline ticks with proper spacing - similar to zone version but without zones
    const result = [];
    const step = this.getTimelineTickStep(prices.length);
    
    prices.forEach((price, index) => {
      const hour = new Date(price.datetime).getHours();
      const showHour = index % Math.max(1, step) === 0;
      
      if (showHour) {
        result.push(`
          <div class="pt-tick" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 0; box-sizing: border-box;">
            <div class="pt-dot"></div>
            <div class="pt-hour" style="margin-top: 0;">${String(hour).padStart(2, '0')}</div>
          </div>
        `);
      } else {
        result.push(`
          <div class="pt-tick" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 0; box-sizing: border-box;">
            <div class="pt-dot pt-faded"></div>
          </div>
        `);
      }
    });
    
    return result.join('');
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

  getOptimalAvoidColor(isOptimal, isAvoid, minPrice, maxPrice) {
    if (!isOptimal && !isAvoid) return null;
    
    const theme = COLOR_THEMES[this._config.color_theme] || COLOR_THEMES.default;
    const colors = this._config.custom_colors.length > 0 ? this._config.custom_colors : theme.colors;
    
    if (colors.length === 1) {
      return colors[0];
    }
    
    const isFeedIn = this._config.grid_mode === 'feed_in';
    
    if (isOptimal) {
      // Optimal periods
      if (isFeedIn) {
        // Feed-in: optimal = high prices → use lowest color (inverted)
        return colors[0];
      } else {
        // Consumption: optimal = low prices → use lowest color
        return colors[0];
      }
    } else if (isAvoid) {
      // Avoid periods  
      if (isFeedIn) {
        // Feed-in: avoid = low prices → use highest color (inverted)
        return colors[colors.length - 1];
      } else {
        // Consumption: avoid = high prices → use highest color
        return colors[colors.length - 1];
      }
    }
    
    return null;
  }

  setOptimalAvoidColors(minPrice, maxPrice) {
    // Get colors from color scheme for optimal and avoid
    const optimalColor = this.getOptimalAvoidColor(true, false, minPrice, maxPrice) || '#4CAF50';
    const avoidColor = this.getOptimalAvoidColor(false, true, minPrice, maxPrice) || '#f44336';
    
    // Convert hex to rgba for shadows
    const hexToRgba = (hex, alpha = 0.4) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Set CSS custom properties on shadow root for proper inheritance
    if (this.shadowRoot) {
      const rootElement = this.shadowRoot.host || this;
      rootElement.style.setProperty('--optimal-color', optimalColor);
      rootElement.style.setProperty('--avoid-color', avoidColor);
      rootElement.style.setProperty('--optimal-shadow', hexToRgba(optimalColor));
      rootElement.style.setProperty('--avoid-shadow', hexToRgba(avoidColor));
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
    let formattedPrice = parseFloat(price);
    
    // Apply unit multiplier for display conversion
    if (this._config.unit_multiplier && this._config.unit_multiplier !== 1) {
      formattedPrice = formattedPrice * this._config.unit_multiplier;
    }
    
    const decimals = this._config.decimal_precision !== undefined ? 
      this._config.decimal_precision : 
      (this._config.unit.toLowerCase().includes('cent') ? 1 : 2);
    return formattedPrice.toFixed(decimals);
  }

  // Axis-friendly formatter: apply unit multiplier, then trim trailing zeros
  formatAxisValue(value) {
    let v = parseFloat(value);
    if (this._config.unit_multiplier && this._config.unit_multiplier !== 1) {
      v = v * this._config.unit_multiplier;
    }
    // Allow up to 3 decimals but trim trailing zeros and stray decimal
    const maxDecimals = this._config.decimal_precision !== undefined
      ? Math.min(3, this._config.decimal_precision)
      : 3;
    let s = v.toFixed(maxDecimals);
    s = s.replace(/\.0+$/,'').replace(/\.(\d*?)0+$/,'.$1');
    // If it ends with a dot after trimming, remove it
    if (s.endsWith('.')) s = s.slice(0, -1);
    return s;
  }

  // Determine tick step for timeline/graph based on available width
  getTimelineTickStep(total) {
    const w = this._lastCardWidth || 0;
    // Default ~6 labels
    let labels = 6;
    if (w > 0 && w < 300) labels = 4; // very compact
    else if (w > 0 && w < 380) labels = 5; // compact
    const step = Math.max(1, Math.floor(total / labels));
    return step;
  }

  // Setup responsive sizing for heights and compact mode (precise to HA grid sizing)
  setupResponsiveSizing() {
    if (!this.shadowRoot) return;
    const card = this.shadowRoot.querySelector('ha-card');
    if (!card) return;
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const rect = entry.contentRect;
          this._lastCardWidth = rect.width;
          this._lastCardHeight = rect.height;
          const compact = rect.height < 220 || rect.width < 360;
          // Temporarily disable footer auto-hide to debug visibility issues
          const hideFooter = false;
          if (compact) this.shadowRoot.host.classList.add('compact');
          else this.shadowRoot.host.classList.remove('compact');
          // Hide footer only on 2-row cards to save space
          if (hideFooter) this.shadowRoot.host.classList.add('hide-footer');
          else this.shadowRoot.host.classList.remove('hide-footer');
          // Compute precise heights for current layout
          this.computeAndSetHeights();
        }
      });
      this._resizeObserver.observe(card);
    }
  }

  // Compute precise heights for bars and graph based on actual container sizes
  computeAndSetHeights() {
    if (!this.shadowRoot) return;
    const card = this.shadowRoot.querySelector('ha-card');
    if (!card) return;

    // Bars layout: honor configured bar_height and center content vertically
    const barsContainer = this.shadowRoot.querySelector('.bars-container');
    if (barsContainer) {
      const cfgH = Math.max(1, parseInt(this._config?.bar_height ?? 15, 10));
      this.shadowRoot.host.style.setProperty('--bars-height', `${cfgH}px`);
      this.shadowRoot.host.style.setProperty('--bar-item-height', `${cfgH}px`);
    }

    // Graph layout
    const graphContainer = this.shadowRoot.querySelector('.graph-container');
    if (graphContainer) {
      const scale = graphContainer.querySelector('.pt-scale');
      const scaleH = scale ? scale.offsetHeight : 0;
      const wrap = graphContainer.querySelector('.graph-svg-wrap');
      if (wrap) {
        const available = Math.max(0, graphContainer.clientHeight - scaleH);
        // Fill available space precisely, with a minimal 1px to remain visible
        const graphH = Math.max(1, Math.floor(available));
        this.shadowRoot.host.style.setProperty('--graph-height', `${Math.floor(graphH)}px`);

        // Compute y-axis gutter width based on label widths but keep within card bounds
  const labels = graphContainer.querySelectorAll('.graph-y-axis .y-label');
  let maxW = 0;
  labels.forEach(l => { maxW = Math.max(maxW, l.offsetWidth || 0); });
  // Clamp y-axis width to reasonable bounds that fit within card
  const gutter = Math.max(24, Math.min(45, Math.ceil(maxW + 8)));
        this.shadowRoot.host.style.setProperty('--graph-y-axis-width', `${gutter}px`);
      }
    }

    // Timeline layout
    const timelineCard = this.shadowRoot.querySelector('.timeline-card');
    if (timelineCard) {
      const header = timelineCard.querySelector('.pt-header');
      const footer = timelineCard.querySelector('.pt-footer');
      const headerH = header ? header.offsetHeight : 0;
      const footerH = footer ? footer.offsetHeight : 0;
      const totalH = timelineCard.clientHeight;
      const area = Math.max(0, totalH - headerH - footerH - 8); // remaining space for timeline + scale
      // Derive element sizes from available area
  const scaleHComputed = Math.max(18, Math.floor(area * 0.5));
  const scaleH = Math.min(22, scaleHComputed); // slightly smaller scale
  const chipH = Math.max(8, Math.min(Math.floor(scaleH - 10), 12)); // slimmer and more consistent
      const barH = Math.min(8, Math.max(4, Math.floor(area * 0.10))); // slim bar, never stretches
      const dot = Math.max(3, Math.min(6, Math.floor(scaleH * 0.18)));
      this.shadowRoot.host.style.setProperty('--timeline-scale-height', `${scaleH}px`);
      this.shadowRoot.host.style.setProperty('--timeline-chip-height', `${chipH}px`);
      this.shadowRoot.host.style.setProperty('--timeline-bar-height', `${barH}px`);
      this.shadowRoot.host.style.setProperty('--timeline-dot-size', `${dot}px`);
  // Adjust chip vertical position relative to timeline scale
  this.shadowRoot.host.style.setProperty('--timeline-chip-offset-y', `8px`);
    }

    // After sizing, update footer visibility states
    this.updateFooterVisibility();
  }

  // Hide footers with no visible content to avoid stray borders/space
  updateFooterVisibility() {
    if (!this.shadowRoot) return;
    const toggle = (el) => {
      if (!el) return;
      const indicators = el.querySelector('.footer-indicators');
      const avg = el.querySelector('.meta-avg');
      const entries = el.querySelector('.meta-entries');
      const hasIndicators = !!(indicators && indicators.children && indicators.children.length > 0);
      const avgVisible = avg ? (getComputedStyle(avg).display !== 'none') : false;
      const entriesVisible = entries ? (getComputedStyle(entries).display !== 'none') : false;
      const hasContent = hasIndicators || avgVisible || entriesVisible;
      if (!hasContent) el.classList.add('no-content'); else el.classList.remove('no-content');
    };
    toggle(this.shadowRoot.querySelector('.footer'));
    toggle(this.shadowRoot.querySelector('.pt-footer'));
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
    const avoidIndices = this.getAvoidTimeIndices(prices, Math.ceil((this._config.max_highlights || 5) / 2));
    
    // Calculate min/max for normalization - reuse array for efficiency
    const priceValues = prices.map(p => parseFloat(p.price));
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);

    // Set CSS custom properties for optimal/avoid colors
    this.setOptimalAvoidColors(minPrice, maxPrice);

  // Ensure responsive sizing observer
  this.setupResponsiveSizing();

  // Timeline layout styling
    if (this._config.layout_style === 'timeline') {
      this.renderTimelineStyle(prices, average, currentIndex, currentPrice, idealIndices, avoidIndices, minPrice, maxPrice);
      return;
    }
    
    // Graph layout styling
    if (this._config.layout_style === 'graph') {
      this.renderGraphStyle(prices, average, currentIndex, currentPrice, idealIndices, avoidIndices, minPrice, maxPrice);
      return;
    }

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="header">
          <div class="title">${this._config.title} <span class="grid-mode">(${this._config.grid_mode === 'feed_in' ? 'Feed-in' : 'Consumption'})</span></div>
          <div class="header-right">
            ${this._config.show_current && currentPrice ? `
              <div class="status">
                <span class="current-price">${this.formatPrice(currentPrice.price)} ${this._config.unit}</span>
              </div>
            ` : ''}
            ${((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'top' ? `
              <div class="header-indicators">
                ${this._config.show_optimal_periods && idealIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="optimal-dot"></span>
                    <span class="ideal-text">Optimal</span>
                  </span>
                ` : ''}
                ${this._config.show_avoid_periods && avoidIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="avoid-dot"></span>
                    <span class="avoid-text">Avoid</span>
                  </span>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="bars-container">
          <div class="bars-tooltip" style="display: none; position: absolute; z-index: 1000; background: #000000; color: #ffffff; padding: 4px 6px; border-radius: 3px; font-size: 10px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: none;"></div>
          <div class="bars">
            ${prices.map((price, index) => {
              const value = parseFloat(price.price);
              const isCurrent = index === currentIndex;
              const priceTime = new Date(price.datetime);
              const nextPriceTime = index < prices.length - 1 ? new Date(prices[index + 1].datetime) : new Date(priceTime.getTime() + 60 * 60 * 1000);
              const isPast = nextPriceTime <= now;
              const isIdeal = idealIndices.includes(index);
              const isAvoid = avoidIndices.includes(index);
              
              let color = this.getColorForPrice(value, minPrice, maxPrice, index);
              
              // Override with optimal/avoid colors using color scheme
              const optimalAvoidColor = this.getOptimalAvoidColor(isIdeal, isAvoid, minPrice, maxPrice);
              if (optimalAvoidColor) {
                color = optimalAvoidColor;
              }
              
              const opacity = isPast ? '0.3' : (isCurrent ? '1' : '0.85');
              
              const tooltipContent = this._config.tooltip_enabled ? 
                `data-tooltip="${this.formatTime(price.datetime)}: ${this.formatPrice(value)} ${this._config.unit}"` : '';
              
              let barClass = '';
              if (this._config.show_optimal_periods && isIdeal) {
                barClass = this._config.grid_mode === 'feed_in' ? 'feed-in-bar' : 'consumption-bar';
              } else if (this._config.show_avoid_periods && isAvoid) {
                barClass = this._config.grid_mode === 'feed_in' ? 'avoid-feed-in-bar' : 'avoid-consumption-bar';
              }
              const idealClass = barClass;
              const pastClass = isPast ? 'past' : '';
              
              return `
       <div class="bar ${isCurrent ? 'current' : ''} ${idealClass} ${pastClass}" 
                     ${tooltipContent}
                     style="background-color: ${color}; 
                            opacity: ${opacity};
        height: var(--bar-item-height, ${this._config.bar_height}px);
                            border-radius: ${this._config.bar_round}px;
             ">
                </div>
              `;
            }).join('')}
          </div>
          
          ${this._config.show_time_axis ? `
            <div class="time-axis" style="gap: ${this._config?.bar_spacing || 2}px;">
              ${(this._config.show_optimal_zones && this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_zones && this._config.show_avoid_periods && avoidIndices.length > 0) ? 
                this.renderPositionalRanges(prices, idealIndices, avoidIndices) :
                this.renderBasicTimeAxis(prices)
              }
            </div>
          ` : ''}
          

        </div>

        ${this._config.show_average || (((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'bottom') || this._config.show_entries ? `
          <div class="footer">
            ${this._config.show_average ? `
              <span class="meta-avg">${localizeSync('avg', this._lang, 'card')}: ${this.formatPrice(average)} ${this._config.unit}</span>
            ` : ''}
            ${((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'bottom' ? `
              <div class="footer-indicators">
                ${this._config.show_optimal_periods && idealIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="optimal-dot"></span>
                    Optimal
                  </span>
                ` : ''}
                ${this._config.show_avoid_periods && avoidIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="avoid-dot"></span>
                    Avoid
                  </span>
                ` : ''}
              </div>
            ` : ''}
            ${this._config.show_entries ? `
              <span class="meta-entries">${prices.length} ${localizeSync('entries', this._lang, 'card')}</span>
            ` : ''}
          </div>
        ` : ''}
      </ha-card>
      ${this.getStyles()}
    `;
    // After initial render, compute exact heights
    setTimeout(() => this.computeAndSetHeights(), 0);
  }

  renderTimelineStyle(prices, average, currentIndex, currentPrice, idealIndices, avoidIndices, minPrice, maxPrice) {
    // Set CSS custom properties for optimal/avoid colors
    this.setOptimalAvoidColors(minPrice, maxPrice);
    
    const now = new Date();
    const currentHour = now.getHours();
    const minutes = now.getMinutes();
    const hourProgress = minutes / 60;

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
            ${((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'top' ? `
              <div class="pt-header-indicators">
                ${this._config.show_optimal_periods && idealIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="timeline-optimal-dot"></span>
                    <span class="ideal-text">Optimal</span>
                  </span>
                ` : ''}
                ${this._config.show_avoid_periods && avoidIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="timeline-avoid-dot"></span>
                    <span class="avoid-text">Avoid</span>
                  </span>
                ` : ''}
              </div>
            ` : ''}
          </div>
          <div class="pt-header-right">
            <div class="pt-label">${this._config.title} <span class="grid-mode">(${this._config.grid_mode === 'feed_in' ? 'Feed-in' : 'Consumption'})</span></div>
          </div>
        </div>

        <div class="pt-timeline">
          ${prices.map((price, index) => {
            const value = parseFloat(price.price);
            const isCurrent = index === currentIndex;
            const priceTime = new Date(price.datetime);
            const nextPriceTime = index < prices.length - 1 ? new Date(prices[index + 1].datetime) : new Date(priceTime.getTime() + 60 * 60 * 1000);
            const isPast = nextPriceTime <= now;
            const isIdeal = idealIndices.includes(index);
            const isAvoid = avoidIndices.includes(index);
            
            // Timeline color logic using current color theme
            let color = this.getColorForPrice(value, minPrice, maxPrice, index);
            
            // Override with optimal/avoid colors using color scheme
            const optimalAvoidColor = this.getOptimalAvoidColor(isIdeal, isAvoid, minPrice, maxPrice);
            if (optimalAvoidColor) {
              color = optimalAvoidColor;
            }
            
            const opacity = isPast ? '0.3' : '1';
            
            // Check if next/prev segments have different colors for border radius
            let prevColor = index > 0 ? this.getColorForPrice(prices[index - 1].price, minPrice, maxPrice, index - 1) : null;
            let nextColor = index < prices.length - 1 ? this.getColorForPrice(prices[index + 1].price, minPrice, maxPrice, index + 1) : null;
            
            // Apply optimal/avoid colors to prev/next for border radius calculation
            if (index > 0) {
              const prevIsIdeal = idealIndices.includes(index - 1);
              const prevIsAvoid = avoidIndices.includes(index - 1);
              const prevOptimalAvoidColor = this.getOptimalAvoidColor(prevIsIdeal, prevIsAvoid, minPrice, maxPrice);
              if (prevOptimalAvoidColor) {
                prevColor = prevOptimalAvoidColor;
              }
            }
            if (index < prices.length - 1) {
              const nextIsIdeal = idealIndices.includes(index + 1);
              const nextIsAvoid = avoidIndices.includes(index + 1);
              const nextOptimalAvoidColor = this.getOptimalAvoidColor(nextIsIdeal, nextIsAvoid, minPrice, maxPrice);
              if (nextOptimalAvoidColor) {
                nextColor = nextOptimalAvoidColor;
              }
            }
            
            let borderRadius = '';
            if (prevColor !== color) {
              borderRadius += 'border-top-left-radius: 10px; border-bottom-left-radius: 10px;';
            }
            if (nextColor !== color) {
              borderRadius += 'border-top-right-radius: 10px; border-bottom-right-radius: 10px;';
            }
            
            const markerClass = isCurrent ? 'pt-marker' : '';
            const fadedClass = isPast ? 'pt-faded' : '';
            const idealClass = isIdeal ? (this._config.grid_mode === 'feed_in' ? 'pt-feed-in' : 'pt-consumption') : '';
            
            // Keep track uniform thickness; no extra border styling applied on slots
            let extraStyle = '';
            
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
            ${(this._config.show_optimal_zones && this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_zones && this._config.show_avoid_periods && avoidIndices.length > 0) ? 
              this.renderPositionalRangesTimeline(prices, idealIndices, avoidIndices) :
              this.renderCleanTimelineAxis(prices)
            }
          </div>
        ` : ''}



        ${this._config.show_average || (((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'bottom') || this._config.show_entries ? `
          <div class="pt-footer">
            ${this._config.show_average ? `
              <span class="meta-avg">${localizeSync('avg', this._lang, 'card')}: ${this.formatPrice(average)} ${this._config.unit}</span>
            ` : ''}
            ${((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'bottom' ? `
              <div class="footer-indicators">
                ${this._config.show_optimal_periods && idealIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="timeline-optimal-dot"></span>
                    Optimal
                  </span>
                ` : ''}
                ${this._config.show_avoid_periods && avoidIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="timeline-avoid-dot"></span>
                    Avoid
                  </span>
                ` : ''}
              </div>
            ` : ''}
            ${this._config.show_entries ? `
              <span class="meta-entries">${prices.length} ${localizeSync('entries', this._lang, 'card')}</span>
            ` : ''}
          </div>
        ` : ''}
      </ha-card>
      ${this.getStyles()}
      ${this.getTimelineStyles()}
    `;
    // Compute heights (timeline mainly for future-proofing; minimal impact)
    setTimeout(() => this.computeAndSetHeights(), 0);
  }

  renderGraphStyle(prices, average, currentIndex, currentPrice, idealIndices, avoidIndices, minPrice, maxPrice) {
    // Set CSS custom properties for optimal/avoid colors
    this.setOptimalAvoidColors(minPrice, maxPrice);
    
    const now = new Date();
  // Build a "nice" y-axis scale and use it for bar scaling
  const zeroPreferred = minPrice >= 0;
  const { niceMin: adjustedMin, niceMax: adjustedMax } = this.getNiceScale(minPrice, maxPrice, 3, zeroPreferred);
  const adjustedRange = (adjustedMax - adjustedMin) || 1;

    // Using bars layout for graph

    // Using bars instead of line path

    this.shadowRoot.innerHTML = `
      <ha-card class="graph-card">
        <div class="graph-header">
          <div class="title">${this._config.title} <span class="grid-mode">(${this._config.grid_mode === 'feed_in' ? 'Feed-in' : 'Consumption'})</span></div>
          <div class="header-right">
            ${this._config.show_current && currentPrice ? `
              <div class="status">
                <span class="current-price">${this.formatPrice(currentPrice.price)} ${this._config.unit}</span>
              </div>
            ` : ''}
            ${((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'top' ? `
              <div class="header-indicators">
                ${this._config.show_optimal_periods && idealIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="optimal-dot"></span>
                    <span class="ideal-text">Optimal</span>
                  </span>
                ` : ''}
                ${this._config.show_avoid_periods && avoidIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="avoid-dot"></span>
                    <span class="avoid-text">Avoid</span>
                  </span>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="graph-container">
          <div class="graph-svg-wrap" style="height: var(--graph-height, 150px);">
            <div class="graph-tooltip" style="display: none; position: absolute; z-index: 1000; background: #000000; color: #ffffff; padding: 4px 6px; border-radius: 3px; font-size: 10px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: none;"></div>
            <svg class="price-graph" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- Grid lines -->
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--divider-color)" stroke-width="0.2" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)"/>
            
            <!-- Optimal periods background (grouped for contiguity) -->
            ${(() => {
              if (!(this._config.show_optimal_periods && idealIndices.length > 0)) return '';
              const groups = [];
              const sorted = [...idealIndices].sort((a,b)=>a-b);
              let start = sorted[0], prev = sorted[0];
              for (let i=1;i<sorted.length;i++) {
                if (sorted[i] === prev + 1) { prev = sorted[i]; }
                else { groups.push([start, prev]); start = prev = sorted[i]; }
              }
              groups.push([start, prev]);
              const barSpacing = this._config.bar_spacing || 2;
              const totalSpacing = (prices.length - 1) * barSpacing;
              const availableWidth = 100 - (totalSpacing / 2);
              const barWidth = availableWidth / prices.length;
              const color = this.getOptimalAvoidColor(true, false, minPrice, maxPrice) || '#4CAF50';
              return groups.map(([s,e]) => {
                const x = s * (barWidth + (barSpacing / 2));
                const span = (e - s + 1);
                const w = barWidth * span + (barSpacing / 2) * (span - 1);
                return `<rect x="${x}" y="0" width="${w}" height="100" fill="${color}" opacity="0.1"/>`;
              }).join('');
            })()}

            <!-- Avoid periods background (grouped for contiguity) -->
            ${(() => {
              if (!(this._config.show_avoid_periods && avoidIndices.length > 0)) return '';
              const groups = [];
              const sorted = [...avoidIndices].sort((a,b)=>a-b);
              let start = sorted[0], prev = sorted[0];
              for (let i=1;i<sorted.length;i++) {
                if (sorted[i] === prev + 1) { prev = sorted[i]; }
                else { groups.push([start, prev]); start = prev = sorted[i]; }
              }
              groups.push([start, prev]);
              const barSpacing = this._config.bar_spacing || 2;
              const totalSpacing = (prices.length - 1) * barSpacing;
              const availableWidth = 100 - (totalSpacing / 2);
              const barWidth = availableWidth / prices.length;
              const color = this.getOptimalAvoidColor(false, true, minPrice, maxPrice) || '#f44336';
              return groups.map(([s,e]) => {
                const x = s * (barWidth + (barSpacing / 2));
                const span = (e - s + 1);
                const w = barWidth * span + (barSpacing / 2) * (span - 1);
                return `<rect x="${x}" y="0" width="${w}" height="100" fill="${color}" opacity="0.1"/>`;
              }).join('');
            })()}
            
            <!-- Price bars -->
            ${prices.map((price, index) => {
              const barSpacing = this._config.bar_spacing || 2;
              // Calculate bars to use 85% of available width, centered
              const graphWidth = 85; // Use 85% of SVG width
              const startOffset = (100 - graphWidth) / 2; // Center the bars
              const barWidth = graphWidth / prices.length;
              const x = startOffset + (index * barWidth);
              const value = parseFloat(price.price);
              const height = Math.max(1, ((value - adjustedMin) / adjustedRange) * 100);
              const y = 100 - height;
              
              const now = new Date();
              const priceTime = new Date(price.datetime);
              const nextPriceTime = index < prices.length - 1 ? new Date(prices[index + 1].datetime) : new Date(priceTime.getTime() + 60 * 60 * 1000);
              const isPast = nextPriceTime <= now;
              const isCurrent = index === currentIndex;
              const isOptimal = idealIndices.includes(index);
              const isAvoid = avoidIndices.includes(index);
              
              // Use color scheme like bars and timeline
              let fill = this.getColorForPrice(value, minPrice, maxPrice, index);
              
              // Override with optimal/avoid colors using color scheme
              const optimalAvoidColor = this.getOptimalAvoidColor(isOptimal, isAvoid, minPrice, maxPrice);
              if (optimalAvoidColor) {
                fill = optimalAvoidColor;
              }
              
              const tooltipContent = this._config.tooltip_enabled ? 
                `data-tooltip="${this.formatTime(price.datetime)}: ${this.formatPrice(value)} ${this._config.unit}"` : '';
              
              const currentStroke = 'var(--primary-color, #03A9F4)';
              const strokeW = 3.0; // border thickness
              const rx = 0; // square corners for graph bars
              // Arrow sized relative to bar width for consistent look across sizes
              const arrowBaseWidth = Math.max(3.5, Math.min(barWidth * 0.85, 6.0));
              const arrowHalf = arrowBaseWidth / 2;
              const arrowHeight = Math.max(2.0, arrowBaseWidth * 0.9);
              const arrowTopY = Math.max(0.5, y - arrowHeight);
              const arrowBaseY = y;
              return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" 
                      fill="${fill}" 
                      fill-opacity="${isPast ? '0.3' : '0.85'}"
                      stroke="${isCurrent ? currentStroke : 'none'}" 
                      stroke-width="${isCurrent ? strokeW : 0}"
                      stroke-linejoin="round"
                      vector-effect="non-scaling-stroke"
          rx="${rx}" ry="${rx}"
                      class="graph-bar${isCurrent ? ' graph-bar-current' : ''}" 
                      ${tooltipContent}>
                </rect>
                ${isCurrent ? `
                  <polygon class="graph-current-arrow" points="${x + barWidth/2 - arrowHalf},${arrowTopY} ${x + barWidth/2 + arrowHalf},${arrowTopY} ${x + barWidth/2},${arrowBaseY}" 
                           fill="${currentStroke}" />
                ` : ''}
              `;
            }).join('')}
            

            </svg>
            
            <!-- Y-axis labels -->
            <div class="graph-y-axis">
            <span class="y-label y-max">${this.formatAxisValue(adjustedMax)}</span>
            <span class="y-label y-mid">${this.formatAxisValue((adjustedMax + adjustedMin) / 2)}</span>
            <span class="y-label y-min">${this.formatAxisValue(adjustedMin)}</span>
            </div>
          </div>
          
          <!-- Time axis: reuse timeline scale for consistent spacing/labels -->
          ${this._config.show_time_axis ? `
            <div class="pt-scale">
              ${(this._config.show_optimal_zones && this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_zones && this._config.show_avoid_periods && avoidIndices.length > 0) ? 
                this.renderPositionalRangesTimeline(prices, idealIndices, avoidIndices) :
                this.renderCleanTimelineAxis(prices)
              }
            </div>
          ` : ''}
        </div>
        
        ${this._config.show_average || (((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'bottom') || this._config.show_entries ? `
          <div class="footer">
            ${this._config.show_average ? `
              <span class="meta-avg">Avg: ${this.formatPrice(average)} ${this._config.unit}</span>
            ` : ''}
            ${((this._config.show_optimal_periods && idealIndices.length > 0) || (this._config.show_avoid_periods && avoidIndices.length > 0)) && this._config.indicator_position === 'bottom' ? `
              <div class="footer-indicators">
                ${this._config.show_optimal_periods && idealIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="optimal-dot"></span>
                    Optimal
                  </span>
                ` : ''}
                ${this._config.show_avoid_periods && avoidIndices.length > 0 ? `
                  <span class="indicator-item">
                    <span class="avoid-dot"></span>
                    Avoid
                  </span>
                ` : ''}
              </div>
            ` : ''}
            ${this._config.show_entries ? `
              <span class="meta-entries">${prices.length} entries</span>
            ` : ''}
          </div>
        ` : ''}
        
      </ha-card>
      ${this.getStyles()}
      ${this.getGraphStyles()}
      ${this.getTimelineStyles()}
    `;
    
    // Setup all tooltips via JavaScript for consistency
    setTimeout(() => this.setupAllTooltips(), 50);
    // Compute exact heights once DOM has painted
    setTimeout(() => this.computeAndSetHeights(), 0);
  }

  setupGraphTooltips() {
    const graphBars = this.shadowRoot.querySelectorAll('.graph-bar[data-tooltip]');
    const tooltip = this.shadowRoot.querySelector('.graph-tooltip');
    
    if (tooltip && graphBars.length > 0) {
      graphBars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
          const tooltipText = e.target.getAttribute('data-tooltip');
          if (tooltipText) {
            tooltip.textContent = tooltipText;
            tooltip.style.display = 'block';
            
            const rect = e.target.getBoundingClientRect();
            const containerRect = this.shadowRoot.querySelector('.graph-container').getBoundingClientRect();
            
            tooltip.style.left = (rect.left - containerRect.left + rect.width/2) + 'px';
            tooltip.style.top = (rect.top - containerRect.top - 24) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
          }
        });
        
        bar.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }
  }

  setupAllTooltips() {
    // Setup tooltips for bars layout
    const bars = this.shadowRoot.querySelectorAll('.bars .bar[data-tooltip]');
    const barsTooltip = this.shadowRoot.querySelector('.bars-tooltip');
    
    if (barsTooltip && bars.length > 0) {
      bars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
          const tooltipText = e.target.getAttribute('data-tooltip');
          if (tooltipText) {
            barsTooltip.textContent = tooltipText;
            barsTooltip.style.display = 'block';
            
            const rect = e.target.getBoundingClientRect();
            const containerRect = this.shadowRoot.querySelector('.bars-container').getBoundingClientRect();
            
            barsTooltip.style.left = (rect.left - containerRect.left + rect.width/2) + 'px';
            barsTooltip.style.top = (rect.top - containerRect.top - 24) + 'px';
            barsTooltip.style.transform = 'translateX(-50%)';
          }
        });
        
        bar.addEventListener('mouseleave', () => {
          barsTooltip.style.display = 'none';
        });
      });
    }

    // Setup tooltips for timeline layout
    const timelineBars = this.shadowRoot.querySelectorAll('.timeline .bar[data-tooltip]');
    const timelineTooltip = this.shadowRoot.querySelector('.timeline-tooltip');
    
    if (timelineTooltip && timelineBars.length > 0) {
      timelineBars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
          const tooltipText = e.target.getAttribute('data-tooltip');
          if (tooltipText) {
            timelineTooltip.textContent = tooltipText;
            timelineTooltip.style.display = 'block';
            
            const rect = e.target.getBoundingClientRect();
            const containerRect = this.shadowRoot.querySelector('.timeline-container').getBoundingClientRect();
            
            timelineTooltip.style.left = (rect.left - containerRect.left + rect.width/2) + 'px';
            timelineTooltip.style.top = (rect.top - containerRect.top - 24) + 'px';
            timelineTooltip.style.transform = 'translateX(-50%)';
          }
        });
        
        bar.addEventListener('mouseleave', () => {
          timelineTooltip.style.display = 'none';
        });
      });
    }

    // Setup tooltips for graph layout (call existing function)
    this.setupGraphTooltips();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="loading">${localizeSync('loading', 'en', 'card')}</div>
      </ha-card>
      ${this.getStyles()}
    `;
    // Compute heights precisely for bars layout after DOM update
    setTimeout(() => this.computeAndSetHeights(), 0);
  }

  static getStubConfig() {
    return {
      type: 'custom:dynamic-prices-card',
      entity: 'sensor.energy_prices',
      title: 'Energy Prices',
      hours_to_show: 24,
      enable_price_calculation: false
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
          label: translations.config?.entity || 'Market Price Entity',
          helper: 'Sensor with EPEX Day Ahead market prices in €/kWh (bare market price without taxes/fees). Common examples: sensor.energy_prices, sensor.nordpool_*, sensor.epex_*, sensor.electricity_price_*',
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
        
        // Grid Management Settings
        {
          name: '',
          type: 'expandable',
          title: 'Grid Management',
          icon: 'mdi:transmission-tower',
          schema: [
            {
              name: 'grid_mode',
              label: 'Grid mode',
              default: 'consumption',
              selector: {
                select: {
                  options: [
                    { value: 'consumption', label: 'Consumption' },
                    { value: 'feed_in', label: 'Feed-in' }
                  ],
                  mode: 'dropdown'
                }
              }
            },


          ]
        },

        // Price Calculation Settings
        {
          name: '',
          type: 'expandable',
          title: 'Price Calculations',
          icon: 'mdi:calculator',
          schema: [
            {
              name: 'enable_price_calculation',
              label: 'Enable price calculations',
              helper: 'Add costs/compensation to market price',
              default: false,
              selector: {
                boolean: {}
              }
            },
            
            // Grid consumption compensation
            {
              name: 'grid_compensation',
              label: 'Inkoopvergoeding / Grid compensation (€/kWh)',
              helper: 'Invoer: vaste waarde (bijv. 0.01815) of entity (bijv. sensor.grid_compensation). Wordt opgeteld bij marktprijs voor verbruik.',
              default: '0.01815',
              selector: {
                text: {
                  placeholder: '0.01815 of sensor.grid_compensation'
                }
              }
            },
            
            // Feed-in compensation
            {
              name: 'feedin_compensation',
              label: 'Teruglevering compensatie / Feed-in compensation (€/kWh)',
              helper: 'Invoer: vaste waarde (bijv. 0.01271) of entity (bijv. sensor.feedin_compensation). Wordt opgeteld bij marktprijs voor teruglevering.',
              default: '0.01271',
              selector: {
                text: {
                  placeholder: '0.01271 of sensor.feedin_compensation'
                }
              }
            },
            
            // Energy tax (consumption only)
            {
              name: 'energy_tax',
              label: 'Energiebelasting / Energy tax (€/kWh)',
              helper: 'Invoer: vaste waarde (bijv. 0.12286) of entity (bijv. sensor.energy_tax). Alleen voor verbruik, niet teruglevering.',
              default: '0.12286',
              selector: {
                text: {
                  placeholder: '0.12286 of sensor.energy_tax'
                }
              }
            },
            
            // VAT percentage
            {
              name: 'vat_rate',
              label: 'BTW / VAT rate (%)',
              helper: 'Invoer: percentage (bijv. 21 voor 21%) of entity (bijv. sensor.vat_rate). Wordt toegepast op eindprijs.',
              default: '0',
              selector: {
                text: {
                  placeholder: '21 of sensor.vat_rate'
                }
              }
            },

          ]
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
                  step: 1,
                  mode: 'slider'
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
            },
            {
              name: 'decimal_precision',
              label: 'Decimal Precision',
              helper: 'Number of decimal places to show (leave empty for auto: Cent=1, €=2)',
              selector: {
                number: {
                  min: 0,
                  max: 4,
                  step: 1,
                  mode: 'box'
                }
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
          title: translations.config?.highlight_settings || 'Optimal & Avoid Periods',
          icon: 'mdi:clock-check-outline',
          schema: [
            {
              name: 'show_optimal_periods',
              label: 'Show optimal periods',
              helper: 'Highlight best times for consumption/feed-in based on grid mode',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'show_avoid_periods',
              label: 'Show avoid periods',
              helper: 'Highlight times to avoid consumption/feed-in',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'max_highlights',
              label: translations.config?.max_highlights || 'Maximum optimal periods',
              helper: 'Number of optimal time slots to highlight',
              default: 5,
              selector: {
                number: {
                  min: 1,
                  max: 12,
                  mode: 'box'
                }
              }
            },
            {
              name: 'avoid_threshold_type',
              label: 'Avoid threshold type',
              helper: 'Method to determine periods to avoid',
              default: 'percentage',
              selector: {
                select: {
                  options: [
                    { value: 'percentage', label: 'Percentage (top X% prices)' },
                    { value: 'absolute', label: 'Absolute price threshold' },
                    { value: 'negative', label: 'Negative prices only' }
                  ],
                  mode: 'dropdown'
                }
              }
            },
            {
              name: 'avoid_threshold_value',
              label: 'Avoid threshold value',
              helper: 'Percentage (0-100) or absolute price value',
              default: 80,
              selector: {
                number: {
                  min: 0,
                  max: 100,
                  step: 5,
                  mode: 'slider'
                }
              }
            },
            {
              name: 'show_optimal_zones',
              label: 'Show optimal zones',
              helper: 'Display optimal periods as green zones on timeline',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'show_avoid_zones',
              label: 'Show avoid zones',
              helper: 'Display avoid periods as red zones on timeline',
              default: true,
              selector: {
                boolean: {}
              }
            },
            {
              name: 'indicator_position',
              label: 'Indicator position',
              default: 'bottom',
              selector: {
                select: {
                  options: [
                    { value: 'top', label: 'Top (Header)' },
                    { value: 'bottom', label: 'Bottom (Footer)' }
                  ],
                  mode: 'dropdown'
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
                    { value: 'bars', label: translations.options?.bars_layout || 'Bars' },
                    { value: 'timeline', label: translations.options?.timeline_layout || 'Timeline' },
                    { value: 'graph', label: 'Graph' }
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
              default: 15,
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
          width: 100%;
          height: 100%;
          --color-ok: #45C669;
          --color-ko: #C66445;
          --color-half: #C6B145;
          --color-none: #C9C9C9;
          --color-turquoise-light: #1dbfac;
          --color-orange-light: #ff832d;
          --color-turquoise-dark: #1dbfac;
          --color-orange-dark: #ff832d;
          /* Precise sizing variables (computed at runtime) */
          --bars-height: ${this._config?.bar_height || 15}px;
          --graph-height: 150px;
            /* Shared chip font size across layouts */
            --chip-font-size: 10px;
        }

  /* Compact mode tweaks (small dashboard grid) */
  :host(.compact) .title { font-size: 14px; }
  :host(.compact) .header { margin-bottom: 6px; }
  /* In compact tiles, cap bars height for readability */
  :host(.compact) .bars { height: min(var(--bars-height), 22px); }
  :host(.compact) .timeline { }
  :host(.compact) .pt-scale { margin-top: 2px; min-height: 14px; }
  :host(.compact) .pt-hour, :host(.compact) .time-label { font-size: 9px; }
  :host(.compact) .footer { font-size: 10.5px; gap: 6px; }
  :host(.compact) .current-price { font-size: 11px; }
  /* In compact, place grid-mode on its own line under the title */
  :host(.compact) .title .grid-mode { display: block; margin-top: 2px; font-size: 11px; opacity: 0.7; }
        
        ha-card {
          background: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 12px);
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          font-family: var(--paper-font-common-base_-_font-family, sans-serif);
          position: relative;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          position: relative;
        }
        
        .title {
          font-size: 16px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        
        .grid-mode {
          font-size: 12px;
          font-weight: normal;
          color: var(--secondary-text-color);
          opacity: 0.7;
        }
        
        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        
        .header-indicators {
          font-size: 9px;
          color: var(--secondary-text-color);
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
          margin-top: 2px;
        }
        
        .indicator-item {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        /* Legend dots (shared across layouts) */
        /* Bars/Graph layout dots - open circles for indicators */
        .optimal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid var(--optimal-color, #4CAF50);
          background: transparent;
          display: inline-block;
          margin-right: 6px;
          flex-shrink: 0;
        }
        .avoid-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid var(--avoid-color, #f44336);
          background: transparent;
          display: inline-block;
          margin-right: 6px;
          flex-shrink: 0;
        }
        /* Timeline layout dots - filled circles for indicators */
        .timeline-optimal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--optimal-color, #4CAF50);
          display: inline-block;
          margin-right: 4px;
          flex-shrink: 0;
        }
        .timeline-avoid-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--avoid-color, #f44336);
          display: inline-block;
          margin-right: 4px;
          flex-shrink: 0;
        }
        
        .footer-indicators {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
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
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        
        .bars-container {
          margin: 8px 0;
          padding: 0 4px; /* prevent time axis cutoff at edges */
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center; /* center bars vertically between header and footer */
        }
        
        .timeline {
          display: flex;
          align-items: flex-end;
          height: var(--bars-height);
          gap: ${this._config?.bar_spacing || 2}px;
        }
        
        .bars {
          display: flex;
          align-items: flex-end;
          height: var(--bars-height);
          gap: ${this._config?.bar_spacing || 2}px;
          width: 100%;
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
        
        .bar.ideal-bar {
          border: 2px solid var(--primary-color);
          box-shadow: 0 0 6px rgba(var(--rgb-primary-color), 0.4);
        }
        
        .bar.avoid-bar {
          border: 2px solid #f44336;
          box-shadow: 0 0 6px rgba(244, 67, 54, 0.4);
        }
        
        .bar.consumption-bar {
          border: 2px solid var(--optimal-color, #4CAF50);
          box-shadow: 0 0 6px var(--optimal-shadow, rgba(76, 175, 80, 0.4));
        }
        
        .bar.feed-in-bar {
          border: 2px solid var(--optimal-color, #4CAF50);
          box-shadow: 0 0 6px var(--optimal-shadow, rgba(76, 175, 80, 0.4));
        }
        
        .bar.avoid-consumption-bar {
          border: 2px solid var(--avoid-color, #f44336);
          box-shadow: 0 0 6px var(--avoid-shadow, rgba(244, 67, 54, 0.4));
          /* Background color now comes from inline style with color scheme */
        }
        
        .bar.avoid-feed-in-bar {
          border: 2px solid var(--avoid-color, #f44336);
          box-shadow: 0 0 6px var(--avoid-shadow, rgba(244, 67, 54, 0.4));
          /* Background color now comes from inline style with color scheme */
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
          background: #000000;
          color: #ffffff;
          padding: 4px 6px;
          border-radius: 3px;
          font-size: 10px;
          white-space: nowrap;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: block;
          pointer-events: none;
        }

        /* Graph tooltips handled by JavaScript */
        .graph-bar[data-tooltip]:hover::before {
          display: none;
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
          border-top: 4px solid #000000;
          z-index: 1000;
        }

        /* Graph tooltip arrows handled by JavaScript */
        .graph-bar[data-tooltip]:hover::after {
          display: none;
        }

        /* SVG elementen ondersteunen geen ::before/::after, dus gebruiken we title */
        .graph-container {
          position: relative;
        }
        
        .graph-container svg {
          position: relative;
        }
        
        svg .graph-bar[data-tooltip] {
          cursor: pointer;
        }
        
        svg .graph-bar[data-tooltip]:hover {
          opacity: 0.9 !important;
        }

        /* Current bar styling for graph */
        .graph-bar-current {
          filter: drop-shadow(0 0 8px rgba(3, 169, 244, 0.55));
        }
        .graph-current-arrow {
          filter: drop-shadow(0 0 6px rgba(3, 169, 244, 0.55));
          stroke: rgba(0,0,0,0.35);
          stroke-width: 0.5;
          stroke-linejoin: round;
        }
        
        /* Tooltip voor SVG via JavaScript wordt gehandeld via native title */
        
        .time-axis {
          display: flex;
          width: 100%;
          margin-top: 8px;
          padding: 0;
          align-items: center;
          position: relative;
          overflow: hidden; /* prevent spillover */
        }

        .zone-range {
          font-variant-numeric: tabular-nums;
        }
        
        .bar-tick {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        
        .bar-tick-range {
          display: contents;
        }
        
        .bar-tick-single {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        
        .time-label {
          font-size: 10px;
          color: var(--secondary-text-color);
          text-align: center;
          box-sizing: border-box;
        }
        
        .time-spacer {
          box-sizing: border-box;
        }
        
        .time-range {
          font-size: 10px;
          font-weight: 600;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        /* Shared chip style for bars/timeline/graph axis chips */
        .zone-chip { 
          font-size: var(--chip-font-size, 10px); 
          font-weight: 600; 
          display: block;
          box-sizing: border-box;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 12px;
          color: var(--secondary-text-color);
          /* Pin footer to the bottom of the card column */
          margin-top: auto;
          padding-top: 4px;
          border-top: 1px solid var(--divider-color);
          /* Keep on a single row to avoid double-line footer */
          flex-wrap: nowrap;
          white-space: nowrap;
          gap: 4px;
          margin-bottom: 0;
          overflow: hidden;
        }
        .footer > * { min-width: 0; }
        .footer .meta-avg,
        .footer .meta-entries { overflow: hidden; text-overflow: ellipsis; }
        .footer.no-content { border-top: none; margin-top: 0; padding-top: 0; }
        
        /* Hide footer on very small cards (2 rows) to save space */
        :host(.hide-footer) .footer { display: none; }

        /* Keep avg and entries always visible; no auto-hide rules */
        

        
        .header-indicator {
          font-size: 11px;
          color: var(--secondary-text-color);
        }
        

        
        .indicator-item {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        .ideal-text {
          font-size: inherit;
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
        
        /* Responsive breakpoints for different card sizes */
        @media (max-width: 600px), (max-height: 200px) {
          ha-card {
            padding: 8px;
          }
          
          .header {
            margin-bottom: 8px;
          }
          
          .title {
            font-size: 14px;
          }
          
          .current-price {
            font-size: 11px;
          }
          
          /* Heights are controlled by variables; do not override here */
          
          .footer {
            font-size: 11px;
            margin-top: auto; /* stay pinned at bottom even in compact */
            padding-top: 6px;
          }
          
          .bar[data-tooltip]:hover::before,
          .pt-slot[data-tooltip]:hover::before {
            font-size: 9px;
            padding: 3px 4px;
          }
          
          /* Graph tooltips handled by JavaScript */
          .graph-bar[data-tooltip]:hover::before {
            display: none;
          }
        }
        
        /* Very compact mode for small cards */
        @container (max-width: 300px) {
          .header .status {
            display: none;
          }
          
          .footer > span:nth-child(n+2) {
            display: none;
          }
        }
        
        /* Container queries for responsive design */
        @container (max-height: 150px) {
          /* Keep footer visible; reduce vertical margins around timeline */
          .timeline-container { margin: 4px 0; }
        }
      </style>
    `;
  }

  getGraphStyles() {
    return `
      <style>
        .graph-card {
          background: var(--ha-card-background, var(--card-background-color, #fff));
          padding: 16px;
          font-family: var(--paper-font-common-base_-_font-family, sans-serif);
          color: var(--primary-text-color);
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          position: relative;
        }

        .graph-container {
          position: relative;
          margin-bottom: 6px;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .price-graph {
          width: 100%;
          height: 100%;
          border-radius: 0;
          background: transparent;
        }

        .graph-svg-wrap {
          position: relative;
          flex-shrink: 0;
          margin-left: calc(var(--graph-y-axis-width, 35px) - 8px);
          width: calc(100% - var(--graph-y-axis-width, 35px) + 8px);
        }

        .graph-y-axis {
          position: absolute;
          left: -8px;
          top: 0;
          width: var(--graph-y-axis-width, 35px);
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          pointer-events: none;
          padding-right: 4px;
        }

        .y-label {
          font-size: 10px;
          color: var(--secondary-text-color);
          text-align: right;
          background: transparent;
          padding: 0 2px 0 0;
          border-radius: 0;
          box-shadow: none;
        }

        .graph-time-axis {
          position: relative;
          height: 20px;
          margin-top: 8px;
          background: var(--card-background-color, #fafafa);
          border-top: 1px solid var(--divider-color);
          border-radius: 0 0 8px 8px;
        }

        .graph-time-axis .time-label {
          position: absolute;
          font-size: 10px;
          color: var(--primary-text-color);
          font-weight: 500;
          transform: translateX(-50%);
          top: 4px;
        }
        
        .footer-indicators {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .footer .indicator-item {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
          color: var(--secondary-text-color);
        }

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--secondary-text-color);
          padding-top: 8px;
          border-top: 1px solid var(--divider-color);
          flex-wrap: wrap;
          gap: 6px;
        }

        /* Improve visibility of legend items in graph footer */
        .graph-card .footer .indicator-item {
          color: var(--primary-text-color);
          font-weight: 500;
        }
        .graph-card .footer-indicators {
          gap: 10px;
        }
        .graph-card .footer .optimal-dot,
        .graph-card .footer .avoid-dot {
          width: 9px;
          height: 9px;
          border-width: 2px;
        }
      </style>
    `;
  }

  // Method to get card configuration info for display
  getCardInfo() {
    const info = {
      'Card Type': 'Dynamic Prices Card',
      'Entity': this._config.entity,
      'Layout': this._config.layout_style,
      'Grid Mode': this._config.grid_mode,
      'Decimal Precision': this._config.decimal_precision !== undefined ? 
        this._config.decimal_precision : 
        (this._config.unit === 'Cent' ? '1 (auto)' : '2 (auto)'),
      'Unit': this._config.unit,
      'Hours Shown': this._config.hours_to_show,
      'Optimal Periods': this._config.show_optimal_periods ? 'Enabled' : 'Disabled',
      'Avoid Periods': this._config.show_avoid_periods ? 'Enabled' : 'Disabled',
      'Price Calculation': this._config.enable_price_calculation ? 'Enabled' : 'Disabled'
    };
    return info;
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
          width: 100%;
          height: 100%;
          min-height: 0;
          max-height: none;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .pt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
          position: relative;
        }

        .pt-header-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }
        
        .pt-header-indicators {
          font-size: 9px;
          color: var(--secondary-text-color);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        
        .pt-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        
        .pt-header-indicator {
          font-size: 11px;
          color: var(--secondary-text-color);
        }
        
        .pt-header-indicator-center {
          font-size: 11px;
          color: var(--secondary-text-color);
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          white-space: nowrap;
          min-width: 120px;
          width: 120px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        

        
        /* Legend dot styles are defined globally in getStyles() */

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
          height: var(--timeline-bar-height, 6px);
          border-radius: 5px;
          overflow: visible;
          position: relative;
          flex: 0 0 auto; /* do not stretch vertically */
          min-width: 0;
          width: 100%;
          max-height: none;
        }

        .pt-slot {
          flex: 1;
          opacity: 1;
          position: relative;
          min-width: 0;
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
          /* Keep track uniform thickness; no border/scale */
          border: none !important;
          box-shadow: none !important;
          transform: none;
          z-index: 1;
        }

        .pt-slot.pt-avoid {
          /* Keep track uniform thickness; no border/scale */
          border: none !important;
          box-shadow: none !important;
          transform: none;
          z-index: 1;
        }
        
        .pt-slot.pt-consumption {
          /* Keep track uniform thickness; no border/scale */
          border: none !important;
          box-shadow: none !important;
          transform: none;
          z-index: 1;
        }
        
        .pt-slot.pt-feed-in {
          /* Keep track uniform thickness; no border/scale */
          border: none !important;
          box-shadow: none !important;
          transform: none;
          z-index: 1;
        }

        .pt-slot.pt-avoid[data-tooltip]:hover::before,
        .pt-slot.pt-consumption[data-tooltip]:hover::before,
        .pt-slot.pt-feed-in[data-tooltip]:hover::before {
          transform: translateX(-50%);
          transform-origin: center bottom;
        }

        .pt-slot.pt-avoid[data-tooltip]:hover::after,
        .pt-slot.pt-consumption[data-tooltip]:hover::after,
        .pt-slot.pt-feed-in[data-tooltip]:hover::after {
          transform: translateX(-50%) !important;
          transform-origin: center bottom;
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
          background: #000000;
          color: #ffffff;
          padding: 4px 6px;
          border-radius: 3px;
          font-size: 10px;
          white-space: nowrap;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: block;
          pointer-events: none;
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
          border-top: 4px solid #000000;
          z-index: 1000;
        }

        .pt-scale {
          display: flex;
          align-items: flex-start;
          gap: 0;
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 6px;
          width: 85%;
          margin-left: 7.5%;
          position: relative;
          height: var(--timeline-scale-height, 24px);
          min-height: var(--timeline-scale-height, 24px);
          max-height: var(--timeline-scale-height, 24px);
          flex: 0 0 auto;
          padding-top: 0;
        }

        /* Layer with chips spanning ranges, sits under the dots */
        .pt-chip-layer {
          position: absolute;
          top: var(--timeline-chip-offset-y, 8px);
          left: 0;
          right: 0;
          height: var(--timeline-chip-height, 18px);
          display: block;
          z-index: 10;
        }

        .pt-chip {
          position: absolute;
          top: 0;
          height: var(--timeline-chip-height, 18px);
          border-radius: 6px;
          font-size: var(--chip-font-size, 10px);
          font-weight: 600;
          text-align: center;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          box-sizing: border-box;
        }

        .pt-chip-ideal { background: var(--optimal-color, #4CAF50); }
        .pt-chip-avoid { background: var(--avoid-color, #f44336); }

        /* Row of per-hour ticks/dots always present above chips */
        .pt-ticks {
          position: relative;
          display: flex;
          width: 100%;
          align-items: flex-start;
          gap: 0;
          min-height: var(--timeline-scale-height, 24px);
          padding-top: 0;
          z-index: 1;
        }

        .pt-tick {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          flex: 1;
          min-width: 0;
          max-width: none;
          box-sizing: border-box;
          position: relative;
          height: 100%;
        }

        .pt-dot {
          width: var(--timeline-dot-size, 4px);
          height: var(--timeline-dot-size, 4px);
          border-radius: 50%;
          background: var(--divider-color);
          margin-bottom: 1px;
          display: block;
        }

        .pt-dot.pt-faded {
          opacity: 0.4;
        }

        /* Colored dots for zones on the time axis */
        .pt-dot.pt-dot-ideal {
          background: var(--optimal-color, #4CAF50);
        }
        .pt-dot.pt-dot-avoid {
          background: var(--avoid-color, #f44336);
        }


        


        .pt-hour {
          font-variant-numeric: tabular-nums;
          text-align: center;
          font-size: 11px;
          line-height: 1.2;
          margin-top: 0;
        }
        
        .pt-time-label {
          font-variant-numeric: tabular-nums;
          text-align: center;
          font-size: 11px;
          font-weight: 500;
          color: var(--secondary-text-color);
          line-height: 1.2;
          padding: 2px 4px;
          background: var(--card-background-color);
          border-radius: 3px;
          border: 1px solid var(--divider-color);
          margin-top: 0;
        }
        
        .pt-range {
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 18px;
          flex-shrink: 0;
          position: relative;
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
          align-items: baseline;
          font-size: 11.5px;
          color: var(--secondary-text-color);
          margin-top: auto; /* push to bottom inside timeline card */
          padding-top: 4px;
          border-top: 1px solid var(--divider-color);
          flex-wrap: nowrap; /* single row */
          white-space: nowrap;
          gap: 4px;
          margin-bottom: 0;
          overflow: hidden;
        }
        .pt-footer > * { min-width: 0; }
        .pt-footer .meta-avg,
        .pt-footer .meta-entries { overflow: hidden; text-overflow: ellipsis; }
  /* Hide timeline footer on very small cards (2 rows) to save space */
        :host(.hide-footer) .pt-footer { display: none; }
        .pt-footer.no-content { border-top: none; margin-top: 0; padding-top: 0; }
      </style>
    `;
  }

  // Method to get card configuration info for display
  getCardInfo() {
    const info = {
      'Card Type': 'Dynamic Prices Card',
      'Entity': this._config.entity,
      'Layout': this._config.layout_style,
      'Grid Mode': this._config.grid_mode,
      'Decimal Precision': this._config.decimal_precision !== undefined ? 
        this._config.decimal_precision : 
        (this._config.unit === 'Cent' ? '1 (auto)' : '2 (auto)'),
      'Unit': this._config.unit,
      'Hours Shown': this._config.hours_to_show,
      'Optimal Periods': this._config.show_optimal_periods ? 'Enabled' : 'Disabled',
      'Avoid Periods': this._config.show_avoid_periods ? 'Enabled' : 'Disabled',
      'Price Calculation': this._config.enable_price_calculation ? 'Enabled' : 'Disabled'
    };
    return info;
  }

  // Expose card info for debugging/development - call from browser console
  logCardInfo() {
    console.table(this.getCardInfo());
    return this.getCardInfo();
  }

  getCardSize() {
    return 3;
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