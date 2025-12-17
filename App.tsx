
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Plus, LayoutDashboard, CreditCard, Wallet, TrendingUp, TrendingDown,
  BrainCircuit, X, Settings, ArrowLeft, Sun, Moon, Calendar
} from 'lucide-react';
import { Transaction, User, TransactionType, Language, Period } from './types';
import { MOCK_USERS } from './constants';
import { getTransactions, addTransaction, deleteTransaction, getUserProfile, updateUserProfile } from './services/dataService';
import { analyzeFinances } from './services/geminiService';
import { ExpensePieChart, IncomePieChart, BalanceTrendChart, CategoryBarChart, PaymentMethodPieChart } from './components/Charts';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { SettingsModal } from './components/SettingsModal';
import { convertCurrency, formatCurrency } from './utils/currency';
import { t } from './utils/translations';
import ReactMarkdown from 'react-markdown';
import { isSameDay, isSameWeek, isSameMonth, startOfWeek } from 'date-fns';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(Period.MONTHLY);

  // Theme & Login UI State
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [uiLanguage, setUiLanguage] = useState<Language>('it');

  // Login State
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

  useEffect(() => {
    let interval: number;
    if (currentUser) {
      loadData(currentUser.id); 
      interval = window.setInterval(() => {
        loadData(currentUser.id, true); 
      }, 10000); 
    }
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadData = async (userId: string, silent = false) => {
    if (!silent) setIsLoadingData(true);
    const data = await getTransactions(userId);
    setTransactions(data);
    if (!silent) setIsLoadingData(false);
  };

  // --- FILTER LOGIC ---
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      switch (selectedPeriod) {
        case Period.DAILY:
          return isSameDay(tDate, now);
        case Period.WEEKLY:
          return isSameWeek(tDate, now, { weekStartsOn: 1 }); // Monday start
        case Period.MONTHLY:
          return isSameMonth(tDate, now);
        case Period.ALL:
        default:
          return true;
      }
    });
  }, [transactions, selectedPeriod]);

  // --- STATS ---
  const stats = useMemo(() => {
    if (!currentUser) return { income: 0, expense: 0, balance: 0, filteredIncome: 0, filteredExpense: 0 };
    const base = currentUser.preferences.currency;
    
    // Total Balance (Always ALL time)
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + convertCurrency(t.amount, t.currency, base), 0);
    
    // Period Stats (Based on Filter)
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


  // --- AUTH HANDLERS ---
  const handleUserSelect = async (mockUser: User) => {
    try {
        const dbUser = await getUserProfile(mockUser.id);
        const userToLogin = dbUser || mockUser;
        setSelectedLoginUser(userToLogin);
        setLoginStep('password');
        setLoginError(false);
        setPasswordInput('');
    } catch (e) {
        setSelectedLoginUser(mockUser);
        setLoginStep('password');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLoginUser && passwordInput === selectedLoginUser.password) {
      localStorage.setItem('spese_smart_current_user', selectedLoginUser.id);
      setCurrentUser(selectedLoginUser);
      setUiLanguage(selectedLoginUser.preferences.language);
      setLoginStep('select_user');
      setSelectedLoginUser(null);
      setPasswordInput('');
    } else {
      setLoginError(true);
    }
  };

  const handleBackToUserSelect = () => {
    setLoginStep('select_user');
    setSelectedLoginUser(null);
    setLoginError(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('spese_smart_current_user');
    setCurrentUser(null);
    setTransactions([]);
    setAiAnalysis(null);
    setLoginStep('select_user');
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    if (!currentUser) return;
    setCurrentUser(updatedUser);
    await updateUserProfile(updatedUser);
  };

  const handleAddTransaction = async (t: Transaction) => {
    await addTransaction(t);
    loadData(currentUser!.id, true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm("Sei sicuro?")) {
      await deleteTransaction(id);
      loadData(currentUser!.id, true);
    }
  };

  const handleAnalyze = async () => {
    if (!currentUser) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeFinances(transactions, currentUser.preferences.language, currentUser.preferences.currency);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- RENDER LOGIN ---
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className={`p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
          <div className="flex justify-between items-center mb-6">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
               {isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
             </button>
             <div className="flex gap-2">
               {(['it', 'en', 'pl'] as Language[]).map(l => (
                  <button key={l} onClick={() => setUiLanguage(l)} className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${uiLanguage === l ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{l}</button>
               ))}
             </div>
          </div>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">SpeseSmart AI</h1>
          {loginStep === 'select_user' ? (
            <>
              <p className={`mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('login_subtitle', uiLanguage)}</p>
              <div className="space-y-3">
                {MOCK_USERS.map(user => (
                  <button key={user.id} onClick={() => handleUserSelect(user)} className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all group ${isDarkMode ? 'border-slate-700 hover:bg-slate-700 hover:border-blue-500' : 'border-slate-200 hover:bg-blue-50 hover:border-blue-500'}`}>
                    <img src={user.avatar} alt={user.name} className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-slate-100'}`} />
                    <div className="text-left">
                        <div className={`font-semibold group-hover:text-blue-500 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{user.name}</div>
                        <div className="text-xs text-slate-400">{t('login_btn', uiLanguage)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-start mb-6">
                <button onClick={handleBackToUserSelect} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4" /> {t('back', uiLanguage)}</button>
              </div>
              <div className="mb-6 flex flex-col items-center">
                 <img src={selectedLoginUser?.avatar} className={`w-20 h-20 rounded-full mb-3 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                 <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{selectedLoginUser?.name}</h2>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                 <div>
                   <input type="password" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className={`w-full p-3 border rounded-xl outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-blue-500'} ${loginError ? 'border-red-500' : ''}`} placeholder={t('password_placeholder', uiLanguage)}/>
                   {loginError && <p className="text-red-500 text-xs mt-1 text-left">{t('wrong_password', uiLanguage)}</p>}
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">{t('login_btn', uiLanguage)}</button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  const { currency: baseCurrency, language } = currentUser.preferences;

  return (
    <div className={`min-h-screen pb-20 md:pb-0 flex transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR */}
      <aside className={`hidden md:flex flex-col w-64 border-r h-screen fixed top-0 left-0 z-10 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="p-6 flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Wallet className="text-white w-6 h-6" /></div>
          <span className={`font-bold text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>SpeseSmart</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:bg-slate-700/50'}`}>
            <LayoutDashboard className="w-5 h-5" /> {t('dashboard', language)}
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'history' ? 'bg-blue-600/10 text-blue-600' : 'text-slate-500 hover:bg-slate-700/50'}`}>
            <CreditCard className="w-5 h-5" /> {t('history', language)}
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-slate-500 hover:bg-slate-700/50">
            <Settings className="w-5 h-5" /> {t('settings', language)}
          </button>
        </nav>
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
           <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-semibold text-slate-500">THEME</span>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-400'}`}>{isDarkMode ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}</button>
           </div>
           <div className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <img src={currentUser.avatar} className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-slate-100'}`} />
            <div className="flex-1 overflow-hidden">
              <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{currentUser.name}</p>
              <p className="text-xs text-slate-400">{language.toUpperCase()} • {baseCurrency}</p>
            </div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-500 text-sm py-2"><LogOut className="w-4 h-4" /> {t('logout', language)}</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* HEADER MOBILE */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Wallet className="text-white w-4 h-4" /></div>
            <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>SpeseSmart</span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-slate-200 text-slate-600'}`}>{isDarkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
             <button onClick={() => setShowSettingsModal(true)} className={`p-2 rounded-full border relative ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                <Settings className="w-5 h-5" />
                {currentUser.telegramChatId && <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>}
             </button>
             <img src={currentUser.avatar} onClick={handleLogout} className={`w-10 h-10 rounded-full border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-100'}`} />
          </div>
        </div>

        {isLoadingData && <div className="fixed top-0 left-0 w-full h-1 bg-blue-900/20 overflow-hidden z-50"><div className="h-full bg-blue-600 animate-pulse w-full origin-left"></div></div>}

        {/* PERIOD FILTER */}
        {activeTab === 'dashboard' && (
          <div className="mb-6 flex overflow-x-auto gap-2 pb-2 md:pb-0 no-scrollbar">
             {[Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.ALL].map(p => (
               <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${selectedPeriod === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200')}`}
               >
                  <Calendar className="w-4 h-4" />
                  {p === Period.DAILY && (language === 'it' ? 'Oggi' : 'Today')}
                  {p === Period.WEEKLY && (language === 'it' ? 'Questa Settimana' : 'This Week')}
                  {p === Period.MONTHLY && (language === 'it' ? 'Questo Mese' : 'This Month')}
                  {p === Period.ALL && (language === 'it' ? 'Tutto' : 'All Time')}
               </button>
             ))}
          </div>
        )}

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/10 relative overflow-hidden border border-slate-700">
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-medium mb-1">{t('balance', language)}</p>
              <h2 className="text-3xl font-bold">{formatCurrency(stats.balance, baseCurrency)}</h2>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
          </div>

          <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">{t('income', language)}</p>
              <h2 className="text-2xl font-bold text-emerald-500">+{formatCurrency(stats.filteredIncome, baseCurrency)}</h2>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-emerald-500 ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}><TrendingUp className="w-6 h-6" /></div>
          </div>

          <div className={`p-6 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">{t('expense', language)}</p>
              <h2 className="text-2xl font-bold text-red-500">-{formatCurrency(stats.filteredExpense, baseCurrency)}</h2>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-red-500 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-100'}`}><TrendingDown className="w-6 h-6" /></div>
          </div>
        </div>

        {/* AI INSIGHT */}
        <div className="mb-6">
          {!aiAnalysis ? (
            <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              {isAnalyzing ? t('analyzing', language) : <><BrainCircuit className="w-5 h-5" /> {t('ai_analyze', language)}</>}
            </button>
          ) : (
            <div className={`p-6 rounded-2xl border relative animate-fade-in ${isDarkMode ? 'bg-indigo-900/20 border-indigo-800' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'}`}>
              <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              <div className="flex items-start gap-3">
                 <div className={`p-2 rounded-lg shadow-sm text-indigo-500 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}><BrainCircuit className="w-6 h-6" /></div>
                 <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert text-slate-300' : 'text-slate-700'}`}>
                   <h3 className={`font-bold m-0 mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-800'}`}>Financial Coach Insight</h3>
                   <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTENT */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BalanceTrendChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
              <div className="grid grid-cols-1 gap-6">
                <ExpensePieChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
                <IncomePieChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* NEW: Payment Methods Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <PaymentMethodPieChart type={TransactionType.EXPENSE} transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
                 <PaymentMethodPieChart type={TransactionType.INCOME} transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <CategoryBarChart transactions={filteredTransactions} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t('recent_transactions', language)}</h3>
                <button onClick={() => setActiveTab('history')} className="text-sm text-blue-500 font-medium hover:underline">{t('view_all', language)}</button>
              </div>
              <TransactionList transactions={filteredTransactions.slice(0, 5)} onDelete={handleDeleteTransaction} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
             <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t('history', language)}</h3>
             <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} baseCurrency={baseCurrency} language={language} isDarkMode={isDarkMode} />
          </div>
        )}
      </main>

      {/* MOBILE NAV & FAB */}
      <div className={`md:hidden fixed bottom-0 left-0 w-full border-t flex justify-around p-3 z-40 pb-safe transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-medium">{t('dashboard', language)}</span>
        </button>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white rounded-full p-4 -mt-8 shadow-lg shadow-blue-600/30"><Plus className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-500' : 'text-slate-400'}`}>
          <CreditCard className="w-6 h-6" />
          <span className="text-[10px] font-medium">{t('history', language)}</span>
        </button>
      </div>
      <button onClick={() => setShowAddModal(true)} className="hidden md:flex fixed bottom-10 right-10 bg-blue-600 text-white p-4 rounded-full shadow-2xl shadow-blue-600/40 hover:scale-105 transition-transform z-40 items-center gap-2 pr-6">
        <Plus className="w-6 h-6" /> <span className="font-bold">{t('add', language)}</span>
      </button>

      {/* MODALS */}
      {showAddModal && <TransactionForm userId={currentUser.id} defaultCurrency={baseCurrency} language={language} onClose={() => setShowAddModal(false)} onAdd={handleAddTransaction} isDarkMode={isDarkMode} />}
      {showSettingsModal && <SettingsModal user={currentUser} onUpdate={handleUpdateProfile} onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
}

export default App;
