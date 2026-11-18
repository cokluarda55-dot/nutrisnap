import { GoogleGenAI } from '@google/genai';
import { FoodAnalysisResult } from './types';
import { getLearnedContext } from './learning';

const apiKey = process.env.GEMINI_API_KEY || '';
const client = new GoogleGenAI({ apiKey });

// Primary and ultra-fast fallback models
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

const BASE_SYSTEM_PROMPT = `You are a certified clinical nutritionist and AI dietary expert.
Your task is to analyze the provided meal photo and accurately estimate its total calories, macronutrients (protein, carbs, fat), and individual food item breakdowns.
Output ONLY a valid JSON object matching the exact schema below. Do not wrap in extra markdown or introductory conversational text.

Required JSON format:
{
  "food_name": "Concise, natural American English meal name (e.g. Grilled Chicken Quinoa Salad)",
  "calories": Total estimated calories as an integer (e.g. 520),
  "protein": Total protein in grams (number, e.g. 38.5),
  "carbs": Total carbohydrates in grams (number, e.g. 45.0),
  "fat": Total fat in grams (number, e.g. 14.2),
  "confidence_score": Float between 0.0 and 1.0 representing recognition confidence,
  "breakdown": [
    {
      "item": "Grilled Chicken Breast",
      "portion": "150g (5.3 oz)",
      "calories": 240,
      "protein": 31.0,
      "carbs": 0.0,
      "fat": 3.5
    },
    {
      "item": "Steamed Quinoa & Mixed Greens",
      "portion": "1 cup (185g)",
      "calories": 280,
      "protein": 7.5,
      "carbs": 45.0,
      "fat": 10.7
    }
  ],
  "health_tip": "One concise, motivating clinical tip about this meal (e.g. Excellent lean protein balance for muscle recovery—consider pairing with water!)."
}`;

/**
 * Execute generateContent with a strict timeout (Promise.race)
 */
async function callGeminiWithTimeout(
  model: string,
  cleanBase64: string,
  mimeType: string,
  timeoutMs: number,
  userCorrection?: string,
  learnedMemory: string = ''
): Promise<string> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new Error(`TIMEOUT_${timeoutMs}MS`));
    }, timeoutMs);
  });

  const enrichedSystemPrompt = `${BASE_SYSTEM_PROMPT}${learnedMemory}`;

  const promptText = userCorrection
    ? `${enrichedSystemPrompt}\n\nIMPORTANT USER CLARIFICATION: The user specifically clarified that this meal is: "${userCorrection}". Recalculate all portions, ingredients, calories, protein, carbs, and fat based on this exact dish and the visual serving size in the image.`
    : enrichedSystemPrompt;

  const apiPromise = client.models
    .generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    })
    .then((res) => res.text || '');

  return Promise.race([apiPromise, timeoutPromise]);
}

/**
 * Executes food analysis with fast retry, user corrections, and automatic fallback to Flash-Lite
 */
export async function analyzeFoodImage(
  base64Image: string,
  mimeType: string = 'image/jpeg',
  userCorrection?: string
): Promise<FoodAnalysisResult> {
  // Strip base64 prefix if present
  const cleanBase64 = base64Image.includes(';base64,')
    ? base64Image.split(';base64,')[1]
    : base64Image;

  const modelQueue = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  let lastError: any = null;

  // Retrieve user-verified learnings and corrections dynamically
  const learnedMemory = await getLearnedContext().catch(() => '');

  for (let modelIndex = 0; modelIndex < modelQueue.length; modelIndex++) {
    const currentModel = modelQueue[modelIndex];
    const isPrimary = modelIndex === 0;
    const timeoutLimit = isPrimary ? 5000 : 4000;
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[NutriAI] Trying model: ${currentModel} (Attempt ${attempt}/${maxRetries}, Timeout ${timeoutLimit}ms, Correction: ${userCorrection ? 'YES' : 'NO'})`);

        const responseText = await callGeminiWithTimeout(
          currentModel,
          cleanBase64,
          mimeType,
          timeoutLimit,
          userCorrection,
          learnedMemory
        );

        if (!responseText) {
          throw new Error('Empty response from AI model.');
        }

        const cleanedJson = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed: FoodAnalysisResult = JSON.parse(cleanedJson);

        return {
          food_name: parsed.food_name || (userCorrection ? userCorrection : 'Healthy Meal'),
          calories: Math.round(Number(parsed.calories) || 0),
          protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
          carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
          fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
          confidence_score: parsed.confidence_score || 0.95,
          breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
          health_tip: parsed.health_tip || 'Keep up the balanced nutrition!',
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || '';
        const is503 = errMsg.includes('503') || err?.status === 503;
        const isTimeout = errMsg.includes('TIMEOUT');
        const isUnavailable = errMsg.includes('overloaded') || errMsg.includes('UNAVAILABLE');

        console.warn(`[Gemini AI] ${currentModel} failed (Attempt ${attempt}/${maxRetries}): ${errMsg}`);

        // Immediate fallback if high load, timeout, or 503
        if (isTimeout || is503 || isUnavailable) {
          console.log(`[Gemini AI] High traffic/timeout detected, switching to fast fallback model...`);
          break;
        }

        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 300));
        }
      }
    }
  }

  throw new Error(
    lastError?.message || 'Unable to analyze meal photo. Please try again with a clearer angle.'
  );
}
