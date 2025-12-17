import { User } from './types';

// Replace this with your actual Render/Heroku URL after deployment
// For local testing: 'http://localhost:3000'
export const BACKEND_URL = 'http://localhost:3000'; 

export const CATEGORIES = {
  EXPENSE: [
    'Alimentari', 'Casa', 'Trasporti', 'Svago', 'Salute', 'Ristoranti', 'Shopping', 'Altro'
  ],
  INCOME: [
    'Stipendio', 'Freelance', 'Investimenti', 'Regali', 'Rimborsi', 'Altro'
  ]
};

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

export const COLORS = [
  '#10b981', // Emerald 500
  '#3b82f6', // Blue 500
  '#f59e0b', // Amber 500
  '#ef4444', // Red 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#64748b', // Slate 500
];