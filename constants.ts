
import { User } from './types';

// Replace this with your actual Render/Heroku URL after deployment
export const BACKEND_URL = 'https://spesesmart.onrender.com'; 

export const CATEGORIES = {
  EXPENSE: [
    'Alimentari', 'Casa', 'Trasporti', 'Svago', 'Salute', 'Ristoranti', 'Shopping', 'Altro'
  ],
  INCOME: [
    'Stipendio', 'Freelance', 'Investimenti', 'Regali', 'Rimborsi', 'Mance', 'Altro'
  ]
};

// Colors for Expenses (Warm/Reddish tones + Distinct variants)
export const EXPENSE_COLORS = [
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#f59e0b', // Amber 500
  '#eab308', // Yellow 500
  '#ec4899', // Pink 500
  '#d946ef', // Fuchsia 500
  '#8b5cf6', // Violet 500
  '#6366f1', // Indigo 500
];

// Colors for Incomes (Green/Blue/Cool tones)
export const INCOME_COLORS = [
  '#10b981', // Emerald 500
  '#14b8a6', // Teal 500
  '#06b6d4', // Cyan 500
  '#0ea5e9', // Sky 500
  '#3b82f6', // Blue 500
  '#84cc16', // Lime 500
  '#22c55e', // Green 500
];

export const COLORS = [...EXPENSE_COLORS, ...INCOME_COLORS];

// Default passwords are '1234' for demo purposes
export const MOCK_USERS: User[] = [
  { 
    id: 'user_matteo', 
    name: 'Matteo', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo',
    password: '1234', 
    preferences: { currency: 'EUR', language: 'it' }
  },
  { 
    id: 'user_diana', 
    name: 'Diana', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana',
    password: '1234',
    preferences: { currency: 'PLN', language: 'pl' }
  },
];
