
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths for serving static files
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
  paymentMethod: { type: String, default: 'CARD' } // CASH or CARD
});

const UserModel = mongoose.model('User', UserSchema);
const TransactionModel = mongoose.model('Transaction', TransactionSchema);

// --- DB CONNECTION ---
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB');
      // Seed default users if empty
      const count = await UserModel.countDocuments();
      if (count === 0) {
        await UserModel.create([
          { 
            id: 'user_matteo', 
            name: 'Matteo', 
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo',
            password: '1234', 
            preferences: { currency: 'EUR', language: 'it' }
          },
          { 
            id: 'user_diana', 
            name: 'Diana', 
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana',
            password: '1234',
            preferences: { currency: 'PLN', language: 'pl' }
          }
        ]);
        console.log('🌱 Default users seeded');
      }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// --- API ROUTES ---

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    res.json(user || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, upsert: true });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const transactions = await TransactionModel.find({ userId }).sort({ date: -1 });
    res.json(transactions);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const tx = await TransactionModel.create(req.body);
    res.json(tx);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await TransactionModel.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- TELEGRAM BOT LOGIC ---

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Memory to store pending transactions waiting for "Card vs Cash"
const pendingTransactions = new Map();

// Helper to get persistent menu based on language
const getMainMenu = (lang) => {
    // Basic labels
    const labels = {
        it: { add: "📝 Aggiungi", report: "📊 Resoconto", info: "ℹ️ Info" },
        en: { add: "📝 Add", report: "📊 Report", info: "ℹ️ Info" },
        pl: { add: "📝 Dodaj", report: "📊 Raport", info: "ℹ️ Info" },
    };
    const l = labels[lang] || labels.it;
    return {
        keyboard: [
            [{ text: l.add }, { text: l.report }],
            [{ text: l.info }]
        ],
        resize_keyboard: true,
        persistent: true
    };
};

