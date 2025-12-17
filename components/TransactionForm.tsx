
import React, { useState, useEffect } from 'react';
import { TransactionType, Currency, Language, PaymentMethod, Transaction } from '../types.ts';
import { CATEGORIES } from '../constants.ts';
import { parseTransactionText } from '../services/geminiService.ts';
import { Sparkles, Plus, Loader2, CreditCard, Banknote, AlertCircle, X } from 'lucide-react';
import { t } from '../utils/translations.ts';

interface TransactionFormProps {
  userId: string;
  defaultCurrency: Currency;
  language: Language;
  onAdd: (data: Transaction) => Promise<void>;
  onClose: () => void;
  isDarkMode: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ userId, defaultCurrency, language, onAdd, onClose, isDarkMode }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  
  const [magicInput, setMagicInput] = useState<string>('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  const handleMagicFill = async () => {
    if (!magicInput.trim()) return;
    setIsMagicLoading(true);
    setMagicError(null);
    try {
      const result = await parseTransactionText(magicInput, language);
      if (result) {
        if (result.amount) setAmount(result.amount.toString());
        if (result.category) setCategory(result.category);
        if (result.description) setDescription(result.description);
        if (result.type) setType(result.type as TransactionType);
        if (result.currency) setCurrency(result.currency as Currency);
        if (result.paymentMethod) {
            const m = result.paymentMethod.toUpperCase();
            setPaymentMethod(m === 'CASH' ? 'CASH' : 'CARD');
        }
      } else {
        setMagicError("AI non ha capito. Prova a specificare meglio.");
      }
    } catch (e) {
      setMagicError("Errore di connessione AI.");
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || isSubmitting) return;

    setIsSubmitting(true);
    
    // Creiamo l'oggetto transazione assicurandoci che paymentMethod sia corretto
    const finalTransaction: Transaction = {
      id: crypto.randomUUID(),
      userId,
      date: new Date(date).toISOString(),
      amount: parseFloat(amount),
      currency,
      category,
      description: description || '',
      type,
      paymentMethod: paymentMethod // Questo DEVE essere 'CASH' se selezionato
    };

    console.log("FORM SUBMIT -> Method:", finalTransaction.paymentMethod);

    try {
      await onAdd(finalTransaction);
      onClose();
    } catch (err) {
      console.error("Error adding transaction from form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = `w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 placeholder-slate-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className={`rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`p-6 flex justify-between items-center ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
          <h2 className="text-xl font-black uppercase tracking-tight">{t('new_transaction', language)}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          
          <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-indigo-900/10 border-indigo-800/50' : 'bg-indigo-50 border-indigo-100'}`}>
            <label className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t('ai_smart_fill', language)}
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={magicInput}
                onChange={(e) => setMagicInput(e.target.value)}
                placeholder={t('ai_placeholder', language)}
                className={`flex-1 text-sm p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-indigo-200'}`}
              />
              <button 
                type="button"
                onClick={handleMagicFill}
                disabled={isMagicLoading || !magicInput}
                className="bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                {isMagicLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className={`flex p-1.5 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button
                type="button"
                className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${type === TransactionType.EXPENSE ? (isDarkMode ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-red-600 shadow-sm') : 'text-slate-500'}`}
                onClick={() => setType(TransactionType.EXPENSE)}
              >
                {t('type_expense', language).toUpperCase()}
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${type === TransactionType.INCOME ? (isDarkMode ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-emerald-600 shadow-sm') : 'text-slate-500'}`}
                onClick={() => setType(TransactionType.INCOME)}
              >
                {t('type_income', language).toUpperCase()}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{t('amount', language)}</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                 <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{t('currency', language)}</label>
                 <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={inputClass}>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="PLN">PLN (zł)</option>
                 </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{t('date', language)}</label>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{t('payment_method', language)}</label>
                    <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setPaymentMethod('CARD')} 
                          className={`flex-1 py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'CARD' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : (isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-400')}`}
                        >
                            <CreditCard size={18} />
                            <span className="text-[10px] font-black tracking-tighter">{t('card', language).toUpperCase()}</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setPaymentMethod('CASH')} 
                          className={`flex-1 py-3 px-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : (isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-400')}`}
                        >
                            <Banknote size={18} />
                            <span className="text-[10px] font-black tracking-tighter">{t('cash', language).toUpperCase()}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{t('category', language)}</label>
              <select required value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>
                <option value="" disabled>-- Seleziona --</option>
                {(type === TransactionType.EXPENSE ? CATEGORIES.EXPENSE : CATEGORIES.INCOME).map(c => (
                  <option key={c} value={c}>{t(c, language)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">{t('description', language)}</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="Aggiungi una nota..." />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all flex justify-center items-center gap-3 mt-4 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> {t('add_btn', language).toUpperCase()}</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
