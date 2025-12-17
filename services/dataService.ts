import { Transaction, User } from '../types';
import { BACKEND_URL, MOCK_USERS } from '../constants';

// Keys for LocalStorage
const LS_TRANSACTIONS = 'spesesmart_transactions';
const LS_USERS = 'spesesmart_users';

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const baseUrl = BACKEND_URL.replace(/\/$/, "");
        
        // Timeout breve per non bloccare l'UI se il server è spento
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

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
        // Silenzia l'errore in console per evitare allarmismi, usa fallback
        return null;
    }
};

// --- DATA METHODS ---

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    const data = await apiCall(`/api/transactions?userId=${userId}`);
    if (data) return data;

    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const allTransactions: Transaction[] = localData ? JSON.parse(localData) : [];
    return allTransactions.filter(t => t.userId === userId);
};

export const addTransaction = async (transaction: Transaction): Promise<void> => {
    // Prova API (fire and forget per velocità UI, ma await per sicurezza sync)
    apiCall('/api/transactions', 'POST', transaction);
    
    // Salva sempre in Locale per consistenza immediata
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const transactions: Transaction[] = localData ? JSON.parse(localData) : [];
    transactions.push(transaction);
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
};

export const deleteTransaction = async (id: string): Promise<void> => {
    apiCall(`/api/transactions/${id}`, 'DELETE');

    const localData = localStorage.getItem(LS_TRANSACTIONS);
    if (localData) {
        const transactions: Transaction[] = JSON.parse(localData);
        const filtered = transactions.filter(t => t.id !== id);
        localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(filtered));
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const data = await apiCall(`/api/users/${userId}`);
    if (data) return data;

    const localUsersStr = localStorage.getItem(LS_USERS);
    let localUsers: User[] = localUsersStr ? JSON.parse(localUsersStr) : [];
    
    if (localUsers.length === 0) {
        localUsers = MOCK_USERS;
        localStorage.setItem(LS_USERS, JSON.stringify(localUsers));
    }

    return localUsers.find(u => u.id === userId) || null;
};

export const updateUserProfile = async (user: User): Promise<void> => {
    apiCall(`/api/users/${user.id}`, 'PUT', user);

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

export const seedMockData = async (userId: string) => {};