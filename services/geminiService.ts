
import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType, Language, Currency } from "../types";

// Always use the standard initialization with the API_KEY from process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Smart Categorization: Guesses details from a simple string
export const parseTransactionText = async (text: string, userLang: Language = 'it'): Promise<Partial<Transaction> | null> => {
  try {
    const prompt = `
      Analyze the following text describing a financial transaction and return a JSON object with:
      - amount (number): Convert commas to dots (e.g. 4,10 -> 4.10).
      - currency: Detect symbol (€, $, zł) or words (euro, eur, zloty, usd). Default 'EUR'.
      - category: Choose strictly from: [Alimentari, Casa, Trasporti, Svago, Salute, Ristoranti, Shopping, Altro, Stipendio, Regali, Mance].
      - type: INCOME or EXPENSE. (Note: 'Mance', 'Stipendio' are INCOME).
      - description: Clean short text.
      
      Text: "${text}"
      
      Respond ONLY with the JSON.
    `;

    // Use 'gemini-3-flash-preview' for basic text tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    // Access the text property directly
    const jsonText = response.text;
    if (!jsonText) return null;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini parsing error:", error);
    return null;
  }
};

// Financial Insight
export const analyzeFinances = async (transactions: Transaction[], language: Language, baseCurrency: Currency): Promise<string> => {
  const simpleData = transactions.slice(0, 50).map(t => ({
    d: t.date.split('T')[0],
    a: t.amount,
    c: t.currency,
    cat: t.category,
    t: t.type
  }));

  try {
    const prompt = `
      You are an expert financial advisor. Analyze the following transactions (JSON).
      Base currency: ${baseCurrency}. 
      
      Provide a short summary (max 150 words) highlighting spending trends.
      IMPORTANT: Output in language code: "${language}".
      Use markdown.
      
      Data: ${JSON.stringify(simpleData)}
    `;

    // Use 'gemini-3-flash-preview' for basic text tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    // Access the text property directly
    return response.text || "Analysis generation failed.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Error generating analysis.";
  }
};
