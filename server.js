
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY; 
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim() : null;
const MONGODB_URI = process.env.MONGODB_URI;

// --- MONGODB SCHEMAS ---
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  avatar: String,
  password: { type: String, default: '1234' },
  telegramChatId: String,
  preferences: {
    currency: { type: String, default: 'EUR' },
    language: { type: String, default: 'it' }
  }
});

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  date: { type: String, required: true },
  amount: Number,
  currency: String,
  category: String,
  description: String,
  type: String,
  paymentMethod: { type: String, default: 'CARD' }
});

const UserModel = mongoose.model('User', UserSchema);
const TransactionModel = mongoose.model('Transaction', TransactionSchema);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI).then(() => console.log('✅ MongoDB Connected')).catch(err => console.error(err));
}

// --- API ROUTES (MANTENUTE PER DASHBOARD) ---
app.get('/api/users/:id', async (req, res) => {
  const user = await UserModel.findOne({ id: req.params.id });
  res.json(user || null);
});

app.put('/api/users/:id', async (req, res) => {
  const user = await UserModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, upsert: true });
  res.json(user);
});

app.get('/api/transactions', async (req, res) => {
  const { userId } = req.query;
  const transactions = await TransactionModel.find({ userId }).sort({ date: -1 });
  res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
  const tx = await TransactionModel.create(req.body);
  res.json(tx);
});

