interface ExchangeRates {
  [key: string]: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = 'exchange_rates_cache';

// Fixed fallback rates (updated periodically)
const FALLBACK_RATES: ExchangeRates = {
  'USD': 1.00,
  'AUD': 1.55,
  'GBP': 0.79,
  'CAD': 1.36,
  'EUR': 0.92,
  'NZD': 1.65
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
}

export const getCurrencyByRegion = (region: string): CurrencyInfo => {
  const currencyMap: Record<string, { code: string; symbol: string }> = {
    'au': { code: 'AUD', symbol: '$' },
    'uk': { code: 'GBP', symbol: '£' },
    'gb': { code: 'GBP', symbol: '£' },
    'us': { code: 'USD', symbol: '$' },
    'ca': { code: 'CAD', symbol: '$' },
    'nz': { code: 'NZD', symbol: '$' },
    'eu': { code: 'EUR', symbol: '€' }
  };

  const currency = currencyMap[region.toLowerCase()] || currencyMap['us'];
  return {
    ...currency,
    rate: 1.0 // Will be populated by getExchangeRates
  };
};

async function fetchLiveRates(): Promise<ExchangeRates | null> {
  try {
    // Using a free exchange rate API (exchangerate-api.com)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) throw new Error('Failed to fetch rates');

    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.warn('Failed to fetch live exchange rates:', error);
    return null;
  }
}

function getCachedRates(): ExchangeRates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { rates, timestamp }: CachedRates = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (24 hours)
    if (now - timestamp < CACHE_DURATION) {
      return rates;
    }

    // Cache expired
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Error reading cached rates:', error);
    return null;
  }
}

function setCachedRates(rates: ExchangeRates): void {
  try {
    const cacheData: CachedRates = {
      rates,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error caching rates:', error);
  }
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  // Try cached rates first
  const cached = getCachedRates();
  if (cached) {
    return cached;
  }

  // Try to fetch live rates
  const liveRates = await fetchLiveRates();
  if (liveRates) {
    setCachedRates(liveRates);
    return liveRates;
  }

  // Fall back to hardcoded rates
  console.warn('Using fallback exchange rates');
  setCachedRates(FALLBACK_RATES);
  return FALLBACK_RATES;
}

export function convertCurrency(
  amountUSD: number,
  targetCurrency: string,
  rates: ExchangeRates
): number {
  const rate = rates[targetCurrency] || 1.0;
  return amountUSD * rate;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyInfo
): string {
  return `${currency.symbol}${amount.toFixed(2)} ${currency.code}`;
}

// Calculate call cost in local currency
export function calculateCallCost(
  region: string,
  rates: ExchangeRates
): { amount: number; currency: CurrencyInfo } {
  const baseUSD = 2.00; // Fixed $2 USD per call
  const currency = getCurrencyByRegion(region);
  const localAmount = convertCurrency(baseUSD, currency.code, rates);

  return {
    amount: localAmount,
    currency: { ...currency, rate: rates[currency.code] || 1.0 }
  };
}