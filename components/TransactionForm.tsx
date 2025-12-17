import React, { useState, useEffect } from 'react';
import { TransactionType, Currency, Language } from '../types';
import { CATEGORIES } from '../constants';
import { parseTransactionText } from '../services/geminiService';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { t } from '../utils/translations';

interface TransactionFormProps {
  userId: string;
  defaultCurrency: Currency;
  language: Language;
  onAdd: (data: any) => void;
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
  
  const [magicInput, setMagicInput] = useState<string>('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  const handleMagicFill = async () => {
    if (!magicInput.trim()) return;
    setIsMagicLoading(true);
    try {
      const result = await parseTransactionText(magicInput, language);
      if (result) {
        if (result.amount) setAmount(result.amount.toString());
        if (result.category) setCategory(result.category);
        if (result.description) setDescription(result.description);
        if (result.type) setType(result.type as TransactionType);
        if (result.currency) setCurrency(result.currency as Currency);
      }
    } catch (e) {
      alert("AI Error: Could not parse text.");
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    onAdd({
      id: crypto.randomUUID(),
      userId,
      date: new Date(date).toISOString(),
      amount: parseFloat(amount),
      currency,
      category,
      description,
      type
    });
    onClose();
  };

  const inputClass = `w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 placeholder-slate-400'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`p-6 flex justify-between items-center ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>
          <h2 className="text-xl font-bold">{t('new_transaction', language)}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* AI Magic Section */}
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-100'}`}>
            <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-2 block flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {t('ai_smart_fill', language)}
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={magicInput}
                onChange={(e) => setMagicInput(e.target.value)}
                placeholder={t('ai_placeholder', language)}
                className={`flex-1 text-sm p-2 border rounded-lg focus:outline-none focus:border-indigo-500 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-indigo-200 placeholder-slate-400'}`}
              />
              <button 
                onClick={handleMagicFill}
                disabled={isMagicLoading || !magicInput}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isMagicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === TransactionType.EXPENSE ? (isDarkMode ? 'bg-slate-700 text-red-400' : 'bg-white text-red-600 shadow-sm') : 'text-slate-500'}`}
                onClick={() => setType(TransactionType.EXPENSE)}
              >
                {t('type_expense', language)}
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === TransactionType.INCOME ? (isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm') : 'text-slate-500'}`}
                onClick={() => setType(TransactionType.INCOME)}
              >
                {t('type_income', language)}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs text-slate-500 font-medium mb-1">{t('amount', language)}</label>
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
              <div className="col-span-1">
                 <label className="block text-xs text-slate-500 font-medium mb-1">{t('currency', language)}</label>
                 <select
                   value={currency}
                   onChange={e => setCurrency(e.target.value as Currency)}
                   className={inputClass}
                 >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="PLN">PLN (zł)</option>
                 </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1">{t('date', language)}</label>
              <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={inputClass}
                />
            </div>

            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1">{t('category', language)}</label>
              <select 
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>-- Select --</option>
                {(type === TransactionType.EXPENSE ? CATEGORIES.EXPENSE : CATEGORIES.INCOME).map(c => (
                  <option key={c} value={c}>{t(c, language)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1">{t('description', language)}</label>
              <input 
                type="text" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={inputClass}
                placeholder="..."
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex justify-center items-center gap-2 mt-4"
            >
              <Plus className="w-5 h-5" /> {t('add_btn', language)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
