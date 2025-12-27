
import React, { useMemo } from 'react';
import { Transaction, TransactionType, Currency, Language } from '../types';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { 
  ArrowDownLeft, ArrowUpRight, Trash2, ShoppingBag, Home, Car, Coffee, 
  Heart, Utensils, ShoppingCart, DollarSign, Briefcase, Calendar
} from 'lucide-react';
import { convertCurrency, formatCurrency } from '../utils/currency';
import { t } from '../utils/translations';

interface TransactionListProps {
    transactions: Transaction[];
    baseCurrency: Currency;
    language: Language;
    onDelete: (id: string) => void;
    isDarkMode: boolean;
    groupByMonth?: boolean;
}

const getLocale = (lang: Language) => {
  switch (lang) {
    case 'en': return enUS;
    case 'pl': return enUS; 
    default: return it;
  }
};

const getIcon = (category: string) => {
  const key = category; 
  switch (key.toLowerCase()) {
    case 'alimentari': case 'food': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
    case 'casa': case 'housing': return <Home className="w-5 h-5 text-blue-500" />;
    case 'trasporti': case 'transport': return <Car className="w-5 h-5 text-indigo-500" />;
    case 'svago': case 'entertainment': return <Coffee className="w-5 h-5 text-purple-500" />;
    case 'salute': case 'health': return <Heart className="w-5 h-5 text-red-500" />;
    case 'ristoranti': case 'restaurants': return <Utensils className="w-5 h-5 text-yellow-500" />;
    case 'shopping': return <ShoppingCart className="w-5 h-5 text-pink-500" />;
    case 'stipendio': case 'salary': return <DollarSign className="w-5 h-5 text-emerald-500" />;
    case 'freelance': return <Briefcase className="w-5 h-5 text-teal-500" />;
    case 'mance': case 'tips': return <DollarSign className="w-5 h-5 text-amber-500" />;
    default: return <DollarSign className="w-5 h-5 text-slate-500" />;
  }
};

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, baseCurrency, language, onDelete, isDarkMode, groupByMonth = false }) => {
  
  const groupedTransactions = useMemo(() => {
    if (!groupByMonth) return null;

    const groups: Record<string, { transactions: Transaction[], income: number, expense: number }> = {};
    const locale = getLocale(language);

    transactions.forEach(tr => {
      const date = new Date(tr.date);
      const key = format(date, 'MMMM yyyy', { locale }); // Es: "Ottobre 2023"
      
      if (!groups[key]) {
        groups[key] = { transactions: [], income: 0, expense: 0 };
      }

      groups[key].transactions.push(tr);
      
      const val = convertCurrency(tr.amount, tr.currency, baseCurrency);
      if (tr.type === TransactionType.INCOME) groups[key].income += val;
      else groups[key].expense += val;
    });

    return groups;
  }, [transactions, groupByMonth, language, baseCurrency]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        {t('no_data', language)}
      </div>
    );
  }

  const renderTransaction = (tr: Transaction) => {
    const converted = convertCurrency(tr.amount, tr.currency, baseCurrency);
    const isDifferentCurrency = tr.currency !== baseCurrency;
    const isIncome = tr.type === TransactionType.INCOME;

    return (
      <div key={tr.id} className={`group p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all mb-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-100 hover:shadow-md'}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            {getIcon(tr.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
                <p className={`font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t(tr.category, language)}</p>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 truncate">
              <span className="capitalize flex-shrink-0">
                {format(new Date(tr.date), 'EEE d MMM', { locale: getLocale(language) })}
              </span>
              {tr.description && <span className="text-slate-400 truncate opacity-80">• {tr.description}</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <div className="text-right">
            <div className={`flex items-center gap-1 justify-end font-bold text-sm md:text-base ${isIncome ? 'text-emerald-500' : 'text-red-500'}`}>
              {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
              {isIncome ? '+' : '-'}{formatCurrency(tr.amount, tr.currency)}
            </div>

            {isDifferentCurrency && (
                <div className="text-[10px] text-slate-500 font-medium">
                  ≈ {formatCurrency(converted, baseCurrency)}
                </div>
            )}
          </div>
          
          <button 
            onClick={() => onDelete(tr.id)} 
            className={`text-slate-400 hover:text-red-500 p-2 rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (groupByMonth && groupedTransactions) {
    return (
      <div className="space-y-8">
        {(Object.entries(groupedTransactions) as [string, { transactions: Transaction[], income: number, expense: number }][]).map(([month, data]) => (
          <div key={month} className="animate-fade-in">
            <div className={`flex items-center justify-between mb-4 pb-2 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className={`text-lg font-bold capitalize ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{month}</h3>
              </div>
              <div className="flex gap-4 text-xs md:text-sm font-medium">
                <span className="text-emerald-500">+{formatCurrency(data.income, baseCurrency)}</span>
                <span className="text-red-500">-{formatCurrency(data.expense, baseCurrency)}</span>
              </div>
            </div>
            <div>
              {data.transactions.map(renderTransaction)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="space-y-3">{transactions.map(renderTransaction)}</div>;
};
