import fs from 'fs';
import path from 'path';
import { createAdminClient } from './supabase/admin';

export interface MealFeedback {
  id?: string;
  user_id?: string | null;
  food_name: string;
  original_guess?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_verified: boolean;
  was_corrected: boolean;
  user_notes?: string | null;
  created_at?: string;
}

const LOCAL_STORE_PATH = path.join(process.cwd(), 'data', 'learned_meals.json');

// Initialize with verified ground-truth culinary examples
const DEFAULT_LEARNINGS: MealFeedback[] = [
  {
    food_name: 'Turkish Tea',
    original_guess: 'Turkish Tea',
    calories: 2,
    protein: 0,
    carbs: 0.5,
    fat: 0,
    is_verified: true,
    was_corrected: false,
    user_notes: '1 glass (100ml) steeped black tea without sugar is ~2 kcal, 0.5g carbs, 0g protein, 0g fat.',
    created_at: new Date().toISOString(),
  },
  {
    food_name: 'Ezogelin Soup',
    original_guess: 'Lentil Soup',
    calories: 180,
    protein: 6.5,
    carbs: 24,
    fat: 6,
    is_verified: true,
    was_corrected: true,
    user_notes: 'Red lentil, bulgur, rice, mint and tomato paste soup. Standard 1 bowl (250ml) is ~180 kcal.',
    created_at: new Date().toISOString(),
  },
];

function readLocalLearnings(): MealFeedback[] {
  try {
    if (!fs.existsSync(LOCAL_STORE_PATH)) {
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(DEFAULT_LEARNINGS, null, 2), 'utf-8');
      return DEFAULT_LEARNINGS;
    }
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LEARNINGS;
  }
}

function appendLocalLearning(item: MealFeedback) {
  try {
    const list = readLocalLearnings();
    // Keep last 100 learnings to prevent boundless growth
    const updated = [item, ...list.filter((l) => l.food_name !== item.food_name)].slice(0, 100);
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local meal learning:', err);
  }
}

/**
 * Save user verification or correction into AI memory
 */
export async function recordMealFeedback(feedback: MealFeedback): Promise<void> {
  const item: MealFeedback = {
    ...feedback,
    created_at: new Date().toISOString(),
  };

  // 1. Always update local storage
  appendLocalLearning(item);

  // 2. Try to sync to Supabase (if table exists)
  try {
    const adminSupabase = createAdminClient();
    await adminSupabase.from('ai_meal_learnings').insert({
      user_id: item.user_id || null,
      food_name: item.food_name,
      original_guess: item.original_guess || null,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      is_verified: item.is_verified,
      was_corrected: item.was_corrected,
      user_notes: item.user_notes || null,
      created_at: item.created_at,
    });
  } catch (err) {
    // If Supabase table isn't created yet, local JSON storage safely maintains learning
    console.warn('Note: ai_meal_learnings Supabase sync notice:', err);
  }
}

/**
 * Retrieve verified corrections & learnings to inject into AI prompt
 */
export async function getLearnedContext(): Promise<string> {
  let learnings = readLocalLearnings();

  try {
    const adminSupabase = createAdminClient();
    const { data } = await adminSupabase
      .from('ai_meal_learnings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      learnings = [...data, ...learnings].slice(0, 12);
    }
  } catch {
    // fallback to local learnings
  }

  if (learnings.length === 0) return '';

  const entries = learnings.slice(0, 8).map((l) => {
    if (l.was_corrected && l.original_guess) {
      return `- Correction learned: When appearance resembles "${l.original_guess}", check if it is "${l.food_name}". Calibrated standard serving: ${l.calories} kcal (P: ${l.protein}g, C: ${l.carbs}g, F: ${l.fat}g). Note: ${l.user_notes || 'User confirmed correct dish.'}`;
    }
    return `- Verified dish: "${l.food_name}" -> Calibrated standard serving: ${l.calories} kcal (P: ${l.protein}g, C: ${l.carbs}g, F: ${l.fat}g). ${l.user_notes || ''}`;
  });

  return `\n\n### CONTINUAL LEARNING MEMORY (User-Verified Calibrations & Corrections):\nYou have learned from real users confirming and correcting food photos:\n${entries.join('\n')}\nApply these verified calibrations whenever you analyze matching or visually similar dishes.\n`;
}
