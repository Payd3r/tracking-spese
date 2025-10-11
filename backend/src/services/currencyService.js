import axios from 'axios';

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// In-memory cache
const cache = new Map();

/**
 * Get exchange rate from cache or API
 */
async function getExchangeRate(from, to) {
  if (from === to) {
    return 1;
  }
  
  const cacheKey = `${from}_${to}`;
  const cached = cache.get(cacheKey);
  
  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }
  
  try {
    // Fetch from Frankfurter API
    const response = await axios.get(
      `${FRANKFURTER_BASE_URL}/latest?from=${from}&to=${to}`,
      { timeout: 5000 }
    );
    
    const rate = response.data.rates[to];
    
    if (!rate) {
      throw new Error(`Tasso di cambio non disponibile per ${from} -> ${to}`);
    }
    
    // Cache the rate
    cache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });
    
    return rate;
    
  } catch (error) {
    // If API fails and we have a cached value (even if expired), use it
    if (cached) {
      console.warn(`Using expired cached rate for ${from} -> ${to}`);
      return cached.rate;
    }
    
    throw new Error(`Impossibile ottenere il tasso di cambio: ${error.message}`);
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!amount || amount === 0) {
    return 0;
  }
  
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return parseFloat((amount * rate).toFixed(2));
}

/**
 * Get list of supported currencies
 */
export async function getSupportedCurrencies() {
  const cacheKey = 'supported_currencies';
  const cached = cache.get(cacheKey);
  
  // Return cached value if still valid (cache for 24 hours)
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.currencies;
  }
  
  try {
    const response = await axios.get(`${FRANKFURTER_BASE_URL}/currencies`, {
      timeout: 5000
    });
    
    const currencies = Object.entries(response.data).map(([code, name]) => ({
      code,
      name,
      symbol: getCurrencySymbol(code)
    }));
    
    // Cache the currencies
    cache.set(cacheKey, {
      currencies,
      timestamp: Date.now()
    });
    
    return currencies;
    
  } catch (error) {
    // If API fails and we have cached data, use it
    if (cached) {
      return cached.currencies;
    }
    
    // Fallback to a minimal list of popular currencies
    return getDefaultCurrencies();
  }
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(code) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CHF: 'Fr',
    CAD: 'C$',
    AUD: 'A$',
    CNY: '¥',
    INR: '₹',
    BRL: 'R$',
    RUB: '₽',
    KRW: '₩',
    MXN: '$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    TRY: '₺',
    ZAR: 'R'
  };
  
  return symbols[code] || code;
}

/**
 * Fallback list of default currencies
 */
function getDefaultCurrencies() {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' }
  ];
}

/**
 * Clear cache (useful for testing or manual refresh)
 */
export function clearCache() {
  cache.clear();
}


