import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import TelegramBot from 'node-telegram-bot-api';
import mongoose from 'mongoose';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY; 
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
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
  type: String
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

// --- API ROUTES (Frontend calls these) ---

// Get User
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    res.json(user || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update User
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, upsert: true });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get Transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const transactions = await TransactionModel.find({ userId }).sort({ date: -1 });
    res.json(transactions);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add Transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = await TransactionModel.create(req.body);
    res.json(tx);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete Transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await TransactionModel.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- TELEGRAM BOT LOGIC (Runs 24/7 on Server) ---

const ai = new GoogleGenAI({ apiKey: API_KEY });

const parseTransactionWithAI = async (text) => {
  try {
    const prompt = `
      Analyze the following financial transaction text and return JSON:
      - amount (number)
      - currency ('EUR', 'USD', 'PLN'. Default 'EUR')
      - category (standard categories: Alimentari, Casa, Trasporti, Svago, Salute, Ristoranti, Shopping, Altro, Stipendio, Regali)
      - type (INCOME or EXPENSE)
      - description (clean short text)
      
      Text: "${text}"
      Respond ONLY with JSON.
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

if (TELEGRAM_TOKEN) {
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    if (!text || text === '/start') {
        if(text === '/start') bot.sendMessage(chatId, `Benvenuto! Il tuo Chat ID è: \`${chatId}\`\nInseriscilo nelle impostazioni della Dashboard.`, { parse_mode: 'Markdown' });
        return;
    }

    // 1. Identify User by Chat ID
    const user = await UserModel.findOne({ telegramChatId: chatId });

    if (!user) {
      bot.sendMessage(chatId, `⚠️ Utente non riconosciuto. Configura questo ID nella tua Dashboard: ${chatId}`);
      return;
    }

    // 2. AI Parsing
    bot.sendChatAction(chatId, 'typing');
    const parsed = await parseTransactionWithAI(text);

    if (parsed && parsed.amount) {
      const newTxData = {
        id: crypto.randomUUID(),
        userId: user.id, 
        date: new Date().toISOString(),
        amount: parsed.amount,
        currency: parsed.currency || user.preferences.currency,
        category: parsed.category || 'Altro',
        description: parsed.description || text,
        type: parsed.type || 'EXPENSE'
      };

      try {
        await TransactionModel.create(newTxData);

        const confirmMsg = 
          `✅ *Salvato per ${user.name}*\n` +
          `💰 ${newTxData.amount} ${newTxData.currency}\n` +
          `📂 ${newTxData.category}\n` +
          `📝 ${newTxData.description}`;
        
        bot.sendMessage(chatId, confirmMsg, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Errore nel salvataggio.");
      }

    } else {
      bot.sendMessage(chatId, "⚠️ Non ho capito. Prova: '10€ pizza'");
    }
  });

  console.log("🤖 Bot Telegram 24/7 avviato...");
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});