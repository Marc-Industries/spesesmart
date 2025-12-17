
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LogOut, Plus, LayoutDashboard, CreditCard, Wallet, TrendingUp, TrendingDown,
  BrainCircuit, X, Settings, ArrowLeft, Sun, Moon, Calendar, ListFilter,
  BarChart3, ChevronLeft, CalendarDays, Clock, Archive
} from 'lucide-react';
import { Transaction, User, TransactionType, Language, Period, PaymentMethod } from './types.ts';
import { MOCK_USERS, CATEGORIES } from './constants.ts';
import { getTransactions, addTransaction, deleteTransaction, getUserProfile, updateUserProfile } from './services/dataService.ts';
import { analyzeFinances } from './services/geminiService.ts';
import { ExpensePieChart, IncomePieChart, BalanceTrendChart, PaymentMethodPieChart } from './components/Charts.tsx';
import { TransactionForm } from './components/TransactionForm.tsx';
import { TransactionList } from './components/TransactionList.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { convertCurrency, formatCurrency } from './utils/currency.ts';
import { t } from './utils/translations.ts';
import ReactMarkdown from 'react-markdown';
import { isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Stato per gli utenti disponibili nella login, inizializzato con i mock ma aggiornato dal DB/LocalStorage
  const [availableUsers, setAvailableUsers] = useState<User[]>(MOCK_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const lastUserActionRef = useRef<number>(Date.now());
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [historySubTab, setHistorySubTab] = useState<'total' | 'categories'>('total');
  const [selectedHistoryCategory, setSelectedHistoryCategory] = useState<string | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filtri Dashboard
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.ALL);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | PaymentMethod>('ALL');

  // Filtri History
  const [historyPeriod, setHistoryPeriod] = useState<Period>(Period.ALL);

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [uiLanguage, setUiLanguage] = useState<Language>('it');

  const [loginStep, setLoginStep] = useState<'select_user' | 'password'>('select_user');
  const [selectedLoginUser, setSelectedLoginUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Carica i dati utente aggiornati all'avvio per visualizzare gli avatar corretti
  useEffect(() => {
    const fetchUsers = async () => {
      const updatedUsers = await Promise.all(
        MOCK_USERS.map(async (mockUser) => {
          try {
            const profile = await getUserProfile(mockUser.id);
            return profile || mockUser;
          } catch (e) {
            return mockUser;
          }
        })
      );
      setAvailableUsers(updatedUsers);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    let interval: number;
    if (currentUser) {
      loadData(currentUser.id); 
      interval = window.setInterval(() => {
        // AUMENTATO A 60 SECONDI: Per evitare refresh fastidiosi mentre l'utente lavora
        if (Date.now() - lastUserActionRef.current > 60000) {
          loadData(currentUser.id, true); 
        }
      }, 30000); 
    }
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadData = async (userId: string, silent = false) => {
    if (!silent) setIsLoadingData(true);
    const data = await getTransactions(userId);
    if (data) {
        const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sorted);
    }
    if (!silent) setIsLoadingData(false);
  };

  // Logic for Dashboard Filter
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      if (paymentFilter !== 'ALL' && t.paymentMethod !== paymentFilter) return false;
      if (selectedPeriod === Period.ALL) return true;
      const tDate = new Date(t.date);
      switch (selectedPeriod) {
        case Period.DAILY: return isSameDay(tDate, now);
        case Period.WEEKLY: return isSameWeek(tDate, now, { weekStartsOn: 1 });
        case Period.MONTHLY: return isSameMonth(tDate, now);
        default: return true;
      }
    });
  }, [transactions, selectedPeriod, paymentFilter]);

  // Logic for History Filter (Independent from Dashboard)
  const historyFilteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      if (historyPeriod === Period.ALL) return true;
      const tDate = new Date(t.date);
      switch (historyPeriod) {
        case Period.DAILY: return isSameDay(tDate, now);
        case Period.WEEKLY: return isSameWeek(tDate, now, { weekStartsOn: 1 });
        case Period.MONTHLY: return isSameMonth(tDate, now);
        case Period.YEARLY: return isSameYear(tDate, now);
        default: return true;
      }
    });
  }, [transactions, historyPeriod]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set([...CATEGORIES.EXPENSE, ...CATEGORIES.INCOME]));
  }, []);

  // Category view in History should use history filtered data
  const categoryFilteredTransactions = useMemo(() => {
    if (selectedHistoryCategory) {
      return historyFilteredTransactions.filter(t => t.category === selectedHistoryCategory);
    }
    return historyFilteredTransactions;
  }, [historyFilteredTransactions, selectedHistoryCategory]);

  const stats = useMemo(() => {
    if (!currentUser) return { income: 0, expense: 0, balance: 0, filteredIncome: 0, filteredExpense: 0 };
    const base = currentUser.preferences.currency;
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);
    const periodIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);
    const periodExpense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);

    return { 
      income: totalIncome, 
      expense: totalExpense, 
      balance: totalIncome - totalExpense,
      filteredIncome: periodIncome,
      filteredExpense: periodExpense
    };
  }, [transactions, filteredTransactions, currentUser?.preferences.currency]);

  // Calcolo statistiche periodiche per la scheda History (solo visualizzazione rapida)
  const timeStats = useMemo(() => {
      if (!currentUser) return { daily: 0, weekly: 0, monthly: 0 };
      const base = currentUser.preferences.currency;
      const now = new Date();
      
      const calcExpense = (predicate: (d: Date) => boolean) => 
        transactions
          .filter(t => t.type === TransactionType.EXPENSE && predicate(new Date(t.date)))
          .reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);

      return {
        daily: calcExpense((d) => isSameDay(d, now)),
        weekly: calcExpense((d) => isSameWeek(d, now, { weekStartsOn: 1 })),
        monthly: calcExpense((d) => isSameMonth(d, now))
      };
  }, [transactions, currentUser?.preferences.currency]);

  const handleUserSelect = async (user: User) => {
    try {
        const dbUser = await getUserProfile(user.id);
        const userToLogin = dbUser || user;
        setSelectedLoginUser(userToLogin);
        setLoginStep('password');
    } catch (e) {
        setSelectedLoginUser(user);
        setLoginStep('password');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoginUser) {
      const correctPassword = selectedLoginUser.password || '1234';
      if (passwordInput === correctPassword) {
        setCurrentUser(selectedLoginUser);
        setUiLanguage(selectedLoginUser.preferences.language);
        setLoginStep('select_user');
        setSelectedLoginUser(null);
        setPasswordInput('');
        setLoginError(false);
      } else {
        setLoginError(true);
      }
    }
  };

  const handleLogout = () => { setCurrentUser(null); setTransactions([]); setAiAnalysis(null); setLoginStep('select_user'); };
  
  const handleUpdateProfile = async (u: User) => { 
    setCurrentUser(u); 
    await updateUserProfile(u);
    // Aggiorna anche la lista locale per la schermata di login
    setAvailableUsers(prev => prev.map(user => user.id === u.id ? u : user));
  };
  
  const handleAddTransaction = async (t: Transaction) => { 
    lastUserActionRef.current = Date.now();
    setTransactions(prev => [t, ...prev]);
    await addTransaction(t); 
  };

  const handleDeleteTransaction = async (id: string) => { 
    if (window.confirm("Sicuro?")) { 
      lastUserActionRef.current = Date.now();
      setTransactions(prev => prev.filter(t => t.id !== id));
      await deleteTransaction(id); 
    } 
  };
  
  const handleAnalyze = async () => { if (!currentUser) return; setIsAnalyzing(true); const result = await analyzeFinances(transactions, currentUser.preferences.language, currentUser.preferences.currency); setAiAnalysis(result); setIsAnalyzing(false); };

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className={`p-8 rounded-3xl shadow-2xl max-w-md w-full text-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
          <div className="flex justify-between items-center mb-8">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
                {isDarkMode ? <Sun size={22}/> : <Moon size={22}/>}
             </button>
             <div className="flex gap-2">
               {['it', 'en', 'pl'].map(l => (
                 <button key={l} onClick={() => setUiLanguage(l as Language)} className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase transition-all ${uiLanguage === l ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                   {l}
                 </button>
               ))}
             </div>
          </div>
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30 ring-4 ring-blue-600/10"><Wallet className="text-white w-10 h-10" /></div>
          <h1 className="text-3xl font-black mb-8 tracking-tight">SpeseSmart AI</h1>
          {loginStep === 'select_user' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t('login_subtitle', uiLanguage)}</p>
              {availableUsers.map(user => (
                <button key={user.id} onClick={() => handleUserSelect(user)} className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group ${isDarkMode ? 'border-slate-700 hover:bg-slate-700 hover:border-blue-500' : 'border-slate-100 hover:bg-blue-50 hover:border-blue-500'}`}>
                  <img src={user.avatar} className="w-12 h-12 rounded-full shadow-sm bg-slate-100 dark:bg-slate-600" alt={user.name} />
                  <div className="text-left">
                    <div className="font-bold text-lg group-hover:text-blue-600 transition-colors">{user.name}</div>
                    <div className="text-xs text-slate-400">{t('login_btn', uiLanguage)}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-6 animate-fade-in">
              <button type="button" onClick={() => { setLoginStep('select_user'); setLoginError(false); }} className="flex items-center text-sm font-medium text-slate-400 hover:text-blue-500 gap-1 transition-colors"><ArrowLeft size={16}/> {t('back', uiLanguage)}</button>
              <div className="text-center">
                <img src={selectedLoginUser?.avatar} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-600/10" alt="User" />
                <h2 className="text-xl font-bold">{selectedLoginUser?.name}</h2>
              </div>
              <div className="relative">
                <input type="password" autoFocus value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={`w-full p-4 border-2 rounded-2xl outline-none transition-all font-medium text-center text-lg shadow-inner ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} ${loginError ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} placeholder={t('password_placeholder', uiLanguage)} />
                {loginError && <p className="text-red-500 text-sm font-bold mt-3 animate-bounce">{t('wrong_password', uiLanguage)}</p>}
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all">{t('login_btn', uiLanguage)}</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const { currency: baseCurrency, language } = currentUser.preferences;

  return (
    <div className={`min-h-screen pb-24 md:pb-0 flex transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      <aside className={`hidden md:flex flex-col w-64 border-r fixed h-full z-10 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="p-6 flex items-center gap-3 font-bold text-xl"><Wallet className="text-blue-600"/> SpeseSmart</div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedHistoryCategory(null); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${activeTab === 'dashboard' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><LayoutDashboard/> {t('dashboard', language)}</button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium ${activeTab === 'history' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}><CreditCard/> {t('history', language)}</button>
          <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 p-3 text-slate-500 hover:text-blue-500"><Settings/> {t('settings', language)}</button>
        </nav>
        <button onClick={handleLogout} className="p-6 text-slate-400 flex items-center gap-2 hover:text-red-500"><LogOut size={18}/> {t('logout', language)}</button>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="md:hidden flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 font-bold"><Wallet className="text-blue-600"/> SpeseSmart</div>
          <div className="flex gap-2">
             <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-blue-600/20" alt="Avatar" />
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 border rounded-full">{isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          </div>
        </div>

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden">
                <p className="text-slate-400 text-sm mb-1">{t('balance', language)}</p>
                <h2 className="text-3xl font-bold">{formatCurrency(stats.balance, baseCurrency)}</h2>
                <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={80}/></div>
              </div>
              <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div><p className="text-slate-400 text-sm mb-1">{t('income', language)}</p><h2 className="text-2xl font-bold text-emerald-500">+{formatCurrency(stats.filteredIncome, baseCurrency)}</h2></div>
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500"><TrendingUp/></div>
              </div>
              <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div><p className="text-slate-400 text-sm mb-1">{t('expense', language)}</p><h2 className="text-2xl font-bold text-red-500">-{formatCurrency(stats.filteredExpense, baseCurrency)}</h2></div>
                <div className="p-3 rounded-full bg-red-500/10 text-red-500"><TrendingDown/></div>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar items-center">
              <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                {[Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.ALL].map(p => (
                  <button key={p} onClick={() => setSelectedPeriod(p)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedPeriod === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {t(p, language)}
                  </button>
                ))}
              </div>
              <div className="h-10 w-px bg-slate-300 dark:bg-slate-700 mx-1"/>
              <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                {['ALL', 'CARD', 'CASH'].map(m => (
                  <button key={m} onClick={() => setPaymentFilter(m as any)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${paymentFilter === m ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                    {t(m.toLowerCase(), language).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BalanceTrendChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                <ExpensePieChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
                <IncomePieChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
              </div>
            </div>
            <div className="pt-4">
              <div className="flex justify-between items-center mb-4"><h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Ultimi Movimenti</h3><button onClick={() => setActiveTab('history')} className="text-blue-500 text-sm font-bold">Vedi Tutti</button></div>
              <TransactionList transactions={filteredTransactions.slice(0, 5)} onDelete={handleDeleteTransaction} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
            </div>
          </div>
        )}

        {/* --- HISTORY VIEW --- */}
        {activeTab === 'history' && (
          <div className="animate-fade-in">
             <div className="flex items-center justify-between mb-6">
               <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('history', language)}</h2>
             </div>
             
             {/* Time Breakdown Cards - REQUESTED FEATURE: DAILY/WEEKLY/MONTHLY REFS */}
             {!selectedHistoryCategory && (
                <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Spese Oggi</div>
                      <div className={`text-lg md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>-{formatCurrency(timeStats.daily, baseCurrency)}</div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><CalendarDays className="w-3 h-3"/> Spese Settimana</div>
                      <div className={`text-lg md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>-{formatCurrency(timeStats.weekly, baseCurrency)}</div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Calendar className="w-3 h-3"/> Spese Mese</div>
                      <div className={`text-lg md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>-{formatCurrency(timeStats.monthly, baseCurrency)}</div>
                  </div>
                </div>
             )}

             {/* HISTORY FILTER BAR */}
             <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar items-center mb-6">
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                  {[Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.YEARLY, Period.ALL].map(p => (
                    <button key={p} onClick={() => setHistoryPeriod(p)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${historyPeriod === p ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                      {t(p, language)}
                    </button>
                  ))}
                </div>
             </div>

             <div className="flex gap-8 mb-8 border-b dark:border-slate-800">
                <button onClick={() => { setHistorySubTab('total'); setSelectedHistoryCategory(null); }} className={`relative pb-4 text-sm font-bold transition-all px-1 ${historySubTab === 'total' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'}`}>
                  Report Completo
                  {historySubTab === 'total' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full shadow-[0_-4px_10px_rgba(59,130,246,0.5)]" />}
                </button>
                <button onClick={() => { if (historySubTab === 'categories' && selectedHistoryCategory) setSelectedHistoryCategory(null); else setHistorySubTab('categories'); }} className={`relative pb-4 text-sm font-bold transition-all px-1 ${historySubTab === 'categories' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'}`}>
                  Per Categoria
                  {historySubTab === 'categories' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full shadow-[0_-4px_10px_rgba(59,130,246,0.5)]" />}
                </button>
             </div>

             {historySubTab === 'total' ? (
                <div className="space-y-8 animate-fade-in">
                   <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-xl font-bold flex items-center justify-center gap-3 hover:scale-[1.01] transition-transform">
                     {isAnalyzing ? <span className="animate-pulse">Analisi in corso...</span> : <><BrainCircuit/> Genera Analisi Finanziaria AI</>}
                   </button>
                   {aiAnalysis && (
                     <div className="p-6 rounded-2xl border relative bg-indigo-50 dark:bg-slate-800 border-indigo-100 dark:border-slate-700 animate-fade-in">
                       <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={20}/></button>
                       <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>
                     </div>
                   )}
                   
                   {/* GROUPED LIST BY MONTH */}
                   <TransactionList 
                      transactions={historyFilteredTransactions} 
                      onDelete={handleDeleteTransaction} 
                      baseCurrency={baseCurrency} 
                      language={language} 
                      isDarkMode={isDarkMode} 
                      groupByMonth={true}
                   />
                </div>
             ) : (
                <div className="animate-fade-in">
                   {!selectedHistoryCategory ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {uniqueCategories.map(cat => (
                          <button key={cat} onClick={() => setSelectedHistoryCategory(cat)} className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all group ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-xl'}`}>
                            <div className="p-4 rounded-2xl bg-blue-600/10 text-blue-600 mb-4 group-hover:scale-110 transition-transform"><BarChart3 size={28}/></div>
                            <span className={`font-black text-sm uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{t(cat, language)}</span>
                            <span className="text-[10px] mt-1 text-slate-400 font-bold">{historyFilteredTransactions.filter(t => t.category === cat).length} Transazioni</span>
                          </button>
                        ))}
                      </div>
                   ) : (
                      <div className="space-y-6 animate-fade-in">
                          <button onClick={() => setSelectedHistoryCategory(null)} className="flex items-center gap-2 text-sm font-black text-blue-500 mb-2 hover:translate-x-[-4px] transition-transform"><ChevronLeft size={18}/> TORNA ALLE CATEGORIE</button>
                          <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border shadow-xl transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                             <div className="flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30"><BarChart3 size={28}/></div>
                                <div><h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t(selectedHistoryCategory, language)}</h3><p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Report dettagliato categoria</p></div>
                             </div>
                             <div className="mt-4 md:mt-0 md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-700">
                                <p className={`text-[10px] font-black uppercase mb-1 tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Totale Periodo</p>
                                <p className={`text-3xl font-black ${transactions.find(t => t.category === selectedHistoryCategory)?.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-red-500'}`}>{formatCurrency(categoryFilteredTransactions.reduce((s, tr) => s + convertCurrency(tr.amount, tr.currency, baseCurrency), 0), baseCurrency)}</p>
                             </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <BalanceTrendChart transactions={categoryFilteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
                             <PaymentMethodPieChart type={transactions.find(t => t.category === selectedHistoryCategory)?.type || TransactionType.EXPENSE} transactions={categoryFilteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
                          </div>
                          <TransactionList transactions={categoryFilteredTransactions} onDelete={handleDeleteTransaction} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
                      </div>
                   )}
                </div>
             )}
          </div>
        )}
      </main>

      <div className={`md:hidden fixed bottom-0 left-0 w-full border-t flex justify-around p-4 z-40 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl'}`}>
        <button onClick={() => { setActiveTab('dashboard'); setSelectedHistoryCategory(null); }} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}><LayoutDashboard/><span className="text-[10px] font-bold uppercase">Dashboard</span></button>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white rounded-full p-4 -mt-10 shadow-xl border-4 border-white dark:border-slate-900 transition-transform active:scale-90"><Plus size={28}/></button>
        <button onClick={() => { setActiveTab('history'); setSelectedHistoryCategory(null); }} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-500' : 'text-slate-400'}`}><CreditCard/><span className="text-[10px] font-bold uppercase">Movimenti</span></button>
      </div>

      <button onClick={() => setShowAddModal(true)} className="hidden md:flex fixed bottom-10 right-10 bg-blue-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-40"><Plus size={32}/></button>

      {showAddModal && <TransactionForm userId={currentUser.id} defaultCurrency={baseCurrency} language={language} onClose={() => setShowAddModal(false)} onAdd={handleAddTransaction} isDarkMode={isDarkMode} />}
      {showSettingsModal && <SettingsModal user={currentUser} onUpdate={handleUpdateProfile} onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
}

export default App;
