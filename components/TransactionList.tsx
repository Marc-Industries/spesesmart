
import React from 'react';
import { Transaction, TransactionType, Currency, Language } from '../types';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { 
  ArrowDownLeft, ArrowUpRight, Trash2, ShoppingBag, Home, Car, Coffee, 
  Heart, Utensils, ShoppingCart, DollarSign, Briefcase, CreditCard, Banknote
} from 'lucide-react';
import { convertCurrency, formatCurrency } from '../utils/currency';
import { t } from '../utils/translations';

interface TransactionListProps {
    transactions: Transaction[];
    baseCurrency: Currency;
    language: Language;
    onDelete: (id: string) => void;
    isDarkMode: boolean;
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

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, baseCurrency, language, onDelete, isDarkMode }) => {
  
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        {t('no_data', language)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map(tr => {
        const converted = convertCurrency(tr.amount, tr.currency, baseCurrency);
        const isDifferentCurrency = tr.currency !== baseCurrency;
        const isIncome = tr.type === TransactionType.INCOME;
        
        // Il metodo è garantito dalla sanificazione in dataService
        const isCash = tr.paymentMethod === 'CASH';

        return (
          <div key={tr.id} className={`group p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-100 hover:shadow-md'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                {getIcon(tr.category)}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                   <p className={`font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t(tr.category, language)}</p>
                   {/* Tag Metodo di Pagamento - Sempre visibile, mai ND */}
                   <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase transition-colors ${
                     isCash 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                      : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                   }`}>
                      {isCash ? (
                        <><Banknote className="w-3 h-3" /> {t('cash', language)}</>
                      ) : (
                        <><CreditCard className="w-3 h-3" /> {t('card', language)}</>
                      )}
                   </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="whitespace-nowrap">{format(new Date(tr.date), 'dd MMM yyyy', { locale: getLocale(language) })}</span>
                  {tr.description && <span className="text-slate-400 truncate max-w-[120px] md:max-w-[200px]">• {tr.description}</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 ml-2">
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
                className={`text-slate-400 hover:text-red-500 p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                title="Elimina"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
