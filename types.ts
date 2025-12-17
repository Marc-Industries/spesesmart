
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum Period {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL = 'ALL'
}

export type Currency = 'EUR' | 'USD' | 'PLN';
export type Language = 'it' | 'en' | 'pl';
export type PaymentMethod = 'CASH' | 'CARD';

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
  paymentMethod?: PaymentMethod; // New field
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
