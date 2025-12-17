import React, { useState } from 'react';
import { User, Currency, Language } from '../types';
import { t } from '../utils/translations';
import { X, Check, Send, Lock } from 'lucide-react';

interface SettingsModalProps {
  user: User;
  onUpdate: (user: User) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, onUpdate, onClose }) => {
  const [currency, setCurrency] = useState<Currency>(user.preferences.currency);
  const [language, setLanguage] = useState<Language>(user.preferences.language);
  const [telegramChatId, setTelegramChatId] = useState<string>(user.telegramChatId || '');
  const [password, setPassword] = useState<string>(''); // For changing password

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedUser: User = {
        ...user,
        preferences: { currency, language },
        telegramChatId: telegramChatId.trim(),
        // Only update password if user typed something new
        password: password.trim() ? password.trim() : user.password
    };

    onUpdate(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold">{t('settings_title', language)}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('pref_language', language)}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['it', 'en', 'pl'] as Language[]).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    language === lang 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lang === 'it' && 'ITA'}
                  {lang === 'en' && 'ENG'}
                  {lang === 'pl' && 'POL'}
                  {language === lang && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('pref_currency', language)}</label>
            <p className="text-xs text-slate-500 mb-3">{t('pref_currency_desc', language)}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['EUR', 'USD', 'PLN'] as Currency[]).map(curr => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    currency === curr 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {curr}
                  {currency === curr && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Telegram Integration */}
          <div>
             <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-blue-500" />
                <label className="text-sm font-semibold text-slate-700">{t('telegram_title', language)}</label>
             </div>
             <p className="text-xs text-slate-500 mb-3">{t('telegram_desc', language)}</p>
             <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">{t('telegram_chat_id', language)}</label>
                <input 
                  type="text" 
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                  placeholder="123456789"
                />
             </div>
          </div>

          {/* Security */}
          <div>
             <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-slate-700" />
                <label className="text-sm font-semibold text-slate-700">{t('security_title', language)}</label>
             </div>
             <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">{t('new_password', language)}</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to keep current password.</p>
             </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
            >
              {t('cancel', language)}
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
            >
              {t('save', language)}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