app.delete('/api/transactions/:id', async (req, res) => {
  await TransactionModel.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// --- TELEGRAM BOT LOGIC (AVANZATA) ---
// Initialize GoogleGenAI once with API key from environment
const ai = new GoogleGenAI({ apiKey: API_KEY });
const pendingTransactions = new Map();

const getMainMenu = (lang) => {
    const labels = {
        it: { add: "📝 Aggiungi", report: "📊 Resoconto", info: "ℹ️ Info" },
        en: { add: "📝 Add", report: "📊 Report", info: "ℹ️ Info" },
        pl: { add: "📝 Dodaj", report: "📊 Raport", info: "ℹ️ Info" },
    };
    const l = labels[lang] || labels.it;
    return {
        keyboard: [[{ text: l.add }, { text: l.report }], [{ text: l.info }]],
        resize_keyboard: true,
        one_time_keyboard: false
    };
};

const processTelegramWithAI = async (text, userLang, currentDate) => {
  try {
    const prompt = `
      Sei l'assistente AI di SpeseSmart.
      Data corrente: ${currentDate}. Lingua utente: "${userLang}".

      Analizza il messaggio dell'utente: "${text}"

      Intenti:
      - 'TRANSACTION': inserimento spesa/entrata.
      - 'REPORT': richiesta di resoconto spese.
      - 'CHAT': saluti, domande generiche.

      REGOLE:
      1. Riconosci l'importo e la valuta.
      2. Categorie: [Alimentari, Casa, Trasporti, Svago, Salute, Ristoranti, Shopping, Altro, Stipendio, Regali, Mance].
      3. Se la categoria è 'Mance' o 'Stipendio', imposta type: 'INCOME'.
      4. Metodo: 'CASH' se menzionato contanti o se mance. 'CARD' se menzionato carta. Altrimenti null.

      Rispondi in JSON:
      {
        "intent": "TRANSACTION" | "REPORT" | "CHAT",
        "reply": "Risposta naturale in ${userLang}",
        "transactionData": { "amount": number, "currency": "EUR"|"USD"|"PLN", "category": string, "type": "INCOME"|"EXPENSE", "description": string, "paymentMethod": "CASH"|"CARD"|null },
        "reportPeriod": "DAILY" | "WEEKLY" | "MONTHLY"
      }
    `;

    // Use gemini-3-flash-preview for text analysis
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    // Use .text property to access content
    return JSON.parse(response.text);
  } catch (e) { return null; }
};

const buildReport = async (userId, period, lang) => {
    let startDate = new Date();
    startDate.setHours(0,0,0,0);
    if (period === 'WEEKLY') startDate.setDate(startDate.getDate() - 7);
    if (period === 'MONTHLY') startDate.setMonth(startDate.getMonth() - 1);

    const txs = await TransactionModel.find({ userId, date: { $gte: startDate.toISOString() } });
    const inc = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    
    const t = {
        it: { i: "Entrate", e: "Uscite", s: "Saldo", title: "Resoconto" },
        en: { i: "Income", e: "Expenses", s: "Balance", title: "Report" },
        pl: { i: "Przychody", e: "Wydatki", s: "Saldo", title: "Raport" }
    }[lang] || { i: "Income", e: "Expenses", s: "Balance", title: "Report" };

    return `📊 *${t.title} (${period})*\n\n🟢 ${t.i}: +${inc.toFixed(2)}\n🔴 ${t.e}: -${exp.toFixed(2)}\n💰 ${t.s}: ${(inc - exp).toFixed(2)}`;
};

if (TELEGRAM_TOKEN) {
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const tx = pendingTransactions.get(chatId);
    if (tx) {
        tx.paymentMethod = query.data;
        await TransactionModel.create(tx);
        pendingTransactions.delete(chatId);
        bot.editMessageText(`✅ *Salvato!*\n${tx.description}: ${tx.amount} ${tx.currency} (${tx.paymentMethod === 'CASH' ? '💵 Contanti' : '💳 Carta'})`, {
            chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown'
        });
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;
    if (!text) return;

    const user = await UserModel.findOne({ telegramChatId: chatId });
    if (!user) {
        if (text === '/start') bot.sendMessage(chatId, `Benvenuto! Collega il tuo Chat ID nel profilo del sito: \`${chatId}\``, { parse_mode: 'Markdown' });
        else bot.sendMessage(chatId, "⚠️ Collega il tuo account inserendo il Chat ID nel sito.");
        return;
    }

    const menu = getMainMenu(user.preferences.language);

    if (text.match(/resoconto|report|raport/i)) {
        const rep = await buildReport(user.id, 'WEEKLY', user.preferences.language);
        return bot.sendMessage(chatId, rep, { parse_mode: 'Markdown', reply_markup: menu });
    }

    bot.sendChatAction(chatId, 'typing');
    const aiRes = await processTelegramWithAI(text, user.preferences.language, new Date().toISOString());

    if (!aiRes) return bot.sendMessage(chatId, "Scusa, non ho capito. Prova a scrivere un importo o chiedi un resoconto.", { reply_markup: menu });

    if (aiRes.intent === 'REPORT') {
        const rep = await buildReport(user.id, aiRes.reportPeriod || 'WEEKLY', user.preferences.language);
        bot.sendMessage(chatId, `${aiRes.reply}\n\n${rep}`, { parse_mode: 'Markdown', reply_markup: menu });
    } else if (aiRes.intent === 'TRANSACTION') {
        const tx = { id: crypto.randomUUID(), userId: user.id, date: new Date().toISOString(), ...aiRes.transactionData };
        if (tx.paymentMethod) {
            await TransactionModel.create(tx);
            bot.sendMessage(chatId, `✅ *Salvato!*\n${tx.description}: ${tx.amount} ${tx.currency} (${tx.paymentMethod === 'CASH' ? '💵' : '💳'})`, { parse_mode: 'Markdown', reply_markup: menu });
        } else {
            pendingTransactions.set(chatId, tx);
            bot.sendMessage(chatId, `${aiRes.reply}\n\nCome hai pagato?`, {
                reply_markup: { inline_keyboard: [[{ text: '💳 Carta', callback_data: 'CARD' }, { text: '💵 Contanti', callback_data: 'CASH' }]] }
            });
        }
    } else {
        bot.sendMessage(chatId, aiRes.reply, { reply_markup: menu });
    }
  });
}

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
