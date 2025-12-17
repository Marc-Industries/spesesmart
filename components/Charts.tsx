
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Transaction, TransactionType, ChartDataPoint, CategorySummary, Currency, Language } from '../types';
import { EXPENSE_COLORS, INCOME_COLORS } from '../constants';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { convertCurrency, formatCurrency } from '../utils/currency';
import { t } from '../utils/translations';

interface ChartsProps {
  transactions: Transaction[];
  baseCurrency: Currency;
  language: Language;
  isDarkMode: boolean;
}

const getLocale = (lang: Language) => {
  switch (lang) {
    case 'en': return enUS;
    case 'pl': return enUS; 
    default: return it;
  }
};

const CommonPieChart = ({ title, data, colors, baseCurrency, isDarkMode }: any) => {
    if (data.length === 0) {
        return (
          <div className={`h-80 flex flex-col items-center justify-center rounded-xl shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}>
            <span className="mb-2 text-sm font-medium">{title}</span>
            <span>Nessun dato</span>
          </div>
        );
      }
    
      return (
        <div className={`p-4 rounded-xl shadow-sm border h-80 flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>{title}</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke={isDarkMode ? '#1e293b' : '#fff'}
                >
                  {data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                    color: isDarkMode ? '#fff' : '#000',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                  formatter={(value: number) => formatCurrency(value, baseCurrency)} 
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
}

// --- CHART 1: EXPENSE PIE CHART ---
export const ExpensePieChart: React.FC<ChartsProps> = ({ transactions, baseCurrency, language, isDarkMode }) => {
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  
  const dataMap = expenses.reduce((acc, curr) => {
    const convertedAmount = convertCurrency(curr.amount, curr.currency, baseCurrency);
    acc[curr.category] = (acc[curr.category] || 0) + convertedAmount;
    return acc;
  }, {} as Record<string, number>);

  const data: CategorySummary[] = Object.entries(dataMap)
    .map(([name, value]) => ({
      name: t(name, language),
      value: value as number,
      color: '' // Handled by parent
    }))
    .sort((a, b) => b.value - a.value);

  return <CommonPieChart title={t('chart_pie', language)} data={data} colors={EXPENSE_COLORS} baseCurrency={baseCurrency} isDarkMode={isDarkMode} />;
};

// --- CHART 2: INCOME PIE CHART ---
export const IncomePieChart: React.FC<ChartsProps> = ({ transactions, baseCurrency, language, isDarkMode }) => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME);
    
    const dataMap = income.reduce((acc, curr) => {
      const convertedAmount = convertCurrency(curr.amount, curr.currency, baseCurrency);
      acc[curr.category] = (acc[curr.category] || 0) + convertedAmount;
      return acc;
    }, {} as Record<string, number>);
  
    const data: CategorySummary[] = Object.entries(dataMap)
      .map(([name, value]) => ({
        name: t(name, language),
        value: value as number,
        color: '' 
      }))
      .sort((a, b) => b.value - a.value);
  
    return <CommonPieChart title={t('chart_pie_income', language)} data={data} colors={INCOME_COLORS} baseCurrency={baseCurrency} isDarkMode={isDarkMode} />;
};

// --- CHART 3: BALANCE TREND ---
export const BalanceTrendChart: React.FC<ChartsProps> = ({ transactions, baseCurrency, language, isDarkMode }) => {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const locale = getLocale(language);

  // Aggregate by day
  const groupedData = sorted.reduce((acc, t) => {
    const dateKey = format(new Date(t.date), 'dd/MM', { locale });
    if (!acc[dateKey]) acc[dateKey] = { name: dateKey, income: 0, expense: 0, value: 0 };
    
    const convertedAmount = convertCurrency(t.amount, t.currency, baseCurrency);

    if (t.type === TransactionType.INCOME) acc[dateKey].income! += convertedAmount;
    else acc[dateKey].expense! += convertedAmount;
    
    return acc;
  }, {} as Record<string, ChartDataPoint>);

  const data = Object.values(groupedData).slice(-7); // Last 7 days

  if (data.length === 0) {
    return (
        <div className={`h-80 flex items-center justify-center rounded-xl shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}>
          {t('no_data', language)}
        </div>
      );
  }

  return (
    <div className={`p-4 rounded-xl shadow-sm border h-80 flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>{t('chart_balance', language)}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12}} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
              }}
              cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
              formatter={(value: number) => formatCurrency(value, baseCurrency)}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            <Bar dataKey="income" name={t('income', language)} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="expense" name={t('expense', language)} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- CHART 4: CATEGORY BREAKDOWN ---
export const CategoryBarChart: React.FC<ChartsProps> = ({ transactions, baseCurrency, language, isDarkMode }) => {
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
  
  const dataMap = expenses.reduce((acc, curr) => {
    const convertedAmount = convertCurrency(curr.amount, curr.currency, baseCurrency);
    acc[curr.category] = (acc[curr.category] || 0) + convertedAmount;
    return acc;
  }, {} as Record<string, number>);

  const data: CategorySummary[] = Object.entries(dataMap)
    .map(([name, value], index) => ({
      name: t(name, language), 
      value: value as number,
      color: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5

  if (data.length === 0) return null;

  return (
    <div className={`p-4 rounded-xl shadow-sm border h-80 flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>{t('chart_categories', language)}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
            <XAxis type="number" hide />
            <YAxis 
                dataKey="name" 
                type="category" 
                width={80}
                axisLine={false} 
                tickLine={false} 
                tick={{fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500}} 
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                backgroundColor: isDarkMode ? '#0f172a' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
              }}
              cursor={{fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}}
              formatter={(value: number) => formatCurrency(value, baseCurrency)}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- CHART 5: PAYMENT METHOD PIE CHART (REUSABLE FOR INCOME/EXPENSE) ---
export const PaymentMethodPieChart: React.FC<ChartsProps & { type: TransactionType }> = ({ transactions, baseCurrency, language, isDarkMode, type }) => {
    const filtered = transactions.filter(t => t.type === type);
    
    const dataMap = filtered.reduce((acc, curr) => {
      const convertedAmount = convertCurrency(curr.amount, curr.currency, baseCurrency);
      const method = curr.paymentMethod || 'CARD'; // Default
      acc[method] = (acc[method] || 0) + convertedAmount;
      return acc;
    }, {} as Record<string, number>);
  
    const data: CategorySummary[] = Object.entries(dataMap)
      .map(([name, value]) => ({
        name: t(name === 'CASH' ? 'cash' : 'card', language),
        value: value as number,
        color: '' 
      }))
      .sort((a, b) => b.value - a.value);

    // Green/Teal for Cash, Blue/Purple for Card
    const colors = type === TransactionType.INCOME 
        ? ['#10b981', '#3b82f6'] // Emerald, Blue
        : ['#f59e0b', '#6366f1']; // Amber, Indigo
    
    const title = type === TransactionType.INCOME ? t('chart_payment_income', language) : t('chart_payment_expense', language);
  
    return <CommonPieChart title={title} data={data} colors={colors} baseCurrency={baseCurrency} isDarkMode={isDarkMode} />;
};
