
import { Transaction, User, Subscription } from '../types';
import { BACKEND_URL } from '../constants';

const LS_TRANSACTIONS = 'spesesmart_transactions';
const LS_USERS = 'spesesmart_users';

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const baseUrl = BACKEND_URL.replace(/\/$/, "");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout for sleeping servers

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
        console.warn(`API call failed to ${endpoint}`, e);
        return null;
    }
};

const sanitizeTransaction = (t: any): Transaction => {
    return {
        id: t.id,
        userId: t.userId,
        date: t.date,
        amount: Number(t.amount) || 0,
        currency: t.currency,
        category: t.category,
        description: t.description || '',
        type: t.type
    };
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    // Try Server First
    const serverData = await apiCall(`/api/transactions?userId=${userId}`);
    
    if (serverData && Array.isArray(serverData)) {
        const sanitizedServer = serverData.map(sanitizeTransaction);
        localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(sanitizedServer)); // Update cache
        return sanitizedServer;
    }

    // Fallback to Local Storage only if server fails
    console.log("Using local transaction cache");
    const localDataStr = localStorage.getItem(LS_TRANSACTIONS);
    const localTransactions: Transaction[] = localDataStr ? JSON.parse(localDataStr) : [];
    return localTransactions.filter(t => t.userId === userId).map(sanitizeTransaction);
};

export const addTransaction = async (transaction: Transaction): Promise<void> => {
    const sanitized = sanitizeTransaction(transaction);
    await apiCall('/api/transactions', 'POST', sanitized);
};

export const deleteTransaction = async (id: string): Promise<void> => {
    await apiCall(`/api/transactions/${id}`, 'DELETE');
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const data = await apiCall(`/api/users/${userId}`);
    if (data) {
        // Update local cache for user
        const localUsers: User[] = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
        const idx = localUsers.findIndex(u => u.id === userId);
        if (idx !== -1) localUsers[idx] = data; else localUsers.push(data);
        localStorage.setItem(LS_USERS, JSON.stringify(localUsers));
        return data;
    }
    // Fallback
    const localUsers: User[] = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
    return localUsers.find(u => u.id === userId) || null;
};

export const updateUserProfile = async (user: User): Promise<void> => {
    await apiCall(`/api/users/${user.id}`, 'PUT', user);
    const localUsers: User[] = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
    const idx = localUsers.findIndex(u => u.id === user.id);
    if (idx !== -1) localUsers[idx] = user; else localUsers.push(user);
    localStorage.setItem(LS_USERS, JSON.stringify(localUsers));
};

// --- SUBSCRIPTIONS ---
export const getSubscriptions = async (userId: string): Promise<Subscription[]> => {
    const data = await apiCall(`/api/subscriptions?userId=${userId}`);
    return data || [];
};

export const addSubscription = async (sub: Subscription): Promise<void> => {
    await apiCall('/api/subscriptions', 'POST', sub);
};

export const deleteSubscription = async (id: string): Promise<void> => {
    await apiCall(`/api/subscriptions/${id}`, 'DELETE');
};
