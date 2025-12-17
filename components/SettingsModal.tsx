
import React, { useState } from 'react';
import { User, Currency, Language } from '../types';
import { t } from '../utils/translations';
import { X, Check, Send, Lock, User as UserIcon, Image as ImageIcon, Settings } from 'lucide-react';

interface SettingsModalProps {
  user: User;
  onUpdate: (user: User) => void;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ user, onUpdate, onClose }) => {
  const [currency, setCurrency] = useState<Currency>(user.preferences.currency);
  const [language, setLanguage] = useState<Language>(user.preferences.language);
  const [telegramChatId, setTelegramChatId] = useState<string>(user.telegramChatId || '');
  const [password, setPassword] = useState<string>('');
  const [avatar, setAvatar] = useState<string>(user.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedUser: User = {
        ...user,
        avatar: customAvatarUrl.trim() || avatar,
        preferences: { currency, language },
        telegramChatId: telegramChatId.trim(),
        password: password.trim() ? password.trim() : user.password
    };

    onUpdate(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5" /> {t('settings_title', language)}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
               <UserIcon className="w-4 h-4 text-blue-500" /> Foto Profilo
            </label>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {AVATAR_PRESETS.map(url => (
                <button
                  key={url}
                  type="button"
                  onClick={() => { setAvatar(url); setCustomAvatarUrl(''); }}
                  className={`relative p-1 rounded-2xl border-2 transition-all ${
                    avatar === url && !customAvatarUrl ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-transparent'
                  }`}
                >
                  <img src={url} className="w-full aspect-square rounded-xl bg-slate-100 dark:bg-slate-800" alt="Preset" />
                  {avatar === url && !customAvatarUrl && <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-lg"><Check size={10}/></div>}
                </button>
              ))}
            </div>
            <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <ImageIcon className="h-4 w-4 text-slate-400" />
               </div>
               <input 
                 type="text" 
                 placeholder="O inserisci URL immagine personalizzata..."
                 value={customAvatarUrl}
                 onChange={e => setCustomAvatarUrl(e.target.value)}
                 className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all text-slate-700 dark:text-slate-300"
               />
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-3">{t('pref_language', language)}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['it', 'en', 'pl'] as Language[]).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    language === lang 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {lang.toUpperCase()}
                  {language === lang && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-1">{t('pref_currency', language)}</label>
            <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-wider">{t('pref_currency_desc', language)}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['EUR', 'USD', 'PLN'] as Currency[]).map(curr => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    currency === curr 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {curr}
                  {currency === curr && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Telegram Integration */}
          <div>
             <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-blue-500" />
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{t('telegram_title', language)}</label>
             </div>
             <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{t('telegram_desc', language)}</p>
             <div>
                <input 
                  type="text" 
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm dark:text-slate-300"
                  placeholder="123456789"
                />
             </div>
          </div>

          {/* Security */}
          <div>
             <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-slate-700 dark:text-slate-400" />
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{t('security_title', language)}</label>
             </div>
             <div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-300"
                  placeholder="Nuova Password..."
                />
                <p className="text-[10px] text-slate-400 mt-2 italic">Lascia vuoto per mantenere quella attuale.</p>
             </div>
          </div>

          <div className="flex gap-3 pt-6 border-t dark:border-slate-800">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
            >
              {t('cancel', language).toUpperCase()}
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30"
            >
              {t('save', language).toUpperCase()}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
