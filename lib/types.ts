export interface Profile {
  id: string;
  email: string | null;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carbs_target: number;
  daily_fat_target: number;
  analyses_count: number;
  is_pro: boolean;
  created_at?: string;
  updated_at?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  user_id: string;
  meal_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: MealType;
  notes?: string | null;
  image_url?: string | null;
  consumed_at: string;
  created_at?: string;
}

export interface FoodItemBreakdown {
  item: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysisResult {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence_score?: number;
  breakdown: FoodItemBreakdown[];
  health_tip: string;
}

export interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}
