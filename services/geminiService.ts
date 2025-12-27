
import { GoogleGenAI } from "@google/genai";
import { Transaction, Language, Currency } from "../types.ts";

const createAIClient = () => {
  // Support both standard Node process.env (if polyfilled) and Vite import.meta.env
  let apiKey = "";
  try {
     // @ts-ignore
     if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
     }
  } catch(e) {}

  if (!apiKey && typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || "";
  }

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export const parseTransactionText = async (text: string, userLang: Language = 'it'): Promise<Partial<Transaction> | null> => {
  try {
    const ai = createAIClient();
    const prompt = `
      Analizza la seguente spesa/entrata: "${text}".
      Restituisci ESCLUSIVAMENTE un oggetto JSON con questi campi:
      {
        "amount": numero (usa il punto per decimali),
        "currency": "EUR" | "USD" | "PLN",
        "category": "Alimentari" | "Casa" | "Trasporti" | "Svago" | "Salute" | "Ristoranti" | "Shopping" | "Altro" | "Stipendio" | "Regali" | "Mance",
        "type": "INCOME" (se stipendio, regali, mance) o "EXPENSE" (tutto il resto),
        "description": "breve descrizione"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const textResponse = response.text;
    if (!textResponse) return null;
    
    return JSON.parse(textResponse.trim());
  } catch (error: any) {
    console.error("Errore AI Smart Fill:", error);
    if (error.message === "API_KEY_MISSING" || error.message?.includes("Requested entity was not found")) {
      throw new Error("AI_KEY_ERROR");
    }
    return null;
  }
};

export const analyzeFinances = async (transactions: Transaction[], language: Language, baseCurrency: Currency): Promise<string> => {
  try {
    const ai = createAIClient();
    const dataSummary = transactions.slice(0, 40).map(t => ({
      date: t.date.split('T')[0],
      amount: t.amount,
      currency: t.currency,
      cat: t.category,
      type: t.type
    }));

    const prompt = `
      Analizza questi dati finanziari: ${JSON.stringify(dataSummary)}. Valuta base: ${baseCurrency}.
      Fornisci un report breve e motivante in lingua "${language}". Usa Markdown.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt
    });
    
    return response.text || "Impossibile generare l'analisi.";
  } catch (error: any) {
    console.error("Errore analisi AI:", error);
    if (error.message === "API_KEY_MISSING" || error.message?.includes("Requested entity was not found")) {
      return "AI_KEY_ERROR";
    }
    return "Errore nell'analisi delle finanze.";
  }
};
