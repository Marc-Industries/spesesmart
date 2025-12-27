
import { Language } from '../types';

type Translations = Record<string, Record<Language, string>>;

export const TRANSLATIONS: Translations = {
  // General
  dashboard: { it: 'Dashboard', en: 'Dashboard', pl: 'Pulpit' },
  history: { it: 'Movimenti', en: 'History', pl: 'Historia' },
  settings: { it: 'Impostazioni', en: 'Settings', pl: 'Ustawienia' },
  logout: { it: 'Esci', en: 'Logout', pl: 'Wyloguj' },
  add: { it: 'Aggiungi', en: 'Add', pl: 'Dodaj' },
  loading: { it: 'Caricamento...', en: 'Loading...', pl: 'Ładowanie...' },
  back: { it: 'Indietro', en: 'Back', pl: 'Wstecz' },
  theme_dark: { it: 'Tema Scuro', en: 'Dark Mode', pl: 'Tryb Ciemny' },
  theme_light: { it: 'Tema Chiaro', en: 'Light Mode', pl: 'Tryb Jasny' },
  
  // Login
  login_title: { it: 'Accedi', en: 'Login', pl: 'Zaloguj się' },
  login_subtitle: { it: 'Seleziona il tuo profilo', en: 'Select your profile', pl: 'Wybierz swój profil' },
  password_placeholder: { it: 'Inserisci password...', en: 'Enter password...', pl: 'Wpisz hasło...' },
  login_btn: { it: 'Entra', en: 'Enter', pl: 'Wejdź' },
  wrong_password: { it: 'Password errata', en: 'Wrong password', pl: 'Błędne hasło' },
  select_language: { it: 'Seleziona Lingua', en: 'Select Language', pl: 'Wybierz Język' },

  // Stats
  balance: { it: 'Saldo Totale', en: 'Total Balance', pl: 'Saldo Całkowite' },
  income: { it: 'Entrate', en: 'Income', pl: 'Przychody' },
  expense: { it: 'Uscite', en: 'Expenses', pl: 'Wydatki' },
  monthly: { it: '(Mensili)', en: '(Monthly)', pl: '(Miesięczne)' },

  // Charts
  chart_balance: { it: 'Andamento Finanziario', en: 'Financial Trend', pl: 'Trend Finansowy' },
  chart_pie: { it: 'Ripartizione Spese', en: 'Expense Distribution', pl: 'Rozkład Wydatków' },
  chart_pie_income: { it: 'Fonti di Entrata', en: 'Income Sources', pl: 'Źródła Dochodów' },
  chart_categories: { it: 'Top Categorie', en: 'Top Categories', pl: 'Główne Kategorie' },
  chart_payment_expense: { it: 'Spese: Contanti vs Carta', en: 'Expenses: Cash vs Card', pl: 'Wydatki: Gotówka vs Karta' },
  chart_payment_income: { it: 'Entrate: Contanti vs Carta', en: 'Income: Cash vs Card', pl: 'Przychody: Gotówka vs Karta' },
  no_data: { it: 'Nessun dato disponibile', en: 'No data available', pl: 'Brak danych' },

  // Transactions
  recent_transactions: { it: 'Transazioni Recenti', en: 'Recent Transactions', pl: 'Ostatnie Transakcje' },
  view_all: { it: 'Vedi tutte', en: 'View all', pl: 'Zobacz wszystkie' },
  new_transaction: { it: 'Nuova Transazione', en: 'New Transaction', pl: 'Nowa Transakcja' },
  amount: { it: 'Importo', en: 'Amount', pl: 'Kwota' },
  date: { it: 'Data', en: 'Date', pl: 'Data' },
  category: { it: 'Categoria', en: 'Category', pl: 'Kategoria' },
  description: { it: 'Descrizione', en: 'Description', pl: 'Opis' },
  currency: { it: 'Valuta', en: 'Currency', pl: 'Waluta' },
  type_income: { it: 'Entrata', en: 'Income', pl: 'Przychód' },
  type_expense: { it: 'Uscita', en: 'Expense', pl: 'Wydatek' },
  add_btn: { it: 'Aggiungi Transazione', en: 'Add Transaction', pl: 'Dodaj Transakcję' },
  payment_method: { it: 'Metodo', en: 'Method', pl: 'Metoda' },
  cash: { it: 'Contanti', en: 'Cash', pl: 'Gotówka' },
  card: { it: 'Carta', en: 'Card', pl: 'Karta' },
  subscriptions: { it: 'Abbonamenti', en: 'Subscriptions', pl: 'Subskrypcje' },

  // Categories (Mapping existing DB keys to translations)
  'Alimentari': { it: 'Alimentari', en: 'Groceries', pl: 'Żywność' },
  'Casa': { it: 'Casa', en: 'Housing', pl: 'Dom' },
  'Trasporti': { it: 'Trasporti', en: 'Transport', pl: 'Transport' },
  'Svago': { it: 'Svago', en: 'Entertainment', pl: 'Rozrywka' },
  'Salute': { it: 'Salute', en: 'Health', pl: 'Zdrowie' },
  'Ristoranti': { it: 'Ristoranti', en: 'Restaurants', pl: 'Restauracje' },
  'Shopping': { it: 'Shopping', en: 'Shopping', pl: 'Zakupy' },
  'Altro': { it: 'Altro', en: 'Other', pl: 'Inne' },
  'Stipendio': { it: 'Stipendio', en: 'Salary', pl: 'Wypłata' },
  'Freelance': { it: 'Freelance', en: 'Freelance', pl: 'Freelance' },
  'Investimenti': { it: 'Investimenti', en: 'Investments', pl: 'Inwestycje' },
  'Regali': { it: 'Regali', en: 'Gifts', pl: 'Prezenty' },
  'Rimborsi': { it: 'Rimborsi', en: 'Refunds', pl: 'Zwroty' },
  'Mance': { it: 'Mance', en: 'Tips', pl: 'Napiwki' },

  // AI
  ai_smart_fill: { it: 'AI Smart Fill', en: 'AI Smart Fill', pl: 'Inteligentne Wypełnianie AI' },
  ai_placeholder: { it: 'Es: "4,10 euro colazione"', en: 'Ex: "4.10 euro breakfast"', pl: 'Np: "4,10 euro śniadanie"' },
  ai_analyze: { it: 'Genera Analisi AI', en: 'Generate AI Analysis', pl: 'Generuj Analizę AI' },
  analyzing: { it: 'Analisi in corso...', en: 'Analyzing...', pl: 'Analizowanie...' },

  // Settings Modal
  settings_title: { it: 'Impostazioni Account', en: 'Account Settings', pl: 'Ustawienia Konta' },
  pref_language: { it: 'Lingua Interfaccia', en: 'Interface Language', pl: 'Język Interfejsu' },
  pref_currency: { it: 'Valuta Principale', en: 'Base Currency', pl: 'Waluta Podstawowa' },
  pref_currency_desc: { 
    it: 'Tutte le spese verranno convertite in questa valuta nella dashboard.', 
    en: 'All expenses will be converted to this currency on the dashboard.', 
    pl: 'Wszystkie wydatki zostaną przeliczone na tę walutę na pulpicie.' 
  },
  
  // Security & Telegram
  security_title: { it: 'Sicurezza', en: 'Security', pl: 'Bezpieczeństwo' },
  new_password: { it: 'Nuova Password', en: 'New Password', pl: 'Nowe Hasło' },
  telegram_title: { it: 'Integrazione Telegram', en: 'Telegram Integration', pl: 'Integracja z Telegramem' },
  telegram_desc: { 
    it: 'Inserisci il Chat ID per collegare il Bot. Scrivi al bot per gestire le spese.', 
    en: 'Enter Chat ID to connect the Bot. Message the bot to manage expenses.', 
    pl: 'Wpisz ID czatu, aby połączyć bota. Napisz do bota, aby zarządzać wydatkami.' 
  },
  telegram_chat_id: { it: 'Telegram Chat ID', en: 'Telegram Chat ID', pl: 'ID Czatu Telegram' },
  
  // Telegram Menu
  tg_btn_report: { it: '📊 Resoconto', en: '📊 Report', pl: '📊 Raport' },
  tg_btn_add: { it: '📝 Aggiungi', en: '📝 Add', pl: '📝 Dodaj' },
  tg_btn_info: { it: 'ℹ️ Info', en: 'ℹ️ Info', pl: 'ℹ️ Info' },

  save: { it: 'Salva', en: 'Save', pl: 'Zapisz' },
  cancel: { it: 'Annulla', en: 'Cancel', pl: 'Anuluj' },
};

export const t = (key: string, lang: Language): string => {
  return TRANSLATIONS[key]?.[lang] || key;
};
