
import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType, Language, Currency } from "../types.ts";

const getApiKey = () => {
  let key = "";

  // 1. Vite / Modern Browsers (import.meta.env) - Metodo standard per Vercel
  try {
    // @ts-ignore: import.meta exists in modern browsers/Vite
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) key = import.meta.env.VITE_API_KEY;
      // @ts-ignore
      else if (import.meta.env.API_KEY) key = import.meta.env.API_KEY;
    }
  } catch (e) {
    // Ignore error if import.meta is not defined
  }

  // 2. Node.js / Webpack fallback (process.env)
  if (!key) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        if (process.env.VITE_API_KEY) key = process.env.VITE_API_KEY;
        else if (process.env.API_KEY) key = process.env.API_KEY;
      }
    } catch (e) {
      // Ignore reference errors
    }
  }

  // 3. Window fallback (Inject script)
  if (!key) {
    try {
      if (typeof window !== 'undefined' && (window as any).process?.env) {
        const winEnv = (window as any).process.env;
        if (winEnv.VITE_API_KEY) key = winEnv.VITE_API_KEY;
        else if (winEnv.API_KEY) key = winEnv.API_KEY;
      }
    } catch (e) {
      console.warn("Error reading API key from window:", e);
    }
  }

  return key;
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === "") {
    console.warn("API Key mancante o non trovata. Assicurati di aver impostato VITE_API_KEY su Vercel.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const parseTransactionText = async (text: string, userLang: Language = 'it'): Promise<Partial<Transaction> | null> => {
  const ai = getAI();
  if (!ai) return null;

  try {
    const prompt = `
      Analizza la seguente spesa/entrata: "${text}".
      Restituisci ESCLUSIVAMENTE un oggetto JSON con questi campi:
      {
        "amount": numero (usa il punto per decimali),
        "currency": "EUR" | "USD" | "PLN",
        "category": "Alimentari" | "Casa" | "Trasporti" | "Svago" | "Salute" | "Ristoranti" | "Shopping" | "Altro" | "Stipendio" | "Regali" | "Mance",
        "type": "INCOME" (se stipendio, regali, mance) o "EXPENSE" (tutto il resto),
        "description": "breve descrizione",
        "paymentMethod": "CASH" o "CARD"
      }

      REGOLE PER IL METODO DI PAGAMENTO:
      - Imposta "CASH" se l'utente scrive "contanti", "soldi", "mancia", "a mano", "monete" o se la spesa è piccola (es. caffè, giornale) e non specifica altro.
      - Imposta "CARD" se scrive "carta", "bancomat", "online", "amazon", "apple pay" o se la spesa è grande e non specifica.
      - Se incerto, usa "CARD".
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Errore AI Smart Fill:", error);
    return null;
  }
};

export const analyzeFinances = async (transactions: Transaction[], language: Language, baseCurrency: Currency): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Configurazione API non valida o API Key mancante.";

  const dataSummary = transactions.slice(0, 40).map(t => ({
    date: t.date.split('T')[0],
    amount: t.amount,
    currency: t.currency,
    cat: t.category,
    type: t.type,
    method: t.paymentMethod
  }));

  try {
    const prompt = `
      Analizza questi dati finanziari: ${JSON.stringify(dataSummary)}. Valuta base: ${baseCurrency}.
      Fornisci un report breve e motivante in lingua "${language}". Usa Markdown.
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "";
  } catch (error) {
    return "Errore nell'analisi.";
  }
};
