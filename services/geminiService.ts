import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType, Language, Currency } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Smart Categorization: Guesses details from a simple string
export const parseTransactionText = async (text: string, userLang: Language = 'it'): Promise<Partial<Transaction> | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const prompt = `
      Analyze the following text describing a financial transaction and return a JSON object with:
      - amount (number)
      - currency (detect symbol or code, return 'EUR', 'USD', or 'PLN'. Default to 'EUR' if unsure)
      - category (choose from standard categories like: Alimentari, Casa, Trasporti, Svago, Salute, Ristoranti, Shopping, Altro, Stipendio, Regali)
      - type (INCOME or EXPENSE)
      - description (clean short text)
      
      Text: "${text}"
      
      Respond ONLY with the JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini parsing error:", error);
    return null;
  }
};

// Financial Insight: Analyzes the user's transaction history
export const analyzeFinances = async (transactions: Transaction[], language: Language, baseCurrency: Currency): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "API Key mancante. Impossibile generare l'analisi.";

  // Simplify data to save tokens
  const simpleData = transactions.slice(0, 50).map(t => ({
    d: t.date.split('T')[0],
    a: t.amount,
    c: t.currency,
    cat: t.category,
    t: t.type
  }));

  try {
    const prompt = `
      You are an expert financial advisor. Analyze the following transactions (JSON) for a user.
      User's base currency is ${baseCurrency}. 
      
      Provide a short summary (max 150 words) of their financial status, highlighting spending trends and savings tips.
      IMPORTANT: Output the response in the language code: "${language}".
      Use markdown formatting.
      
      Data: ${JSON.stringify(simpleData)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Analysis generation failed.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Error generating analysis.";
  }
};