const processTextWithAI = async (text, userLang, currentDate) => {
  try {
    const prompt = `
      You are a smart financial assistant for a Telegram Bot.
      Current Date: ${currentDate}.
      User Language: "${userLang}".

      Analyze the user's text: "${text}"

      Determine the INTENT:
      1. 'TRANSACTION': The user wants to add an expense or income (e.g., "10 euro pizza", "stipendio 1500").
      2. 'REPORT': The user asks for a summary/report/stats (e.g., "how much did I spend today?", "resoconto", "saldo").
      3. 'CHAT': General conversation or greeting (e.g., "hello", "info", "help").

      OUTPUT JSON FORMAT:
      {
        "intent": "TRANSACTION" | "REPORT" | "CHAT",
        "reply": "A friendly natural language response in ${userLang}. If intent is TRANSACTION, do NOT confirm success yet, just acknowledge understanding.",
        "transactionData": {  // Only if intent is TRANSACTION
           "amount": number (use dot for decimals),
           "currency": "EUR" | "USD" | "PLN" (default EUR),
           "category": "String from list: [Alimentari, Casa, Trasporti, Svago, Salute, Ristoranti, Shopping, Altro, Stipendio, Regali, Mance]",
           "type": "INCOME" | "EXPENSE",
           "description": "Clean description",
           "paymentMethod": "CASH" | "CARD" | null (Detect if user said 'cash', 'contanti', 'card', 'carta'. If 'Mance' category, force 'CASH'. If unknown, set null.)
        },
        "reportType": "DAILY" | "WEEKLY" | "MONTHLY" | "ALL" // Only if intent is REPORT. Default WEEKLY.
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(response.text);
  } catch (e) {
    console.error("AI Error:", e);
    return null;
  }
};

const getReport = async (userId, reportType) => {
    let startDate = new Date();
    startDate.setHours(0,0,0,0);
    
    let title = "";
    if (reportType === 'DAILY') {
        title = "Oggi / Today";
    } else if (reportType === 'MONTHLY') {
        startDate.setMonth(startDate.getMonth() - 1);
        title = "Mese / Month";
    } else {
        startDate.setDate(startDate.getDate() - 7);
        title = "Settimana / Week";
    }

    const txs = await TransactionModel.find({
        userId,
        date: { $gte: startDate.toISOString() }
    });

    const income = txs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = txs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    
    return `📊 *Report (${title})*\n\n` +
           `🟢 +${income.toFixed(2)}\n` +
           `🔴 -${expense.toFixed(2)}\n` +
           `💰 = ${(income - expense).toFixed(2)}`;
};

if (TELEGRAM_TOKEN) {
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  console.log(`🤖 Bot Telegram connecting...`);

  bot.on('polling_error', (error) => {
    console.error(`❌ TELEGRAM POLLING ERROR: ${error.code} - ${error.message}`);
  });

  // Handle Button Clicks (Card vs Cash)
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data; // 'CARD' or 'CASH'
    
    if (pendingTransactions.has(chatId)) {
        const txData = pendingTransactions.get(chatId);
        txData.paymentMethod = data;

        try {
            await TransactionModel.create(txData);
            pendingTransactions.delete(chatId);

            const methodIcon = data === 'CASH' ? '💵' : '💳';
            const msg = `✅ *Salvato* (${methodIcon} ${data === 'CASH' ? 'Cash' : 'Card'})\n${txData.description}: ${txData.amount} ${txData.currency}`;
            
            bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });

        } catch (e) {
            bot.sendMessage(chatId, "❌ Errore DB / DB Error");
        }
    } else {
        bot.answerCallbackQuery(query.id, { text: "Expired" });
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    if (!text) return;

    if (text === '/start') {
        bot.sendMessage(chatId, `Benvenuto! Chat ID: \`${chatId}\``, { parse_mode: 'Markdown' });
        return;
    }

    // 1. Identify User
    const user = await UserModel.findOne({ telegramChatId: chatId });
    if (!user) {
      bot.sendMessage(chatId, `⚠️ User unknown. Add Chat ID to Dashboard: ${chatId}`);
      return;
    }

    // 2. AI Processing
    bot.sendChatAction(chatId, 'typing');
    const aiResult = await processTextWithAI(text, user.preferences.language, new Date().toISOString());

    if (!aiResult) {
        bot.sendMessage(chatId, "⚠️ Error processing request.");
        return;
    }

    const { intent, reply, transactionData, reportType } = aiResult;

    // Send the Persistent Menu (update language if needed)
    const menu = getMainMenu(user.preferences.language);

    if (intent === 'CHAT') {
        bot.sendMessage(chatId, reply, { reply_markup: menu });
        return;
    }

    if (intent === 'REPORT') {
        const reportText = await getReport(user.id, reportType || 'WEEKLY');
        // Combine AI pleasantry + Data
        bot.sendMessage(chatId, `${reply}\n\n${reportText}`, { parse_mode: 'Markdown', reply_markup: menu });
        return;
    }

    if (intent === 'TRANSACTION' && transactionData) {
        // Complete data
        const newTxData = {
            id: crypto.randomUUID(),
            userId: user.id,
            date: new Date().toISOString(),
            amount: transactionData.amount,
            currency: transactionData.currency || user.preferences.currency,
            category: transactionData.category || 'Altro',
            description: transactionData.description || text,
            type: transactionData.type || 'EXPENSE',
            paymentMethod: transactionData.paymentMethod || 'CARD' // Default
        };

        // If AI detected payment method OR it's a Tip/Mance -> Save immediately
        if (transactionData.paymentMethod || newTxData.category === 'Mance') {
            if(newTxData.category === 'Mance') newTxData.paymentMethod = 'CASH';

            await TransactionModel.create(newTxData);
            const icon = newTxData.paymentMethod === 'CASH' ? '💵' : '💳';
            bot.sendMessage(chatId, `✅ *${newTxData.category}* (${icon})\n${newTxData.amount} ${newTxData.currency} - ${newTxData.description}`, { parse_mode: 'Markdown', reply_markup: menu });
        } else {
            // Ask for Payment Method
            pendingTransactions.set(chatId, newTxData);
            const opts = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💳 Card', callback_data: 'CARD' },
                            { text: '💵 Cash', callback_data: 'CASH' }
                        ]
                    ]
                }
            };
            bot.sendMessage(chatId, `${reply}\n\n💰 ${newTxData.amount} ${newTxData.currency} (${newTxData.category})`, opts);
        }
    }
  });

  console.log("🤖 Bot Telegram 24/7 avviato...");
}

// --- SERVE FRONTEND (STATIC FILES) ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
