// This file is now mostly empty because the SERVER (server.js) handles Telegram 24/7.
// The frontend no longer needs to poll Telegram.

import { User } from '../types';

export const processTelegramUpdates = async (currentUser: User, onNewTransaction: () => void) => {
  // Logic moved to backend server.js
  // This function is kept to prevent import errors in App.tsx but does nothing.
  return;
};
