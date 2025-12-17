import { Transaction, User } from '../types';
import { BACKEND_URL, MOCK_USERS } from '../constants';

// Keys for LocalStorage
const LS_TRANSACTIONS = 'spesesmart_transactions';
const LS_USERS = 'spesesmart_users';

// Helper to simulate API delay locally
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        // Remove trailing slash if present
        const baseUrl = BACKEND_URL.replace(/\/$/, "");
        
        // Attempt fetch with a short timeout to fail fast if server is down
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const headers: any = { 'Content-Type': 'application/json' };
        const config: RequestInit = { 
            method, 
            headers, 
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        };

        const res = await fetch(`${baseUrl}${endpoint}`, config);
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn(`Backend unreachable (${endpoint}), using LocalStorage fallback.`);
        return null; // Return null to trigger fallback logic
    }
};

// --- DATA METHODS ---

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    // 1. Try API
    const data = await apiCall(`/api/transactions?userId=${userId}`);
    if (data) return data;

    // 2. Fallback LocalStorage
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const allTransactions: Transaction[] = localData ? JSON.parse(localData) : [];
    return allTransactions.filter(t => t.userId === userId);
};

export const addTransaction = async (transaction: Transaction): Promise<void> => {
    // 1. Try API
    const res = await apiCall('/api/transactions', 'POST', transaction);
    
    // 2. Always save to LocalStorage (sync) incase API failed or to keep consistency
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const transactions: Transaction[] = localData ? JSON.parse(localData) : [];
    transactions.push(transaction);
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
};

export const deleteTransaction = async (id: string): Promise<void> => {
    // 1. Try API
    await apiCall(`/api/transactions/${id}`, 'DELETE');

    // 2. LocalStorage Update
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    if (localData) {
        const transactions: Transaction[] = JSON.parse(localData);
        const filtered = transactions.filter(t => t.id !== id);
        localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(filtered));
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    // 1. Try API
    const data = await apiCall(`/api/users/${userId}`);
    if (data) return data;

    // 2. Fallback LocalStorage or Mock
    const localUsersStr = localStorage.getItem(LS_USERS);
    let localUsers: User[] = localUsersStr ? JSON.parse(localUsersStr) : [];
    
    // If local storage is empty, initialize with MOCK_USERS
    if (localUsers.length === 0) {
        localUsers = MOCK_USERS;
        localStorage.setItem(LS_USERS, JSON.stringify(localUsers));
    }

    return localUsers.find(u => u.id === userId) || null;
};

export const updateUserProfile = async (user: User): Promise<void> => {
    // 1. Try API
    await apiCall(`/api/users/${user.id}`, 'PUT', user);

    // 2. LocalStorage Update
    const localUsersStr = localStorage.getItem(LS_USERS);
    let localUsers: User[] = localUsersStr ? JSON.parse(localUsersStr) : MOCK_USERS;
    
    const index = localUsers.findIndex(u => u.id === user.id);
    if (index !== -1) {
        localUsers[index] = user;
    } else {
        localUsers.push(user);
    }
    
    localStorage.setItem(LS_USERS, JSON.stringify(localUsers));
};

export const seedMockData = async (userId: string) => {
    // Not needed with the hybrid approach
};