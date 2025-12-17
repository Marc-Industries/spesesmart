
import { Transaction, User, PaymentMethod } from '../types';
import { BACKEND_URL, MOCK_USERS } from '../constants';

const LS_TRANSACTIONS = 'spesesmart_transactions';
const LS_USERS = 'spesesmart_users';

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const baseUrl = BACKEND_URL.replace(/\/$/, "");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

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
        return null;
    }
};

// Funzione interna per assicurarsi che l'oggetto transazione sia completo
const sanitizeTransaction = (t: any): Transaction => ({
    ...t,
    paymentMethod: (t.paymentMethod === 'CASH' || t.paymentMethod === 'CARD') ? t.paymentMethod : 'CARD'
});

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    const data = await apiCall(`/api/transactions?userId=${userId}`);
    if (data && Array.isArray(data)) {
        return data.map(sanitizeTransaction);
    }

    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const allTransactions: any[] = localData ? JSON.parse(localData) : [];
    return allTransactions
        .filter(t => t.userId === userId)
        .map(sanitizeTransaction);
};

export const addTransaction = async (transaction: Transaction): Promise<void> => {
    const sanitized = sanitizeTransaction(transaction);
    await apiCall('/api/transactions', 'POST', sanitized);
    
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const transactions: any[] = localData ? JSON.parse(localData) : [];
    transactions.push(sanitized);
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
};

export const deleteTransaction = async (id: string): Promise<void> => {
    await apiCall(`/api/transactions/${id}`, 'DELETE');

    const localData = localStorage.getItem(LS_TRANSACTIONS);
    if (localData) {
        const transactions: any[] = JSON.parse(localData);
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
    await apiCall(`/api/users/${user.id}`, 'PUT', user);
    const localUsersStr = localStorage.getItem(LS_USERS);
    let localUsers: User[] = localUsersStr ? JSON.parse(localUsersStr) : MOCK_USERS;
    const index = localUsers.findIndex(u => u.id === user.id);
    if (index !== -1) localUsers[index] = user;
    else localUsers.push(user);
    localStorage.setItem(LS_USERS, JSON.stringify(localUsers));
};
