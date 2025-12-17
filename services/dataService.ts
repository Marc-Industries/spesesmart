
import { Transaction, User, PaymentMethod } from '../types';
import { BACKEND_URL, MOCK_USERS } from '../constants';

const LS_TRANSACTIONS = 'spesesmart_transactions';
const LS_USERS = 'spesesmart_users';

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
        const baseUrl = BACKEND_URL.replace(/\/$/, "");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

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
        console.warn(`API call failed to ${endpoint}, using local fallback.`);
        return null;
    }
};

const sanitizeTransaction = (t: any): Transaction => {
    // Normalizzazione ossessiva del metodo di pagamento
    let method: PaymentMethod = 'CARD';
    const rawMethod = String(t.paymentMethod || t.method || '').toUpperCase();
    
    if (rawMethod === 'CASH' || rawMethod === 'CONTANTI') {
        method = 'CASH';
    } else if (rawMethod === 'CARD' || rawMethod === 'CARTA') {
        method = 'CARD';
    }

    return {
        id: t.id,
        userId: t.userId,
        date: t.date,
        amount: Number(t.amount) || 0,
        currency: t.currency,
        category: t.category,
        description: t.description || '',
        type: t.type,
        paymentMethod: method
    };
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    const serverData = await apiCall(`/api/transactions?userId=${userId}`);
    const localDataStr = localStorage.getItem(LS_TRANSACTIONS);
    const localTransactions: Transaction[] = localDataStr ? JSON.parse(localDataStr) : [];
    
    if (serverData && Array.isArray(serverData)) {
        const sanitizedServer = serverData.map(sanitizeTransaction);
        
        // CRITICAL FIX: The remote server might default to 'CARD' if it doesn't support the field yet.
        // If we have a local record saying 'CASH', we TRUST LOCAL DATA unconditionally for the payment method.
        // This prevents the UI from flipping 'Cash' back to 'Card' after polling.
        const merged = sanitizedServer.map(sTx => {
            const localMatch = localTransactions.find(lTx => lTx.id === sTx.id);
            if (localMatch && localMatch.paymentMethod === 'CASH') {
                // If local is CASH, force CASH regardless of what server says.
                return { ...sTx, paymentMethod: 'CASH' as PaymentMethod };
            }
            return sTx;
        });

        // Aggiorna local storage con i dati puliti
        const otherUsersTx = localTransactions.filter(t => t.userId !== userId);
        localStorage.setItem(LS_TRANSACTIONS, JSON.stringify([...otherUsersTx, ...merged]));
        
        return merged;
    }

    return localTransactions.filter(t => t.userId === userId).map(sanitizeTransaction);
};

export const addTransaction = async (transaction: Transaction): Promise<void> => {
    const sanitized = sanitizeTransaction(transaction);
    
    // 1. Salva subito in locale
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    const allTransactions: any[] = localData ? JSON.parse(localData) : [];
    
    // Rimuovi eventuali duplicati per ID prima di aggiungere
    const filtered = allTransactions.filter(t => t.id !== transaction.id);
    filtered.push(sanitized);
    
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(filtered));

    // 2. Invia al server
    console.log(`[API SEND] Invio transazione ${sanitized.id} con metodo ${sanitized.paymentMethod}`);
    await apiCall('/api/transactions', 'POST', sanitized);
};

export const deleteTransaction = async (id: string): Promise<void> => {
    await apiCall(`/api/transactions/${id}`, 'DELETE');
    const localData = localStorage.getItem(LS_TRANSACTIONS);
    if (localData) {
        const transactions: any[] = JSON.parse(localData);
        localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions.filter(t => t.id !== id)));
    }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
    const data = await apiCall(`/api/users/${userId}`);
    if (data) return data;
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
