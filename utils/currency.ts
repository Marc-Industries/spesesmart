import { Currency } from '../types';

// Hardcoded rates for demo purposes. 
// In a real app, fetch from an API (e.g., OpenExchangeRates)
const EXCHANGE_RATES: Record<Currency, number> = {
  EUR: 1,      // Base
  USD: 1.08,   // 1 EUR = 1.08 USD
  PLN: 4.30    // 1 EUR = 4.30 PLN
};

export const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
  if (from === to) return amount;
  
  // Convert to Base (EUR) first
  const amountInEur = amount / EXCHANGE_RATES[from];
  
  // Convert from Base to Target
  return amountInEur * EXCHANGE_RATES[to];
};

export const formatCurrency = (amount: number, currency: Currency): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

export const getCurrencySymbol = (currency: Currency): string => {
  switch (currency) {
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'PLN': return 'zł';
    default: return currency;
  }
};
