import { Currency } from "../models/user";

// Shared list of currencies offered across the app (loans, profile, expenses).
export const popularCurrencies: Currency[] = [
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'UZS', name: 'Uzbek Som', symbol: 'soʻm' },
  { code: 'KZT', name: 'Kazakh Tenge', symbol: '₸' },
  { code: 'TJS', name: 'Tajik Somoni', symbol: 'SM' },
  { code: 'KGS', name: 'Kyrgyz Som', symbol: 'с' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
];

export function findCurrency(code: string): Currency {
  return popularCurrencies.find((c) => c.code === code) || popularCurrencies[1]; // default UZS
}
