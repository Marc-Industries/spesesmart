
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
  type: String
});

const SubscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: String,
  amount: Number,
  currency: String,
  category: String,
  frequency: { type: String, enum: ['MONTHLY', 'YEARLY'] },
  nextPaymentDate: String, // YYYY-MM-DD
  active: { type: Boolean, default: true }
});

const UserModel = mongoose.model('User', UserSchema);
const TransactionModel = mongoose.model('Transaction', TransactionSchema);
const SubscriptionModel = mongoose.model('Subscription', SubscriptionSchema);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI).then(() => console.log('✅ MongoDB Connected')).catch(err => console.error(err));
}

// --- HELPER: Process Subscriptions ---
const processSubscriptions = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSubs = await SubscriptionModel.find({ 
      userId, 
      active: true,
      nextPaymentDate: { $lte: today.toISOString().split('T')[0] } 
    });

    for (const sub of dueSubs) {
      // 1. Create Transaction
      const newTx = new TransactionModel({
        id: crypto.randomUUID(),
        userId: sub.userId,
        date: new Date().toISOString(),
        amount: sub.amount,
        currency: sub.currency,
        category: sub.category,
        description: `Abbonamento: ${sub.name}`,
        type: 'EXPENSE'
      });
      await newTx.save();

      // 2. Update Next Payment Date
      const nextDate = new Date(sub.nextPaymentDate);
      if (sub.frequency === 'MONTHLY') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      
      sub.nextPaymentDate = nextDate.toISOString().split('T')[0];
      await sub.save();
      console.log(`[SUB] Processed subscription ${sub.name} for user ${userId}`);
    }
  } catch (e) {
    console.error("Error processing subscriptions:", e);
  }
};

// --- API ROUTES ---
app.post('/api/transactions', async (req, res) => {
  try {
    const data = req.body;
    console.log(`[DB SAVE] ID: ${data.id} | Desc: ${data.description}`);
    
    const tx = await TransactionModel.findOneAndUpdate(
      { id: data.id },
      { 
        id: data.id,
        userId: data.userId,
        date: data.date,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        description: data.description,
        type: data.type
      },
      { new: true, upsert: true }
    );
    
    res.json(tx);
  } catch (err) {
    console.error('Database Save Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  const { userId } = req.query;
  // Trigger subscription check before returning data
  if (userId) await processSubscriptions(userId);
  
  const transactions = await TransactionModel.find({ userId }).sort({ date: -1 });
  res.json(transactions);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await UserModel.findOne({ id: req.params.id });
  res.json(user || null);
});

app.put('/api/users/:id', async (req, res) => {
  const user = await UserModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, upsert: true });
  res.json(user);
});

app.delete('/api/transactions/:id', async (req, res) => {
  await TransactionModel.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// --- SUBSCRIPTION ROUTES ---
app.get('/api/subscriptions', async (req, res) => {
  const { userId } = req.query;
  const subs = await SubscriptionModel.find({ userId });
  res.json(subs);
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const data = req.body;
    const sub = await SubscriptionModel.findOneAndUpdate(
      { id: data.id },
      data,
      { new: true, upsert: true }
    );
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  await SubscriptionModel.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
