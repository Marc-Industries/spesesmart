
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum Period {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ALL = 'ALL'
}

export type Currency = 'EUR' | 'USD' | 'PLN';
export type Language = 'it' | 'en' | 'pl';

export interface UserPreferences {
  currency: Currency;
  language: Language;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  password?: string;
  telegramChatId?: string;
  preferences: UserPreferences;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string; // ISO string
  amount: number;
  currency: Currency;
  category: string;
  description: string;
  type: TransactionType;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: Currency;
  category: string;
  frequency: 'MONTHLY' | 'YEARLY';
  nextPaymentDate: string; // ISO String (YYYY-MM-DD)
  active: boolean;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  income?: number;
  expense?: number;
  [key: string]: any;
}

export interface CategorySummary {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}
