import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType, Language, Currency } from "../types.ts";

// Fix: Removed multi-source API key detection to strictly follow guidelines requiring exclusive use of process.env.API_KEY.

export const parseTransactionText = async (text: string, userLang: Language = 'it'): Promise<Partial<Transaction> | null> => {
  // Fix: Create a new GoogleGenAI instance right before the API call as per coding guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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

    const textResponse = response.text;
    if (!textResponse) return null;
    
    return JSON.parse(textResponse.trim());
  } catch (error) {
    console.error("Errore AI Smart Fill:", error);
    return null;
  }
};

export const analyzeFinances = async (transactions: Transaction[], language: Language, baseCurrency: Currency): Promise<string> => {
  // Fix: Create a new GoogleGenAI instance right before the API call as per coding guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
    return response.text || "Impossibile generare l'analisi.";
  } catch (error) {
    console.error("Errore analisi AI:", error);
    return "Errore nell'analisi delle finanze.";
  }
};